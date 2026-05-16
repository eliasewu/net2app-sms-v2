import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Users, Building2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useStore } from '../../store';
import { calculateInvoiceTotals } from '../../lib/billing';
import { v4 as uuidv4 } from 'uuid';

export function BillingOverview() {
  const navigate = useNavigate();
  const { clients, suppliers, invoices, payments, smsLogs, addPayment, addInvoice, updateSupplier } = useStore();

  // ── Payment modal ──
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ entityType: 'client' as 'client' | 'supplier', entityId: '', amount: '', method: '', reference: '', notes: '' });

  // ── Invoice generator ──
  const [showInvoice, setShowInvoice] = useState(false);
  const [invForm, setInvForm] = useState({ entityType: 'client' as 'client' | 'supplier', entityId: '', frequency: 'monthly' as string, periodStart: '', periodEnd: '', taxRate: 0 });

  // ── Stats ──
  const totalClientBal = clients.reduce((s, c) => s + c.balance, 0);
  const totalSupplierBal = suppliers.reduce((s, sp) => s + sp.balance, 0);
  const totalCredit = clients.reduce((s, c) => s + c.creditLimit, 0);
  const todayLogs = smsLogs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todayLogs.reduce((s, l) => s + l.clientRate, 0);
  const todayCost = todayLogs.reduce((s, l) => s + l.supplierRate, 0);
  const todayProfit = todayLogs.reduce((s, l) => s + (l.clientRate - l.supplierRate), 0);
  const clientInvoices = invoices.filter(i => !i.invoiceNumber.startsWith('SINV'));
  const supplierInvoices = invoices.filter(i => i.invoiceNumber.startsWith('SINV'));

  // ── Supplier usage aggregation ──
  const supplierUsage = suppliers.map(sp => {
    const spLogs = smsLogs.filter(l => l.supplierId === sp.id);
    return {
      ...sp,
      totalMessages: spLogs.length,
      totalCost: spLogs.reduce((s, l) => Math.round((s + l.supplierRate) * 1e6) / 1e6, 0),
    };
  });

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.entityId || !payForm.amount) return;
    const amt = parseFloat(payForm.amount);
    if (payForm.entityType === 'client') {
      const c = clients.find(x => x.id === payForm.entityId);
      addPayment({
        paymentNumber: '', entityType: 'client', entityId: payForm.entityId,
        entityName: c?.companyName, amount: amt, currency: 'USD', paymentType: 'topup',
        paymentMethod: payForm.method, referenceNumber: payForm.reference,
        notes: payForm.notes, processedBy: 'admin',
      });
    } else {
      const sp = suppliers.find(x => x.id === payForm.entityId);
      // Update supplier balance
      if (sp) updateSupplier(sp.id, { balance: Math.round((sp.balance + amt) * 1e4) / 1e4 });
      addPayment({
        paymentNumber: '', entityType: 'supplier', entityId: payForm.entityId,
        entityName: sp?.companyName, amount: amt, currency: 'USD', paymentType: 'topup',
        paymentMethod: payForm.method, referenceNumber: payForm.reference,
        notes: payForm.notes, processedBy: 'admin',
      });
    }
    setShowPayment(false);
    setPayForm({ entityType: 'client', entityId: '', amount: '', method: '', reference: '', notes: '' });
  };

  const handleInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.entityId || !invForm.periodStart || !invForm.periodEnd) return;

    if (invForm.entityType === 'client') {
      const c = clients.find(x => x.id === invForm.entityId);
      if (!c) return;
      const t = calculateInvoiceTotals(invForm.entityId, smsLogs, invForm.periodStart, invForm.periodEnd);
      const tax = Math.round(t.subtotal * invForm.taxRate) / 100;
      addInvoice({
        invoiceNumber: '', clientId: invForm.entityId, clientName: c.companyName,
        periodStart: invForm.periodStart, periodEnd: invForm.periodEnd,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        billingFrequency: invForm.frequency as 'daily' | 'weekly' | 'monthly',
        subtotal: t.subtotal, taxRate: invForm.taxRate, taxAmount: tax,
        totalAmount: Math.round((t.subtotal + tax) * 1e4) / 1e4, paidAmount: 0,
        billToName: c.companyName, billToAddress: c.address || '', billToEmail: c.email || '',
        status: 'sent',
        items: t.items.map(i => ({ id: uuidv4(), invoiceId: '', description: `SMS to ${i.country} — ${i.operator}`, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, mcc: i.mcc, mnc: i.mnc, country: i.country, operator: i.operator })),
      });
    } else {
      // Supplier invoice — aggregate by MCC/MNC from CDR where supplierId matches
      const sp = suppliers.find(x => x.id === invForm.entityId);
      if (!sp) return;
      const start = new Date(invForm.periodStart);
      const end = new Date(invForm.periodEnd); end.setHours(23, 59, 59, 999);
      const spLogs = smsLogs.filter(l => l.supplierId === invForm.entityId && new Date(l.createdAt) >= start && new Date(l.createdAt) <= end && l.supplierRate > 0);
      const grouped: Record<string, { country: string; operator: string; mcc: string; mnc: string; count: number; total: number }> = {};
      for (const l of spLogs) {
        const k = `${l.mcc}-${l.mnc}`;
        if (!grouped[k]) grouped[k] = { country: l.country, operator: l.operator, mcc: l.mcc, mnc: l.mnc, count: 0, total: 0 };
        grouped[k].count++;
        grouped[k].total = Math.round((grouped[k].total + l.supplierRate) * 1e6) / 1e6;
      }
      const items = Object.values(grouped);
      const subtotal = items.reduce((s, i) => Math.round((s + i.total) * 1e6) / 1e6, 0);
      const tax = Math.round(subtotal * invForm.taxRate) / 100;
      addInvoice({
        invoiceNumber: 'SINV', clientId: invForm.entityId, clientName: sp.companyName,
        periodStart: invForm.periodStart, periodEnd: invForm.periodEnd,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        billingFrequency: invForm.frequency as 'daily' | 'weekly' | 'monthly',
        subtotal, taxRate: invForm.taxRate, taxAmount: tax,
        totalAmount: Math.round((subtotal + tax) * 1e4) / 1e4, paidAmount: 0,
        billToName: sp.companyName, billToAddress: sp.address || '', billToEmail: sp.email || '',
        status: 'sent',
        items: items.map(i => ({ id: uuidv4(), invoiceId: '', description: `SMS via ${i.country} — ${i.operator}`, quantity: i.count, unitPrice: i.count > 0 ? Math.round((i.total / i.count) * 1e6) / 1e6 : 0, total: i.total, mcc: i.mcc, mnc: i.mnc, country: i.country, operator: i.operator })),
      });
    }
    setShowInvoice(false);
    setInvForm({ entityType: 'client', entityId: '', frequency: 'monthly', periodStart: '', periodEnd: '', taxRate: 0 });
  };

  // Quick date presets
  const setDatePreset = (preset: string) => {
    const now = new Date();
    let start: Date, end: Date;
    switch (preset) {
      case 'today': start = new Date(now.toDateString()); end = now; break;
      case 'yesterday': start = new Date(now.getTime() - 86400000); start.setHours(0, 0, 0, 0); end = new Date(start); end.setHours(23, 59, 59); break;
      case 'week': start = new Date(now.getTime() - 7 * 86400000); end = now; break;
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = now; break;
      case 'last_month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
      default: return;
    }
    setInvForm(p => ({ ...p, periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) }));
  };

  const sel = "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inp = sel;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Accounts</h1>
          <p className="text-gray-500">Client & supplier balances, invoices, payments, settlement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowInvoice(true)}>
            <FileText className="w-4 h-4" /> Generate Invoice
          </Button>
          <Button onClick={() => setShowPayment(true)}>
            <Plus className="w-4 h-4" /> Add Payment
          </Button>
        </div>
      </div>

      {/* ── Top Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Client Balance</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${totalClientBal.toFixed(2)}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Client Credit</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${totalCredit.toFixed(2)}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Supplier Balance</p>
          <p className="text-xl font-bold text-purple-700 mt-1">${totalSupplierBal.toFixed(2)}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Today Revenue</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${todayRevenue.toFixed(4)}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5"><ArrowUpRight className="w-3 h-3" />{todayLogs.length} msg</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Today Cost</p>
          <p className="text-xl font-bold text-gray-900 mt-1">${todayCost.toFixed(4)}</p>
          <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5"><ArrowDownRight className="w-3 h-3" />supplier</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Today Profit</p>
          <p className={`text-xl font-bold mt-1 ${todayProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>${todayProfit.toFixed(4)}</p>
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${todayProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`} />
        </Card>
        <Card className="relative overflow-hidden">
          <p className="text-xs text-gray-500 uppercase">Invoices</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{invoices.length}</p>
          <p className="text-xs text-gray-500">{invoices.filter(i => i.status !== 'paid').length} unpaid</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Client Accounts ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Client Accounts</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing/invoices')}>Invoices →</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="pb-2">Client</th><th className="pb-2 text-right">Balance</th><th className="pb-2 text-right">Credit</th><th className="pb-2 text-right">Today SMS</th><th className="pb-2 text-right">Today Rev</th><th className="pb-2">Actions</th>
              </tr></thead>
              <tbody>{clients.map(c => {
                const cLogs = todayLogs.filter(l => l.clientId === c.id);
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2"><p className="font-medium text-gray-900">{c.clientCode}</p><p className="text-xs text-gray-500">{c.billingType}/{c.billingMode}</p></td>
                    <td className={`py-2 text-right font-semibold ${c.balance < 100 ? 'text-red-600' : 'text-gray-900'}`}>${c.balance.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-600">${c.creditLimit.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-600">{cLogs.length}</td>
                    <td className="py-2 text-right text-green-600">${cLogs.reduce((s, l) => s + l.clientRate, 0).toFixed(4)}</td>
                    <td className="py-2"><button onClick={() => { setPayForm({ ...payForm, entityType: 'client', entityId: c.id }); setShowPayment(true); }} className="text-xs text-blue-600 hover:underline">Add Funds</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Card>

        {/* ── Supplier Accounts ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-purple-600" /> Supplier Accounts</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing/invoices')}>Invoices →</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="pb-2">Supplier</th><th className="pb-2 text-right">Balance</th><th className="pb-2 text-right">Today SMS</th><th className="pb-2 text-right">Today Cost</th><th className="pb-2 text-right">Total Cost</th><th className="pb-2">Actions</th>
              </tr></thead>
              <tbody>{supplierUsage.map(sp => {
                const spToday = todayLogs.filter(l => l.supplierId === sp.id);
                return (
                  <tr key={sp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2"><p className="font-medium text-gray-900">{sp.supplierCode}</p><p className="text-xs text-gray-500">{sp.connectionType}</p></td>
                    <td className="py-2 text-right font-semibold text-purple-700">${sp.balance.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-600">{spToday.length}</td>
                    <td className="py-2 text-right text-orange-600">${spToday.reduce((s, l) => s + l.supplierRate, 0).toFixed(4)}</td>
                    <td className="py-2 text-right text-gray-900">${sp.totalCost.toFixed(4)}</td>
                    <td className="py-2"><button onClick={() => { setPayForm({ ...payForm, entityType: 'supplier', entityId: sp.id }); setShowPayment(true); }} className="text-xs text-purple-600 hover:underline">Add Credit</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Card>

        {/* ── Recent Client Invoices ── */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Invoices</h3>
          <div className="space-y-2">
            {clientInvoices.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No client invoices yet. Click "Generate Invoice" to create one.</p> : clientInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div><p className="font-medium text-gray-900 text-sm">{inv.invoiceNumber}</p><p className="text-xs text-gray-500">{inv.clientName} • {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</p></div>
                <div className="text-right"><p className="font-bold text-gray-900">${inv.totalAmount.toFixed(2)}</p><StatusBadge status={inv.status} type="invoice" /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Recent Supplier Invoices ── */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Invoices (Settlement)</h3>
          <div className="space-y-2">
            {supplierInvoices.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">No supplier invoices yet. Generate one to settle with suppliers.</p> : supplierInvoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div><p className="font-medium text-gray-900 text-sm">{inv.invoiceNumber}</p><p className="text-xs text-gray-500">{inv.clientName} • {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</p></div>
                <div className="text-right"><p className="font-bold text-purple-700">${inv.totalAmount.toFixed(2)}</p><StatusBadge status={inv.status} type="invoice" /></div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Recent Payments ── */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing/payments')}>View all →</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500 uppercase border-b"><th className="pb-2">Payment #</th><th className="pb-2">Type</th><th className="pb-2">Entity</th><th className="pb-2 text-right">Amount</th><th className="pb-2">Method</th><th className="pb-2">Date</th></tr></thead>
              <tbody>{payments.slice(-10).reverse().map(p => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2 font-mono text-xs">{p.paymentNumber}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.entityType === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{p.entityType}</span></td>
                  <td className="py-2 text-gray-700">{p.entityName}</td>
                  <td className="py-2 text-right font-semibold text-green-600">+${p.amount.toFixed(2)}</td>
                  <td className="py-2 text-gray-500">{p.paymentMethod}</td>
                  <td className="py-2 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ═══ ADD PAYMENT MODAL (Client + Supplier) ═══ */}
      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Add Payment / Fund" size="md">
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <select value={payForm.entityType} onChange={e => setPayForm({ ...payForm, entityType: e.target.value as 'client' | 'supplier', entityId: '' })} className={sel}>
                <option value="client">Client Account</option>
                <option value="supplier">Supplier Account</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{payForm.entityType === 'client' ? 'Client' : 'Supplier'} *</label>
              <select value={payForm.entityId} onChange={e => setPayForm({ ...payForm, entityId: e.target.value })} required className={sel}>
                <option value="">Select...</option>
                {payForm.entityType === 'client'
                  ? clients.map(c => <option key={c.id} value={c.id}>{c.clientCode} (Bal: ${c.balance.toFixed(2)})</option>)
                  : suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierCode} (Bal: ${s.balance.toFixed(2)})</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label><input type="number" step="0.01" required value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className={inp} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} required className={sel}>
              <option value="">Select</option><option value="Bank Transfer">Bank Transfer</option><option value="Wire Transfer">Wire Transfer</option><option value="PayPal">PayPal</option><option value="Crypto">Crypto</option><option value="Credit Card">Credit Card</option><option value="Cash">Cash</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference</label><input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} className={inp} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className={inp} /></div>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setShowPayment(false)}>Cancel</Button><Button type="submit">Add Payment</Button></div>
        </form>
      </Modal>

      {/* ═══ GENERATE INVOICE MODAL (Client + Supplier) ═══ */}
      <Modal isOpen={showInvoice} onClose={() => setShowInvoice(false)} title="Generate Invoice" size="lg">
        <form onSubmit={handleInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice For *</label>
              <select value={invForm.entityType} onChange={e => setInvForm({ ...invForm, entityType: e.target.value as 'client' | 'supplier', entityId: '' })} className={sel}>
                <option value="client">Client Invoice (Revenue)</option>
                <option value="supplier">Supplier Invoice (Cost/Settlement)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{invForm.entityType === 'client' ? 'Client' : 'Supplier'} *</label>
              <select value={invForm.entityId} onChange={e => setInvForm({ ...invForm, entityId: e.target.value })} required className={sel}>
                <option value="">Select...</option>
                {invForm.entityType === 'client' ? clients.map(c => <option key={c.id} value={c.id}>{c.clientCode} — {c.companyName}</option>) : suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierCode} — {s.companyName}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: 'daily', l: 'Daily', p: 'today' }, { v: 'daily', l: 'Yesterday', p: 'yesterday' },
                { v: 'weekly', l: 'Last 7 Days', p: 'week' }, { v: 'monthly', l: 'This Month', p: 'month' },
                { v: 'monthly', l: 'Last Month', p: 'last_month' }, { v: 'monthly', l: 'Custom', p: '' },
              ].map((b, i) => (
                <button key={i} type="button" onClick={() => { setInvForm(p => ({ ...p, frequency: b.v })); if (b.p) setDatePreset(b.p); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${invForm.frequency === b.v && invForm.periodStart ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                  {b.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label><input type="date" required value={invForm.periodStart} onChange={e => setInvForm({ ...invForm, periodStart: e.target.value })} className={inp} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label><input type="date" required value={invForm.periodEnd} onChange={e => setInvForm({ ...invForm, periodEnd: e.target.value })} className={inp} /></div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label><input type="number" step="0.01" value={invForm.taxRate} onChange={e => setInvForm({ ...invForm, taxRate: parseFloat(e.target.value) || 0 })} className={inp} /></div>

          {/* Live preview */}
          {invForm.entityId && invForm.periodStart && invForm.periodEnd && (
            <div className={`p-4 rounded-lg border ${invForm.entityType === 'client' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
              {(() => {
                if (invForm.entityType === 'client') {
                  const t = calculateInvoiceTotals(invForm.entityId, smsLogs, invForm.periodStart, invForm.periodEnd);
                  const tax = t.subtotal * invForm.taxRate / 100;
                  return (<div className="text-sm"><p className="font-semibold text-gray-900">Preview: {t.items.reduce((s, i) => s + i.quantity, 0).toLocaleString()} messages</p>{t.items.map((item, j) => <p key={j} className="text-gray-600 text-xs">{item.country} {item.operator}: {item.quantity} × ${item.unitPrice.toFixed(6)} = ${item.total.toFixed(4)}</p>)}<div className="mt-2 pt-2 border-t"><p>Subtotal: <strong>${t.subtotal.toFixed(4)}</strong></p><p>Tax ({invForm.taxRate}%): <strong>${tax.toFixed(4)}</strong></p><p className="text-lg font-bold text-blue-800">Total: ${(t.subtotal + tax).toFixed(4)}</p></div></div>);
                } else {
                  const start = new Date(invForm.periodStart); const end = new Date(invForm.periodEnd); end.setHours(23, 59, 59, 999);
                  const spLogs = smsLogs.filter(l => l.supplierId === invForm.entityId && new Date(l.createdAt) >= start && new Date(l.createdAt) <= end && l.supplierRate > 0);
                  const total = spLogs.reduce((s, l) => Math.round((s + l.supplierRate) * 1e6) / 1e6, 0);
                  const tax = total * invForm.taxRate / 100;
                  return (<div className="text-sm"><p className="font-semibold text-gray-900">Supplier Preview: {spLogs.length} messages</p><p>Cost Subtotal: <strong>${total.toFixed(4)}</strong></p><p>Tax: <strong>${tax.toFixed(4)}</strong></p><p className="text-lg font-bold text-purple-800">Settlement Total: ${(total + tax).toFixed(4)}</p></div>);
                }
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setShowInvoice(false)}>Cancel</Button><Button type="submit">Generate Invoice</Button></div>
        </form>
      </Modal>
    </div>
  );
}
