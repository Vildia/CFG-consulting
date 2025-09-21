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
    const body = req.body || {};

    // 1) Достаём action и данные, поддерживая ДВА варианта входа:
    //    а) { action, data: {...} }
    //    б) { action, name, company, ... } (плоский)
    const action = body.action;
    let data = body.data;

    if (!data) {
      const { action: _a, _sig: _s, ...rest } = body;
      if (Object.keys(rest).length) data = rest; // плоский формат → считаем это "data"
    }

    if (action !== 'lead' || !data) {
      res.status(400).json({ ok: false, error: 'bad_payload' });
      return;
    }

    // 2) Подписываем РОВНО JSON.stringify(data) — именно это ждёт Apps Script
    const sig = hmacHex(process.env.CFG_KEY, JSON.stringify(data));

    // 3) Формируем нормализованное тело, которое всегда одинаково для скрипта
    const payload = { action, data, _sig: sig };

    // 4) Отправляем в Apps Script и дублируем подпись в заголовке
    const resp = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-Sig': sig,
      },
      body: JSON.stringify(payload),
    });

    const json = await resp.json().catch(() => ({}));
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server_error', detail: String(e?.message || e) });
  }
}
