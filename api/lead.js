
'use strict';
const crypto = require('crypto');
const APPS_SCRIPT_URL = String(process.env.APPS_SCRIPT_URL || '').trim();
const CFG_KEY         = String(process.env.CFG_KEY || '').trim();
const ORIGIN_PROD     = String(process.env.ORIGIN || '').trim();
const ORIGIN_PREVIEW  = String(process.env.ORIGIN_PREVIEW || '').trim();
function norm(u){ try{ return String(u||'').trim().replace(/\/$/, ''); }catch(_){ return String(u||''); } }
function isAllowedOrigin(origin, allowed){ origin = norm(origin); allowed = (allowed||[]).map(norm).filter(Boolean); return !origin || allowed.includes(origin); }
function allow(res, origin){
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
async function doFetch(url, opts){
  if (typeof fetch === 'undefined') {
    const mod = await import('node-fetch');
    return mod.default(url, opts);
  }
  return fetch(url, opts);
}
async function proxyToAppsScript(data){
  const payload = JSON.stringify(data || {});
  const sig = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
  const body = JSON.stringify({ ...JSON.parse(payload), _sig: sig });
  const r = await doFetch(APPS_SCRIPT_URL, { method:'POST', headers:{ 'Content-Type':'application/json' }, body });
  const text = await r.text().catch(()=>'');
  let json = null; try{ json = text ? JSON.parse(text) : null; }catch(_){ json = null; }
  return { ok: r.ok, status: r.status, text, json };
}
module.exports = async function handler(req, res){
  try{
    const origin = req.headers['origin'] || '';
    const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean);
    allow(res, isAllowedOrigin(origin, allowed) ? origin : '*');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'method_not_allowed' });
    if (!APPS_SCRIPT_URL) return res.status(500).json({ ok:false, error:'env_missing_apps_script_url' });
    if (!CFG_KEY)         return res.status(500).json({ ok:false, error:'env_missing_cfg_key' });
    let data = req.body;
    if (typeof data === 'string'){
      data = data.trim();
      if (data.startsWith('{')) { try{ data = JSON.parse(data); }catch(_){ data = {}; } }
      else { try{ data = Object.fromEntries(new URLSearchParams(data)); }catch(_){ data = {}; } }
    }
    data = data && typeof data === 'object' ? data : {};
    const payload = {
      action:  data.action || (req.url.includes('estimate') ? 'estimate_24h' : 'lead'),
      locale:  data.locale || 'ru',
      name:    data.name   || '',
      company: data.company|| '',
      inn:     data.inn    || '',
      email:   data.email  || '',
      phone:   data.phone  || '',
      note:    data.note   || data.desc || '',
      industry:data.industry|| '',
      revenue: data.revenue || '',
      geo:     data.geo     || '',
      urgency: data.urgency || '',
      url:     data.url     || '',
      referer: data.referer || '',
      utm_source:  data.utm_source  || '',
      utm_medium:  data.utm_medium  || '',
      utm_campaign:data.utm_campaign|| '',
      utm_term:    data.utm_term    || '',
      utm_content: data.utm_content || ''
    };
    const out = await proxyToAppsScript(payload);
    if (out.ok) {
      const body = (out.json && typeof out.json === 'object') ? out.json : { ok:true, status: out.status };
      return res.status(200).json(body);
    } else {
      return res.status(502).json({ ok:false, error:'apps_script_http_'+out.status, text: out.text || null });
    }
  } catch (e){
    try{ allow(res, '*'); }catch(_){}
    return res.status(500).json({ ok:false, error:'server_crash', message: String(e && e.message || e) });
  }
};
