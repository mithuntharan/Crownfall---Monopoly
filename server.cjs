/**
 * Crownfall Monopoly — Unified .io Game Server
 *
 * This is the root production server file used to deploy Crownfall.
 * It serves:
 *   1. The compiled React frontend (from dist/)
 *   2. The authoritative REST API (/api/multiplayer/...)
 *   3. Realtime WebSocket connections for live multiplayer ga  meplay (ws:// / wss://)
 *   4. Spawns the authoritative C++ native engine backend
 *
 * Deploy Commands:
 *   - Start command: node server.cjs (or npm start)
 *   - Build command: npm run build
 */

const { server, PORT, HOST, rooms } = require('./scripts/multiplayer_server.cjs');

if (!server.listening) {
  server.listen(PORT, HOST, () => {
    console.log(`\n================================================================`);
    console.log(`Crownfall Monopoly (.io Game Server) is LIVE!`);
    console.log(`Web & API URL:   http://${HOST}:${PORT}`);
    console.log(`WebSocket URL:   ws://${HOST}:${PORT}`);
    console.log(`Port:            ${PORT}`);
    console.log(`================================================================\n`);
  });
}

module.exports = server;
