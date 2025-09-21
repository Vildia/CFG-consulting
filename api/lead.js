// api/lead.js
// Воркеры Vercel (Node runtime 18+)

import { createHmac } from 'node:crypto';

// Явно фиксируем runtime (ВАЖНО: без ".x" в версии)
export const config = { runtime: 'nodejs' };

// Помощь: читаем JSON безопасно
async function readJson(req) {
  try { return await new Promise((res, rej) => {
    let b=''; req.on('data', c=>b+=c);
    req.on('end', ()=>{ try { res(JSON.parse(b||'{}')); } catch(e){ rej(e);} });
    req.on('error', rej);
  }); } catch { return null; }
}

// Нормализация входа (поддержка 2 форматов)
function normalizeIncoming(body) {
  // вариант А: плоский {name,email,...} => action:'lead'
  if (body && typeof body === 'object' && !('action' in body)) {
    return { action: 'lead', data: body };
  }
  // вариант Б: {action, data}
  const action = typeof body?.action === 'string' ? body.action : 'lead';
  const data   = (body && typeof body.data === 'object') ? body.data : (body || {});
  return { action, data };
}

// HMAC (hex)
function hmacHex(keyHex, str) {
  const key = Buffer.from(keyHex, 'hex');
  return createHmac('sha256', key).update(str, 'utf8').digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL; // URL веб-приложения Apps Script
  const KEY_HEX  = process.env.CFG_KEY_V2 || process.env.CFG_KEY;

  if (!APPS_URL || !KEY_HEX) {
    return res.status(500).json({ ok: false, error: 'env_missing', have: { APPS_URL: !!APPS_URL, KEY: !!KEY_HEX } });
  }

  // читаем вход
  const raw = await readJson(req);
  const { action, data } = normalizeIncoming(raw);

  // нормализуем полезную нагрузку и подписываем
  const normalized = { action, data };
  const payloadStr = JSON.stringify(normalized);
  const sig = hmacHex(KEY_HEX, payloadStr);

  // ключ-идентификатор (чтобы GAS мог понимать, каким ключом проверять; можно выдрать 8–12 символов из key)
  const key_id = (KEY_HEX || '').slice(0, 12);

  // собираем тело для Apps Script — ВАЖНО: подпись внутри body
  const upstreamBody = JSON.stringify({ ...normalized, sig, key_id });

  let upstreamResp, upstreamJson;
  try {
    upstreamResp = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // дублируем в заголовок — вдруг когда-нибудь переедете с GAS
        'X-CFG-SIG': sig,
        'X-CFG-KEY-ID': key_id,
      },
      body: upstreamBody,
    });

    // пробуем прочитать JSON, но не падаем, если там пусто
    const txt = await upstreamResp.text();
    upstreamJson = txt ? JSON.parse(txt) : {};
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_failed', detail: String(e) });
  }

  // прокидываем ответ
  return res.status(200).json({
    ok: true,
    upstream_status: upstreamResp.status,
    upstream_body: upstreamJson,
  });
}
