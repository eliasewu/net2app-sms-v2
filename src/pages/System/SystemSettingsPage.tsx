import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Database, Download, Upload, Key, Settings, CheckCircle, Server, Wifi, Globe, Terminal, HardDrive, Cpu, Activity, AlertTriangle, Copy } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';

type TabId = 'license' | 'kannel' | 'database' | 'api' | 'backup' | 'settings';

const pathToTab: Record<string, TabId> = {
  '/system/license': 'license',
  '/system/kannel': 'kannel',
  '/system/database': 'database',
  '/system/api': 'api',
  '/system/backup': 'backup',
  '/system/settings': 'settings',
};

export function SystemSettingsPage() {
  const { license } = useStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>(pathToTab[location.pathname] || 'license');
  
  useEffect(() => {
    const tab = pathToTab[location.pathname];
    if (tab) setActiveTab(tab);
  }, [location.pathname]);
  const [copied, setCopied] = useState('');

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const PORT_MAP = [
    { service: 'FastAPI REST', port: 8000, status: 'running', desc: 'Main backend API for frontend' },
    { service: 'SMPP Server', port: 2775, status: 'running', desc: 'Client SMPP bind port' },
    { service: 'Kannel Smsbox', port: 13013, status: 'running', desc: '/cgi-bin/sendsms HTTP endpoint' },
    { service: 'Kannel Admin', port: 13000, status: 'running', desc: '/status — queue monitor' },
    { service: 'SQLbox', port: 13005, status: 'running', desc: 'Bearbox ↔ PostgreSQL bridge' },
    { service: 'PostgreSQL', port: 5432, status: 'running', desc: 'Main database' },
    { service: 'Redis', port: 6379, status: 'running', desc: 'Cache, TPS counters, sessions' },
    { service: 'RabbitMQ', port: 5672, status: 'running', desc: 'DLR & notification queue' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
          <p className="text-gray-500">Kannel, SQLbox, database, and platform configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-6 min-w-max">
          {[
            { id: 'license', label: 'License', icon: Key },
            { id: 'kannel', label: 'Kannel / SMPP', icon: Server },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'api', label: 'API Endpoints', icon: Globe },
            { id: 'backup', label: 'Backup', icon: HardDrive },
            { id: 'settings', label: 'Platform', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══════════ LICENSE TAB ═══════════ */}
      {activeTab === 'license' && (
        <div className="space-y-6">
          {/* License Header */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"><Shield className="w-8 h-8 text-white" /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{license.platformName}</h3>
                  <p className="text-gray-500">{license.companyName}</p>
                  <p className="text-sm font-mono text-gray-400 mt-1">{license.licenseKey}</p>
                </div>
              </div>
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-green-600 font-medium">Active</span></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div><p className="text-xs text-gray-500 uppercase">Active Plan</p><p className="text-lg font-bold text-gray-900">{license.planType}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Volume Limit</p><p className="text-lg font-bold text-gray-900">{license.monthlyLimit === -1 ? 'Unlimited' : license.monthlyLimit.toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Monthly Usage</p><p className="text-lg font-bold text-gray-900">{license.currentMonthUsage.toLocaleString()}</p>
                {license.monthlyLimit > 0 && <div className="w-full h-2 bg-gray-200 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((license.currentMonthUsage / license.monthlyLimit) * 100, 100)}%` }} /></div>}
              </div>
              <div><p className="text-xs text-gray-500 uppercase">Monthly Rent</p><p className="text-lg font-bold text-green-700">${(license.plans?.find(p => p.planType === license.planType)?.monthlyRentUsd || 0).toFixed(0)}/mo</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Valid Until</p><p className="text-lg font-bold text-gray-900">{new Date(license.validTo).toLocaleDateString()}</p></div>
            </div>
          </Card>

          {/* Service Activation — Developer Only */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Service Activation</h3>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">DEVELOPER ONLY</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Only the developer (super_admin) can activate or deactivate services. Changes apply immediately to all clients.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { key: 'smsEnabled' as const, name: 'SMS', desc: 'Standard A2P messaging', icon: '📱' },
                { key: 'voiceotpEnabled' as const, name: 'Voice OTP', desc: 'Voice-based OTP delivery', icon: '🔊' },
                { key: 'rcsEnabled' as const, name: 'RCS', desc: 'Rich Communication Services', icon: '💬' },
                { key: 'ottEnabled' as const, name: 'OTT', desc: 'WhatsApp/Telegram/Signal', icon: '📲' },
              ]).map(svc => (
                <div key={svc.key} className={`p-4 rounded-xl border-2 transition-all ${license[svc.key] ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{svc.icon}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={license[svc.key]} onChange={e => {
                        const state = useStore.getState();
                        if (state.currentUser?.role !== 'super_admin') { alert('Only developer (super_admin) can change services'); return; }
                        state.updateLicense({ [svc.key]: e.target.checked });
                      }} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                  <p className="font-bold text-gray-900">{svc.name}</p>
                  <p className="text-xs text-gray-500">{svc.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Subscription Plans */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Subscription Plans</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">DEVELOPER MANAGED</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Volume Ceiling</th>
                  <th className="px-4 py-3">Monthly Rent</th>
                  <th className="px-4 py-3">System Variable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Activate</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(license.plans || []).map(plan => (
                    <tr key={plan.id} className={`hover:bg-gray-50 ${license.planType === plan.planType ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{plan.planName}</span>
                          {license.planType === plan.planType && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">CURRENT</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {plan.volumeLimit === -1 ? <span className="text-green-600 font-bold">No Cap Limit</span> : <span>{plan.volumeLimit.toLocaleString()} items</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">${plan.monthlyRentUsd.toFixed(2)} USD</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">max_quota = {plan.volumeLimit}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{plan.isActive ? 'Active' : 'Disabled'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {license.planType !== plan.planType ? (
                          <button onClick={() => {
                            const state = useStore.getState();
                            if (state.currentUser?.role !== 'super_admin') { alert('Only developer can change plans'); return; }
                            state.updateLicense({ planType: plan.planType, monthlyLimit: plan.volumeLimit, currentMonthUsage: 0 });
                          }} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-medium">
                            Activate
                          </button>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">✓ Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Usage Counters */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Usage Counters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'SMS', count: license.currentMonthUsage, color: 'blue' },
                { name: 'Voice OTP', count: 0, color: 'purple' },
                { name: 'RCS', count: 0, color: 'green' },
                { name: 'OTT', count: 0, color: 'orange' },
              ].map(ch => (
                <div key={ch.name} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">{ch.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{ch.count.toLocaleString()}</p>
                  {license.monthlyLimit > 0 && (
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                      <div className={`h-full bg-${ch.color}-500 rounded-full`} style={{ width: `${Math.min((ch.count / license.monthlyLimit) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              When total usage (SMS + Voice + RCS + OTT) reaches the volume ceiling, all outbound traffic is automatically <strong>SUSPENDED</strong> until the next billing cycle or plan upgrade.
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ KANNEL / SMPP TAB ═══════════ */}
      {activeTab === 'kannel' && (
        <div className="space-y-6">
          {/* Architecture Diagram */}
          <Card className="bg-gray-900 text-white border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-green-400" />SMS Flow Architecture</h3>
            <pre className="text-xs leading-relaxed font-mono text-green-300 overflow-x-auto whitespace-pre">{`
 ┌──────────────┐   :2775    ┌──────────────────────────────────────────────────┐
 │  CLIENT A    │───SMPP────▶│           SMPP Bridge (Python smpplib)           │
 │  (Transceiver│            │  Auth → TPS → Translation → Route Selection     │
 └──────────────┘            └────────────────────┬─────────────────────────────┘
                                                  │
 ┌──────────────┐   :13013   ┌────────────────────▼─────────────────────────────┐
 │  CLIENT B    │───HTTP────▶│            FastAPI (:8000)                        │
 │  (REST API)  │            │  /api/sms/send  →  Routing Engine  →  Billing    │
 └──────────────┘            └────────────────────┬─────────────────────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │     PostgreSQL (:5432)      │
                                    │  INSERT into send_sms table │
                                    └─────────────┬──────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │     SQLbox (:13005)         │
                                    │  Watches send_sms → push   │
                                    │  to Kannel Bearbox          │
                                    └─────────────┬──────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │   Kannel Bearbox (:13001)   │
                                    │  SMSC routing by smsc-id    │
                                    │  prefix matching / load bal │
                                    └─────────┬──────┬───────────┘
                                              │      │
                               ┌──────────────▼┐  ┌──▼──────────────┐
                               │  SMSC: AllSMS  │  │  SMSC: BDTel    │
                               │  5.78.72.23    │  │  api.bdtel.com  │
                               │  SMPP :2775    │  │  HTTP POST      │
                               └────────────────┘  └─────────────────┘
`}</pre>
          </Card>

          {/* Kannel Config */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-blue-600" />Kannel 1.4.5 Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Bearbox Admin Port</label><input type="number" defaultValue={13000} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Smsbox Port</label><input type="number" defaultValue={13013} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SQLbox Port</label><input type="number" defaultValue={13005} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Smsbox Username</label><input type="text" defaultValue="net2app" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Smsbox Password</label><input type="password" defaultValue="sms-password" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Enquire Link Interval (sec)</label><input type="number" defaultValue={30} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="mt-4"><Button>Save Kannel Config</Button></div>
          </Card>

          {/* SMPP Server */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Wifi className="w-5 h-5 text-green-600" />SMPP Server (Client-Facing)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Listen Port</label><input type="number" defaultValue={2775} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Connections</label><input type="number" defaultValue={1000} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (sec)</label><input type="number" defaultValue={60} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">System ID</label><input type="text" defaultValue="net2app" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /><span className="text-sm text-yellow-800 font-medium">SSL Note</span></div>
              <p className="text-sm text-yellow-700 mt-1">For internal testing, SSL validation is disabled. Do not set <code className="bg-yellow-100 px-1 rounded">ssl-client-certkey-file</code> in kannel.conf. In frontend code, use <code className="bg-yellow-100 px-1 rounded">rejectUnauthorized: false</code>.</p>
            </div>
          </Card>

          {/* Port Table */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-purple-600" />Service Port Map</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {PORT_MAP.map(p => (
                    <tr key={p.port} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.service}</td>
                      <td className="px-4 py-3 font-mono text-blue-600">{p.port}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status === 'running' ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ DATABASE TAB ═══════════ */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-blue-600" />PostgreSQL Database Tables</h3>
            <p className="text-sm text-gray-500 mb-4">All tables used by Kannel SQLbox, FastAPI backend, and the billing engine.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key Columns</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { t: 'send_sms', p: 'SQLbox outgoing queue — Frontend INSERTs, SQLbox reads & pushes to Kannel', c: 'momt, sender, receiver, msgdata, smsc_id, dlr_url' },
                    { t: 'sent_sms', p: 'Kannel writes after sending — delivery receipt correlation', c: 'id, momt, sender, receiver, msgdata, smsc_id, sms_type, ts' },
                    { t: 'dlr', p: 'DLR storage — Kannel writes status callbacks here', c: 'smsc, ts, src, dst, service, url, mask, status, boxc' },
                    { t: 'users', p: 'Platform users (admin/support/billing/agent/client/supplier)', c: 'id, username, email, password_hash, role, entity_id' },
                    { t: 'clients', p: 'Client accounts with SMPP creds, billing settings', c: 'id, client_code, smpp_username, balance, credit_limit, billing_mode' },
                    { t: 'suppliers', p: 'Supplier connections (SMPP/HTTP/WhatsApp/Telegram)', c: 'id, supplier_code, connection_type, smpp_host, api_send_url' },
                    { t: 'trunks', p: 'Trunk groups (SIM/VoiceOTP/Marketing/Direct)', c: 'id, name, trunk_type, is_active' },
                    { t: 'trunk_suppliers', p: 'Supplier → Trunk assignment with priority/weight', c: 'trunk_id, supplier_id, priority, weight' },
                    { t: 'routes', p: 'Routing rules (Priority/LCR/Performance/RoundRobin)', c: 'id, name, routing_type' },
                    { t: 'route_trunks', p: 'Trunk → Route assignment', c: 'route_id, trunk_id, priority' },
                    { t: 'client_routes', p: 'Client-specific route assignments by MCC/MNC', c: 'client_id, route_id, mcc, mnc, prefix' },
                    { t: 'mcc_mnc_data', p: 'Global MCC/MNC operator database', c: 'mcc, mnc, country_name, operator_name, number_prefix' },
                    { t: 'client_rates', p: 'Per-destination rates for clients', c: 'client_id, mcc, mnc, rate, currency' },
                    { t: 'supplier_rates', p: 'Per-destination rates for suppliers', c: 'supplier_id, mcc, mnc, rate' },
                    { t: 'sms_logs', p: 'Complete CDR — partitioned, auto-purge 4 months', c: 'message_id, client_id, supplier_id, status, client_rate, profit' },
                    { t: 'payments', p: 'Payment records — NEVER deleted', c: 'payment_number, entity_id, amount, payment_type' },
                    { t: 'invoices', p: 'Invoice generation and tracking', c: 'invoice_number, client_id, total_amount, status' },
                    { t: 'campaigns', p: 'Bulk SMS campaign management', c: 'client_id, name, total_volume, status' },
                    { t: 'notifications', p: 'Dashboard/email alert history', c: 'user_id, type, title, message, is_read' },
                    { t: 'email_templates', p: 'Editable notification email templates', c: 'name, subject, body, variables' },
                    { t: 'client_translations', p: 'Content/Number/SID/OTP translations per client', c: 'client_id, priority, type, match_pattern, replace_pattern' },
                    { t: 'supplier_translations', p: 'Content/Number translations per supplier', c: 'supplier_id, priority, type, match_pattern' },
                    { t: 'platform_license', p: 'License and plan management', c: 'license_key, plan_type, monthly_limit' },
                    { t: 'audit_logs', p: 'Full audit trail of all actions', c: 'user_id, action, entity_type, old_data, new_data' },
                  ].map(r => (
                    <tr key={r.t} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-blue-700 font-medium">{r.t}</td>
                      <td className="px-4 py-2 text-gray-700">{r.p}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{r.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">SQLbox send_sms Table (Kannel Queue)</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre">{`CREATE TABLE send_sms (
  sql_id     BIGSERIAL PRIMARY KEY,
  momt       VARCHAR(3) DEFAULT 'MO',       -- MO=Mobile Orig, MT=Mobile Term
  sender     VARCHAR(20),                    -- Source address / SenderID
  receiver   VARCHAR(20) NOT NULL,           -- Destination number (E.164)
  msgdata    TEXT NOT NULL,                  -- Message content
  sms_type   INT DEFAULT 2,                 -- 1=MO, 2=MT
  smsc_id    VARCHAR(255),                   -- Target SMSC for routing
  dlr_url    TEXT,                           -- DLR callback URL
  account    VARCHAR(64),                    -- Client identifier
  coding     INT DEFAULT 0,                 -- 0=GSM7, 1=Binary, 2=UCS2
  validity   INT DEFAULT 1440,              -- Validity period in minutes
  deferred   INT DEFAULT 0,                 -- Deferred delivery (seconds)
  meta_data  TEXT                            -- Custom metadata
);

-- SQLbox watches this table and pushes to Kannel Bearbox automatically
-- Frontend/Backend INSERTs here for the "Database Injection" method`}</div>
          </Card>
        </div>
      )}

      {/* ═══════════ API ENDPOINTS TAB ═══════════ */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2"><Globe className="w-5 h-5" />Frontend → Backend Connectivity</h3>
            <p className="text-blue-800 text-sm">The React frontend connects to the FastAPI backend on port <code className="bg-blue-100 px-1 rounded font-mono">8000</code>. All API calls use JWT Bearer authentication. The Nginx reverse proxy maps <code className="bg-blue-100 px-1 rounded font-mono">/api/*</code> to the backend.</p>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Three SMS Sending Methods</h3>
            <div className="space-y-4">
              {[
                { method: 'A) HTTP API via FastAPI', endpoint: 'POST http://server:8000/api/sms/send', body: '{ "source": "BRAND", "destination": "+1234567890", "message": "Hello" }', header: 'Authorization: Bearer <token>\nOR X-API-Key: <client_api_key>', desc: 'Recommended for real-time. FastAPI routes, bills, then INSERTs into send_sms.' },
                { method: 'B) Direct Kannel HTTP', endpoint: 'GET http://server:13013/cgi-bin/sendsms', body: '?username=net2app&password=sms-password&to=+1234567890&text=Hello&smsc=supplier1', header: 'None (Basic query params)', desc: 'Bypasses billing. Use for internal/admin testing only.' },
                { method: 'C) Database Injection (SQLbox)', endpoint: 'POST http://server:8000/api/sms/inject', body: '{ "receiver": "+1234567890", "msgdata": "Hello", "smsc_id": "supplier1" }', header: 'Authorization: Bearer <token>', desc: 'FastAPI INSERTs into send_sms table. SQLbox pushes to Kannel bearbox → SMSC.' },
              ].map(m => (
                <div key={m.method} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{m.method}</h4>
                    <button onClick={() => copyText(m.endpoint, m.method)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <Copy className="w-3 h-3" />{copied === m.method ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs mb-2 overflow-x-auto">
                    <div className="text-yellow-300">{m.endpoint}</div>
                    <div className="text-gray-500 mt-1">Headers: {m.header}</div>
                    <div className="text-cyan-300 mt-1">Body: {m.body}</div>
                  </div>
                  <p className="text-sm text-gray-600">{m.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All API Endpoints (FastAPI :8000)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Endpoint</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['POST', '/api/auth/login', 'Authenticate and get JWT token'],
                    ['GET', '/api/clients', 'List clients (paginated, filterable)'],
                    ['POST', '/api/clients', 'Create new client'],
                    ['PUT', '/api/clients/:id', 'Update existing client'],
                    ['DELETE', '/api/clients/:id', 'Delete client (soft)'],
                    ['POST', '/api/clients/:id/topup', 'Add funds to client balance'],
                    ['GET', '/api/clients/:id/bind-status', 'Real-time SMPP status'],
                    ['GET', '/api/suppliers', 'List all suppliers'],
                    ['POST', '/api/suppliers', 'Create SMPP/HTTP/WhatsApp/Telegram supplier'],
                    ['GET', '/api/trunks', 'List trunk groups'],
                    ['POST', '/api/trunks', 'Create trunk with supplier priority'],
                    ['GET', '/api/routes', 'List routing rules'],
                    ['POST', '/api/routes', 'Create route (LCR/Priority/Performance)'],
                    ['POST', '/api/rates', 'Add client/supplier rate by MCC/MNC'],
                    ['POST', '/api/rates/bulk', 'Bulk upload rates from CSV'],
                    ['GET', '/api/rates/mccmnc', 'Browse MCC/MNC database'],
                    ['POST', '/api/sms/send', 'Send SMS via routing engine (Method A)'],
                    ['POST', '/api/sms/inject', 'Insert into send_sms for SQLbox (Method C)'],
                    ['GET', '/api/sms/logs', 'Query SMS CDR logs'],
                    ['GET', '/api/sms/dlr', 'DLR callback from Kannel/supplier'],
                    ['GET', '/api/billing/invoices', 'List invoices'],
                    ['POST', '/api/billing/invoices/:id/mark-paid', 'Admin/billing marks invoice paid'],
                    ['GET', '/api/billing/payments', 'List payment history'],
                    ['GET', '/api/reports/realtime', 'Live dashboard stats'],
                    ['GET', '/api/reports/daily', 'Daily traffic & revenue report'],
                    ['GET', '/api/campaigns', 'List campaigns'],
                    ['POST', '/api/campaigns', 'Create campaign with number upload'],
                    ['GET', '/api/notifications', 'List alerts/notifications'],
                    ['GET', '/api/system/settings', 'Platform configuration'],
                    ['GET', '/health', 'Health check (DB + Redis + Kannel)'],
                  ].map(([m, e, d], i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${m === 'GET' ? 'bg-green-100 text-green-700' : m === 'POST' ? 'bg-blue-100 text-blue-700' : m === 'PUT' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{m}</span></td>
                      <td className="px-3 py-2 font-mono text-sm text-gray-800">{e}</td>
                      <td className="px-3 py-2 text-gray-600">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ BACKUP TAB ═══════════ */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Backup & Restore</h3>
            <div className="flex items-center gap-4">
              <Button><Download className="w-4 h-4" />Create Backup</Button>
              <Button variant="secondary"><Upload className="w-4 h-4" />Restore</Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">CDR data older than 4 months is auto-purged. Payment records are NEVER deleted.</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention Policy</h3>
            <div className="space-y-3">
              {[
                ['SMS Logs (CDR)', '4 months', 'Auto-purge via PostgreSQL partition drop'],
                ['Payment Records', 'Forever', 'Never deleted — regulatory compliance'],
                ['Invoices', 'Forever', 'Never deleted'],
                ['Audit Logs', '12 months', 'Compressed and archived'],
              ].map(([name, retention, note]) => (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div><p className="font-medium text-gray-900">{name}</p><p className="text-xs text-gray-500">{note}</p></div>
                  <span className="font-mono text-sm text-gray-600">{retention}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════ PLATFORM SETTINGS TAB ═══════════ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* SMTP Configuration */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" /> SMTP Email Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host *</label>
                <input type="text" defaultValue={license.smtpHost || ''} placeholder="smtp.gmail.com"
                  onChange={e => useStore.getState().updateLicense({ smtpHost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port *</label>
                <input type="number" defaultValue={license.smtpPort || 587} placeholder="587"
                  onChange={e => useStore.getState().updateLicense({ smtpPort: parseInt(e.target.value) || 587 })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username *</label>
                <input type="text" defaultValue={license.smtpUser || ''} placeholder="your@gmail.com"
                  onChange={e => useStore.getState().updateLicense({ smtpUser: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password *</label>
                <input type="password" defaultValue={license.smtpPassword || ''} placeholder="App password"
                  onChange={e => useStore.getState().updateLicense({ smtpPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">From Email *</label>
                <input type="email" defaultValue={license.smtpFrom || ''} placeholder="noreply@yourdomain.com"
                  onChange={e => useStore.getState().updateLicense({ smtpFrom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input type="text" defaultValue={license.smtpFromName || ''} placeholder="net2app SMS"
                  onChange={e => useStore.getState().updateLicense({ smtpFromName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked={license.smtpSecure !== false}
                  onChange={e => useStore.getState().updateLicense({ smtpSecure: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Use TLS/SSL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked={license.smtpEnabled || false}
                  onChange={e => useStore.getState().updateLicense({ smtpEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Enable Email Sending</span>
              </label>
              <Button variant="secondary" size="sm" onClick={() => alert('Test email would be sent to SMTP server')}>
                Send Test Email
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label><input type="text" defaultValue={license.platformName} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input type="text" defaultValue={license.companyName} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="BDT">BDT</option><option value="INR">INR</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>UTC</option><option>Asia/Dhaka</option><option>Asia/Dubai</option><option>US/Eastern</option><option>Europe/London</option>
                </select>
              </div>
            </div>
            <div className="mt-4"><Button>Save Settings</Button></div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-purple-600" />Installed Packages</h3>
            <p className="text-sm text-gray-500 mb-3">Required packages installed by the deployment script:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                'build-essential', 'bison', 'flex', 'libtool',
                'libxml2-dev', 'libssl-dev', 'openssl', 'libpq-dev',
                'python3.11', 'python3-pip', 'python3-venv', 'python3-dev',
                'postgresql-15', 'redis-server', 'rabbitmq-server', 'nginx',
                'kannel (1.4.5)', 'supervisor', 'certbot', 'ufw',
                'nodejs (20.x)', 'libpango-1.0', 'libcairo2', 'htop',
                'smpplib', 'fastapi', 'uvicorn', 'sqlalchemy',
                'asyncpg', 'celery', 'httpx', 'phonenumbers',
              ].map(pkg => (
                <div key={pkg} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                  <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-gray-700 text-xs">{pkg}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
