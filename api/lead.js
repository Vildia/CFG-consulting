// api/lead.js
// Vercel Node Function — подписывает { action:'lead', data } и шлёт в Apps Script.
// Ничего на клиенте подписывать не нужно.
//
// Требуемые ENV:
//  - APPS_SCRIPT_URL  : exec-URL Google Apps Script
//  - CFG_KEY_V2       : 64-символьный hex-ключ (тот же в Script Properties -> CFG_KEY_V2)
//  - ORIGIN           : ваш домен для CORS, напр. https://cfg-consulting.vercel.app
//
// Допуск: если CFG_KEY_V2 не определён, попытаемся взять CFG_KEY (но лучше не полагаться).

export const config = {
  runtime: 'nodejs', // обычная Node-функция
};

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-cfg-sig');
}

function hexToBytes(hex) {
  const m = (hex || '').match(/[0-9a-f]{2}/gi);
  if (!m) return new Uint8Array(0);
  return new Uint8Array(m.map(h => parseInt(h, 16)));
}

async function hmacSHA256Hex(keyHex, messageString) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(keyHex),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(messageString));
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  const ORIGIN = process.env.ORIGIN || '*';
  cors(res, ORIGIN);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const KEY_V2 = process.env.CFG_KEY_V2 || process.env.CFG_KEY;

  if (!APPS_SCRIPT_URL || !KEY_V2) {
    return json(res, 500, {
      ok: false,
      error: 'env_missing',
      missing: {
        APPS_SCRIPT_URL: !APPS_SCRIPT_URL,
        CFG_KEY_V2_or_CFG_KEY: !KEY_V2
      }
    });
  }

  // --- нормализуем вход ---
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) { body = {}; }

  const isV2 = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'action');
  const action = (isV2 ? body.action : 'lead') || 'lead';
  const data   = (isV2 ? body.data   : body) || {};

  const normalized = { action, data };
  const payloadString = JSON.stringify(normalized);

  // --- считаем подпись ---
  let signature;
  try {
    signature = await hmacSHA256Hex(KEY_V2, payloadString);
  } catch (e) {
    return json(res, 500, { ok: false, error: 'sign_failed', detail: String(e) });
  }

  // --- проксируем на Apps Script ---
  let upstreamStatus = 0;
  let upstreamBody = null;
  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cfg-sig': signature
      },
      body: payloadString
    });
    upstreamStatus = r.status;
    try {
      upstreamBody = await r.json();
    } catch {
      upstreamBody = { raw: await r.text() };
    }
  } catch (e) {
    return json(res, 502, { ok: false, error: 'upstream_fetch_error', detail: String(e) });
  }

  return json(res, 200, { ok: true, upstream_status: upstreamStatus, upstream_body: upstreamBody });
}
