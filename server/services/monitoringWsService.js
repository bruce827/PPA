const { WebSocket, WebSocketServer } = require('ws');
const logger = require('../utils/logger');

let wss = null;

function init(httpServer) {
  if (wss) return wss;
  if (!httpServer) return null;

  wss = new WebSocketServer({ server: httpServer, path: '/api/monitoring/ws' });

  wss.on('connection', (ws) => {
    ws.__monitoring = {
      steps: new Set(),
    };

    try {
      ws.send(JSON.stringify({ type: 'hello', data: { serverTime: Date.now() } }));
    } catch (e) {}

    ws.on('message', (buf) => {
      try {
        const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
        const msg = JSON.parse(text);

        if (msg && msg.type === 'subscribe') {
          const steps = Array.isArray(msg.steps) ? msg.steps : [];
          ws.__monitoring.steps = new Set(steps.map((s) => String(s)).filter(Boolean));
          ws.send(
            JSON.stringify({
              type: 'subscribed',
              data: { steps: Array.from(ws.__monitoring.steps) },
            })
          );
          return;
        }

        if (msg && msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', data: { serverTime: Date.now() } }));
          return;
        }
      } catch (e) {
        try {
          ws.send(JSON.stringify({ type: 'error', error: 'bad_message' }));
        } catch (_e) {}
      }
    });

    ws.on('error', (err) => {
      try {
        logger.warn('Monitoring WS client error', { error: err && err.message });
      } catch (e) {}
    });
  });

  wss.on('error', (err) => {
    try {
      logger.error('Monitoring WS server error', { error: err && err.message });
    } catch (e) {}
  });

  return wss;
}

function close() {
  if (!wss) return Promise.resolve();
  const current = wss;
  wss = null;

  return new Promise((resolve) => {
    try {
      for (const client of current.clients) {
        try {
          client.terminate();
        } catch (e) {}
      }
    } catch (e) {}

    try {
      current.close(() => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function publishAiLogCreated(payload) {
  if (!wss) return;
  if (!payload) return;

  const step = payload.step ? String(payload.step) : '';
  if (!step) return;

  const msg = JSON.stringify({ type: 'ai_log_created', data: payload });

  for (const client of wss.clients) {
    try {
      if (!client || client.readyState !== WebSocket.OPEN) continue;
      const steps = client.__monitoring?.steps;
      if (!steps || steps.size === 0) continue;
      if (!steps.has(step)) continue;
      client.send(msg);
    } catch (e) {}
  }
}

module.exports = {
  init,
  close,
  publishAiLogCreated,
};
