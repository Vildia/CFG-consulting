// /api/lead.js — Vercel Node Function (Node.js runtime, not Edge)
/**
 * Environment variables expected on Vercel:
 *  - APPS_SCRIPT_URL (exec URL of your Google Apps Script)
 *  - CFG_KEY_V2      (64-char hex HMAC key; preferred)
 *  - CFG_KEY         (optional fallback 64-char hex)
 *  - ORIGIN          (allowed origin for CORS, e.g. https://cfg-consulting.vercel.app )
 */
const crypto = require("crypto");

function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return (v === undefined || v === null || v === "") ? fallback : String(v);
}
function isHex64(x) { return typeof x === "string" && /^[0-9a-fA-F]{64}$/.test(x); }

const APPS_SCRIPT_URL = getEnv("APPS_SCRIPT_URL");
const ORIGIN = getEnv("ORIGIN", "*");     // if not set, allow all (not recommended for prod)
const KEY_HEX_V2 = getEnv("CFG_KEY_V2");
const KEY_HEX = getEnv("CFG_KEY");        // fallback

function hmacHex(keyHex, payloadStr) {
  const keyBuf = Buffer.from(keyHex, "hex");
  return crypto.createHmac("sha256", keyBuf).update(payloadStr).digest("hex");
}

// Allow both formats: flat body {name,email,...} OR { action:'lead', data:{...} }
function normalizeBody(reqBody) {
  let action = "lead";
  let data = undefined;

  if (reqBody && typeof reqBody === "object" && !Array.isArray(reqBody)) {
    if (Object.prototype.hasOwnProperty.call(reqBody, "action")) {
      // { action, data }
      action = reqBody.action || "lead";
      data = reqBody.data || {};
    } else {
      // flat -> wrap
      data = reqBody;
    }
  } else {
    data = {};
  }
  return { action, data };
}

function json(res, status, obj) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).end(JSON.stringify(obj));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cfg-sig");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Vary", "Origin");
}

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  if (!APPS_SCRIPT_URL) {
    return json(res, 500, { ok: false, error: "env_missing", missing: ["APPS_SCRIPT_URL"] });
  }

  // Parse body (Vercel already parsed JSON if correct header, but be safe)
  let bodyObj;
  try {
    bodyObj = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  } catch {
    bodyObj = {};
  }

  // Normalize and sign on server
  const normalized = normalizeBody(bodyObj);
  const payloadStr = JSON.stringify(normalized);

  let keyToUse = undefined;
  if (isHex64(KEY_HEX_V2)) keyToUse = KEY_HEX_V2;
  else if (isHex64(KEY_HEX)) keyToUse = KEY_HEX;

  if (!keyToUse) {
    return json(res, 500, { ok: false, error: "missing_hmac_key", hint: "Set CFG_KEY_V2 (64-hex) or fallback CFG_KEY in Vercel env." });
  }

  const sig = hmacHex(keyToUse, payloadStr);

  // Forward to Apps Script
  let upstreamStatus = 0;
  let upstreamBody = null;
  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cfg-sig": sig,
      },
      body: payloadStr,
    });
    upstreamStatus = r.status;
    // Try to parse JSON; if fails, take text
    const text = await r.text();
    try { upstreamBody = JSON.parse(text); } catch { upstreamBody = { text }; }
  } catch (e) {
    return json(res, 502, { ok: false, error: "upstream_failed", detail: String(e) });
  }

  return json(res, 200, { ok: true, upstream_status: upstreamStatus, upstream_body: upstreamBody });
};
