// api/lead.js
// Версия для Vercel Serverless (Node 18+). Без Edge API и без WebCrypto.
// Подпись: HMAC-SHA256(payload) c ключом в hex, затем первые 12 символов.

import { createHmac } from 'node:crypto';

export const config = {
  // Явно просим Node-рантайм (а не Edge)
  runtime: 'nodejs18.x',
};

/** Нормализация входа: допускаем и «плоское» тело, и { action, data } */
function normalizeInput(reqBody) {
  const body = (reqBody && typeof reqBody === 'object') ? reqBody : {};
  const isV2 = Object.prototype.hasOwnProperty.call(body, 'action');
  const action = isV2 ? (body.action || 'lead') : 'lead';
  const data   = isV2 ? (body.data   || {})       : body;
  return { action, data };
}

/** Подпись payload строкой: HMAC-SHA256 по ключу (hex) → 12 hex символов */
function signPayloadHex12(payloadStr, keyHex) {
  const keyBuf = Buffer.from(keyHex, 'hex');
  const full   = createHmac('sha256', keyBuf).update(payloadStr).digest('hex');
  return full.slice(0, 12);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const CFG_KEY  = process.env.CFG_KEY; // hex-ключ

  if (!APPS_URL || !CFG_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'env_missing',
      have: { APPS_URL: !!APPS_URL, CFG_KEY: !!CFG_KEY },
    });
  }

  try {
    const normalized   = normalizeInput(req.body);
    const payloadStr   = JSON.stringify(normalized);
    const sig12        = signPayloadHex12(payloadStr, CFG_KEY);

    const upstreamRes = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-SIG': sig12,
      },
      body: payloadStr,
    });

    // Пробуем отдать 1:1 то, что вернул скрипт
    const text = await upstreamRes.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, error: 'upstream_non_json', text }; }

    return res.status(upstreamRes.ok ? 200 : 500).json(json);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'proxy_failed', message: String(e?.message || e) });
  }
}
