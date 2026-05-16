/**
 * net2app SMS Hub — Translation Engine
 * =====================================
 * Processes message translations in priority order.
 * Applied to client-side (before routing) and supplier-side (before sending).
 *
 * Translation Types:
 *   - sid:           Change Sender ID. Pattern matches current SID, replaces with new one.
 *                    Example: match "facebook" → replace "Verify" (SID becomes "Verify")
 *
 *   - content:       Modify message body text. Regex match & replace on full content.
 *                    Example: match "Your otp is" → replace "Your exact number is"
 *                    Result: "Your otp is 1234" → "Your exact number is 1234"
 *
 *   - number:        Transform destination number format.
 *                    Example: match "^00" → replace "+" (00880 → +880)
 *                    Example: match "^\+880" → replace "0" (+88017 → 017)
 *
 *   - extract_otp:   Extract OTP/code from message content.
 *                    Pattern is a regex to find the OTP (e.g., "\d{4,8}")
 *                    The extracted OTP is stored but content is NOT changed.
 *                    Used for analytics/logging.
 *
 *   - random_content: Replace message body with random text from a pool,
 *                     preserving the OTP/code. Pattern extracts OTP, replace
 *                     is a pipe-separated list of templates.
 *                     Example: match "\d{4,8}" (extracts OTP)
 *                     replace: "Your code: {{OTP}}|Verification: {{OTP}}|Enter {{OTP}} to continue"
 *                     The engine picks a random template and inserts the OTP.
 */

import type { Translation } from '../types';

export interface TranslationResult {
  sourceAddr: string;      // SID after translation
  destinationAddr: string; // number after translation
  messageContent: string;  // content after translation
  extractedOtp?: string;   // OTP if extracted
  appliedTranslations: string[]; // names of applied translations
}

export function applyTranslations(
  translations: Translation[],
  sourceAddr: string,
  destinationAddr: string,
  messageContent: string,
): TranslationResult {
  let sid = sourceAddr;
  let dst = destinationAddr;
  let content = messageContent;
  let otp: string | undefined;
  const applied: string[] = [];

  // Sort by priority (lower number = applied first)
  const sorted = [...translations].filter(t => t.isActive).sort((a, b) => a.priority - b.priority);

  for (const t of sorted) {
    try {
      switch (t.type) {
        case 'sid': {
          // Match pattern against current SID, if matches → replace
          const re = new RegExp(t.matchPattern, 'gi');
          if (re.test(sid)) {
            sid = t.replacePattern || sid;
            applied.push(`SID: "${sourceAddr}" → "${sid}" [${t.name}]`);
          }
          break;
        }

        case 'content': {
          // Regex find & replace on message body
          const re = new RegExp(t.matchPattern, 'gi');
          const newContent = content.replace(re, t.replacePattern || '');
          if (newContent !== content) {
            applied.push(`Content: "${t.matchPattern}" → "${t.replacePattern}" [${t.name}]`);
            content = newContent;
          }
          break;
        }

        case 'number': {
          // Transform destination number
          const re = new RegExp(t.matchPattern, 'g');
          const newDst = dst.replace(re, t.replacePattern || '');
          if (newDst !== dst) {
            applied.push(`Number: "${dst}" → "${newDst}" [${t.name}]`);
            dst = newDst;
          }
          break;
        }

        case 'extract_otp': {
          // Extract OTP from content (don't modify content)
          const re = new RegExp(t.matchPattern);
          const match = content.match(re);
          if (match) {
            otp = match[0];
            applied.push(`OTP extracted: "${otp}" [${t.name}]`);
          }
          break;
        }

        case 'random_content': {
          // 1. Extract OTP using matchPattern
          const otpRe = new RegExp(t.matchPattern);
          const otpMatch = content.match(otpRe);
          const extractedCode = otpMatch ? otpMatch[0] : '';
          otp = extractedCode || otp;

          // 2. Pick random template from replacePattern (pipe-separated)
          if (t.replacePattern) {
            const templates = t.replacePattern.split('|').map(s => s.trim()).filter(Boolean);
            if (templates.length > 0) {
              const picked = templates[Math.floor(Math.random() * templates.length)];
              const newContent = picked.replace(/\{\{OTP\}\}/gi, extractedCode);
              applied.push(`Random: "${content.slice(0, 30)}..." → "${newContent.slice(0, 30)}..." [${t.name}]`);
              content = newContent;
            }
          }
          break;
        }
      }
    } catch {
      // Skip invalid regex patterns
    }
  }

  return { sourceAddr: sid, destinationAddr: dst, messageContent: content, extractedOtp: otp, appliedTranslations: applied };
}
