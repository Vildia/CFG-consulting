// api/lead.js — canonical (v18)
import crypto from 'node:crypto';

export const config = { runtime: 'nodejs' };

const APPS_URL = process.env.APPS_SCRIPT_URL;
const ORIGIN   = process.env.ORIGIN || '*';
const KEY_HEX  = (process.env.CFG_KEY_V2 || process.env.CFG_KEY_HEX || process.env.CFG_KEY || '').trim();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-cfg-sig');
}

function bad(res, status, error) {
  cors(res);
  res.status(status).json({ ok: false, error });
}

function hmacHex(hexKey, message) {
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error('CFG_KEY_V2 must be 64 hex chars (SHA-256 key).');
  }
  return crypto.createHmac('sha256', Buffer.from(hexKey, 'hex'))
               .update(message, 'utf8')
               .digest('hex');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { return res.status(204).end(); }
  if (req.method !== 'POST') { return bad(res, 405, 'method_not_allowed'); }

  try {
    if (!APPS_URL) return bad(res, 500, 'env_missing:APPS_SCRIPT_URL');
    if (!KEY_HEX)  return bad(res, 500, 'env_missing:CFG_KEY_V2');

    const body = req.body || {};
    const v2   = (typeof body === 'object' && body && Object.prototype.hasOwnProperty.call(body, 'action'));
    const data = v2 ? body.data : body;
    const action = v2 ? body.action : 'lead';

    const normalized = { action, data };
    const payload = JSON.stringify(normalized);

    const sig = hmacHex(KEY_HEX, payload);

    const upstream = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cfg-sig': sig,
      },
      body: payload,
    });

    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return res.status(200).json({
      ok: true,
      upstream_status: upstream.status,
      upstream_body: json,
    });
  } catch (e) {
    return bad(res, 500, String(e && e.message || e));
  }
}
