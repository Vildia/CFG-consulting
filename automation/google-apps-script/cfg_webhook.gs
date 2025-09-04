/**
 * CFG — Webhook to Google Sheets (Variant B)
 * Publish: Deploy → New deployment → Web app → Execute as Me; Who has access: Anyone
 * Copy the Web app URL and paste it into site JS (ENDPOINT).
 * Set config once: setConfig('email@example.com', 'TELEGRAM_BOT_TOKEN', 'CHAT_ID', 'optional_secret');
 */
const CFG = {
  SHEET_NAME: 'Лиды C|F|G consulting',
  TZ: 'Asia/Irkutsk'
};

function setConfig(emailTo, botToken, chatId, secret){
  const p = PropertiesService.getScriptProperties();
  if (emailTo) p.setProperty('EMAIL_TO', emailTo);
  if (botToken) p.setProperty('BOT_TOKEN', botToken);
  if (chatId) p.setProperty('CHAT_ID', String(chatId));
  if (secret) p.setProperty('WEBHOOK_SECRET', secret);
  Logger.log('EMAIL_TO=%s', p.getProperty('EMAIL_TO'));
  Logger.log('BOT_TOKEN=%s', p.getProperty('BOT_TOKEN')?'set':'(not set)');
  Logger.log('CHAT_ID=%s', p.getProperty('CHAT_ID')||'(not set)');
  Logger.log('WEBHOOK_SECRET=%s', p.getProperty('WEBHOOK_SECRET')?'set':'(not set)');
}

function doPost(e){
  try{
    const p = PropertiesService.getScriptProperties();
    const secret = p.getProperty('WEBHOOK_SECRET') || '';
    const body = e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(body);

    if (secret && data.secret !== secret) {
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:'forbidden'})).setMimeType(ContentService.MimeType.JSON);
    }

    const now = new Date();
    const ts = Utilities.formatDate(now, CFG.TZ, 'yyyy-MM-dd HH:mm:ss');

    // Create or open sheet
    const ss = getOrCreateSpreadsheet_();
    const sheet = ss.getActiveSheet();

    // Ensure header
    const header = ['timestamp','name','company','inn','email','phone','desc','locale','utm_source','utm_medium','utm_campaign','utm_content','utm_term','page_url','referrer','user_agent'];
    ensureHeader_(sheet, header);

    // Append row
    const row = [
      ts, safe(data.name), safe(data.company), safe(data.inn), safe(data.email), safe(data.phone), safe(data.desc),
      safe(data.locale), safe(data.utm_source), safe(data.utm_medium), safe(data.utm_campaign), safe(data.utm_content), safe(data.utm_term),
      safe(data.page_url), safe(data.referrer), safe(e.parameter && e.parameter.user_agent ? e.parameter.user_agent : (e.headers && e.headers['User-Agent'] || ''))
    ];
    sheet.appendRow(row);

    // Notifications
    const EMAIL_TO = p.getProperty('EMAIL_TO');
    if (EMAIL_TO) {
      const subj = 'Новая заявка с лендинга • ' + (data.name || 'без имени');
      const bodyText = 
        'Дата ('+CFG.TZ+'): ' + ts + '\\n' +
        'Имя: ' + safe(data.name) + '\\n' +
        'Компания: ' + safe(data.company) + '\\n' +
        'ИНН: ' + safe(data.inn) + '\\n' +
        'Email: ' + safe(data.email) + '\\n' +
        'Телефон: ' + safe(data.phone) + '\\n' +
        'Запрос: ' + safe(data.desc) + '\\n\\n' +
        'UTM: ' + [safe(data.utm_source), safe(data.utm_medium), safe(data.utm_campaign), safe(data.utm_content), safe(data.utm_term)].filter(Boolean).join(' / ') + '\\n' +
        'Страница: ' + safe(data.page_url) + '\\n' +
        'Referrer: ' + safe(data.referrer);
      MailApp.sendEmail(EMAIL_TO, subj, bodyText);
    }
    const BOT_TOKEN = p.getProperty('BOT_TOKEN'), CHAT_ID = p.getProperty('CHAT_ID');
    if (BOT_TOKEN && CHAT_ID) {
      const msg = '<b>Новая заявка</b>\\n' +
        'Имя: ' + esc_(data.name) + '\\n' +
        'Email: ' + esc_(data.email) + '\\n' +
        'Тел: ' + esc_(data.phone) + '\\n' +
        'Компания: ' + esc_(data.company) + '\\n' +
        'Запрос: ' + esc_(data.desc) + '\\n' +
        'UTM: ' + esc_([data.utm_source, data.utm_medium, data.utm_campaign, data.utm_content, data.utm_term].filter(Boolean).join(' / ') || '-') + '\\n' +
        'Страница: ' + esc_(data.page_url||'-');
      UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
        method:'post', contentType:'application/json', muteHttpExceptions:true,
        payload: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode:'HTML', disable_web_page_preview:true })
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSpreadsheet_(){
  const name = CFG.SHEET_NAME;
  const files = DriveApp.getFilesByName(name);
  if (files.hasNext()) {
    const file = files.next();
    const ss = SpreadsheetApp.openById(file.getId());
    return ss;
  } else {
    const ss = SpreadsheetApp.create(name);
    return ss;
  }
}
function ensureHeader_(sheet, header){
  const r = sheet.getRange(1,1,1,header.length).getValues()[0];
  const hasHeader = r.some(function(v){ return v && String(v).trim() !== ''; });
  if (!hasHeader) {
    sheet.getRange(1,1,1,header.length).setValues([header]);
  }
}
function safe(v){ return v==null?'':String(v); }
function esc_(s){ return safe(s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[c]); }); }
