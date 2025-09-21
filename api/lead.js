// pages/api/lead.js
import crypto from "node:crypto";

// чтение ENV из Vercel
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL; // .../exec
const CFG_KEY_HEX     = process.env.CFG_KEY;         // hex-ключ

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-cfg-sig");
}

function hmacHex(hexKey, payload) {
  return crypto.createHmac("sha256", Buffer.from(hexKey, "hex"))
               .update(payload, "utf8")
               .digest("hex");
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end(); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" }); return;
  }

  // 1) Н О Р М А Л И З А Ц И Я  В Х О Д А
  //    принимаем и плоское тело, и { action, data }
  const raw = req.body ?? {};
  let action;
  let data;

  if (raw && typeof raw === "object" && "action" in raw && "data" in raw) {
    action = raw.action || "lead";
    data   = raw.data || {};
  } else {
    // «плоское» тело – забираем action из него (если есть), остальное считаем данными
    action = raw.action || "lead";
    // клон без action (чтобы не попадал в подпись)
    const { action: _drop, ...rest } = raw || {};
    data = rest;
  }

  // Удалим возможные поля подписи, чтобы они не попали в payload для HMAC
  if (data && typeof data === "object") {
    delete data.sig;
    delete data.__sig;
    delete data.signature;
  }

  // 2) П О Д П И С Ь
  const payload = JSON.stringify(data);
  const expectedSig = hmacHex(CFG_KEY_HEX, payload).toLowerCase();

  // можно принять подпись из хедера (если вы решите слать её с клиента)
  const gotSig =
    (req.headers["x-cfg-sig"] || "").toString().toLowerCase();

  // если подписи нет в хедере — добавим свою в тело при проксировании
  const sig = gotSig || expectedSig;

  // 3) Проксируем на Apps Script (в формате { action, data, sig })
  try {
    const rsp = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data, sig }),
    });

    const json = await rsp.json().catch(() => ({}));
    // Пробросим ответ как есть
    res.status(rsp.ok ? 200 : 500).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: "apps_script_fetch_failed", detail: String(e) });
  }
}
