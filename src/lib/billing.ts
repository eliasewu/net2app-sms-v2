/**
 * net2app SMS Hub — Billing & Rating Engine (v2)
 * ================================================
 * Handles: MCC/MNC resolution, rate lookup, balance deduction, profit calc
 */

import type { MccMnc, Rate, Client } from '../types';

/**
 * Generate a unique hex message ID (like real SMSC)
 * Format: 8 hex chars uppercase, e.g. "4A7F0C3E"
 */
export function generateMsgId(): string {
  const ts = Date.now().toString(16).toUpperCase();
  const rnd = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return (ts + rnd).slice(-10).toUpperCase();
}

// ── BD operator prefix table ──
const BD_PREFIXES: Record<string, string> = {
  '88017': '01', '88013': '01',  // Grameenphone
  '88018': '02', '88016': '02',  // Robi
  '88019': '03', '88014': '03',  // Banglalink
  '88015': '04',                 // Teletalk
};

/**
 * Resolve destination number → MCC, MNC, country, operator
 */
export function resolveDestination(destination: string, mccMncDb: MccMnc[]): {
  mcc: string; mnc: string; country: string; operator: string; countryCode: string;
} {
  let num = destination.replace(/[\s\-()]/g, '');
  if (num.startsWith('+')) num = num.slice(1);
  if (num.startsWith('00')) num = num.slice(2);

  // ── Bangladesh special handling: exact operator by 5-digit prefix ──
  if (num.startsWith('880')) {
    const p5 = num.slice(0, 5);
    const mnc = BD_PREFIXES[p5];
    if (mnc) {
      const db = mccMncDb.find(m => m.mcc === '470' && normMnc(m.mnc) === mnc);
      if (db) return { mcc: '470', mnc: normMnc(db.mnc), country: db.countryName, operator: db.operatorName, countryCode: 'BD' };
      return { mcc: '470', mnc, country: 'Bangladesh', operator: `BD Operator (MNC ${mnc})`, countryCode: 'BD' };
    }
    // Generic BD
    const anyBd = mccMncDb.find(m => m.mcc === '470');
    if (anyBd) return { mcc: '470', mnc: normMnc(anyBd.mnc), country: anyBd.countryName, operator: anyBd.operatorName, countryCode: 'BD' };
    return { mcc: '470', mnc: '01', country: 'Bangladesh', operator: 'Unknown BD', countryCode: 'BD' };
  }

  // ── Other countries by prefix ──
  const countryPrefixes: { prefix: string; mcc: string; code: string }[] = [
    { prefix: '91', mcc: '404', code: 'IN' },
    { prefix: '971', mcc: '424', code: 'AE' },
    { prefix: '966', mcc: '420', code: 'SA' },
    { prefix: '44', mcc: '234', code: 'GB' },
    { prefix: '1', mcc: '310', code: 'US' },
  ];

  for (const cp of countryPrefixes.sort((a, b) => b.prefix.length - a.prefix.length)) {
    if (num.startsWith(cp.prefix)) {
      const db = mccMncDb.find(m => m.mcc === cp.mcc);
      if (db) return { mcc: cp.mcc, mnc: normMnc(db.mnc), country: db.countryName, operator: db.operatorName, countryCode: cp.code };
      return { mcc: cp.mcc, mnc: '00', country: cp.code, operator: 'Unknown', countryCode: cp.code };
    }
  }

  return { mcc: '000', mnc: '00', country: 'Unknown', operator: 'Unknown', countryCode: '??' };
}

/** Normalize MNC: strip leading zeros for comparison then pad back */
function normMnc(mnc: string): string {
  return mnc.replace(/^0+/, '') || '0';
}

/** Compare two MNC values flexibly: '01' matches '1', '03' matches '3' etc */
function mncMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normMnc(a) === normMnc(b);
}

/**
 * Look up rate for entity (client or supplier) by MCC/MNC
 * Matching priority:
 *   1. Exact MCC + MNC match
 *   2. MCC-only match (MNC empty/null)
 *   3. Default rate (MCC = '000')
 *   4. Any rate for this MCC regardless of entity (fallback)
 * 
 * Handles MNC format differences: '01' vs '1', '03' vs '3'
 */
export function lookupRate(entityType: 'client' | 'supplier', entityId: string, mcc: string, mnc: string, allRates: Rate[]): number {
  // Filter rates for this entity
  const myRates = allRates.filter(r => r.entityType === entityType && r.entityId === entityId && r.isActive);

  // 1. Exact MCC + MNC
  const exact = myRates.find(r => r.mcc === mcc && mncMatch(r.mnc, mnc));
  if (exact) return Number(exact.rate);

  // 2. MCC-only (MNC is empty or unset)
  const mccOnly = myRates.find(r => r.mcc === mcc && (!r.mnc || r.mnc === '' || r.mnc === '0'));
  if (mccOnly) return Number(mccOnly.rate);

  // 3. Default rate
  const def = myRates.find(r => r.mcc === '000');
  if (def) return Number(def.rate);

  // 4. No entity-specific rate found → try ANY rate for this MCC/MNC destination
  const anyRate = allRates.find(r => r.entityType === entityType && r.mcc === mcc && mncMatch(r.mnc, mnc) && r.isActive);
  if (anyRate) return Number(anyRate.rate);

  return 0;
}

/** Convenience wrappers */
export function getClientRate(clientId: string, mcc: string, mnc: string, rates: Rate[]): number {
  return lookupRate('client', clientId, mcc, mnc, rates);
}

export function getSupplierRate(supplierId: string, mcc: string, mnc: string, rates: Rate[]): number {
  return lookupRate('supplier', supplierId, mcc, mnc, rates);
}

/** Calculate profit: client_rate - supplier_rate */
export function calcProfit(clientRate: number, supplierRate: number): number {
  return Math.round((clientRate - supplierRate) * 1e6) / 1e6;
}

/** Check if client can afford this rate */
export function canCharge(client: Client, rate: number): boolean {
  if (rate <= 0) return true;
  if (client.billingType === 'prepaid') return client.balance >= rate;
  return (client.balance + client.creditLimit) >= rate;
}

/**
 * Calculate invoice from actual CDR logs
 */
export function calculateInvoiceTotals(
  clientId: string,
  logs: { clientId: string; clientRate: number; status: string; createdAt: string; mcc: string; mnc: string; country: string; operator: string }[],
  periodStart: string,
  periodEnd: string
): { subtotal: number; items: { country: string; operator: string; mcc: string; mnc: string; quantity: number; unitPrice: number; total: number }[] } {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  const filtered = logs.filter(l =>
    l.clientId === clientId &&
    new Date(l.createdAt) >= start &&
    new Date(l.createdAt) <= end &&
    l.clientRate > 0
  );

  const grouped: Record<string, { country: string; operator: string; mcc: string; mnc: string; count: number; total: number }> = {};
  for (const log of filtered) {
    const key = `${log.mcc}-${log.mnc}`;
    if (!grouped[key]) grouped[key] = { country: log.country, operator: log.operator, mcc: log.mcc, mnc: log.mnc, count: 0, total: 0 };
    grouped[key].count++;
    grouped[key].total = Math.round((grouped[key].total + log.clientRate) * 1e6) / 1e6;
  }

  const items = Object.values(grouped).map(g => ({
    country: g.country, operator: g.operator, mcc: g.mcc, mnc: g.mnc,
    quantity: g.count,
    unitPrice: g.count > 0 ? Math.round((g.total / g.count) * 1e6) / 1e6 : 0,
    total: g.total,
  }));

  return { subtotal: items.reduce((s, i) => Math.round((s + i.total) * 1e6) / 1e6, 0), items };
}
