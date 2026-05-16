import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Wifi,
  WifiOff,
  Globe,
  Server
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import type { Supplier } from '../../types';

export function SuppliersList() {
  const navigate = useNavigate();
  const { suppliers, deleteSupplier, updateSupplier } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.supplierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || supplier.connectionType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = () => {
    if (selectedSupplier) {
      deleteSupplier(selectedSupplier.id);
      setShowDeleteModal(false);
      setSelectedSupplier(null);
    }
  };

  const toggleSupplierStatus = (supplier: Supplier) => {
    updateSupplier(supplier.id, { isActive: !supplier.isActive });
    setShowActionsMenu(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500">Manage SMS gateway suppliers and connections</p>
        </div>
        <Button onClick={() => navigate('/suppliers/add')}>
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              <p className="text-sm text-gray-500">Total Suppliers</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {suppliers.filter((s) => s.smppStatus === 'bound').length}
              </p>
              <p className="text-sm text-gray-500">Connected</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {suppliers.filter((s) => s.connectionType === 'smpp').length}
              </p>
              <p className="text-sm text-gray-500">SMPP</p>
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
                {suppliers.filter((s) => s.connectionType === 'http_api').length}
              </p>
              <p className="text-sm text-gray-500">HTTP API</p>
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
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="smpp">SMPP</option>
              <option value="http_api">HTTP API</option>
              <option value="rcs">RCS</option>
              <option value="flash_sms">Flash SMS</option>
              <option value="ott_device">OTT Device Pairing</option>
              <option value="whatsapp">WhatsApp API</option>
              <option value="telegram">Telegram API</option>
              <option value="custom_http">Custom HTTP</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Connection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{supplier.supplierCode}</p>
                      <p className="text-sm text-gray-500">{supplier.companyName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      supplier.connectionType === 'smpp'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {supplier.connectionType === 'smpp' ? (
                        <Server className="w-3 h-3" />
                      ) : (
                        <Globe className="w-3 h-3" />
                      )}
                      {supplier.connectionType.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {supplier.connectionType === 'smpp' ? (
                      <div className="flex items-center gap-2">
                        {supplier.smppStatus === 'bound' ? (
                          <Wifi className="w-4 h-4 text-green-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm text-gray-900">{supplier.smppHost}:{supplier.smppPort}</p>
                          <StatusBadge status={supplier.smppStatus} type="connection" />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-900 truncate max-w-xs">{supplier.apiSendUrl}</p>
                        <StatusBadge status="active" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">
                      {supplier.apiProviderRegion || supplier.country || 'Global'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(showActionsMenu === supplier.id ? null : supplier.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>

                      {showActionsMenu === supplier.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button
                            onClick={() => {
                              navigate(`/suppliers/${supplier.id}`);
                              setShowActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/suppliers/${supplier.id}/edit`);
                              setShowActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleSupplierStatus(supplier)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {supplier.isActive ? (
                              <>
                                <WifiOff className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Wifi className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowDeleteModal(true);
                              setShowActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Supplier"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedSupplier?.supplierCode}</strong>?
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
