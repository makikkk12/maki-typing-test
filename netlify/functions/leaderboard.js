var getStore = require('@netlify/blobs').getStore;

exports.handler = async function(event) {
  var store = getStore('leaderboard');
  var params = event.queryStringParameters || {};
  var duration = params.duration || '120';
  var key = 'scores-' + duration;

  if (event.httpMethod === 'GET') {
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

      existing.push({
        name: name,
        wpm: wpm,
        acc: acc,
        date: new Date().toISOString()
      });

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
