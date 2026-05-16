import { useState } from 'react';
import { Plus, Search, Play, Pause, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';

export function CampaignsPage() {
  const { campaigns, updateCampaign, clients, routes, addCampaign } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [formData, setFormData] = useState({
     name: '',
     clientId: '',
     routeId: '',
     tpsLimit: 10,
     totalVolume: 0,
     file: null as File | null
  });

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCampaign = (id: string, currentStatus: string) => {
    if (currentStatus === 'running') {
      updateCampaign(id, { status: 'paused' });
    } else if (currentStatus === 'paused' || currentStatus === 'scheduled') {
      updateCampaign(id, { status: 'running', startedAt: new Date().toISOString() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500">Manage bulk SMS campaigns</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Campaigns</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.running}</p>
              <p className="text-sm text-gray-500">Running</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Campaigns List */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TPS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => {
                const progress = campaign.totalVolume > 0
                  ? (campaign.sentCount / campaign.totalVolume) * 100
                  : 0;

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      <p className="text-xs text-gray-500">
                        {campaign.scheduledAt ? `Scheduled: ${new Date(campaign.scheduledAt).toLocaleString()}` : ''}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.clientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.routeName}</td>
                    <td className="px-6 py-4">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{campaign.sentCount.toLocaleString()}</span>
                          <span>{campaign.totalVolume.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-green-600">{campaign.deliveredCount} ✓</span>
                          <span className="text-red-600">{campaign.failedCount} ✗</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.tpsLimit}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={campaign.status} type="campaign" />
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant={campaign.status === 'running' ? 'secondary' : 'primary'}
                        onClick={() => toggleCampaign(campaign.id, campaign.status)}
                        disabled={campaign.status === 'completed' || campaign.status === 'cancelled'}
                      >
                        {campaign.status === 'running' ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Start
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Campaign"
        size="md"
      >
        <form onSubmit={(e) => {
           e.preventDefault();
           if(formData.clientId && formData.routeId) {
             const client = clients.find(c => c.id === formData.clientId);
             const route = routes.find(r => r.id === formData.routeId);
             
             // Simulation of reading file and setting volume. In real app parse CSV here.
             const simulatedVolume = formData.file ? 1000 : 0;
             
             addCampaign({
                name: formData.name,
                clientId: formData.clientId,
                clientName: client?.companyName,
                routeId: formData.routeId,
                routeName: route?.name,
                tpsLimit: formData.tpsLimit,
                totalVolume: simulatedVolume,
                status: 'draft',
                sentCount: 0,
                deliveredCount: 0,
                failedCount: 0,
                scheduledAt: new Date().toISOString()
             });
             setShowAddModal(false);
             setFormData({name: '', clientId: '', routeId: '', tpsLimit: 10, totalVolume: 0, file: null});
           }
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select required value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
               <option value="">Select Client</option>
               {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
            <select required value={formData.routeId} onChange={(e) => setFormData({...formData, routeId: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
               <option value="">Select Route</option>
               {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TPS Limit *</label>
            <input type="number" required min="1" value={formData.tpsLimit} onChange={(e) => setFormData({...formData, tpsLimit: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Numbers (CSV/Excel)</label>
            <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => {
               if(e.target.files && e.target.files.length > 0) {
                 setFormData({...formData, file: e.target.files[0]});
               }
            }} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Upload file with numbers and optional custom messages.</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Create Campaign</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
