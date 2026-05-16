import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle, XCircle,
  MessageSquare, Clock, Shield, Terminal, Send, AlertTriangle, Copy
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useStore } from '../../store';

type PairStatus = 'idle' | 'generating' | 'waiting' | 'scanning' | 'paired' | 'error';
type OttPlatform = 'whatsapp' | 'telegram';

interface PairedSession {
  id: string;
  platform: OttPlatform;
  phone: string;
  name: string;
  status: 'connected' | 'disconnected';
  pairedAt: string;
  lastActivity?: string;
  messagesSent: number;
  messagesReceived: number;
}

export function OttPairingPage() {
  const { suppliers } = useStore();
  const [platform, setPlatform] = useState<OttPlatform>('whatsapp');
  const [pairStatus, setPairStatus] = useState<PairStatus>('idle');
  const [qrData, setQrData] = useState<string>('');
  const [qrExpiry, setQrExpiry] = useState(0);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<PairedSession[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const ottSuppliers = suppliers.filter(s => s.connectionType === 'ott_device');

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  // ── Generate QR Code ──
  const startPairing = useCallback(async () => {
    setPairStatus('generating');
    setError('');
    addLog(`Initializing ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'} pairing engine...`);

    // Simulate fetching QR from the Node.js gateway server
    // In production: GET /api/gateway/status → { qr: "...", status: "waiting" }
    setTimeout(() => {
      // Generate a realistic-looking QR payload
      const sessionId = `${platform}_${Date.now().toString(36)}`;
      const qrPayload = platform === 'whatsapp'
        ? `2@${btoa(sessionId + ':net2app-sms-hub').slice(0, 40)},${btoa(Math.random().toString()).slice(0, 30)},${btoa(Date.now().toString()).slice(0, 20)}`
        : `tg://login?token=${btoa(sessionId).slice(0, 32)}&dc=2&hash=${Math.random().toString(36).slice(2, 14)}`;

      setQrData(qrPayload);
      setPairStatus('waiting');
      setQrExpiry(60);
      addLog(`QR code generated for ${platform}. Waiting for device scan...`);
      addLog(`Session: ${sessionId}`);
      addLog(`Gateway endpoint: /api/gateway/status`);
    }, 1500);
  }, [platform, addLog]);

  // ── QR Expiry Timer ──
  useEffect(() => {
    if (pairStatus !== 'waiting' || qrExpiry <= 0) return;
    const timer = setInterval(() => {
      setQrExpiry(prev => {
        if (prev <= 1) {
          setPairStatus('idle');
          setQrData('');
          addLog('QR code expired. Click "Generate QR" to try again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairStatus, qrExpiry, addLog]);

  // ── Simulate successful pairing after QR scan ──
  const simulatePair = useCallback(() => {
    setPairStatus('scanning');
    addLog('Device detected! Authenticating...');
    setTimeout(() => {
      const session: PairedSession = {
        id: `sess_${Date.now().toString(36)}`,
        platform,
        phone: '+880' + (1700000000 + Math.floor(Math.random() * 99999999)),
        name: platform === 'whatsapp' ? 'WhatsApp Business' : 'Telegram Bot',
        status: 'connected',
        pairedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messagesSent: 0,
        messagesReceived: 0,
      };
      setSessions(prev => [session, ...prev]);
      setPairStatus('paired');
      setQrData('');
      addLog(`✅ Successfully paired! Phone: ${session.phone}`);
      addLog(`Session ID: ${session.id}`);
      addLog(`Webhook registered: POST /api/gateway/webhook/${session.id}`);
      addLog(`SMS Hook: curl -X POST http://127.0.0.1:8000/api/sms/inject -d '{"receiver":"...", "msgdata":"...", "smsc_id":"${session.id}"}'`);
    }, 2000);
  }, [platform, addLog]);

  const disconnectSession = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'disconnected' } : s));
    addLog(`Session ${sessionId} disconnected`);
  };

  const copyText = (t: string) => { navigator.clipboard.writeText(t); };

  const sel = "w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            OTT Device Pairing
          </h1>
          <p className="text-gray-500">Pair WhatsApp / Telegram devices via QR code for message routing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: QR Code Panel ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-green-600" /> New Device Pairing</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value as OttPlatform)} className={sel} disabled={pairStatus === 'waiting'}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            {/* QR Display Area */}
            <div className="flex flex-col items-center py-6">
              {pairStatus === 'idle' && (
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                  <Smartphone className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">Click Generate QR</p>
                </div>
              )}

              {pairStatus === 'generating' && (
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <p className="text-sm text-gray-500">Generating...</p>
                </div>
              )}

              {pairStatus === 'waiting' && qrData && (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-3 bg-white rounded-xl border-2 border-green-400 shadow-lg">
                    <QRCodeSVG
                      value={qrData}
                      size={192}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className={`font-mono font-bold ${qrExpiry < 15 ? 'text-red-600' : 'text-orange-600'}`}>{qrExpiry}s</span>
                    <span className="text-gray-500">remaining</span>
                  </div>
                  <p className="text-xs text-gray-500 text-center max-w-[200px]">
                    Open {platform === 'whatsapp' ? 'WhatsApp → Linked Devices → Link a Device' : 'Telegram → Settings → Devices → Link Desktop Device'} and scan this QR code
                  </p>
                  {/* Simulate successful scan button (for demo) */}
                  <button onClick={simulatePair} className="text-xs text-blue-600 hover:underline mt-2">
                    [Demo] Simulate successful scan
                  </button>
                </div>
              )}

              {pairStatus === 'scanning' && (
                <div className="w-48 h-48 bg-green-50 rounded-xl flex flex-col items-center justify-center border-2 border-green-400">
                  <RefreshCw className="w-8 h-8 text-green-500 animate-spin mb-2" />
                  <p className="text-sm text-green-700 font-medium">Authenticating...</p>
                </div>
              )}

              {pairStatus === 'paired' && (
                <div className="w-48 h-48 bg-green-50 rounded-xl flex flex-col items-center justify-center border-2 border-green-400">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                  <p className="text-sm text-green-700 font-bold">Paired!</p>
                </div>
              )}

              {pairStatus === 'error' && (
                <div className="w-48 h-48 bg-red-50 rounded-xl flex flex-col items-center justify-center border-2 border-red-300">
                  <XCircle className="w-12 h-12 text-red-500 mb-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <Button
              onClick={startPairing}
              disabled={pairStatus === 'generating' || pairStatus === 'scanning'}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4" />
              {pairStatus === 'waiting' ? 'Regenerate QR' : 'Generate QR Code'}
            </Button>
          </Card>

          {/* Architecture Info */}
          <Card className="bg-gray-900 text-white border-gray-700">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Shield className="w-4 h-4 text-green-400" /> Production Setup</h4>
            <div className="space-y-2 text-xs text-gray-300 font-mono">
              <p className="text-yellow-400">// Node.js Gateway (server.js)</p>
              <p>▸ Port 3000 behind Nginx SSL proxy</p>
              <p>▸ /api/gateway/status → QR JSON</p>
              <p>▸ /api/gateway/send → Send message</p>
              <p className="text-yellow-400 mt-2">// SMS Hook to Kannel</p>
              <p>{"▸ curl -X POST http://127.0.0.1:8000"}</p>
              <p>{"  /api/sms/inject"}</p>
              <p>{"  -d '{\"receiver\":\"...\","}</p>
              <p>{"       \"msgdata\":\"...\",'"}  </p>
              <p>{"       \"smsc_id\":\"ott_wa\"}'"}  </p>
            </div>
          </Card>
        </div>

        {/* ── Center: Active Sessions ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Active Sessions ({sessions.filter(s => s.status === 'connected').length})
            </h3>

            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No devices paired yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(sess => (
                  <div key={sess.id} className={`p-3 rounded-lg border ${sess.status === 'connected' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {sess.status === 'connected'
                          ? <Wifi className="w-4 h-4 text-green-500" />
                          : <WifiOff className="w-4 h-4 text-gray-400" />}
                        <span className="font-semibold text-sm text-gray-900">
                          {sess.platform === 'whatsapp' ? '📱 WhatsApp' : '✈️ Telegram'}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sess.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {sess.status}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p>Phone: <span className="font-mono text-gray-900">{sess.phone}</span></p>
                      <p>Session: <span className="font-mono text-gray-500">{sess.id}</span></p>
                      <p>Paired: {new Date(sess.pairedAt).toLocaleString()}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-green-600">↑ Sent: {sess.messagesSent}</span>
                        <span className="text-blue-600">↓ Recv: {sess.messagesReceived}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {sess.status === 'connected' && (
                        <button onClick={() => disconnectSession(sess.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Disconnect</button>
                      )}
                      <button onClick={() => copyText(`/api/gateway/send/${sess.id}`)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"><Copy className="w-3 h-3" />API</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Webhook & API reference */}
          <Card>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2"><Send className="w-4 h-4 text-orange-500" /> Send via Paired Device</h4>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto">
              <p className="text-gray-500"># Send message through paired device</p>
              <p>curl -X POST \</p>
              <p>  http://localhost:8000/api/gateway/send \</p>
              <p>  -H "Content-Type: application/json" \</p>
              <p>  -d '{`{`}</p>
              <p>    "session_id": "sess_xxx",</p>
              <p>    "to": "+8801711234567",</p>
              <p>    "message": "Hello from net2app"</p>
              <p>  {`}`}'</p>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              Wrap port 3000 behind Nginx SSL proxy. Never expose raw websocket to public.
            </div>
          </Card>
        </div>

        {/* ── Right: Connection Logs ── */}
        <div className="lg:col-span-1">
          <Card padding="none" className="h-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Terminal className="w-4 h-4 text-gray-500" /> Connection Logs</h3>
              <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
            </div>
            <div className="p-3 max-h-[600px] overflow-y-auto bg-gray-950 font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No logs yet. Generate a QR code to start.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`py-0.5 ${log.includes('✅') ? 'text-green-400' : log.includes('Error') || log.includes('expired') ? 'text-red-400' : log.includes('curl') || log.includes('Webhook') ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── OTT Suppliers List ── */}
      {ottSuppliers.length > 0 && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Configured OTT Suppliers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ottSuppliers.map(s => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium">{s.supplierCode}</td>
                    <td className="px-4 py-2">OTT Device</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">${s.balance.toFixed(2)}</td>
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
