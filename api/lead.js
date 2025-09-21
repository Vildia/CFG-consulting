// api/lead.js
// Vercel Node.js function (CommonJS). Проверка подписи + прокси в Apps Script.

const { createHmac, timingSafeEqual } = require('node:crypto');

function normalizeInput(body) {
  // Поддерживаем оба формата:
  // A) плоское тело: { name, email, ... }
  // B) { action, data }  -> data = объект лида, action должно быть 'lead'
  const isV2 = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'action');
  const action = isV2 ? body.action : 'lead';
  const data   = isV2 ? body.data   : body;

  if (action !== 'lead' || !data || typeof data !== 'object') {
    return { ok: false, error: 'bad_request', action, data };
  }
  return { ok: true, normalized: { action, data } };
}

function hmacHex(keyHex, payloadStr) {
  // keyHex: 64 hex chars; payloadStr: строка JSON
  const key = Buffer.from(keyHex, 'hex');
  return createHmac('sha256', key).update(payloadStr).digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const A = Buffer.from(a, 'hex');
    const B = Buffer.from(b, 'hex');
    if (A.length !== B.length) return false;
    return timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const KEY_HEX  = process.env.CFG_KEY_V2;

  if (!APPS_URL || !KEY_HEX) {
    return res.status(500).json({
      ok: false,
      error: 'env_missing',
      have: { APPS_URL: !!APPS_URL, CFG_KEY_V2: !!KEY_HEX }
    });
  }

  // --- Нормализуем вход ---
  const check = normalizeInput(req.body || {});
  if (!check.ok) {
    return res.status(400).json(check);
  }
  const { normalized } = check;

  // --- Формируем каноническую строку (именно её подписываем и шлём дальше) ---
  const payloadStr = JSON.stringify(normalized);

  // --- Проверка подписи (требуем заголовок x-cfg-sig) ---
  const incomingSig = (req.headers['x-cfg-sig'] || '').toString().trim().toLowerCase();
  if (!incomingSig) {
    return res.status(400).json({ ok: false, error: 'missing_signature' });
  }
  const expectedSig = hmacHex(KEY_HEX, payloadStr);
  if (!safeEqualHex(incomingSig, expectedSig)) {
    return res.status(401).json({ ok: false, error: 'bad_signature' });
  }

  // --- Проксируем в Apps Script ---
  try {
    const upstream = await fetch(APPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadStr
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(200).json({
      ok: true,
      upstream_status: upstream.status,
      upstream_body: json
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_fail', detail: String(e) });
  }
};
