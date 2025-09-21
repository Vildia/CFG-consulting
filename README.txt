CFG consulting — canonical release (v18)

Что внутри
- api/lead.js — серверная функция Vercel (Node 18). Подписывает JSON и проксирует в Apps Script.
- assets/js/sendLead.js — клиентский помощник для отправки формы. Подпись на клиенте НЕ нужна.

Требуемые переменные окружения в Vercel (Project → Settings → Environment Variables):
- APPS_SCRIPT_URL = ваш текущий URL деплоя Apps Script (из документа «Развёртывание.docx»).
- CFG_KEY_V2      = 64‑символьный hex ключ (тот же, что и в Apps Script свойстве CFG_KEY_V2).
- ORIGIN          = https://cfg-consulting.vercel.app  (или ваш домен/поддомен).

Важно
- Сервер ВСЕГДА отправляет в Apps Script РОВНО JSON.stringify({action:'lead', data}).
- Подпись считается именно от этой строки. На клиенте ничего подписывать не надо.
- Если в ответе из /api/lead вы видите { ok:true, upstream_status:200, upstream_body:{ ok:false, error:'missing_signature' } }
  — это значит, что сервер НЕ приложил подпись. Проверьте переменную CFG_KEY_V2 (ровно 64 hex) и APPS_SCRIPT_URL.

GA
- В документе «GA.docx» указан GA ID: G-D7QRTPW2F3. Подключайте его в разметке страницы.
