// api/lead.js — устойчивый прокси к GAS

export const config = { runtime: 'nodejs20.x', regions: ['fra1', 'iad1', 'sfo1'] };

const crypto = require('crypto');

function hmacHex(str, key) {
  const buf = crypto.createHmac('sha256', String(key || '')).update(String(str || '')).digest();
  return Array.from(buf, (b) => (b + 256) % 256)
    .map((b) => (b.toString(16).length === 1 ? '0' + b.toString(16) : b.toString(16)))
    .join('');
}

function allow(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function stablePayload(obj) {
  const o = obj || {};
  const keys = Object.keys(o).sort();
  const out = {};
  for (const k of keys) out[k] = o[k];
  return out;
}

module.exports = async (req, res) => {
  const ORIGIN_PROD = process.env.ORIGIN || 'https://cfg-consulting.vercel.app';
  const ALLOW = [ORIGIN_PROD].filter(Boolean);
  const origin = String(req.headers.origin || '');

  try {
    // CORS / preflight
    if (req.method === 'OPTIONS') {
      allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
      return res.status(204).end();
    }

    // Пинги и совместимый GET
    if (req.method === 'GET') {
      allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
      return res.status(200).json({
        ok: true,
        mode: 'status',
        env: {
          has_APPS_SCRIPT_URL: !!process.env.APPS_SCRIPT_URL,
          has_CFG_KEY: !!process.env.CFG_KEY || !!process.env.CFG_KEY_V2,
        },
      });
    }

    if (req.method !== 'POST') {
      allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const APPS_SCRIPT_URL = String(process.env.APPS_SCRIPT_URL || '');
    const CFG_KEY = String(process.env.CFG_KEY || process.env.CFG_KEY_V2 || '');

    if (!APPS_SCRIPT_URL || !CFG_KEY) {
      allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
      return res.status(500).json({ ok: false, error: 'env_not_configured' });
    }

    // читаем тело
    let data = {};
    try {
      data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (_) { data = {}; }

    // канон + подпись
    const canon = stablePayload(data);
    const payload = JSON.stringify(canon);
    const sig = hmacHex(payload, CFG_KEY);

    // проксируем в GAS
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...canon, _sig: sig }),
    });

    const text = await r.text();
    let out;
    try { out = JSON.parse(text); } catch { out = { ok: false, error: 'gas_non_json', raw: text }; }

    allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
    return res.status(r.ok ? 200 : 500).json(out);

  } catch (e) {
    // никогда не отдаём «белый экран 500» — только JSON
    allow(res, ALLOW.includes(origin) ? origin : ORIGIN_PROD);
    return res.status(500).json({ ok: false, error: 'server_crash', message: String(e && e.stack || e) });
  }
};
