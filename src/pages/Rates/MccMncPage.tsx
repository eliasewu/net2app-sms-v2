import { useState } from 'react';
import { Search, Plus, Globe, Upload, Download } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';

export function MccMncPage() {
  const { mccMnc, addMccMnc } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    countryName: '',
    countryCode: '',
    mcc: '',
    mnc: '',
    operatorName: '',
    networkType: 'LTE'
  });

  const countries = [...new Set(mccMnc.map(m => m.countryName))].sort();

  const filteredData = mccMnc.filter((item) => {
    const matchesSearch =
      item.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mcc.includes(searchQuery) ||
      item.mnc.includes(searchQuery);
    const matchesCountry = !filterCountry || item.countryName === filterCountry;
    return matchesSearch && matchesCountry;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMccMnc({
      ...formData,
      isActive: true
    });
    setShowAddModal(false);
    setFormData({
      countryName: '',
      countryCode: '',
      mcc: '',
      mnc: '',
      operatorName: '',
      networkType: 'LTE'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCC/MNC Database</h1>
          <p className="text-gray-500">Mobile Country Code and Network Code reference</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Bulk Upload (CSV)
            <input type="file" className="hidden" accept=".csv" onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                 alert("File selected: " + e.target.files[0].name + ". CSV parsing logic would run here.");
              }
            }} />
          </label>
          <Button variant="secondary" onClick={() => {
            alert("Exporting MCC/MNC Database as CSV...");
          }}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mccMnc.length}</p>
              <p className="text-sm text-gray-500">Total Entries</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{countries.length}</p>
              <p className="text-sm text-gray-500">Countries</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by country, operator, MCC, or MNC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Countries</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MCC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MNC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{item.countryName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.countryCode}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.mcc}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.mnc}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.operatorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.networkType}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add MCC/MNC Entry"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Name *</label>
              <input
                type="text"
                required
                value={formData.countryName}
                onChange={(e) => setFormData({ ...formData, countryName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country Code *</label>
              <input
                type="text"
                required
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MCC *</label>
              <input
                type="text"
                required
                value={formData.mcc}
                onChange={(e) => setFormData({ ...formData, mcc: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MNC *</label>
              <input
                type="text"
                required
                value={formData.mnc}
                onChange={(e) => setFormData({ ...formData, mnc: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operator Name *</label>
            <input
              type="text"
              required
              value={formData.operatorName}
              onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Network Type</label>
            <select
              value={formData.networkType}
              onChange={(e) => setFormData({ ...formData, networkType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LTE">LTE</option>
              <option value="3G">3G</option>
              <option value="2G">2G</option>
              <option value="5G">5G</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
