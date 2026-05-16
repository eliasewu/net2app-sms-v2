import { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Gauge,
  DollarSign,
  TrendingUp,
  Shuffle,
  FlaskConical
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import type { Route, RoutingType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const routingTypeIcons: Record<RoutingType, React.ElementType> = {
  priority: Gauge,
  lcr: DollarSign,
  performance: TrendingUp,
  round_robin: Shuffle,
  testing: FlaskConical
};

const routingTypeDescriptions: Record<RoutingType, string> = {
  priority: 'Route by priority order',
  lcr: 'Least Cost Routing',
  performance: 'Best delivery performance',
  round_robin: 'Load balanced',
  testing: 'Testing route'
};

export function RoutesList() {
  const { routes, trunks, addRoute, updateRoute, deleteRoute } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoutes, setExpandedRoutes] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    routingType: 'priority' as RoutingType,
    description: '',
    trunkIds: [] as string[]
  });

  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedRoutes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRoute) {
      updateRoute(editingRoute.id, {
        name: formData.name,
        routingType: formData.routingType,
        description: formData.description,
        trunks: formData.trunkIds.map((trunkId, index) => ({
          id: uuidv4(),
          routeId: editingRoute.id,
          trunkId,
          trunkName: trunks.find(t => t.id === trunkId)?.name,
          priority: index + 1,
          isActive: true
        }))
      });
    } else {
      addRoute({
        name: formData.name,
        routingType: formData.routingType,
        description: formData.description,
        isActive: true,
        trunks: formData.trunkIds.map((trunkId, index) => ({
          id: uuidv4(),
          routeId: '',
          trunkId,
          trunkName: trunks.find(t => t.id === trunkId)?.name,
          priority: index + 1,
          isActive: true
        }))
      });
    }
    
    setShowAddModal(false);
    setEditingRoute(null);
    setFormData({ name: '', routingType: 'priority', description: '', trunkIds: [] });
  };

  const handleDelete = () => {
    if (selectedRoute) {
      deleteRoute(selectedRoute.id);
      setShowDeleteModal(false);
      setSelectedRoute(null);
    }
  };

  const openEditModal = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      routingType: route.routingType,
      description: route.description,
      trunkIds: route.trunks.map(t => t.trunkId)
    });
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes</h1>
          <p className="text-gray-500">Configure routing rules and trunk assignments</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Route
        </Button>
      </div>

      {/* Route Type Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(Object.keys(routingTypeIcons) as RoutingType[]).map((type) => {
          const Icon = routingTypeIcons[type];
          const count = routes.filter(r => r.routingType === type).length;
          return (
            <Card key={type}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
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
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Routes List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200">
          {filteredRoutes.map((route) => {
            const Icon = routingTypeIcons[route.routingType];
            return (
              <div key={route.id}>
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(route.id)}
                >
                  <div className="flex items-center gap-4">
                    {expandedRoutes.includes(route.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{route.name}</p>
                      <p className="text-sm text-gray-500">{route.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 capitalize">{route.routingType.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{route.trunks.length} trunk(s)</p>
                    </div>
                    <StatusBadge status={route.isActive ? 'active' : 'inactive'} />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(route);
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoute(route);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {expandedRoutes.includes(route.id) && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Assigned Trunks</h4>
                      {route.trunks.length === 0 ? (
                        <p className="text-sm text-gray-500">No trunks assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {route.trunks.map((trunk) => (
                            <div
                              key={trunk.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                  {trunk.priority}
                                </span>
                                <span className="text-sm text-gray-900">{trunk.trunkName}</span>
                              </div>
                              <StatusBadge status={trunk.isActive ? 'active' : 'inactive'} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRoute(null);
          setFormData({ name: '', routingType: 'priority', description: '', trunkIds: [] });
        }}
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route Name *
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
                Routing Type *
              </label>
              <select
                value={formData.routingType}
                onChange={(e) => setFormData({ ...formData, routingType: e.target.value as RoutingType })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(routingTypeDescriptions) as RoutingType[]).map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()} - {routingTypeDescriptions[type]}
                  </option>
                ))}
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
              Trunks (select in priority order)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {trunks.filter(t => t.isActive).map((trunk) => (
                <label key={trunk.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.trunkIds.includes(trunk.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, trunkIds: [...formData.trunkIds, trunk.id] });
                      } else {
                        setFormData({ ...formData, trunkIds: formData.trunkIds.filter(id => id !== trunk.id) });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{trunk.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    trunk.trunkType === 'direct' ? 'bg-green-100 text-green-800' :
                    trunk.trunkType === 'sim' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trunk.trunkType.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingRoute ? 'Update' : 'Create'} Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Route"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedRoute?.name}</strong>?
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
