import { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Users,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useStore } from '../store';

export function BindStatus() {
  const { clients, suppliers, updateClient, updateSupplier } = useStore();
  const [filter, setFilter] = useState<'all' | 'clients' | 'suppliers'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'bound' | 'unbound' | 'error'>('all');

  const filteredClients = clients.filter(c => 
    (statusFilter === 'all' || c.smppStatus === statusFilter)
  );

  const filteredSuppliers = suppliers.filter(s => 
    (statusFilter === 'all' || s.smppStatus === statusFilter)
  );

  const stats = {
    totalClients: clients.length,
    boundClients: clients.filter(c => c.smppStatus === 'bound').length,
    totalSuppliers: suppliers.length,
    boundSuppliers: suppliers.filter(s => s.connectionType === 'smpp' && s.smppStatus === 'bound').length,
    errors: clients.filter(c => c.smppStatus === 'error').length + 
            suppliers.filter(s => s.smppStatus === 'error').length
  };

  const toggleClientBind = (clientId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'bound' ? 'unbound' : 'bound';
    updateClient(clientId, { smppStatus: newStatus as any });
  };

  const toggleSupplierBind = (supplierId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'bound' ? 'unbound' : 'bound';
    updateSupplier(supplierId, { smppStatus: newStatus as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bind Status</h1>
          <p className="text-gray-500">Real-time SMPP connection monitoring</p>
        </div>
        <Button variant="secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh All
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-sm text-gray-500">Total Clients</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.boundClients}</p>
              <p className="text-sm text-gray-500">Clients Bound</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
              <p className="text-sm text-gray-500">SMPP Suppliers</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.boundSuppliers}</p>
              <p className="text-sm text-gray-500">Suppliers Bound</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              <p className="text-sm text-gray-500">Errors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="clients">Clients Only</option>
              <option value="suppliers">Suppliers Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="bound">Bound</option>
              <option value="unbound">Unbound</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Client Connections */}
      {(filter === 'all' || filter === 'clients') && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Client Connections
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP/Port</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bind Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TPS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {client.smppStatus === 'bound' ? (
                          <Wifi className="w-5 h-5 text-green-500" />
                        ) : client.smppStatus === 'error' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-gray-400" />
                        )}
                        <StatusBadge status={client.smppStatus} type="connection" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{client.clientCode}</p>
                      <p className="text-xs text-gray-500">{client.companyName}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client.smppUsername}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-600">
                        {client.smppIp || 'Server Mode'}:{client.smppPort}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{client.smppBindType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{client.smppTps}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={client.smppStatus === 'bound' ? 'danger' : 'success'}
                        onClick={() => toggleClientBind(client.id, client.smppStatus)}
                      >
                        {client.smppStatus === 'bound' ? 'Unbind' : 'Bind'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Supplier Connections */}
      {(filter === 'all' || filter === 'suppliers') && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Supplier Connections
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bind Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TPS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {supplier.smppStatus === 'bound' ? (
                          <Wifi className="w-5 h-5 text-green-500" />
                        ) : supplier.smppStatus === 'error' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-gray-400" />
                        )}
                        <StatusBadge status={supplier.smppStatus} type="connection" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{supplier.supplierCode}</p>
                      <p className="text-xs text-gray-500">{supplier.companyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono text-gray-600">
                        {supplier.smppHost}:{supplier.smppPort}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.smppUsername}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{supplier.smppBindType}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{supplier.smppTps}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={supplier.smppStatus === 'bound' ? 'danger' : 'success'}
                        onClick={() => toggleSupplierBind(supplier.id, supplier.smppStatus)}
                      >
                        {supplier.smppStatus === 'bound' ? 'Unbind' : 'Bind'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
