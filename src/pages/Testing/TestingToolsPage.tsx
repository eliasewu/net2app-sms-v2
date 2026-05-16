import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, Wifi, Globe, FlaskConical, CheckCircle, XCircle,
  Clock, AlertTriangle, Play, Plus, RotateCcw,
  ArrowRight, Zap, Eye, Terminal, Shield, Radio,
  Smartphone, Search, Ban, Cpu
} from 'lucide-react';
import { useStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { resolveDestination, getClientRate, getSupplierRate, calcProfit, canCharge, generateMsgId } from '../../lib/billing';
import { applyTranslations } from '../../lib/translation';

type TestTab = 'send_sms' | 'smpp_bind' | 'http_api' | 'tools';
const pathToTab: Record<string, TestTab> = { '/testing/sms': 'send_sms', '/testing/smpp': 'smpp_bind', '/testing/http': 'http_api', '/testing/tools': 'tools' };

type RouteVerdict = 'WHITE_ROUTE' | 'FAKE_DLR' | 'GREY_ROUTE' | 'CONTENT_FILTERED' | 'PENDING' | 'CLEAN';
interface RouteTestResult {
  id: string; msisdn: string; senderId: string; content: string;
  providerStatus: string; providerLatency: number; providerTimestamp: string;
  handsetReceived: boolean; handsetSid: string; handsetContent: string; handsetTimestamp: string;
  verdict: RouteVerdict; verdictLabel: string; verdictDetail: string;
  smscId: string; messageId: string; mcc: string; mnc: string; country: string; operator: string;
  clientCode: string; routeName: string;
}
interface TestStep { label: string; status: 'idle' | 'active' | 'done' | 'error'; detail?: string; }
interface PduLog { time: string; direction: 'OUT' | 'IN'; type: string; hex: string; decoded: string; }
interface HttpApiProfile { id: string; name: string; sendUrl: string; dlrUrl: string; method: 'GET' | 'POST'; apiKey: string; dlrDeliveredValue: string; }

export function TestingToolsPage() {
  const { clients, suppliers, routes, addSmsLog } = useStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TestTab>(pathToTab[location.pathname] || 'send_sms');
  useEffect(() => { const t = pathToTab[location.pathname]; if (t) setActiveTab(t); }, [location.pathname]);

  // helper to push a test sms into the global SMS Logs store (full CDR)
  const logToSmsLogs = useCallback((params: {
    messageId: string; clientId: string; clientCode: string; supplierId: string; supplierCode: string;
    sourceAddr: string; destinationAddr: string; messageContent: string;
    mcc: string; mnc: string; country: string; operator: string;
    routeId: string; trunkId: string; clientRate: number; supplierRate: number;
    status: 'pending' | 'submitted' | 'delivered' | 'failed' | 'expired' | 'rejected';
    submitTime: string; deliverTime?: string; destContent?: string; routeName?: string;
    oriReceiver?: string;
  }) => {
    const now = new Date().toISOString();
    addSmsLog({
      messageId: params.messageId,
      clientId: params.clientId, clientCode: params.clientCode,
      clientAlias: params.clientCode,
      srcType: 'TEST', msgType: 'SMS', sendType: 'SMSC',
      supplierId: params.supplierId, supplierCode: params.supplierCode,
      sourceAddr: params.sourceAddr,
      oriReceiver: params.oriReceiver || params.destinationAddr,
      destinationAddr: params.destinationAddr,
      messageContent: params.messageContent,
      destSmsContent: params.destContent || params.messageContent,
      smsBytes: new TextEncoder().encode(params.messageContent).length,
      destSmsBytes: new TextEncoder().encode(params.destContent || params.messageContent).length,
      mcc: params.mcc, mnc: params.mnc, country: params.country, operator: params.operator,
      routeId: params.routeId, routeName: params.routeName, trunkId: params.trunkId,
      clientRate: params.clientRate, supplierRate: params.supplierRate,
      profit: Math.round((params.clientRate - params.supplierRate) * 1e6) / 1e6,
      chargedPoints: 1,
      billingType: 'submit',
      status: params.status,
      sendResult: params.status,
      sendReason: params.status === 'delivered' ? 'success' : params.status === 'failed' ? 'failed' : 'pending',
      deliverResult: params.deliverTime ? 'Success' : undefined,
      inMsgId: params.messageId,
      outMsgId: generateMsgId(),
      submitTime: params.submitTime,
      sendTime: params.submitTime,
      deliverTime: params.deliverTime,
      doneTime: params.deliverTime || now,
      duration: params.deliverTime ? Math.round((new Date(params.deliverTime).getTime() - new Date(params.submitTime).getTime()) / 1000) : undefined,
      deliverDuration: params.deliverTime ? Math.round((new Date(params.deliverTime).getTime() - new Date(params.submitTime).getTime()) / 1000) : undefined,
      partsCount: 1,
    });
  }, [addSmsLog]);

  // ═══════════ TAB 1: ROUTE TESTER ═══════════
  const [smsForm, setSmsForm] = useState({ destination: '', senderId: 'facebook', content: 'Your code is 482910', clientId: '', routeId: '' });
  const [routeTests, setRouteTests] = useState<RouteTestResult[]>([]);
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    { label: 'Injecting', status: 'idle' }, { label: 'Routing', status: 'idle' },
    { label: 'SMSC Submit', status: 'idle' }, { label: 'Provider DLR', status: 'idle' },
    { label: 'Handset Probe', status: 'idle' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [pduLogs, setPduLogs] = useState<PduLog[]>([]);
  const pduRef = useRef<HTMLDivElement>(null);
  const addPdu = useCallback((dir: 'OUT' | 'IN', type: string, hex: string, decoded: string) => {
    setPduLogs(prev => [...prev, { time: new Date().toISOString().slice(11, 23), direction: dir, type, hex, decoded }]);
  }, []);

  const runRouteTest = useCallback(() => {
    if (!smsForm.destination || isRunning) return;
    setIsRunning(true); setPduLogs([]);
    setTestSteps(prev => prev.map(s => ({ ...s, status: 'idle' as const })));

    // ── Generate hex message ID (like real SMSC) ──
    const msgId = generateMsgId();

    // ── Read FRESH state from store (avoids stale closure) ──
    const storeState = useStore.getState();
    const client = storeState.clients.find(c => c.id === smsForm.clientId);
    const route = storeState.routes.find(r => r.id === smsForm.routeId);
    const allRates = storeState.rates;
    const allMccMnc = storeState.mccMnc;
    const allSuppliers = storeState.suppliers;
    const clientCode = client?.clientCode || 'TEST_CLIENT';
    const routeName = route?.name || 'Auto';

    // ── APPLY CLIENT TRANSLATIONS (SID, Content, Number, OTP, Random) ──
    const clientTranslations = storeState.translations.filter(t => t.entityType === 'client' && t.entityId === smsForm.clientId);
    const translated = applyTranslations(clientTranslations, smsForm.senderId, smsForm.destination, smsForm.content);
    const finalSid = translated.sourceAddr;
    const finalDst = translated.destinationAddr;
    const finalContent = translated.messageContent;

    // Log applied translations in PDU
    if (translated.appliedTranslations.length > 0) {
      addPdu('OUT', 'translation', '', translated.appliedTranslations.join(' | '));
    }

    // ── RESOLVE DESTINATION → MCC/MNC/COUNTRY/OPERATOR ──
    const dest = resolveDestination(finalDst, allMccMnc);

    // ── SUPPLIER SELECTION ──
    const supplier = allSuppliers.length > 0 ? allSuppliers[0] : null;
    const supplierId = supplier?.id || '';
    const supplierCode = supplier?.supplierCode || 'Auto';

    // ── APPLY SUPPLIER TRANSLATIONS ──
    const supplierTranslations = storeState.translations.filter(t => t.entityType === 'supplier' && t.entityId === supplierId);
    const supTranslated = applyTranslations(supplierTranslations, finalSid, finalDst, finalContent);
    const destContent = supTranslated.messageContent;
    const destSid = supTranslated.sourceAddr;
    const destDst = supTranslated.destinationAddr;

    if (supTranslated.appliedTranslations.length > 0) {
      addPdu('OUT', 'sup_translation', '', supTranslated.appliedTranslations.join(' | '));
    }

    // ── RATE LOOKUP — read from rates table directly ──
    const cRate = client ? getClientRate(client.id, dest.mcc, dest.mnc, allRates) : 0;
    const sRate = supplierId ? getSupplierRate(supplierId, dest.mcc, dest.mnc, allRates) : 0;
    const profit = calcProfit(cRate, sRate);

    // ── BALANCE CHECK ──
    if (client && cRate > 0 && !canCharge(client, cRate)) {
      addPdu('OUT', 'REJECTED', '', `Insufficient balance: $${client.balance.toFixed(6)} < rate $${cRate.toFixed(6)}`);
      setTestSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'error', detail: `REJECTED: Balance $${client.balance.toFixed(4)} < Rate $${cRate.toFixed(4)}` } : s));
      setIsRunning(false);
      return;
    }

    // ── DEDUCT CLIENT BALANCE (send/submit billing) ──
    if (client && cRate > 0 && (client.billingMode === 'send' || client.billingMode === 'submit')) {
      const newBal = Math.round((client.balance - cRate) * 1e6) / 1e6;
      storeState.updateClient(client.id, { balance: newBal });
    }

    const scenarios: { providerStatus: string; providerLatency: number; handsetReceived: boolean; handsetSid: string; handsetContent: string; verdict: RouteVerdict; label: string; detail: string; finalStatus: 'delivered' | 'failed' }[] = [
      { providerStatus: 'DELIVRD', providerLatency: 6200 + Math.random() * 4000, handsetReceived: true, handsetSid: smsForm.senderId, handsetContent: smsForm.content, verdict: 'WHITE_ROUTE', label: 'WHITE ROUTE ✓', detail: 'Clean delivery. SID and content match.', finalStatus: 'delivered' },
      { providerStatus: 'DELIVRD', providerLatency: 180 + Math.random() * 200, handsetReceived: false, handsetSid: '', handsetContent: '', verdict: 'FAKE_DLR', label: 'FAKE DLR ✗', detail: 'Provider DLR in <1s but handset never received.', finalStatus: 'failed' },
      { providerStatus: 'DELIVRD', providerLatency: 4500 + Math.random() * 3000, handsetReceived: true, handsetSid: '+447' + Math.floor(Math.random() * 9e6 + 1e6), handsetContent: smsForm.content, verdict: 'GREY_ROUTE', label: 'GREY ROUTE ⚠', detail: `SID changed from "${smsForm.senderId}" to long code.`, finalStatus: 'delivered' },
      { providerStatus: 'DELIVRD', providerLatency: 5800 + Math.random() * 2000, handsetReceived: false, handsetSid: '', handsetContent: '', verdict: 'CONTENT_FILTERED', label: 'CONTENT FILTERED ✗', detail: 'DLR=DELIVRD but blocked by firewall.', finalStatus: 'failed' },
    ];
    const sc = scenarios[Math.floor(Math.random() * scenarios.length)];
    const submitTime = new Date().toISOString();

    // ── PROGRESS ANIMATION ──
    setTimeout(() => { setTestSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active', detail: `Billing: Client $${cRate.toFixed(6)}, Supplier $${sRate.toFixed(6)}, Profit $${profit.toFixed(6)}` } : s)); addPdu('OUT', 'submit_sm', `0x${msgId}`, `src: ${smsForm.senderId} | dst: ${smsForm.destination} | client_rate: $${cRate.toFixed(6)} | supplier_rate: $${sRate.toFixed(6)}`); }, 200);
    setTimeout(() => { setTestSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'done', detail: `${dest.country} ${dest.operator} (${dest.mcc}/${dest.mnc})` } : i === 1 ? { ...s, status: 'active', detail: 'Routing...' } : s)); addPdu('IN', 'submit_sm_resp', `ESME_ROK`, `msg_id: 0x${msgId} | profit: $${profit.toFixed(6)}`); }, 900);
    setTimeout(() => { setTestSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'done', detail: `Route: ${routeName}` } : i === 2 ? { ...s, status: 'active', detail: `→ ${supplierCode}` } : s)); addPdu('OUT', 'submit_sm (upstream)', `smsc: ${supplierCode}`, `dst: ${smsForm.destination}`); }, 1800);
    setTimeout(() => { setTestSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'done' } : i === 3 ? { ...s, status: 'active', detail: 'Waiting DLR...' } : s)); }, 2800);
    const dlrDelay = sc.providerLatency;
    setTimeout(() => { addPdu('IN', 'deliver_sm', sc.verdict === 'FAKE_DLR' ? '⚡ FAST' : '', `state: ${sc.providerStatus} | ${Math.round(dlrDelay)}ms`); setTestSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'done', detail: `${sc.providerStatus} (${Math.round(dlrDelay)}ms)` } : i === 4 ? { ...s, status: 'active', detail: 'Probing...' } : s)); }, 3200 + Math.min(dlrDelay / 5, 1000));

    // ── FINAL: One single CDR entry with correct rates ──
    setTimeout(() => {
      const now = new Date();
      setTestSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: sc.handsetReceived ? 'done' : 'error', detail: sc.handsetReceived ? `SID: ${sc.handsetSid}` : 'NOT RECEIVED' } : s));
      addPdu('IN', 'handset_probe', '', sc.handsetReceived ? `RECEIVED | sid: "${sc.handsetSid}"` : 'NOT_RECEIVED');

      // DLR billing: if mode='dlr' and delivered, deduct now
      if (client && client.billingMode === 'dlr' && sc.finalStatus === 'delivered' && cRate > 0) {
        const freshClient = useStore.getState().clients.find(c => c.id === client.id);
        if (freshClient) {
          useStore.getState().updateClient(client.id, { balance: Math.round((freshClient.balance - cRate) * 1e6) / 1e6 });
        }
      }

      // ── SINGLE CDR ENTRY with proper billing + translation ──
      logToSmsLogs({
        messageId: `0x${msgId}`,
        clientId: smsForm.clientId || 'test', clientCode,
        supplierId, supplierCode,
        sourceAddr: destSid,              // SID after all translations
        destinationAddr: destDst,         // Number after translations
        messageContent: finalContent,     // Content after client translation
        destContent: destContent,         // Content after supplier translation
        mcc: dest.mcc, mnc: dest.mnc, country: dest.country, operator: dest.operator,
        routeId: smsForm.routeId || '', trunkId: '',
        routeName: routeName,
        clientRate: cRate, supplierRate: sRate,
        status: sc.finalStatus,
        submitTime,
        deliverTime: sc.handsetReceived ? now.toISOString() : undefined,
      });

      setRouteTests(prev => [{
        id: uuidv4(), msisdn: smsForm.destination, senderId: smsForm.senderId, content: smsForm.content,
        providerStatus: sc.providerStatus, providerLatency: Math.round(dlrDelay),
        providerTimestamp: new Date(now.getTime() - dlrDelay).toISOString(),
        handsetReceived: sc.handsetReceived, handsetSid: sc.handsetSid,
        handsetContent: sc.handsetContent, handsetTimestamp: sc.handsetReceived ? now.toISOString() : '',
        verdict: sc.verdict, verdictLabel: sc.label, verdictDetail: sc.detail,
        smscId: supplierCode, messageId: `0x${msgId}`,
        mcc: dest.mcc, mnc: dest.mnc, country: dest.country, operator: dest.operator,
        clientCode, routeName,
      }, ...prev]);
      setIsRunning(false);
    }, 5500 + Math.random() * 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smsForm, isRunning, addPdu, logToSmsLogs]);

  // ═══════════ TAB 2: SMPP BIND ═══════════
  const [smppForm, setSmppForm] = useState({ host: '', port: '2775', username: '', password: '', systemType: '', bindType: 'transceiver', entityType: 'client', entityId: '' });
  const [smppResult, setSmppResult] = useState<{ status: string; detail: string; raw: string } | null>(null);
  const [smppTesting, setSmppTesting] = useState(false);
  const handleSmppTest = () => {
    let host = smppForm.host, user = smppForm.username;
    if (smppForm.entityId && smppForm.entityType === 'client') { const c = clients.find(x => x.id === smppForm.entityId); if (c) { host = c.smppIp || 'localhost'; user = c.smppUsername; } }
    if (smppForm.entityId && smppForm.entityType === 'supplier') { const s = suppliers.find(x => x.id === smppForm.entityId); if (s) { host = s.smppHost; user = s.smppUsername; } }
    if (!host || !user) { setSmppResult({ status: 'error', detail: 'Host and username required', raw: '' }); return; }
    setSmppTesting(true); setSmppResult(null);
    setTimeout(() => {
      const ok = Math.random() > 0.25;
      setSmppResult(ok ? { status: 'BOUND', detail: `BIND_${smppForm.bindType.toUpperCase()} successful`, raw: `>> BIND_TRANSCEIVER system_id="${user}"\n<< BIND_TRANSCEIVER_RESP status=ESME_ROK\n>> ENQUIRE_LINK seq=1\n<< ENQUIRE_LINK_RESP seq=1 ESME_ROK` } : { status: 'FAILED', detail: 'BIND rejected', raw: `>> BIND_TRANSCEIVER system_id="${user}"\n<< BIND_TRANSCEIVER_RESP status=ESME_RINVPASWD(0x0E)\nConnection closed` });
      setSmppTesting(false);
    }, 1200 + Math.random() * 800);
  };

  // ═══════════ TAB 3: HTTP API ═══════════
  const [apiProfiles, setApiProfiles] = useState<HttpApiProfile[]>([
    { id: uuidv4(), name: 'Borno OTP API', sendUrl: 'https://backborno.xyz/otpsend?apiKey={{apiKey}}&msisdn={{dst}}&code={{message}}', dlrUrl: 'https://backborno.xyz/otp-delivery-check?apiKey={{apiKey}}&trans_id={{message_id}}', method: 'GET', apiKey: 'f72c277482e41ff5b5db1ed8bc1ea9b9168ad0ea041b06e5132d1d6bcb991eee', dlrDeliveredValue: 'Delivered' },
  ]);
  const [selProfile, setSelProfile] = useState(apiProfiles[0]?.id || '');
  const [apiForm, setApiForm] = useState({ destination: '', message: '123456', messageId: '' });
  const [apiResults, setApiResults] = useState<{ type: string; status: string; url: string; response: string; latency: number }[]>([]);
  const [showAddApi, setShowAddApi] = useState(false);
  const [newApi, setNewApi] = useState({ name: '', sendUrl: '', dlrUrl: '', apiKey: '' });
  const runApiTest = (mode: 'send' | 'dlr') => {
    const p = apiProfiles.find(x => x.id === selProfile); if (!p) return;
    const url = (mode === 'send' ? p.sendUrl : p.dlrUrl).replace('{{apiKey}}', p.apiKey).replace('{{dst}}', apiForm.destination).replace('{{message}}', apiForm.message).replace('{{message_id}}', apiForm.messageId);
    const start = Date.now();
    setTimeout(() => {
      if (mode === 'send') {
        const tid = `OTP_${uuidv4().slice(0, 16)}`;
        setApiForm(prev => ({ ...prev, messageId: tid }));
        setApiResults(prev => [{ type: 'SEND', status: '200 OK', url, response: `{"code":200,"message":"OTP sent","trans_id":"${tid}"}`, latency: Date.now() - start }, ...prev]);
      } else {
        const del = Math.random() > 0.3;
        setApiResults(prev => [{ type: 'DLR', status: del ? '200 OK' : '200 Pending', url, response: del ? `{"code":200,"info":{"status":"Delivered"}}` : `{"code":200,"info":{"status":"Pending"}}`, latency: Date.now() - start }, ...prev]);
      }
    }, 400 + Math.random() * 600);
  };

  // ═══════════ TAB 4: TOOLS ═══════════
  const [toolInput, setToolInput] = useState({
    messageId: '', dlrStatus: 'DELIVRD', destination: '', sid: '', content: '',
    routeId: '', supplierId: '',
    enableFakeDlr: true, enableTestDest: true, enableTestSid: true, enableTestContent: true, enableDlrQuery: true,
  });
  const [toolResults, setToolResults] = useState<{ id: string; type: string; verdict: string; data: string; route?: string; time: string }[]>([]);
  const [toolsRunning, setToolsRunning] = useState(false);
  const getRouteLabel = () => { const r = routes.find(x => x.id === toolInput.routeId); return r ? r.name : 'Auto'; };
  const getSupplierLabel = () => { const s = suppliers.find(x => x.id === toolInput.supplierId); return s ? s.supplierCode : 'Auto'; };

  const toolLog = useCallback((msgId: string, status: 'delivered' | 'failed' | 'submitted', content: string) => {
    const state = useStore.getState();
    const dest = toolInput.destination ? resolveDestination(toolInput.destination, state.mccMnc) : { mcc: '000', mnc: '00', country: 'Test', operator: 'Test', countryCode: '??' };
    const sid = toolInput.supplierId || (state.suppliers.length > 0 ? state.suppliers[0].id : '');
    const sc = state.suppliers.find(s => s.id === sid);
    const sRate = sid ? getSupplierRate(sid, dest.mcc, dest.mnc, state.rates) : 0;
    logToSmsLogs({
      messageId: msgId, clientId: 'test', clientCode: 'TEST_TOOL',
      supplierId: sid, supplierCode: sc?.supplierCode || getSupplierLabel(),
      sourceAddr: 'TOOL', destinationAddr: toolInput.destination || 'N/A',
      messageContent: content, mcc: dest.mcc, mnc: dest.mnc, country: dest.country, operator: dest.operator,
      routeId: toolInput.routeId || '', trunkId: '', clientRate: 0, supplierRate: sRate,
      status, submitTime: new Date().toISOString(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolInput.supplierId, toolInput.routeId, toolInput.destination, logToSmsLogs]);

  const execFakeDlr = () => {
    const mid = toolInput.messageId || `MSG_${Date.now()}`;
    toolLog(mid, toolInput.dlrStatus === 'DELIVRD' ? 'delivered' : 'failed', `[FAKE DLR] ${toolInput.dlrStatus}`);
    setToolResults(prev => [{ id: uuidv4(), type: '🔧 FAKE DLR', verdict: 'success', route: getRouteLabel(), time: new Date().toLocaleTimeString(), data: JSON.stringify({ message_id: mid, dlr_status: toolInput.dlrStatus, injected_at: new Date().toISOString(), route: getRouteLabel(), supplier: getSupplierLabel(), logged_to_sms_logs: true }, null, 2) }, ...prev]);
  };
  const execTestDest = () => {
    const dest = toolInput.destination; const valid = /^\+?\d{10,15}$/.test(dest);
    const cMap: Record<string, { c: string; mcc: string; mnc: string; op: string }> = { '880': { c: 'Bangladesh', mcc: '470', mnc: '01', op: 'Grameenphone' }, '91': { c: 'India', mcc: '404', mnc: '10', op: 'Airtel' }, '1': { c: 'USA', mcc: '310', mnc: '410', op: 'AT&T' }, '971': { c: 'UAE', mcc: '424', mnc: '02', op: 'Etisalat' }, '44': { c: 'UK', mcc: '234', mnc: '10', op: 'O2' }, '966': { c: 'Saudi Arabia', mcc: '420', mnc: '01', op: 'STC' } };
    const clean = dest.replace(/^\+/, ''); const m = Object.entries(cMap).find(([p]) => clean.startsWith(p));
    const info = m ? m[1] : { c: 'Unknown', mcc: '000', mnc: '00', op: 'Unknown' };
    const hlr = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'PORTED'][Math.floor(Math.random() * 5)];
    toolLog(`HLR_${Date.now()}`, valid ? 'submitted' : 'failed', `[HLR] ${dest} → ${info.c} ${info.op} ${hlr}`);
    setToolResults(prev => [{ id: uuidv4(), type: '📱 DESTINATION + HLR', verdict: valid ? (hlr === 'ACTIVE' ? 'success' : 'warning') : 'fail', route: getRouteLabel(), time: new Date().toLocaleTimeString(), data: JSON.stringify(valid ? { valid: true, e164: dest.startsWith('+') ? dest : '+' + dest, country: info.c, mcc: info.mcc, mnc: info.mnc, operator: info.op, hlr: { status: hlr, imsi: hlr === 'ACTIVE' ? `${info.mcc}${info.mnc}${Math.floor(Math.random() * 9e9 + 1e9)}` : null, ported: hlr === 'PORTED' }, route: getRouteLabel(), supplier: getSupplierLabel(), logged: true } : { valid: false, error: 'Invalid E.164' }, null, 2) }, ...prev]);
  };
  const execTestSid = () => {
    const sid = toolInput.sid; const isA = /^[a-zA-Z0-9 ]{1,11}$/.test(sid); const isN = /^\+?\d{1,15}$/.test(sid);
    toolLog(`SID_${Date.now()}`, isA || isN ? 'submitted' : 'failed', `[SID] "${sid}" → ${isA ? 'ALPHA' : isN ? 'NUMERIC' : 'INVALID'}`);
    setToolResults(prev => [{ id: uuidv4(), type: '🏷️ SENDER ID', verdict: isA || isN ? 'success' : 'fail', route: getRouteLabel(), time: new Date().toLocaleTimeString(), data: JSON.stringify({ sender_id: sid, type: isA ? 'ALPHANUMERIC' : isN ? 'NUMERIC' : 'INVALID', length: sid.length, valid: isA || isN, restrictions: { allowed: ['US', 'UK', 'BD', 'IN'], blocked: ['SA', 'AE'].filter(() => Math.random() > 0.5) }, logged: true }, null, 2) }, ...prev]);
  };
  const execTestContent = () => {
    const c = toolInput.content; if (!c) return;
    const gsm = /^[\x20-\x7E\n\r]*$/.test(c); const mp = gsm ? (c.length > 160 ? 153 : 160) : (c.length > 70 ? 67 : 70);
    const parts = Math.ceil(c.length / mp); const otp = (c.match(/\b(\d{4,8})\b/) || [null])[0];
    const kw = ['free', 'win', 'prize', 'click', 'buy', 'offer', 'urgent'].filter(k => c.toLowerCase().includes(k));
    const spam = Math.min(kw.length * 15 + (c === c.toUpperCase() ? 20 : 0), 100);
    toolLog(`CNT_${Date.now()}`, 'submitted', `[CONTENT] ${c.slice(0, 40)}... | ${gsm ? 'GSM' : 'UCS2'} | ${parts}pt | spam:${spam}`);
    setToolResults(prev => [{ id: uuidv4(), type: '📝 CONTENT', verdict: spam < 40 ? 'success' : 'warning', route: getRouteLabel(), time: new Date().toLocaleTimeString(), data: JSON.stringify({ encoding: gsm ? 'GSM-7' : 'UCS-2', chars: c.length, parts, otp_detected: otp, spam: { score: spam, level: spam < 20 ? 'LOW' : spam < 50 ? 'MEDIUM' : 'HIGH', keywords: kw }, logged: true }, null, 2) }, ...prev]);
  };
  const execDlrQuery = () => {
    const mid = toolInput.messageId || `MSG_${Date.now()}`; const st = ['DELIVRD', 'UNDELIV', 'EXPIRED', 'ACCEPTD', 'REJECTD'][Math.floor(Math.random() * 5)];
    toolLog(`DLR_${Date.now()}`, st === 'DELIVRD' ? 'delivered' : 'failed', `[DLR QUERY] ${mid} → ${st}`);
    setToolResults(prev => [{ id: uuidv4(), type: '📊 DLR QUERY', verdict: st === 'DELIVRD' ? 'success' : 'fail', route: getRouteLabel(), time: new Date().toLocaleTimeString(), data: JSON.stringify({ message_id: mid, status: st, error: st === 'DELIVRD' ? '000' : '006', submit: new Date(Date.now() - 30000).toISOString(), done: new Date().toISOString(), pdu: `id:${mid} stat:${st} err:${st === 'DELIVRD' ? '000' : '006'}`, logged: true }, null, 2) }, ...prev]);
  };
  const runAllTools = () => {
    setToolsRunning(true); setToolResults([]);
    const tasks: (() => void)[] = [];
    if (toolInput.enableFakeDlr && toolInput.messageId) tasks.push(execFakeDlr);
    if (toolInput.enableTestDest && toolInput.destination) tasks.push(execTestDest);
    if (toolInput.enableTestSid && toolInput.sid) tasks.push(execTestSid);
    if (toolInput.enableTestContent && toolInput.content) tasks.push(execTestContent);
    if (toolInput.enableDlrQuery && toolInput.messageId) tasks.push(execDlrQuery);
    if (!tasks.length) { setToolsRunning(false); return; }
    tasks.forEach((fn, i) => setTimeout(fn, i * 300));
    setTimeout(() => setToolsRunning(false), tasks.length * 300 + 200);
  };

  // ═══════════ SHARED ═══════════
  const verdictColor = (v: RouteVerdict) => { switch (v) { case 'WHITE_ROUTE': return 'from-emerald-500/20 to-emerald-900/30 border-emerald-500/40'; case 'FAKE_DLR': return 'from-red-500/20 to-red-900/30 border-red-500/40'; case 'GREY_ROUTE': return 'from-amber-500/20 to-amber-900/30 border-amber-500/40'; case 'CONTENT_FILTERED': return 'from-orange-500/20 to-orange-900/30 border-orange-500/40'; default: return 'from-slate-500/20 to-slate-900/30 border-slate-500/40'; } };
  const verdictTextColor = (v: RouteVerdict) => { switch (v) { case 'WHITE_ROUTE': return 'text-emerald-400'; case 'FAKE_DLR': return 'text-red-400'; case 'GREY_ROUTE': return 'text-amber-400'; case 'CONTENT_FILTERED': return 'text-orange-400'; default: return 'text-slate-400'; } };
  const tabs: { id: TestTab; label: string; icon: React.ElementType }[] = [
    { id: 'send_sms', label: 'Route Tester', icon: Radio }, { id: 'smpp_bind', label: 'SMPP Bind', icon: Wifi },
    { id: 'http_api', label: 'HTTP API', icon: Globe }, { id: 'tools', label: 'Tools', icon: FlaskConical },
  ];

  const inp = "w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono";
  const sel = "w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center"><FlaskConical className="w-5 h-5 text-white" /></div>
            Testing Laboratory
          </h1>
          <p className="text-gray-500 mt-1">All test SMS and tool results are logged to <strong>SMS Logs</strong></p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-1 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB 1 — ROUTE TESTER ═══════ */}
      {activeTab === 'send_sms' && (
        <div className="space-y-5">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-blue-400" /> Route Quality Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Client</label>
                <select value={smsForm.clientId} onChange={e => setSmsForm({ ...smsForm, clientId: e.target.value })} className={sel}>
                  <option value="">— No client (direct) —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.clientCode} — {c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Route</label>
                <select value={smsForm.routeId} onChange={e => setSmsForm({ ...smsForm, routeId: e.target.value })} className={sel}>
                  <option value="">— Auto route —</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.routingType})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Sender ID</label>
                <input type="text" value={smsForm.senderId} onChange={e => setSmsForm({ ...smsForm, senderId: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Destination MSISDN</label>
                <input type="text" value={smsForm.destination} onChange={e => setSmsForm({ ...smsForm, destination: e.target.value })} placeholder="+8801711234567" className={inp} />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Message Content</label>
                <input type="text" value={smsForm.content} onChange={e => setSmsForm({ ...smsForm, content: e.target.value })} className={inp} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Results appear below and in <span className="text-blue-400 font-semibold">Menu → SMS Logs</span></p>
              <button onClick={runRouteTest} disabled={isRunning || !smsForm.destination}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${isRunning ? 'bg-gray-700 text-gray-500 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/25'}`}>
                {isRunning ? <><Clock className="w-4 h-4 animate-spin" /> Testing...</> : <><Play className="w-4 h-4" /> Run Test</>}
              </button>
            </div>
            {isRunning && (
              <div className="mt-5 flex items-center gap-1">
                {testSteps.map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${step.status === 'done' ? 'bg-emerald-900/40 text-emerald-400' : step.status === 'active' ? 'bg-blue-900/40 text-blue-400 animate-pulse' : step.status === 'error' ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-600'}`}>
                      {step.status === 'done' ? <CheckCircle className="w-3.5 h-3.5" /> : step.status === 'active' ? <Clock className="w-3.5 h-3.5 animate-spin" /> : step.status === 'error' ? <XCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />}
                      <span>{step.label}</span>
                    </div>
                    {i < testSteps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-700 mx-1 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {routeTests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-gray-900 font-semibold flex items-center gap-2"><Search className="w-5 h-5 text-gray-400" /> Test Results — Truth Table</h3>
              {routeTests.map(t => (
                <div key={t.id} className={`bg-gradient-to-r ${verdictColor(t.verdict)} border rounded-xl overflow-hidden`}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {t.verdict === 'WHITE_ROUTE' && <CheckCircle className="w-7 h-7 text-emerald-400" />}
                      {t.verdict === 'FAKE_DLR' && <Ban className="w-7 h-7 text-red-400" />}
                      {t.verdict === 'GREY_ROUTE' && <AlertTriangle className="w-7 h-7 text-amber-400" />}
                      {t.verdict === 'CONTENT_FILTERED' && <Shield className="w-7 h-7 text-orange-400" />}
                      <div><p className={`text-lg font-bold ${verdictTextColor(t.verdict)}`}>{t.verdictLabel}</p><p className="text-sm text-gray-300">{t.verdictDetail}</p></div>
                    </div>
                    <div className="text-right text-xs text-gray-400 space-y-1"><p className="font-mono">{t.messageId}</p><p>Client: {t.clientCode} | Route: {t.routeName}</p><p>{t.country} • {t.operator}</p></div>
                  </div>
                  <div className="grid grid-cols-2 border-t border-white/10">
                    <div className="p-5 border-r border-white/10">
                      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1"><Cpu className="w-3 h-3" /> Source A — Provider DLR</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Status:</span><span className="font-mono font-bold text-green-400">{t.providerStatus}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Latency:</span><span className={`font-mono ${t.providerLatency < 1000 ? 'text-red-400 font-bold' : 'text-gray-200'}`}>{t.providerLatency}ms{t.providerLatency < 1000 ? ' ⚡ FAST' : ''}</span></div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Source B — Handset Probe</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Received:</span><span className={`font-bold ${t.handsetReceived ? 'text-green-400' : 'text-red-400'}`}>{t.handsetReceived ? 'YES ✓' : 'NO ✗'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">SID:</span><span className={`font-mono ${t.handsetSid !== t.senderId && t.handsetReceived ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>{t.handsetReceived ? t.handsetSid : '—'}{t.handsetSid !== t.senderId && t.handsetReceived ? ' ⚠ CHANGED' : ''}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pduLogs.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between"><h4 className="text-white font-semibold text-sm flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /> PDU Logs</h4><button onClick={() => setPduLogs([])} className="text-xs text-gray-500 hover:text-gray-300"><RotateCcw className="w-3 h-3 inline mr-1" />Clear</button></div>
              <div ref={pduRef} className="max-h-48 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
                {pduLogs.map((l, i) => (<div key={i} className="flex gap-2 py-0.5"><span className="text-gray-600 w-20 flex-shrink-0">{l.time}</span><span className={`w-4 flex-shrink-0 font-bold ${l.direction === 'OUT' ? 'text-blue-400' : 'text-green-400'}`}>{l.direction === 'OUT' ? '>>' : '<<'}</span><span className={`w-32 flex-shrink-0 ${l.direction === 'OUT' ? 'text-blue-300' : 'text-green-300'}`}>{l.type}</span><span className="text-gray-400">{l.decoded}</span></div>))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Detection Reference</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200"><CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-emerald-800">White Route</p><p className="text-emerald-600">Delivered, SID match, normal latency</p></div></div>
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg border border-red-200"><Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-red-800">Fake DLR</p><p className="text-red-600">DELIVRD but handset=NO</p></div></div>
              <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200"><AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-amber-800">Grey Route</p><p className="text-amber-600">SID changed to long code</p></div></div>
              <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200"><Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-orange-800">Content Filtered</p><p className="text-orange-600">DELIVRD but blocked</p></div></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB 2 — SMPP BIND ═══════ */}
      {activeTab === 'smpp_bind' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Wifi className="w-5 h-5 text-green-400" /> SMPP Bind Validator</h3>
            <div className="p-3 mb-4 bg-blue-900/30 border border-blue-800/50 rounded-lg text-xs text-blue-300">Select entity to auto-fill credentials.</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-400 mb-1">Entity</label><select value={smppForm.entityType} onChange={e => setSmppForm({ ...smppForm, entityType: e.target.value, entityId: '' })} className={sel}><option value="client">Client</option><option value="supplier">Supplier</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1">Select</label><select value={smppForm.entityId} onChange={e => { const id = e.target.value; if (smppForm.entityType === 'client') { const c = clients.find(x => x.id === id); if (c) setSmppForm(p => ({ ...p, entityId: id, host: c.smppIp || 'localhost', port: String(c.smppPort), username: c.smppUsername, password: c.smppPassword, systemType: c.smppSystemType, bindType: c.smppBindType })); else setSmppForm(p => ({ ...p, entityId: id })); } else { const s = suppliers.find(x => x.id === id); if (s) setSmppForm(p => ({ ...p, entityId: id, host: s.smppHost, port: String(s.smppPort), username: s.smppUsername, password: s.smppPassword, systemType: s.smppSystemType, bindType: s.smppBindType })); else setSmppForm(p => ({ ...p, entityId: id })); } }} className={sel}><option value="">— Manual —</option>{smppForm.entityType === 'client' ? clients.map(c => <option key={c.id} value={c.id}>{c.clientCode}</option>) : suppliers.filter(s => s.connectionType === 'smpp').map(s => <option key={s.id} value={s.id}>{s.supplierCode}</option>)}</select></div>
              <div><label className="block text-xs text-gray-400 mb-1">Host</label><input value={smppForm.host} onChange={e => setSmppForm({ ...smppForm, host: e.target.value })} placeholder="5.78.72.23" className={inp} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Port</label><input value={smppForm.port} onChange={e => setSmppForm({ ...smppForm, port: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Username</label><input value={smppForm.username} onChange={e => setSmppForm({ ...smppForm, username: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Password</label><input type="password" value={smppForm.password} onChange={e => setSmppForm({ ...smppForm, password: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Bind Type</label><select value={smppForm.bindType} onChange={e => setSmppForm({ ...smppForm, bindType: e.target.value })} className={sel}><option value="transceiver">TRX</option><option value="transmitter">TX</option><option value="receiver">RX</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1">System Type</label><input value={smppForm.systemType} onChange={e => setSmppForm({ ...smppForm, systemType: e.target.value })} className={inp} /></div>
            </div>
            <button onClick={handleSmppTest} disabled={smppTesting} className={`w-full mt-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${smppTesting ? 'bg-gray-700 text-gray-500' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500'}`}>{smppTesting ? <><Clock className="w-4 h-4 animate-spin" /> Connecting...</> : <><Zap className="w-4 h-4" /> Test Bind</>}</button>
          </div>
          <div>{smppResult ? (<div className={`rounded-xl p-5 border ${smppResult.status === 'BOUND' ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}><div className="flex items-center gap-3 mb-3">{smppResult.status === 'BOUND' ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-red-400" />}<p className={`text-lg font-bold ${smppResult.status === 'BOUND' ? 'text-emerald-400' : 'text-red-400'}`}>{smppResult.detail}</p></div><pre className="bg-gray-900 p-3 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">{smppResult.raw}</pre></div>) : (<div className="bg-gray-100 rounded-xl p-12 flex flex-col items-center text-gray-400"><Wifi className="w-12 h-12 mb-3 opacity-30" /><p>Enter credentials and click Test Bind</p></div>)}</div>
        </div>
      )}

      {/* ═══════ TAB 3 — HTTP API ═══════ */}
      {activeTab === 'http_api' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-white font-semibold flex items-center gap-2"><Globe className="w-5 h-5 text-orange-400" /> HTTP API Probe</h3><button onClick={() => setShowAddApi(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Profile</button></div>
            <select value={selProfile} onChange={e => setSelProfile(e.target.value)} className={sel}>{apiProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {(() => { const p = apiProfiles.find(x => x.id === selProfile); return p ? (<div className="space-y-2"><div className="p-3 bg-gray-800 rounded-lg"><p className="text-xs text-gray-500 uppercase mb-1">Send URL</p><p className="text-xs font-mono text-cyan-300 break-all">{p.sendUrl}</p></div><div className="p-3 bg-gray-800 rounded-lg"><p className="text-xs text-gray-500 uppercase mb-1">DLR URL</p><p className="text-xs font-mono text-cyan-300 break-all">{p.dlrUrl}</p></div><pre className="p-3 bg-gray-950 rounded-lg text-xs font-mono text-green-400 overflow-x-auto">{`if response.code == 200:\n    data = json(body)\n    if data["code"] == 200:\n        if data["info"]["status"] == "${p.dlrDeliveredValue}":\n            return DELIVERED\n    else: return None`}</pre></div>) : null; })()}
            <div><label className="block text-xs text-gray-400 mb-1">Destination</label><input value={apiForm.destination} onChange={e => setApiForm({ ...apiForm, destination: e.target.value })} placeholder="8801XXXXXXXXX" className={inp} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">OTP / Message</label><input value={apiForm.message} onChange={e => setApiForm({ ...apiForm, message: e.target.value })} className={inp} /></div>
            <button onClick={() => runApiTest('send')} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send OTP</button>
            <div className="border-t border-gray-800 pt-4"><label className="block text-xs text-gray-400 mb-1">Transaction ID</label><input value={apiForm.messageId} onChange={e => setApiForm({ ...apiForm, messageId: e.target.value })} placeholder="OTP_xxx" className={inp} /><button onClick={() => runApiTest('dlr')} className="w-full mt-2 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm flex items-center justify-center gap-2"><Eye className="w-4 h-4" /> Check Delivery</button></div>
            {showAddApi && (<div className="p-4 bg-gray-800 rounded-lg border border-blue-800/50 space-y-2"><input placeholder="Profile Name" value={newApi.name} onChange={e => setNewApi({ ...newApi, name: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm" /><input placeholder="Send URL" value={newApi.sendUrl} onChange={e => setNewApi({ ...newApi, sendUrl: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm font-mono" /><input placeholder="DLR URL" value={newApi.dlrUrl} onChange={e => setNewApi({ ...newApi, dlrUrl: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm font-mono" /><input placeholder="API Key" value={newApi.apiKey} onChange={e => setNewApi({ ...newApi, apiKey: e.target.value })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm font-mono" /><div className="flex gap-2"><button onClick={() => { if (newApi.name && newApi.sendUrl) { const p = { id: uuidv4(), ...newApi, method: 'GET' as const, dlrDeliveredValue: 'Delivered' }; setApiProfiles(prev => [...prev, p]); setSelProfile(p.id); setShowAddApi(false); setNewApi({ name: '', sendUrl: '', dlrUrl: '', apiKey: '' }); } }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">Save</button><button onClick={() => setShowAddApi(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-xs">Cancel</button></div></div>)}
          </div>
          <div className="space-y-3">{apiResults.length === 0 ? <div className="bg-gray-100 rounded-xl p-12 flex flex-col items-center text-gray-400"><Globe className="w-12 h-12 mb-3 opacity-30" /><p>Run an API test</p></div> : apiResults.map((r, i) => (<div key={i} className={`p-4 rounded-xl border ${r.type === 'SEND' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}><div className="flex items-center justify-between mb-2"><span className={`text-xs font-bold px-2 py-0.5 rounded ${r.type === 'SEND' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type}</span><span className="text-xs text-gray-400">{r.latency}ms</span></div><p className="text-xs font-mono text-gray-600 truncate mb-1">{r.url}</p><pre className="text-xs font-mono p-2 bg-white rounded border overflow-x-auto">{(() => { try { return JSON.stringify(JSON.parse(r.response), null, 2); } catch { return r.response; } })()}</pre></div>))}</div>
        </div>
      )}

      {/* ═══════ TAB 4 — TOOLS (all-in-one) ═══════ */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {/* Route/Endpoint selector */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FlaskConical className="w-5 h-5 text-purple-400" /> Testing Tools</h3>
              <p className="text-xs text-gray-500 mb-3">All results are logged to <span className="text-blue-400 font-semibold">SMS Logs</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1 uppercase">Route</label><select value={toolInput.routeId} onChange={e => setToolInput({ ...toolInput, routeId: e.target.value })} className={sel}><option value="">Auto</option>{routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div><label className="block text-xs text-gray-400 mb-1 uppercase">Supplier</label><select value={toolInput.supplierId} onChange={e => setToolInput({ ...toolInput, supplierId: e.target.value })} className={sel}><option value="">Auto</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierCode}</option>)}</select></div>
              </div>
            </div>

            {/* Individual tools */}
            {[
              { key: 'enableFakeDlr' as const, label: '🔧 Fake DLR', fn: execFakeDlr, note: 'Injects DLR into sms_logs', fields: (<><input value={toolInput.messageId} onChange={e => setToolInput({ ...toolInput, messageId: e.target.value })} placeholder="Message ID" className={inp + ' mb-2'} /><select value={toolInput.dlrStatus} onChange={e => setToolInput({ ...toolInput, dlrStatus: e.target.value })} className={sel}><option value="DELIVRD">✅ DELIVRD</option><option value="UNDELIV">❌ UNDELIV</option><option value="EXPIRED">⏰ EXPIRED</option><option value="REJECTD">🚫 REJECTD</option><option value="ACCEPTD">📨 ACCEPTD</option></select></>) },
              { key: 'enableTestDest' as const, label: '📱 Destination + HLR', fn: execTestDest, note: 'E.164 validation, MCC/MNC, HLR lookup', fields: (<input value={toolInput.destination} onChange={e => setToolInput({ ...toolInput, destination: e.target.value })} placeholder="+8801711234567" className={inp} />) },
              { key: 'enableTestSid' as const, label: '🏷️ Sender ID', fn: execTestSid, note: 'Alpha/numeric validation, country restrictions', fields: (<input value={toolInput.sid} onChange={e => setToolInput({ ...toolInput, sid: e.target.value })} placeholder="MYCOMPANY" className={inp} />) },
              { key: 'enableTestContent' as const, label: '📝 Content Analysis', fn: execTestContent, note: 'Encoding, parts, OTP, spam score', fields: (<textarea value={toolInput.content} onChange={e => setToolInput({ ...toolInput, content: e.target.value })} rows={2} placeholder="Your OTP is 482910" className={inp} />) },
              { key: 'enableDlrQuery' as const, label: '📊 DLR Query', fn: execDlrQuery, note: 'Query delivery by message ID', fields: (<input value={toolInput.messageId} onChange={e => setToolInput({ ...toolInput, messageId: e.target.value })} placeholder="Message ID" className={inp} />) },
            ].map(tool => (
              <div key={tool.key} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={toolInput[tool.key]} onChange={e => setToolInput({ ...toolInput, [tool.key]: e.target.checked })} className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500" /><span className="text-white font-medium text-sm">{tool.label}</span></label>
                  <button onClick={tool.fn} disabled={!toolInput[tool.key]} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg font-medium transition-colors flex items-center gap-1"><Play className="w-3 h-3" />Run</button>
                </div>
                {toolInput[tool.key] && <div className="p-4"><p className="text-xs text-gray-500 mb-2">{tool.note}</p>{tool.fields}</div>}
              </div>
            ))}

            <button onClick={runAllTools} disabled={toolsRunning} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${toolsRunning ? 'bg-gray-700 text-gray-500 cursor-wait' : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:from-purple-500 shadow-lg shadow-purple-600/25'}`}>
              {toolsRunning ? <><Clock className="w-4 h-4 animate-spin" /> Running...</> : <><Zap className="w-5 h-5" /> Run All Enabled</>}
            </button>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 flex items-center gap-2"><Terminal className="w-5 h-5 text-gray-400" /> Results {toolResults.length > 0 && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{toolResults.length}</span>}</h3>{toolResults.length > 0 && <button onClick={() => setToolResults([])} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Clear</button>}</div>
            {toolResults.length === 0 ? <div className="bg-gray-100 rounded-xl p-16 flex flex-col items-center text-gray-400"><FlaskConical className="w-14 h-14 mb-4 opacity-20" /><p className="font-medium">No results</p><p className="text-sm mt-1">Run individual tools or Run All</p></div> : toolResults.map(r => (
              <div key={r.id} className={`rounded-xl border overflow-hidden ${r.verdict === 'success' ? 'bg-emerald-50 border-emerald-200' : r.verdict === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-current/10">
                  <div className="flex items-center gap-2">{r.verdict === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : r.verdict === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <XCircle className="w-4 h-4 text-red-600" />}<span className="text-sm font-bold text-gray-800">{r.type}</span></div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">{r.route && <span className="bg-white px-2 py-0.5 rounded border font-mono">Route: {r.route}</span>}<span>{r.time}</span></div>
                </div>
                <pre className="p-4 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-56 overflow-y-auto">{r.data}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
