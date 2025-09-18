import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as crypto from 'crypto';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL as string;
const CFG_KEY = process.env.CFG_KEY as string;
const ORIGIN_PROD = process.env.ORIGIN || 'https://cfg-consulting.vercel.app';
const ORIGIN_PREVIEW = (process.env.ORIGIN_PREVIEW || '').trim(); // optional explicit preview origin

const RATE = new Map<string,{count:number,ts:number}>();
const WINDOW_MS = 60_000; const LIMIT = 30;

function norm(u:string){ try{ return String(u||'').replace(/\/$/,'').trim(); }catch(_){ return String(u||''); } }
function isAllowedOrigin(origin:string, allowed:string[]):boolean{
  origin = norm(origin);
  allowed = (allowed||[]).map(norm);
  if (!origin) return false;
  if (allowed.includes(origin)) return true;
  try{ const u = new URL(origin); if (u.hostname.endsWith('.vercel.app')) return true; }catch{}
  return false;
}

function allow(res:VercelResponse, origin:string){
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

export default async function handler(req:VercelRequest, res:VercelResponse){
  const origin = String(req.headers.origin || ('https://' + (req.headers.host || '')));
  const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean);

  if (req.method === 'GET'){
    // Compat GET proxy or status check
    const q:any = (req.query||{});
    if (q && (q['compat'] || q['action'])) {
      if (!APPS_SCRIPT_URL || !CFG_KEY) return res.status(500).json({ok:false,error:'env_not_configured'});
      if (!isAllowedOrigin(origin, allowed)) return res.status(403).json({ok:false,error:'forbidden_origin'});
      allow(res, origin);
      const data:any = {
        action: q['action'] || 'estimate_24h',
        locale: q['locale'] || 'ru',
        name: q['name'] || '',
        company: q['company'] || '',
        inn: q['inn'] || '',
        email: q['email'] || '',
        phone: q['phone'] || '',
        message: q['message'] || q['desc'] || q['task'] || '',
        industry: q['industry'] || '',
        revenue: q['revenue'] || '',
        geo: q['geo'] || '',
        urgency: q['urgency'] || '',
        page_url: q['page_url'] || '',
        referrer: q['referrer'] || '',
        utm: {}
      };
      const payload = JSON.stringify(data);
      const hmac = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
      const body = JSON.stringify({ ...data, _sig: hmac });
      try{
        const r = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body });
        const text = await r.text(); let j:any; try{ j = JSON.parse(text); }catch(e){}
        if (!r.ok) return res.status(502).json({ ok:false, error:'apps_script_http_'+r.status, text });
        if (j) return res.status(200).json(j);
        return res.status(200).send(text);
      }catch(e:any){
        return res.status(500).json({ ok:false, error:'proxy_error', message: String(e && e.message || e) });
      }
    }
    if (!isAllowedOrigin(origin, allowed)) return res.status(403).json({ok:false,error:'forbidden_origin'});
    allow(res, origin);
    return res.status(200).json({ ok:true, mode:'status', env:{ has_APPS_SCRIPT_URL: !!APPS_SCRIPT_URL, has_CFG_KEY: !!CFG_KEY }, origin, allowed });
  }

  
    const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean).map(s=>String(s).trim());
    const origin = String(req.headers.origin || ('https://' + (req.headers.host || '')));
    if (!isAllowedOrigin(origin, allowed)) return res.status(403).json({ok:false,error:'forbidden_origin'});
    allow(res, origin);
    return res.status(200).json({ ok:true, mode:'status', env:{ has_APPS_SCRIPT_URL: !!APPS_SCRIPT_URL, has_CFG_KEY: !!CFG_KEY }, origin, allowed });
  }

  if (req.method === 'OPTIONS'){
    if (!isAllowedOrigin(origin, allowed)) return res.status(403).json({ok:false,error:'forbidden_origin'});
    allow(res, origin); return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'method_not_allowed'});
  if (!APPS_SCRIPT_URL || !CFG_KEY) return res.status(500).json({ok:false,error:'env_not_configured'});
  if (!isAllowedOrigin(origin, allowed)) return res.status(403).json({ok:false,error:'forbidden_origin'});
  allow(res, origin);

  // naive in-memory rate limit
  const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || '0.0.0.0';
  const now = Date.now();
  const rec = RATE.get(ip) || {count:0, ts:now};
  if (now - rec.ts > WINDOW_MS){ rec.count = 0; rec.ts = now; }
  rec.count += 1; RATE.set(ip, rec);
  if (rec.count > LIMIT) return res.status(429).json({ok:false,error:'rate_limited'});

  // parse body and attach HMAC
  let data:any = req.body || {};
  if (typeof data === 'string' && data.includes('=') && !data.trim().startsWith('{')) {
    try { data = Object.fromEntries(new URLSearchParams(data as any)); } catch(_){}
  }
  if (typeof data === 'string'){ try { data = JSON.parse(data); } catch(e){} }
  if (!data || typeof data !== 'object') data = {};
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
  const body = JSON.stringify({ ...data, _sig: hmac });

  try {
    const r = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body });
    const text = await r.text();
    let j:any; try { j = JSON.parse(text); } catch(e){ j = undefined; }
    if (!r.ok) return res.status(502).json({ ok:false, error:'apps_script_http_'+r.status, text });
    if (j) return res.status(200).json(j);
    return res.status(200).send(text);
  } catch (e:any) {
    return res.status(500).json({ ok:false, error:'proxy_error', message: String(e && e.message || e) });
  }
}