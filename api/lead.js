// api/lead.js — v2.1 (diag + CFG_KEY_V2)
import crypto from 'crypto';

function hmacHex(hexKey, msg) {
  const keyBuf = Buffer.from(hexKey, 'hex');        // 64-символьный hex -> bytes
  return crypto.createHmac('sha256', keyBuf).update(msg).digest('hex');
}
function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed', version: 'v2.1' });
  }
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok:false, error:'bad_json', version:'v2.1' }); }
  }
  body ||= {};

  // --- ключи/переменные окружения ---
  const KEY_HEX = process.env.CFG_KEY_V2 || process.env.CFG_KEY || '';
  const VAR_USED = process.env.CFG_KEY_V2 ? 'CFG_KEY_V2' : (process.env.CFG_KEY ? 'CFG_KEY' : 'NONE');
  const key_id = KEY_HEX ? sha256Hex(KEY_HEX).slice(0, 12) : null;
  const APPS_URL = process.env.APPS_SCRIPT_URL || '';

  // Диагностика по запросу
  if (body.action === 'env' || body.action === 'diag') {
    return res.json({
      ok: true,
      version: 'v2.1',
      env: {
        var_used: VAR_USED,
        key_id,
        has_apps_url: Boolean(APPS_URL),
        vercel_env: process.env.VERCEL_ENV || null,
        node_env: process.env.NODE_ENV || null,
      },
    });
  }

  if (!APPS_URL) {
    return res.status(500).json({ ok:false, error:'no_apps_script_url', version:'v2.1' });
  }
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    return res.status(500).json({ ok:false, error:'bad_or_missing_key', version:'v2.1' });
  }

  const payload = {
    action: body.action || 'lead',
    data: body.data || body,   // совместимость со старым фронтом
  };

  const msg = JSON.stringify(payload);
  const sig = hmacHex(KEY_HEX, msg);

  try {
    const r = await fetch(APPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sig }),
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    // пробрасываем статус
    return res.status(r.ok ? 200 : 500).json(json);
  } catch (e) {
    return res.status(502).json({ ok:false, error:'apps_fetch_failed', detail:String(e), version:'v2.1' });
  }
}
