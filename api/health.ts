import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function handler(req:VercelRequest, res:VercelResponse){
  const hasURL = !!process.env.APPS_SCRIPT_URL;
  const hasKey = !!process.env.CFG_KEY;
  const origin = String(req.headers.origin || ('https://' + (req.headers.host || '')));
  res.status(200).json({ ok:true, env:{ has_APPS_SCRIPT_URL:hasURL, has_CFG_KEY:hasKey, origin, ORIGIN:(process.env.ORIGIN||''), ORIGIN_PREVIEW:(process.env.ORIGIN_PREVIEW||'') } });
}
