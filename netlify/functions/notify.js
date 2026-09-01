exports.handler = async function(event, context) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars' })
    };
  }

  var url = 'https://api.telegram.org/bot' + token + '/sendMessage';

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Someone opened MAKI TP just now.'
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
