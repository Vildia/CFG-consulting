// api/lead.js — Vercel Serverless Function (Node.js)

import crypto from 'node:crypto';

function hmacHex(secret, msg) {
  return crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  try {
    const { action, data } = req.body || {};
    if (action !== 'lead' || !data) {
      res.status(400).json({ ok: false, error: 'bad_payload' });
      return;
    }

    // 1) Подписываем РОВНО JSON.stringify(data) — этого ждёт Apps Script
    const sig = hmacHex(process.env.CFG_KEY, JSON.stringify(data));

    // 2) Отправляем в Apps Script подписанные данные
    const resp = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-Sig': sig,              // дублируем в заголовке
      },
      body: JSON.stringify({ action, data, _sig: sig }), // и в теле
    });

    // 3) Пробрасываем ответ клиенту (и возможные ошибки)
    const json = await resp.json().catch(() => ({}));
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', detail: String(e?.message || e) });
  }
}
