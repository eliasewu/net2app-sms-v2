import { useState } from 'react';
import { Plus, Search, Globe, Edit, Trash2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';
import type { ApiRegion } from '../../types';

const regionLabels: Record<ApiRegion, string> = {
  global: 'Global',
  bangladesh: 'Bangladesh',
  india: 'India',
  middle_east: 'Middle East',
  custom: 'Custom'
};

const regionColors: Record<ApiRegion, string> = {
  global: 'bg-blue-100 text-blue-800',
  bangladesh: 'bg-green-100 text-green-800',
  india: 'bg-orange-100 text-orange-800',
  middle_east: 'bg-purple-100 text-purple-800',
  custom: 'bg-gray-100 text-gray-800'
};

export function ApiConnectorsPage() {
  const { apiTemplates, addApiTemplate, deleteApiTemplate } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<ApiRegion | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    region: 'global' as ApiRegion,
    providerName: '',
    sendUrlTemplate: '',
    dlrUrlTemplate: '',
    authType: 'api_key' as 'api_key' | 'basic' | 'bearer' | 'custom',
    submitResponsePattern: '',
    dlrResponsePattern: ''
  });

  const filteredTemplates = apiTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = filterRegion === 'all' || t.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  const groupedTemplates = filteredTemplates.reduce((acc, t) => {
    if (!acc[t.region]) acc[t.region] = [];
    acc[t.region].push(t);
    return acc;
  }, {} as Record<ApiRegion, typeof apiTemplates>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addApiTemplate({
      ...formData,
      paramsMapping: {},
      isActive: true
    });
    setShowAddModal(false);
    setFormData({
      name: '',
      region: 'global',
      providerName: '',
      sendUrlTemplate: '',
      dlrUrlTemplate: '',
      authType: 'api_key',
      submitResponsePattern: '',
      dlrResponsePattern: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Connectors</h1>
          <p className="text-gray-500">HTTP API provider templates</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Connector
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.keys(regionLabels) as ApiRegion[]).map((region) => (
          <Card key={region}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${regionColors[region]}`}>
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {apiTemplates.filter(t => t.region === region).length}
                </p>
                <p className="text-xs text-gray-500">{regionLabels[region]}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search API connectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value as typeof filterRegion)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            {(Object.keys(regionLabels) as ApiRegion[]).map((region) => (
              <option key={region} value={region}>{regionLabels[region]}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* API Connectors by Region */}
      {(Object.keys(groupedTemplates) as ApiRegion[]).map((region) => (
        <Card key={region}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-sm ${regionColors[region]}`}>
              {regionLabels[region]}
            </span>
            <span className="text-gray-400 text-sm font-normal">
              ({groupedTemplates[region].length} connectors)
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedTemplates[region].map((template) => (
              <div
                key={template.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.providerName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteApiTemplate(template.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500">
                    Auth: <span className="text-gray-700">{template.authType}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    URL: <span className="font-mono text-gray-700">{template.sendUrlTemplate}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add API Connector"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Twilio"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value as ApiRegion })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(regionLabels) as ApiRegion[]).map((region) => (
                  <option key={region} value={region}>{regionLabels[region]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
              <input
                type="text"
                required
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type *</label>
              <select
                value={formData.authType}
                onChange={(e) => setFormData({ ...formData, authType: e.target.value as typeof formData.authType })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="api_key">API Key</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send URL Template *</label>
            <input
              type="text"
              required
              value={formData.sendUrlTemplate}
              onChange={(e) => setFormData({ ...formData, sendUrlTemplate: e.target.value })}
              placeholder="https://api.provider.com/sms/send"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DLR URL Template</label>
            <input
              type="text"
              value={formData.dlrUrlTemplate}
              onChange={(e) => setFormData({ ...formData, dlrUrlTemplate: e.target.value })}
              placeholder="https://api.provider.com/sms/status"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Add Connector</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
