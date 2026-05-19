import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Edit,
  Trash2,
  Globe
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';
import type { Rate } from '../../types';

export function RatesList() {
  const { rates, clients, suppliers, mccMnc, addRate, updateRate, deleteRate } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'client' | 'supplier'>('all');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);

  const [formData, setFormData] = useState({
    entityType: 'client' as 'client' | 'supplier',
    entityId: '',
    mcc: '',
    mnc: '',
    rate: 0
  });
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedOperators, setSelectedOperators] = useState<{mcc: string, mnc: string}[]>([]);

  const filteredRates = rates.filter((rate) => {
    const matchesSearch =
      rate.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rate.mcc.includes(searchQuery) ||
      rate.mnc.includes(searchQuery);
    const matchesFilter =
      filterEntity === 'all' ||
      rate.entityType === filterEntity;
    const matchesEntity =
      !selectedEntityId ||
      rate.entityId === selectedEntityId;
    return matchesSearch && matchesFilter && matchesEntity;
  });

  // Group rates by country
  const groupedRates = filteredRates.reduce((acc, rate) => {
    if (!acc[rate.countryName]) {
      acc[rate.countryName] = [];
    }
    acc[rate.countryName].push(rate);
    return acc;
  }, {} as Record<string, Rate[]>);

  const getEntityName = (rate: Rate) => {
    if (rate.entityType === 'client') {
      return clients.find(c => c.id === rate.entityId || c.clientCode === rate.entityId)?.clientCode || rate.entityId || 'Unknown';
    }
    return suppliers.find(s => s.id === rate.entityId || s.supplierCode === rate.entityId)?.supplierCode || rate.entityId || 'Unknown';
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRate) {
      updateRate(editingRate.id, {
        rate: formData.rate
      });
    } else {
      // Adding multiple operators
      if (selectedOperators.length > 0) {
        selectedOperators.forEach(op => {
          const mccMncData = mccMnc.find(m => m.mcc === op.mcc && m.mnc === op.mnc);
          addRate({
            entityType: formData.entityType,
            entityId: formData.entityId,
            mcc: op.mcc,
            mnc: op.mnc,
            countryName: mccMncData?.countryName || '',
            operatorName: mccMncData?.operatorName || '',
            rate: formData.rate,
            currency: 'USD',
            effectiveFrom: new Date().toISOString(),
            isActive: true
          });
        });
      } else {
         const mccMncData = mccMnc.find(m => m.mcc === formData.mcc && m.mnc === formData.mnc);
         addRate({
            entityType: formData.entityType,
            entityId: formData.entityId,
            mcc: formData.mcc,
            mnc: formData.mnc,
            countryName: mccMncData?.countryName || '',
            operatorName: mccMncData?.operatorName || '',
            rate: formData.rate,
            currency: 'USD',
            effectiveFrom: new Date().toISOString(),
            isActive: true
          });
      }
    }
    
    setShowAddModal(false);
    setEditingRate(null);
    setSelectedCountry('');
    setSelectedOperators([]);
    setFormData({ entityType: 'client', entityId: '', mcc: '', mnc: '', rate: 0 });
  };

  const handleDelete = () => {
    if (selectedRate) {
      deleteRate(selectedRate.id);
      setShowDeleteModal(false);
      setSelectedRate(null);
    }
  };

  const openEditModal = (rate: Rate) => {
    setEditingRate(rate);
    setFormData({
      entityType: rate.entityType,
      entityId: rate.entityId,
      mcc: rate.mcc,
      mnc: rate.mnc,
      rate: rate.rate
    });
    setShowAddModal(true);
  };

  // Get unique countries from mccMnc
  const countries = [...new Set(mccMnc.map(m => m.countryName))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Management</h1>
          <p className="text-gray-500">Configure client and supplier rates by destination</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Bulk Upload (CSV)
            <input type="file" className="hidden" accept=".csv" onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                 alert("File selected: " + e.target.files[0].name + ". CSV parsing logic would run here to bulk upload rates.");
              }
            }} />
          </label>
          <Button variant="secondary" onClick={() => {
            alert("Exporting rates as CSV...");
          }}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Rate
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rates.length}</p>
              <p className="text-sm text-gray-500">Total Rates</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rates.filter(r => r.entityType === 'client').length}
              </p>
              <p className="text-sm text-gray-500">Client Rates</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rates.filter(r => r.entityType === 'supplier').length}
              </p>
              <p className="text-sm text-gray-500">Supplier Rates</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(groupedRates).length}
              </p>
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
              placeholder="Search by country, operator, MCC, MNC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value as typeof filterEntity)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="client">Client Rates</option>
              <option value="supplier">Supplier Rates</option>
            </select>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <optgroup label="Clients">
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.clientCode}</option>
                ))}
              </optgroup>
              <optgroup label="Suppliers">
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.supplierCode}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </Card>

      {/* Rates Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MCC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MNC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate ($)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRates.slice(0, 50).map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{rate.countryName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{rate.operatorName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-600">{rate.mcc}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-600">{rate.mnc}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">
                      ${rate.rate.toFixed(6)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rate.entityType === 'client'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {rate.entityType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{getEntityName(rate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(rate)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRate(rate);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRate(null);
          setFormData({ entityType: 'client', entityId: '', mcc: '', mnc: '', rate: 0 });
        }}
        title={editingRate ? 'Edit Rate' : 'Add New Rate'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Type *
              </label>
              <select
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value as 'client' | 'supplier', entityId: '' })}
                disabled={!!editingRate}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="client">Client Rate</option>
                <option value="supplier">Supplier Rate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.entityType === 'client' ? 'Client' : 'Supplier'} *
              </label>
              <select
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                disabled={!!editingRate}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select {formData.entityType}</option>
                {formData.entityType === 'client'
                  ? clients.map(c => <option key={c.id} value={c.clientCode || c.id}>{c.clientCode} - {c.companyName}</option>)
                  : suppliers.map(s => <option key={s.id} value={s.supplierCode || s.id}>{s.supplierCode} - {s.companyName}</option>)
                }
              </select>
            </div>
          </div>

          {!editingRate && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedOperators([]);
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                     <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              
              {selectedCountry && (
                 <div className="max-h-40 overflow-y-auto border border-gray-200 p-2 rounded-lg">
                    <label className="flex items-center gap-2 font-semibold mb-2">
                       <input 
                         type="checkbox" 
                         onChange={(e) => {
                           if(e.target.checked) {
                             const allOps = mccMnc.filter(m => m.countryName === selectedCountry).map(m => ({mcc: m.mcc, mnc: m.mnc}));
                             setSelectedOperators(allOps);
                           } else {
                             setSelectedOperators([]);
                           }
                         }}
                         checked={selectedOperators.length === mccMnc.filter(m => m.countryName === selectedCountry).length && selectedOperators.length > 0}
                       />
                       Select All Operators
                    </label>
                    {mccMnc.filter(m => m.countryName === selectedCountry).map(m => (
                       <label key={`${m.mcc}-${m.mnc}`} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                          <input 
                            type="checkbox"
                            checked={selectedOperators.some(op => op.mcc === m.mcc && op.mnc === m.mnc)}
                            onChange={(e) => {
                               if(e.target.checked) {
                                 setSelectedOperators([...selectedOperators, {mcc: m.mcc, mnc: m.mnc}]);
                               } else {
                                 setSelectedOperators(selectedOperators.filter(op => !(op.mcc === m.mcc && op.mnc === m.mnc)));
                               }
                            }}
                          />
                          {m.operatorName} ({m.mcc}/{m.mnc})
                       </label>
                    ))}
                 </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate (USD) *
            </label>
            <input
              type="number"
              step="0.000001"
              required
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingRate ? 'Update' : 'Add'} Rate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Rate"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this rate for <strong>{selectedRate?.countryName} - {selectedRate?.operatorName}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
