-- net2app SMS Hub - Complete Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 0. KANNEL SQLbox TABLES (Kannel 1.4.5 integration)
-- =====================================================

-- send_sms — SQLbox outgoing queue
-- Frontend/API INSERTs here, SQLbox watches & pushes to Kannel Bearbox
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

-- sent_sms — Kannel logs sent messages here after delivery
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

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

CREATE TYPE user_role AS ENUM (
    'super_admin', 'admin', 'support', 'billing', 'agent', 'client', 'supplier'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_id UUID,
    entity_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

-- =====================================================
-- 2. CLIENTS
-- =====================================================

CREATE TYPE billing_type AS ENUM ('prepaid', 'postpaid');
CREATE TYPE billing_mode AS ENUM ('send', 'submit', 'dlr');
CREATE TYPE connection_mode AS ENUM ('server', 'client');
CREATE TYPE smpp_status AS ENUM ('bound', 'unbound', 'connecting', 'error');
CREATE TYPE bind_type AS ENUM ('transceiver', 'transmitter', 'receiver');

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    billing_type billing_type DEFAULT 'prepaid',
    billing_mode billing_mode DEFAULT 'submit',
    currency VARCHAR(3) DEFAULT 'USD',
    low_balance_threshold DECIMAL(15,4) DEFAULT 100,
    
    -- Connection Settings
    connection_mode connection_mode DEFAULT 'server',
    
    -- SMPP Settings
    smpp_username VARCHAR(100),
    smpp_password VARCHAR(100),
    smpp_ip VARCHAR(50),
    smpp_port INT DEFAULT 2775,
    smpp_system_type VARCHAR(50),
    smpp_tps INT DEFAULT 100,
    smpp_bind_type bind_type DEFAULT 'transceiver',
    smpp_status smpp_status DEFAULT 'unbound',
    smpp_session_id VARCHAR(100),
    smpp_last_activity TIMESTAMP WITH TIME ZONE,
    
    -- API Settings
    api_key VARCHAR(255),
    api_secret VARCHAR(255),
    api_enabled BOOLEAN DEFAULT false,
    
    -- Control Options
    force_dlr BOOLEAN DEFAULT false,
    force_dlr_timeout INT DEFAULT 60,
    force_dlr_status VARCHAR(20) DEFAULT 'DELIVRD',
    max_tps INT DEFAULT 100,
    
    -- Routing
    routing_plan_id UUID,
    default_route_id UUID,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE client_ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, ip_address)
);

CREATE TABLE client_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    priority INT DEFAULT 1,
    type VARCHAR(50) NOT NULL, -- content, number, sid, extract_otp, random_content
    match_pattern VARCHAR(500) NOT NULL,
    replace_pattern VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_translations_priority ON client_translations(client_id, priority);

-- =====================================================
-- 3. SUPPLIERS
-- =====================================================

CREATE TYPE connection_type AS ENUM ('smpp', 'http_api', 'ott_device', 'whatsapp', 'telegram', 'custom_http', 'rcs', 'flash_sms');
CREATE TYPE api_region AS ENUM ('global', 'bangladesh', 'india', 'middle_east', 'custom');
CREATE TYPE api_method AS ENUM ('GET', 'POST');

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    
    -- Connection Type
    connection_type connection_type DEFAULT 'smpp',
    connection_mode connection_mode DEFAULT 'client',
    
    -- SMPP Settings
    smpp_host VARCHAR(255),
    smpp_port INT DEFAULT 2775,
    smpp_username VARCHAR(100),
    smpp_password VARCHAR(100),
    smpp_system_type VARCHAR(50),
    smpp_bind_type bind_type DEFAULT 'transceiver',
    smpp_tps INT DEFAULT 100,
    smpp_status smpp_status DEFAULT 'unbound',
    smpp_session_id VARCHAR(100),
    smpp_last_activity TIMESTAMP WITH TIME ZONE,
    smpp_enquire_link_interval INT DEFAULT 30,
    smpp_reconnect_interval INT DEFAULT 10,
    
    -- HTTP API Settings
    api_send_url TEXT,
    api_dlr_url TEXT,
    api_key VARCHAR(255),
    api_username VARCHAR(100),
    api_password VARCHAR(100),
    api_method api_method DEFAULT 'POST',
    api_content_type VARCHAR(100) DEFAULT 'application/json',
    api_custom_params JSONB,
    api_submit_response_pattern VARCHAR(500),
    api_dlr_response_pattern VARCHAR(500),
    api_timeout INT DEFAULT 30,
    api_provider_region api_region,
    
    -- RCS Settings
    rcs_agent_id VARCHAR(255),
    rcs_brand_id VARCHAR(255),
    rcs_api_url TEXT,
    rcs_api_key VARCHAR(255),
    rcs_webhook_url TEXT,
    rcs_features TEXT[], -- ['text','image','card','carousel','suggestion']
    
    -- Flash SMS Settings
    flash_data_coding INT DEFAULT 16,  -- 0x10 for flash display
    flash_protocol_id INT DEFAULT 0,
    flash_validity_period INT DEFAULT 300,
    
    -- Billing
    balance DECIMAL(15,4) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Performance Tracking
    total_submitted BIGINT DEFAULT 0,
    total_delivered BIGINT DEFAULT 0,
    total_failed BIGINT DEFAULT 0,
    avg_delivery_time DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE supplier_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    priority INT DEFAULT 1,
    type VARCHAR(50) NOT NULL,
    match_pattern VARCHAR(500) NOT NULL,
    replace_pattern VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE api_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    region api_region NOT NULL,
    provider_name VARCHAR(100),
    send_url_template TEXT,
    dlr_url_template TEXT,
    auth_type VARCHAR(50), -- api_key, basic, bearer, custom
    params_mapping JSONB,
    submit_response_pattern VARCHAR(500),
    dlr_response_pattern VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TRUNKS & ROUTES
-- =====================================================

CREATE TYPE trunk_type AS ENUM ('sim', 'voiceotp', 'marketing', 'spam', 'direct', 'local_direct');
CREATE TYPE routing_type AS ENUM ('priority', 'lcr', 'performance', 'round_robin', 'testing');

CREATE TABLE trunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    trunk_type trunk_type NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE trunk_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trunk_id UUID REFERENCES trunks(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    priority INT DEFAULT 1,
    weight INT DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trunk_id, supplier_id)
);

CREATE INDEX idx_trunk_suppliers_priority ON trunk_suppliers(trunk_id, priority);

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    routing_type routing_type DEFAULT 'priority',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE route_trunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    trunk_id UUID REFERENCES trunks(id) ON DELETE CASCADE,
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(route_id, trunk_id)
);

CREATE TABLE routing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    allowed_trunk_types trunk_type[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE client_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    mcc VARCHAR(3),
    mnc VARCHAR(3),
    prefix VARCHAR(20),
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_routes_lookup ON client_routes(client_id, mcc, mnc, prefix);

-- =====================================================
-- 5. MCC/MNC & RATES
-- =====================================================

CREATE TABLE mcc_mnc_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(5),
    mcc VARCHAR(3) NOT NULL,
    mnc VARCHAR(4) NOT NULL,
    operator_name VARCHAR(255),
    network_type VARCHAR(50),
    number_prefix VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(mcc, mnc)
);

CREATE INDEX idx_mcc_mnc_lookup ON mcc_mnc_data(mcc, mnc);
CREATE INDEX idx_mcc_mnc_prefix ON mcc_mnc_data(number_prefix);

CREATE TABLE client_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    mcc VARCHAR(3) NOT NULL,
    mnc VARCHAR(4),
    country_name VARCHAR(100),
    operator_name VARCHAR(255),
    rate DECIMAL(10,6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_client_rates_lookup ON client_rates(client_id, mcc, mnc, is_active);

CREATE TABLE supplier_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    mcc VARCHAR(3) NOT NULL,
    mnc VARCHAR(4),
    country_name VARCHAR(100),
    operator_name VARCHAR(255),
    rate DECIMAL(10,6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_supplier_rates_lookup ON supplier_rates(supplier_id, mcc, mnc, is_active);

CREATE TABLE rate_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    mcc VARCHAR(3),
    mnc VARCHAR(4),
    old_rate DECIMAL(10,6),
    new_rate DECIMAL(10,6),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SMS LOGS & CDR
-- =====================================================

CREATE TYPE sms_status AS ENUM (
    'pending', 'submitted', 'delivered', 'failed', 'expired', 'rejected', 'unknown'
);

CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Client Info
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(50),
    
    -- Supplier Info
    supplier_id UUID REFERENCES suppliers(id),
    supplier_code VARCHAR(50),
    supplier_message_id VARCHAR(100),
    
    -- Message Details
    source_addr VARCHAR(50),
    destination_addr VARCHAR(50),
    message_content TEXT,
    message_encoding VARCHAR(20) DEFAULT 'GSM',
    
    -- Routing Info
    mcc VARCHAR(3),
    mnc VARCHAR(4),
    country VARCHAR(100),
    operator VARCHAR(255),
    route_id UUID,
    trunk_id UUID,
    
    -- Billing
    client_rate DECIMAL(10,6),
    supplier_rate DECIMAL(10,6),
    profit DECIMAL(10,6),
    billing_mode billing_mode,
    billed BOOLEAN DEFAULT false,
    
    -- Status
    status sms_status DEFAULT 'pending',
    error_code VARCHAR(20),
    error_message TEXT,
    
    -- Timestamps
    submit_time TIMESTAMP WITH TIME ZONE,
    sent_time TIMESTAMP WITH TIME ZONE,
    deliver_time TIMESTAMP WITH TIME ZONE,
    dlr_time TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    parts_count INT DEFAULT 1,
    data_coding INT DEFAULT 0,
    validity_period INT,
    registered_delivery INT DEFAULT 1,
    
    -- Auto-delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 months')
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE sms_logs_y2024m01 PARTITION OF sms_logs 
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE sms_logs_y2024m02 PARTITION OF sms_logs 
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Add more partitions as needed

CREATE INDEX idx_sms_logs_client ON sms_logs(client_id, created_at);
CREATE INDEX idx_sms_logs_supplier ON sms_logs(supplier_id, created_at);
CREATE INDEX idx_sms_logs_status ON sms_logs(status, created_at);
CREATE INDEX idx_sms_logs_message_id ON sms_logs(message_id);
CREATE INDEX idx_sms_logs_destination ON sms_logs(destination_addr);

-- =====================================================
-- 7. BILLING & PAYMENTS
-- =====================================================

CREATE TYPE payment_type AS ENUM ('topup', 'credit', 'debit', 'adjustment', 'refund');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled');
CREATE TYPE billing_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    amount DECIMAL(15,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type payment_type NOT NULL,
    payment_method VARCHAR(100),
    reference_number VARCHAR(100),
    bank_details TEXT,
    notes TEXT,
    balance_before DECIMAL(15,4),
    balance_after DECIMAL(15,4),
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Payments never deleted, only soft delete
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_payments_entity ON payments(entity_type, entity_id, created_at);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_frequency billing_frequency,
    
    -- Amounts
    subtotal DECIMAL(15,4) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,4) DEFAULT 0,
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
    status invoice_status DEFAULT 'draft',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255),
    quantity INT DEFAULT 0,
    unit_price DECIMAL(10,6),
    total DECIMAL(15,4),
    mcc VARCHAR(3),
    mnc VARCHAR(4),
    country VARCHAR(100),
    operator VARCHAR(255)
);

-- =====================================================
-- 8. REPORTS & ANALYTICS
-- =====================================================

CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE NOT NULL,
    entity_type VARCHAR(20), -- client, supplier, system
    entity_id UUID,
    
    -- Counts
    total_submitted BIGINT DEFAULT 0,
    total_delivered BIGINT DEFAULT 0,
    total_failed BIGINT DEFAULT 0,
    total_rejected BIGINT DEFAULT 0,
    
    -- Revenue
    client_revenue DECIMAL(15,4) DEFAULT 0,
    supplier_cost DECIMAL(15,4) DEFAULT 0,
    profit DECIMAL(15,4) DEFAULT 0,
    
    -- Aggregations
    by_country JSONB DEFAULT '{}',
    by_operator JSONB DEFAULT '{}',
    by_hour JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_date, entity_type, entity_id)
);

CREATE TABLE hourly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_hour TIMESTAMP WITH TIME ZONE NOT NULL,
    entity_type VARCHAR(20),
    entity_id UUID,
    total_submitted BIGINT DEFAULT 0,
    total_delivered BIGINT DEFAULT 0,
    total_failed BIGINT DEFAULT 0,
    revenue DECIMAL(15,4) DEFAULT 0,
    cost DECIMAL(15,4) DEFAULT 0,
    profit DECIMAL(15,4) DEFAULT 0,
    UNIQUE(report_hour, entity_type, entity_id)
);

-- =====================================================
-- 9. NOTIFICATIONS
-- =====================================================

CREATE TYPE notification_type AS ENUM (
    'low_balance', 'payment_received', 'payment_reminder', 
    'invoice_generated', 'rate_update', 'channel_disconnect',
    'campaign_complete', 'dlr_failure', 'system_alert'
);

CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    dashboard_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    threshold_value DECIMAL(15,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255),
    body TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. CAMPAIGNS
-- =====================================================

CREATE TYPE campaign_status AS ENUM (
    'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
);

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    route_id UUID REFERENCES routes(id),
    
    -- Content
    sender_id VARCHAR(50),
    message_template TEXT,
    
    -- Volume & TPS
    total_volume INT DEFAULT 0,
    tps_limit INT DEFAULT 10,
    
    -- Schedule
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status campaign_status DEFAULT 'draft',
    
    -- Progress
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE campaign_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    custom_message TEXT,
    variables JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    message_id VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

CREATE INDEX idx_campaign_numbers_status ON campaign_numbers(campaign_id, status);

-- =====================================================
-- 11. LICENSE & PLATFORM
-- =====================================================

CREATE TYPE plan_type AS ENUM ('5M', '10M', '15M', '30M', 'unlimited');

CREATE TABLE platform_license (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    platform_name VARCHAR(100),
    company_name VARCHAR(255),
    
    -- Plan Limits
    plan_type plan_type DEFAULT '10M',
    monthly_limit BIGINT,
    current_month_usage BIGINT DEFAULT 0,
    usage_reset_date DATE,
    
    -- Enabled Services
    sms_enabled BOOLEAN DEFAULT true,
    voiceotp_enabled BOOLEAN DEFAULT false,
    rcs_enabled BOOLEAN DEFAULT false,
    ott_enabled BOOLEAN DEFAULT false,
    
    -- Validity
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(20), -- full, incremental
    file_path VARCHAR(500),
    file_size BIGINT,
    status VARCHAR(20), -- completed, failed, in_progress
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. SUBSCRIPTION PLANS & USAGE TRACKING
-- =====================================================

CREATE TABLE usage_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name VARCHAR(50) NOT NULL,
    plan_type VARCHAR(20) NOT NULL,
    volume_limit BIGINT NOT NULL,              -- -1 = unlimited
    monthly_rent_usd DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE client_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES usage_plans(id),
    sms_counter BIGINT DEFAULT 0,
    voice_counter BIGINT DEFAULT 0,
    rcs_counter BIGINT DEFAULT 0,
    ott_counter BIGINT DEFAULT 0,
    billing_cycle_start DATE NOT NULL,
    billing_cycle_end DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE',       -- ACTIVE, SUSPENDED_VOLUME_EXCEEDED, EXPIRED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_sub_active ON client_subscriptions(client_id, status);

-- Insert default plans
INSERT INTO usage_plans (plan_name, plan_type, volume_limit, monthly_rent_usd) VALUES
('3M Plan',    '3M',        3000000,  149.00),
('5M Plan',    '5M',        5000000,  199.00),
('10M Plan',   '10M',      10000000,  299.00),
('15M Plan',   '15M',      15000000,  399.00),
('30M Plan',   '30M',      30000000,  450.00),
('Unlimited',  'unlimited',       -1,  499.00);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trunks_updated_at BEFORE UPDATE ON trunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
        LPAD(NEXTVAL('payment_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE payment_number_seq START 1;
CREATE TRIGGER generate_payment_number_trigger BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_payment_number();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
        LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE invoice_number_seq START 1;
CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Function to cleanup old SMS logs (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_sms_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM sms_logs WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@net2app.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.vPR0sH8f9gMH6u', 'super_admin');

-- Insert default license
INSERT INTO platform_license (license_key, platform_name, company_name, plan_type, valid_from, valid_to) VALUES
('NET2APP-SMS-TRIAL-2024', 'net2app SMS', 'Net2App Technologies', 'unlimited', NOW(), NOW() + INTERVAL '1 year');

-- Insert default notification settings
INSERT INTO notification_settings (user_id, notification_type, email_enabled, dashboard_enabled)
SELECT u.id, t.type, true, true
FROM users u
CROSS JOIN (
    SELECT unnest(enum_range(NULL::notification_type)) as type
) t
WHERE u.role = 'super_admin';

-- Insert email templates
INSERT INTO email_templates (name, subject, body, variables) VALUES
('low_balance', 'Low Balance Alert - {{client_name}}', 
 'Dear {{client_name}},\n\nYour account balance is {{balance}}. Please top up to continue service.\n\nRegards,\nnet2app SMS',
 '["client_name", "balance"]'),
('payment_received', 'Payment Received - {{amount}}',
 'Dear {{client_name}},\n\nWe have received your payment of {{amount}}. Your new balance is {{balance}}.\n\nRegards,\nnet2app SMS',
 '["client_name", "amount", "balance"]'),
('invoice_generated', 'New Invoice - {{invoice_number}}',
 'Dear {{client_name}},\n\nYour invoice {{invoice_number}} for {{amount}} has been generated. Due date: {{due_date}}.\n\nRegards,\nnet2app SMS',
 '["client_name", "invoice_number", "amount", "due_date"]');

-- Insert sample MCC/MNC data
INSERT INTO mcc_mnc_data (country_name, country_code, mcc, mnc, operator_name, network_type, number_prefix) VALUES
('United States', 'US', '310', '410', 'AT&T Mobility', 'LTE', '1'),
('United States', 'US', '310', '260', 'T-Mobile USA', 'LTE', '1'),
('United States', 'US', '311', '480', 'Verizon Wireless', 'LTE', '1'),
('Bangladesh', 'BD', '470', '01', 'Grameenphone', 'LTE', '880'),
('Bangladesh', 'BD', '470', '02', 'Robi Axiata', 'LTE', '880'),
('Bangladesh', 'BD', '470', '03', 'Banglalink', 'LTE', '880'),
('Bangladesh', 'BD', '470', '04', 'Teletalk', 'LTE', '880'),
('India', 'IN', '404', '10', 'Airtel', 'LTE', '91'),
('India', 'IN', '404', '86', 'Vodafone Idea', 'LTE', '91'),
('India', 'IN', '405', '857', 'Jio', 'LTE', '91'),
('UAE', 'AE', '424', '02', 'Etisalat', 'LTE', '971'),
('UAE', 'AE', '424', '03', 'du', 'LTE', '971'),
('UK', 'GB', '234', '10', 'O2', 'LTE', '44'),
('UK', 'GB', '234', '15', 'Vodafone UK', 'LTE', '44'),
('Saudi Arabia', 'SA', '420', '01', 'STC', 'LTE', '966'),
('Saudi Arabia', 'SA', '420', '03', 'Mobily', 'LTE', '966');

-- Insert API templates
INSERT INTO api_templates (name, region, provider_name, send_url_template, auth_type, params_mapping) VALUES
('Twilio', 'global', 'Twilio', 'https://api.twilio.com/2010-04-01/Accounts/{{account_sid}}/Messages.json', 'basic', 
 '{"To": "destination", "From": "source", "Body": "message"}'),
('SSL Wireless', 'bangladesh', 'SSL Wireless', 'https://sms.sslwireless.com/pushapi/dynamic/server.php', 'api_key',
 '{"msisdn": "destination", "sms": "message", "csms_id": "message_id"}'),
('MSG91', 'india', 'MSG91', 'https://api.msg91.com/api/v5/flow/', 'api_key',
 '{"mobiles": "destination", "message": "message"}'),
('Unifonic', 'middle_east', 'Unifonic', 'https://el.cloud.unifonic.com/rest/SMS/messages', 'bearer',
 '{"Recipient": "destination", "Body": "message"}');
