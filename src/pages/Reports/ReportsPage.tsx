import { useState } from 'react';
import { BarChart3, Download, Calendar, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';
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

export function ReportsPage() {
  const { smsLogs, clients } = useStore();
  const [reportType, setReportType] = useState<'realtime' | 'hourly' | 'daily' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState('today');

  // Calculate stats
  const stats = {
    totalMessages: smsLogs.length,
    delivered: (smsLogs || []).filter(l => l.status === 'delivered').length,
    failed: (smsLogs || []).filter(l => l.status === 'failed').length,
    revenue: smsLogs.reduce((sum, l) => sum + l.clientRate, 0),
    cost: smsLogs.reduce((sum, l) => sum + l.supplierRate, 0),
    profit: smsLogs.reduce((sum, l) => sum + l.profit, 0)
  };

  // Hourly distribution
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0') + ':00';
    const logsInHour = (smsLogs || []).filter(log => {
      const logHour = new Date(log.createdAt).getHours();
      return logHour === i;
    });
    return {
      hour,
      submitted: logsInHour.length,
      delivered: logsInHour.filter(l => l.status === 'delivered').length,
      failed: logsInHour.filter(l => l.status === 'failed').length,
      revenue: logsInHour.reduce((sum, l) => sum + l.clientRate, 0),
      profit: logsInHour.reduce((sum, l) => sum + l.profit, 0)
    };
  });

  // By client
  const clientStats = (clients || []).map(client => {
    const clientLogs = (smsLogs || []).filter(l => l.clientId === client.id);
    return {
      name: client.clientCode,
      messages: clientLogs.length,
      revenue: clientLogs.reduce((sum, l) => sum + l.clientRate, 0)
    };
  }).sort((a, b) => b.messages - a.messages).slice(0, 10);

  // By country
  const countryStats = smsLogs.reduce((acc, log) => {
    acc[log.country] = (acc[log.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryData = Object.entries(countryStats)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Status distribution
  const statusData = [
    { name: 'Delivered', value: stats.delivered },
    { name: 'Failed', value: stats.failed },
    { name: 'Pending', value: (smsLogs || []).filter(l => l.status === 'pending').length },
    { name: 'Submitted', value: (smsLogs || []).filter(l => l.status === 'submitted').length }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Traffic and revenue analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="realtime">Real-time</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalMessages.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Cost</p>
          <p className="text-2xl font-bold text-gray-900">${stats.cost.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Profit</p>
          <p className="text-2xl font-bold text-green-600">${stats.profit.toFixed(2)}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Traffic */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Traffic</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Area type="monotone" dataKey="submitted" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Submitted" />
                <Area type="monotone" dataKey="delivered" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Delivered" />
                <Area type="monotone" dataKey="failed" stackId="3" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Clients */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#9CA3AF" width={80} />
                <Tooltip />
                <Bar dataKey="messages" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Messages" />
              </BarChart>
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
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Countries */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Destinations</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="country" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Revenue & Profit</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
