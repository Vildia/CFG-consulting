// api/lead.js
// Vercel Node.js Function (2nd gen). Совместимо с Node 18+

import { createHmac, createHash } from 'node:crypto';

export const config = {
  runtime: 'nodejs', // поддерживается Vercel: ["edge","experimental-edge","nodejs"]
};

// ---- вспомогательные утилиты ----
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function hexToBytes(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('CFG_KEY_V2 must be even-length hex');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function keyIdFromHex(hex) {
  // короткий id ключа (как вы уже сверяли в консоли)
  const id = createHash('sha256').update(Buffer.from(hexToBytes(hex))).digest('hex');
  return id.slice(0, 12);
}

// ---- основная функция ----
export default async function handler(req, res) {
  // CORS на всякий случай
  res.setHeader('Access-Control-Allow-Origin', process.env.ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CFG-SIG, X-CFG-KEY-ID');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const APPS_URL = process.env.APPS_SCRIPT_URL;
  const KEY_HEX  = process.env.CFG_KEY_V2 || process.env.CFG_KEY; // подстрахуемся
  if (!APPS_URL || !KEY_HEX) {
    return res.status(500).json({ ok: false, error: 'env_missing' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'bad_json' });
  }

  // ---- нормализация входа ----
  // А) плоское тело {name, email, ...}
  // Б) { action: 'lead', data: {...} }
  let action = 'lead';
  let data   = {};

  const looksFlat =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    Object.prototype.hasOwnProperty.call(body, 'name');

  if (looksFlat) {
    data = body;
  } else if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'action')) {
    action = body.action || 'lead';
    data   = body.data || {};
  } else {
    // пусто — допустим
    data = {};
  }

  const normalized = { action, data }; // ВАЖНО: подписываем ровно эту строку

  // ---- считаем подпись ----
  let signature, key_id;
  try {
    const payload = JSON.stringify(normalized);
    signature = createHmac('sha256', Buffer.from(hexToBytes(KEY_HEX)))
      .update(payload)
      .digest('hex');
    key_id = keyIdFromHex(KEY_HEX);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'sign_failed' });
  }

  // ---- отправка в Apps Script ----
  // Дадим все варианты — и в заголовке, и в теле, и key_id и там и там.
  const upstreamBody = {
    ...normalized,
    sig: signature,
    key_id,
  };

  let upstreamResp;
  try {
    upstreamResp = await fetch(APPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // оба заголовка — чтобы точно дошло в GAS
        'X-CFG-SIG': signature,
        'X-CFG-KEY-ID': key_id,
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_fetch_failed' });
  }

  let upstreamJson = null;
  try {
    // Apps Script часто возвращает JSON; если пусто — не падаем
    upstreamJson = await upstreamResp.json().catch(() => null);
  } catch {
    upstreamJson = null;
  }

  // Возвращаем вам всё как есть, плюс статус — для простого дебага в консоли
  return res.status(200).json({
    ok: true,
    upstream_status: upstreamResp.status,
    upstream_body: upstreamJson,
  });
}
