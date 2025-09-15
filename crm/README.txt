CRM интеграция (опционально, бесплатно) — HubSpot Forms API
1) Создай бесплатный аккаунт HubSpot → Marketing → Forms → Создать форму → Скопируй:
   - Portal ID
   - Form GUID
2) Вставь на страницы перед </head> строки:
   <script>window.CFG_HS_PORTAL_ID='ВАШ_PORTAL_ID'; window.CFG_HS_FORM_GUID='ВАШ_FORM_GUID';</script>
   <script src="crm/hubspot.js" defer></script>
3) Добавь атрибут data-crm="hubspot" на форму, которую нужно слать в CRM:
   <form id="estimate" data-crm="hubspot">…</form>
4) Готово. При отправке форма улетит в HubSpot; при ошибке покажется уведомление на странице.



