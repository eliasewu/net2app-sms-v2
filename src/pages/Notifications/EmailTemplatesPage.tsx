import { useState, useEffect } from 'react';
import { Edit, Save, Mail, Eye, Send, CheckCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';
import type { EmailTemplate } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// ── Preloaded Templates ──
const PRELOAD_TEMPLATES: Omit<EmailTemplate, 'id'>[] = [
  {
    name: 'low_balance',
    subject: 'Low Balance Alert — {{client_name}} ({{client_code}})',
    body: 'Dear {{client_name}},\n\nYour account balance has fallen below the threshold.\n\nAccount: {{client_code}}\nSMPP Username: {{smpp_username}}\nCurrent Balance: ${{balance}}\nThreshold: ${{threshold}}\n\nPlease top up your account to avoid service interruption.\n\nTo add funds, login to your dashboard or contact billing@net2app.com.\n\nRegards,\n{{platform_name}} Billing Team',
    variables: ['client_name', 'client_code', 'smpp_username', 'balance', 'threshold', 'platform_name'],
    isActive: true,
  },
  {
    name: 'account_created_client',
    subject: 'Welcome to {{platform_name}} — Your SMPP Account',
    body: `Dear {{client_name}},

Welcome to {{platform_name}}! Your SMS gateway account has been created.

Company: {{company_name}}
Client Code: {{client_code}}
SMPP Username: {{smpp_username}}
SMPP Password: {{smpp_password}}
SMPP Host: {{smpp_host}}
SMPP Port: {{smpp_port}}
Billing Type: {{billing_type}}
Billing Mode: {{billing_mode}}

Dashboard: {{dashboard_url}}

Please keep your credentials secure. Contact support if you need assistance.

Regards,
{{platform_name}} Team`,
    variables: ['client_name', 'company_name', 'client_code', 'smpp_username', 'smpp_password', 'smpp_host', 'smpp_port', 'billing_type', 'billing_mode', 'dashboard_url', 'platform_name'],
    isActive: true,
  },
  {
    name: 'account_created_supplier',
    subject: 'Supplier Account Created — {{supplier_code}}',
    body: `Dear {{contact_person}},

A supplier account has been created for {{company_name}}.

Supplier Code: {{supplier_code}}
Connection Type: {{connection_type}}
SMPP Username: {{smpp_username}}
SMPP Host: {{smpp_host}}:{{smpp_port}}

This account will be used for outbound SMS routing.

Regards,
{{platform_name}} NOC Team`,
    variables: ['contact_person', 'company_name', 'supplier_code', 'connection_type', 'smpp_username', 'smpp_host', 'smpp_port', 'platform_name'],
    isActive: true,
  },
  {
    name: 'invoice_generated',
    subject: 'Invoice {{invoice_number}} — {{client_name}}',
    body: 'Dear {{client_name}},\n\nA new invoice has been generated for your account.\n\nInvoice Number: {{invoice_number}}\nPeriod: {{period_start}} to {{period_end}}\nTotal Messages: {{total_messages}}\nSubtotal: ${{subtotal}}\nTax ({{tax_rate}}%): ${{tax_amount}}\nTotal Amount: ${{total_amount}}\nDue Date: {{due_date}}\n\nPlease login to your dashboard to view the full invoice and make payment.\n\nPayment Methods: Bank Transfer, Wire, PayPal, Crypto\n\nRegards,\n{{platform_name}} Billing',
    variables: ['client_name', 'invoice_number', 'period_start', 'period_end', 'total_messages', 'subtotal', 'tax_rate', 'tax_amount', 'total_amount', 'due_date', 'platform_name'],
    isActive: true,
  },
  {
    name: 'payment_received',
    subject: 'Payment Received — {{amount}} — {{entity_name}}',
    body: 'Dear {{entity_name}},\n\nWe have received your payment. Thank you!\n\nPayment Number: {{payment_number}}\nAmount: ${{amount}}\nMethod: {{payment_method}}\nReference: {{reference_number}}\n\nPrevious Balance: ${{balance_before}}\nNew Balance: ${{balance_after}}\n\nYour account is now active and ready for use.\n\nRegards,\n{{platform_name}} Billing',
    variables: ['entity_name', 'payment_number', 'amount', 'payment_method', 'reference_number', 'balance_before', 'balance_after', 'platform_name'],
    isActive: true,
  },
  {
    name: 'rate_change',
    subject: 'Rate Update Notice — {{destination_name}}',
    body: 'Dear {{entity_name}},\n\nThis is to inform you that rates have been updated for the following destination:\n\nAccount: {{entity_code}}\nSMPP Username: {{smpp_username}}\nDestination: {{destination_name}} ({{mcc}}/{{mnc}})\nOperator: {{operator_name}}\nPrevious Rate: ${{old_rate}}\nNew Rate: ${{new_rate}}\nEffective From: {{effective_date}}\n\nIf you have any questions, please contact your account manager.\n\nRegards,\n{{platform_name}} Commercial Team',
    variables: ['entity_name', 'entity_code', 'smpp_username', 'destination_name', 'mcc', 'mnc', 'operator_name', 'old_rate', 'new_rate', 'effective_date', 'platform_name'],
    isActive: true,
  },
  {
    name: 'channel_disconnect',
    subject: '⚠ Channel Disconnected — {{entity_code}}',
    body: `ALERT: SMPP connection has been lost.

Entity: {{entity_code}} ({{entity_name}})
Type: {{entity_type}}
SMPP Username: {{smpp_username}}
Last Connected: {{last_activity}}
Disconnect Time: {{disconnect_time}}

The system will attempt to reconnect automatically. If the issue persists, please check the remote SMSC status.

— {{platform_name}} Monitoring`,
    variables: ['entity_code', 'entity_name', 'entity_type', 'smpp_username', 'last_activity', 'disconnect_time', 'platform_name'],
    isActive: true,
  },
  {
    name: 'payment_reminder',
    subject: 'Payment Reminder — Invoice {{invoice_number}}',
    body: 'Dear {{client_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} is due.\n\nAmount Due: ${{amount_due}}\nDue Date: {{due_date}}\nDays Overdue: {{days_overdue}}\n\nPlease make payment at your earliest convenience to avoid service interruption.\n\nRegards,\n{{platform_name}} Billing',
    variables: ['client_name', 'invoice_number', 'amount_due', 'due_date', 'days_overdue', 'platform_name'],
    isActive: true,
  },
  {
    name: 'dlr_failure_alert',
    subject: '🔴 DLR Failure Rate High — {{supplier_code}}',
    body: `ALERT: High DLR failure rate detected.

Supplier: {{supplier_code}} ({{supplier_name}})
Failed in last hour: {{fail_count}}
Total in last hour: {{total_count}}
Failure Rate: {{fail_rate}}%
Consecutive Failures: {{consecutive_fails}}

Action recommended: Check supplier SMSC status or switch to backup route.

— {{platform_name}} NOC`,
    variables: ['supplier_code', 'supplier_name', 'fail_count', 'total_count', 'fail_rate', 'consecutive_fails', 'platform_name'],
    isActive: true,
  },
];

export function EmailTemplatesPage() {
  const { emailTemplates, updateEmailTemplate, setEmailTemplates } = useStore();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formData, setFormData] = useState({ subject: '', body: '' });

  // Auto-seed templates if empty
  useEffect(() => {
    if (emailTemplates.length === 0) {
      setEmailTemplates(PRELOAD_TEMPLATES.map(t => ({ ...t, id: uuidv4() })));
    }
  }, [emailTemplates.length, setEmailTemplates]);

  const handleEdit = (t: EmailTemplate) => { setSelectedTemplate(t); setFormData({ subject: t.subject, body: t.body }); setShowEditModal(true); };
  const handleSave = (e: React.FormEvent) => { e.preventDefault(); if (selectedTemplate) { updateEmailTemplate(selectedTemplate.id, formData); setShowEditModal(false); } };
  const handleTestSend = () => {
    if (!testEmail || !selectedTemplate) return;
    setSendStatus('sending');
    setTimeout(() => setSendStatus('sent'), 1500);
    setTimeout(() => setSendStatus('idle'), 4000);
  };

  const templateLabels: Record<string, { label: string; color: string }> = {
    low_balance: { label: 'Low Balance Alert', color: 'bg-orange-100 text-orange-800' },
    account_created_client: { label: 'Client Account Created', color: 'bg-blue-100 text-blue-800' },
    account_created_supplier: { label: 'Supplier Account Created', color: 'bg-purple-100 text-purple-800' },
    invoice_generated: { label: 'Invoice Generated', color: 'bg-green-100 text-green-800' },
    payment_received: { label: 'Payment Received', color: 'bg-emerald-100 text-emerald-800' },
    rate_change: { label: 'Rate Change Notice', color: 'bg-yellow-100 text-yellow-800' },
    channel_disconnect: { label: 'Channel Disconnect', color: 'bg-red-100 text-red-800' },
    payment_reminder: { label: 'Payment Reminder', color: 'bg-amber-100 text-amber-800' },
    dlr_failure_alert: { label: 'DLR Failure Alert', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Email Templates</h1><p className="text-gray-500">Manage notification email templates with SMPP credentials and billing variables</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { if (emailTemplates.length === 0 || confirm('Reset all templates to defaults?')) { setEmailTemplates(PRELOAD_TEMPLATES.map(t => ({ ...t, id: uuidv4() }))); } }}>Reset to Defaults</Button>
        </div>
      </div>

      {/* SMTP Status */}
      {(() => {
        const { license } = useStore.getState();
        return (
          <Card className={license.smtpEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className={`w-5 h-5 ${license.smtpEnabled ? 'text-green-600' : 'text-yellow-600'}`} />
                <div>
                  <p className={`font-medium ${license.smtpEnabled ? 'text-green-900' : 'text-yellow-900'}`}>
                    SMTP {license.smtpEnabled ? 'Configured' : 'Not Configured'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {license.smtpEnabled ? `${license.smtpHost}:${license.smtpPort} • From: ${license.smtpFrom}` : 'Go to System → Platform Settings to configure SMTP server'}
                  </p>
                </div>
              </div>
              <a href="/system/settings" className="text-sm text-blue-600 hover:underline">Configure SMTP →</a>
            </div>
          </Card>
        );
      })()}

      {/* Templates Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-3">Template</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Variables</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 w-28">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {emailTemplates.map(t => {
                const info = templateLabels[t.name] || { label: t.name, color: 'bg-gray-100 text-gray-800' };
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${info.color}`}>{info.label}</span></td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">{t.subject}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{t.variables.slice(0, 4).map(v => <span key={v} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono">{`{{${v}}}`}</span>)}{t.variables.length > 4 && <span className="text-[10px] text-gray-400">+{t.variables.length - 4}</span>}</div></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{t.isActive ? 'Active' : 'Off'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-blue-100 rounded" title="Edit"><Edit className="w-4 h-4 text-blue-600" /></button>
                        <button onClick={() => { setSelectedTemplate(t); setShowPreview(true); }} className="p-1.5 hover:bg-gray-100 rounded" title="Preview"><Eye className="w-4 h-4 text-gray-500" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Template — ${templateLabels[selectedTemplate?.name || '']?.label || selectedTemplate?.name}`} size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label><input type="text" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label><textarea required rows={14} value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" /></div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-2">Available Variables:</p>
            <div className="flex flex-wrap gap-1">{selectedTemplate?.variables.map(v => <span key={v} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded text-xs font-mono cursor-pointer hover:bg-blue-100" onClick={() => setFormData(p => ({ ...p, body: p.body + `{{${v}}}` }))}>{`{{${v}}}`}</span>)}</div>
          </div>
          {/* Test send */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Send Test Email</p>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <Button type="button" size="sm" variant="secondary" onClick={handleTestSend} disabled={!testEmail || sendStatus === 'sending'}>
                {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? <><CheckCircle className="w-3 h-3" /> Sent!</> : <><Send className="w-3 h-3" /> Test</>}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button type="submit"><Save className="w-4 h-4" /> Save Template</Button></div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Template Preview" size="lg">
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Subject:</p>
              <p className="font-medium text-gray-900">{selectedTemplate.subject.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`)}</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{selectedTemplate.body.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
