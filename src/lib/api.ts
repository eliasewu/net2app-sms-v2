/**
 * net2app SMS Hub — API Service Layer
 * ====================================
 * Connects React frontend to FastAPI backend and Kannel.
 *
 * PORT MAP:
 *   8000 — FastAPI REST API (main backend)
 *  13013 — Kannel smsbox (send SMS HTTP endpoint)
 *  13000 — Kannel admin (bearbox status)
 *   5432 — PostgreSQL (database injection via SQLbox)
 *   2775 — SMPP server (client binds)
 *   6379 — Redis (cache / TPS counters)
 *   5672 — RabbitMQ (message queue)
 *
 * METHODS:
 *   A) HTTP API Method — POST to /api/* endpoints on :8000
 *   B) Kannel HTTP Method — GET/POST to :13013/cgi-bin/sendsms
 *   C) Database Injection — INSERT into send_sms table (via API)
 */

// @ts-ignore - Vite env
const API_BASE: string = (globalThis as any).__VITE_API_URL__ || 'http://localhost:8000';
// @ts-ignore
const KANNEL_BASE: string = (globalThis as any).__VITE_KANNEL_URL__ || 'http://localhost:13013';
// @ts-ignore
const KANNEL_ADMIN: string = (globalThis as any).__VITE_KANNEL_ADMIN_URL__ || 'http://localhost:13000';

// ─── Auth Token Management ─────────────────────────────────────────
let authToken: string | null = localStorage.getItem('auth_token');

function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API Error');
  }
  return res.json();
}

// ─── AUTH ────────────────────────────────────────────────────────────
export const authApi = {
  login: async (username: string, password: string) => {
    const data = await request<{ access_token: string; user: unknown }>('POST', '/api/auth/login', { username, password });
    setToken(data.access_token);
    return data;
  },
  logout: () => { setToken(null); },
  me: () => request('GET', '/api/auth/me'),
};

// ─── CLIENTS ────────────────────────────────────────────────────────
export const clientsApi = {
  list:       (params?: string) => request('GET', `/api/clients${params ? '?' + params : ''}`),
  get:        (id: string) => request('GET', `/api/clients/${id}`),
  create:     (data: unknown) => request('POST', '/api/clients', data),
  update:     (id: string, data: unknown) => request('PUT', `/api/clients/${id}`, data),
  delete:     (id: string) => request('DELETE', `/api/clients/${id}`),
  topup:      (id: string, data: unknown) => request('POST', `/api/clients/${id}/topup`, data),
  balance:    (id: string) => request('GET', `/api/clients/${id}/balance`),
  bindStatus: (id: string) => request('GET', `/api/clients/${id}/bind-status`),
  bind:       (id: string) => request('POST', `/api/clients/${id}/bind`),
  unbind:     (id: string) => request('POST', `/api/clients/${id}/unbind`),
  translations: {
    list:     (id: string) => request('GET', `/api/clients/${id}/translations`),
    create:   (id: string, data: unknown) => request('POST', `/api/clients/${id}/translations`, data),
    delete:   (cid: string, tid: string) => request('DELETE', `/api/clients/${cid}/translations/${tid}`),
  },
  whitelist: {
    list:     (id: string) => request('GET', `/api/clients/${id}/whitelist`),
    add:      (id: string, ip: string) => request('POST', `/api/clients/${id}/whitelist`, { ip_address: ip }),
    remove:   (cid: string, wid: string) => request('DELETE', `/api/clients/${cid}/whitelist/${wid}`),
  },
  rates: {
    list:     (id: string) => request('GET', `/api/rates?entity_type=client&entity_id=${id}`),
    add:      (data: unknown) => request('POST', '/api/rates', data),
    bulkAdd:  (data: unknown) => request('POST', '/api/rates/bulk', data),
  },
};

// ─── SUPPLIERS ──────────────────────────────────────────────────────
export const suppliersApi = {
  list:       (params?: string) => request('GET', `/api/suppliers${params ? '?' + params : ''}`),
  get:        (id: string) => request('GET', `/api/suppliers/${id}`),
  create:     (data: unknown) => request('POST', '/api/suppliers', data),
  update:     (id: string, data: unknown) => request('PUT', `/api/suppliers/${id}`, data),
  delete:     (id: string) => request('DELETE', `/api/suppliers/${id}`),
  bindStatus: (id: string) => request('GET', `/api/suppliers/${id}/bind-status`),
  bind:       (id: string) => request('POST', `/api/suppliers/${id}/bind`),
  unbind:     (id: string) => request('POST', `/api/suppliers/${id}/unbind`),
  translations: {
    list:     (id: string) => request('GET', `/api/suppliers/${id}/translations`),
    create:   (id: string, data: unknown) => request('POST', `/api/suppliers/${id}/translations`, data),
    delete:   (sid: string, tid: string) => request('DELETE', `/api/suppliers/${sid}/translations/${tid}`),
  },
  /** Send RCS message through RCS-type supplier */
  sendRcs: (supplierId: string, data: { to: string; agentId: string; content: unknown }) =>
    request('POST', `/api/suppliers/${supplierId}/rcs/send`, data),
  /** Send Flash SMS through flash_sms-type supplier */
  sendFlash: (supplierId: string, data: { to: string; from: string; message: string; dataCoding?: number }) =>
    request('POST', `/api/suppliers/${supplierId}/flash/send`, data),
};

// ─── ROUTING ────────────────────────────────────────────────────────
export const routingApi = {
  trunks: {
    list:     () => request('GET', '/api/trunks'),
    create:   (data: unknown) => request('POST', '/api/trunks', data),
    update:   (id: string, data: unknown) => request('PUT', `/api/trunks/${id}`, data),
    delete:   (id: string) => request('DELETE', `/api/trunks/${id}`),
  },
  routes: {
    list:     () => request('GET', '/api/routes'),
    create:   (data: unknown) => request('POST', '/api/routes', data),
    update:   (id: string, data: unknown) => request('PUT', `/api/routes/${id}`, data),
    delete:   (id: string) => request('DELETE', `/api/routes/${id}`),
  },
  plans: {
    list:     () => request('GET', '/api/routing-plans'),
    create:   (data: unknown) => request('POST', '/api/routing-plans', data),
  },
  clientRoutes: {
    list:     (clientId: string) => request('GET', `/api/clients/${clientId}/routes`),
    assign:   (clientId: string, data: unknown) => request('POST', `/api/clients/${clientId}/routes`, data),
  },
};

// ─── RATES / MCC-MNC ────────────────────────────────────────────────
export const ratesApi = {
  list:       (params?: string) => request('GET', `/api/rates${params ? '?' + params : ''}`),
  create:     (data: unknown) => request('POST', '/api/rates', data),
  update:     (id: string, data: unknown) => request('PUT', `/api/rates/${id}`, data),
  delete:     (id: string) => request('DELETE', `/api/rates/${id}`),
  bulkUpload: (data: unknown) => request('POST', '/api/rates/bulk', data),
  mccmnc: {
    list:       (params?: string) => request('GET', `/api/rates/mccmnc${params ? '?' + params : ''}`),
    create:     (data: unknown) => request('POST', '/api/rates/mccmnc', data),
    bulkUpload: (data: unknown) => request('POST', '/api/rates/mccmnc/bulk', data),
    exportCsv:  () => request('GET', '/api/rates/mccmnc/export'),
  },
};

// ─── BILLING ────────────────────────────────────────────────────────
export const billingApi = {
  summary:    (params?: string) => request('GET', `/api/billing/summary${params ? '?' + params : ''}`),
  invoices: {
    list:       (params?: string) => request('GET', `/api/billing/invoices${params ? '?' + params : ''}`),
    get:        (id: string) => request('GET', `/api/billing/invoices/${id}`),
    generate:   (data: unknown) => request('POST', '/api/billing/invoices/generate', data),
    update:     (id: string, data: unknown) => request('PUT', `/api/billing/invoices/${id}`, data),
    markPaid:   (id: string) => request('POST', `/api/billing/invoices/${id}/mark-paid`),
    send:       (id: string) => request('POST', `/api/billing/invoices/${id}/send`),
  },
  payments: {
    list:       (params?: string) => request('GET', `/api/billing/payments${params ? '?' + params : ''}`),
    create:     (data: unknown) => request('POST', '/api/billing/payments', data),
  },
};

// ─── SMS (Direct Kannel + API) ──────────────────────────────────────
export const smsApi = {
  /** Method A — via FastAPI which inserts into send_sms (SQLbox picks up) */
  sendViaApi:  (data: unknown) => request('POST', '/api/sms/send', data),

  /** Method B — direct Kannel HTTP API on :13013 */
  sendViaKannel: async (params: {
    username: string; password: string;
    to: string; text: string; from?: string; smsc?: string;
  }) => {
    const qs = new URLSearchParams({
      username: params.username,
      password: params.password,
      to: params.to,
      text: params.text,
      ...(params.from ? { from: params.from } : {}),
      ...(params.smsc ? { smsc: params.smsc } : {}),
    });
    const res = await fetch(`${KANNEL_BASE}/cgi-bin/sendsms?${qs}`);
    return res.text();
  },

  /** Method C — database injection via API endpoint */
  sendViaSqlbox: (data: { receiver: string; msgdata: string; smsc_id: string }) =>
    request('POST', '/api/sms/inject', data),

  status:   (messageId: string) => request('GET', `/api/sms/status/${messageId}`),
  logs:     (params?: string) => request('GET', `/api/sms/logs${params ? '?' + params : ''}`),
};

// ─── REPORTS ────────────────────────────────────────────────────────
export const reportsApi = {
  realtime: () => request('GET', '/api/reports/realtime'),
  hourly:   (params?: string) => request('GET', `/api/reports/hourly${params ? '?' + params : ''}`),
  daily:    (params?: string) => request('GET', `/api/reports/daily${params ? '?' + params : ''}`),
  monthly:  (params?: string) => request('GET', `/api/reports/monthly${params ? '?' + params : ''}`),
  exportCsv:(params?: string) => request('GET', `/api/reports/export${params ? '?' + params : ''}`),
};

// ─── NOTIFICATIONS ──────────────────────────────────────────────────
export const notificationsApi = {
  list:           (params?: string) => request('GET', `/api/notifications${params ? '?' + params : ''}`),
  markRead:       (id: string) => request('PUT', `/api/notifications/${id}/read`),
  markAllRead:    () => request('POST', '/api/notifications/read-all'),
  settings: {
    get:    () => request('GET', '/api/notifications/settings'),
    update: (data: unknown) => request('PUT', '/api/notifications/settings', data),
  },
  templates: {
    list:   () => request('GET', '/api/notifications/templates'),
    update: (id: string, data: unknown) => request('PUT', `/api/notifications/templates/${id}`, data),
  },
};

// ─── CAMPAIGNS ──────────────────────────────────────────────────────
export const campaignsApi = {
  list:       (params?: string) => request('GET', `/api/campaigns${params ? '?' + params : ''}`),
  create:     (data: unknown) => request('POST', '/api/campaigns', data),
  update:     (id: string, data: unknown) => request('PUT', `/api/campaigns/${id}`, data),
  delete:     (id: string) => request('DELETE', `/api/campaigns/${id}`),
  uploadNumbers: async (campaignId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/numbers`, {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
    });
    return res.json();
  },
};

// ─── USERS ──────────────────────────────────────────────────────────
export const usersApi = {
  list:     (params?: string) => request('GET', `/api/users${params ? '?' + params : ''}`),
  create:   (data: unknown) => request('POST', '/api/users', data),
  update:   (id: string, data: unknown) => request('PUT', `/api/users/${id}`, data),
  delete:   (id: string) => request('DELETE', `/api/users/${id}`),
};

// ─── SYSTEM ─────────────────────────────────────────────────────────
export const systemApi = {
  license:    () => request('GET', '/api/system/license'),
  updateLicense: (data: unknown) => request('PUT', '/api/system/license', data),
  settings:   () => request('GET', '/api/system/settings'),
  updateSettings: (data: unknown) => request('PUT', '/api/system/settings', data),
  backup:     () => request('POST', '/api/system/backup'),
  restore:    (data: unknown) => request('POST', '/api/system/restore', data),
  backupList: () => request('GET', '/api/system/backups'),
  health:     () => request('GET', '/health'),

  /** Kannel status from admin port :13000 */
  kannelStatus: async () => {
    try {
      const res = await fetch(`${KANNEL_ADMIN}/status?type=json`);
      return res.json();
    } catch {
      return { status: 'unreachable' };
    }
  },
};

// ─── API TEMPLATES ──────────────────────────────────────────────────
export const apiTemplatesApi = {
  list:     () => request('GET', '/api/api-templates'),
  create:   (data: unknown) => request('POST', '/api/api-templates', data),
  update:   (id: string, data: unknown) => request('PUT', `/api/api-templates/${id}`, data),
  delete:   (id: string) => request('DELETE', `/api/api-templates/${id}`),
};
