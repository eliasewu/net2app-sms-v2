import { v4 as uuidv4 } from 'uuid';
import type {
  User, Client, Supplier, Trunk, Route, RoutingPlan,
  MccMnc, Rate, SmsLog, Payment, Invoice, Notification,
  NotificationSetting, EmailTemplate, Campaign, PlatformLicense,
  ApiTemplate, Translation
} from '../types';

// Users
export const mockUsers: User[] = [
  {
    id: uuidv4(),
    username: 'superadmin',
    email: 'developer@net2app.com',
    role: 'super_admin',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@net2app.com',
    role: 'admin',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    username: 'support1',
    email: 'support@net2app.com',
    role: 'support',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    username: 'billing1',
    email: 'billing@net2app.com',
    role: 'billing',
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Clients
export const mockClients: Client[] = [
  {
    id: 'cl-001',
    clientCode: 'CL_TriAngle_BR',
    companyName: 'Tri Angle Trade Centre FZE LLC',
    contactPerson: 'John Smith',
    email: 'ceo@triangletrade.ent',
    phone: '+971501234567',
    address: 'Dubai, UAE',
    country: 'UAE',
    balance: 500,
    creditLimit: 10000,
    billingType: 'postpaid',
    billingMode: 'submit',
    currency: 'USD',
    connectionMode: 'server',
    smppUsername: 'triangle_smpp',
    smppPassword: 'secure123',
    smppIp: '192.168.1.100',
    smppPort: 2775,
    smppSystemType: 'WWW',
    smppTps: 100,
    smppBindType: 'transceiver',
    smppStatus: 'bound',
    apiEnabled: true,
    apiKey: 'ak_triangle_xyz123',
    forceDlr: false,
    forceDlrTimeout: 60,
    maxTps: 100,
    ipWhitelist: ['192.168.1.100', '10.0.0.50'],
    isActive: true,
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cl-002',
    clientCode: 'CL_TechCorp_US',
    companyName: 'TechCorp Solutions Inc',
    contactPerson: 'Sarah Johnson',
    email: 'sms@techcorp.com',
    phone: '+14155551234',
    address: 'San Francisco, CA',
    country: 'USA',
    balance: 2500,
    creditLimit: 5000,
    billingType: 'prepaid',
    billingMode: 'dlr',
    currency: 'USD',
    connectionMode: 'server',
    smppUsername: 'techcorp_smpp',
    smppPassword: 'tech456',
    smppIp: '10.0.0.25',
    smppPort: 2775,
    smppSystemType: 'OTP',
    smppTps: 50,
    smppBindType: 'transceiver',
    smppStatus: 'bound',
    apiEnabled: false,
    forceDlr: true,
    forceDlrTimeout: 30,
    maxTps: 50,
    ipWhitelist: ['10.0.0.25'],
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cl-003',
    clientCode: 'CL_BDComm_BD',
    companyName: 'BD Communications Ltd',
    contactPerson: 'Rahim Khan',
    email: 'api@bdcomm.com.bd',
    phone: '+8801711234567',
    address: 'Dhaka, Bangladesh',
    country: 'Bangladesh',
    balance: 150,
    creditLimit: 1000,
    billingType: 'postpaid',
    billingMode: 'submit',
    currency: 'USD',
    connectionMode: 'client',
    smppUsername: 'bdcomm_smpp',
    smppPassword: 'bd789',
    smppIp: '103.50.205.10',
    smppPort: 2775,
    smppSystemType: 'BULK',
    smppTps: 200,
    smppBindType: 'transmitter',
    smppStatus: 'unbound',
    apiEnabled: true,
    apiKey: 'ak_bdcomm_abc789',
    forceDlr: false,
    forceDlrTimeout: 120,
    maxTps: 200,
    ipWhitelist: ['103.50.205.10', '103.50.205.11'],
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cl-004',
    clientCode: 'CL_IndiaMsg_IN',
    companyName: 'India Messaging Pvt Ltd',
    contactPerson: 'Priya Sharma',
    email: 'tech@indiamsg.in',
    phone: '+919876543210',
    address: 'Mumbai, India',
    country: 'India',
    balance: 45,
    creditLimit: 500,
    billingType: 'prepaid',
    billingMode: 'send',
    currency: 'USD',
    connectionMode: 'server',
    smppUsername: 'indiamsg_smpp',
    smppPassword: 'india123',
    smppIp: '203.100.50.25',
    smppPort: 2775,
    smppSystemType: 'PROMO',
    smppTps: 150,
    smppBindType: 'transceiver',
    smppStatus: 'connecting',
    apiEnabled: false,
    forceDlr: true,
    forceDlrTimeout: 45,
    maxTps: 150,
    ipWhitelist: ['203.100.50.25'],
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Suppliers
export const mockSuppliers: Supplier[] = [
  {
    id: 'sp-001',
    supplierCode: 'SP_AllSMS_Global',
    companyName: 'AllSMS Global Routes',
    contactPerson: 'Mike Wilson',
    email: 'support@allsms.com',
    phone: '+442071234567',
    address: 'London, UK',
    country: 'UK',
    connectionType: 'smpp',
    connectionMode: 'client',
    smppHost: '5.78.72.23',
    smppPort: 2775,
    smppUsername: 'net2app_allsms',
    smppPassword: 'allsms123',
    smppSystemType: 'DIRECT',
    smppBindType: 'transceiver',
    smppTps: 500,
    smppStatus: 'bound',
    balance: 15000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp-002',
    supplierCode: 'SP_BDTel_SIM',
    companyName: 'BD Telecom SIM Routes',
    contactPerson: 'Karim Ahmed',
    email: 'api@bdtel.com.bd',
    phone: '+8801812345678',
    address: 'Dhaka, Bangladesh',
    country: 'Bangladesh',
    connectionType: 'http_api',
    connectionMode: 'client',
    smppHost: '',
    smppPort: 0,
    smppUsername: '',
    smppPassword: '',
    smppSystemType: '',
    smppBindType: 'transceiver',
    smppTps: 0,
    smppStatus: 'unbound',
    apiSendUrl: 'https://api.bdtel.com.bd/sms/send',
    apiDlrUrl: 'https://api.bdtel.com.bd/sms/dlr',
    apiKey: 'bdtel_key_123',
    apiUsername: 'net2app',
    apiPassword: 'bdtel456',
    apiMethod: 'POST',
    apiContentType: 'application/json',
    apiProviderRegion: 'bangladesh',
    apiSubmitResponsePattern: '{"status":"success","msgid":"$MSGID"}',
    apiDlrResponsePattern: '{"status":"$STATUS"}',
    balance: 5000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp-003',
    supplierCode: 'SP_IndiaRoute_Direct',
    companyName: 'India Direct Routes Ltd',
    contactPerson: 'Raj Patel',
    email: 'tech@indiaroute.in',
    phone: '+919898765432',
    address: 'Delhi, India',
    country: 'India',
    connectionType: 'smpp',
    connectionMode: 'client',
    smppHost: '103.25.100.50',
    smppPort: 2775,
    smppUsername: 'net2app_india',
    smppPassword: 'india789',
    smppSystemType: 'DLT',
    smppBindType: 'transceiver',
    smppTps: 300,
    smppStatus: 'bound',
    balance: 8000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp-004',
    supplierCode: 'SP_GulfSMS_ME',
    companyName: 'Gulf SMS Hub',
    contactPerson: 'Ahmed Al-Rashid',
    email: 'support@gulfsms.ae',
    phone: '+971504567890',
    address: 'Dubai, UAE',
    country: 'UAE',
    connectionType: 'smpp',
    connectionMode: 'client',
    smppHost: '185.50.25.100',
    smppPort: 2775,
    smppUsername: 'net2app_gulf',
    smppPassword: 'gulf456',
    smppSystemType: 'PREMIUM',
    smppBindType: 'transceiver',
    smppTps: 200,
    smppStatus: 'error',
    balance: 3000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp-005',
    supplierCode: 'SP_USCarrier_Premium',
    companyName: 'US Carrier Connect',
    contactPerson: 'Lisa Chen',
    email: 'api@uscarrier.com',
    phone: '+12125551234',
    address: 'New York, USA',
    country: 'USA',
    connectionType: 'http_api',
    connectionMode: 'client',
    smppHost: '',
    smppPort: 0,
    smppUsername: '',
    smppPassword: '',
    smppSystemType: '',
    smppBindType: 'transceiver',
    smppTps: 0,
    smppStatus: 'unbound',
    apiSendUrl: 'https://api.uscarrier.com/v2/sms/send',
    apiDlrUrl: 'https://api.uscarrier.com/v2/sms/status',
    apiKey: 'uscarrier_prod_key_xyz',
    apiMethod: 'POST',
    apiContentType: 'application/json',
    apiProviderRegion: 'global',
    balance: 20000,
    currency: 'USD',
    isActive: true,
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Translations
export const mockTranslations: Translation[] = [
  {
    id: uuidv4(),
    entityId: 'cl-001',
    entityType: 'client',
    name: 'Remove Country Code',
    priority: 1,
    type: 'number',
    matchPattern: '^00',
    replacePattern: '+',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    entityId: 'cl-002',
    entityType: 'client',
    name: 'Extract OTP',
    priority: 1,
    type: 'extract_otp',
    matchPattern: '\\d{6}',
    replacePattern: '',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    entityId: 'sp-002',
    entityType: 'supplier',
    name: 'Add BD Prefix',
    priority: 1,
    type: 'number',
    matchPattern: '^880',
    replacePattern: '0',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Trunks
export const mockTrunks: Trunk[] = [
  {
    id: 'tr-001',
    name: 'BD SIM Routes',
    trunkType: 'sim',
    description: 'Bangladesh SIM-based routes for local delivery',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-001', supplierId: 'sp-002', supplierName: 'BD Telecom SIM Routes', priority: 1, weight: 100, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'tr-002',
    name: 'India Direct Routes',
    trunkType: 'direct',
    description: 'India direct routes with DLT compliance',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-002', supplierId: 'sp-003', supplierName: 'India Direct Routes Ltd', priority: 1, weight: 100, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'tr-003',
    name: 'Global Premium',
    trunkType: 'direct',
    description: 'Global premium routes for worldwide delivery',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-003', supplierId: 'sp-001', supplierName: 'AllSMS Global Routes', priority: 1, weight: 70, isActive: true },
      { id: uuidv4(), trunkId: 'tr-003', supplierId: 'sp-005', supplierName: 'US Carrier Connect', priority: 2, weight: 30, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'tr-004',
    name: 'Middle East Hub',
    trunkType: 'direct',
    description: 'Middle East premium routes',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-004', supplierId: 'sp-004', supplierName: 'Gulf SMS Hub', priority: 1, weight: 100, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'tr-005',
    name: 'Voice OTP Routes',
    trunkType: 'voiceotp',
    description: 'Voice OTP delivery routes',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-005', supplierId: 'sp-001', supplierName: 'AllSMS Global Routes', priority: 1, weight: 100, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'tr-006',
    name: 'Marketing Routes',
    trunkType: 'marketing',
    description: 'Bulk marketing SMS routes',
    isActive: true,
    suppliers: [
      { id: uuidv4(), trunkId: 'tr-006', supplierId: 'sp-002', supplierName: 'BD Telecom SIM Routes', priority: 1, weight: 50, isActive: true },
      { id: uuidv4(), trunkId: 'tr-006', supplierId: 'sp-003', supplierName: 'India Direct Routes Ltd', priority: 2, weight: 50, isActive: true }
    ],
    createdAt: new Date().toISOString()
  }
];

// Routes
export const mockRoutes: Route[] = [
  {
    id: 'rt-001',
    name: 'BD Priority Route',
    description: 'Bangladesh priority-based routing',
    routingType: 'priority',
    isActive: true,
    trunks: [
      { id: uuidv4(), routeId: 'rt-001', trunkId: 'tr-001', trunkName: 'BD SIM Routes', priority: 1, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'rt-002',
    name: 'India LCR Route',
    description: 'India least cost routing',
    routingType: 'lcr',
    isActive: true,
    trunks: [
      { id: uuidv4(), routeId: 'rt-002', trunkId: 'tr-002', trunkName: 'India Direct Routes', priority: 1, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'rt-003',
    name: 'Global Performance Route',
    description: 'Global routes with performance-based selection',
    routingType: 'performance',
    isActive: true,
    trunks: [
      { id: uuidv4(), routeId: 'rt-003', trunkId: 'tr-003', trunkName: 'Global Premium', priority: 1, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'rt-004',
    name: 'ME Round Robin',
    description: 'Middle East round robin routing',
    routingType: 'round_robin',
    isActive: true,
    trunks: [
      { id: uuidv4(), routeId: 'rt-004', trunkId: 'tr-004', trunkName: 'Middle East Hub', priority: 1, isActive: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'rt-005',
    name: 'Test Route',
    description: 'Testing route for new suppliers',
    routingType: 'testing',
    isActive: true,
    trunks: [],
    createdAt: new Date().toISOString()
  }
];

// Routing Plans
export const mockRoutingPlans: RoutingPlan[] = [
  {
    id: 'rp-001',
    name: 'Premium Plan',
    description: 'Access to all route types',
    allowedTrunkTypes: ['sim', 'voiceotp', 'marketing', 'spam', 'direct', 'local_direct'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rp-002',
    name: 'Standard Plan',
    description: 'Direct and SIM routes only',
    allowedTrunkTypes: ['sim', 'direct', 'local_direct'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rp-003',
    name: 'Marketing Plan',
    description: 'Marketing and bulk routes',
    allowedTrunkTypes: ['marketing', 'spam'],
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// MCC/MNC Data — Global 192+ Countries
import { GLOBAL_MCCMNC } from '../data/mccmnc-global';
export const mockMccMnc: MccMnc[] = GLOBAL_MCCMNC.map(m => ({
  id: uuidv4(),
  countryName: m.cn,
  countryCode: m.cc,
  mcc: m.mcc,
  mnc: m.mnc,
  operatorName: m.op,
  networkType: m.nt,
  isActive: true,
}));

// Rates
export const mockRates: Rate[] = [
  // Client rates
  { id: uuidv4(), entityId: 'cl-001', entityType: 'client', mcc: '310', mnc: '410', countryName: 'United States', operatorName: 'AT&T Mobility', rate: 0.025, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() },
  { id: uuidv4(), entityId: 'cl-001', entityType: 'client', mcc: '470', mnc: '01', countryName: 'Bangladesh', operatorName: 'Grameenphone', rate: 0.015, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() },
  { id: uuidv4(), entityId: 'cl-002', entityType: 'client', mcc: '404', mnc: '10', countryName: 'India', operatorName: 'Airtel', rate: 0.008, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() },
  // Supplier rates
  { id: uuidv4(), entityId: 'sp-001', entityType: 'supplier', mcc: '310', mnc: '410', countryName: 'United States', operatorName: 'AT&T Mobility', rate: 0.018, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() },
  { id: uuidv4(), entityId: 'sp-002', entityType: 'supplier', mcc: '470', mnc: '01', countryName: 'Bangladesh', operatorName: 'Grameenphone', rate: 0.008, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() },
  { id: uuidv4(), entityId: 'sp-003', entityType: 'supplier', mcc: '404', mnc: '10', countryName: 'India', operatorName: 'Airtel', rate: 0.004, currency: 'USD', effectiveFrom: new Date().toISOString(), isActive: true, createdAt: new Date().toISOString() }
];

// SMS Logs — no mock data, all real from store
export const mockSmsLogs: SmsLog[] = [];

// Payments
export const mockPayments: Payment[] = [
  {
    id: uuidv4(),
    paymentNumber: 'PAY-2024-001',
    entityType: 'client',
    entityId: 'cl-001',
    entityName: 'Tri Angle Trade Centre FZE LLC',
    amount: 5000,
    currency: 'USD',
    paymentType: 'topup',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'TT123456789',
    bankDetails: 'Emirates NBD - UAE',
    notes: 'Q1 Prepayment',
    processedBy: 'admin',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(),
    paymentNumber: 'PAY-2024-002',
    entityType: 'client',
    entityId: 'cl-002',
    entityName: 'TechCorp Solutions Inc',
    amount: 2500,
    currency: 'USD',
    paymentType: 'topup',
    paymentMethod: 'Wire Transfer',
    referenceNumber: 'WT987654321',
    notes: 'Monthly topup',
    processedBy: 'billing1',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Invoices
export const mockInvoices: Invoice[] = [
  {
    id: uuidv4(),
    invoiceNumber: 'INV-2024-001',
    clientId: 'cl-001',
    clientName: 'Tri Angle Trade Centre FZE LLC',
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    billingFrequency: 'monthly',
    subtotal: 4500,
    taxRate: 5,
    taxAmount: 225,
    totalAmount: 4725,
    paidAmount: 0,
    billToName: 'Tri Angle Trade Centre FZE LLC',
    billToAddress: 'Dubai, UAE',
    billToEmail: 'ceo@triangletrade.ent',
    bankName: 'Emirates NBD',
    bankAccount: '1234567890',
    swiftCode: 'EBILAEAA',
    status: 'sent',
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    items: [
      { id: uuidv4(), invoiceId: '', description: 'SMS to United States', quantity: 50000, unitPrice: 0.025, total: 1250, country: 'United States' },
      { id: uuidv4(), invoiceId: '', description: 'SMS to Bangladesh', quantity: 150000, unitPrice: 0.015, total: 2250, country: 'Bangladesh' },
      { id: uuidv4(), invoiceId: '', description: 'SMS to UAE', quantity: 50000, unitPrice: 0.02, total: 1000, country: 'UAE' }
    ]
  }
];

// Notifications
export const mockNotifications: Notification[] = [
  { id: uuidv4(), userId: 'admin', type: 'low_balance', title: 'Low Balance Alert', message: 'Client CL_IndiaMsg_IN balance is below $50', isRead: false, createdAt: new Date().toISOString() },
  { id: uuidv4(), userId: 'admin', type: 'channel_disconnect', title: 'Channel Disconnected', message: 'Supplier SP_GulfSMS_ME SMPP connection lost', isRead: false, createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: uuidv4(), userId: 'admin', type: 'dlr_failure', title: 'High DLR Failure Rate', message: 'Supplier SP_GulfSMS_ME has 15 consecutive failures', isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
];

// Notification Settings
export const mockNotificationSettings: NotificationSetting[] = [
  { id: uuidv4(), userId: 'admin', notificationType: 'low_balance', emailEnabled: true, dashboardEnabled: true, thresholdValue: 100 },
  { id: uuidv4(), userId: 'admin', notificationType: 'payment_received', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'payment_reminder', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'invoice_generated', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'rate_update', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'channel_disconnect', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'campaign_complete', emailEnabled: true, dashboardEnabled: true },
  { id: uuidv4(), userId: 'admin', notificationType: 'dlr_failure', emailEnabled: true, dashboardEnabled: true }
];

// Email Templates
export const mockEmailTemplates: EmailTemplate[] = [
  { id: uuidv4(), name: 'low_balance', subject: 'Low Balance Alert - {{client_name}}', body: 'Dear {{client_name}},\n\nYour account balance is {{balance}}. Please top up to continue service.\n\nRegards,\nnet2app SMS', variables: ['client_name', 'balance'], isActive: true },
  { id: uuidv4(), name: 'payment_received', subject: 'Payment Received - {{amount}}', body: 'Dear {{client_name}},\n\nWe have received your payment of {{amount}}. Your new balance is {{balance}}.\n\nRegards,\nnet2app SMS', variables: ['client_name', 'amount', 'balance'], isActive: true },
  { id: uuidv4(), name: 'payment_reminder', subject: 'Payment Reminder - Invoice {{invoice_number}}', body: 'Dear {{client_name}},\n\nThis is a reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.\n\nRegards,\nnet2app SMS', variables: ['client_name', 'invoice_number', 'amount', 'due_date'], isActive: true },
  { id: uuidv4(), name: 'invoice_generated', subject: 'New Invoice - {{invoice_number}}', body: 'Dear {{client_name}},\n\nYour invoice {{invoice_number}} for {{amount}} has been generated. Please find attached.\n\nRegards,\nnet2app SMS', variables: ['client_name', 'invoice_number', 'amount'], isActive: true }
];

// Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: uuidv4(),
    clientId: 'cl-001',
    clientName: 'Tri Angle Trade Centre FZE LLC',
    name: 'Q1 Promo Campaign',
    routeId: 'rt-003',
    routeName: 'Global Performance Route',
    totalVolume: 50000,
    tpsLimit: 50,
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    clientId: 'cl-002',
    clientName: 'TechCorp Solutions Inc',
    name: 'OTP Verification Test',
    routeId: 'rt-002',
    routeName: 'India LCR Route',
    totalVolume: 1000,
    tpsLimit: 10,
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'running',
    sentCount: 750,
    deliveredCount: 720,
    failedCount: 30,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

// Platform License
export const mockLicense: PlatformLicense = {
  id: uuidv4(),
  licenseKey: 'NET2APP-SMS-PRO-2024-XXXX-XXXX',
  platformName: 'net2app SMS',
  companyName: 'Net2App Technologies',
  planType: 'unlimited',
  monthlyLimit: -1,
  currentMonthUsage: 2500000,
  smsEnabled: true,
  voiceotpEnabled: true,
  rcsEnabled: false,
  ottEnabled: false,
  validFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  plans: [
    { id: 'plan-3m', planName: '3M Plan', planType: '3M', volumeLimit: 3000000, monthlyRentUsd: 149, isActive: true },
    { id: 'plan-5m', planName: '5M Plan', planType: '5M', volumeLimit: 5000000, monthlyRentUsd: 199, isActive: true },
    { id: 'plan-10m', planName: '10M Plan', planType: '10M', volumeLimit: 10000000, monthlyRentUsd: 299, isActive: true },
    { id: 'plan-15m', planName: '15M Plan', planType: '15M', volumeLimit: 15000000, monthlyRentUsd: 399, isActive: true },
    { id: 'plan-30m', planName: '30M Plan', planType: '30M', volumeLimit: 30000000, monthlyRentUsd: 450, isActive: true },
    { id: 'plan-unl', planName: 'Unlimited', planType: 'unlimited', volumeLimit: -1, monthlyRentUsd: 499, isActive: true },
  ]
};

// API Templates
export const mockApiTemplates: ApiTemplate[] = [
  // Global
  { id: uuidv4(), name: 'Twilio', region: 'global', providerName: 'Twilio', sendUrlTemplate: 'https://api.twilio.com/2010-04-01/Accounts/{{account_sid}}/Messages.json', dlrUrlTemplate: '', authType: 'basic', paramsMapping: { To: 'destination', From: 'source', Body: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  { id: uuidv4(), name: 'Nexmo/Vonage', region: 'global', providerName: 'Vonage', sendUrlTemplate: 'https://rest.nexmo.com/sms/json', dlrUrlTemplate: '', authType: 'api_key', paramsMapping: { to: 'destination', from: 'source', text: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  { id: uuidv4(), name: 'Plivo', region: 'global', providerName: 'Plivo', sendUrlTemplate: 'https://api.plivo.com/v1/Account/{{auth_id}}/Message/', dlrUrlTemplate: '', authType: 'basic', paramsMapping: { dst: 'destination', src: 'source', text: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  // Bangladesh
  { id: uuidv4(), name: 'SSL Wireless', region: 'bangladesh', providerName: 'SSL Wireless', sendUrlTemplate: 'https://sms.sslwireless.com/pushapi/dynamic/server.php', dlrUrlTemplate: '', authType: 'api_key', paramsMapping: { msisdn: 'destination', sms: 'message', csms_id: 'message_id' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  { id: uuidv4(), name: 'Mimsms', region: 'bangladesh', providerName: 'Mimsms', sendUrlTemplate: 'https://api.mimsms.com/api/SmsSending/SendingSms', dlrUrlTemplate: '', authType: 'api_key', paramsMapping: { MobileNo: 'destination', SmsText: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  // India
  { id: uuidv4(), name: 'MSG91', region: 'india', providerName: 'MSG91', sendUrlTemplate: 'https://api.msg91.com/api/v5/flow/', dlrUrlTemplate: '', authType: 'api_key', paramsMapping: { mobiles: 'destination', message: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  { id: uuidv4(), name: '2Factor', region: 'india', providerName: '2Factor', sendUrlTemplate: 'https://2factor.in/API/V1/{{api_key}}/SMS/{{destination}}/{{message}}', dlrUrlTemplate: '', authType: 'api_key', paramsMapping: {}, submitResponsePattern: '', dlrResponsePattern: '', isActive: true },
  // Middle East
  { id: uuidv4(), name: 'Unifonic', region: 'middle_east', providerName: 'Unifonic', sendUrlTemplate: 'https://el.cloud.unifonic.com/rest/SMS/messages', dlrUrlTemplate: '', authType: 'bearer', paramsMapping: { Recipient: 'destination', Body: 'message' }, submitResponsePattern: '', dlrResponsePattern: '', isActive: true }
];
