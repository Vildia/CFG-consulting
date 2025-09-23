// api/lead.js
// Serverless-функция Vercel для пересылки лидов в Google Apps Script.
// Требует переменные окружения: APPS_SCRIPT_URL, CFG_KEY, ORIGIN, ORIGIN_PREVIEW (опц.)

const crypto = require('crypto');

// ---- Vercel runtime (важно: без версии) ----
module.exports.config = { runtime: 'nodejs' };

// ---- Env ----
const APPS_SCRIPT_URL = String(process.env.APPS_SCRIPT_URL || '').trim();
const CFG_KEY = String(process.env.CFG_KEY || '').trim();
const ORIGIN_PROD = String(process.env.ORIGIN || '').trim();
const ORIGIN_PREVIEW = String(process.env.ORIGIN_PREVIEW || '').trim();

// ---- утилиты ----
const tryString = (v) => { try { return String(v || '').trim(); } catch { return String(v); } };

function isAllowedOrigin(origin) {
  const norm = (x) => tryString(x).toLowerCase();
  const o = norm(origin);
  return [ORIGIN_PROD, ORIGIN_PREVIEW].map(norm).filter(Boolean).includes(o);
}

function allowCORS(res, origin) {
  if (origin && isAllowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Стабильная канонизация объекта (сортировка ключей, рекурсивно)
function stablePayload(input) {
  if (Array.isArray(input)) return input.map(stablePayload);
  if (input && typeof input === 'object') {
    const ordered = {};
    Object.keys(input).sort().forEach((k) => { ordered[k] = stablePayload(input[k]); });
    return ordered;
  }
  return input;
}

// Нормализация «сыра» из формы к единому виду
function normalizePayload(raw) {
  const qs = (k) => tryString(raw[k]);

  // Приводим к единому набору полей (пустые строки допустимы — GAS сам отфильтрует)
  const data = {
    action: qs('action') || 'estimate_24h',
    locale: qs('locale') || 'ru',
    name: qs('name') || qs('fio') || '',
    company: qs('company') || qs('org') || '',
    inn: qs('inn') || '',
    email: qs('email') || '',
    phone: qs('phone') || qs('tel') || '',
    desc: qs('comment') || qs('message') || qs('task') || '',
    industry: qs('industry') || '',
    revenue: qs('revenue') || '',
    geo: qs('geo') || '',
    urgency: qs('urgency') || '',
    page_url: qs('page_url') || qs('page') || '',
    referrer: qs('referrer') || qs('ref') || '',
  };

  // UTM / источник
  const knownUTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  data.utm = {};
  knownUTM.forEach((k) => {
    const v = qs(k);
    if (v) data.utm[k] = v;
  });

  return data;
}

// Подпись HMAC (канонизированные данные)
function signCanon(dataObj) {
  const canon = stablePayload(dataObj);
  const payload = JSON.stringify(canon);
  const hex = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
  return { canon, payload, hex };
}

// Отправка в Apps Script
async function proxyToAppsScript(data, origin) {
  const { canon, payload, hex } = signCanon(data);
  const body = JSON.stringify({ ...canon, _sig: hex });

  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  // Всегда возвращаем JSON
  let text = await resp.text();
  try { return { status: resp.status, body: JSON.parse(text) }; }
  catch { return { status: resp.status, body: { ok: false, error: 'invalid_json', raw: text } }; }
}

// ---- Handler ----
module.exports = async (req, res) => {
  const origin = tryString(req.headers.origin || `https://${req.headers.host || ''}`);
  allowCORS(res, origin);

  // Предварительная проверка env
  const envOK = Boolean(APPS_SCRIPT_URL) && Boolean(CFG_KEY);

  // Префлайт
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // /api/health
  if (req.url.includes('/api/health')) {
    return res.status(200).json({
      ok: true,
      env: {
        has_APPS_SCRIPT_URL: Boolean(APPS_SCRIPT_URL),
        has_CFG_KEY: Boolean(CFG_KEY),
      },
      origin: ORIGIN_PROD || '',
      ORIGIN: ORIGIN_PROD || '',
      ORIGIN_PREVIEW: ORIGIN_PREVIEW || '',
    });
  }

  // GET /api/lead
  if (req.method === 'GET') {
    const compat = tryString((req.query && req.query.compat) || '');
    if (compat) {
      if (!envOK) return res.status(500).json({ ok: false, error: 'env_not_configured' });

      // минимальный тест — отправляем sample-пакет
      const sample = {
        action: 'test_lead',
        locale: 'ru',
        name: 'Тестовый пользователь',
        company: 'ООО «Автопарк»',
        inn: '0000000000',
        email: 'test@example.com',
        phone: '+7 (900) 000-00-00',
        desc: 'Автотест / compat GET',
        page_url: `${ORIGIN_PROD || origin}/self-test.html`,
        referrer: '',
      };
      const out = await proxyToAppsScript(sample, origin);
      return res.status(out.status || 200).json(out.body);
    }

    // статус эндпоинта
    const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean);
    return res.status(200).json({
      ok: true,
      mode: 'status',
      env: { has_APPS_SCRIPT_URL: Boolean(APPS_SCRIPT_URL), has_CFG_KEY: Boolean(CFG_KEY) },
      origin,
      allowed,
    });
  }

  // POST /api/lead
  if (req.method === 'POST') {
    if (!envOK) return res.status(500).json({ ok: false, error: 'env_not_configured' });

    let data = {};
    try {
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        data = req.body || {};
      } else if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
        // Vercel сам парсит urlencoded → req.body объектом, но на всякий случай:
        data = req.body || {};
      } else {
        // fallback — пытаемся распарсить как JSON
        const txt = req.body && typeof req.body === 'string' ? req.body : '';
        data = txt ? JSON.parse(txt) : {};
      }
    } catch {
      data = {};
    }

    const normalized = normalizePayload(data);
    const out = await proxyToAppsScript(normalized, origin);
    return res.status(out.status || 200).json(out.body);
  }

  // Fallback
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
};
