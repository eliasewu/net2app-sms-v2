import { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Mic,
  Megaphone,
  AlertTriangle,
  Zap,
  MapPin
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import type { Trunk, TrunkType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const trunkTypeIcons: Record<TrunkType, React.ElementType> = {
  sim: Smartphone,
  voiceotp: Mic,
  marketing: Megaphone,
  spam: AlertTriangle,
  direct: Zap,
  local_direct: MapPin
};

const trunkTypeColors: Record<TrunkType, string> = {
  sim: 'bg-blue-100 text-blue-800',
  voiceotp: 'bg-purple-100 text-purple-800',
  marketing: 'bg-orange-100 text-orange-800',
  spam: 'bg-red-100 text-red-800',
  direct: 'bg-green-100 text-green-800',
  local_direct: 'bg-teal-100 text-teal-800'
};

export function TrunksList() {
  const { trunks, suppliers, addTrunk, updateTrunk, deleteTrunk } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTrunks, setExpandedTrunks] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTrunk, setSelectedTrunk] = useState<Trunk | null>(null);
  const [editingTrunk, setEditingTrunk] = useState<Trunk | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    trunkType: 'direct' as TrunkType,
    description: '',
    supplierIds: [] as string[]
  });

  const filteredTrunks = trunks.filter((trunk) =>
    trunk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trunk.trunkType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedTrunks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTrunk) {
      updateTrunk(editingTrunk.id, {
        name: formData.name,
        trunkType: formData.trunkType,
        description: formData.description,
        suppliers: formData.supplierIds.map((supplierId, index) => ({
          id: uuidv4(),
          trunkId: editingTrunk.id,
          supplierId,
          supplierName: suppliers.find(s => s.id === supplierId)?.companyName,
          priority: index + 1,
          weight: 100,
          isActive: true
        }))
      });
    } else {
      addTrunk({
        name: formData.name,
        trunkType: formData.trunkType,
        description: formData.description,
        isActive: true,
        suppliers: formData.supplierIds.map((supplierId, index) => ({
          id: uuidv4(),
          trunkId: '',
          supplierId,
          supplierName: suppliers.find(s => s.id === supplierId)?.companyName,
          priority: index + 1,
          weight: 100,
          isActive: true
        }))
      });
    }
    
    setShowAddModal(false);
    setEditingTrunk(null);
    setFormData({ name: '', trunkType: 'direct', description: '', supplierIds: [] });
  };

  const handleDelete = () => {
    if (selectedTrunk) {
      deleteTrunk(selectedTrunk.id);
      setShowDeleteModal(false);
      setSelectedTrunk(null);
    }
  };

  const openEditModal = (trunk: Trunk) => {
    setEditingTrunk(trunk);
    setFormData({
      name: trunk.name,
      trunkType: trunk.trunkType,
      description: trunk.description,
      supplierIds: trunk.suppliers.map(s => s.supplierId)
    });
    setShowAddModal(true);
  };

  const groupedTrunks = filteredTrunks.reduce((acc, trunk) => {
    if (!acc[trunk.trunkType]) {
      acc[trunk.trunkType] = [];
    }
    acc[trunk.trunkType].push(trunk);
    return acc;
  }, {} as Record<TrunkType, Trunk[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trunks</h1>
          <p className="text-gray-500">Manage supplier trunks grouped by type</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Trunk
        </Button>
      </div>

      {/* Trunk Type Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(Object.keys(trunkTypeIcons) as TrunkType[]).map((type) => {
          const Icon = trunkTypeIcons[type];
          const count = trunks.filter(t => t.trunkType === type).length;
          return (
            <Card key={type}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trunkTypeColors[type]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search trunks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Trunks by Type */}
      <div className="space-y-6">
        {(Object.keys(groupedTrunks) as TrunkType[]).map((type) => {
          const Icon = trunkTypeIcons[type];
          return (
            <Card key={type}>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trunkTypeColors[type]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {type.replace('_', ' ')} Trunks
                  </h3>
                  <p className="text-sm text-gray-500">{groupedTrunks[type].length} trunk(s)</p>
                </div>
              </div>

              <div className="space-y-3">
                {groupedTrunks[type].map((trunk) => (
                  <div key={trunk.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleExpand(trunk.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedTrunks.includes(trunk.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{trunk.name}</p>
                          <p className="text-sm text-gray-500">{trunk.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {trunk.suppliers.length} supplier(s)
                        </span>
                        <StatusBadge status={trunk.isActive ? 'active' : 'inactive'} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(trunk);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrunk(trunk);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedTrunks.includes(trunk.id) && (
                      <div className="p-4 border-t border-gray-200">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                              <th className="pb-2">Priority</th>
                              <th className="pb-2">Supplier</th>
                              <th className="pb-2">Weight</th>
                              <th className="pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trunk.suppliers.map((supplier) => (
                              <tr key={supplier.id} className="border-t border-gray-100">
                                <td className="py-2">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                    {supplier.priority}
                                  </span>
                                </td>
                                <td className="py-2 text-sm text-gray-900">{supplier.supplierName}</td>
                                <td className="py-2 text-sm text-gray-600">{supplier.weight}%</td>
                                <td className="py-2">
                                  <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTrunk(null);
          setFormData({ name: '', trunkType: 'direct', description: '', supplierIds: [] });
        }}
        title={editingTrunk ? 'Edit Trunk' : 'Add New Trunk'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trunk Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trunk Type *
              </label>
              <select
                value={formData.trunkType}
                onChange={(e) => setFormData({ ...formData, trunkType: e.target.value as TrunkType })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sim">SIM</option>
                <option value="voiceotp">Voice OTP</option>
                <option value="marketing">Marketing</option>
                <option value="spam">Spam</option>
                <option value="direct">Direct</option>
                <option value="local_direct">Local Direct</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suppliers (select in priority order)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {suppliers.filter(s => s.isActive).map((supplier) => (
                <label key={supplier.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.supplierIds.includes(supplier.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, supplierIds: [...formData.supplierIds, supplier.id] });
                      } else {
                        setFormData({ ...formData, supplierIds: formData.supplierIds.filter(id => id !== supplier.id) });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{supplier.supplierCode}</span>
                  <span className="text-xs text-gray-500">({supplier.companyName})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTrunk ? 'Update' : 'Create'} Trunk
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Trunk"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedTrunk?.name}</strong>?
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
