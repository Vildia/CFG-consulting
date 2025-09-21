// /api/lead.js  — ВЕРСИЯ ДЛЯ NODE RUNTIME (Vercel serverless по умолчанию)
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const { APPS_SCRIPT_URL, CFG_KEY } = process.env;
    if (!APPS_SCRIPT_URL || !CFG_KEY) {
      return res.status(500).json({ ok: false, error: 'server_misconfigured' });
    }

    // 1) Читаем и нормализуем тело: поддерживаем и плоский формат, и {action, data}
    const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let action, data;

    if (raw && typeof raw === 'object' && 'action' in raw && 'data' in raw) {
      action = raw.action || 'lead';
      data   = raw.data   || {};
    } else {
      action = raw.action || 'lead';
      const { action: _drop, sig: _sig, __sig: _s2, signature: _s3, ...rest } = raw || {};
      data = rest;
    }

    // 2) Считаем подпись по JSON.stringify(data) с ключом CFG_KEY (HEX!)
    const sig = crypto
      .createHmac('sha256', Buffer.from(CFG_KEY, 'hex'))
      .update(JSON.stringify(data))
      .digest('hex');

    // 3) Отправляем на Apps Script уже нормализованное тело с подписью
    const payload = { action, data, sig };

    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Возвращаем то, что ответил Apps Script (JSON или текст — без разницы)
    const text = await r.text();
    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(200).send(text);
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
