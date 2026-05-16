import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Globe, ChevronDown, ChevronRight, Copy, Info } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useStore } from '../../store';
import type { Translation } from '../../types';

// ── All Translation Categories with Real Examples ──
const TRANSLATION_REFERENCE: { cat: string; items: { type: Translation['type']; name: string; desc: string; matchEx: string; replaceEx: string; before: string; after: string }[] }[] = [
  {
    cat: 'Number / Destination Translations',
    items: [
      { type: 'number', name: 'Prefix Stripping', desc: 'Remove national access code (0) from local numbers', matchEx: '^0(\\d+)', replaceEx: '$1', before: '01711234567', after: '1711234567' },
      { type: 'number', name: 'Prefix Insertion', desc: 'Add missing country code', matchEx: '^(5\\d{7})$', replaceEx: '971$1', before: '50123456', after: '97150123456' },
      { type: 'number', name: 'E.164 Formatting', desc: 'Enforce +CC format, strip spaces/dashes', matchEx: '[\\s\\-()]', replaceEx: '', before: '+880 171-123 4567', after: '+8801711234567' },
      { type: 'number', name: 'Leading Zero Removal', desc: 'Convert 00CC to CC format', matchEx: '^00(\\d+)', replaceEx: '$1', before: '0044207946000', after: '44207946000' },
      { type: 'number', name: 'Add Plus Sign', desc: 'Add + prefix for international format', matchEx: '^(\\d{10,15})$', replaceEx: '+$1', before: '8801711234567', after: '+8801711234567' },
      { type: 'number', name: 'BD Local to Intl', desc: 'Convert BD local 017xx to +88017xx', matchEx: '^0(1[3-9]\\d{8})$', replaceEx: '+880$1', before: '01711234567', after: '+8801711234567' },
    ],
  },
  {
    cat: 'Sender ID / Originator Translations',
    items: [
      { type: 'sid', name: 'Alpha to Numeric', desc: 'Replace brand name with long code for restrictive markets', matchEx: '^facebook$', replaceEx: '+14155552671', before: 'facebook', after: '+14155552671' },
      { type: 'sid', name: 'Numeric to Alpha', desc: 'Replace raw number with brand name', matchEx: '^\\+?\\d+$', replaceEx: 'Verify', before: '+447911123456', after: 'Verify' },
      { type: 'sid', name: 'SID Masking', desc: 'Replace any SID with specific brand', matchEx: '.*', replaceEx: 'MyBrand', before: 'anything', after: 'MyBrand' },
      { type: 'sid', name: 'Local Short Code', desc: 'Convert app short code to long code', matchEx: '^(\\d{4,5})$', replaceEx: '+880$1', before: '16200', after: '+88016200' },
    ],
  },
  {
    cat: 'Content / Body Translations',
    items: [
      { type: 'content', name: 'Text Replacement', desc: 'Replace specific text in message body', matchEx: 'Your otp is', replaceEx: 'Your verification code is', before: 'Your otp is 1234', after: 'Your verification code is 1234' },
      { type: 'content', name: 'Smart Quote Fix', desc: 'Replace curly quotes with ASCII', matchEx: '[\u201C\u201D]', replaceEx: '"', before: 'Click \u201CHere\u201D', after: 'Click "Here"' },
      { type: 'content', name: 'URL Shortener Tag', desc: 'Append tracking tag to URLs', matchEx: '(https?://[^\\s]+)', replaceEx: '$1?ref=net2app', before: 'Visit https://site.com', after: 'Visit https://site.com?ref=net2app' },
      { type: 'content', name: 'Accent Removal', desc: 'Transliterate accented chars to GSM-7', matchEx: '[\u00E9\u00E8\u00EA]', replaceEx: 'e', before: 'caf\u00E9 cr\u00E8me', after: 'cafe creme' },
      { type: 'content', name: 'Strip Emoji', desc: 'Remove emoji to keep GSM-7 encoding', matchEx: '[\\u{1F600}-\\u{1F9FF}]', replaceEx: '', before: 'Hello 😀👋', after: 'Hello ' },
    ],
  },
  {
    cat: 'OTP & Dynamic Content',
    items: [
      { type: 'extract_otp', name: 'Extract OTP', desc: 'Extract 4-8 digit OTP for logging (content unchanged)', matchEx: '\\b(\\d{4,8})\\b', replaceEx: '', before: 'Your code is 482910', after: '(extracts: 482910)' },
      { type: 'random_content', name: 'Random Body', desc: 'Replace body with random template, OTP preserved', matchEx: '\\d{4,8}', replaceEx: 'Your code: {{OTP}}|Verification: {{OTP}}|Enter {{OTP}} to continue|Code {{OTP}} expires in 5 min', before: 'Your otp is 1234', after: 'Enter 1234 to continue' },
      { type: 'random_content', name: 'Anti-Template', desc: 'Randomize to bypass content filters', matchEx: '\\d{4,6}', replaceEx: 'Hi, {{OTP}} is your code|Use {{OTP}} for login|{{OTP}} - do not share', before: 'OTP: 5678', after: 'Hi, 5678 is your code' },
    ],
  },
];

type FormMode = 'add' | 'edit';

export function TranslationsPage() {
  const { translations, clients, suppliers, addTranslation, updateTranslation, deleteTranslation } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'client' | 'supplier'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [showRef, setShowRef] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  const emptyForm = { entityType: 'client' as 'client' | 'supplier', entityId: '', name: '', priority: 1, type: 'number' as Translation['type'], matchPattern: '', replacePattern: '' };
  const [formData, setFormData] = useState(emptyForm);

  const filtered = (translations || []).filter(t => {
    const ms = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.matchPattern.includes(searchQuery);
    const me = filterEntity === 'all' || t.entityType === filterEntity;
    const mt = filterType === 'all' || t.type === filterType;
    return ms && me && mt;
  });

  const getEntityName = (t: Translation) => t.entityType === 'client' ? clients.find(c => c.id === t.entityId)?.clientCode || '?' : suppliers.find(s => s.id === t.entityId)?.supplierCode || '?';

  const openAdd = () => { setFormMode('add'); setEditId(null); setFormData(emptyForm); setShowFormModal(true); };
  const openEdit = (t: Translation) => { setFormMode('edit'); setEditId(t.id); setFormData({ entityType: t.entityType, entityId: t.entityId, name: t.name, priority: t.priority, type: t.type, matchPattern: t.matchPattern, replacePattern: t.replacePattern }); setShowFormModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'edit' && editId) {
      updateTranslation(editId, { ...formData, isActive: true });
    } else {
      addTranslation({ ...formData, isActive: true });
    }
    setShowFormModal(false);
    setFormData(emptyForm);
  };

  const handleDelete = () => { if (selectedTranslation) { deleteTranslation(selectedTranslation.id); setShowDeleteModal(false); setSelectedTranslation(null); } };

  const applyExample = (ex: typeof TRANSLATION_REFERENCE[0]['items'][0]) => {
    setFormData(prev => ({ ...prev, name: ex.name, type: ex.type, matchPattern: ex.matchEx, replacePattern: ex.replaceEx }));
    setShowRef(false);
    if (!showFormModal) { setFormMode('add'); setEditId(null); setShowFormModal(true); }
  };

  const toggleCat = (cat: string) => setExpandedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const copyText = (t: string) => navigator.clipboard.writeText(t);

  const typeColors: Record<string, string> = { number: 'bg-blue-100 text-blue-800', sid: 'bg-purple-100 text-purple-800', content: 'bg-green-100 text-green-800', extract_otp: 'bg-orange-100 text-orange-800', random_content: 'bg-pink-100 text-pink-800' };
  const sel = "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Translations</h1>
          <p className="text-gray-500">Number, SID, content, OTP extraction & randomization rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRef(!showRef)}><Info className="w-4 h-4" /> {showRef ? 'Hide' : 'Show'} Reference</Button>
          <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Translation</Button>
        </div>
      </div>

      {/* ── Reference Guide ── */}
      {showRef && (
        <Card className="border-2 border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> Translation Reference & Examples</h3>
          <p className="text-sm text-gray-600 mb-4">Click any example to pre-fill the Add Translation form. Translations apply in <strong>priority order</strong> (1 first, 2 second).</p>
          <div className="space-y-2">
            {TRANSLATION_REFERENCE.map(cat => (
              <div key={cat.cat} className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => toggleCat(cat.cat)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <span className="font-semibold text-gray-800 text-sm">{cat.cat}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{cat.items.length} rules</span>{expandedCats.includes(cat.cat) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}</div>
                </button>
                {expandedCats.includes(cat.cat) && (
                  <div className="divide-y divide-gray-100">
                    {cat.items.map((item, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer group" onClick={() => applyExample(item)}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[item.type] || 'bg-gray-100 text-gray-700'}`}>{item.type}</span>
                            <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                          </div>
                          <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to use →</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{item.desc}</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div><span className="text-gray-400">Match:</span> <code className="bg-gray-100 px-1 rounded font-mono text-[10px]">{item.matchEx}</code></div>
                          <div><span className="text-gray-400">Replace:</span> <code className="bg-gray-100 px-1 rounded font-mono text-[10px]">{item.replaceEx || '(empty)'}</code></div>
                          <div><span className="text-gray-400">Before:</span> <code className="bg-red-50 text-red-700 px-1 rounded font-mono text-[10px]">{item.before}</code></div>
                          <div><span className="text-gray-400">After:</span> <code className="bg-green-50 text-green-700 px-1 rounded font-mono text-[10px]">{item.after}</code></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Filters ── */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search name or pattern..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value as typeof filterEntity)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="all">All Entities</option><option value="client">Client</option><option value="supplier">Supplier</option></select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="all">All Types</option><option value="number">Number</option><option value="sid">SID</option><option value="content">Content</option><option value="extract_otp">Extract OTP</option><option value="random_content">Random Content</option></select>
        </div>
      </Card>

      {/* ── Translations Table ── */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-4 py-3 w-12">#</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Match Pattern</th><th className="px-4 py-3">Replace</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 w-24">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No translations found. Click "Add Translation" or use the Reference examples.</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="w-7 h-7 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">{t.priority}</span></td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[t.type] || 'bg-gray-100'}`}>{t.type.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-1.5 py-0.5 rounded ${t.entityType === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{t.entityType}</span><p className="text-xs text-gray-500 mt-0.5">{getEntityName(t)}</p></td>
                  <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">{t.matchPattern}</code></td>
                  <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">{t.replacePattern || '(empty)'}</code></td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{t.isActive ? 'Active' : 'Off'}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-blue-100 rounded transition-colors" title="Edit"><Edit className="w-4 h-4 text-blue-600" /></button>
                      <button onClick={() => copyText(`${t.matchPattern} → ${t.replacePattern}`)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Copy"><Copy className="w-4 h-4 text-gray-400" /></button>
                      <button onClick={() => { setSelectedTranslation(t); setShowDeleteModal(true); }} className="p-1.5 hover:bg-red-100 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add/Edit Modal ── */}
      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={formMode === 'edit' ? 'Edit Translation' : 'Add Translation'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Apply To *</label>
              <select value={formData.entityType} onChange={e => setFormData({ ...formData, entityType: e.target.value as 'client' | 'supplier', entityId: '' })} className={sel} disabled={formMode === 'edit'}><option value="client">Client</option><option value="supplier">Supplier</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">{formData.entityType === 'client' ? 'Client' : 'Supplier'} *</label>
              <select value={formData.entityId} onChange={e => setFormData({ ...formData, entityId: e.target.value })} required className={sel} disabled={formMode === 'edit'}>
                <option value="">Select...</option>
                {formData.entityType === 'client' ? (clients || []).map(c => <option key={c.id} value={c.id}>{c.clientCode}</option>) : (suppliers || []).map(s => <option key={s.id} value={s.id}>{s.supplierCode}</option>)}
              </select></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Prefix Stripping" className={sel} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label><input type="number" min="1" required value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })} className={sel} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as Translation['type'] })} className={sel}>
                <option value="number">Number (destination transform)</option>
                <option value="sid">SID (sender ID change)</option>
                <option value="content">Content (body text modify)</option>
                <option value="extract_otp">Extract OTP (log only)</option>
                <option value="random_content">Random Content (anti-filter)</option>
              </select></div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Match Pattern (Regex) *</label>
            <input type="text" required value={formData.matchPattern} onChange={e => setFormData({ ...formData, matchPattern: e.target.value })} placeholder="e.g. ^0(\d+) or Your otp is" className={`${sel} font-mono`} />
            <p className="text-xs text-gray-500 mt-1">JavaScript regex. Use capturing groups like <code className="bg-gray-100 px-1 rounded">(\d+)</code> to capture parts for replacement.</p></div>

          <div><label className="block text-sm font-medium text-gray-700 mb-1">Replace Pattern</label>
            {formData.type === 'random_content' ? (
              <div>
                <textarea value={formData.replacePattern} onChange={e => setFormData({ ...formData, replacePattern: e.target.value })} rows={3} placeholder="Template 1 with {{OTP}}|Template 2 with {{OTP}}|Template 3 {{OTP}}" className={`${sel} font-mono`} />
                <p className="text-xs text-gray-500 mt-1">Pipe-separated templates. <code className="bg-gray-100 px-1 rounded">{'{{OTP}}'}</code> is replaced with the extracted code. System picks randomly.</p>
              </div>
            ) : formData.type === 'extract_otp' ? (
              <div><input type="text" value={formData.replacePattern} onChange={e => setFormData({ ...formData, replacePattern: e.target.value })} placeholder="(not used for OTP extraction)" className={`${sel} font-mono`} disabled /><p className="text-xs text-gray-500 mt-1">OTP extraction only logs the code — message content stays unchanged.</p></div>
            ) : (
              <div><input type="text" value={formData.replacePattern} onChange={e => setFormData({ ...formData, replacePattern: e.target.value })} placeholder="e.g. $1 or +880$1 or Verify" className={`${sel} font-mono`} />
                <p className="text-xs text-gray-500 mt-1">Use <code className="bg-gray-100 px-1 rounded">$1</code>, <code className="bg-gray-100 px-1 rounded">$2</code> for capture group back-references. Leave empty to delete match.</p></div>
            )}
          </div>

          {/* Live Preview */}
          {formData.matchPattern && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Live Preview</p>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div><span className="text-gray-500">Match regex:</span> <code className="text-blue-700">/{formData.matchPattern}/gi</code></div>
                <div><span className="text-gray-500">Replace with:</span> <code className="text-green-700">{formData.replacePattern || '(delete)'}</code></div>
              </div>
              {formData.type === 'number' && <p className="text-xs text-gray-500 mt-2">Applied to: Destination number before routing</p>}
              {formData.type === 'sid' && <p className="text-xs text-gray-500 mt-2">Applied to: Sender ID (source address)</p>}
              {formData.type === 'content' && <p className="text-xs text-gray-500 mt-2">Applied to: Message body text</p>}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <button type="button" onClick={() => setShowRef(true)} className="text-xs text-blue-600 hover:underline">Browse examples →</button>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowFormModal(false)}>Cancel</Button>
              <Button type="submit">{formMode === 'edit' ? 'Save Changes' : 'Add Translation'}</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Translation" size="sm">
        <p className="text-gray-600 mb-4">Delete <strong>{selectedTranslation?.name}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete</Button></div>
      </Modal>
    </div>
  );
}
