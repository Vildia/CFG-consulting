'use strict';

const crypto = require('crypto');

// Env
const APPS_SCRIPT_URL = String(process.env.APPS_SCRIPT_URL || '').trim();
const CFG_KEY_V2      = String(process.env.CFG_KEY_V2 || process.env.CFG_KEY || '').trim();
const ORIGIN          = String(process.env.ORIGIN || '').trim();

function json(obj){ return JSON.stringify(obj); }
function hmacHex(key, str){
  return crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(str, 'utf8').digest('hex');
}
function header(res, origin){
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-cfg-sig');
}

// Extract body helper
async function readBody(req){
  const ctype = (req.headers['content-type'] || '').toLowerCase();
  if (ctype.includes('application/json')) {
    return req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  }
  if (ctype.includes('application/x-www-form-urlencoded')) {
    const raw = typeof req.body === 'string' ? req.body : '';
    const out = {};
    new URLSearchParams(raw).forEach((v,k)=>{ out[k]=v; });
    return out;
  }
  // fallback: try json
  try { return JSON.parse(req.body || '{}'); } catch(_) { return {}; }
}

function sameOrigin(reqOrigin){
  const o = (reqOrigin||'').replace(/\/$/,'');
  const allowed = (ORIGIN||'').split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean);
  if (!allowed.length) return true;
  return allowed.includes(o);
}

exports.config = { runtime: 'nodejs' };

module.exports = async function handler(req, res){
  const reqOrigin = req.headers.origin || '';
  if (req.method === 'OPTIONS'){
    header(res, sameOrigin(reqOrigin)? reqOrigin : '*');
    return res.status(204).end();
  }

  if (req.method !== 'POST'){
    header(res, sameOrigin(reqOrigin)? reqOrigin : '*');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }

  if (!APPS_SCRIPT_URL || !CFG_KEY_V2){
    header(res, sameOrigin(reqOrigin)? reqOrigin : '*');
    return res.status(500).json({ ok:false, error:'env_missing' });
  }

  try {
    const incoming = await readBody(req);

    // Normalize input
    let action = 'lead';
    let data;
    if (incoming && typeof incoming === 'object' && 'action' in incoming && 'data' in incoming) {
      action = String(incoming.action || 'lead');
      data = incoming.data || {};
    } else {
      data = incoming || {};
    }
    const normalized = { action, data };

    // Prepare server-to-AppsScript signature (regardless of client signature)
    const payloadStr = json(normalized);
    const sig = hmacHex(CFG_KEY_V2, payloadStr);

    // Forward to Apps Script
    const fetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : (await import('node-fetch')).default;
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cfg-sig': sig
      },
      body: payloadStr,
    });

    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); } catch(_){ body = { raw:text }; }

    header(res, sameOrigin(reqOrigin)? reqOrigin : '*');
    return res.status(200).json({
      ok: true,
      upstream_status: upstream.status,
      upstream_body: body,
    });
  } catch (e){
    header(res, sameOrigin(req.headers.origin || '')? (req.headers.origin || '*') : '*');
    return res.status(500).json({ ok:false, error:'server_crash', message: (e && e.message) || String(e) });
  }
};
