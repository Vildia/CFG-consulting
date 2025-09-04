/**
 * C|F|G — Полный автосетап Google Формы + Таблицы + уведомлений (email + Telegram)
 * (ИСПРАВЛЕНО) — убраны вызовы .asTextItem(), используем createResponse() напрямую.
 */
const CFG = {
  TZ: 'Asia/Irkutsk',
  PRIVACY_URL: 'https://cfg-consulting.vercel.app/privacy.html',
  DEFAULT_EMAIL_TO: 'C.F.G.consulting@bk.ru'
};

function setupCFGAll() {
  const FORM_TITLE = 'Заявка C|F|G consulting';
  const FORM_DESC  = 'Оставьте заявку — мы свяжемся в течение 24 часов.';
  const CONFIRM_MSG = 'Спасибо! Мы свяжемся в течение 24 часов.';

  // 1) Создаём форму
  const form = FormApp.create(FORM_TITLE);
  form.setDescription(FORM_DESC);
  form.setProgressBar(true);
  form.setAllowResponseEdits(false);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setConfirmationMessage(CONFIRM_MSG);
  form.setAcceptingResponses(true);

  // 2) Поля формы
  const items = {};
  items.name = form.addTextItem().setTitle('Имя').setRequired(true);
  items.phone = form.addTextItem().setTitle('Телефон / WhatsApp');
  items.tg = form.addTextItem().setTitle('Telegram (@username)');
  items.email = form.addTextItem().setTitle('Email').setHelpText('Если удобнее — оставьте Telegram вместо Email.');
  items.company = form.addTextItem().setTitle('Компания / роль');
  items.message = form.addParagraphTextItem().setTitle('Кратко о запросе').setRequired(true);

  form.addSectionHeaderItem().setTitle('Технические поля (заполняются автоматически)');
  items.utm_source = form.addTextItem().setTitle('utm_source');
  items.utm_medium = form.addTextItem().setTitle('utm_medium');
  items.utm_campaign = form.addTextItem().setTitle('utm_campaign');
  items.utm_content = form.addTextItem().setTitle('utm_content');
  items.utm_term = form.addTextItem().setTitle('utm_term');
  items.page_url = form.addTextItem().setTitle('page_url');
  items.referrer = form.addTextItem().setTitle('referrer');

  form.addCheckboxItem()
    .setTitle('Согласие на обработку персональных данных')
    .setChoiceValues(['Согласен(на)'])
    .setHelpText('Отправляя форму, вы подтверждаете согласие на обработку данных и передачу информации в сервисы Google для обработки заявки. Политика: ' + CFG.PRIVACY_URL)
    .setRequired(true);

  // 3) Создаём Таблицу и привязываем форму к ней
  const ss = SpreadsheetApp.create('Лиды C|F|G consulting');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // 4) EMAIL_TO по умолчанию
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('EMAIL_TO')) {
    props.setProperty('EMAIL_TO', CFG.DEFAULT_EMAIL_TO);
  }

  // 5) Генерация префилла и построение entryMap (ИСПРАВЛЕНО)
  const r = form.createResponse();
  r.withItemResponse(items.utm_source.createResponse('{utm_source}'));
  r.withItemResponse(items.utm_medium.createResponse('{utm_medium}'));
  r.withItemResponse(items.utm_campaign.createResponse('{utm_campaign}'));
  r.withItemResponse(items.utm_content.createResponse('{utm_content}'));
  r.withItemResponse(items.utm_term.createResponse('{utm_term}'));
  r.withItemResponse(items.page_url.createResponse('{page_url}'));
  r.withItemResponse(items.referrer.createResponse('{referrer}'));
  const prefillUrl = r.toPrefilledUrl();

  const entryMap = {};
  const query = prefillUrl.split('?')[1] || '';
  query.split('&').forEach(p => {
    const [k, v] = p.split('=');
    if (k && k.indexOf('entry.') === 0) {
      const val = decodeURIComponent((v || '').replace(/\+/g, ' '));
      if (/^\{.+\}$/.test(val)) {
        const key = val.replace(/^\{|\}$/g, '');
        entryMap[key] = k;
      }
    }
  });

  // 6) Триггер уведомлений
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyOnSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('notifyOnSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // 7) Логи
  Logger.log('=== ГОТОВО: ФОРМА + ТАБЛИЦА + ТРИГГЕР ===');
  Logger.log('Форма (редактирование): %s', form.getEditUrl());
  Logger.log('Форма (для ответов):   %s', form.getPublishedUrl());
  Logger.log('Встраивание (iFrame):  %s?embedded=true', form.getPublishedUrl());
  Logger.log('Таблица ответов:       %s', ss.getUrl());
  Logger.log('entryMap для UTM:      %s', JSON.stringify(entryMap, null, 2));
  Logger.log('Префилл-шаблон:        %s', prefillUrl);
  Logger.log('EMAIL_TO: %s', PropertiesService.getScriptProperties().getProperty('EMAIL_TO'));
  Logger.log('Подсказка: setTelegramConfig("ВАШ_ТОКЕН","ВАШ_CHAT_ID");');
}

function notifyOnSubmit(e) {
  const props = PropertiesService.getScriptProperties();
  const BOT_TOKEN = props.getProperty('BOT_TOKEN');
  const CHAT_ID   = props.getProperty('CHAT_ID');
  const EMAIL_TO  = props.getProperty('EMAIL_TO') || CFG.DEFAULT_EMAIL_TO;

  const nv = e && e.namedValues ? e.namedValues : {};
  const first = (x) => Array.isArray(x) ? (x[0] || '') : (x || '');
  const ts = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');

  const lead = {
    name: first(nv['Имя']),
    phone: first(nv['Телефон / WhatsApp']) || first(nv['Телефон']),
    tg: first(nv['Telegram (@username)']) || first(nv['Telegram']),
    email: first(nv['Email']) || first(nv['E-mail']),
    company: first(nv['Компания / роль']) || first(nv['Компания']),
    message: first(nv['Кратко о запросе']),
    utm_source: first(nv['utm_source']),
    utm_medium: first(nv['utm_medium']),
    utm_campaign: first(nv['utm_campaign']),
    utm_content: first(nv['utm_content']),
    utm_term: first(nv['utm_term']),
    page_url: first(nv['page_url']),
    referrer: first(nv['referrer'])
  };

  try {
    const subj = `Новая заявка с лендинга • ${lead.name || 'без имени'}`;
    const body =
      `Дата (${CFG.TZ}): ${ts}\n` +
      `Имя: ${lead.name}\nТелефон: ${lead.phone}\nTelegram: ${lead.tg}\nEmail: ${lead.email}\nКомпания: ${lead.company}\n` +
      `Запрос:\n${lead.message}\n\n` +
      `UTM: ${lead.utm_source || '-'} / ${lead.utm_medium || '-'} / ${lead.utm_campaign || '-'} / ${lead.utm_content || '-'} / ${lead.utm_term || '-'}\n` +
      `Страница: ${lead.page_url || '-'}\nReferrer: ${lead.referrer || '-'}`;
    MailApp.sendEmail(EMAIL_TO, subj, body);
  } catch (err) {
    console.error('MailApp error:', err);
  }

  if (BOT_TOKEN && CHAT_ID) {
    try {
      const escapeHtml = (s) => s ? s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : '';
      const msg =
        `<b>Новая заявка</b>\n` +
        `Дата: <code>${ts}</code>\n` +
        `Имя: ${escapeHtml(lead.name)}\n` +
        `Тел: ${escapeHtml(lead.phone)}\n` +
        `TG: ${escapeHtml(lead.tg)}\n` +
        `Email: ${escapeHtml(lead.email)}\n` +
        `Компания: ${escapeHtml(lead.company)}\n` +
        `Запрос: ${escapeHtml(lead.message)}\n` +
        `UTM: ${escapeHtml([lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content, lead.utm_term].filter(Boolean).join(' / ') || '-')}\n` +
        `Страница: ${escapeHtml(lead.page_url || '-')}`;
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
        muteHttpExceptions: true
      });
    } catch (err) {
      console.error('Telegram error:', err);
    }
  }
}

function setTelegramConfig(token, chatId, email) {
  if (!token || !chatId) {
    throw new Error('Укажите token и chatId: setTelegramConfig("ТОКЕН","CHAT_ID", "email@host")');
  }
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    BOT_TOKEN: token,
    CHAT_ID: String(chatId),
    EMAIL_TO: email || (props.getProperty('EMAIL_TO') || CFG.DEFAULT_EMAIL_TO)
  }, true);

  Logger.log('BOT_TOKEN установлен.');
  Logger.log('CHAT_ID установлен: %s', chatId);
  Logger.log('EMAIL_TO: %s', PropertiesService.getScriptProperties().getProperty('EMAIL_TO'));
  Logger.log('Готово: теперь новые заявки будут приходить в ваш Telegram и на Email.');
}

function showInfo() {
  const props = PropertiesService.getScriptProperties();
  Logger.log('EMAIL_TO: %s', props.getProperty('EMAIL_TO') || CFG.DEFAULT_EMAIL_TO);
  Logger.log('BOT_TOKEN: %s', props.getProperty('BOT_TOKEN') ? 'установлен' : '(не установлен)');
  Logger.log('CHAT_ID: %s', props.getProperty('CHAT_ID') || '(не установлен)');
  Logger.log('Подсказка: запустите setupCFGAll(), если форма ещё не создана.');
}

function removeNotifyTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'notifyOnSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Триггеры notifyOnSubmit удалены.');
}
