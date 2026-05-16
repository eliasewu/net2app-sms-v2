// User Types
export type UserRole = 'super_admin' | 'admin' | 'support' | 'billing' | 'agent' | 'client' | 'supplier';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  parentId?: string;
  entityId?: string;
  entityType?: 'client' | 'supplier';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// Client Types
export type BillingType = 'prepaid' | 'postpaid';
export type BillingMode = 'send' | 'submit' | 'dlr';
export type ConnectionMode = 'server' | 'client';
export type SmppStatus = 'bound' | 'unbound' | 'connecting' | 'error';
export type BindType = 'transceiver' | 'transmitter' | 'receiver';

export interface Client {
  id: string;
  clientCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  balance: number;
  creditLimit: number;
  billingType: BillingType;
  billingMode: BillingMode;
  currency: string;
  connectionMode: ConnectionMode;
  smppUsername: string;
  smppPassword: string;
  smppIp: string;
  smppPort: number;
  smppSystemType: string;
  smppTps: number;
  smppBindType: BindType;
  smppStatus: SmppStatus;
  apiKey?: string;
  apiEnabled: boolean;
  forceDlr: boolean;
  forceDlrTimeout: number;
  maxTps: number;
  ipWhitelist: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Translation {
  id: string;
  entityId: string;
  entityType: 'client' | 'supplier';
  name: string;
  priority: number;
  type: 'content' | 'number' | 'sid' | 'extract_otp' | 'random_content';
  matchPattern: string;
  replacePattern: string;
  isActive: boolean;
  createdAt: string;
}

// Supplier Types
export type ConnectionType = 'smpp' | 'http_api' | 'ott_device' | 'whatsapp' | 'telegram' | 'custom_http' | 'rcs' | 'flash_sms';
export type ApiRegion = 'global' | 'bangladesh' | 'india' | 'middle_east' | 'custom';

export interface Supplier {
  id: string;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  connectionType: ConnectionType;
  connectionMode: ConnectionMode;
  smppHost: string;
  smppPort: number;
  smppUsername: string;
  smppPassword: string;
  smppSystemType: string;
  smppBindType: BindType;
  smppTps: number;
  smppStatus: SmppStatus;
  apiSendUrl?: string;
  apiDlrUrl?: string;
  apiKey?: string;
  apiUsername?: string;
  apiPassword?: string;
  apiMethod?: 'GET' | 'POST';
  apiContentType?: string;
  apiCustomParams?: Record<string, string>;
  apiSubmitResponsePattern?: string;
  apiDlrResponsePattern?: string;
  apiProviderRegion?: ApiRegion;
  // RCS Settings
  rcsAgentId?: string;
  rcsBrandId?: string;
  rcsApiUrl?: string;
  rcsApiKey?: string;
  rcsWebhookUrl?: string;
  rcsFeatures?: string[]; // ['text','image','card','carousel','suggestion']
  // Flash SMS Settings
  flashDataCoding?: number; // 0x10 for flash
  flashProtocolId?: number;
  flashValidityPeriod?: number;
  // Account
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Trunk & Route Types
export type TrunkType = 'sim' | 'voiceotp' | 'marketing' | 'spam' | 'direct' | 'local_direct';
export type RoutingType = 'priority' | 'lcr' | 'performance' | 'round_robin' | 'testing';

export interface Trunk {
  id: string;
  name: string;
  trunkType: TrunkType;
  description: string;
  isActive: boolean;
  suppliers: TrunkSupplier[];
  createdAt: string;
}

export interface TrunkSupplier {
  id: string;
  trunkId: string;
  supplierId: string;
  supplierName?: string;
  priority: number;
  weight: number;
  isActive: boolean;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  routingType: RoutingType;
  isActive: boolean;
  trunks: RouteTrunk[];
  createdAt: string;
}

export interface RouteTrunk {
  id: string;
  routeId: string;
  trunkId: string;
  trunkName?: string;
  priority: number;
  isActive: boolean;
}

export interface ClientRoute {
  id: string;
  clientId: string;
  routeId: string;
  routeName?: string;
  mcc?: string;
  mnc?: string;
  prefix?: string;
  priority: number;
  isActive: boolean;
}

export interface RoutingPlan {
  id: string;
  name: string;
  description: string;
  allowedTrunkTypes: TrunkType[];
  isActive: boolean;
  createdAt: string;
}

// Rate Types
export interface MccMnc {
  id: string;
  countryName: string;
  countryCode: string;
  mcc: string;
  mnc: string;
  operatorName: string;
  networkType: string;
  isActive: boolean;
}

export interface Rate {
  id: string;
  entityId: string;
  entityType: 'client' | 'supplier';
  mcc: string;
  mnc: string;
  countryName: string;
  operatorName: string;
  rate: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

// SMS Log Types — Full CDR Record
export type SmsStatus = 'pending' | 'submitted' | 'delivered' | 'failed' | 'expired' | 'rejected';
export type SrcType = 'SMPP' | 'HTTP' | 'API' | 'CAMPAIGN' | 'TEST';
export type MsgType = 'SMS' | 'MMS' | 'OTP' | 'VOICE_OTP' | 'RCS' | 'FLASH';
export type SendType = 'SMSC' | 'Device' | 'HTTP' | 'API';

export interface SmsLog {
  id: string;
  messageId: string;
  // Client info
  clientId: string;
  clientCode: string;
  clientAlias?: string;
  srcType: SrcType;
  // Message type
  msgType: MsgType;
  businessType?: string;
  sendType: SendType;
  // Billing
  clientRate: number;    // "Pay" — what client pays
  supplierRate: number;  // "Cost" — what supplier charges us
  profit: number;        // clientRate - supplierRate
  chargedPoints: number;
  // Routing
  routeId: string;
  routeName?: string;
  trunkId: string;
  trunkName?: string;
  // Supplier / Channel
  supplierId: string;
  supplierCode: string;
  channel?: string;
  device?: string;
  ports?: number;
  slot?: number;
  iccid?: string;
  // Send/Deliver results
  sendResult: SmsStatus;
  sendReason?: string;
  deliverResult?: string;
  deliverFailReason?: string;
  // Numbers
  sourceAddr: string;     // Sender ID
  oriReceiver: string;    // Original receiver as submitted
  destinationAddr: string; // Final destination after translation
  dstReceiver?: string;   // Destination receiver on device
  // Network
  mcc: string;
  mnc: string;
  country: string;
  operator: string;
  // Content
  messageContent: string;
  destSmsContent?: string; // Content after translation
  smsBytes?: number;
  destSmsBytes?: number;
  // Message IDs
  inMsgId?: string;
  outMsgId?: string;
  // Timing
  submitTime: string;
  sendTime?: string;
  deliverTime?: string;
  doneTime?: string;
  dlrTime?: string;
  deliverDuration?: number;
  duration?: number;
  // Metadata
  partsCount: number;
  billingType: BillingMode;
  status: SmsStatus;
  errorCode?: string;
  errorMessage?: string;
  clientIp?: string;
  createdAt: string;
}

// Payment Types
export type PaymentType = 'topup' | 'credit' | 'debit' | 'adjustment';

export interface Payment {
  id: string;
  paymentNumber: string;
  entityType: 'client' | 'supplier';
  entityId: string;
  entityName?: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  paymentMethod: string;
  referenceNumber: string;
  bankDetails?: string;
  notes?: string;
  processedBy: string;
  createdAt: string;
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type BillingFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  billingFrequency: BillingFrequency;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  billToName: string;
  billToAddress: string;
  billToEmail: string;
  bankName?: string;
  bankAccount?: string;
  bankRouting?: string;
  swiftCode?: string;
  paymentNotes?: string;
  status: InvoiceStatus;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  mcc?: string;
  mnc?: string;
  country?: string;
  operator?: string;
}

// Notification Types
export type NotificationType = 
  | 'low_balance'
  | 'payment_received'
  | 'payment_reminder'
  | 'invoice_generated'
  | 'rate_update'
  | 'channel_disconnect'
  | 'campaign_complete'
  | 'dlr_failure';

export interface NotificationSetting {
  id: string;
  userId: string;
  notificationType: NotificationType;
  emailEnabled: boolean;
  dashboardEnabled: boolean;
  thresholdValue?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

// Campaign Types
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  clientId: string;
  clientName?: string;
  name: string;
  routeId: string;
  routeName?: string;
  totalVolume: number;
  tpsLimit: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  status: CampaignStatus;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

// License & Plan Types
export type PlanType = '3M' | '5M' | '10M' | '15M' | '30M' | 'unlimited';

export interface UsagePlan {
  id: string;
  planName: string;       // '3M Plan', '5M Plan', etc.
  planType: PlanType;
  volumeLimit: number;    // 3000000, 5000000, -1 for unlimited
  monthlyRentUsd: number; // 149, 199, 299, etc.
  isActive: boolean;
}

export interface ClientSubscription {
  id: string;
  clientId: string;
  planId: string;
  smsCounter: number;
  voiceCounter: number;
  rcsCounter: number;
  ottCounter: number;
  billingCycleStart: string;
  billingCycleEnd: string;
  status: 'ACTIVE' | 'SUSPENDED_VOLUME_EXCEEDED' | 'EXPIRED';
}

export interface PlatformLicense {
  id: string;
  licenseKey: string;
  platformName: string;
  companyName: string;
  planType: PlanType;
  monthlyLimit: number;
  currentMonthUsage: number;
  smsEnabled: boolean;
  voiceotpEnabled: boolean;
  rcsEnabled: boolean;
  ottEnabled: boolean;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  // Plans
  plans: UsagePlan[];
  // SMTP Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  smtpFromName?: string;
  smtpSecure?: boolean;
  smtpEnabled?: boolean;
}

// API Template Types
export interface ApiTemplate {
  id: string;
  name: string;
  region: ApiRegion;
  providerName: string;
  sendUrlTemplate: string;
  dlrUrlTemplate: string;
  authType: 'api_key' | 'basic' | 'bearer' | 'custom';
  paramsMapping: Record<string, string>;
  submitResponsePattern: string;
  dlrResponsePattern: string;
  isActive: boolean;
}

// Report Types
export interface DailyReport {
  id: string;
  reportDate: string;
  entityType: 'client' | 'supplier' | 'system';
  entityId?: string;
  totalSubmitted: number;
  totalDelivered: number;
  totalFailed: number;
  clientRevenue: number;
  supplierCost: number;
  profit: number;
  byCountry: Record<string, number>;
  byOperator: Record<string, number>;
  byHour: Record<string, number>;
}

export interface HourlyReport {
  id: string;
  reportHour: string;
  entityType: 'client' | 'supplier' | 'system';
  entityId?: string;
  totalSubmitted: number;
  totalDelivered: number;
  totalFailed: number;
  revenue: number;
  cost: number;
  profit: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalMessages: number;
  deliveredMessages: number;
  failedMessages: number;
  revenue: number;
  profit: number;
  activeClients: number;
  activeSuppliers: number;
  bindUpClients: number;
  bindDownClients: number;
  lowBalanceClients: Client[];
  recentMessages: SmsLog[];
  failingSuppliers: { supplier: Supplier; failCount: number }[];
  hourlyStats: { hour: string; submitted: number; delivered: number; failed: number }[];
}
