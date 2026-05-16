import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  User, Client, Supplier, Trunk, Route, RoutingPlan,
  MccMnc, Rate, SmsLog, Payment, Invoice, Notification,
  NotificationSetting, EmailTemplate, Campaign, PlatformLicense,
  ApiTemplate, Translation
} from '../types';

/*
 * ═══════════════════════════════════════════════════════════════
 *  net2app SMS Hub — Persistent Store with API Integration
 * ═══════════════════════════════════════════════════════════════
 *
 * DATA FLOW:
 *   1. On first load → empty arrays (no mock data)
 *   2. Store persists to localStorage via zustand/persist
 *   3. Every mutation (add/update/delete) also calls the backend API
 *   4. loadAll() fetches everything from backend on app init
 *   5. After refresh → data reloads from localStorage instantly,
 *      then background sync from API replaces it
 *
 * BACKEND CONNECTION:
 *   API_BASE is set via env or defaults to same-origin /api
 *   Nginx proxies /api/* to FastAPI on :8000
 */

const API = '/api'; // Nginx proxies to FastAPI :8000

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T | null> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // backend unreachable — work offline with local state
  }
}

// Default license with preloaded plans
const defaultLicense: PlatformLicense = {
  id: '1', licenseKey: 'NET2APP-TRIAL', platformName: 'net2app SMS',
  companyName: 'Your Company', planType: 'unlimited', monthlyLimit: -1,
  currentMonthUsage: 0, smsEnabled: true, voiceotpEnabled: false,
  rcsEnabled: false, ottEnabled: false,
  validFrom: new Date().toISOString(), validTo: new Date(Date.now() + 365 * 86400000).toISOString(),
  isActive: true,
  plans: [
    { id: 'plan-3m', planName: '3M Plan', planType: '3M', volumeLimit: 3000000, monthlyRentUsd: 149, isActive: true },
    { id: 'plan-5m', planName: '5M Plan', planType: '5M', volumeLimit: 5000000, monthlyRentUsd: 199, isActive: true },
    { id: 'plan-10m', planName: '10M Plan', planType: '10M', volumeLimit: 10000000, monthlyRentUsd: 299, isActive: true },
    { id: 'plan-15m', planName: '15M Plan', planType: '15M', volumeLimit: 15000000, monthlyRentUsd: 399, isActive: true },
    { id: 'plan-30m', planName: '30M Plan', planType: '30M', volumeLimit: 30000000, monthlyRentUsd: 450, isActive: true },
    { id: 'plan-unl', planName: 'Unlimited', planType: 'unlimited', volumeLimit: -1, monthlyRentUsd: 499, isActive: true },
  ],
};

const defaultAdmin: User = {
  id: 'admin-1', username: 'admin', email: 'admin@net2app.com',
  role: 'super_admin', isActive: true, createdAt: new Date().toISOString(),
};

interface Store {
  // Loading state
  initialized: boolean;
  loading: boolean;
  loadAll: () => Promise<void>;

  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;

  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Clients
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;

  // Suppliers
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  getSupplier: (id: string) => Supplier | undefined;

  // Translations
  translations: Translation[];
  setTranslations: (t: Translation[]) => void;
  addTranslation: (translation: Omit<Translation, 'id' | 'createdAt'>) => void;
  updateTranslation: (id: string, data: Partial<Translation>) => void;
  deleteTranslation: (id: string) => void;

  // Trunks
  trunks: Trunk[];
  setTrunks: (t: Trunk[]) => void;
  addTrunk: (trunk: Omit<Trunk, 'id' | 'createdAt'>) => void;
  updateTrunk: (id: string, data: Partial<Trunk>) => void;
  deleteTrunk: (id: string) => void;

  // Routes
  routes: Route[];
  setRoutes: (r: Route[]) => void;
  addRoute: (route: Omit<Route, 'id' | 'createdAt'>) => void;
  updateRoute: (id: string, data: Partial<Route>) => void;
  deleteRoute: (id: string) => void;

  // Routing Plans
  routingPlans: RoutingPlan[];
  setRoutingPlans: (p: RoutingPlan[]) => void;
  addRoutingPlan: (plan: Omit<RoutingPlan, 'id' | 'createdAt'>) => void;
  updateRoutingPlan: (id: string, data: Partial<RoutingPlan>) => void;
  deleteRoutingPlan: (id: string) => void;

  // MCC/MNC
  mccMnc: MccMnc[];
  setMccMnc: (m: MccMnc[]) => void;
  addMccMnc: (data: Omit<MccMnc, 'id'>) => void;
  updateMccMnc: (id: string, data: Partial<MccMnc>) => void;

  // Rates
  rates: Rate[];
  setRates: (r: Rate[]) => void;
  addRate: (rate: Omit<Rate, 'id' | 'createdAt'>) => void;
  updateRate: (id: string, data: Partial<Rate>) => void;
  deleteRate: (id: string) => void;
  bulkAddRates: (rates: Omit<Rate, 'id' | 'createdAt'>[]) => void;

  // SMS Logs
  smsLogs: SmsLog[];
  setSmsLogs: (l: SmsLog[]) => void;
  addSmsLog: (log: Omit<SmsLog, 'id' | 'createdAt'>) => void;

  // Payments
  payments: Payment[];
  setPayments: (p: Payment[]) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  getPaymentsByEntity: (entityType: 'client' | 'supplier', entityId: string) => Payment[];

  // Invoices
  invoices: Invoice[];
  setInvoices: (i: Invoice[]) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Notification Settings
  notificationSettings: NotificationSetting[];
  setNotificationSettings: (s: NotificationSetting[]) => void;
  updateNotificationSetting: (id: string, data: Partial<NotificationSetting>) => void;

  // Email Templates
  emailTemplates: EmailTemplate[];
  setEmailTemplates: (t: EmailTemplate[]) => void;
  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) => void;

  // Campaigns
  campaigns: Campaign[];
  setCampaigns: (c: Campaign[]) => void;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt'>) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // License
  license: PlatformLicense;
  updateLicense: (data: Partial<PlatformLicense>) => void;

  // API Templates
  apiTemplates: ApiTemplate[];
  setApiTemplates: (t: ApiTemplate[]) => void;
  addApiTemplate: (template: Omit<ApiTemplate, 'id'>) => void;
  updateApiTemplate: (id: string, data: Partial<ApiTemplate>) => void;
  deleteApiTemplate: (id: string) => void;

  // Dashboard
  getDashboardStats: () => {
    totalMessages: number; deliveredMessages: number; failedMessages: number;
    revenue: number; profit: number; activeClients: number; activeSuppliers: number;
    bindUpClients: number; bindDownClients: number;
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ─── Loading ─────────────────────────────────────────
      initialized: false,
      loading: false,

      loadAll: async () => {
        set({ loading: true });
        // Try to fetch from backend; if it fails, keep local state
        const [
          usersRes, clientsRes, suppliersRes, trunksRes, routesRes,
          plansRes, mccRes, ratesRes, logsRes, paymentsRes, invoicesRes,
          notifsRes, settingsRes, templatesRes, campaignsRes, apiTplRes,
          translationsRes, licenseRes,
        ] = await Promise.all([
          api<User[]>('GET', '/users'),
          api<Client[]>('GET', '/clients'),
          api<Supplier[]>('GET', '/suppliers'),
          api<Trunk[]>('GET', '/trunks'),
          api<Route[]>('GET', '/routes'),
          api<RoutingPlan[]>('GET', '/routing-plans'),
          api<MccMnc[]>('GET', '/rates/mccmnc'),
          api<Rate[]>('GET', '/rates'),
          api<SmsLog[]>('GET', '/sms/logs'),
          api<Payment[]>('GET', '/billing/payments'),
          api<Invoice[]>('GET', '/billing/invoices'),
          api<Notification[]>('GET', '/notifications'),
          api<NotificationSetting[]>('GET', '/notifications/settings'),
          api<EmailTemplate[]>('GET', '/notifications/templates'),
          api<Campaign[]>('GET', '/campaigns'),
          api<ApiTemplate[]>('GET', '/api-templates'),
          api<Translation[]>('GET', '/translations'),
          api<PlatformLicense>('GET', '/system/license'),
        ]);

        set({
          ...(usersRes ? { users: usersRes } : {}),
          ...(clientsRes ? { clients: clientsRes } : {}),
          ...(suppliersRes ? { suppliers: suppliersRes } : {}),
          ...(trunksRes ? { trunks: trunksRes } : {}),
          ...(routesRes ? { routes: routesRes } : {}),
          ...(plansRes ? { routingPlans: plansRes } : {}),
          ...(mccRes ? { mccMnc: mccRes } : {}),
          ...(ratesRes ? { rates: ratesRes } : {}),
          ...(logsRes ? { smsLogs: (logsRes.logs || logsRes) } : {}),
          ...(paymentsRes ? { payments: paymentsRes } : {}),
          ...(invoicesRes ? { invoices: invoicesRes } : {}),
          ...(notifsRes ? { notifications: (Array.isArray(notifsRes) ? notifsRes : (notifsRes.notifications || notifsRes.data || [])) } : {}),
          ...(settingsRes ? { notificationSettings: settingsRes } : {}),
          ...(templatesRes ? { emailTemplates: templatesRes } : {}),
          ...(campaignsRes ? { campaigns: (Array.isArray(campaignsRes) ? campaignsRes : (campaignsRes.campaigns || campaignsRes.data || [])) } : {}),
          ...(apiTplRes ? { apiTemplates: apiTplRes } : {}),
          ...(translationsRes ? { translations: (Array.isArray(translationsRes) ? translationsRes : (translationsRes.translations || [])) } : {}),
          ...(licenseRes ? { license: licenseRes } : {}),
          initialized: true,
          loading: false,
        });

        // Auto-seed MCC/MNC if empty (first-time load without backend)
        if (get().mccMnc.length === 0) {
          import('../data/mccmnc-global').then(({ GLOBAL_MCCMNC }) => {
            set({
              mccMnc: GLOBAL_MCCMNC.map(m => ({
                id: uuidv4(),
                countryName: m.cn, countryCode: m.cc,
                mcc: m.mcc, mnc: m.mnc,
                operatorName: m.op, networkType: m.nt,
                isActive: true,
              })),
            });
          });
        }
      },

      // ─── Auth ────────────────────────────────────────────
      currentUser: defaultAdmin,
      setCurrentUser: (user) => set({ currentUser: user }),
      login: (username, _password) => {
        const user = get().users.find(u => u.username === username && u.isActive);
        if (user) { set({ currentUser: user }); return true; }
        return false;
      },
      logout: () => { set({ currentUser: null }); localStorage.removeItem('auth_token'); },

      // ─── Users ───────────────────────────────────────────
      users: [defaultAdmin],
      setUsers: (users) => set({ users }),
      addUser: (data) => {
        const u = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ users: [...s.users, u] }));
        api('POST', '/users', u);
      },
      updateUser: (id, data) => {
        set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u) }));
        api('PUT', `/users/${id}`, data);
      },
      deleteUser: (id) => {
        set(s => ({ users: s.users.filter(u => u.id !== id) }));
        api('DELETE', `/users/${id}`);
      },

      // ─── Clients ─────────────────────────────────────────
      clients: [],
      setClients: (clients) => set({ clients }),
      addClient: async (data) => {
        const c = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Client;
        set(s => ({ clients: [...s.clients, c] }));
        // Persist to backend
        api('POST', '/clients', data);
        api('POST', '/clients', c);
      },
      updateClient: (id, data) => {
        set(s => ({ clients: s.clients.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c) }));
        api('PUT', `/clients/${id}`, data);
      },
      deleteClient: (id) => {
        set(s => ({ clients: s.clients.filter(c => c.id !== id) }));
        api('DELETE', `/clients/${id}`);
      },
      getClient: (id) => get().clients.find(c => c.id === id),

      // ─── Suppliers ───────────────────────────────────────
      suppliers: [],
      setSuppliers: (suppliers) => set({ suppliers }),
      addSupplier: (data) => {
        const s = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Supplier;
        set(st => ({ suppliers: [...st.suppliers, s] }));
        api('POST', '/suppliers', s);
      },
      updateSupplier: (id, data) => {
        set(s => ({ suppliers: s.suppliers.map(sp => sp.id === id ? { ...sp, ...data, updatedAt: new Date().toISOString() } : sp) }));
        api('PUT', `/suppliers/${id}`, data);
      },
      deleteSupplier: (id) => {
        set(s => ({ suppliers: s.suppliers.filter(sp => sp.id !== id) }));
        api('DELETE', `/suppliers/${id}`);
      },
      getSupplier: (id) => get().suppliers.find(s => s.id === id),

      // ─── Translations ────────────────────────────────────
      translations: [],
      setTranslations: (t) => set({ translations: t }),
      addTranslation: (data) => {
        const t = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ translations: [...s.translations, t] }));
        api('POST', '/translations', t);
      },
      updateTranslation: (id, data) => {
        set(s => ({ translations: s.translations.map(t => t.id === id ? { ...t, ...data } : t) }));
        api('PUT', `/translations/${id}`, data);
      },
      deleteTranslation: (id) => {
        set(s => ({ translations: s.translations.filter(t => t.id !== id) }));
        api('DELETE', `/translations/${id}`);
      },

      // ─── Trunks ──────────────────────────────────────────
      trunks: [],
      setTrunks: (t) => set({ trunks: t }),
      addTrunk: (data) => {
        const t = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ trunks: [...s.trunks, t] }));
        api('POST', '/trunks', t);
      },
      updateTrunk: (id, data) => {
        set(s => ({ trunks: s.trunks.map(t => t.id === id ? { ...t, ...data } : t) }));
        api('PUT', `/trunks/${id}`, data);
      },
      deleteTrunk: (id) => {
        set(s => ({ trunks: s.trunks.filter(t => t.id !== id) }));
        api('DELETE', `/trunks/${id}`);
      },

      // ─── Routes ──────────────────────────────────────────
      routes: [],
      setRoutes: (r) => set({ routes: r }),
      addRoute: (data) => {
        const r = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ routes: [...s.routes, r] }));
        api('POST', '/routes', r);
      },
      updateRoute: (id, data) => {
        set(s => ({ routes: s.routes.map(r => r.id === id ? { ...r, ...data } : r) }));
        api('PUT', `/routes/${id}`, data);
      },
      deleteRoute: (id) => {
        set(s => ({ routes: s.routes.filter(r => r.id !== id) }));
        api('DELETE', `/routes/${id}`);
      },

      // ─── Routing Plans ───────────────────────────────────
      routingPlans: [],
      setRoutingPlans: (p) => set({ routingPlans: p }),
      addRoutingPlan: (data) => {
        const p = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ routingPlans: [...s.routingPlans, p] }));
        api('POST', '/routing-plans', p);
      },
      updateRoutingPlan: (id, data) => {
        set(s => ({ routingPlans: s.routingPlans.map(p => p.id === id ? { ...p, ...data } : p) }));
        api('PUT', `/routing-plans/${id}`, data);
      },
      deleteRoutingPlan: (id) => {
        set(s => ({ routingPlans: s.routingPlans.filter(p => p.id !== id) }));
        api('DELETE', `/routing-plans/${id}`);
      },

      // ─── MCC/MNC ─────────────────────────────────────────
      mccMnc: [],
      setMccMnc: (m) => set({ mccMnc: m }),
      addMccMnc: (data) => {
        const m = { ...data, id: uuidv4() };
        set(s => ({ mccMnc: [...s.mccMnc, m] }));
        api('POST', '/rates/mccmnc', m);
      },
      updateMccMnc: (id, data) => {
        set(s => ({ mccMnc: s.mccMnc.map(m => m.id === id ? { ...m, ...data } : m) }));
        api('PUT', `/rates/mccmnc/${id}`, data);
      },

      // ─── Rates ───────────────────────────────────────────
      rates: [],
      setRates: (r) => set({ rates: r }),
      addRate: (data) => {
        const r = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ rates: [...s.rates, r] }));
        api('POST', '/rates', r);
      },
      updateRate: (id, data) => {
        set(s => ({ rates: s.rates.map(r => r.id === id ? { ...r, ...data } : r) }));
        api('PUT', `/rates/${id}`, data);
      },
      deleteRate: (id) => {
        set(s => ({ rates: s.rates.filter(r => r.id !== id) }));
        api('DELETE', `/rates/${id}`);
      },
      bulkAddRates: (ratesData) => {
        const newRates = ratesData.map(r => ({ ...r, id: uuidv4(), createdAt: new Date().toISOString() }));
        set(s => ({ rates: [...s.rates, ...newRates] }));
        api('POST', '/rates/bulk', newRates);
      },

      // ─── SMS Logs ────────────────────────────────────────
      smsLogs: [],
      setSmsLogs: (l) => set({ smsLogs: l }),
      addSmsLog: (data) => {
        const l = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ smsLogs: [l, ...s.smsLogs].slice(0, 5000) }));
        api('POST', '/sms/logs', l);
      },

      // ─── Payments ────────────────────────────────────────
      payments: [],
      setPayments: (p) => set({ payments: p }),
      addPayment: (data) => {
        const p = { ...data, id: uuidv4(), paymentNumber: `PAY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, createdAt: new Date().toISOString() };
        // Update client balance locally
        if (data.entityType === 'client') {
          const client = get().clients.find(c => c.id === data.entityId);
          if (client) {
            const nb = data.paymentType === 'topup' ? client.balance + data.amount : client.balance - data.amount;
            set(s => ({ clients: s.clients.map(c => c.id === data.entityId ? { ...c, balance: nb } : c) }));
          }
        }
        set(s => ({ payments: [...s.payments, p] }));
        api('POST', '/billing/payments', p);
      },
      getPaymentsByEntity: (et, eid) => get().payments.filter(p => p.entityType === et && p.entityId === eid),

      // ─── Invoices ────────────────────────────────────────
      invoices: [],
      setInvoices: (i) => set({ invoices: i }),
      addInvoice: (data) => {
        const inv = { ...data, id: uuidv4(), invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, createdAt: new Date().toISOString() };
        set(s => ({ invoices: [...s.invoices, inv] }));
        api('POST', '/billing/invoices', inv);
      },
      updateInvoice: (id, data) => {
        set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, ...data } : i) }));
        api('PUT', `/billing/invoices/${id}`, data);
      },
      deleteInvoice: (id) => {
        set(s => ({ invoices: s.invoices.filter(i => i.id !== id) }));
        api('DELETE', `/billing/invoices/${id}`);
      },

      // ─── Notifications ───────────────────────────────────
      notifications: [],
      setNotifications: (n) => set({ notifications: n }),
      addNotification: (data) => {
        const n = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ notifications: [n, ...s.notifications] }));
      },
      markNotificationRead: (id) => {
        set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) }));
        api('PUT', `/notifications/${id}/read`);
      },
      markAllNotificationsRead: () => {
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, isRead: true })) }));
        api('POST', '/notifications/read-all');
      },

      // ─── Notification Settings ───────────────────────────
      notificationSettings: [],
      setNotificationSettings: (s) => set({ notificationSettings: s }),
      updateNotificationSetting: (id, data) => {
        set(s => ({ notificationSettings: s.notificationSettings.map(ns => ns.id === id ? { ...ns, ...data } : ns) }));
        api('PUT', `/notifications/settings/${id}`, data);
      },

      // ─── Email Templates ─────────────────────────────────
      emailTemplates: [],
      setEmailTemplates: (t) => set({ emailTemplates: t }),
      updateEmailTemplate: (id, data) => {
        set(s => ({ emailTemplates: s.emailTemplates.map(t => t.id === id ? { ...t, ...data } : t) }));
        api('PUT', `/notifications/templates/${id}`, data);
      },

      // ─── Campaigns ───────────────────────────────────────
      campaigns: [],
      setCampaigns: (c) => set({ campaigns: c }),
      addCampaign: (data) => {
        const c = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
        set(s => ({ campaigns: [...s.campaigns, c] }));
        api('POST', '/campaigns', c);
      },
      updateCampaign: (id, data) => {
        set(s => ({ campaigns: s.campaigns.map(c => c.id === id ? { ...c, ...data } : c) }));
        api('PUT', `/campaigns/${id}`, data);
      },
      deleteCampaign: (id) => {
        set(s => ({ campaigns: s.campaigns.filter(c => c.id !== id) }));
        api('DELETE', `/campaigns/${id}`);
      },

      // ─── License ─────────────────────────────────────────
      license: defaultLicense,
      updateLicense: (data) => {
        set(s => ({ license: { ...s.license, ...data } }));
        api('PUT', '/system/license', data);
      },

      // ─── API Templates ───────────────────────────────────
      apiTemplates: [],
      setApiTemplates: (t) => set({ apiTemplates: t }),
      addApiTemplate: (data) => {
        const t = { ...data, id: uuidv4() };
        set(s => ({ apiTemplates: [...s.apiTemplates, t] }));
        api('POST', '/api-templates', t);
      },
      updateApiTemplate: (id, data) => {
        set(s => ({ apiTemplates: s.apiTemplates.map(t => t.id === id ? { ...t, ...data } : t) }));
        api('PUT', `/api-templates/${id}`, data);
      },
      deleteApiTemplate: (id) => {
        set(s => ({ apiTemplates: s.apiTemplates.filter(t => t.id !== id) }));
        api('DELETE', `/api-templates/${id}`);
      },

      // ─── Dashboard ───────────────────────────────────────
      getDashboardStats: () => {
        const state = get();
        const today = new Date().toDateString();
        const todayLogs = (state.smsLogs || []).filter(l => new Date(l.createdAt).toDateString() === today);
        return {
          totalMessages: todayLogs.length,
          deliveredMessages: (todayLogs || []).filter(l => l.status === 'delivered').length,
          failedMessages: (todayLogs || []).filter(l => l.status === 'failed').length,
          revenue: (todayLogs || []).reduce((s, l) => s + l.clientRate, 0),
          profit: (todayLogs || []).reduce((s, l) => s + l.profit, 0),
          activeClients: (state.clients || []).filter(c => c.isActive).length,
          activeSuppliers: (state.suppliers || []).filter(s => s.isActive).length,
          bindUpClients: (state.clients || []).filter(c => c.smppStatus === 'bound').length,
          bindDownClients: (state.clients || []).filter(c => c.smppStatus !== 'bound').length,
        };
      },
    }),
    {
      name: 'net2app-sms-v3',
      // Only persist essential data, not functions
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        clients: state.clients,
        suppliers: state.suppliers,
        translations: state.translations,
        trunks: state.trunks,
        routes: state.routes,
        routingPlans: state.routingPlans,
        mccMnc: state.mccMnc,
        rates: state.rates,
        smsLogs: state.smsLogs.slice(0, 500), // limit stored logs
        payments: state.payments,
        invoices: state.invoices,
        notifications: state.notifications.slice(0, 100),
        notificationSettings: state.notificationSettings,
        emailTemplates: state.emailTemplates,
        campaigns: state.campaigns,
        license: state.license,
        apiTemplates: state.apiTemplates,
        initialized: state.initialized,
      }),
    },
    {
      name: 'net2app-sms-v3',
      version: 200, // Bump to clear old cache
    }
  )
);
