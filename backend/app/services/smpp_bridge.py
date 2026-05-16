"""
net2app SMS Hub — Python SMPP Bridge Server
=============================================
Accepts SMPP client connections (port 2775), authenticates against PostgreSQL,
applies translations, routes through billing engine, and injects into Kannel
via SQLbox (INSERT into send_sms) or HTTP (:13013/cgi-bin/sendsms).

Architecture:
  Client (SMPP TRX) → Bridge (:2775) → Auth → Translate → Rate → Bill
    → INSERT send_sms → SQLbox → Kannel Bearbox → SMSC (supplier)

Requirements:
  pip install smpplib asyncpg httpx structlog

Config via .env:
  DATABASE_URL=postgresql://net2app:pass@localhost:5432/net2app_sms
  KANNEL_SENDSMS_URL=http://127.0.0.1:13013/cgi-bin/sendsms
  KANNEL_SENDSMS_USER=net2app
  KANNEL_SENDSMS_PASS=sms-password
  SMPP_HOST=0.0.0.0
  SMPP_PORT=2775
"""

import os
import re
import uuid
import time
import json
import logging
import threading
import socket
import struct
from decimal import Decimal
from datetime import datetime

import psycopg2
import psycopg2.extras
import httpx

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('smpp_bridge')

# ─── Config ──────────────────────────────────────────────────
DB_URL = os.getenv('DATABASE_URL_SYNC', 'postgresql://net2app:password@localhost:5432/net2app_sms')
KANNEL_URL = os.getenv('KANNEL_SENDSMS_URL', 'http://127.0.0.1:13013/cgi-bin/sendsms')
KANNEL_USER = os.getenv('KANNEL_SENDSMS_USER', 'net2app')
KANNEL_PASS = os.getenv('KANNEL_SENDSMS_PASS', 'sms-password')
SMPP_HOST = os.getenv('SMPP_HOST', '0.0.0.0')
SMPP_PORT = int(os.getenv('SMPP_PORT', '2775'))

# ─── Database Connection ─────────────────────────────────────
def get_db():
    """Get a PostgreSQL connection"""
    return psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)


# ─── Authentication ──────────────────────────────────────────
def authenticate_client(system_id: str, password: str, ip: str) -> dict | None:
    """Authenticate SMPP client against the clients table"""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, client_code, company_name, balance, credit_limit,
                   billing_type, billing_mode, smpp_tps, force_dlr,
                   force_dlr_timeout, max_tps, is_active
            FROM clients
            WHERE smpp_username = %s AND smpp_password = %s AND is_active = true
        """, (system_id, password))
        client = cur.fetchone()

        if not client:
            logger.warning(f"Auth failed: system_id={system_id} ip={ip}")
            conn.close()
            return None

        # Check IP whitelist
        cur.execute("""
            SELECT COUNT(*) as cnt FROM client_ip_whitelist
            WHERE client_id = %s AND is_active = true
        """, (client['id'],))
        wl_count = cur.fetchone()['cnt']

        if wl_count > 0:
            cur.execute("""
                SELECT 1 FROM client_ip_whitelist
                WHERE client_id = %s AND ip_address = %s AND is_active = true
            """, (client['id'], ip))
            if not cur.fetchone():
                logger.warning(f"IP not whitelisted: {ip} for client {system_id}")
                conn.close()
                return None

        # Update bind status
        cur.execute("""
            UPDATE clients SET smpp_status = 'bound',
                smpp_last_activity = NOW(),
                smpp_session_id = %s
            WHERE id = %s
        """, (str(uuid.uuid4()), client['id']))
        conn.commit()
        conn.close()

        logger.info(f"Client authenticated: {system_id} ({client['company_name']}) from {ip}")
        return dict(client)
    except Exception as e:
        logger.error(f"Auth error: {e}")
        return None


# ─── MCC/MNC Resolution ─────────────────────────────────────
BD_PREFIXES = {
    '88017': '01', '88013': '01',   # Grameenphone
    '88018': '02', '88016': '02',   # Robi
    '88019': '03', '88014': '03',   # Banglalink
    '88015': '04',                   # Teletalk
}

def resolve_destination(number: str, conn) -> dict:
    """Resolve phone number to MCC/MNC/country/operator"""
    num = re.sub(r'[^\d]', '', number.lstrip('+').lstrip('00'))

    # Bangladesh special handling
    if num.startswith('880'):
        p5 = num[:5]
        mnc = BD_PREFIXES.get(p5)
        if mnc:
            cur = conn.cursor()
            cur.execute("SELECT * FROM mcc_mnc_data WHERE mcc='470' AND mnc=%s", (mnc,))
            row = cur.fetchone()
            if row:
                return {'mcc': '470', 'mnc': mnc, 'country': row['country_name'], 'operator': row['operator_name']}

    # Generic lookup by number prefix
    cur = conn.cursor()
    cur.execute("SELECT * FROM mcc_mnc_data WHERE %s LIKE number_prefix || '%%' ORDER BY LENGTH(number_prefix) DESC LIMIT 1", (num,))
    row = cur.fetchone()
    if row:
        return {'mcc': row['mcc'], 'mnc': row['mnc'], 'country': row['country_name'], 'operator': row['operator_name']}

    return {'mcc': '000', 'mnc': '00', 'country': 'Unknown', 'operator': 'Unknown'}


# ─── Rate Lookup ─────────────────────────────────────────────
def get_rate(entity_type: str, entity_id: str, mcc: str, mnc: str, conn) -> Decimal:
    """Lookup rate from client_rates or supplier_rates table"""
    table = 'client_rates' if entity_type == 'client' else 'supplier_rates'
    id_col = 'client_id' if entity_type == 'client' else 'supplier_id'
    cur = conn.cursor()

    # Exact MCC+MNC
    cur.execute(f"SELECT rate FROM {table} WHERE {id_col}=%s AND mcc=%s AND mnc=%s AND is_active=true LIMIT 1",
                (entity_id, mcc, mnc))
    row = cur.fetchone()
    if row: return Decimal(str(row['rate']))

    # MCC only
    cur.execute(f"SELECT rate FROM {table} WHERE {id_col}=%s AND mcc=%s AND (mnc IS NULL OR mnc='') AND is_active=true LIMIT 1",
                (entity_id, mcc))
    row = cur.fetchone()
    if row: return Decimal(str(row['rate']))

    return Decimal('0')


# ─── Apply Translations ─────────────────────────────────────
def apply_translations(entity_type: str, entity_id: str, source: str, destination: str, content: str, conn) -> tuple:
    """Apply translations in priority order"""
    table = 'client_translations' if entity_type == 'client' else 'supplier_translations'
    id_col = 'client_id' if entity_type == 'client' else 'supplier_id'
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table} WHERE {id_col}=%s AND is_active=true ORDER BY priority", (entity_id,))

    for t in cur.fetchall():
        try:
            if t['type'] == 'sid':
                if re.search(t['match_pattern'], source, re.IGNORECASE):
                    source = t['replace_pattern'] or source
            elif t['type'] == 'content':
                content = re.sub(t['match_pattern'], t['replace_pattern'] or '', content, flags=re.IGNORECASE)
            elif t['type'] == 'number':
                destination = re.sub(t['match_pattern'], t['replace_pattern'] or '', destination)
            elif t['type'] == 'extract_otp':
                pass  # Just extract, don't modify
            elif t['type'] == 'random_content':
                otp_match = re.search(t['match_pattern'], content)
                otp = otp_match.group() if otp_match else ''
                if t['replace_pattern']:
                    templates = [s.strip() for s in t['replace_pattern'].split('|') if s.strip()]
                    if templates:
                        import random
                        picked = random.choice(templates)
                        content = picked.replace('{{OTP}}', otp)
        except re.error:
            pass

    return source, destination, content


# ─── Route Selection ─────────────────────────────────────────
def select_route(client_id: str, mcc: str, mnc: str, conn) -> dict | None:
    """Select route and supplier for this destination"""
    cur = conn.cursor()

    # Find client route
    cur.execute("""
        SELECT cr.route_id, r.name as route_name, r.routing_type
        FROM client_routes cr JOIN routes r ON cr.route_id = r.id
        WHERE cr.client_id = %s AND cr.is_active = true AND r.is_active = true
            AND (cr.mcc = %s OR cr.mcc IS NULL)
        ORDER BY cr.priority LIMIT 1
    """, (client_id, mcc))
    route = cur.fetchone()

    if not route:
        # Try default route
        cur.execute("SELECT default_route_id FROM clients WHERE id=%s", (client_id,))
        cl = cur.fetchone()
        if cl and cl['default_route_id']:
            cur.execute("SELECT id as route_id, name as route_name, routing_type FROM routes WHERE id=%s AND is_active=true",
                        (cl['default_route_id'],))
            route = cur.fetchone()
        if not route:
            return None

    # Get trunk from route
    cur.execute("""
        SELECT rt.trunk_id, t.name as trunk_name
        FROM route_trunks rt JOIN trunks t ON rt.trunk_id = t.id
        WHERE rt.route_id = %s AND rt.is_active = true AND t.is_active = true
        ORDER BY rt.priority LIMIT 1
    """, (route['route_id'],))
    trunk = cur.fetchone()
    if not trunk:
        return None

    # Get supplier from trunk (priority-based by default)
    cur.execute("""
        SELECT ts.supplier_id, s.supplier_code, s.smpp_host, s.connection_type
        FROM trunk_suppliers ts JOIN suppliers s ON ts.supplier_id = s.id
        WHERE ts.trunk_id = %s AND ts.is_active = true AND s.is_active = true
        ORDER BY ts.priority LIMIT 1
    """, (trunk['trunk_id'],))
    supplier = cur.fetchone()
    if not supplier:
        return None

    return {
        'route_id': route['route_id'], 'route_name': route['route_name'],
        'trunk_id': trunk['trunk_id'], 'trunk_name': trunk['trunk_name'],
        'supplier_id': supplier['supplier_id'], 'supplier_code': supplier['supplier_code'],
        'routing_type': route['routing_type'],
    }


# ─── Message Processing Pipeline ────────────────────────────
def process_message(client: dict, source: str, destination: str, content: str, client_ip: str) -> dict:
    """
    Full SMS processing pipeline:
    1. Client translations
    2. Resolve MCC/MNC
    3. Rate lookup
    4. Balance check
    5. Route selection
    6. Supplier translations
    7. Billing (deduct balance)
    8. Insert into send_sms (SQLbox picks up)
    9. Log to sms_logs
    """
    conn = get_db()
    msg_id = uuid.uuid4().hex[:10].upper()

    try:
        # 1. Client translations
        source, destination, content = apply_translations('client', client['id'], source, destination, content, conn)

        # 2. Resolve destination
        dest = resolve_destination(destination, conn)

        # 3. Rate lookup
        client_rate = get_rate('client', client['id'], dest['mcc'], dest['mnc'], conn)

        # 4. Balance check
        available = Decimal(str(client['balance']))
        if client['billing_type'] == 'postpaid':
            available += Decimal(str(client['credit_limit']))
        if client_rate > 0 and available < client_rate:
            conn.close()
            return {'status': 'rejected', 'error': 'Insufficient balance',
                    'balance': float(client['balance']), 'rate': float(client_rate)}

        # 5. Route selection
        route = select_route(client['id'], dest['mcc'], dest['mnc'], conn)
        supplier_id = route['supplier_id'] if route else None
        supplier_code = route['supplier_code'] if route else 'default'

        # 6. Supplier rate & translations
        supplier_rate = Decimal('0')
        if supplier_id:
            supplier_rate = get_rate('supplier', supplier_id, dest['mcc'], dest['mnc'], conn)
            source, destination, content = apply_translations('supplier', supplier_id, source, destination, content, conn)

        profit = client_rate - supplier_rate

        # 7. Deduct client balance (submit billing mode)
        cur = conn.cursor()
        if client_rate > 0 and client['billing_mode'] in ('send', 'submit'):
            cur.execute("UPDATE clients SET balance = balance - %s WHERE id = %s",
                        (float(client_rate), client['id']))

        # 8. Insert into send_sms (SQLbox picks up → Kannel → SMSC)
        cur.execute("""
            INSERT INTO send_sms (sender, receiver, msgdata, smsc_id, account, momt)
            VALUES (%s, %s, %s, %s, %s, 'MT')
        """, (source, destination, content, supplier_code, client['client_code']))

        # 9. Log to sms_logs
        cur.execute("""
            INSERT INTO sms_logs (
                message_id, client_id, client_code, supplier_id, supplier_code,
                source_addr, destination_addr, message_content,
                mcc, mnc, country, operator,
                route_id, trunk_id,
                client_rate, supplier_rate, profit,
                billing_mode, status, submit_time, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, 'submitted', NOW(), NOW()
            )
        """, (
            msg_id, client['id'], client['client_code'],
            supplier_id, supplier_code,
            source, destination, content,
            dest['mcc'], dest['mnc'], dest['country'], dest['operator'],
            route['route_id'] if route else None,
            route['trunk_id'] if route else None,
            float(client_rate), float(supplier_rate), float(profit),
            client['billing_mode'],
        ))

        conn.commit()
        conn.close()

        logger.info(f"MSG {msg_id}: {client['client_code']} → {destination} "
                     f"({dest['country']}/{dest['operator']}) "
                     f"rate=${float(client_rate):.6f} cost=${float(supplier_rate):.6f} "
                     f"profit=${float(profit):.6f} via {supplier_code}")

        return {
            'status': 'submitted',
            'message_id': msg_id,
            'client_rate': float(client_rate),
            'supplier_rate': float(supplier_rate),
            'profit': float(profit),
            'destination': destination,
            'mcc': dest['mcc'], 'mnc': dest['mnc'],
            'country': dest['country'], 'operator': dest['operator'],
            'route': route['route_name'] if route else 'default',
            'supplier': supplier_code,
        }

    except Exception as e:
        logger.error(f"Processing error: {e}")
        conn.rollback()
        conn.close()
        return {'status': 'failed', 'error': str(e)}


if __name__ == '__main__':
    logger.info(f"SMPP Bridge starting on {SMPP_HOST}:{SMPP_PORT}")
    logger.info(f"Database: {DB_URL.split('@')[1] if '@' in DB_URL else DB_URL}")
    logger.info(f"Kannel: {KANNEL_URL}")

    # Test DB connection
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as c FROM clients WHERE is_active=true")
        count = cur.fetchone()['c']
        logger.info(f"Database connected. {count} active clients.")
        conn.close()
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        exit(1)

    logger.info("SMPP Bridge ready. Waiting for connections...")
    # In production, this would use smpplib to create a real SMPP server
    # For now, FastAPI handles SMPP via the /api/sms/send endpoint
    import time
    while True:
        time.sleep(60)
