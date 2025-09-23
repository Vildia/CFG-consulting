
const crypto = require('crypto');

// Env (trim extra spaces/newlines)
const APPS_SCRIPT_URL = String(process.env.APPS_SCRIPT_URL || '').trim();
const CFG_KEY = String(process.env.CFG_KEY || '').trim();
const ORIGIN_PROD = String(process.env.ORIGIN || '').trim();
const ORIGIN_PREVIEW = String(process.env.ORIGIN_PREVIEW || '').trim();

// Normalize only spaces for signature (keep key order intact)
function _nb(s){ return String(s||'').replace(/\u00A0|\u202F/g,' '); }
function normalizeSpaces(obj){
  if (obj==null) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeSpaces);
  if (typeof obj === 'object'){
    const out = {};
    for (const k of Object.keys(obj)){
      const v = obj[k];
      out[k] = (typeof v === 'string') ? _nb(v).trim() : normalizeSpaces(v);
    }
    return out;
  }
  return (typeof obj === 'string') ? _nb(obj).trim() : obj;
}

function norm(u){ try{ return String(u||'').trim().replace(/\/$/, ''); }catch(_){ return String(u||''); } }
function isAllowedOrigin(origin, allowed){ origin = norm(origin); allowed = (allowed||[]).map(norm); return !origin || allowed.includes(origin); }
function allow(res, origin){
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function proxyToAppsScript(data){
  const norm = normalizeSpaces(data);
  const payload = JSON.stringify(norm);
  const hmac = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
  const body = JSON.stringify({ ...norm, _sig: hmac });
  const r = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body });
  const text = await r.text();
  let j; try{ j = JSON.parse(text); }catch(_){}
  if (!r.ok) return { status: 502, body: { ok:false, error:'apps_script_http_'+r.status, text }};
  return { status: 200, body: j || { ok:true, text } };
}

module.exports = async (req, res) => {
  const origin = String(req.headers.origin || ('https://' + (req.headers.host || '')));
  const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean);

  try{
    if (req.method === 'OPTIONS'){
      allow(res, origin); res.statusCode = 204; return res.end();
    }

    // Status endpoint or compat GET
    if (req.method === 'GET'){
      const q = req.query || {};
      if (q && (q.compat || q.action)){
        if (!APPS_SCRIPT_URL || !CFG_KEY) { allow(res, origin); return res.status(500).json({ ok:false, error:'env_not_configured' }); }
        if (!isAllowedOrigin(origin, allowed)) { allow(res, origin); return res.status(403).json({ ok:false, error:'forbidden_origin' }); }
        allow(res, origin);
        const data = {
          action: q.action || 'estimate_24h',
          locale: q.locale || 'ru',
          name: q.name || '',
          company: q.company || '',
          inn: q.inn || '',
          email: q.email || '',
          phone: q.phone || '',
          message: q.message || q.desc || q.task || '',
          industry: q.industry || '',
          revenue: q.revenue || '',
          geo: q.geo || '',
          urgency: q.urgency || '',
          page_url: q.page_url || '',
          referrer: q.referrer || '',
          utm: {}
        };
        const out = await proxyToAppsScript(data);
        allow(res, origin);
        return res.status(out.status).json(out.body);
      }
      // Just status
      allow(res, origin);
      return res.status(200).json({
        ok: true,
        mode: 'status',
        env: { has_APPS_SCRIPT_URL: !!APPS_SCRIPT_URL, has_CFG_KEY: !!CFG_KEY },
        origin,
        allowed
      });
    }

    // POST
    if (req.method === 'POST'){
      if (!APPS_SCRIPT_URL || !CFG_KEY) { allow(res, origin); return res.status(500).json({ ok:false, error:'env_not_configured' }); }
      if (!isAllowedOrigin(origin, allowed)) { allow(res, origin); return res.status(403).json({ ok:false, error:'forbidden_origin' }); }
      allow(res, origin);

      let data = req.body || {};
      if (typeof data === 'string'){
        if (data.trim().startsWith('{')) { try{ data = JSON.parse(data); }catch(_){ data = {}; } }
        else { try{ data = Object.fromEntries(new URLSearchParams(data)); }catch(_){ data = {}; } }
      }

      const payload = {
        action: data.action || 'estimate_24h',
        locale: data.locale || 'ru',
        name: data.name || '',
        company: data.company || '',
        inn: data.inn || '',
        email: data.email || '',
        phone: data.phone || '',
        message: data.message || data.desc || data.task || '',
        industry: data.industry || '',
        revenue: data.revenue || '',
        geo: data.geo || '',
        urgency: data.urgency || '',
        page_url: data.page_url || '',
        referrer: data.referrer || '',
        utm: data.utm || {}
      };

      const out = await proxyToAppsScript(payload);
      return res.status(out.status).json(out.body);
    }

    // Fallback
    allow(res, origin);
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }catch(e){
    // Never crash silently — always JSON
    try{ allow(res, origin); }catch(_){}
    return res.status(500).json({ ok:false, error:'server_crash', message: String(e && e.message || e) });
  }
};
