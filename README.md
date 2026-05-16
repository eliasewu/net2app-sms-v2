# net2app SMS Hub — Enterprise SMS Gateway Platform

> Full-stack SMS Hub with Kannel 1.4.5 (Bearbox + Smsbox + SQLbox), SMPP Bridge, FastAPI backend, React dashboard, PostgreSQL, Redis, RabbitMQ.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Port & Service Map](#port--service-map)
3. [System Requirements](#system-requirements)
4. [Required Packages (with permissions)](#required-packages)
5. [Installation](#installation)
6. [Database Schema (All 28 Tables)](#database-schema)
7. [Frontend ↔ Backend Connectivity](#frontend--backend-connectivity)
8. [API Endpoint Reference](#api-endpoint-reference)
9. [SMS Flow: Client → Routing → Trunk → Supplier](#sms-flow)
10. [Kannel Configuration](#kannel-configuration)
11. [Security & SSL](#security--ssl)

---

## Architecture

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                          net2app SMS Hub Architecture                            ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  ┌────────────────┐                    ┌──────────────────────────────────────┐  ║
║  │  Client A      │───SMPP :2775──────▶│  Python SMPP Bridge (smpplib)       │  ║
║  │  (Transceiver) │                    │  Auth → TPS → Translate → Route     │  ║
║  └────────────────┘                    └───────────────┬──────────────────────┘  ║
║                                                        │                          ║
║  ┌────────────────┐                    ┌───────────────▼──────────────────────┐  ║
║  │  Client B      │───HTTP POST───────▶│  FastAPI Backend (:8000)            │  ║
║  │  (REST API)    │                    │  /api/sms/send → Routing Engine     │  ║
║  └────────────────┘                    └───────────────┬──────────────────────┘  ║
║                                                        │                          ║
║  ┌────────────────┐                    ┌───────────────▼──────────────────────┐  ║
║  │  React Frontend│───Nginx :80───────▶│  Nginx Reverse Proxy                │  ║
║  │  Dashboard     │   /api/* ─────────▶│  /api/* → :8000 (FastAPI)           │  ║
║  └────────────────┘                    └──────────────────────────────────────┘  ║
║                                                        │                          ║
║                                        ┌───────────────▼──────────────────────┐  ║
║                                        │  PostgreSQL (:5432)                  │  ║
║                                        │  INSERT INTO send_sms               │  ║
║                                        └───────────────┬──────────────────────┘  ║
║                                                        │                          ║
║                                        ┌───────────────▼──────────────────────┐  ║
║                                        │  Kannel SQLbox (:13005)              │  ║
║                                        │  Watches send_sms → pushes to BB    │  ║
║                                        └───────────────┬──────────────────────┘  ║
║                                                        │                          ║
║                                        ┌───────────────▼──────────────────────┐  ║
║                                        │  Kannel Bearbox (:13001)             │  ║
║                                        │  Routes by smsc-id / prefix          │  ║
║                                        └──────┬──────────────┬────────────────┘  ║
║                                               │              │                    ║
║                                ┌──────────────▼──┐  ┌───────▼────────────────┐  ║
║                                │  SMSC: AllSMS   │  │  SMSC: BDTel (HTTP)   │  ║
║                                │  5.78.72.23     │  │  api.bdtel.com/send   │  ║
║                                │  SMPP :2775     │  │  POST with apiKey     │  ║
║                                └─────────────────┘  └────────────────────────┘  ║
║                                                                                   ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                            ║
║  │ Redis :6379  │  │ RabbitMQ     │  │ Celery       │                            ║
║  │ Cache/TPS/   │  │ :5672        │  │ Workers      │                            ║
║  │ Sessions     │  │ DLR/Notif Q  │  │ Async tasks  │                            ║
║  └──────────────┘  └──────────────┘  └──────────────┘                            ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## Port & Service Map

| Port | Service | Protocol | Description |
|------|---------|----------|-------------|
| `80` | Nginx | HTTP | Frontend dashboard + reverse proxy to `/api/*` |
| `443` | Nginx | HTTPS | TLS-terminated frontend (optional with certbot) |
| `2775` | SMPP Server | TCP/SMPP | Client SMPP bind port (Python smpplib bridge) |
| `5432` | PostgreSQL | TCP | Database — all 28 tables, SQLbox read/write |
| `6379` | Redis | TCP | Session cache, TPS rate-limiters, route cache |
| `5672` | RabbitMQ | AMQP | DLR queue, notification queue, campaign queue |
| `8000` | FastAPI | HTTP | REST API — all `/api/*` endpoints |
| `13000` | Kannel Admin | HTTP | Bearbox admin panel: `/status?type=json` |
| `13001` | Kannel BB-Smsbox | TCP | Internal: Bearbox ↔ Smsbox connection |
| `13005` | Kannel SQLbox | TCP | Internal: SQLbox ↔ Bearbox bridge |
| `13013` | Kannel Smsbox | HTTP | `/cgi-bin/sendsms` — direct SMS send |
| `15672` | RabbitMQ Mgmt | HTTP | RabbitMQ management UI (optional) |

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Debian 11 / Ubuntu 20.04 | Debian 12 / Ubuntu 24.04 |
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 32 GB |
| Storage | 100 GB SSD | 500 GB NVMe |
| Network | 100 Mbps | 1–10 Gbps |
| Python | 3.10+ | 3.11+ |
| Node.js | 18+ | 20 LTS |
| PostgreSQL | 14+ | 15+ |

---

## Required Packages

All packages installed by `scripts/install.sh` with full `root` permissions (`sudo`).

### System / Build Dependencies

| Package | Purpose | Permission |
|---------|---------|------------|
| `build-essential` | GCC, G++, Make — compiling Kannel from source | root |
| `bison` | Parser generator — Kannel build dependency | root |
| `flex` | Lexical analyzer — Kannel build dependency | root |
| `libtool` | Generic library support — Kannel build | root |
| `autoconf` | Auto-configuration scripts | root |
| `automake` | Makefile generator | root |
| `libxml2-dev` | XML parsing library — Kannel SMPP/HTTP | root |
| `libssl-dev` | OpenSSL development headers — TLS support | root |
| `openssl` | SSL/TLS toolkit | root |
| `libpq-dev` | PostgreSQL client library — Kannel SQLbox | root |
| `curl` / `wget` | HTTP download utilities | root |
| `git` | Version control | root |
| `unzip` | Archive extraction | root |
| `gnupg2` | GPG keys for repo signing | root |
| `lsb-release` | OS version detection | root |

### Runtime Services

| Package | Version | Purpose | Permission |
|---------|---------|---------|------------|
| `postgresql-15` | 15.x | Main database — all tables + SQLbox | root (systemd) |
| `postgresql-contrib-15` | 15.x | Extensions (uuid-ossp, pg_trgm) | root |
| `redis-server` | 7.x | Cache, TPS counters, session store | root (systemd) |
| `rabbitmq-server` | 3.x | Message queue for DLR, notifications | root (systemd) |
| `nginx` | 1.24+ | Reverse proxy, static file serving | root (systemd) |
| `supervisor` | 4.x | Process management for API + SMPP + Celery | root |
| `certbot` | latest | SSL certificate automation (Let's Encrypt) | root |
| `python3-certbot-nginx` | latest | Nginx certbot plugin | root |
| `ufw` | latest | Firewall management | root |

### Kannel 1.4.5 (compiled from source)

| Component | Binary | Config File | Purpose |
|-----------|--------|-------------|---------|
| Bearbox | `/usr/local/sbin/bearerbox` | `/etc/kannel/kannel.conf` | Core gateway — routes SMS between SMSCs |
| Smsbox | `/usr/local/sbin/smsbox` | `/etc/kannel/kannel.conf` | HTTP send interface — `/cgi-bin/sendsms` |
| SQLbox | `/usr/local/sbin/sqlbox` | `/etc/kannel/sqlbox.conf` | DB bridge — watches `send_sms` table |

**Compile flags:** `./configure --prefix=/usr/local --with-pgsql --with-ssl --enable-start-stop-daemon`

### Python Packages (installed in venv at `/opt/net2app-sms/backend/venv/`)

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.109.0 | REST API framework |
| `uvicorn[standard]` | 0.27.0 | ASGI server |
| `python-multipart` | 0.0.6 | File upload handling |
| `python-jose[cryptography]` | 3.3.0 | JWT token generation |
| `passlib[bcrypt]` | 1.7.4 | Password hashing |
| `sqlalchemy` | 2.0.25 | ORM — database models |
| `asyncpg` | 0.29.0 | Async PostgreSQL driver |
| `alembic` | 1.13.1 | Database migrations |
| `psycopg2-binary` | 2.9.9 | Sync PostgreSQL driver |
| `smpplib` | 2.2.1 | SMPP protocol library |
| `redis` | 5.0.1 | Redis client |
| `pika` | 1.3.2 | RabbitMQ client |
| `celery` | 5.3.6 | Async task queue |
| `kombu` | 5.3.4 | Messaging abstraction (Celery) |
| `httpx` | 0.26.0 | Async HTTP client |
| `aiohttp` | 3.9.1 | Async HTTP sessions |
| `python-dotenv` | 1.0.0 | Environment variable loading |
| `pydantic` | 2.5.3 | Data validation |
| `pydantic-settings` | 2.1.0 | Settings management |
| `email-validator` | 2.1.0 | Email format validation |
| `phonenumbers` | 8.13.27 | Phone number parsing + MCC/MNC lookup |
| `apscheduler` | 3.10.4 | Cron-like scheduled tasks |
| `structlog` | 24.1.0 | Structured logging |
| `sentry-sdk` | 1.39.1 | Error monitoring |
| `openpyxl` | 3.1.2 | Excel file handling (bulk rates) |
| `pandas` | 2.1.4 | CSV/data manipulation |
| `reportlab` | 4.0.8 | PDF invoice generation |
| `aiosmtplib` | 3.0.1 | Async email sending |
| `jinja2` | 3.1.3 | Email template rendering |

### Node.js Packages (frontend build)

| Package | Purpose |
|---------|---------|
| `react` | UI framework |
| `react-router-dom` | Client-side routing |
| `recharts` | Dashboard charts |
| `zustand` | State management |
| `lucide-react` | Icon library |
| `tailwindcss` | CSS framework |
| `date-fns` | Date utilities |
| `react-hot-toast` | Notifications |
| `clsx` | Class merging |
| `uuid` | UUID generation |
| `vite` | Build tool |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/net2app/sms-hub.git
cd sms-hub

# 2. Run the installer (auto-detects OS, IP, hardware)
chmod +x scripts/install.sh
sudo ./scripts/install.sh

# 3. Credentials are saved to:
#    /opt/net2app-sms/credentials.txt
```

The script:
- Detects Debian/Ubuntu version, server IP, CPU cores, RAM
- Updates system packages
- Installs all dependencies (skips already-installed packages)
- Compiles Kannel 1.4.5 from source with `--with-pgsql`
- Creates PostgreSQL database with all 28 tables
- Configures Redis, RabbitMQ, Nginx, Supervisor
- Creates systemd services for bearbox, smsbox, sqlbox
- Sets up UFW firewall rules
- Generates random passwords for all services

---

## Database Schema

**28 tables** across 11 functional groups. Full SQL in `backend/database/schema.sql`.

### Group 0 — Kannel SQLbox Tables

| # | Table | Columns | Purpose |
|---|-------|---------|---------|
| 1 | `send_sms` | `sql_id, momt, sender, receiver, msgdata, sms_type, smsc_id, dlr_url, account, coding, validity, deferred, meta_data` | **Outgoing queue** — Frontend INSERTs here, SQLbox watches and pushes to Kannel |
| 2 | `sent_sms` | `sql_id, momt, sender, receiver, msgdata, sms_type, smsc_id, dlr_url, account, coding, ts` | **Sent log** — Kannel writes here after submission |
| 3 | `dlr` | `sql_id, smsc, ts, src, dst, service, url, mask, status, boxc` | **DLR storage** — Kannel writes delivery receipts here |

### Group 1 — Users & Authentication

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 4 | `users` | `id, username, email, password_hash, role, entity_id, entity_type, is_active` | Platform users (super_admin/admin/support/billing/agent/client/supplier) |
| 5 | `user_sessions` | `user_id, token_hash, ip_address, expires_at` | JWT session tracking |
| 6 | `user_permissions` | `user_id, permission, granted` | Granular permission overrides |

### Group 2 — Clients

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 7 | `clients` | `client_code, company_name, balance, credit_limit, billing_type, billing_mode, smpp_username, smpp_password, smpp_status, force_dlr, max_tps` | Client accounts — SMPP creds, billing, controls |
| 8 | `client_ip_whitelist` | `client_id, ip_address` | IP whitelist per client |
| 9 | `client_translations` | `client_id, priority, type, match_pattern, replace_pattern` | Content/Number/SID/OTP translations (ordered by priority) |

### Group 3 — Suppliers

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 10 | `suppliers` | `supplier_code, connection_type, smpp_host, smpp_port, api_send_url, api_key, smpp_status` | Supplier accounts — SMPP/HTTP/WhatsApp/Telegram connections |
| 11 | `supplier_translations` | `supplier_id, priority, type, match_pattern, replace_pattern` | Supplier-side message transformations |
| 12 | `api_templates` | `name, region, send_url_template, auth_type, params_mapping` | Pre-built HTTP API connector templates (Twilio, SSL Wireless, MSG91, etc.) |

### Group 4 — Trunks & Routes

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 13 | `trunks` | `name, trunk_type (sim/voiceotp/marketing/spam/direct/local_direct)` | Supplier trunk groups |
| 14 | `trunk_suppliers` | `trunk_id, supplier_id, priority, weight` | Supplier assignment to trunks |
| 15 | `routes` | `name, routing_type (priority/lcr/performance/round_robin/testing)` | Routing rules |
| 16 | `route_trunks` | `route_id, trunk_id, priority` | Trunk assignment to routes |
| 17 | `routing_plans` | `name, allowed_trunk_types[]` | Plans restricting trunk types per client |
| 18 | `client_routes` | `client_id, route_id, mcc, mnc, prefix, priority` | Per-client route assignment by destination |

### Group 5 — MCC/MNC & Rates

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 19 | `mcc_mnc_data` | `mcc, mnc, country_name, country_code, operator_name, number_prefix` | Global operator database |
| 20 | `client_rates` | `client_id, mcc, mnc, rate, currency` | Per-destination client rates |
| 21 | `supplier_rates` | `supplier_id, mcc, mnc, rate` | Per-destination supplier rates |
| 22 | `rate_history` | `entity_type, entity_id, old_rate, new_rate, changed_by` | Rate change audit trail |

### Group 6 — SMS Logs

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 23 | `sms_logs` | `message_id, client_id, supplier_id, source_addr, destination_addr, mcc, mnc, client_rate, supplier_rate, profit, status, billing_mode` | **Complete CDR** — partitioned by month, auto-purge after 4 months |

### Group 7 — Billing

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 24 | `payments` | `payment_number, entity_type, entity_id, amount, payment_type, balance_before, balance_after` | Payment records — **NEVER deleted** |
| 25 | `invoices` | `invoice_number, client_id, period_start, period_end, total_amount, status` | Invoice management |
| 26 | `invoice_items` | `invoice_id, description, quantity, unit_price, total, country` | Invoice line items |

### Group 8 — Reports

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 27 | `daily_reports` | `report_date, entity_type, total_submitted, total_delivered, profit, by_country, by_hour` | Daily aggregated stats |
| 28 | `hourly_reports` | `report_hour, entity_type, total_submitted, revenue, profit` | Hourly granular stats |

### Group 9 — Notifications

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 29 | `notification_settings` | `user_id, notification_type, email_enabled, dashboard_enabled, threshold_value` | Alert configuration per user |
| 30 | `notifications` | `user_id, type, title, message, is_read` | Notification history |
| 31 | `email_templates` | `name, subject, body, variables` | Editable email templates |

### Group 10 — Campaigns

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 32 | `campaigns` | `client_id, name, route_id, tps_limit, total_volume, status` | Bulk campaign management |
| 33 | `campaign_numbers` | `campaign_id, phone_number, status, message_id` | Individual numbers in campaign |

### Group 11 — Platform

| # | Table | Key Columns | Purpose |
|---|-------|-------------|---------|
| 34 | `platform_license` | `license_key, plan_type, monthly_limit, sms_enabled, voiceotp_enabled` | License and plan management |
| 35 | `platform_settings` | `key, value, description` | Global config key-value store |
| 36 | `backup_history` | `backup_type, file_path, status` | Backup/restore tracking |
| 37 | `audit_logs` | `user_id, action, entity_type, old_data, new_data, ip_address` | Complete audit trail |

---

## Frontend ↔ Backend Connectivity

### How It Works

```
React App (:80/Nginx)
    │
    │  fetch('/api/clients')
    │  Authorization: Bearer <jwt>
    │
    ▼
Nginx (:80)
    │
    │  proxy_pass http://127.0.0.1:8000
    │
    ▼
FastAPI (:8000)
    │
    │  SQLAlchemy ORM
    │
    ▼
PostgreSQL (:5432)
```

### Three SMS Sending Methods

| Method | Endpoint | Flow | Use Case |
|--------|----------|------|----------|
| **A) API** | `POST :8000/api/sms/send` | FastAPI → Route → Bill → INSERT `send_sms` → SQLbox → Kannel → SMSC | Production (billing-aware) |
| **B) Kannel Direct** | `GET :13013/cgi-bin/sendsms` | Direct to Kannel smsbox (bypasses billing) | Internal testing only |
| **C) DB Injection** | `POST :8000/api/sms/inject` | FastAPI → INSERT `send_sms` → SQLbox picks up | Bulk/campaign sends |

### Frontend API Service Layer

File: `src/lib/api.ts` — complete API client with auth token management.

```typescript
// Example usage in React component:
import { clientsApi, smsApi } from '../lib/api';

// List clients
const clients = await clientsApi.list('page=1&limit=50');

// Send SMS via API (Method A)
const result = await smsApi.sendViaApi({
  source: 'BRAND', destination: '+880171234567', message: 'OTP: 123456'
});

// Send via Kannel direct (Method B)
const result = await smsApi.sendViaKannel({
  username: 'net2app', password: 'sms-password',
  to: '+880171234567', text: 'Hello', smsc: 'allsms_global'
});

// Send via SQLbox injection (Method C)
const result = await smsApi.sendViaSqlbox({
  receiver: '+880171234567', msgdata: 'Hello', smsc_id: 'allsms_global'
});
```

### Environment Variables

Create `.env` in project root for frontend:

```env
VITE_API_URL=http://your-server-ip:8000
VITE_KANNEL_URL=http://your-server-ip:13013
VITE_KANNEL_ADMIN_URL=http://your-server-ip:13000
```

---

## API Endpoint Reference

**Base URL:** `http://server:8000`  
**Auth:** `Authorization: Bearer <jwt_token>` (except login)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login → returns JWT token |
| `GET` | `/api/auth/me` | Current user profile |
| `POST` | `/api/auth/logout` | Invalidate session |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients?page=1&limit=50&search=&status=active` | List clients (paginated) |
| `POST` | `/api/clients` | Create client |
| `GET` | `/api/clients/:id` | Get client details |
| `PUT` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Soft-delete client |
| `POST` | `/api/clients/:id/topup` | Add funds |
| `GET` | `/api/clients/:id/balance` | Balance + credit info |
| `GET` | `/api/clients/:id/bind-status` | Real-time SMPP status |
| `POST` | `/api/clients/:id/bind` | Trigger SMPP bind |
| `POST` | `/api/clients/:id/unbind` | Disconnect SMPP |
| `GET` | `/api/clients/:id/translations` | List translations |
| `POST` | `/api/clients/:id/translations` | Add translation |
| `DELETE` | `/api/clients/:id/translations/:tid` | Remove translation |
| `GET` | `/api/clients/:id/whitelist` | List IP whitelist |
| `POST` | `/api/clients/:id/whitelist` | Add IP |
| `DELETE` | `/api/clients/:id/whitelist/:wid` | Remove IP |
| `GET` | `/api/clients/:id/routes` | Client route assignments |
| `POST` | `/api/clients/:id/routes` | Assign route to client |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/suppliers` | List suppliers |
| `POST` | `/api/suppliers` | Create (SMPP/HTTP/WhatsApp/Telegram/OTT) |
| `GET` | `/api/suppliers/:id` | Get supplier |
| `PUT` | `/api/suppliers/:id` | Update supplier |
| `DELETE` | `/api/suppliers/:id` | Delete supplier |
| `GET` | `/api/suppliers/:id/bind-status` | SMPP connection status |
| `POST` | `/api/suppliers/:id/bind` | Connect to supplier SMSC |
| `POST` | `/api/suppliers/:id/unbind` | Disconnect |
| `GET` | `/api/suppliers/:id/translations` | Supplier translations |
| `POST` | `/api/suppliers/:id/translations` | Add translation |

### Routing
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/trunks` | List trunks |
| `POST` | `/api/trunks` | Create trunk |
| `PUT` | `/api/trunks/:id` | Update trunk |
| `DELETE` | `/api/trunks/:id` | Delete trunk |
| `GET` | `/api/routes` | List routes |
| `POST` | `/api/routes` | Create route |
| `PUT` | `/api/routes/:id` | Update route |
| `DELETE` | `/api/routes/:id` | Delete route |
| `GET` | `/api/routing-plans` | List routing plans |
| `POST` | `/api/routing-plans` | Create plan |

### Rates & MCC/MNC
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rates?entity_type=client&entity_id=uuid` | List rates |
| `POST` | `/api/rates` | Add single rate |
| `PUT` | `/api/rates/:id` | Update rate |
| `DELETE` | `/api/rates/:id` | Delete rate |
| `POST` | `/api/rates/bulk` | Bulk upload rates (CSV/JSON) |
| `GET` | `/api/rates/mccmnc?country=Bangladesh` | Browse MCC/MNC database |
| `POST` | `/api/rates/mccmnc` | Add MCC/MNC entry |
| `POST` | `/api/rates/mccmnc/bulk` | Bulk upload MCC/MNC |
| `GET` | `/api/rates/mccmnc/export` | Export as CSV |

### SMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sms/send` | **Method A** — Send via routing engine (with billing) |
| `POST` | `/api/sms/inject` | **Method C** — INSERT into send_sms for SQLbox |
| `GET` | `/api/sms/status/:message_id` | Query message status |
| `GET` | `/api/sms/logs?client_id=&status=&from=&to=&page=1` | CDR query |
| `GET` | `/api/sms/dlr?msgid=&status=&src=&dst=&smsc=` | DLR callback from Kannel |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/billing/summary` | Revenue, cost, profit summary |
| `GET` | `/api/billing/invoices` | List invoices |
| `GET` | `/api/billing/invoices/:id` | Invoice detail |
| `POST` | `/api/billing/invoices/generate` | Generate invoice |
| `PUT` | `/api/billing/invoices/:id` | Update invoice |
| `POST` | `/api/billing/invoices/:id/mark-paid` | Mark as paid (admin/billing only) |
| `POST` | `/api/billing/invoices/:id/send` | Email invoice |
| `GET` | `/api/billing/payments` | Payment history |
| `POST` | `/api/billing/payments` | Record payment |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/realtime` | Live dashboard metrics |
| `GET` | `/api/reports/hourly?date=2024-01-15` | Hourly breakdown |
| `GET` | `/api/reports/daily?from=&to=` | Daily stats |
| `GET` | `/api/reports/monthly?year=2024` | Monthly summary |
| `GET` | `/api/reports/export?format=csv` | Export as CSV/XLSX |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/campaigns` | Create campaign |
| `PUT` | `/api/campaigns/:id` | Update (start/pause/stop) |
| `DELETE` | `/api/campaigns/:id` | Delete campaign |
| `POST` | `/api/campaigns/:id/numbers` | Upload numbers (CSV/XLSX multipart) |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications |
| `PUT` | `/api/notifications/:id/read` | Mark as read |
| `POST` | `/api/notifications/read-all` | Mark all read |
| `GET` | `/api/notifications/settings` | Alert preferences |
| `PUT` | `/api/notifications/settings` | Update preferences |
| `GET` | `/api/notifications/templates` | Email templates |
| `PUT` | `/api/notifications/templates/:id` | Edit template |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/system/license` | License info |
| `PUT` | `/api/system/license` | Update license |
| `GET` | `/api/system/settings` | Platform settings |
| `PUT` | `/api/system/settings` | Update settings |
| `POST` | `/api/system/backup` | Create database backup |
| `GET` | `/api/system/backups` | List backup history |
| `POST` | `/api/system/restore` | Restore from backup |
| `GET` | `/health` | Service health check |

### API Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/api-templates` | List HTTP API connector templates |
| `POST` | `/api/api-templates` | Add template |
| `PUT` | `/api/api-templates/:id` | Update template |
| `DELETE` | `/api/api-templates/:id` | Delete template |

---

## SMS Flow

```
Client (SMPP :2775 / HTTP :8000)
  │
  ├─ 1. AUTHENTICATE — Validate SMPP creds or API key + IP whitelist
  ├─ 2. CLIENT TRANSLATIONS — Apply in priority order:
  │     Content → Number → SID → OTP Extract → Random Content
  ├─ 3. MCC/MNC LOOKUP — Parse destination → country + operator
  ├─ 4. CLIENT RATE — Lookup rate for this MCC/MNC for this client
  ├─ 5. BALANCE CHECK
  │     Prepaid: balance >= rate
  │     Postpaid: balance + credit_limit >= rate
  ├─ 6. ROUTE SELECTION
  │     client_routes → match by MCC/MNC/prefix → get route
  │     Route → routing_type determines supplier selection:
  │       PRIORITY: First available by priority
  │       LCR: Lowest supplier rate
  │       PERFORMANCE: Best delivery ratio
  │       ROUND_ROBIN: Load-balanced by weight
  ├─ 7. TRUNK SELECTION — From route, select trunk
  ├─ 8. SUPPLIER SELECTION — From trunk, select supplier
  ├─ 9. SUPPLIER RATE — Lookup cost, calculate profit
  ├─ 10. SUPPLIER TRANSLATIONS — Transform for supplier format
  ├─ 11. BILLING — Charge based on billing_mode (send/submit/dlr)
  ├─ 12. INSERT send_sms — SQLbox picks up and pushes to Kannel
  ├─ 13. KANNEL → SMSC — Bearbox routes to supplier by smsc-id
  └─ 14. DLR CALLBACK → /api/sms/dlr → update sms_logs → notify client
```

---

## Kannel Configuration

### kannel.conf (Bearbox + Smsbox)

```ini
group = core
admin-port = 13000
admin-password = <generated>
smsbox-port = 13001

group = smsbox
bearerbox-host = 127.0.0.1
sendsms-port = 13013

group = sendsms-user
username = net2app
password = <generated>
concatenation = true

group = sms-service
keyword = default
catch-all = yes
get-url = "http://127.0.0.1:8000/api/sms/dlr?msgid=%I&status=%d&src=%p&dst=%P&smsc=%i"
```

### sqlbox.conf

```ini
group = sqlbox
bearerbox-host = 127.0.0.1
bearerbox-port = 13001
smsbox-port = 13005
sql-type = pgsql
sql-host = localhost
sql-port = 5432
sql-username = net2app
sql-password = <generated>
sql-database = net2app_sms
sql-insert-table = sent_sms
```

---

## Security & SSL

- For **internal testing**, SSL validation is disabled:
  - No `ssl-client-certkey-file` in kannel.conf
  - Use `rejectUnauthorized: false` in Node.js HTTPS agents
- For **production**, enable via certbot:
  ```bash
  sudo certbot --nginx -d your-domain.com
  ```
- Firewall (UFW) only allows ports: 22 (SSH), 80, 443, 2775, 8000

---

## Default Credentials

After installation, check `/opt/net2app-sms/credentials.txt` for all generated passwords.

| Service | Default User | Password |
|---------|-------------|----------|
| Dashboard | `admin` | `admin123` (change immediately) |
| PostgreSQL | `net2app` | (auto-generated) |
| Redis | — | (auto-generated) |
| RabbitMQ | `net2app` | (auto-generated) |
| Kannel Smsbox | `net2app` | (auto-generated) |

---

## Service Management

```bash
# Check all services
supervisorctl status

# Kannel
systemctl status kannel-bearerbox
systemctl status kannel-smsbox
systemctl status kannel-sqlbox

# Database
systemctl status postgresql

# Cache
systemctl status redis-server

# Queue
systemctl status rabbitmq-server

# Web server
systemctl status nginx

# Logs
tail -f /opt/net2app-sms/logs/api-out.log
tail -f /var/log/kannel/bearerbox.log
tail -f /var/log/kannel/smsbox-access.log
```

---

Built with ❤️ by net2app Technologies
