# Changelog — cfg-v3

## 2025-09-17
- Unified **all lead forms** to go through `POST /api/lead` with JSON payload; removed any direct calls to Google Apps Script from client-side code.
- Injected **CFG unified lead sender v3** on all HTML pages: collects fields (name/company/INN/email/phone/message), adds UTM/referrer/page_url/locale, supports honeypot, unified statuses and custom events (`cfg:form-state`, `cfg:form-success`, `cfg:form-error`).
- Added **GA4 initialization (G-D7QRTPW2F3)** with consent-aware loader: initializes immediately if consent cookie/storage `cfg_analytics=1` is present; otherwise waits for either buttons with common selectors (`[data-analytics-consent]`, `[data-cookie-accept]`, `#cookie-accept`, `[data-cc="accept"]`, `.cookie-accept`) or custom event `cfg:consent-granted`.
- Partner form now also includes **UTM/referrer/page_url/locale** automatically via the unified sender.
- Kept self-test and serverless `/api/lead` endpoint unchanged; no changes to Apps Script code required.
## 2025-09-17 — cfg-v7
- Кнопка «Предложить слот» теперь открывает универсальное модальное окно с выбором канала (Письмо/Гугл/Аутлук/Яндекс/Mail.ru/WhatsApp/Telegram/Звонок/Форма/Копировать шаблон).
- Во все каналы подставляются тема и текст (страница, язык, UTM, время).
- Telegram: попытка deep-link + резерв на web.
- «Форма» скроллит к форме и подставляет текст в поле описания задачи.
