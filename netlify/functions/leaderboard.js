var getStore = require('@netlify/blobs').getStore;

function getLeaderboardStore(){
  var siteID = process.env.NETLIFY_BLOBS_SITE_ID;
  var token = process.env.NETLIFY_BLOBS_TOKEN;

  if(siteID && token){
    return getStore({ name: 'leaderboard', siteID: siteID, token: token });
  }

  return getStore('leaderboard');
}

exports.handler = async function(event) {
  var store = getLeaderboardStore();
  var params = event.queryStringParameters || {};
  var duration = params.duration || '120';
  var key = 'scores-' + duration;

  if (event.httpMethod === 'GET') {
    if (params.action === 'clear') {
      var adminKey = process.env.LEADERBOARD_ADMIN_KEY;
      if (!adminKey || params.key !== adminKey) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid or missing key' })
        };
      }

      var durationsToClear = (duration === 'all') ? ['30', '60', '120', '300'] : [duration];
      for (var d = 0; d < durationsToClear.length; d++) {
        await store.setJSON('scores-' + durationsToClear[d], []);
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, cleared: durationsToClear })
      };
    }

    try {
      var raw = await store.get(key, { type: 'json' });
      var scores = raw || [];
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: scores })
      };
    } catch (err) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: [] })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      var body = JSON.parse(event.body || '{}');
      var name = String(body.name || 'Anonymous').slice(0, 20).trim() || 'Anonymous';
      var clientId = String(body.clientId || '').slice(0, 64).trim();
      var wpm = parseInt(body.wpm, 10);
      var acc = parseInt(body.acc, 10);

      if (!wpm || wpm <= 0 || wpm > 400 || isNaN(acc) || acc < 0 || acc > 100) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid score' })
        };
      }

      var existing = [];
      try {
        var rawExisting = await store.get(key, { type: 'json' });
        existing = rawExisting || [];
      } catch (e) {
        existing = [];
      }

      if (clientId) {
        var matchIndex = -1;
        for (var i = 0; i < existing.length; i++) {
          if (existing[i].clientId === clientId) {
            matchIndex = i;
            break;
          }
        }

        if (matchIndex !== -1) {
          if (wpm > existing[matchIndex].wpm) {
            existing[matchIndex] = {
              clientId: clientId,
              name: name,
              wpm: wpm,
              acc: acc,
              date: new Date().toISOString()
            };
          }
        } else {
          existing.push({
            clientId: clientId,
            name: name,
            wpm: wpm,
            acc: acc,
            date: new Date().toISOString()
          });
        }
      } else {
        existing.push({
          name: name,
          wpm: wpm,
          acc: acc,
          date: new Date().toISOString()
        });
      }

      existing.sort(function(a, b){ return b.wpm - a.wpm; });
      existing = existing.slice(0, 50);

      await store.setJSON(key, existing);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, scores: existing })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
