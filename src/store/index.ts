import { create } from 'zustand';

const API = '/api';

async function fetchAPI(path: string) {
  try {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function postAPI(path: string, data: any) {
  try {
    await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
  } catch {}
}

async function deleteAPI(path: string) {
  try { await fetch(`${API}${path}`, {method: 'DELETE'}); } catch {}
}

interface Store {
  clients: any[]; suppliers: any[]; trunks: any[]; routes: any[];
  rates: any[]; smsLogs: any[]; payments: any[]; invoices: any[];
  notifications: any[]; campaigns: any[]; routingPlans: any[];
  mccMnc: any[]; translations: any[]; users: any[];
  currentUser: any; license: any;
  initialized: boolean; loading: boolean;
  loadAll: () => Promise<void>;
  addClient: (d: any) => Promise<void>;
  updateClient: (id: string, d: any) => void;
  deleteClient: (id: string) => Promise<void>;
  addSupplier: (d: any) => Promise<void>;
  updateSupplier: (id: string, d: any) => void;
  deleteSupplier: (id: string) => Promise<void>;
  addTrunk: (d: any) => Promise<void>;
  deleteTrunk: (id: string) => Promise<void>;
  addRoute: (d: any) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  addRate: (d: any) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  addPayment: (d: any) => Promise<void>;
  addInvoice: (d: any) => Promise<void>;
  updateInvoice: (id: string, d: any) => void;
  addSmsLog: (d: any) => void;
  addCampaign: (d: any) => Promise<void>;
  updateCampaign: (id: string, d: any) => void;
  addNotification: (d: any) => void;
  getClient: (id: string) => any;
  getSupplier: (id: string) => any;
  getDashboardStats: () => any;
  getPaymentsByEntity: (t: string, id: string) => any[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setCurrentUser: (u: any) => void;
  login: (u: string, p: string) => boolean;
  logout: () => void;
  addUser: (d: any) => void;
  updateUser: (id: string, d: any) => void;
  deleteUser: (id: string) => void;
  addTranslation: (d: any) => void;
  updateTranslation: (id: string, d: any) => void;
  deleteTranslation: (id: string) => void;
  updateRoutingPlan: (id: string, d: any) => void;
  addRoutingPlan: (d: any) => void;
  deleteRoutingPlan: (id: string) => void;
  addMccMnc: (d: any) => void;
  updateMccMnc: (id: string, d: any) => void;
  bulkAddRates: (d: any[]) => void;
  updateRate: (id: string, d: any) => void;
  updateNotificationSetting: (id: string, d: any) => void;
  updateEmailTemplate: (id: string, d: any) => void;
  deleteCampaign: (id: string) => void;
  updateLicense: (d: any) => void;
  addApiTemplate: (d: any) => void;
  updateApiTemplate: (id: string, d: any) => void;
  deleteApiTemplate: (id: string) => void;
  setUsers: (u: any[]) => void;
  setClients: (c: any[]) => void;
  setSuppliers: (s: any[]) => void;
  setTranslations: (t: any[]) => void;
  setRates: (r: any[]) => void;
}

export const useStore = create<Store>((set, get) => ({
  clients: [], suppliers: [], trunks: [], routes: [],
  rates: [], smsLogs: [], payments: [], invoices: [],
  notifications: [], campaigns: [], routingPlans: [],
  mccMnc: [], translations: [], users: [],
  currentUser: { id: '1', username: 'admin', role: 'super_admin', isActive: true },
  license: { planType: 'unlimited', isActive: true },
  initialized: false, loading: false,

  loadAll: async () => {
    set({ loading: true });
    const [clients, suppliers, trunks, routes, rates, mccMnc, smsLogs, payments, invoices] = await Promise.all([
      fetchAPI('/clients'), fetchAPI('/suppliers'), fetchAPI('/trunks'),
      fetchAPI('/routes'), fetchAPI('/rates'), fetchAPI('/rates/mccmnc'),
      fetchAPI('/sms/logs'), fetchAPI('/billing/payments'), fetchAPI('/billing/invoices')
    ]);
    set({
      clients: clients || [], suppliers: suppliers || [],
      trunks: trunks || [], routes: routes || [],
      rates: rates || [], mccMnc: mccMnc || [],
      smsLogs: (smsLogs?.logs || smsLogs || []),
      payments: payments || [], invoices: invoices || [],
      notifications: [], campaigns: [], routingPlans: [],
      translations: [], users: [{ id: '1', username: 'admin', role: 'super_admin', isActive: true }],
      initialized: true, loading: false
    });
  },

  addClient: async (d) => { await postAPI('/clients', d); get().loadAll(); },
  updateClient: (id, d) => set(s => ({ clients: s.clients.map(c => c.id === id ? {...c, ...d} : c) })),
  deleteClient: async (id) => { await deleteAPI(`/clients/${id}`); get().loadAll(); },

  addSupplier: async (d) => { await postAPI('/suppliers', d); get().loadAll(); },
  updateSupplier: (id, d) => set(s => ({ suppliers: s.suppliers.map(x => x.id === id ? {...x, ...d} : x) })),
  deleteSupplier: async (id) => { await deleteAPI(`/suppliers/${id}`); get().loadAll(); },

  addTrunk: async (d) => { await postAPI('/trunks', d); get().loadAll(); },
  deleteTrunk: async (id) => { await deleteAPI(`/trunks/${id}`); get().loadAll(); },

  addRoute: async (d) => { await postAPI('/routes', d); get().loadAll(); },
  deleteRoute: async (id) => { await deleteAPI(`/routes/${id}`); get().loadAll(); },

  addRate: async (d) => { await postAPI('/rates', d); get().loadAll(); },
  deleteRate: async (id) => { await deleteAPI(`/rates/${id}`); get().loadAll(); },

  addPayment: async (d) => { await postAPI('/billing/payments', d); get().loadAll(); },
  addInvoice: async (d) => { await postAPI('/billing/invoices', d); get().loadAll(); },
  updateInvoice: () => {},
  addSmsLog: () => {},
  addCampaign: async (d) => { await postAPI('/campaigns', d); get().loadAll(); },
  updateCampaign: () => {},
  addNotification: () => {},

  getClient: (id) => get().clients.find(c => c.id === id),
  getSupplier: (id) => get().suppliers.find(s => s.id === id),
  getDashboardStats: () => {
    const s = get();
    return {
      totalMessages: (s.smsLogs || []).length,
      deliveredMessages: 0, failedMessages: 0, revenue: 0, profit: 0,
      activeClients: (s.clients || []).filter(c => c.isActive).length,
      activeSuppliers: (s.suppliers || []).filter(x => x.isActive).length,
      bindUpClients: 0, bindDownClients: 0
    };
  },
  getPaymentsByEntity: () => [],
  markNotificationRead: () => {},
  markAllNotificationsRead: () => {},
  setCurrentUser: (u) => set({ currentUser: u }),
  login: () => true,
  logout: () => set({ currentUser: null }),
  addUser: () => {}, updateUser: () => {}, deleteUser: () => {},
  addTranslation: () => {}, updateTranslation: () => {}, deleteTranslation: () => {},
  updateRoutingPlan: () => {}, addRoutingPlan: () => {}, deleteRoutingPlan: () => {},
  addMccMnc: () => {}, updateMccMnc: () => {},
  bulkAddRates: () => {}, updateRate: () => {},
  updateNotificationSetting: () => {}, updateEmailTemplate: () => {},
  deleteCampaign: () => {}, updateLicense: () => {},
  addApiTemplate: () => {}, updateApiTemplate: () => {}, deleteApiTemplate: () => {},
  setUsers: () => {}, setClients: () => {}, setSuppliers: () => {}, setTranslations: () => {},
  setRates: () => {},
}));

// Auto-load on startup
setTimeout(() => { useStore.getState().loadAll(); }, 100);
