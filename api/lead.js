// api/lead.js  (ВЕРСИЯ С ДИАГНОСТИКОЙ и поддержкой CFG_KEY_V2)
import crypto from 'crypto';

function hmacHex(hexKey, msg) {
  // hexKey — 64-символьная hex-строка
  const keyBuf = Buffer.from(hexKey, 'hex');
  return crypto.createHmac('sha256', keyBuf).update(msg).digest('hex');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad_json' });
  }

  // 1) Берём НОВУЮ переменную, если есть; иначе старую
  const KEY_HEX = process.env.CFG_KEY_V2 || process.env.CFG_KEY || '';
  const KEY_VAR = process.env.CFG_KEY_V2 ? 'CFG_KEY_V2' : (process.env.CFG_KEY ? 'CFG_KEY' : 'NONE');
  const key_id = KEY_HEX ? sha256Hex(KEY_HEX).slice(0, 12) : null;

  // 2) Диагностика окружения (помогает понять, что реально на рантайме)
  if (body.action === 'env' || body.action === 'diag') {
    return res.json({
      ok: true,
      env: {
        var_used: KEY_VAR,
        key_id,
        vercel_env: process.env.VERCEL_ENV || null,
        node_env: process.env.NODE_ENV || null,
        has_apps_url: Boolean(process.env.APPS_SCRIPT_URL),
      },
    });
  }

  // 3) Обычная прокладка до Apps Script — подписываем пейлоад
  const APPS_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_URL) {
    return res.status(500).json({ ok: false, error: 'no_apps_script_url' });
  }
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    return res.status(500).json({ ok: false, error: 'bad_or_missing_key' });
  }

  // То, что вы реально отправляете на Apps Script:
  const payload = {
    action: body.action || 'lead',
    data: body.data || body, // оставляем совместимость со старым фронтом
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
    const json = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();

    // отдадим как есть; статус пробросим
    return res.status(r.ok ? 200 : 500).json(json);
  } catch (err) {
    return res.status(502).json({ ok: false, error: 'apps_fetch_failed', detail: String(err) });
  }
}
