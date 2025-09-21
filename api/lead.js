// api/lead.js
// ВЕРСИЯ ДЛЯ Vercel Functions (Node 18+)

import { createHmac } from 'node:crypto';

export const config = {
  // Явно фиксируем рантайм Node на Vercel
  runtime: 'nodejs18.x',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const APPS_URL = process.env.APPS_SCRIPT_URL;
    const KEY_HEX  = process.env.CFG_KEY;

    if (!APPS_URL || !KEY_HEX) {
      return res.status(500).json({ ok: false, error: 'env_missing', have: { APPS_URL: !!APPS_URL, KEY: !!KEY_HEX } });
    }

    // ---------- НОРМАЛИЗАЦИЯ ВХОДА ----------
    // Поддерживаем оба варианта:
    // A) плоское тело: {name, email, ...} => action='lead', data=<тело>
    // B) явный:       {action:'lead', data:{...}}
    const body = req.body || {};
    const isV2 = typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'action');

    const action = isV2 ? body.action : 'lead';
    const data   = isV2 ? body.data   : body;

    // Формируем ЕДИНЫЙ формат, который уйдёт в Apps Script
    const normalized = { action, data };

    // ---------- ПОДПИСЫВАЕМ РОВНО ЭТУ СТРОКУ ----------
    const payloadStr = JSON.stringify(normalized); // важно: подписываем И отправляем одну и ту же строку!
    const sigHex = signHexSha256(KEY_HEX, payloadStr);

    // ---------- ШЛЁМ В Apps Script ----------
    const upstream = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-SIG': sigHex,
      },
      body: payloadStr,
    });

    // Пробуем читать как JSON, иначе — как текст
    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, error: 'upstream_not_json', raw: text }; }

    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

// Подпись HMAC-SHA256 в hex
function signHexSha256(keyHex, message) {
  const key = Buffer.from(keyHex, 'hex');
  return createHmac('sha256', key).update(message).digest('hex');
}
