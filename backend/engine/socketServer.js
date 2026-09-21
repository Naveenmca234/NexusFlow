const { WebSocketServer, WebSocket } = require('ws');

let wss = null;
const clients = new Set();

/**
 * Initialize the WebSocket Server on the shared HTTP server
 * @param {import('http').Server} httpServer 
 */
function initWebSocketServer(httpServer) {
  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  console.log('[WebSocket] Initializing NexusFlow Real-time WebSocket Server on /ws...');

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    const ip = req.socket.remoteAddress;
    console.log(`[WebSocket] 🟢 Client connected (${ip}). Active clients: ${clients.size}`);

    // Send immediate welcome handshake with server info
    try {
      ws.send(JSON.stringify({
        type: 'CONNECTION_ESTABLISHED',
        payload: {
          service: 'NexusFlow Real-Time Engine',
          connectedAt: new Date().toISOString(),
          activeClients: clients.size,
        },
      }));
    } catch (e) {
      console.warn('[WebSocket] Error sending handshake:', e.message);
    }

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        // Non-JSON ping or invalid payload
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] 🔴 Client disconnected. Remaining: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket Client Error]:', err.message);
      clients.delete(ws);
    });
  });

  // Heartbeat ping every 30s to clean stale connections
  const interval = setInterval(() => {
    if (!wss) return;
    for (const ws of clients) {
      if (ws.isAlive === false) {
        clients.delete(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

/**
 * Broadcast an event payload to all connected WebSocket clients
 * @param {string} type - Event type (e.g. 'TELEMETRY_UPDATE', 'ALERT_TRIGGERED', 'RULE_STATUS')
 * @param {any} payload - Event data payload
 */
function broadcast(type, payload) {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.warn('[WebSocket Broadcast Error]:', err.message);
      }
    }
  }
}

/**
 * Get the count of currently active WebSocket clients
 */
function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  initWebSocketServer,
  broadcast,
  getConnectedClientsCount,
};
