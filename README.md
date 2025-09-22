# CFG consulting – Canonical Drop (Node 20)

**Что уже сделано**
- Серверная функция `api/lead.js` на **Node 20** (см. `vercel.json`), сама считает подпись **HMAC-SHA256** по `CFG_KEY_V2` над `JSON.stringify({ action:'lead', data })` и отправляет в `APPS_SCRIPT_URL` с заголовком `x-cfg-sig`.
- Нормализатор входа: принимает как плоское тело формы, так и `{ action, data }`.
- Фронтовый хелпер `assets/js/sendLead.js`: `sendLead(data)` и `connectLeadForm(form)`.

## Переменные окружения (Vercel → Project → Settings → Environment Variables)

- `APPS_SCRIPT_URL` – ваш боевой URL Apps Script (Deploy → Web App).  
- `CFG_KEY_V2` – 64‑символьный hex‑ключ. Должен совпадать со значением в Apps Script → *Script Properties* → `CFG_KEY_V2`.  
  (Опционально `CFG_KEY` можно оставить для обратной совместимости, но расчёт подписи идёт по `CFG_KEY_V2`.)

После изменения ENV – сделайте новый деплой.

## Использование на странице
```html
<script type="module">
  import { connectLeadForm } from '/assets/js/sendLead.js';
  connectLeadForm(document.querySelector('#lead-form'));
</script>
```
Или ручной вызов из консоли:
```js
fetch('/api/lead', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ name:'Тест', email:'test@example.com' })
}).then(r=>r.json()).then(console.log);
```

## Замечания
- Подпись всегда делается **на сервере**. Никаких ключей на клиенте.
- Ответ функции уже содержит `upstream_status` и `upstream_body` для диагностики.
