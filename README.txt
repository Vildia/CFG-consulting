# CFG - Canonical drop-in

Готовый комплект файлов:
- `api/lead.js` — сервер: нормализует `{action:'lead', data}`, подписывает HMAC и шлёт в Apps Script.
- `assets/js/sendLead.js` — клиент: отправляет данные формы; подпись не нужна.

## Что нужно в окружении Vercel
- `APPS_SCRIPT_URL` — exec URL вашего Apps Script
- `CFG_KEY_V2` — 64-символьный hex-ключ (тот же в Script Properties как `CFG_KEY_V2`)
- `ORIGIN` — домен для CORS, напр. `https://cfg-consulting.vercel.app`

(Если `CFG_KEY_V2` не задан, будет fallback на `CFG_KEY`, но лучше всегда задавать V2.)

## Быстрый старт
1. Скопируйте эти файлы в репозиторий (папки сохраняем).
2. Убедитесь, что переменные окружения заданы в Vercel.
3. Деплой → на странице можно использовать:

```html
<script type="module">
  import { connectLeadForm } from '/assets/js/sendLead.js';
  connectLeadForm(document.querySelector('#lead-form'));
</script>
```
или
```js
import { sendLead } from '/assets/js/sendLead.js';
sendLead({ name:'Тест', email:'test@example.com' });
```
