// api/lead.js
// CommonJS-версия для Vercel Serverless (Node 18+), без ESM.
// Подпись: HMAC-SHA256(payload) по hex-ключу → первые 12 hex символов.

const { createHmac } = require('crypto');

/** Явно просим Node-рантайм (не Edge) */
exports.config = { runtime: 'nodejs18.x' };

/** Нормализация входа: допускаем плоское тело и { action, data } */
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const CFG_KEY  = process.env.CFG_KEY; // hex

  if (!APPS_URL || !CFG_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'env_missing',
      have: { APPS_URL: !!APPS_URL, CFG_KEY: !!CFG_KEY },
    });
  }

  try {
    const normalized = normalizeInput(req.body);
    const payloadStr = JSON.stringify(normalized);
    const sig12      = signPayloadHex12(payloadStr, CFG_KEY);

    const upstreamRes = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-SIG': sig12,
      },
      body: payloadStr,
    });

    const text = await upstreamRes.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, error: 'upstream_non_json', text }; }

    return res.status(upstreamRes.ok ? 200 : 500).json(json);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'proxy_failed', message: String(e?.message || e) });
  }
};
