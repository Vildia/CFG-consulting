// /api/lead.ts — Vercel Serverless API (proxy to Google Apps Script)
import type { VercelRequest, VercelResponse } from 'vercel';

const ORIGIN = process.env.ORIGIN || 'https://cfg-consulting.vercel.app';
const APPS  = process.env.APPS_SCRIPT_URL as string; // Web app URL
const KEY   = process.env.CFG_KEY as string;

function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).end(); return; }
  try {
    if (!APPS || !KEY) throw new Error('Missing env vars');
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const userAgent = String(req.headers['user-agent'] || '');
    const origin = String(req.headers['origin'] || '');
    if (origin && origin !== ORIGIN) { res.status(403).json({ ok:false, error:'forbidden_origin' }); return; }
    const body = typeof req.body === 'object' ? req.body : JSON.parse(String(req.body||'{}'));
    const payload = { ...body, ip, userAgent, secret: KEY };
    const r = await fetch(APPS, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    let data:any=null; try{ data = await r.json(); } catch { data = { ok:r.ok }; }
    res.status(r.ok ? 200 : 500).json(data);
  } catch (e:any) {
    res.status(500).json({ ok:false, error:String(e && e.message || e) });
  }
}
