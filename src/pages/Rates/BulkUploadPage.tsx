import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';


type UploadType = 'client_rates' | 'supplier_rates' | 'mccmnc' | 'campaign_numbers';

const TEMPLATES: Record<UploadType, { name: string; desc: string; headers: string[]; sample: string[][]; filename: string }> = {
  client_rates: {
    name: 'Client Rates',
    desc: 'Upload rates per MCC/MNC for a specific client',
    headers: ['mcc', 'mnc', 'country_name', 'operator_name', 'rate', 'currency'],
    sample: [
      ['470', '01', 'Bangladesh', 'Grameenphone', '0.012000', 'USD'],
      ['470', '02', 'Bangladesh', 'Robi Axiata', '0.012000', 'USD'],
      ['470', '03', 'Bangladesh', 'Banglalink', '0.011000', 'USD'],
      ['310', '410', 'United States', 'AT&T', '0.025000', 'USD'],
      ['404', '10', 'India', 'Airtel', '0.008000', 'USD'],
    ],
    filename: 'client_rates_template.csv',
  },
  supplier_rates: {
    name: 'Supplier Rates',
    desc: 'Upload cost rates per MCC/MNC for a specific supplier',
    headers: ['mcc', 'mnc', 'country_name', 'operator_name', 'rate', 'currency'],
    sample: [
      ['470', '01', 'Bangladesh', 'Grameenphone', '0.008000', 'USD'],
      ['470', '02', 'Bangladesh', 'Robi Axiata', '0.010000', 'USD'],
      ['310', '410', 'United States', 'AT&T', '0.018000', 'USD'],
    ],
    filename: 'supplier_rates_template.csv',
  },
  mccmnc: {
    name: 'MCC/MNC Database',
    desc: 'Upload mobile country codes and network codes',
    headers: ['country_name', 'country_code', 'mcc', 'mnc', 'operator_name', 'network_type', 'number_prefix'],
    sample: [
      ['Bangladesh', 'BD', '470', '01', 'Grameenphone', 'LTE', '880'],
      ['Bangladesh', 'BD', '470', '02', 'Robi Axiata', 'LTE', '880'],
      ['Bangladesh', 'BD', '470', '03', 'Banglalink', 'LTE', '880'],
      ['United States', 'US', '310', '410', 'AT&T Mobility', 'LTE', '1'],
    ],
    filename: 'mccmnc_template.csv',
  },
  campaign_numbers: {
    name: 'Campaign Numbers',
    desc: 'Upload phone numbers for a bulk SMS campaign',
    headers: ['phone_number', 'custom_message', 'variable_1', 'variable_2'],
    sample: [
      ['+8801711234567', '', 'John', 'ABC123'],
      ['+8801812345678', 'Custom msg for this number', 'Jane', 'DEF456'],
      ['+8801911234567', '', 'Bob', 'GHI789'],
    ],
    filename: 'campaign_numbers_template.csv',
  },
};

export function BulkUploadPage() {
  const { clients, suppliers, addRate, addMccMnc } = useStore();
  const [uploadType, setUploadType] = useState<UploadType>('client_rates');
  const [entityId, setEntityId] = useState('');
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);

  const tpl = TEMPLATES[uploadType];

  const downloadTemplate = () => {
    const csv = [tpl.headers.join(','), ...tpl.sample.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = tpl.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentData = () => {
    const store = useStore.getState();
    let csv = '';
    if (uploadType === 'client_rates' || uploadType === 'supplier_rates') {
      const et = uploadType === 'client_rates' ? 'client' : 'supplier';
      const filtered = store.rates.filter(r => r.entityType === et && (!entityId || r.entityId === entityId));
      csv = ['mcc,mnc,country_name,operator_name,rate,currency', ...filtered.map(r => `${r.mcc},${r.mnc},${r.countryName},${r.operatorName},${r.rate},${r.currency}`)].join('\n');
    } else if (uploadType === 'mccmnc') {
      csv = ['country_name,country_code,mcc,mnc,operator_name,network_type', ...store.mccMnc.map(m => `${m.countryName},${m.countryCode},${m.mcc},${m.mnc},${m.operatorName},${m.networkType}`)].join('\n');
    }
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `export_${uploadType}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (file: File) => {
    setUploading(true);
    setUploadResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setUploadResult({ success: 0, failed: 0, errors: ['File is empty or has only headers'] }); setUploading(false); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      let success = 0, failed = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        try {
          if (uploadType === 'client_rates' || uploadType === 'supplier_rates') {
            const mccIdx = headers.indexOf('mcc');
            const mncIdx = headers.indexOf('mnc');
            const rateIdx = headers.indexOf('rate');
            const countryIdx = headers.indexOf('country_name');
            const opIdx = headers.indexOf('operator_name');
            if (mccIdx < 0 || rateIdx < 0) { errors.push(`Row ${i + 1}: Missing mcc or rate column`); failed++; continue; }
            const rate = parseFloat(cols[rateIdx]);
            if (isNaN(rate) || rate < 0) { errors.push(`Row ${i + 1}: Invalid rate "${cols[rateIdx]}"`); failed++; continue; }
            addRate({
              entityType: uploadType === 'client_rates' ? 'client' : 'supplier',
              entityId: entityId,
              mcc: cols[mccIdx],
              mnc: mncIdx >= 0 ? cols[mncIdx] : '',
              countryName: countryIdx >= 0 ? cols[countryIdx] : '',
              operatorName: opIdx >= 0 ? cols[opIdx] : '',
              rate,
              currency: 'USD',
              effectiveFrom: new Date().toISOString(),
              isActive: true,
            });
            success++;
          } else if (uploadType === 'mccmnc') {
            const cn = headers.indexOf('country_name');
            const cc = headers.indexOf('country_code');
            const mcc = headers.indexOf('mcc');
            const mnc = headers.indexOf('mnc');
            const op = headers.indexOf('operator_name');
            if (mcc < 0 || mnc < 0) { errors.push(`Row ${i + 1}: Missing mcc/mnc`); failed++; continue; }
            addMccMnc({
              countryName: cn >= 0 ? cols[cn] : '',
              countryCode: cc >= 0 ? cols[cc] : '',
              mcc: cols[mcc],
              mnc: cols[mnc],
              operatorName: op >= 0 ? cols[op] : '',
              networkType: headers.indexOf('network_type') >= 0 ? cols[headers.indexOf('network_type')] : 'LTE',
              isActive: true,
            });
            success++;
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err}`);
          failed++;
        }
      }
      setUploadResult({ success, failed, errors });
      setUploading(false);
    };
    reader.readAsText(file);
  };

  const sel = "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload</h1>
          <p className="text-gray-500">Import rates, MCC/MNC data, and campaign numbers from CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Upload Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Type</label>
                <select value={uploadType} onChange={e => { setUploadType(e.target.value as UploadType); setEntityId(''); setUploadResult(null); }} className={sel}>
                  <option value="client_rates">Client Rates</option>
                  <option value="supplier_rates">Supplier Rates</option>
                  <option value="mccmnc">MCC/MNC Database</option>
                  <option value="campaign_numbers">Campaign Numbers</option>
                </select>
              </div>

              {(uploadType === 'client_rates' || uploadType === 'supplier_rates') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{uploadType === 'client_rates' ? 'Client' : 'Supplier'} *</label>
                  <select value={entityId} onChange={e => setEntityId(e.target.value)} required className={sel}>
                    <option value="">Select...</option>
                    {uploadType === 'client_rates'
                      ? clients.map(c => <option key={c.id} value={c.id}>{c.clientCode} — {c.companyName}</option>)
                      : suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierCode} — {s.companyName}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={downloadTemplate} className="flex-1">
                  <Download className="w-4 h-4" /> Template
                </Button>
                <Button variant="secondary" onClick={exportCurrentData} className="flex-1">
                  <FileText className="w-4 h-4" /> Export
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV File</label>
                <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to select CSV file</span>
                  <input type="file" className="hidden" accept=".csv" onChange={e => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }} />
                </label>
              </div>

              {uploading && <p className="text-sm text-blue-600 animate-pulse">Processing file...</p>}

              {uploadResult && (
                <div className={`p-4 rounded-lg border ${uploadResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {uploadResult.failed === 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    <span className="font-semibold text-gray-900">Upload Complete</span>
                  </div>
                  <p className="text-sm text-green-700">✅ {uploadResult.success} rows imported</p>
                  {uploadResult.failed > 0 && <p className="text-sm text-red-600">❌ {uploadResult.failed} rows failed</p>}
                  {uploadResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600">
                      {uploadResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Template Preview */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              {tpl.name} — CSV Format
            </h3>
            <p className="text-sm text-gray-500 mb-4">{tpl.desc}</p>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>{tpl.headers.map(h => <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase border-b">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tpl.sample.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      {row.map((cell, j) => <td key={j} className="px-3 py-2 font-mono text-xs text-gray-700">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-1">Raw CSV Format:</p>
              <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">{[tpl.headers.join(','), ...tpl.sample.map(r => r.join(','))].join('\n')}</pre>
            </div>

            {uploadType === 'client_rates' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <p className="font-semibold mb-1">Notes:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Rate must be in DECIMAL(10,6) format: <code className="bg-blue-100 px-1 rounded">0.012000</code></li>
                  <li>MCC/MNC must match your MCC/MNC database entries</li>
                  <li>Currency defaults to USD if not specified</li>
                  <li>Existing rates for same MCC/MNC are NOT overwritten (new entry added)</li>
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
