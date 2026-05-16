import { useState, useMemo } from 'react';
import { Search, Filter, Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import type { SmsLog, SmsStatus } from '../../types';

export function SmsLogs() {
  const { smsLogs, clients, suppliers } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SmsStatus | 'all'>('all');
  const [filterClient, setFilterClient] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const filteredLogs = useMemo(() => smsLogs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || log.messageId.toLowerCase().includes(q) || log.destinationAddr.includes(q) || log.sourceAddr.toLowerCase().includes(q) || log.clientCode.toLowerCase().includes(q) || log.supplierCode.toLowerCase().includes(q) || log.messageContent.toLowerCase().includes(q) || log.country.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchClient = !filterClient || log.clientId === filterClient;
    const matchSupplier = !filterSupplier || log.supplierId === filterSupplier;
    return matchSearch && matchStatus && matchClient && matchSupplier;
  }), [smsLogs, searchQuery, filterStatus, filterClient, filterSupplier]);

  const paged = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const stats = {
    total: filteredLogs.length,
    delivered: filteredLogs.filter(l => l.status === 'delivered').length,
    failed: filteredLogs.filter(l => l.status === 'failed').length,
    revenue: filteredLogs.reduce((s, l) => s + l.clientRate, 0),
    cost: filteredLogs.reduce((s, l) => s + l.supplierRate, 0),
    profit: filteredLogs.reduce((s, l) => s + (l.clientRate - l.supplierRate), 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">SMS Logs (CDR)</h1><p className="text-gray-500">Complete call detail records</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setCurrentPage(1)}><RefreshCw className="w-4 h-4" /> Refresh</Button><Button variant="secondary"><Download className="w-4 h-4" /> Export</Button></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Card><p className="text-xs text-gray-500 uppercase">Total</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Delivered</p><p className="text-xl font-bold text-green-600">{stats.delivered}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Failed</p><p className="text-xl font-bold text-red-600">{stats.failed}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Revenue</p><p className="text-xl font-bold text-gray-900">${stats.revenue.toFixed(4)}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Cost</p><p className="text-xl font-bold text-gray-900">${stats.cost.toFixed(4)}</p></Card>
        <Card><p className="text-xs text-gray-500 uppercase">Profit</p><p className={`text-xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${stats.profit.toFixed(4)}</p></Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search ID, number, client, content..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="flex flex-wrap gap-2">
            <Filter className="w-4 h-4 text-gray-400 mt-2.5" />
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="all">All Status</option><option value="delivered">Delivered</option><option value="failed">Failed</option><option value="submitted">Submitted</option><option value="pending">Pending</option></select>
            <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">All Clients</option>{clients.map(c => <option key={c.id} value={c.id}>{c.clientCode}</option>)}</select>
            <select value={filterSupplier} onChange={e => { setFilterSupplier(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">All Suppliers</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierCode}</option>)}</select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Src</th>
                <th className="px-3 py-2">Sender</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">MCC/MNC</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Pay</th>
                <th className="px-3 py-2">Profit</th>
                <th className="px-3 py-2">Send</th>
                <th className="px-3 py-2">DLR</th>
                <th className="px-3 py-2">Send Time</th>
                <th className="px-3 py-2">Dur</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-blue-700">{log.messageId}</td>
                  <td className="px-3 py-2"><p className="font-medium text-gray-900 text-xs">{log.clientCode}</p><p className="text-[10px] text-gray-400">{log.srcType || 'SMS'}</p></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{log.srcType || 'SMPP'}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{log.sourceAddr}</td>
                  <td className="px-3 py-2 font-mono text-xs">{log.destinationAddr}</td>
                  <td className="px-3 py-2 text-xs">{log.mcc}/{log.mnc}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{log.routeName || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{log.supplierCode}</td>
                  <td className="px-3 py-2 text-xs text-orange-600 font-mono">${log.supplierRate.toFixed(6)}</td>
                  <td className="px-3 py-2 text-xs text-blue-600 font-mono">${log.clientRate.toFixed(6)}</td>
                  <td className="px-3 py-2 text-xs font-mono font-semibold" style={{ color: (log.clientRate - log.supplierRate) >= 0 ? '#059669' : '#dc2626' }}>${(log.clientRate - log.supplierRate).toFixed(6)}</td>
                  <td className="px-3 py-2"><StatusBadge status={log.sendResult || log.status} type="message" /></td>
                  <td className="px-3 py-2 text-xs">{log.deliverResult || '—'}</td>
                  <td className="px-3 py-2 text-[10px] text-gray-500 whitespace-nowrap">{new Date(log.submitTime).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{log.duration ? `${log.duration}s` : '—'}</td>
                  <td className="px-3 py-2"><button onClick={() => setSelectedLog(log)} className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {paged.length === 0 && <div className="text-center py-12 text-gray-400">No SMS logs found</div>}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages} ({filteredLogs.length} records)</p>
            <div className="flex gap-1"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div>
          </div>
        )}
      </Card>

      {/* Detail Modal — Full CDR View */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={`CDR Detail — ${selectedLog?.messageId || ''}`} size="xl">
        {selectedLog && (
          <div className="space-y-4 text-sm">
            {/* Two-column CDR fields matching the screenshot */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {([
                ['ID', selectedLog.messageId],
                ['Consumer User', selectedLog.clientCode],
                ['Alias', selectedLog.clientAlias || selectedLog.clientCode],
                ['Src Type', selectedLog.srcType || 'SMPP'],
                ['Type', selectedLog.msgType || 'SMS'],
                ['Business Type', selectedLog.businessType || 'Default type'],
                ['Send Type', selectedLog.sendType || 'SMSC'],
                ['Cost (Supplier)', `$${selectedLog.supplierRate.toFixed(6)}`],
                ['Pay (Client)', `$${selectedLog.clientRate.toFixed(6)}`],
                ['Profit', `$${(selectedLog.clientRate - selectedLog.supplierRate).toFixed(6)}`],
                ['Route', selectedLog.routeName || selectedLog.routeId || '—'],
                ['Channel', selectedLog.channel || selectedLog.supplierCode],
                ['Device', selectedLog.device || '—'],
                ['Ports', selectedLog.ports?.toString() || '—'],
                ['Slot', selectedLog.slot?.toString() || '—'],
                ['ICCID', selectedLog.iccid || '—'],
                ['Charged Points', selectedLog.chargedPoints?.toString() || '1'],
                ['Send Result', selectedLog.sendResult || selectedLog.status],
                ['Reason', selectedLog.sendReason || '—'],
                ['Deliver Result', selectedLog.deliverResult || '—'],
                ['Deliver Fail Reason', selectedLog.deliverFailReason || '—'],
                ['Deliver Time', selectedLog.deliverTime ? new Date(selectedLog.deliverTime).toLocaleString() : '—'],
                ['Deliver Duration', selectedLog.deliverDuration ? `${selectedLog.deliverDuration}s` : '—'],
                ['Ori Receiver', selectedLog.oriReceiver || selectedLog.destinationAddr],
                ['Sender', selectedLog.sourceAddr],
                ['Recipients', selectedLog.destinationAddr],
                ['Dst Receiver', selectedLog.dstReceiver || selectedLog.destinationAddr],
                ['MCC', selectedLog.mcc],
                ['MNC', selectedLog.mnc],
                ['Country', selectedLog.country],
                ['Operator', selectedLog.operator],
                ['Send Time', selectedLog.submitTime ? new Date(selectedLog.submitTime).toLocaleString() : '—'],
                ['Done Time', selectedLog.doneTime ? new Date(selectedLog.doneTime).toLocaleString() : '—'],
                ['Duration', selectedLog.duration ? `${selectedLog.duration}s` : '—'],
                ['Supplier User', selectedLog.supplierCode],
                ['In Msg ID', selectedLog.inMsgId || selectedLog.messageId],
                ['Out Msg ID', selectedLog.outMsgId || '—'],
                ['SMS Content', ''],
                ['SMS Bytes', selectedLog.smsBytes?.toString() || '—'],
                ['Dest SMS Content', ''],
                ['Dest SMS Bytes', selectedLog.destSmsBytes?.toString() || '—'],
                ['Create Time', new Date(selectedLog.createdAt).toLocaleString()],
                ['IP', selectedLog.clientIp || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">{label}:</span>
                  <span className="text-gray-900 font-mono text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
            </div>
            {/* Content fields - full width */}
            <div className="space-y-2">
              <div><p className="text-xs text-gray-500 uppercase mb-1">SMS Content (Original)</p><div className="p-3 bg-gray-50 rounded-lg font-mono text-xs">{selectedLog.messageContent}</div></div>
              {selectedLog.destSmsContent && selectedLog.destSmsContent !== selectedLog.messageContent && (
                <div><p className="text-xs text-gray-500 uppercase mb-1">Dest SMS Content (After Translation)</p><div className="p-3 bg-yellow-50 rounded-lg font-mono text-xs border border-yellow-200">{selectedLog.destSmsContent}</div></div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
