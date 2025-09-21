// api/lead.js
// Воркеры Vercel (Node): прокси в Google Apps Script с HMAC-подписью

import { createHmac } from 'crypto';

// ВАЖНО: правильный рантайм для Vercel
export const config = { runtime: 'nodejs' };

/** Подпись payload-а hex-ключом (HMAC-SHA256) */
function signHex(hexKey, payloadString) {
  const key = Buffer.from(String(hexKey).trim(), 'hex');
  return createHmac('sha256', key).update(payloadString).digest('hex');
}

/** Пробует безопасно распарсить JSON текст */
async function tryJson(res) {
  const text = await res.text().catch(() => '');
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text };
  }
}

/** Нормализация входа к виду { action, data } */
function normalizeIncoming(body) {
  // Если уже { action, ... } — уважаем
  if (body && typeof body === 'object' && body.action) {
    const { action, data, ...rest } = body;
    // если data нет, соберём из остальных полей (бывает, что кладут рядом)
    return { action, data: data ?? rest ?? {} };
  }
  // Плоское тело -> это лид
  return { action: 'lead', data: body ?? {} };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const KEY_HEX = process.env.CFG_KEY_V2 || process.env.CFG_KEY;

  if (!APPS_URL || !KEY_HEX) {
    return res.status(500).json({
      ok: false,
      error: 'env_missing',
      missing: {
        APPS_SCRIPT_URL: !APPS_URL,
        CFG_KEY_V2_or_CFG_KEY: !KEY_HEX,
      },
    });
  }

  // Vercel уже распарсит JSON в req.body, если заголовок правильный
  const body = req.body ?? {};
  const normalized = normalizeIncoming(body);

  // Небольшая диагностическая ручка — НЕ показывает секреты
  if (normalized.action === 'env') {
    return res.status(200).json({
      ok: true,
      version: 'v2.1',
      env: {
        var_used: process.env.CFG_KEY_V2 ? 'CFG_KEY_V2' : 'CFG_KEY',
        has_apps_url: Boolean(APPS_URL),
        vercel_env: process.env.VERCEL_ENV || 'production',
        node_env: process.env.NODE_ENV || 'production',
      },
    });
  }

  // Подписываем СТРОКУ, которую и отправим
  const payloadString = JSON.stringify(normalized);
  const sig = signHex(KEY_HEX, payloadString);

  // Отправляем в Apps Script
  let upstreamRes;
  try {
    upstreamRes = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CFG-SIG': sig,
      },
      body: payloadString,
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_fetch_failed', details: String(e?.message || e) });
  }

  // Попробуем вернуть полезный ответ наверх (без секретов)
  const parsed = await tryJson(upstreamRes);
  // Если Apps Script вернул ошибку — пробросим статус
  if (!upstreamRes.ok) {
    return res.status(upstreamRes.status).json({
      ok: false,
      error: 'upstream_error',
      upstream_status: upstreamRes.status,
      upstream_body: parsed.data,
    });
  }

  return res.status(200).json({
    ok: true,
    upstream_status: upstreamRes.status,
    upstream_body: parsed.data,
  });
}
