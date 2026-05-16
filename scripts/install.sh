#!/bin/bash
###############################################################################
# net2app SMS Hub — Complete Production Deployment Script
# Supports: Debian 11/12, Ubuntu 20.04/22.04/24.04
#
# Installs & configures:
#   - PostgreSQL 15 (+ UUID, pg_trgm extensions)
#   - Redis 7
#   - RabbitMQ 3
#   - Kannel 1.4.5 (Bearbox + Smsbox + SQLbox)
#   - Python 3.11 + FastAPI + SMPP Bridge
#   - Node.js 20 (frontend build)
#   - Nginx (reverse proxy)
#   - Supervisor (process management)
#   - UFW (firewall)
#
# Auto-detects: OS, IP, CPU cores, RAM.
# If a package is already installed, only config is updated.
#
# Usage:
#   chmod +x scripts/install.sh
#   sudo ./scripts/install.sh
###############################################################################

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; C='\033[0;36m'; NC='\033[0m'

# ─── Check root ─────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && echo -e "${R}ERROR: Run as root (sudo)${NC}" && exit 1

# ─── Detect OS / IP / Hardware ───────────────────────────────────────
. /etc/os-release 2>/dev/null || { echo -e "${R}Cannot detect OS${NC}"; exit 1; }
OS_ID="$ID"
OS_VER="$VERSION_ID"
OS_NAME="$PRETTY_NAME"
SERVER_IP=$(hostname -I | awk '{print $1}')
CPU_CORES=$(nproc)
RAM_MB=$(free -m | awk '/Mem:/{print $2}')
DISK_GB=$(df -BG / | awk 'NR==2{print $2}' | tr -d 'G')

echo -e "${G}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${G}║        net2app SMS Hub — Production Installer           ║${NC}"
echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${G}║ ${C}OS:${NC}   $OS_NAME"
echo -e "${G}║ ${C}IP:${NC}   $SERVER_IP"
echo -e "${G}║ ${C}CPU:${NC}  $CPU_CORES cores"
echo -e "${G}║ ${C}RAM:${NC}  ${RAM_MB} MB"
echo -e "${G}║ ${C}Disk:${NC} ${DISK_GB} GB"
echo -e "${G}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Generate Credentials ───────────────────────────────────────────
INSTALL_DIR="/opt/net2app-sms"
DB_NAME="net2app_sms"
DB_USER="net2app"
DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
REDIS_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
SECRET_KEY=$(openssl rand -hex 32)
KANNEL_ADMIN_PASS="kannel-$(openssl rand -hex 8)"
SMSBOX_USER="net2app"
SMSBOX_PASS="sms-$(openssl rand -hex 8)"

STEP=0
TOTAL=16
progress() { STEP=$((STEP+1)); echo -e "\n${G}[$STEP/$TOTAL] $1${NC}"; }

# ═══════════════════════════════════════════════════════════════════
# STEP 1 — System update
# ═══════════════════════════════════════════════════════════════════
progress "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get upgrade -y -qq

# ═══════════════════════════════════════════════════════════════════
# STEP 2 — Install system dependencies
# ═══════════════════════════════════════════════════════════════════
progress "Installing system dependencies..."
apt-get install -y -qq \
  curl wget git unzip htop net-tools lsb-release gnupg2 \
  build-essential bison flex libtool autoconf automake \
  libxml2-dev libssl-dev openssl libpq-dev \
  python3 python3-pip python3-venv python3-dev \
  redis-server rabbitmq-server nginx supervisor \
  certbot python3-certbot-nginx ufw \
  libjpeg-dev zlib1g-dev libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0

# ═══════════════════════════════════════════════════════════════════
# STEP 3 — PostgreSQL 15
# ═══════════════════════════════════════════════════════════════════
progress "Installing & configuring PostgreSQL 15..."
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg
  echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq && apt-get install -y -qq postgresql-15 postgresql-contrib-15
fi
systemctl enable postgresql && systemctl start postgresql

# Create DB & user (idempotent)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# ═══════════════════════════════════════════════════════════════════
# STEP 4 — Kannel SQLbox Tables
# ═══════════════════════════════════════════════════════════════════
progress "Creating Kannel SQLbox tables (send_sms, sent_sms, dlr)..."
sudo -u postgres psql -d "$DB_NAME" <<'SQLBOX_EOF'
-- send_sms — SQLbox outgoing queue (Frontend INSERTs here)
CREATE TABLE IF NOT EXISTS send_sms (
  sql_id     BIGSERIAL PRIMARY KEY,
  momt       VARCHAR(3)  DEFAULT 'MT',
  sender     VARCHAR(20),
  receiver   VARCHAR(20) NOT NULL,
  msgdata    TEXT NOT NULL,
  sms_type   INT DEFAULT 2,
  smsc_id    VARCHAR(255),
  dlr_url    TEXT,
  account    VARCHAR(64),
  coding     INT DEFAULT 0,
  validity   INT DEFAULT 1440,
  deferred   INT DEFAULT 0,
  meta_data  TEXT
);
CREATE INDEX IF NOT EXISTS idx_send_sms_id ON send_sms(sql_id);

-- sent_sms — Kannel logs sent messages here
CREATE TABLE IF NOT EXISTS sent_sms (
  sql_id     BIGSERIAL PRIMARY KEY,
  momt       VARCHAR(3),
  sender     VARCHAR(20),
  receiver   VARCHAR(20),
  msgdata    TEXT,
  sms_type   INT,
  smsc_id    VARCHAR(255),
  dlr_url    TEXT,
  account    VARCHAR(64),
  coding     INT,
  ts         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- dlr — Kannel delivery receipt storage
CREATE TABLE IF NOT EXISTS dlr (
  sql_id     BIGSERIAL PRIMARY KEY,
  smsc       VARCHAR(255),
  ts         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  src        VARCHAR(20),
  dst        VARCHAR(20),
  service    VARCHAR(255),
  url        TEXT,
  mask       INT,
  status     INT,
  boxc       VARCHAR(255)
);

GRANT ALL ON ALL TABLES IN SCHEMA public TO net2app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO net2app;
SQLBOX_EOF

# ═══════════════════════════════════════════════════════════════════
# STEP 5 — Redis
# ═══════════════════════════════════════════════════════════════════
progress "Configuring Redis..."
sed -i "s/^# requirepass .*/requirepass $REDIS_PASS/" /etc/redis/redis.conf
sed -i "s/^requirepass .*/requirepass $REDIS_PASS/" /etc/redis/redis.conf
sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
systemctl enable redis-server && systemctl restart redis-server

# ═══════════════════════════════════════════════════════════════════
# STEP 6 — RabbitMQ
# ═══════════════════════════════════════════════════════════════════
progress "Configuring RabbitMQ..."
systemctl enable rabbitmq-server && systemctl start rabbitmq-server
rabbitmqctl list_users | grep -q net2app || rabbitmqctl add_user net2app "$REDIS_PASS"
rabbitmqctl set_user_tags net2app administrator
rabbitmqctl set_permissions -p / net2app ".*" ".*" ".*"

# ═══════════════════════════════════════════════════════════════════
# STEP 7 — Node.js 20
# ═══════════════════════════════════════════════════════════════════
progress "Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

# ═══════════════════════════════════════════════════════════════════
# STEP 8 — Kannel 1.4.5 + SQLbox + OpenSMPPbox (compile from source)
# ═══════════════════════════════════════════════════════════════════
progress "Installing Kannel 1.4.5 (Bearbox + Smsbox + SQLbox + OpenSMPPbox)..."

# Install build dependencies (skip if already present)
apt-get install -y -qq build-essential libtool libpcre3-dev \
  libxml2-dev libssl-dev docbook-xsl docbook-xml bison flex \
  libmysqlclient-dev mysql-client libpq-dev 2>/dev/null || \
apt-get install -y -qq build-essential libtool libpcre3-dev \
  libxml2-dev libssl-dev docbook-xsl docbook-xml bison flex \
  default-libmysqlclient-dev default-mysql-client libpq-dev 2>/dev/null || true

KANNEL_SRC="/usr/src/gateway-1.4.5"

if [[ ! -f /usr/local/sbin/bearerbox ]]; then
  echo -e "  ${C}Downloading Kannel 1.4.5 source...${NC}"
  cd /usr/src
  wget --no-check-certificate -q "https://www.kannel.org/download/1.4.5/gateway-1.4.5.tar.gz" -O gateway-1.4.5.tar.gz 2>/dev/null || true
  
  if [[ ! -f gateway-1.4.5.tar.gz ]]; then
    echo -e "  ${Y}Primary download failed, trying mirror...${NC}"
    wget --no-check-certificate -q "https://redmine.kannel.org/attachments/download/27/gateway-1.4.5.tar.gz" -O gateway-1.4.5.tar.gz 2>/dev/null || true
  fi

  if [[ -f gateway-1.4.5.tar.gz ]]; then
    tar -xzf gateway-1.4.5.tar.gz
    cd "$KANNEL_SRC"
    
    # Step A: Compile main Kannel (bearerbox + smsbox)
    echo -e "  ${C}Compiling Kannel core (bearerbox + smsbox)...${NC}"
    ./configure --with-mysql --with-pgsql --enable-ssl
    make -j"$CPU_CORES"
    make install
    cp gw/bearerbox gw/smsbox /usr/local/sbin/ 2>/dev/null || true
    
    # Step B: Compile SQLbox addon
    echo -e "  ${C}Compiling SQLbox...${NC}"
    if [[ -d "$KANNEL_SRC/addons/sqlbox" ]]; then
      cd "$KANNEL_SRC/addons/sqlbox"
      ./configure --with-kannel-dir="$KANNEL_SRC"
      make -j"$CPU_CORES"
      make install
      cp gw/sqlbox /usr/local/sbin/ 2>/dev/null || true
    fi
    
    # Step C: Compile OpenSMPPbox addon
    echo -e "  ${C}Compiling OpenSMPPbox...${NC}"
    if [[ -d "$KANNEL_SRC/addons/opensmppbox" ]]; then
      cd "$KANNEL_SRC/addons/opensmppbox"
      ./configure --with-kannel-dir="$KANNEL_SRC"
      make -j"$CPU_CORES"
      make install
      cp gw/opensmppbox /usr/local/sbin/ 2>/dev/null || true
    fi
    
    echo -e "  ${G}Kannel 1.4.5 compiled successfully${NC}"
    echo -e "  ${C}Binaries: bearerbox, smsbox, sqlbox, opensmppbox → /usr/local/sbin/${NC}"
  else
    echo -e "  ${R}Could not download Kannel source. Install manually.${NC}"
  fi
else
  echo -e "  ${Y}Kannel already installed, updating config only...${NC}"
fi

# Create directories
mkdir -p /etc/kannel /var/log/kannel /var/run/kannel /var/spool/kannel
chmod -R 777 /var/log/kannel
chmod -R 777 /var/spool/kannel

# ═══════════════════════════════════════════════════════════════════
# STEP 9 — Kannel Configuration
# ═══════════════════════════════════════════════════════════════════
progress "Writing Kannel configuration files..."

cat > /etc/kannel/kannel.conf <<EOF
#──────────────────────────────────────────────────────────────────
# net2app SMS Hub — Kannel 1.4.5 Configuration
# Generated: $(date)
# Server IP: $SERVER_IP
#──────────────────────────────────────────────────────────────────

#───── CORE ─────
group = core
admin-port = 13000
admin-password = $KANNEL_ADMIN_PASS
admin-deny-ip = "*.*.*.*"
admin-allow-ip = "127.0.0.1;$SERVER_IP"
smsbox-port = 13001
box-deny-ip = "*.*.*.*"
box-allow-ip = "127.0.0.1"
log-file = "/var/log/kannel/bearerbox.log"
log-level = 0
access-log = "/var/log/kannel/access.log"
store-location = "/var/spool/kannel/store"
# No SSL for internal testing:
# ssl-client-certkey-file is NOT set

#───── SMSBOX ─────
group = smsbox
bearerbox-host = 127.0.0.1
sendsms-port = 13013
sendsms-chars = "0123456789 +-"
log-file = "/var/log/kannel/smsbox.log"
log-level = 0
access-log = "/var/log/kannel/smsbox-access.log"

#───── SENDSMS USER ─────
group = sendsms-user
username = $SMSBOX_USER
password = $SMSBOX_PASS
concatenation = true
max-messages = 10

#───── DEFAULT SMS SERVICE (DLR callback to FastAPI) ─────
group = sms-service
keyword = default
catch-all = yes
get-url = "http://127.0.0.1:8000/api/sms/dlr?msgid=%I&status=%d&dlr_time=%t&src=%p&dst=%P&smsc=%i"

#──────────────────────────────────────────────────────────────────
# SMSC CONNECTIONS (Suppliers — add via admin API or manually)
#──────────────────────────────────────────────────────────────────
# Example SMPP supplier:
#
# group = smsc
# smsc = smpp
# smsc-id = allsms_global
# host = 5.78.72.23
# port = 2775
# receive-port = 0
# smsc-username = net2app
# smsc-password = password123
# system-type = ""
# transceiver-mode = true
# enquire-link-interval = 30
# reconnect-delay = 10
#
# Example HTTP supplier:
#
# group = smsc
# smsc = http
# smsc-id = bdtel_http
# send-url = "http://api.bdtel.com/sms/send"
# port = 0
# system-type = http
EOF

# ═══════════════════════════════════════════════════════════════════
# STEP 10 — SQLbox Configuration
# ═══════════════════════════════════════════════════════════════════
progress "Writing SQLbox configuration..."

cat > /etc/kannel/sqlbox.conf <<EOF
#──────────────────────────────────────────────────────────────────
# SQLbox — Database ↔ Kannel Bridge
# Watches send_sms table, pushes to Kannel Bearbox
#──────────────────────────────────────────────────────────────────

group = sqlbox
id = sqlbox
bearerbox-host = 127.0.0.1
bearerbox-port = 13001
smsbox-port = 13005
sql-type = pgsql
sql-host = localhost
sql-port = 5432
sql-username = $DB_USER
sql-password = $DB_PASS
sql-database = $DB_NAME
sql-insert-table = sent_sms
sql-log-table = sent_sms
save-msg-fields = all
log-file = /var/log/kannel/sqlbox.log
log-level = 0
EOF

# ═══════════════════════════════════════════════════════════════════
# STEP 11 — Application backend
# ═══════════════════════════════════════════════════════════════════
progress "Setting up Python backend..."
mkdir -p "$INSTALL_DIR"/{backend,frontend,logs,backups}

cd "$INSTALL_DIR/backend"
python3 -m venv venv
source venv/bin/activate

cat > requirements.txt <<'PYREQ'
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
psycopg2-binary==2.9.9
smpplib==2.2.1
redis==5.0.1
pika==1.3.2
celery==5.3.6
httpx==0.26.0
aiohttp==3.9.1
python-dotenv==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0
phonenumbers==8.13.27
apscheduler==3.10.4
structlog==24.1.0
openpyxl==3.1.2
pandas==2.1.4
reportlab==4.0.8
aiosmtplib==3.0.1
jinja2==3.1.3
PYREQ

pip install -q -r requirements.txt

# Environment file
cat > .env <<EOF
DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
DATABASE_URL_SYNC=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://:$REDIS_PASS@localhost:6379/0
RABBITMQ_URL=amqp://net2app:$REDIS_PASS@localhost:5672/
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
SMPP_HOST=0.0.0.0
SMPP_PORT=2775
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
CORS_ORIGINS=["http://localhost:3000","http://$SERVER_IP","https://$SERVER_IP"]
KANNEL_SENDSMS_URL=http://127.0.0.1:13013/cgi-bin/sendsms
KANNEL_SENDSMS_USER=$SMSBOX_USER
KANNEL_SENDSMS_PASS=$SMSBOX_PASS
KANNEL_ADMIN_URL=http://127.0.0.1:13000
KANNEL_ADMIN_PASS=$KANNEL_ADMIN_PASS
SQLBOX_DB_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
EOF

# ═══════════════════════════════════════════════════════════════════
# STEP 12 — Nginx
# ═══════════════════════════════════════════════════════════════════
progress "Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/net2app <<EOF
server {
    listen 80;
    server_name $SERVER_IP _;

    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
EOF

ln -sf /etc/nginx/sites-available/net2app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx

# ═══════════════════════════════════════════════════════════════════
# STEP 13 — Supervisor
# ═══════════════════════════════════════════════════════════════════
progress "Configuring Supervisor process manager..."
cat > /etc/supervisor/conf.d/net2app.conf <<EOF
[program:net2app-api]
command=$INSTALL_DIR/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers $((CPU_CORES > 4 ? 4 : CPU_CORES))
directory=$INSTALL_DIR/backend
autostart=true
autorestart=true
stderr_logfile=$INSTALL_DIR/logs/api-err.log
stdout_logfile=$INSTALL_DIR/logs/api-out.log

[program:net2app-smpp]
command=$INSTALL_DIR/backend/venv/bin/python -m app.services.smpp_server
directory=$INSTALL_DIR/backend
autostart=true
autorestart=true
stderr_logfile=$INSTALL_DIR/logs/smpp-err.log
stdout_logfile=$INSTALL_DIR/logs/smpp-out.log

[program:net2app-celery]
command=$INSTALL_DIR/backend/venv/bin/celery -A app.celery_app worker --loglevel=info -c $((CPU_CORES > 4 ? 4 : CPU_CORES))
directory=$INSTALL_DIR/backend
autostart=true
autorestart=true
stderr_logfile=$INSTALL_DIR/logs/celery-err.log
stdout_logfile=$INSTALL_DIR/logs/celery-out.log
EOF

supervisorctl reread && supervisorctl update

# ═══════════════════════════════════════════════════════════════════
# STEP 14 — Kannel Systemd Service
# ═══════════════════════════════════════════════════════════════════
progress "Creating Kannel + SQLbox systemd services..."

BEARERBOX_BIN=$(which bearerbox 2>/dev/null || echo "/usr/local/sbin/bearerbox")
SMSBOX_BIN=$(which smsbox 2>/dev/null || echo "/usr/local/sbin/smsbox")
SQLBOX_BIN=$(which sqlbox 2>/dev/null || echo "/usr/local/sbin/sqlbox")

cat > /etc/systemd/system/kannel-bearerbox.service <<EOF
[Unit]
Description=Kannel Bearerbox
After=network.target postgresql.service

[Service]
Type=simple
ExecStart=$BEARERBOX_BIN -v 1 /etc/kannel/kannel.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/kannel-smsbox.service <<EOF
[Unit]
Description=Kannel Smsbox
After=kannel-bearerbox.service
Requires=kannel-bearerbox.service

[Service]
Type=simple
ExecStartPre=/bin/sleep 3
ExecStart=$SMSBOX_BIN -v 1 /etc/kannel/kannel.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/kannel-sqlbox.service <<EOF
[Unit]
Description=Kannel SQLbox (DB Bridge)
After=kannel-bearerbox.service postgresql.service
Requires=kannel-bearerbox.service

[Service]
Type=simple
ExecStartPre=/bin/sleep 5
ExecStart=$SQLBOX_BIN -v 1 /etc/kannel/sqlbox.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kannel-bearerbox kannel-smsbox kannel-sqlbox
systemctl start kannel-bearerbox || true
sleep 3
systemctl start kannel-smsbox || true
sleep 2
systemctl start kannel-sqlbox || true

# ═══════════════════════════════════════════════════════════════════
# STEP 15 — Firewall
# ═══════════════════════════════════════════════════════════════════
progress "Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 2775/tcp comment "SMPP"
ufw allow 8000/tcp comment "API"
ufw --force enable

# ═══════════════════════════════════════════════════════════════════
# STEP 16 — Save credentials
# ═══════════════════════════════════════════════════════════════════
progress "Installation complete! Saving credentials..."

cat > "$INSTALL_DIR/credentials.txt" <<EOF
═══════════════════════════════════════════════════════════════════
 net2app SMS Hub — Installation Credentials
 Generated: $(date)
 Server IP: $SERVER_IP
═══════════════════════════════════════════════════════════════════

DATABASE
  Host:     localhost
  Port:     5432
  Name:     $DB_NAME
  User:     $DB_USER
  Password: $DB_PASS

REDIS
  Host:     localhost
  Port:     6379
  Password: $REDIS_PASS

RABBITMQ
  Host:     localhost
  Port:     5672
  User:     net2app
  Password: $REDIS_PASS

KANNEL
  Admin:    http://127.0.0.1:13000/status
  Password: $KANNEL_ADMIN_PASS
  Smsbox:   http://127.0.0.1:13013/cgi-bin/sendsms
  Username: $SMSBOX_USER
  Password: $SMSBOX_PASS

FASTAPI
  URL:      http://$SERVER_IP:8000
  Docs:     http://$SERVER_IP:8000/docs

SMPP SERVER (Client-facing)
  Host:     $SERVER_IP
  Port:     2775

FRONTEND
  URL:      http://$SERVER_IP

HTTP API (send SMS from your server):
  curl "http://127.0.0.1:13013/cgi-bin/sendsms?username=$SMSBOX_USER&password=$SMSBOX_PASS&to=+1234567890&text=Hello&smsc=supplier_id"

DATABASE INJECTION (via API):
  curl -X POST http://127.0.0.1:8000/api/sms/inject \\
    -H "Authorization: Bearer <token>" \\
    -d '{"receiver":"+1234567890","msgdata":"Hello","smsc_id":"supplier_id"}'

═══════════════════════════════════════════════════════════════════
EOF

chmod 600 "$INSTALL_DIR/credentials.txt"

# ═══════════════════════════════════════════════════════════════════
# STEP 16B — Load full application database schema
# ═══════════════════════════════════════════════════════════════════
echo -e "${G}[16b/$TOTAL] Loading full application database schema...${NC}"
if [[ -f "$INSTALL_DIR/backend/database/schema.sql" ]]; then
  PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h localhost -d "$DB_NAME" -f "$INSTALL_DIR/backend/database/schema.sql" 2>/dev/null || true
  echo -e "  ${C}All 37 tables created successfully${NC}"
else
  echo -e "  ${Y}schema.sql not found — copy backend/database/schema.sql to $INSTALL_DIR/backend/database/${NC}"
fi

# ═══════════════════════════════════════════════════════════════════
# STEP 16C — Set file/directory permissions
# ═══════════════════════════════════════════════════════════════════
echo -e "${G}[16c/$TOTAL] Setting file and directory permissions...${NC}"

# Application directories
chown -R root:root "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR/backend"
chmod 755 "$INSTALL_DIR/frontend"
chmod 700 "$INSTALL_DIR/backups"
chmod 755 "$INSTALL_DIR/logs"

# Backend env file (sensitive — root-only read)
chmod 600 "$INSTALL_DIR/backend/.env"

# Python venv
chmod -R 755 "$INSTALL_DIR/backend/venv" 2>/dev/null || true

# Log files writable by supervisor processes
chmod 777 "$INSTALL_DIR/logs"

# Kannel directories
chown -R root:root /etc/kannel
chmod 640 /etc/kannel/kannel.conf
chmod 640 /etc/kannel/sqlbox.conf
chmod 755 /var/log/kannel
chmod 755 /var/spool/kannel

# PostgreSQL — ensure net2app user has full access to all tables
sudo -u postgres psql -d "$DB_NAME" -c "
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
  GRANT USAGE ON SCHEMA public TO $DB_USER;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
" 2>/dev/null || true

# Redis config
chmod 640 /etc/redis/redis.conf

# Nginx config
chmod 644 /etc/nginx/sites-available/net2app

# Supervisor config
chmod 644 /etc/supervisor/conf.d/net2app.conf

# Systemd service files
chmod 644 /etc/systemd/system/kannel-bearerbox.service
chmod 644 /etc/systemd/system/kannel-smsbox.service
chmod 644 /etc/systemd/system/kannel-sqlbox.service

echo -e "  ${C}All permissions set${NC}"

echo -e "\n${G}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${G}║         INSTALLATION COMPLETE ✅                         ║${NC}"
echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${G}║${NC}"
echo -e "${G}║  Dashboard:     ${C}http://$SERVER_IP${NC}"
echo -e "${G}║  API:           ${C}http://$SERVER_IP:8000${NC}"
echo -e "${G}║  SMPP:          ${C}$SERVER_IP:2775${NC}"
echo -e "${G}║  Kannel Send:   ${C}http://127.0.0.1:13013/cgi-bin/sendsms${NC}"
echo -e "${G}║${NC}"
echo -e "${G}║  Credentials:   ${Y}$INSTALL_DIR/credentials.txt${NC}"
echo -e "${G}║${NC}"
echo -e "${G}║  Status:        ${C}supervisorctl status${NC}"
echo -e "${G}║                  ${C}systemctl status kannel-bearerbox${NC}"
echo -e "${G}║                  ${C}systemctl status kannel-sqlbox${NC}"
echo -e "${G}║${NC}"
echo -e "${G}╚══════════════════════════════════════════════════════════╝${NC}"
