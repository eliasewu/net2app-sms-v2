import {
  MessageSquare,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { useStore } from '../store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function Dashboard() {
  const { clients, suppliers, smsLogs, getDashboardStats, notifications } = useStore();
  const stats = getDashboardStats();

  // Generate hourly data for chart
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0') + ':00';
    const logsInHour = smsLogs.filter(log => {
      const logHour = new Date(log.createdAt).getHours();
      return logHour === i;
    });
    return {
      hour,
      submitted: logsInHour.length,
      delivered: logsInHour.filter(l => l.status === 'delivered').length,
      failed: logsInHour.filter(l => l.status === 'failed').length
    };
  });

  // Status distribution
  const statusData = [
    { name: 'Delivered', value: smsLogs.filter(l => l.status === 'delivered').length },
    { name: 'Failed', value: smsLogs.filter(l => l.status === 'failed').length },
    { name: 'Pending', value: smsLogs.filter(l => l.status === 'pending').length },
    { name: 'Submitted', value: smsLogs.filter(l => l.status === 'submitted').length }
  ].filter(d => d.value > 0);

  // Low balance clients
  const lowBalanceClients = clients.filter(c => c.balance < 100 && c.isActive);

  // Failing suppliers (mock 15 consecutive failures)
  const failingSuppliers = suppliers.filter(s => s.smppStatus === 'error');

  // Recent unread notifications
  const recentAlerts = notifications.filter(n => !n.isRead).slice(0, 5);

  // Country distribution from logs
  const countryStats = smsLogs.reduce((acc, log) => {
    acc[log.country] = (acc[log.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryData = Object.entries(countryStats)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Real-time SMS hub monitoring</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          Live data
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Messages</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMessages.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Today</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Delivered</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.deliveredMessages.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalMessages > 0 ? ((stats.deliveredMessages / stats.totalMessages) * 100).toFixed(1) : 0}% rate
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.failedMessages.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalMessages > 0 ? ((stats.failedMessages / stats.totalMessages) * 100).toFixed(1) : 0}% rate
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${stats.revenue.toFixed(2)}</p>
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Profit: ${stats.profit.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeClients}</p>
              <p className="text-sm text-gray-500">Active Clients</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSuppliers}</p>
              <p className="text-sm text-gray-500">Active Suppliers</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.bindUpClients}</p>
              <p className="text-sm text-gray-500">Binds Up</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.bindDownClients}</p>
              <p className="text-sm text-gray-500">Binds Down</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Traffic</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="submitted"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Submitted"
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Delivered"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="3"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="Failed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 -mt-4">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Destinations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Recent Alerts
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No unread alerts</p>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <p className="font-medium text-sm text-yellow-800">{alert.title}</p>
                  <p className="text-sm text-yellow-700 truncate">{alert.message}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low Balance & Failing Suppliers */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attention Required</h3>
          <div className="space-y-4">
            {/* Low Balance Clients */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                Low Balance Clients
              </p>
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {lowBalanceClients.length === 0 ? (
                  <p className="text-sm text-gray-500">All clients have sufficient balance</p>
                ) : (
                  lowBalanceClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 bg-orange-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {client.clientCode}
                      </span>
                      <span className="text-sm text-orange-600 font-semibold">
                        ${client.balance.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Failing Suppliers */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-500" />
                Connection Issues
              </p>
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {failingSuppliers.length === 0 ? (
                  <p className="text-sm text-gray-500">All suppliers connected</p>
                ) : (
                  failingSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between p-2 bg-red-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {supplier.supplierCode}
                      </span>
                      <StatusBadge status={supplier.smppStatus} type="connection" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
          <a href="/logs" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 font-medium">Message ID</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Destination</th>
                <th className="pb-3 font-medium">Country</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {smsLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 text-sm font-mono text-gray-900">{log.messageId}</td>
                  <td className="py-3 text-sm text-gray-900">{log.clientCode}</td>
                  <td className="py-3 text-sm text-gray-600">{log.destinationAddr}</td>
                  <td className="py-3 text-sm text-gray-600">{log.country}</td>
                  <td className="py-3">
                    <StatusBadge status={log.status} type="message" />
                  </td>
                  <td className="py-3 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
