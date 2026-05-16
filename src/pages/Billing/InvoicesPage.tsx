import { useState } from 'react';
import { Plus, Search, Download, Eye, Send, FileText, CheckCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import { calculateInvoiceTotals } from '../../lib/billing';
import type { Invoice } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function InvoicesPage() {
  const { invoices, currentUser, updateInvoice, addInvoice, clients, smsLogs } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ clientId: '', periodStart: '', periodEnd: '', taxRate: 0 });

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'sent' || i.status === 'partial').reduce((sum, i) => sum + i.totalAmount - i.paidAmount, 0),
    overdue: invoices.filter(i => i.status === 'overdue').length,
    paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500">Manage client invoices</p>
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-yellow-600">${stats.pending.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Paid This Month</p>
          <p className="text-2xl font-bold text-green-600">${stats.paid.toFixed(2)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.clientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">${invoice.totalAmount.toFixed(2)}</p>
                      {invoice.paidAmount > 0 && (
                        <p className="text-xs text-green-600">Paid: ${invoice.paidAmount.toFixed(2)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={invoice.status} type="invoice" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded" title="Download">
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button className="p-1.5 hover:bg-blue-100 rounded" title="Send">
                          <Send className="w-4 h-4 text-blue-500" />
                        </button>
                      )}
                      {(invoice.status !== 'paid' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'billing')) && (
                        <button 
                           onClick={() => updateInvoice(invoice.id, {status: 'paid', paidAmount: invoice.totalAmount})}
                           className="p-1.5 hover:bg-green-100 rounded" 
                           title="Mark as Paid"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice ${selectedInvoice?.invoiceNumber}`}
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Bill To</h4>
                <p className="font-medium text-gray-900">{selectedInvoice.billToName}</p>
                <p className="text-sm text-gray-600">{selectedInvoice.billToAddress}</p>
                <p className="text-sm text-gray-600">{selectedInvoice.billToEmail}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="text-gray-900">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500 mt-2">Due Date</p>
                <p className="text-gray-900">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-right">${item.unitPrice.toFixed(4)}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Subtotal</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">${selectedInvoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500">Tax ({selectedInvoice.taxRate}%)</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">${selectedInvoice.taxAmount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-4 py-2 text-right text-sm font-semibold text-gray-900">Total</td>
                  <td className="px-4 py-2 text-right text-lg font-bold text-gray-900">${selectedInvoice.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {selectedInvoice.bankName && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
                <p className="text-sm text-gray-600">Bank: {selectedInvoice.bankName}</p>
                <p className="text-sm text-gray-600">Account: {selectedInvoice.bankAccount}</p>
                <p className="text-sm text-gray-600">SWIFT: {selectedInvoice.swiftCode}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Generate Invoice Modal */}
      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Invoice from CDR" size="md">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!genForm.clientId || !genForm.periodStart || !genForm.periodEnd) return;
          const client = clients.find(c => c.id === genForm.clientId);
          if (!client) return;
          
          // Calculate from actual SMS logs
          const totals = calculateInvoiceTotals(genForm.clientId, smsLogs, genForm.periodStart, genForm.periodEnd);
          const taxAmount = Math.round(totals.subtotal * genForm.taxRate) / 100;
          const totalAmount = Math.round((totals.subtotal + taxAmount) * 1e4) / 1e4;

          addInvoice({
            invoiceNumber: '',
            clientId: genForm.clientId,
            clientName: client.companyName,
            periodStart: genForm.periodStart,
            periodEnd: genForm.periodEnd,
            dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
            billingFrequency: 'monthly',
            subtotal: totals.subtotal,
            taxRate: genForm.taxRate,
            taxAmount,
            totalAmount,
            paidAmount: 0,
            billToName: client.companyName,
            billToAddress: client.address || '',
            billToEmail: client.email || '',
            status: 'sent',
            items: totals.items.map(item => ({
              id: uuidv4(), invoiceId: '',
              description: `SMS to ${item.country} — ${item.operator}`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              mcc: item.mcc, mnc: item.mnc,
              country: item.country, operator: item.operator,
            })),
          });
          setShowGenerate(false);
          setGenForm({ clientId: '', periodStart: '', periodEnd: '', taxRate: 0 });
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select value={genForm.clientId} onChange={e => setGenForm({ ...genForm, clientId: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.clientCode} — {c.companyName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label><input type="date" value={genForm.periodStart} onChange={e => setGenForm({ ...genForm, periodStart: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label><input type="date" value={genForm.periodEnd} onChange={e => setGenForm({ ...genForm, periodEnd: e.target.value })} required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input type="number" step="0.01" value={genForm.taxRate} onChange={e => setGenForm({ ...genForm, taxRate: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {genForm.clientId && genForm.periodStart && genForm.periodEnd && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              {(() => {
                const t = calculateInvoiceTotals(genForm.clientId, smsLogs, genForm.periodStart, genForm.periodEnd);
                return <div><p className="font-medium text-blue-900">Preview: {t.items.reduce((s,i)=>s+i.quantity,0).toLocaleString()} messages</p><p className="text-blue-700">Subtotal: ${t.subtotal.toFixed(4)} | Tax: ${(t.subtotal * genForm.taxRate / 100).toFixed(4)}</p><p className="font-bold text-blue-900">Total: ${(t.subtotal + t.subtotal * genForm.taxRate / 100).toFixed(4)}</p></div>;
              })()}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button type="submit">Generate Invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
