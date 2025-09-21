// api/lead.js
// Edge-функция для Vercel (Node 18+)

import { createHmac } from 'node:crypto';

export const config = {
  // Явно фиксируем рантайм под Vercel
  runtime: 'nodejs18.x',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const APPS_URL = process.env.APPS_SCRIPT_URL;
    const KEY_HEX  = process.env.CFG_KEY_V2 || process.env.CFG_KEY;

    if (!APPS_URL || !KEY_HEX) {
      return res
        .status(500)
        .json({ ok: false, error: 'env_missing', have: { APPS_URL: !!APPS_URL, KEY: !!KEY_HEX } });
    }

    // ---------- Нормализация входа ----------
    // Принимаем оба варианта:
    // 1) плоское тело { name, email, ... }
    // 2) { action: 'lead', data: {...} }
    const body = await safeJson(req);
    const isV2  = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'action');

    const action = isV2 ? String(body.action || 'lead') : 'lead';
    const data   = isV2 ? (body.data || {}) : (body || {});

    // Единый объект для подписи/отправки
    const normalized = { action, data };

    // ---------- Считаем подпись (клиент НЕ подписывает) ----------
    const payload = JSON.stringify(normalized);
    const keyBuf  = Buffer.from(KEY_HEX, 'hex');
    const sig     = createHmac('sha256', keyBuf).update(payload).digest('hex');

    // ---------- Проксируем в Apps Script ----------
    const upstream = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // это и есть то, чего не хватало:
        'X-CFG-SIG': sig,
        // по желанию можно проставить origin для логов
        'X-Origin': process.env.ORIGIN || '',
      },
      body: payload,
    });

    const text = await upstream.text();

    // Попробуем отдать JSON, если это JSON; иначе — сырой текст
    try {
      const json = JSON.parse(text);
      return res.status(upstream.ok ? 200 : 500).json(json);
    } catch {
      return res.status(upstream.ok ? 200 : 500).send(text);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'internal', detail: String(err?.message || err) });
  }
}

// Безопасный разбор JSON-тела
async function safeJson(req) {
  try {
    const raw = await getRawBody(req);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Считываем сырой body (Edge/Node18)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
