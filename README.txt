CFG consulting — canonical build (v29)

CFG consulting – canonical build (v18)

Что внутри
-----------
- api/lead.js              — серверная функция Vercel (Node), считает подпись на сервере.
- assets/js/sendLead.js    — маленький helper для страницы (подпись НЕ нужна).
- vercel.json              — принудительно включает Node.js runtime для /api/lead.
- .github/workflows/...    — опциональный автодеплой на Vercel по пушу (можно удалить).

Переменные окружения Vercel (Project → Settings → Environment Variables)
-----------------------------------------------------------------------
APPS_SCRIPT_URL  — exec URL вашего Apps Script
CFG_KEY_V2       — 64-символьный hex (тот же в Script Properties: CFG_KEY_V2)
ORIGIN           — ваш домен (например https://cfg-consulting.vercel.app)
(опц.) CFG_KEY   — старый 64-hex, как резерв

Форма на странице
-----------------
<script type="module">
  import { connectLeadForm } from '/assets/js/sendLead.js';
  connectLeadForm(document.querySelector('#lead-form'));
</script>

или вручную:
<script type="module">
  import { sendLead } from '/assets/js/sendLead.js';
  const r = await sendLead({ name: 'Тест', email: 'test@example.com' });
  console.log(r);
</script>
