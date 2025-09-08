# C|F|G — Deploy package (robust)

Что внутри
- Страницы сайта (форма «прошита» action/method/target на ваш Apps Script endpoint + JS-дубль через fetch FormData).
- `vercel.json` — политика CSP разрешает отправку форм и fetch на `script.google.com`.
- `automation/google-apps-script/webhook_v2.gs` — код веб-хука (для Apps Script).

Деплой
1) Загрузите все файлы из архива в **корень** репозитория GitHub (заменой старых).
2) Vercel автоматически сделает Production-деплой.
3) Убедитесь, что в Apps Script веб-приложение развёрнуто как новая версия и доступ **Все**.
4) (один раз) Выполните в Apps Script: `setConfig('C.F.G.consulting@bk.ru')`.

Тест
- Откройте `/?utm_source=test&utm_medium=cpc&utm_campaign=qa` и отправьте форму.
- В Google Sheets (таблица «Лиды C|F|G consulting», лист «Заявки») появится строка, придёт e-mail (и Telegram, если настроен).
