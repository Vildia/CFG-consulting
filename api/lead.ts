import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL!;
const CFG_KEY = process.env.CFG_KEY!;
const ORIGIN_PROD = process.env.ORIGIN || 'https://cfg-consulting.vercel.app';
const ORIGIN_PREVIEW = process.env.ORIGIN_PREVIEW || '';

const RATE = new Map<string,{count:number,ts:number}>();
const WINDOW_MS = 60_000; const LIMIT = 30;

function allow(res:VercelResponse, origin:string){ 
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

export default async function handler(req:VercelRequest, res:VercelResponse) {
  const origin = String(req.headers.origin||'');
  const allowed = [ORIGIN_PROD, ORIGIN_PREVIEW].filter(Boolean);
  if (req.method === 'OPTIONS'){ 
    if (!allowed.includes(origin)) return res.status(403).json({ok:false,error:'forbidden_origin'});
    allow(res, origin); return res.status(204).end(); 
  }
  if (req.method !== 'POST') return res.status(405).json({ok:false,error:'method_not_allowed'});
  if (!allowed.includes(origin)) return res.status(403).json({ok:false,error:'forbidden_origin'});
  allow(res, origin);
  // rate limit
  const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || '0.0.0.0';
  const now = Date.now(); const rec = RATE.get(ip) || {count:0, ts:now};
  if (now - rec.ts > WINDOW_MS){ rec.count=0; rec.ts=now; } rec.count+=1; RATE.set(ip,rec);
  if (rec.count > LIMIT) return res.status(429).json({ok:false,error:'rate_limited'});
  // body + HMAC in JSON
  let data:any = req.body || {};
  if (typeof data==='string'){ try{ data = JSON.parse(data); }catch{} }
  const payload = JSON.stringify(data || {});
  const hmac = crypto.createHmac('sha256', CFG_KEY).update(payload).digest('hex');
  const bodyWithSig = JSON.stringify({ ...data, _sig: hmac });
  try{
    const r = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: bodyWithSig });
    const text = await r.text();
    try{ const j = JSON.parse(text); if (r.ok && j && j.ok) return res.status(200).json({ok:true}); return res.status(502).json({ok:false,error:'apps_script_error'});}catch{ return res.status(502).json({ok:false,error:'apps_script_bad_json'}); }
  }catch(e:any){ return res.status(500).json({ok:false,error:'proxy_error'}); }
}
