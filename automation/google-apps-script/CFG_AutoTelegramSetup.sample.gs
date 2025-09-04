/**
 * CFG — Автонастройка Telegram (ШАБЛОН, БЕЗ ТОКЕНА)
 * 1) Установите токен Bot API: вставьте вместо PASTE_YOUR_BOT_TOKEN.
 * 2) Напишите любое сообщение своему боту в Telegram (Start → любое слово).
 * 3) Запустите CFG_AutoTelegramSetup() → скрипт сам узнает chat_id через getUpdates,
 *    сохранит BOT_TOKEN и CHAT_ID в свойствах скрипта и пришлёт тестовое уведомление.
 * ВНИМАНИЕ: НЕ КОММИТЬТЕ реальный токен в публичный репозиторий.
 */
function CFG_AutoTelegramSetup() {
  const TOKEN = 'PASTE_YOUR_BOT_TOKEN'; // ЗАМЕНИТЕ на реальный токен из @BotFather
  if (TOKEN.includes('PASTE_YOUR_BOT_TOKEN')) {
    throw new Error('Укажите реальный токен в переменной TOKEN.');
  }
  const props = PropertiesService.getScriptProperties();

  // Получаем обновления и ищем chat_id
  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + TOKEN + '/getUpdates');
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) throw new Error('Bot API error: ' + JSON.stringify(data));

  let chatId = null;
  for (var i = data.result.length - 1; i >= 0; i--) {
    var upd = data.result[i];
    if (upd.message && upd.message.chat && upd.message.chat.id) { chatId = upd.message.chat.id; break; }
    if (upd.my_chat_member && upd.my_chat_member.chat && upd.my_chat_member.chat.id) { chatId = upd.my_chat_member.chat.id; break; }
    if (upd.channel_post && upd.channel_post.chat && upd.channel_post.chat.id) { chatId = upd.channel_post.chat.id; break; }
  }
  if (!chatId) throw new Error('chat_id не найден. Напишите боту сообщение и запустите снова.');

  // Сохраняем и отправляем тест
  props.setProperties({ BOT_TOKEN: TOKEN, CHAT_ID: String(chatId) }, true);
  UrlFetchApp.fetch('https://api.telegram.org/bot' + TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: 'CFG: тестовое уведомление — интеграция включена.',
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });

  Logger.log('Готово. CHAT_ID: %s', chatId);
}
