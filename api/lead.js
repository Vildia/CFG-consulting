// api/lead.js
// Node.js runtime (Vercel Functions)

import crypto from "node:crypto";

export const config = {
  // явный нодовый рантайм
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // --------- ENV ----------
  const APPS_URL = process.env.APPS_SCRIPT_URL;
  // ключ берём из CFG_KEY_V2, иначе из старого CFG_KEY
  const KEY_HEX = process.env.CFG_KEY_V2 || process.env.CFG_KEY || "";

  if (!APPS_URL || !KEY_HEX) {
    return res.status(500).json({
      ok: false,
      error: "env_missing",
      have: { APPS_URL: !!APPS_URL, CFG_KEY_V2: !!process.env.CFG_KEY_V2, CFG_KEY: !!process.env.CFG_KEY },
    });
  }

  // --------- НОРМАЛИЗАЦИЯ ВХОДА ----------
  // поддерживаем 2 формы:
  // A) плоское тело {name, email, ...}
  // B) { action:'lead', data:{...} }
  let body;
  try {
    body = req.body || {};
  } catch (e) {
    return res.status(400).json({ ok: false, error: "bad_json" });
  }

  const isV2 = body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "action");
  const action = isV2 ? body.action : "lead";
  const data = isV2 ? body.data || {} : body;

  const normalized = { action, data };

  // --------- ПОДПИСЬ ----------
  const payload = JSON.stringify(normalized);
  const sig = crypto.createHmac("sha256", Buffer.from(KEY_HEX, "hex"))
    .update(payload)
    .digest("hex");

  // --------- ПРОКСИ НА APPS SCRIPT ----------
  let upstreamResp, upstreamJson, upstreamStatus;
  try {
    upstreamResp = await fetch(APPS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Дублируем подпись: и в заголовке, и в теле.
        // Некоторые веб-аппы GAS не отдают кастомные заголовки в e.headers
        // — поэтому кладём ещё и в body.
        "X-CFG-SIG": sig,
      },
      body: JSON.stringify({
        ...normalized,
        // дубли-поля для надёжности (любой из них может прочитать бэкенд)
        sig,
        x_cfg_sig: sig,
      }),
    });

    upstreamStatus = upstreamResp.status;

    // если GAS отдал не-JSON, не падаем
    try {
      upstreamJson = await upstreamResp.json();
    } catch {
      upstreamJson = { raw: await upstreamResp.text() };
    }
  } catch (err) {
    return res.status(502).json({ ok: false, error: "upstream_failed", detail: String(err) });
  }

  // --------- ЕДИНЫЙ ОТВЕТ ВПЕРЁД ----------
  return res.status(200).json({
    ok: true,
    upstream_status: upstreamStatus,
    upstream_body: upstreamJson,
  });
}
