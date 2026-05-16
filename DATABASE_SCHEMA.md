# net2app SMS - Database Schema & Application Flow

## System Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              net2app SMS Platform                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Clients    │────▶│   Routing    │────▶│   Trunks     │────▶│  Suppliers   │   │
│  │   (SMPP/API) │     │   Engine     │     │  (Groups)    │     │  (SMPP/API)  │   │
│  └──────────────┘     └──────┬───────┘     └──────────────┘     └──────────────┘   │
│         │                    │                    │                    │            │
│         ▼                    ▼                    ▼                    ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │ Translation  │     │   Rating     │     │  Priority/   │     │ Translation  │   │
│  │   Engine     │     │   Engine     │     │  LCR/Perf    │     │   Engine     │   │
│  └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘   │
│                              │                                                       │
│                              ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Billing Engine                                      │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │  │
│  │  │ Client  │  │Supplier │  │ Profit  │  │ Invoice │  │ Payment │            │  │
│  │  │ Charge  │  │  Cost   │  │ Calc    │  │  Gen    │  │ Track   │            │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Database Tables

### 1. Users & Authentication

```sql
-- User Roles: super_admin (developer), admin, support, billing, agent, client, supplier
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'support', 'billing', 'agent', 'client', 'supplier'),
    parent_id UUID REFERENCES users(id), -- For agent's clients
    entity_id UUID, -- Links to client_id or supplier_id
    entity_type ENUM('client', 'supplier'),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    permission VARCHAR(100),
    granted BOOLEAN DEFAULT true
);
```

### 2. Clients

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    
    -- Billing Settings
    balance DECIMAL(15,4) DEFAULT 0,
    credit_limit DECIMAL(15,4) DEFAULT 0,
    billing_type ENUM('prepaid', 'postpaid') DEFAULT 'prepaid',
    billing_mode ENUM('send', 'submit', 'dlr') DEFAULT 'submit',
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Connection Settings
    connection_mode ENUM('server', 'client') DEFAULT 'server',
    
    -- SMPP Settings
    smpp_username VARCHAR(100),
    smpp_password VARCHAR(100),
    smpp_ip VARCHAR(50),
    smpp_port INT,
    smpp_system_type VARCHAR(50),
    smpp_tps INT DEFAULT 100,
    smpp_bind_type ENUM('transceiver', 'transmitter', 'receiver') DEFAULT 'transceiver',
    smpp_status ENUM('bound', 'unbound', 'connecting', 'error') DEFAULT 'unbound',
    
    -- API Settings
    api_key VARCHAR(255),
    api_enabled BOOLEAN DEFAULT false,
    
    -- Control Options
    force_dlr BOOLEAN DEFAULT false,
    force_dlr_timeout INT DEFAULT 60, -- seconds
    max_tps INT DEFAULT 100,
    ip_whitelist TEXT[], -- Array of allowed IPs
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client_translations (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    name VARCHAR(100),
    priority INT DEFAULT 1, -- Order: 1, 2, 3...
    type ENUM('content', 'number', 'sid', 'extract_otp', 'random_content'),
    match_pattern VARCHAR(255),
    replace_pattern VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client_ip_whitelist (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    ip_address VARCHAR(50),
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Suppliers

```sql
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    
    -- Connection Type
    connection_type ENUM('smpp', 'http_api') DEFAULT 'smpp',
    connection_mode ENUM('server', 'client') DEFAULT 'client',
    
    -- SMPP Settings (for SMPP suppliers)
    smpp_host VARCHAR(255),
    smpp_port INT,
    smpp_username VARCHAR(100),
    smpp_password VARCHAR(100),
    smpp_system_type VARCHAR(50),
    smpp_bind_type ENUM('transceiver', 'transmitter', 'receiver') DEFAULT 'transceiver',
    smpp_tps INT DEFAULT 100,
    smpp_status ENUM('bound', 'unbound', 'connecting', 'error') DEFAULT 'unbound',
    
    -- HTTP API Settings (for API suppliers)
    api_send_url TEXT,
    api_dlr_url TEXT,
    api_key VARCHAR(255),
    api_username VARCHAR(100),
    api_password VARCHAR(100),
    api_method ENUM('GET', 'POST') DEFAULT 'POST',
    api_content_type VARCHAR(100) DEFAULT 'application/json',
    api_custom_params JSONB, -- Custom parameters mapping
    api_submit_response_pattern VARCHAR(255),
    api_dlr_response_pattern VARCHAR(255),
    
    -- API Provider Type
    api_provider_region ENUM('global', 'bangladesh', 'india', 'middle_east', 'custom'),
    
    -- Billing
    balance DECIMAL(15,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE supplier_translations (
    id UUID PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id),
    name VARCHAR(100),
    priority INT DEFAULT 1,
    type ENUM('content', 'number', 'sid', 'extract_otp', 'random_content'),
    match_pattern VARCHAR(255),
    replace_pattern VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    region ENUM('global', 'bangladesh', 'india', 'middle_east'),
    provider_name VARCHAR(100),
    send_url_template TEXT,
    dlr_url_template TEXT,
    auth_type ENUM('api_key', 'basic', 'bearer', 'custom'),
    params_mapping JSONB,
    submit_response_pattern VARCHAR(255),
    dlr_response_pattern VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);
```

### 4. Trunks & Routes

```sql
-- Trunk Types: sim, voiceotp, marketing, spam, direct, local_direct
CREATE TABLE trunks (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    trunk_type ENUM('sim', 'voiceotp', 'marketing', 'spam', 'direct', 'local_direct'),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trunk_suppliers (
    id UUID PRIMARY KEY,
    trunk_id UUID REFERENCES trunks(id),
    supplier_id UUID REFERENCES suppliers(id),
    priority INT DEFAULT 1, -- For priority-based routing
    weight INT DEFAULT 100, -- For load balancing
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Routing Method
    routing_type ENUM('priority', 'lcr', 'performance', 'round_robin', 'testing'),
    
    -- Route can have multiple trunks
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE route_trunks (
    id UUID PRIMARY KEY,
    route_id UUID REFERENCES routes(id),
    trunk_id UUID REFERENCES trunks(id),
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE client_routes (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    route_id UUID REFERENCES routes(id),
    mcc VARCHAR(3), -- NULL means default route
    mnc VARCHAR(3),
    prefix VARCHAR(20),
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routing_plans (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    allowed_trunk_types TEXT[], -- ['sim', 'direct', 'marketing']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client_routing_plans (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    routing_plan_id UUID REFERENCES routing_plans(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Rates (MCC/MNC Based)

```sql
CREATE TABLE mcc_mnc_data (
    id UUID PRIMARY KEY,
    country_name VARCHAR(100),
    country_code VARCHAR(5),
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    operator_name VARCHAR(255),
    network_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE client_rates (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    country_name VARCHAR(100),
    operator_name VARCHAR(255),
    rate DECIMAL(10,6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from TIMESTAMP DEFAULT NOW(),
    effective_to TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE supplier_rates (
    id UUID PRIMARY KEY,
    supplier_id UUID REFERENCES suppliers(id),
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    country_name VARCHAR(100),
    operator_name VARCHAR(255),
    rate DECIMAL(10,6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from TIMESTAMP DEFAULT NOW(),
    effective_to TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rate_history (
    id UUID PRIMARY KEY,
    entity_type ENUM('client', 'supplier'),
    entity_id UUID,
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    old_rate DECIMAL(10,6),
    new_rate DECIMAL(10,6),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);
```

### 6. SMS Logs & CDR

```sql
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE,
    
    -- Client Info
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(50),
    
    -- Supplier Info
    supplier_id UUID REFERENCES suppliers(id),
    supplier_code VARCHAR(50),
    
    -- Message Details
    source_addr VARCHAR(50),
    destination_addr VARCHAR(50),
    message_content TEXT,
    
    -- Routing Info
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    country VARCHAR(100),
    operator VARCHAR(255),
    route_id UUID REFERENCES routes(id),
    trunk_id UUID REFERENCES trunks(id),
    
    -- Billing
    client_rate DECIMAL(10,6),
    supplier_rate DECIMAL(10,6),
    profit DECIMAL(10,6),
    billing_type ENUM('send', 'submit', 'dlr'),
    
    -- Status
    status ENUM('pending', 'submitted', 'delivered', 'failed', 'expired', 'rejected'),
    error_code VARCHAR(20),
    error_message TEXT,
    
    -- Timestamps
    submit_time TIMESTAMP,
    deliver_time TIMESTAMP,
    dlr_time TIMESTAMP,
    
    -- Metadata
    parts_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Auto-delete after 4 months
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '4 months')
);

-- Index for fast queries
CREATE INDEX idx_sms_logs_client ON sms_logs(client_id, created_at);
CREATE INDEX idx_sms_logs_supplier ON sms_logs(supplier_id, created_at);
CREATE INDEX idx_sms_logs_status ON sms_logs(status, created_at);
CREATE INDEX idx_sms_logs_expires ON sms_logs(expires_at);
```

### 7. Billing & Payments

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE,
    entity_type ENUM('client', 'supplier'),
    entity_id UUID,
    amount DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type ENUM('topup', 'credit', 'debit', 'adjustment'),
    payment_method VARCHAR(100),
    reference_number VARCHAR(100),
    bank_details TEXT,
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    -- Payments never deleted
    is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    client_id UUID REFERENCES clients(id),
    
    -- Period
    period_start DATE,
    period_end DATE,
    due_date DATE,
    
    -- Billing Info
    billing_frequency ENUM('daily', 'weekly', 'biweekly', 'monthly'),
    
    -- Amounts
    subtotal DECIMAL(15,4),
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(15,4),
    total_amount DECIMAL(15,4),
    paid_amount DECIMAL(15,4) DEFAULT 0,
    
    -- Bill To
    bill_to_name VARCHAR(255),
    bill_to_address TEXT,
    bill_to_email VARCHAR(255),
    
    -- Bank Details
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    bank_routing VARCHAR(100),
    swift_code VARCHAR(50),
    payment_notes TEXT,
    
    -- Status
    status ENUM('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'),
    
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    description VARCHAR(255),
    quantity INT,
    unit_price DECIMAL(10,6),
    total DECIMAL(15,4),
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    country VARCHAR(100),
    operator VARCHAR(255)
);
```

### 8. Reports & Analytics

```sql
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY,
    report_date DATE,
    entity_type ENUM('client', 'supplier', 'system'),
    entity_id UUID,
    
    -- Counts
    total_submitted INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    
    -- Revenue
    client_revenue DECIMAL(15,4) DEFAULT 0,
    supplier_cost DECIMAL(15,4) DEFAULT 0,
    profit DECIMAL(15,4) DEFAULT 0,
    
    -- By destination
    by_country JSONB,
    by_operator JSONB,
    by_hour JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hourly_reports (
    id UUID PRIMARY KEY,
    report_hour TIMESTAMP,
    entity_type ENUM('client', 'supplier', 'system'),
    entity_id UUID,
    total_submitted INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    revenue DECIMAL(15,4) DEFAULT 0,
    cost DECIMAL(15,4) DEFAULT 0,
    profit DECIMAL(15,4) DEFAULT 0
);
```

### 9. Notifications

```sql
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    notification_type ENUM(
        'low_balance', 
        'payment_received', 
        'payment_reminder', 
        'invoice_generated',
        'rate_update',
        'channel_disconnect',
        'campaign_complete',
        'dlr_failure'
    ),
    email_enabled BOOLEAN DEFAULT true,
    dashboard_enabled BOOLEAN DEFAULT true,
    threshold_value DECIMAL(15,4), -- For low balance alerts
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    subject VARCHAR(255),
    body TEXT,
    variables JSONB, -- Available placeholders
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 10. Campaigns

```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    name VARCHAR(255),
    route_id UUID REFERENCES routes(id),
    
    -- Volume & TPS
    total_volume INT,
    tps_limit INT DEFAULT 10,
    
    -- Schedule
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Status
    status ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'),
    
    -- Progress
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaign_numbers (
    id UUID PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    phone_number VARCHAR(50),
    message TEXT,
    status ENUM('pending', 'sent', 'delivered', 'failed'),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP
);
```

### 11. License & Platform Management (Super Admin)

```sql
CREATE TABLE platform_license (
    id UUID PRIMARY KEY,
    license_key VARCHAR(255) UNIQUE,
    platform_name VARCHAR(100),
    company_name VARCHAR(255),
    
    -- Plan Limits
    plan_type ENUM('5M', '10M', '15M', '30M', 'unlimited'),
    monthly_limit BIGINT,
    current_month_usage BIGINT DEFAULT 0,
    
    -- Enabled Services
    sms_enabled BOOLEAN DEFAULT true,
    voiceotp_enabled BOOLEAN DEFAULT false,
    rcs_enabled BOOLEAN DEFAULT false,
    ott_enabled BOOLEAN DEFAULT false,
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE backup_history (
    id UUID PRIMARY KEY,
    backup_type ENUM('full', 'incremental'),
    file_path VARCHAR(255),
    file_size BIGINT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    status ENUM('completed', 'failed', 'in_progress')
);
```

## Routing Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SMS ROUTING DECISION ENGINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CLIENT TRANSLATION (in priority order)                              │
│     ├─ Content Translation                                               │
│     ├─ Number Translation                                                │
│     ├─ SID Translation                                                   │
│     ├─ OTP Extraction                                                    │
│     └─ Random Content                                                    │
│                                                                          │
│  2. DESTINATION LOOKUP                                                   │
│     ├─ Parse destination number                                          │
│     ├─ Identify MCC/MNC                                                  │
│     └─ Get country/operator                                              │
│                                                                          │
│  3. CLIENT RATE LOOKUP                                                   │
│     ├─ Check client-specific rate                                        │
│     └─ Calculate client charge                                           │
│                                                                          │
│  4. BALANCE CHECK                                                        │
│     ├─ Prepaid: Check balance >= charge                                  │
│     └─ Postpaid: Check credit_limit + balance >= charge                 │
│                                                                          │
│  5. ROUTE SELECTION                                                      │
│     ├─ Get client's routing plan                                         │
│     ├─ Find matching routes for destination                              │
│     └─ Apply routing method:                                             │
│         ├─ PRIORITY: Select by priority order                            │
│         ├─ LCR: Select lowest cost supplier                              │
│         ├─ PERFORMANCE: Select best delivery ratio                       │
│         └─ ROUND_ROBIN: Load balance                                     │
│                                                                          │
│  6. TRUNK SELECTION                                                      │
│     ├─ Check trunk type allowed for client                               │
│     └─ Select supplier from trunk                                        │
│                                                                          │
│  7. SUPPLIER RATE LOOKUP                                                 │
│     └─ Get supplier cost                                                 │
│                                                                          │
│  8. SUPPLIER TRANSLATION                                                 │
│     └─ Apply supplier-specific translations                              │
│                                                                          │
│  9. SUBMIT TO SUPPLIER                                                   │
│     ├─ SMPP: Submit via SMPP connection                                  │
│     └─ HTTP: Submit via API                                              │
│                                                                          │
│  10. BILLING & LOGGING                                                   │
│      ├─ Apply billing mode (send/submit/dlr)                             │
│      ├─ Charge client                                                    │
│      ├─ Record supplier cost                                             │
│      ├─ Calculate profit                                                 │
│      └─ Log to sms_logs                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## User Role Permissions

| Feature | Super Admin | Admin | Support | Billing | Agent | Client | Supplier |
|---------|-------------|-------|---------|---------|-------|--------|----------|
| Platform Settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| License Management | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Backup/Restore | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| User Management | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Client Management | ✓ | ✓ | ✓ | ✗ | Own | Self | ✗ |
| Supplier Management | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | Self |
| Routing | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Rates | ✓ | ✓ | ✓ | View | ✗ | Own | Own |
| Billing | ✓ | ✓ | ✗ | ✓ | ✗ | Own | Own |
| Invoices | ✓ | ✓ | ✗ | ✓ | ✗ | Own | Own |
| SMS Logs | ✓ | ✓ | ✓ | ✗ | Own | Own | Own |
| Reports | ✓ | ✓ | ✓ | ✓ | Own | Own | Own |
| Campaigns | ✓ | ✓ | ✓ | ✗ | ✗ | Own | ✗ |
