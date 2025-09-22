// api/lead.js
// Vercel Node.js 20 function. Normalizes input, signs payload (HMAC-SHA256),
// forwards to Google Apps Script and returns normalized response.

import crypto from 'node:crypto';

function bad(res, code, msg) {
  res.status(code).json({ ok: false, error: msg });
}

export default async function handler(req, res) {
  // CORS for local tests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return bad(res, 405, 'method_not_allowed');
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const KEY_HEX  = (process.env.CFG_KEY_V2 || process.env.CFG_KEY || '').trim();

  if (!APPS_URL || !/^https?:\/\//i.test(APPS_URL)) {
    return bad(res, 500, 'env_missing:APPS_SCRIPT_URL');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
    return bad(res, 500, 'env_missing_or_bad:CFG_KEY_V2');
  }

  // --- read body safely (Vercel may parse json already) ---
  let raw = req.body;
  if (raw == null || raw === '') {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      raw = Buffer.concat(chunks).toString('utf8');
    } catch (_) {}
  }
  let body;
  try {
    body = (typeof raw === 'string') ? JSON.parse(raw || '{}') : (raw || {});
  } catch {
    // Not JSON? Treat empty
    body = {};
  }

  // --- normalize ------------------------------------------------------------
  // accept: A) flat {name,email,...} OR B) { action, data }
  let action = 'lead';
  let data = {};

  if (body && typeof body === 'object' && 'action' in body && body.data && typeof body.data === 'object') {
    action = String(body.action || 'lead');
    data = body.data || {};
  } else {
    data = body || {};
  }

  const normalized = { action, data };
  const payload = JSON.stringify(normalized);

  // --- HMAC SHA-256 over payload using key hex ------------------------------
  const signature = crypto.createHmac('sha256', Buffer.from(KEY_HEX, 'hex'))
                          .update(payload)
                          .digest('hex');

  // --- forward to Apps Script ----------------------------------------------
  let upstreamStatus = 0;
  let upstreamBody = null;
  try {
    const resp = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cfg-sig': signature
      },
      body: payload
    });
    upstreamStatus = resp.status;

    const text = await resp.text();
    try { upstreamBody = JSON.parse(text); }
    catch { upstreamBody = { raw: text }; }
  } catch (err) {
    return bad(res, 502, 'upstream_error:' + (err?.message || err));
  }

  res.status(200).json({
    ok: true,
    upstream_status: upstreamStatus,
    upstream_body: upstreamBody
  });
}
