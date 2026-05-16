import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';
import type { BillingType, BillingMode, ConnectionMode, BindType } from '../../types';

export function AddClient() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addClient, updateClient, getClient } = useStore();

  const [formData, setFormData] = useState({
    clientCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    billingType: 'prepaid' as BillingType,
    billingMode: 'submit' as BillingMode,
    currency: 'USD',
    connectionMode: 'server' as ConnectionMode,
    smppUsername: '',
    smppPassword: '',
    smppIp: '',
    smppPort: 2775,
    smppSystemType: '',
    smppTps: 100,
    smppBindType: 'transceiver' as BindType,
    apiEnabled: false,
    forceDlr: false,
    forceDlrTimeout: 60,
    maxTps: 100,
    creditLimit: 0,
    balance: 0,
    ipWhitelist: ''
  });

  const [activeTab, setActiveTab] = useState<'company' | 'smpp' | 'billing' | 'settings'>('company');

  useEffect(() => {
    if (id) {
      // Try store first, then API
      const client = getClient(id);
      if (client) {
        setFormData({
          clientCode: client.clientCode,
          companyName: client.companyName,
          contactPerson: client.contactPerson,
          email: client.email,
          phone: client.phone,
          address: client.address,
          country: client.country,
          billingType: client.billingType,
          billingMode: client.billingMode,
          currency: client.currency,
          connectionMode: client.connectionMode,
          smppUsername: client.smppUsername,
          smppPassword: client.smppPassword,
          smppIp: client.smppIp,
          smppPort: client.smppPort,
          smppSystemType: client.smppSystemType,
          smppTps: client.smppTps,
          smppBindType: client.smppBindType,
          apiEnabled: client.apiEnabled,
          forceDlr: client.forceDlr,
          forceDlrTimeout: client.forceDlrTimeout,
          maxTps: client.maxTps,
          creditLimit: client.creditLimit,
          balance: client.balance,
          ipWhitelist: (client.ipWhitelist || []).join ? (client.ipWhitelist || []).join(', ') : ''
        });
      } else {
        // Fetch from API directly
        fetch(`/api/clients/${id}`).then(r => r.json()).then(c => {
          if (c && c.id) {
            setFormData({
              clientCode: c.clientCode || '',
              companyName: c.companyName || '',
              contactPerson: c.contactPerson || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              country: c.country || '',
              billingType: c.billingType || 'prepaid',
              billingMode: c.billingMode || 'submit',
              currency: c.currency || 'USD',
              connectionMode: c.connectionMode || 'server',
              smppUsername: c.smppUsername || '',
              smppPassword: c.smppPassword || '',
              smppIp: c.smppIp || '',
              smppPort: c.smppPort || 2775,
              smppSystemType: c.smppSystemType || '',
              smppTps: c.smppTps || 100,
              smppBindType: c.smppBindType || 'transceiver',
              apiEnabled: c.apiEnabled || false,
              forceDlr: c.forceDlr || false,
              forceDlrTimeout: c.forceDlrTimeout || 60,
              maxTps: c.maxTps || 100,
              creditLimit: c.creditLimit || 0,
              balance: c.balance || 0,
              ipWhitelist: (c.ipWhitelist || []).join ? (c.ipWhitelist || []).join(', ') : ''
            });
          }
        });
      }
    }
  }, [id, getClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const clientData = {
      ...formData,
      ipWhitelist: formData.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean)
    };

    if (id) {
      updateClient(id, clientData);
    } else {
      addClient({
        ...clientData,
        smppStatus: 'unbound',
        isActive: true
      });
    }

    navigate('/clients');
  };

  const tabs = [
    { id: 'company', label: 'Company Info' },
    { id: 'smpp', label: 'SMPP Settings' },
    { id: 'billing', label: 'Billing' },
    { id: 'settings', label: 'Advanced Settings' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Client' : 'Add New Client'}</h1>
          <p className="text-gray-500">{id ? 'Update client configuration' : 'Create a new SMS client account'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientCode}
                  onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                  placeholder="e.g., CL_CompanyName_US"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company legal name"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Primary contact name"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        )}

        {/* SMPP Settings Tab */}
        {activeTab === 'smpp' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Mode
                </label>
                <select
                  value={formData.connectionMode}
                  onChange={(e) => setFormData({ ...formData, connectionMode: e.target.value as ConnectionMode })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="server">Server (Client connects to us)</option>
                  <option value="client">Client (We connect to client)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bind Type
                </label>
                <select
                  value={formData.smppBindType}
                  onChange={(e) => setFormData({ ...formData, smppBindType: e.target.value as BindType })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="transceiver">Transceiver</option>
                  <option value="transmitter">Transmitter</option>
                  <option value="receiver">Receiver</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMPP Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.smppUsername}
                  onChange={(e) => setFormData({ ...formData, smppUsername: e.target.value })}
                  placeholder="SMPP username"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMPP Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.smppPassword}
                  onChange={(e) => setFormData({ ...formData, smppPassword: e.target.value })}
                  placeholder="SMPP password"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMPP IP
                </label>
                <input
                  type="text"
                  value={formData.smppIp}
                  onChange={(e) => setFormData({ ...formData, smppIp: e.target.value })}
                  placeholder="IP address for client mode"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMPP Port
                </label>
                <input
                  type="number"
                  value={formData.smppPort}
                  onChange={(e) => setFormData({ ...formData, smppPort: parseInt(e.target.value) })}
                  placeholder="2775"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Type
                </label>
                <input
                  type="text"
                  value={formData.smppSystemType}
                  onChange={(e) => setFormData({ ...formData, smppSystemType: e.target.value })}
                  placeholder="e.g., OTP, BULK, PROMO"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TPS (Transactions Per Second)
                </label>
                <input
                  type="number"
                  value={formData.smppTps}
                  onChange={(e) => setFormData({ ...formData, smppTps: parseInt(e.target.value) })}
                  placeholder="100"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Whitelist
                </label>
                <input
                  type="text"
                  value={formData.ipWhitelist}
                  onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
                  placeholder="Comma-separated IPs: 192.168.1.1, 10.0.0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to allow all IPs</p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.apiEnabled}
                    onChange={(e) => setFormData({ ...formData, apiEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable HTTP API Access</span>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Type
                </label>
                <select
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as BillingType })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prepaid">Prepaid</option>
                  <option value="postpaid">Postpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Mode
                </label>
                <select
                  value={formData.billingMode}
                  onChange={(e) => setFormData({ ...formData, billingMode: e.target.value as BillingMode })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="send">On Send</option>
                  <option value="submit">On Submit</option>
                  <option value="dlr">On DLR</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  When to charge the client
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="BDT">BDT - Bangladeshi Taka</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For postpaid clients, how much credit to extend
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Advanced Settings Tab */}
        {activeTab === 'settings' && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max TPS
                </label>
                <input
                  type="number"
                  value={formData.maxTps}
                  onChange={(e) => setFormData({ ...formData, maxTps: parseInt(e.target.value) })}
                  placeholder="100"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Force DLR Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={formData.forceDlrTimeout}
                  onChange={(e) => setFormData({ ...formData, forceDlrTimeout: parseInt(e.target.value) })}
                  placeholder="60"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.forceDlr}
                    onChange={(e) => setFormData({ ...formData, forceDlr: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Force DLR (Generate fake DLR if not received)</span>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4" />
            Save Client
          </Button>
        </div>
      </form>
    </div>
  );
}
