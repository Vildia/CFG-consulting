# C|F|G consulting — Landing (GitHub package)

Этот пакет содержит **полный исходник** лендинга с интеграцией Google Forms (iFrame) и UTM-префиллом.

## Что включено
- Встроенная Google Форма (вместо кастомной формы) на страницах:
  - `Лендинг/index.html`
  - `Лендинг/en.html`
  - `Лендинг/zh.html`
- UTM-префилл и авто-передача `page_url`/`referrer` внутрь формы.
- Папка `automation/google-apps-script/` со скриптами для:
  - создания формы + Google Sheet + email-уведомления (без токенов),
  - шаблон авто-настройки Telegram (без токена).

## Быстрый старт
1. Залейте репозиторий в GitHub (или импортируйте ZIP).
2. Деплойте на Vercel как статический сайт.
3. В Google Apps Script запустите `setupCFGAll()` из файла `automation/google-apps-script/create_cfg_form_all.gs`:
   - Скрипт создаст форму, таблицу, включит триггер и выведет ссылки в логах.
   - iFrame URL и `entryMap` уже подставлены в HTML.
4. (Опц.) Подключите Telegram: используйте `automation/google-apps-script/CFG_AutoTelegramSetup.sample.gs`
   — замените `PASTE_YOUR_BOT_TOKEN` на реальный токен и выполните функцию `CFG_AutoTelegramSetup`.

### Политика конфиденциальности
Страница доступна по `/privacy.html`. Текст можно редактировать в `Лендинг/privacy.html`.

## Безопасность
- **Не коммитьте** реальный Bot Token в публичный репозиторий.
- Для секретов используйте Script Properties в Apps Script.
