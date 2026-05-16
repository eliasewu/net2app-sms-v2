import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';
import type { ConnectionType, BindType, ApiRegion } from '../../types';

export function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addSupplier, updateSupplier, getSupplier } = useStore();

  const [formData, setFormData] = useState({
    supplierCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    connectionType: 'smpp' as ConnectionType,
    connectionMode: 'client' as 'server' | 'client',
    smppHost: '',
    smppPort: 2775,
    smppUsername: '',
    smppPassword: '',
    smppSystemType: '',
    smppBindType: 'transceiver' as BindType,
    smppTps: 100,
    apiSendUrl: '',
    apiDlrUrl: '',
    apiKey: '',
    apiMethod: 'POST' as 'GET' | 'POST',
    apiProviderRegion: 'global' as ApiRegion,
    // RCS
    rcsAgentId: '',
    rcsBrandId: '',
    rcsApiUrl: '',
    rcsApiKey: '',
    rcsWebhookUrl: '',
    // Flash SMS
    flashDataCoding: 16,
    flashValidityPeriod: 300,
    balance: 0,
    currency: 'USD'
  });

  const [activeTab, setActiveTab] = useState<'company' | 'connection' | 'billing'>('company');

  useEffect(() => {
    if (id) {
      const supplier = getSupplier(id);
      if (supplier) {
        setFormData({
          supplierCode: supplier.supplierCode,
          companyName: supplier.companyName,
          contactPerson: supplier.contactPerson,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          country: supplier.country,
          connectionType: supplier.connectionType,
          connectionMode: supplier.connectionMode,
          smppHost: supplier.smppHost,
          smppPort: supplier.smppPort,
          smppUsername: supplier.smppUsername,
          smppPassword: supplier.smppPassword,
          smppSystemType: supplier.smppSystemType,
          smppBindType: supplier.smppBindType,
          smppTps: supplier.smppTps,
          apiSendUrl: supplier.apiSendUrl || '',
          apiDlrUrl: supplier.apiDlrUrl || '',
          apiKey: supplier.apiKey || '',
          apiMethod: supplier.apiMethod || 'POST',
          apiProviderRegion: supplier.apiProviderRegion || 'global',
          rcsAgentId: supplier.rcsAgentId || '',
          rcsBrandId: supplier.rcsBrandId || '',
          rcsApiUrl: supplier.rcsApiUrl || '',
          rcsApiKey: supplier.rcsApiKey || '',
          rcsWebhookUrl: supplier.rcsWebhookUrl || '',
          flashDataCoding: supplier.flashDataCoding || 16,
          flashValidityPeriod: supplier.flashValidityPeriod || 300,
          balance: supplier.balance,
          currency: supplier.currency
        });
      }
    }
  }, [id, getSupplier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      updateSupplier(id, formData);
    } else {
      addSupplier({
        ...formData,
        smppStatus: 'unbound',
        isActive: true
      });
    }
    navigate('/suppliers');
  };

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'connection', label: 'Connection Settings' },
    { id: 'billing', label: 'Billing' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/suppliers')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Supplier' : 'Add New Supplier'}</h1>
          <p className="text-gray-500">{id ? 'Update supplier configuration' : 'Create a new SMS supplier account'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'company' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code *</label>
                <input type="text" required value={formData.supplierCode} onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input type="text" required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'connection' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Type *</label>
                <select value={formData.connectionType} onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="smpp">SMPP</option>
                  <option value="http_api">HTTP API</option>
                  <option value="rcs">RCS (Rich Communication Services)</option>
                  <option value="flash_sms">Flash SMS via API</option>
                  <option value="ott_device">OTT Device Pairing</option>
                  <option value="whatsapp">WhatsApp API</option>
                  <option value="telegram">Telegram API</option>
                  <option value="custom_http">Custom HTTP</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              {formData.connectionType === 'smpp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host *</label>
                    <input type="text" value={formData.smppHost} onChange={(e) => setFormData({ ...formData, smppHost: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port *</label>
                    <input type="number" value={formData.smppPort} onChange={(e) => setFormData({ ...formData, smppPort: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input type="text" value={formData.smppUsername} onChange={(e) => setFormData({ ...formData, smppUsername: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input type="password" value={formData.smppPassword} onChange={(e) => setFormData({ ...formData, smppPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
                    <input type="text" value={formData.smppSystemType} onChange={(e) => setFormData({ ...formData, smppSystemType: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bind Type</label>
                    <select value={formData.smppBindType} onChange={(e) => setFormData({ ...formData, smppBindType: e.target.value as BindType })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="transceiver">Transceiver</option>
                      <option value="transmitter">Transmitter</option>
                      <option value="receiver">Receiver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TPS</label>
                    <input type="number" value={formData.smppTps} onChange={(e) => setFormData({ ...formData, smppTps: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              {['http_api', 'whatsapp', 'telegram', 'custom_http'].includes(formData.connectionType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send URL *</label>
                    <input type="text" value={formData.apiSendUrl} onChange={(e) => setFormData({ ...formData, apiSendUrl: e.target.value })} placeholder="https://api.example.com/send" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">DLR URL</label>
                    <input type="text" value={formData.apiDlrUrl} onChange={(e) => setFormData({ ...formData, apiDlrUrl: e.target.value })} placeholder="https://api.example.com/status" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key / Token</label>
                    <input type="text" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select value={formData.apiMethod} onChange={(e) => setFormData({ ...formData, apiMethod: e.target.value as 'GET' | 'POST' })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select value={formData.apiProviderRegion} onChange={(e) => setFormData({ ...formData, apiProviderRegion: e.target.value as ApiRegion })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="global">Global</option>
                      <option value="bangladesh">Bangladesh</option>
                      <option value="india">India</option>
                      <option value="middle_east">Middle East</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ── RCS (Rich Communication Services) ── */}
              {formData.connectionType === 'rcs' && (
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-1">RCS — Rich Communication Services</h4>
                    <p className="text-sm text-blue-700">Configure your RCS Business Messaging agent. Supports rich cards, carousels, suggested actions, images and interactive messages.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RCS Agent ID *</label>
                      <input type="text" value={formData.rcsAgentId} onChange={(e) => setFormData({ ...formData, rcsAgentId: e.target.value })} placeholder="your-agent-id" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">Assigned by Google / RCS provider</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Brand ID</label>
                      <input type="text" value={formData.rcsBrandId} onChange={(e) => setFormData({ ...formData, rcsBrandId: e.target.value })} placeholder="brand-identifier" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">RCS API URL *</label>
                      <input type="text" value={formData.rcsApiUrl} onChange={(e) => setFormData({ ...formData, rcsApiUrl: e.target.value })} placeholder="https://rcs-provider.com/api/v1/messages" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RCS API Key *</label>
                      <input type="text" value={formData.rcsApiKey} onChange={(e) => setFormData({ ...formData, rcsApiKey: e.target.value })} placeholder="rcs-api-key-here" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">API key will be filled later during integration</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL (DLR)</label>
                      <input type="text" value={formData.rcsWebhookUrl} onChange={(e) => setFormData({ ...formData, rcsWebhookUrl: e.target.value })} placeholder="https://your-server.com/api/rcs/webhook" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Flash SMS ── */}
              {formData.connectionType === 'flash_sms' && (
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-1">Flash SMS via API</h4>
                    <p className="text-sm text-yellow-700">Flash messages appear directly on the phone screen without being stored in the inbox. Sent via HTTP API with special data_coding (0x10) and protocol_id flags.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Flash SMS API URL *</label>
                      <input type="text" value={formData.apiSendUrl} onChange={(e) => setFormData({ ...formData, apiSendUrl: e.target.value })} placeholder="https://api.provider.com/flash/send" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Key *</label>
                      <input type="text" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} placeholder="flash-api-key" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                      <select value={formData.apiMethod} onChange={(e) => setFormData({ ...formData, apiMethod: e.target.value as 'GET' | 'POST' })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Coding (hex)</label>
                      <input type="number" value={formData.flashDataCoding} onChange={(e) => setFormData({ ...formData, flashDataCoding: parseInt(e.target.value) || 16 })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">Default: 16 (0x10) for Flash SMS. SMPP data_coding value.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Validity Period (seconds)</label>
                      <input type="number" value={formData.flashValidityPeriod} onChange={(e) => setFormData({ ...formData, flashValidityPeriod: parseInt(e.target.value) || 300 })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">How long the flash message is valid before expiry</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">DLR Check URL</label>
                      <input type="text" value={formData.apiDlrUrl} onChange={(e) => setFormData({ ...formData, apiDlrUrl: e.target.value })} placeholder="https://api.provider.com/flash/status" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'billing' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                <input type="number" step="0.01" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="secondary" onClick={() => navigate('/suppliers')}>Cancel</Button>
          <Button type="submit"><Save className="w-4 h-4" /> Save Supplier</Button>
        </div>
      </form>
    </div>
  );
}
