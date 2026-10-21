/**
 * Crownfall Authoritative Multiplayer Room Server
 * Coordinates rooms, connected players, dispatches validated actions to C++ engine,
 * and synchronizes authoritative game state snapshots via WebSocket (RFC 6455) & HTTP.
 *
 * Zero external dependencies: Uses built-in Node.js modules (http, crypto, child_process, fs, path).
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  getMonotonicTimeMs,
  resolveClientIp,
  globalRateLimiter,
  RATE_LIMIT_CONFIGS,
  verifyCaptchaToken,
  recordFailedJoin,
  clearSuspiciousJoin,
  isIpSuspicious,
  validateRoomCode,
  sanitizePlayerName,
  validateColor,
  VALID_COLORS,
  logSecurityEvent,
  securityEventLog,
} = require('./abuse_protection.cjs');

const PORT = parseInt(process.env.PORT || process.env.MULTIPLAYER_PORT || '10000', 10);
const HOST = process.env.MULTIPLAYER_HOST || process.env.HOST || '0.0.0.0';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS || '500', 10);
let activeConnections = 0;

function resolveEngineBinary() {
  if (process.env.ENGINE_BIN_PATH && fs.existsSync(process.env.ENGINE_BIN_PATH)) {
    return process.env.ENGINE_BIN_PATH;
  }
  const linuxBin = path.resolve(__dirname, '../bin/monopoly_engine');
  const winBin = path.resolve(__dirname, '../bin/monopoly_engine.exe');
  if (process.platform === 'win32') {
    if (fs.existsSync(winBin)) return winBin;
    if (fs.existsSync(linuxBin)) return linuxBin;
  } else {
    if (fs.existsSync(linuxBin)) return linuxBin;
    if (fs.existsSync(winBin)) return winBin;
  }
  return process.platform === 'win32' ? winBin : linuxBin;
}
const ENGINE_EXE = resolveEngineBinary();

// ─── C++ ENGINE PROCESS WRAPPER ───────────────────────────────────────────────

class CppEngineProcess {
  constructor(exePath = ENGINE_EXE) {
    this.exePath = exePath;
    this.process = null;
    this.queue = [];
    this.buffer = '';
  }

  ensureProcess() {
    if (this.process && !this.process.killed) return true;
    if (!fs.existsSync(this.exePath)) {
      console.warn('[MULTIPLAYER SERVER] Engine executable not found at:', this.exePath);
      return false;
    }
    try {
      this.process = spawn(this.exePath, ['--server'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (chunk) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.process.stderr.on('data', (chunk) => {
        console.error('[CPP ENGINE STDERR]:', chunk.toString());
      });

      this.process.on('exit', (code) => {
        console.log(`[CPP ENGINE] Process exited with code ${code}`);
        this.process = null;
        while (this.queue.length > 0) {
          const req = this.queue.shift();
          req.reject(new Error(`C++ Engine exited with code ${code}`));
        }
      });

      return true;
    } catch (err) {
      console.error('[MULTIPLAYER SERVER] Failed to spawn C++ engine:', err);
      this.process = null;
      return false;
    }
  }

  processBuffer() {
    let newlineIdx;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (!line) continue;

      if (this.queue.length > 0) {
        const req = this.queue.shift();
        try {
          const parsed = JSON.parse(line);
          req.resolve(parsed);
        } catch (e) {
          req.resolve({ ok: true, raw: line });
        }
      }
    }
  }

  sendCommand(cmdObj) {
    return new Promise((resolve, reject) => {
      if (!this.ensureProcess()) {
        return reject(new Error('C++ engine executable unavailable'));
      }
      this.queue.push({ resolve, reject });
      const str = typeof cmdObj === 'string' ? cmdObj : JSON.stringify(cmdObj);
      this.process.stdin.write(str + '\n');
    });
  }

  kill() {
    if (this.process) {
      try {
        this.process.stdin.write('quit\n');
        this.process.kill();
      } catch (_) {}
      this.process = null;
    }
  }
}

// ─── ROOM MANAGER ─────────────────────────────────────────────────────────────

const AVAILABLE_COLORS = [
  'saffron', 'teal', 'plum', 'blue', 'gold', 'burgundy', 'emerald', 'coral', 'bronze', 'purple'
];

const EMPTY_ROOM_TIMEOUT_MS = parseInt(process.env.EMPTY_ROOM_TIMEOUT_MS || String(10 * 60 * 1000), 10); // Exactly 10 minutes default

class Room {
  constructor(roomCode, hostName = 'Host', hostColor = 'saffron', rules = {}, hostClientId = null) {
    this.roomCode = roomCode;
    this.hostPlayerId = 0;
    this.gamePhase = 'LOBBY'; // 'LOBBY' | 'IN_PROGRESS' | 'GAME_OVER'
    this.settingsLocked = false;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.isExpired = false;
    this.emptyTimer = null;
    this.emptyDeadline = null;
    this.joinRequests = new Map(); // requestId -> JoinRequest
    this.rematchState = {
      readyPlayers: new Set(),
    };
    this.isRematching = false;

    this.rules = {
      defaultStartingMoney: rules.defaultStartingMoney ?? 25000,
      doublesRuleEnabled: rules.doublesRuleEnabled ?? true,
      maxPlayers: Math.max(2, Math.min(6, rules.maxPlayers ?? 4)),
      minPlayers: 2,
      timerEnabled: rules.timerEnabled ?? false,
      timerSeconds: rules.timerSeconds ?? 60,
    };

    const hostToken = crypto.randomBytes(16).toString('hex');
    this.players = [
      {
        id: 0,
        name: hostName.trim() || 'Player 1',
        color: hostColor || 'saffron',
        token: '1',
        isHuman: true,
        isHost: true,
        connected: true,
        sessionToken: hostToken,
        clientId: hostClientId || null,
        socket: null,
        lastSeen: Date.now(),
      }
    ];

    this.engine = new CppEngineProcess();
    this.gameState = null;
    this.eventLog = [];
    this.transactionLedger = [];
    this.actionSequence = 0;
    this.nextPlayerId = 1;
    this.actionQueue = Promise.resolve();
  }

  enqueueAction(taskFn) {
    const run = () => taskFn();
    const next = this.actionQueue.then(run, run);
    this.actionQueue = next.catch(() => {});
    return next;
  }

  touch() {
    this.lastActivityAt = Date.now();
  }

  setGameState(state) {
    if (!state) {
      this.gameState = null;
      return;
    }
    this.gameState = state;
    if (this.gameState && this.gameState.players) {
      if (this.gameState.players.length > this.players.length) {
        this.gameState.players = this.gameState.players.slice(0, this.players.length);
      }
      this.gameState.players = this.gameState.players.map((gp, idx) => ({
        ...gp,
        name: this.players[idx]?.name || gp.name,
        color: this.players[idx]?.color || gp.color,
        isHuman: this.players[idx] ? Boolean(this.players[idx].isHuman !== false) : true,
      }));
    }
  }

  startEmptyExpiration() {
    if (this.emptyTimer) {
      clearTimeout(this.emptyTimer);
      this.emptyTimer = null;
    }
    this.emptyDeadline = Date.now() + EMPTY_ROOM_TIMEOUT_MS;
    console.log(`[MULTIPLAYER SERVER] Room ${this.roomCode} is empty. 10-minute expiration timer started.`);
    this.emptyTimer = setTimeout(() => {
      this.expireRoom();
    }, EMPTY_ROOM_TIMEOUT_MS);
    if (this.emptyTimer && typeof this.emptyTimer.unref === 'function') {
      this.emptyTimer.unref();
    }
  }

  cancelEmptyExpiration() {
    if (this.emptyTimer) {
      clearTimeout(this.emptyTimer);
      this.emptyTimer = null;
      this.emptyDeadline = null;
      console.log(`[MULTIPLAYER SERVER] Room ${this.roomCode} received active player. Expiration timer cancelled.`);
    }
  }

  expireRoom() {
    this.isExpired = true;
    console.log(`[MULTIPLAYER SERVER] Room ${this.roomCode} expired after 10 continuous minutes with 0 players.`);
    this.destroy();
    rooms.delete(this.roomCode);
  }

  hasActiveHost() {
    if (this.hostPlayerId === null || this.hostPlayerId === undefined) return false;
    const host = this.getPlayerById(this.hostPlayerId);
    return Boolean(host && host.connected);
  }

  handlePlayerDisconnect(player) {
    player.connected = false;
    player.socket = null;
    this.touch();

    // If host disconnected, assign next connected confirmed human player as host
    if (player.id === this.hostPlayerId) {
      player.isHost = false;
      const nextHost = this.players.find(p => p.connected && !p.isLeft && p.id !== player.id);
      if (nextHost) {
        nextHost.isHost = true;
        this.hostPlayerId = nextHost.id;
        broadcastToRoom(this, {
          type: 'HOST_CHANGED',
          newHostId: nextHost.id,
          newHostName: nextHost.name,
          snapshot: this.getSnapshot(),
        });
      } else {
        this.hostPlayerId = null;
      }
    }

    // If zero connected confirmed players remain, begin 10-minute empty room countdown
    const connectedCount = this.players.filter(p => p.connected && !p.isLeft).length;
    if (connectedCount === 0) {
      this.startEmptyExpiration();
    }
  }

  getNextAvailableColor() {
    const used = new Set([
      ...this.players.filter(p => p.connected && !p.isLeft).map(p => (p.color || '').toLowerCase()),
      ...Array.from(this.joinRequests.values()).filter(r => r.status === 'PENDING').map(r => (r.color || '').toLowerCase()),
    ]);
    for (const c of AVAILABLE_COLORS) {
      if (!used.has(c)) return c;
    }
    return 'saffron';
  }

  requestJoin(name, preferredColor, requesterSocket = null, clientId = null, sessionToken = null) {
    if (this.isExpired || this.isClosed) {
      throw new Error('Room has been closed or expired and is no longer available.');
    }

    const cleanName = (name && name.trim()) ? name.trim().slice(0, 20) : '';

    // 1. Same player joining same room twice: reclaim the existing player instance instead of creating a new one
    let existingPlayer = null;
    if (sessionToken) {
      existingPlayer = this.getPlayerByToken(sessionToken);
    }
    if (!existingPlayer && clientId) {
      existingPlayer = this.players.find(p => p.clientId === clientId && !p.isLeft);
    }

    if (existingPlayer) {
      console.log(`[MULTIPLAYER SERVER] Existing player '${existingPlayer.name}' (id: ${existingPlayer.id}) re-joining room ${this.roomCode}. Reclaiming instance.`);

      // Disconnect previous socket if any with notification, clearing reference first to avoid disconnect race
      const oldSocket = existingPlayer.socket;
      existingPlayer.socket = requesterSocket || null;
      if (oldSocket && oldSocket !== requesterSocket && !oldSocket.destroyed) {
        try {
          oldSocket.write(encodeWsTextFrame(JSON.stringify({
            type: 'SUPERSEDED',
            message: 'Connected from another session or tab.',
          })));
          oldSocket.destroy();
        } catch (_) {}
      }

      existingPlayer.connected = true;
      existingPlayer.isLeft = false;
      existingPlayer.lastSeen = Date.now();
      if (clientId) existingPlayer.clientId = clientId;

      // Clean up any pending join requests for this player name or clientId
      for (const [reqId, req] of this.joinRequests.entries()) {
        if (
          (cleanName && req.name.toLowerCase() === cleanName.toLowerCase()) ||
          (clientId && req.clientId === clientId)
        ) {
          this.joinRequests.delete(reqId);
        }
      }

      this.cancelEmptyExpiration();
      this.touch();

      broadcastToRoom(this, {
        type: 'PLAYER_STATUS',
        playerId: existingPlayer.id,
        connected: true,
        message: `${existingPlayer.name} reconnected.`,
        snapshot: this.getSnapshot(),
      }, requesterSocket);

      return {
        status: 'ACCEPTED',
        roomCode: this.roomCode,
        playerId: existingPlayer.id,
        sessionToken: existingPlayer.sessionToken,
        isHost: existingPlayer.isHost,
        snapshot: this.getSnapshot(),
        reclaimed: true,
      };
    }

    // 2. New player checks: validate room phase and capacity
    if (this.gamePhase !== 'LOBBY') {
      throw new Error('Game already in progress in this room.');
    }
    const activePlayerCount = this.players.filter(p => !p.isLeft).length;
    if (activePlayerCount >= this.rules.maxPlayers) {
      throw new Error(`Room is full (maximum ${this.rules.maxPlayers} players).`);
    }

    // Prevent duplicate pending requests from same player name or clientId
    for (const [id, existingReq] of this.joinRequests.entries()) {
      if (
        existingReq.status === 'PENDING' &&
        ((cleanName && existingReq.name.toLowerCase() === cleanName.toLowerCase()) ||
         (clientId && existingReq.clientId === clientId))
      ) {
        if (requesterSocket) existingReq.socket = requesterSocket;
        return {
          status: 'PENDING',
          requestId: existingReq.requestId,
          roomCode: this.roomCode,
          message: 'Waiting for host approval.',
        };
      }
    }

    // Join Game when the room exists but has no active host:
    // The first player successfully admitted becomes the host.
    if (!this.hasActiveHost()) {
      const player = this.addPlayer(cleanName || 'Player 1', preferredColor, clientId);
      player.isHost = true;
      this.hostPlayerId = player.id;
      this.cancelEmptyExpiration();
      this.touch();
      return {
        status: 'ACCEPTED',
        roomCode: this.roomCode,
        playerId: player.id,
        sessionToken: player.sessionToken,
        isHost: true,
        snapshot: this.getSnapshot(),
      };
    }

    // Active host exists: create join request and notify host
    const requestId = 'req_' + crypto.randomBytes(8).toString('hex');
    const cleanColor = validateColor(preferredColor);
    if (!cleanColor) {
      throw new Error(`Invalid color '${preferredColor}'.`);
    }
    const occupiedColors = new Set(
      this.players.filter(p => !p.isLeft).map(p => (p.color || '').toLowerCase())
    );
    if (occupiedColors.has(cleanColor)) {
      throw new Error(`Color '${cleanColor}' is already taken by another player in this room. Please select an available color.`);
    }
    const chosenColor = cleanColor;

    const joinReq = {
      requestId,
      name: cleanName || 'Guest Player',
      color: chosenColor,
      clientId: clientId || null,
      requestedAt: Date.now(),
      status: 'PENDING',
      socket: requesterSocket || null,
      rejectReason: null,
    };
    this.joinRequests.set(requestId, joinReq);
    this.touch();

    // Notify the host through WebSocket
    broadcastToRoom(this, {
      type: 'JOIN_REQUEST',
      request: {
        requestId: joinReq.requestId,
        name: joinReq.name,
        color: joinReq.color,
        requestedAt: joinReq.requestedAt,
      },
      snapshot: this.getSnapshot(),
    });

    return {
      status: 'PENDING',
      requestId: joinReq.requestId,
      roomCode: this.roomCode,
      message: 'Waiting for host approval.',
    };
  }

  respondJoinRequest(hostSessionToken, requestId, decision) {
    if (this.isExpired) {
      throw new Error('Room has expired.');
    }
    const hostPlayer = this.getPlayerByToken(hostSessionToken);
    if (!hostPlayer || hostPlayer.id !== this.hostPlayerId) {
      throw new Error('Unauthorized: only the active room host can approve or reject join requests.');
    }

    const joinReq = this.joinRequests.get(requestId);
    if (!joinReq) {
      throw new Error('Join request not found or expired.');
    }
    if (joinReq.status !== 'PENDING') {
      throw new Error(`Join request has already been ${joinReq.status.toLowerCase()}.`);
    }

    if (decision === 'ACCEPT') {
      // Revalidate room state and capacity
      if (this.gamePhase !== 'LOBBY') {
        joinReq.status = 'REJECTED';
        joinReq.rejectReason = 'Game already started in this room.';
        throw new Error('Cannot accept player: game has already started.');
      }
      const activePlayerCount = this.players.filter(p => !p.isLeft).length;
      if (activePlayerCount >= this.rules.maxPlayers) {
        joinReq.status = 'REJECTED';
        joinReq.rejectReason = `Room reached maximum capacity (${this.rules.maxPlayers} players).`;
        throw new Error(`Room is full (maximum ${this.rules.maxPlayers} players).`);
      }

      // Check if requested color became occupied in the meantime
      const occupiedColors = new Set(
        this.players.filter(p => !p.isLeft).map(p => (p.color || '').toLowerCase())
      );
      if (occupiedColors.has((joinReq.color || '').toLowerCase())) {
        joinReq.status = 'REJECTED';
        joinReq.rejectReason = `Color '${joinReq.color}' was taken by another player.`;
        this.touch();
        throw new Error(`Color '${joinReq.color}' is already taken by another player in this room.`);
      }

      // Authoritative admission
      const player = this.addPlayer(joinReq.name, joinReq.color, joinReq.clientId);
      joinReq.status = 'ACCEPTED';
      joinReq.playerId = player.id;
      joinReq.sessionToken = player.sessionToken;
      this.cancelEmptyExpiration();
      this.touch();

      if (joinReq.socket && !joinReq.socket.destroyed) {
        try {
          joinReq.socket.write(encodeWsTextFrame(JSON.stringify({
            type: 'JOIN_REQUEST_DECISION',
            status: 'ACCEPTED',
            roomCode: this.roomCode,
            playerId: player.id,
            sessionToken: player.sessionToken,
            snapshot: this.getSnapshot(),
          })));
        } catch (_) {}
      }

      broadcastToRoom(this, {
        type: 'PLAYER_JOINED',
        player: { id: player.id, name: player.name, color: player.color },
        snapshot: this.getSnapshot(),
      });

      return {
        ok: true,
        status: 'ACCEPTED',
        playerId: player.id,
        snapshot: this.getSnapshot(),
      };
    } else {
      // Rejection
      joinReq.status = 'REJECTED';
      joinReq.rejectReason = 'Host declined your join request.';
      this.touch();

      if (joinReq.socket && !joinReq.socket.destroyed) {
        try {
          joinReq.socket.write(encodeWsTextFrame(JSON.stringify({
            type: 'JOIN_REQUEST_DECISION',
            status: 'REJECTED',
            reason: joinReq.rejectReason,
          })));
        } catch (_) {}
      }

      broadcastToRoom(this, {
        type: 'JOIN_REQUEST_REJECTED',
        requestId,
        snapshot: this.getSnapshot(),
      });

      return {
        ok: true,
        status: 'REJECTED',
        requestId,
      };
    }
  }

  addPlayer(name, preferredColor, clientId = null) {
    if (this.gamePhase !== 'LOBBY') {
      throw new Error('Game already in progress in this room.');
    }
    const activePlayerCount = this.players.filter(p => !p.isLeft).length;
    if (activePlayerCount >= this.rules.maxPlayers) {
      throw new Error(`Room is full (maximum ${this.rules.maxPlayers} players).`);
    }

    const nextId = this.nextPlayerId++;
    const safeName = sanitizePlayerName(name, `Player ${nextId + 1}`);
    const cleanColor = validateColor(preferredColor);
    const usedColors = new Set(
      this.players.filter(p => !p.isLeft).map(p => (p.color || '').toLowerCase())
    );
    if (!cleanColor || usedColors.has(cleanColor)) {
      throw new Error(`Color '${preferredColor}' is already taken by another player in this room. Please select an available color.`);
    }
    const chosenColor = cleanColor;

    const sessionToken = crypto.randomBytes(16).toString('hex');
    const player = {
      id: nextId,
      name: safeName,
      color: chosenColor,
      token: String(nextId + 1),
      isHuman: true,
      isHost: false,
      connected: true,
      sessionToken,
      clientId: clientId || null,
      socket: null,
      lastSeen: Date.now(),
    };

    this.players.push(player);
    this.cancelEmptyExpiration();
    this.touch();
    return player;
  }

  getPlayerByToken(token) {
    if (!token) return null;
    return this.players.find(p => p.sessionToken === token) || null;
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id) || null;
  }

  async updatePlayer(playerId, { name, color }) {
    return this.enqueueAction(async () => {
      if (this.settingsLocked && this.gamePhase === 'IN_PROGRESS') {
        throw new Error('Player settings locked while game is in progress.');
      }
      const player = this.getPlayerById(playerId);
      if (!player) throw new Error('Player not found.');

      if (name && name.trim()) {
        player.name = name.trim().slice(0, 20);
      }
      if (color && color.trim()) {
        const cleanColor = color.trim().toLowerCase();
        const validColors = ['saffron', 'teal', 'plum', 'blue', 'gold', 'purple', 'emerald', 'burgundy'];
        if (!validColors.includes(cleanColor)) {
          throw new Error(`Invalid color '${color}'. Allowed colors: ${validColors.join(', ')}.`);
        }
        const taken = this.players.some(p => p.id !== playerId && p.connected && !p.isLeft && p.color.toLowerCase() === cleanColor);
        if (taken) {
          throw new Error(`Color '${color}' is already selected by another player.`);
        }
        player.color = cleanColor;
        if (this.engine) {
          await this.engine.sendCommand({ action: 'updatePlayerColor', playerId, newColor: cleanColor }).catch(() => {});
        }
      }
      this.touch();
      return { ok: true, snapshot: this.getSnapshot() };
    });
  }

  updateRules(requesterId, newRules) {
    if (this.settingsLocked || this.gamePhase === 'IN_PROGRESS') {
      throw new Error('Rules are permanently locked for this match.');
    }
    if (requesterId !== this.hostPlayerId && requesterId !== 0) {
      throw new Error('Only the host can modify table rules.');
    }
    const defaultStartingMoney = newRules.defaultStartingMoney ?? newRules.startingMoney;
    if (defaultStartingMoney !== undefined) {
      this.rules.defaultStartingMoney = defaultStartingMoney;
    }
    const doublesRule = newRules.doublesRuleEnabled ?? newRules.doublesRule;
    if (doublesRule !== undefined) {
      this.rules.doublesRuleEnabled = Boolean(doublesRule);
    }
    const maxPlayers = newRules.maxPlayers ?? newRules.playerCount;
    if (maxPlayers !== undefined) {
      const activeCount = this.players.filter(p => !p.isLeft).length;
      const maxP = Math.max(2, Math.min(6, parseInt(maxPlayers, 10)));
      if (maxP < activeCount) {
        throw new Error(`Cannot decrease max players below current connected count (${activeCount}).`);
      }
      this.rules.maxPlayers = maxP;
    }
    if (newRules.timerEnabled !== undefined) {
      this.rules.timerEnabled = Boolean(newRules.timerEnabled);
    }
    if (newRules.timerSeconds !== undefined) {
      this.rules.timerSeconds = parseInt(newRules.timerSeconds, 10) || 60;
    }
    if (this.gameState) {
      this.gameState.rules = { ...this.rules };
    }
    this.touch();
  }

  async startGame(requesterId) {
    return this.enqueueAction(async () => {
      if (requesterId !== this.hostPlayerId) {
        throw new Error('Only the host can start the game.');
      }
      if (this.gamePhase === 'IN_PROGRESS') {
        throw new Error('Game has already started.');
      }

      // Filter to confirmed, connected human players who have not left
      const confirmed = this.players.filter(p => p.connected && !p.isLeft && p.isHuman !== false);
      const minRequired = this.rules.minPlayers || 2;
      if (confirmed.length < minRequired) {
        throw new Error(`Cannot start game: at least ${minRequired} confirmed human players are required (currently ${confirmed.length}).`);
      }

      // Authoritative check & auto-resolution: guarantee distinct valid colors among confirmed players
      const seenColors = new Set();
      for (const p of confirmed) {
        let c = validateColor(p.color);
        if (!c || seenColors.has(c)) {
          c = AVAILABLE_COLORS.find(col => !seenColors.has(col)) || 'saffron';
          p.color = c;
        }
        seenColors.add(c);
      }

      // Set effective player list with deterministic IDs, maintaining host at ID 0 and preserving object references
      this.players = confirmed;
      this.players.forEach((p, idx) => {
        p.id = idx;
        p.token = p.token || String(idx + 1);
        p.isHuman = true;
        p.isHost = (idx === 0);
        p.isLeft = false;
      });
      this.hostPlayerId = 0;

      // Adjust effective player count while preserving configured maxPlayers capacity limit
      this.rules.playerCount = this.players.length;

      // Configure engine with confirmed human players and rules
      const playerConfigs = this.players.map(p => ({
        name: p.name,
        color: p.color,
        token: p.token,
        isHuman: true,
      }));

      // Send init command to authoritative C++ engine with exact player count and configs
      const initCmd = {
        action: 'init',
        playerCount: this.players.length,
        isMultiplayer: true,
        multiplayer: true,
        p1Name: this.players[0]?.name || 'Player 1',
        p1Color: this.players[0]?.color || 'saffron',
        p1IsHuman: true,
        p2Name: this.players[1]?.name || 'Player 2',
        p2Color: this.players[1]?.color || 'teal',
        p2IsHuman: true,
        p3Name: this.players[2]?.name || 'Player 3',
        p3Color: this.players[2]?.color || 'plum',
        p3IsHuman: true,
        p4Name: this.players[3]?.name || 'Player 4',
        p4Color: this.players[3]?.color || 'blue',
        p4IsHuman: true,
        p5Name: this.players[4]?.name || 'Player 5',
        p5Color: this.players[4]?.color || 'gold',
        p5IsHuman: true,
        p6Name: this.players[5]?.name || 'Player 6',
        p6Color: this.players[5]?.color || 'purple',
        p6IsHuman: true,
        defaultStartingMoney: this.rules.defaultStartingMoney ?? 25000,
        startingMoney: this.rules.defaultStartingMoney ?? 25000,
        doublesRuleEnabled: this.rules.doublesRuleEnabled ?? true,
        timerEnabled: this.rules.timerEnabled ?? false,
        timerSeconds: this.rules.timerSeconds ?? 60,
        devMode: false,
        inLobby: false,
        startGame: true,
        rules: this.rules,
        players: playerConfigs,
      };

      const res = await this.engine.sendCommand(initCmd);
      if (!res || !res.ok || !res.state) {
        throw new Error(res?.error || 'Authoritative engine failed to initialize match.');
      }

      this.setGameState(res.state);

      this.gamePhase = 'IN_PROGRESS';
      this.settingsLocked = true;
      this.actionSequence = 1;
      this.eventLog = [];
      this.transactionLedger = res.state.transactionLedger || [];
      this.addEvent({
        id: `ev_start_${Date.now()}`,
        type: 'TURN_CHANGE',
        category: 'TURNS_DICE',
        timestamp: Date.now(),
        playerId: 0,
        playerName: this.players[0].name,
        description: `Match started by Host ${this.players[0].name} with ${this.players.length} confirmed players. Round 01 began.`,
      });
      this.touch();
      return this.getSnapshot();
    });
  }

  async processAction(playerId, action, payload = {}) {
    return this.enqueueAction(async () => {
      if (this.gamePhase !== 'IN_PROGRESS') {
        throw new Error('Game is not currently active.');
      }
      const player = this.getPlayerById(playerId);
      if (!player) throw new Error('Player not in this room.');
      if (player.isLeft || !player.connected) {
        throw new Error('Player is not active in this room.');
      }

      // Authoritative turn validation for turn-restricted actions
      const turnRestricted = ['roll', 'buy', 'decline', 'endTurn'];
      if (turnRestricted.includes(action)) {
        if (!this.gameState || this.gameState.activePlayerIndex !== playerId) {
          const activeName = this.players[this.gameState?.activePlayerIndex]?.name || `Player ${(this.gameState?.activePlayerIndex ?? 0) + 1}`;
          throw new Error(`Not your turn. It is currently ${activeName}'s turn.`);
        }
        if (action === 'roll') {
          const curTurnState = this.gameState.turnState;
          if (curTurnState !== 'WAITING_FOR_ROLL' && curTurnState !== 'EXTRA_TURN') {
            throw new Error(`Cannot roll at this time (current turn state: ${curTurnState}).`);
          }
          // Atomic optimistic guard: prevent race condition of multiple simultaneous roll commands
          this.gameState.turnState = 'RESOLVING_LANDING';
        }
      }

      this.actionSequence++;
      const cmd = {
        action,
        playerId,
        ...payload,
      };

      if (action.startsWith('trade') && cmd.senderId === undefined) {
        cmd.senderId = playerId;
      }

      const res = await this.engine.sendCommand(cmd);
      if (!res || !res.ok) {
        // Rollback turn state if roll rejected
        if (action === 'roll' && this.gameState) {
          this.gameState.turnState = 'WAITING_FOR_ROLL';
        }
        const errMsg = res?.error || `Action '${action}' rejected by engine rules.`;
        this.addEvent({
          id: `ev_err_${Date.now()}_${playerId}`,
          type: 'ERROR',
          category: 'SYSTEM_ERRORS',
          timestamp: Date.now(),
          playerId,
          playerName: player.name,
          description: `Action rejected: ${errMsg}`,
        });
        throw new Error(errMsg);
      }

      this.setGameState(res.state);
      if (action === 'roll' && res.result && res.result.dice1 !== undefined && res.result.dice2 !== undefined) {
        const rollId = `roll_${this.roomCode}_${this.actionSequence}_${player.id}`;
        res.result.rollId = rollId;
        res.result.sequence = this.actionSequence;
        this.gameState.lastDice = [res.result.dice1, res.result.dice2];
        this.gameState.lastRoll = {
          rollId,
          sequence: this.actionSequence,
          playerId: player.id,
          dice1: res.result.dice1,
          dice2: res.result.dice2,
          diceTotal: res.result.diceTotal,
          isDouble: res.result.isDouble,
          previousPosition: res.result.previousPosition,
          newPosition: res.result.newPosition,
          spaceName: res.result.spaceName,
        };
      }
      if (res.state?.transactionLedger) {
        this.transactionLedger = res.state.transactionLedger;
      }

      // Generate structured event log entry based on action result
      this.recordActionEvents(player, action, res, payload);

      if (res.state && res.state.turnState === 'GAME_OVER') {
        this.gamePhase = 'GAME_OVER';
      }

      this.touch();
      return {
        actionResult: res.result,
        sequence: this.actionSequence,
        snapshot: this.getSnapshot(),
        sellPrice: res?.sellPrice,
      };
    });
  }

  recordActionEvents(player, action, engineRes, payload) {
    const now = Date.now();
    const res = engineRes?.result;
    const seq = this.actionSequence;

    const formatPropName = (propId) => {
      if (!propId) return 'Property';
      const map = {
        bombay: 'Bombay', delhi: 'Delhi', calcutta: 'Calcutta', madras: 'Madras',
        bangalore: 'Bangalore', hyderabad: 'Hyderabad', ahmedabad: 'Ahmedabad', pune: 'Pune',
        jaipur: 'Jaipur', surat: 'Surat', lucknow: 'Lucknow', kanpur: 'Kanpur',
        nagpur: 'Nagpur', indore: 'Indore', bhopal: 'Bhopal', patna: 'Patna',
        vadodara: 'Vadodara', ludhiana: 'Ludhiana', agra: 'Agra', margoa: 'Margoa',
        railway: 'Railway', electric_company: 'Electric Company', water_works: 'Water Works',
        motor_railway: 'Motor Transport', airways: 'Airways', shipping: 'Shipping Co.',
      };
      return map[propId.toLowerCase()] || (propId.charAt(0).toUpperCase() + propId.slice(1));
    };

    if (action === 'roll' && res) {
      // 1. Dice Roll (TURNS_DICE)
      this.addEvent({
        id: `ev_roll_${now}_${player.id}_${seq}`,
        type: 'ROLL_MOVE',
        category: 'TURNS_DICE',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        sequenceNumber: seq,
        description: `${player.name} rolled [${res.dice1}, ${res.dice2}] = ${res.diceTotal}${res.isDouble ? ' (DOUBLES!)' : ''} and moved to ${res.spaceName}.`,
      });

      // 2. Token Movement (MOVEMENT_LOCATIONS)
      this.addEvent({
        id: `ev_move_${now}_${player.id}_${seq}`,
        type: 'ROLL_MOVE',
        category: 'MOVEMENT_LOCATIONS',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        sequenceNumber: seq,
        description: `${player.name} moved to space #${res.newPosition}: ${res.spaceName}.`,
      });

      // 3. Start Crossing: First rotation capital or pass start bonus (RENT_PAYMENTS)
      if (res.startingCapitalAwarded) {
        const capAmount = this.rules.defaultStartingMoney || 25000;
        this.addEvent({
          id: `ev_cap_${now}_${player.id}_${seq}`,
          type: 'START_PASS',
          category: 'RENT_PAYMENTS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: capAmount,
          sequenceNumber: seq,
          description: `${player.name} completed first rotation and received ₹${capAmount.toLocaleString()} starting capital!`,
        });
      } else if (res.passStartBonusAwarded) {
        const bonusAmount = this.rules.passStartBonus || 1500;
        this.addEvent({
          id: `ev_pass_${now}_${player.id}_${seq}`,
          type: 'START_PASS',
          category: 'RENT_PAYMENTS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: bonusAmount,
          sequenceNumber: seq,
          description: `${player.name} crossed START and collected ₹${bonusAmount.toLocaleString()} bonus.`,
        });
      }

      // 4. Rent Payment (RENT_PAYMENTS)
      if (res.rentPaid && res.rentAmount > 0) {
        const recipient = this.getPlayerById(res.rentRecipientId);
        const recipientName = recipient ? recipient.name : 'Owner';
        this.addEvent({
          id: `ev_rent_${now}_${player.id}_${seq}`,
          type: 'RENT',
          category: 'RENT_PAYMENTS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: res.rentAmount,
          propertyName: res.spaceName,
          sequenceNumber: seq,
          description: `${player.name} paid ₹${res.rentAmount.toLocaleString()} rent to ${recipientName} for ${res.spaceName}.`,
        });
      }

      // 5. Special Square: Jail arrest or visiting (MOVEMENT_LOCATIONS)
      if (res.mustGoToJail) {
        this.addEvent({
          id: `ev_jail_${now}_${player.id}_${seq}`,
          type: 'JAIL',
          category: 'MOVEMENT_LOCATIONS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          sequenceNumber: seq,
          description: res.eventDescription || `${player.name} was sent to Jail.`,
        });
      } else if (res.newPosition === 9 && !res.mustGoToJail) {
        this.addEvent({
          id: `ev_jail_visit_${now}_${player.id}_${seq}`,
          type: 'JAIL',
          category: 'MOVEMENT_LOCATIONS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          sequenceNumber: seq,
          description: `${player.name} is just visiting Jail.`,
        });
      }

      // 6. Special Square: Royal Club (MOVEMENT_LOCATIONS)
      if (res.newPosition === 18) {
        this.addEvent({
          id: `ev_club_${now}_${player.id}_${seq}`,
          type: 'CLUB',
          category: 'MOVEMENT_LOCATIONS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          sequenceNumber: seq,
          description: `${player.name} entered the Royal Club.`,
        });
      }

      // 7. Special Square: Rest House (MOVEMENT_LOCATIONS)
      if (res.mustGoToRestHouse || res.newPosition === 27) {
        this.addEvent({
          id: `ev_rest_${now}_${player.id}_${seq}`,
          type: 'REST',
          category: 'MOVEMENT_LOCATIONS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          sequenceNumber: seq,
          description: res.eventDescription || `${player.name} stopped at the Rest House (misses next turn).`,
        });
      }

      // 8. Tax Assessment (RENT_PAYMENTS)
      if (res.spaceType === 'tax') {
        const taxAmount = Math.abs(res.moneyChange || 500);
        this.addEvent({
          id: `ev_tax_${now}_${player.id}_${seq}`,
          type: 'TAX',
          category: 'RENT_PAYMENTS',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: taxAmount,
          sequenceNumber: seq,
          description: res.eventDescription || `${player.name} paid ₹${taxAmount.toLocaleString()} ${res.spaceName} to the Bank.`,
        });
      }

      // 9. Chance Card Event (CHANCE_CHEST)
      if (res.spaceType === 'chance') {
        let cleanDesc = res.eventDescription || `${player.name} landed on Chance.`;
        cleanDesc = cleanDesc.replace(/^CHANCE\s*\(Dice\s*\d+\):\s*/i, '');
        const chanceMsg = `CHANCE — ${player.name} ${cleanDesc.startsWith(player.name) ? cleanDesc.slice(player.name.length).trim() : cleanDesc}`;
        this.addEvent({
          id: `ev_chance_${now}_${player.id}_${seq}`,
          type: 'CHANCE',
          category: 'CHANCE_CHEST',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: res.moneyChange !== 0 ? Math.abs(res.moneyChange) : undefined,
          sequenceNumber: seq,
          description: chanceMsg,
        });
      }

      // 10. Community Chest Card Event (CHANCE_CHEST)
      if (res.spaceType === 'chest') {
        let cleanDesc = res.eventDescription || `${player.name} opened Community Chest.`;
        cleanDesc = cleanDesc.replace(/^COMMUNITY CHEST\s*\(Dice\s*\d+\):\s*/i, '');
        const chestMsg = `COMMUNITY CHEST — ${player.name} ${cleanDesc.startsWith(player.name) ? cleanDesc.slice(player.name.length).trim() : cleanDesc}`;
        this.addEvent({
          id: `ev_chest_${now}_${player.id}_${seq}`,
          type: 'CHEST',
          category: 'CHANCE_CHEST',
          timestamp: now,
          playerId: player.id,
          playerName: player.name,
          playerColor: player.color,
          amount: res.moneyChange !== 0 ? Math.abs(res.moneyChange) : undefined,
          sequenceNumber: seq,
          description: chestMsg,
        });
      }
    } else if (action === 'buy') {
      const owned = engineRes?.state?.players?.[player.id]?.ownedProperties || [];
      const propId = payload?.propertyId || (owned.length > 0 ? owned[owned.length - 1] : '');
      const propName = formatPropName(propId);
      const prevMoney = this.gameState?.players?.[player.id]?.money ?? 0;
      const currMoney = engineRes?.state?.players?.[player.id]?.money ?? prevMoney;
      const price = Math.max(0, prevMoney - currMoney);
      this.addEvent({
        id: `ev_buy_${now}_${player.id}_${seq}`,
        type: 'BUY',
        category: 'PROPERTIES',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        amount: price > 0 ? price : undefined,
        sequenceNumber: seq,
        description: price > 0
          ? `${player.name} purchased ${propName} for ₹${price.toLocaleString()}.`
          : `${player.name} purchased ${propName}.`,
      });
    } else if (action === 'decline') {
      const propId = payload?.propertyId || '';
      const propName = propId ? formatPropName(propId) : 'property';
      this.addEvent({
        id: `ev_decline_${now}_${player.id}_${seq}`,
        type: 'DECLINE',
        category: 'PROPERTIES',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} declined to purchase ${propName}.`,
      });
    } else if (action === 'mortgage') {
      const propId = payload.propertyId || '';
      const propName = formatPropName(propId);
      this.addEvent({
        id: `ev_mortgage_${now}_${player.id}_${propId}_${seq}`,
        type: 'MORTGAGE',
        category: 'PROPERTIES',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} mortgaged ${propName}.`,
      });
    } else if (action === 'unmortgage') {
      const propId = payload.propertyId || '';
      const propName = formatPropName(propId);
      this.addEvent({
        id: `ev_unmortgage_${now}_${player.id}_${propId}_${seq}`,
        type: 'UNMORTGAGE',
        category: 'PROPERTIES',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} unmortgaged ${propName}.`,
      });
    } else if (action === 'build') {
      const propId = payload.propertyId || '';
      const propName = formatPropName(propId);
      this.addEvent({
        id: `ev_build_${now}_${player.id}_${propId}_${seq}`,
        type: 'BUILD',
        category: 'CONSTRUCTION',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} constructed a building on ${propName}.`,
      });
    } else if (action === 'sell') {
      const propId = payload.propertyId || '';
      const propName = formatPropName(propId);
      this.addEvent({
        id: `ev_sell_${now}_${player.id}_${propId}_${seq}`,
        type: 'DEMOLISH',
        category: 'CONSTRUCTION',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} demolished a building on ${propName}.`,
      });
    } else if (action === 'sellProperty') {
      const propId = payload.propertyId || '';
      const propName = formatPropName(propId);
      const sellPrice = engineRes?.sellPrice || 0;
      this.addEvent({
        id: `ev_sellprop_${now}_${player.id}_${propId}_${seq}`,
        type: 'SELL_PROPERTY',
        category: 'ACQUISITION',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        propertyId: propId,
        propertyName: propName,
        sequenceNumber: seq,
        description: `${player.name} sold ${propName} back to the bank for ₹${sellPrice.toLocaleString()}.`,
      });
    } else if (action === 'resign') {
      this.addEvent({
        id: `ev_resign_${now}_${player.id}_${seq}`,
        type: 'RESIGN',
        category: 'SYSTEM_ERRORS',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        sequenceNumber: seq,
        description: `${player.name} surrendered and resigned from the match.`,
      });
    } else if (action === 'endTurn') {
      const nextIdx = engineRes?.state?.activePlayerIndex ?? (this.gameState?.activePlayerIndex ?? 0);
      const nextPlayer = this.getPlayerById(nextIdx) || { name: `Player ${nextIdx + 1}` };
      this.addEvent({
        id: `ev_end_${now}_${player.id}_${seq}`,
        type: 'TURN_CHANGE',
        category: 'TURNS_DICE',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        sequenceNumber: seq,
        description: `${player.name} ended turn. It is now ${nextPlayer.name}'s turn.`,
      });
    } else if (action === 'timeout') {
      const nextIdx = engineRes?.state?.activePlayerIndex ?? (this.gameState?.activePlayerIndex ?? 0);
      const nextPlayer = this.getPlayerById(nextIdx) || { name: `Player ${nextIdx + 1}` };
      this.addEvent({
        id: `ev_timeout_${now}_${player.id}_${seq}`,
        type: 'TURN_CHANGE',
        category: 'TURNS_DICE',
        timestamp: now,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        sequenceNumber: seq,
        description: `${player.name}'s turn timed out. Automatically passed to ${nextPlayer.name}.`,
      });
    }

    // Check for player bankruptcy
    if (engineRes?.state?.players) {
      for (const p of engineRes.state.players) {
        if (p.isBankrupt) {
          const alreadyLogged = this.eventLog.some(e => e.type === 'BANKRUPTCY' && e.playerId === p.id);
          if (!alreadyLogged) {
            this.addEvent({
              id: `ev_bankrupt_${now}_${p.id}_${seq}`,
              type: 'BANKRUPTCY',
              category: 'RENT_PAYMENTS',
              timestamp: now,
              playerId: p.id,
              playerName: p.name,
              playerColor: p.color,
              sequenceNumber: seq,
              description: `${p.name} declared bankruptcy and has been eliminated.`,
            });
          }
        }
      }
    }

    // Check for match completion
    if (engineRes?.state?.turnState === 'GAME_OVER') {
      const winner = engineRes.state.players?.find(p => !p.isBankrupt) || player;
      const alreadyLogged = this.eventLog.some(e => e.type === 'GAME_OVER');
      if (!alreadyLogged) {
        this.addEvent({
          id: `ev_gameover_${now}_${seq}`,
          type: 'GAME_OVER',
          category: 'SYSTEM_ERRORS',
          timestamp: now,
          playerId: winner.id,
          playerName: winner.name,
          playerColor: winner.color,
          sequenceNumber: seq,
          description: `👑 GAME OVER! ${winner.name} is victorious!`,
        });
      }
    }
  }

  addEvent(event) {
    if (this.eventLog.some(e => e.id === event.id)) return;
    this.eventLog.push(event);
    if (this.eventLog.length > 200) {
      this.eventLog.shift();
    }
  }

  signalRematchReady(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player) throw new Error('Player not in this room.');
    if (!player.connected || player.isLeft) throw new Error('Player is not active in this room.');
    this.rematchState.readyPlayers.add(playerId);
    this.touch();
    broadcastToRoom(this, {
      type: 'REMATCH_STATE_CHANGED',
      rematchState: {
        readyPlayerIds: Array.from(this.rematchState.readyPlayers),
        totalEligible: this.players.filter(p => p.connected && !p.isLeft).length,
      },
      snapshot: this.getSnapshot(),
    });
    return {
      ok: true,
      readyPlayerIds: Array.from(this.rematchState.readyPlayers),
    };
  }

  async rematch(requesterId) {
    return this.enqueueAction(async () => {
      if (requesterId !== this.hostPlayerId) {
        throw new Error('Only the host can initiate a rematch.');
      }
      if (this.isRematching) {
        throw new Error('A rematch is already in progress.');
      }

      const eligible = this.players.filter(p => p.connected && !p.isLeft);
      if (eligible.length < this.rules.minPlayers) {
        throw new Error(`Cannot start rematch: at least ${this.rules.minPlayers} connected players required (currently ${eligible.length}).`);
      }

      this.isRematching = true;
      try {
        this.gamePhase = 'LOBBY';
        this.settingsLocked = false;
        this.engine.kill();
        this.engine = new CppEngineProcess();
        this.gameState = null;
        this.eventLog = [];
        this.transactionLedger = [];
        this.actionSequence = 0;
        this.rematchState.readyPlayers.clear();

        // Only retain eligible connected players for the new match, mutating in-place to preserve socket references
        this.players = eligible;
        this.players.forEach((p, idx) => {
          p.id = idx;
          p.isHost = (idx === 0);
          p.isLeft = false;
        });
        this.hostPlayerId = 0;

        const snapshot = await this.startGame(this.hostPlayerId);
        return snapshot;
      } finally {
        this.isRematching = false;
      }
    });
  }

  async leaveRoom(playerId) {
    return this.enqueueAction(async () => {
      const player = this.getPlayerById(playerId);
      if (!player) return { ok: true, message: 'Player not found in room.' };

      if (player.socket && !player.socket.destroyed) {
        try {
          player.socket.write(encodeWsTextFrame(JSON.stringify({
            type: 'LEFT_ROOM',
            ok: true,
            roomCode: this.roomCode,
          })));
        } catch (_) {}
      }
      player.connected = false;
      player.isLeft = true;
      this.touch();

      // If host left, transfer host authority to next eligible remaining player
      if (player.id === this.hostPlayerId) {
        player.isHost = false;
        const nextHost = this.players.find(p => p.connected && !p.isLeft && p.id !== player.id);
        if (nextHost) {
          nextHost.isHost = true;
          this.hostPlayerId = nextHost.id;
          broadcastToRoom(this, {
            type: 'HOST_CHANGED',
            newHostId: nextHost.id,
            newHostName: nextHost.name,
            snapshot: this.getSnapshot(),
          });
        } else {
          this.hostPlayerId = null;
        }
      }

      if (this.gamePhase === 'LOBBY') {
        this.players = this.players.filter(p => p.id !== player.id);
        const connectedCount = this.players.filter(p => p.connected && !p.isLeft).length;
        if (connectedCount === 0) {
          this.startEmptyExpiration();
        }
        broadcastToRoom(this, {
          type: 'PLAYER_LEFT',
          playerId,
          playerName: player.name,
          newHostPlayerId: this.hostPlayerId,
          snapshot: this.getSnapshot(),
        });
        return { ok: true, message: 'Successfully left room lobby.' };
      }

      // In-progress match: record event and handle turn advancement
      this.addEvent({
        id: `ev_leave_${Date.now()}_${player.id}`,
        type: 'PLAYER_LEFT',
        category: 'SYSTEM_ERRORS',
        timestamp: Date.now(),
        playerId,
        playerName: player.name,
        description: `${player.name} left the match.`,
      });

      // If it was this player's active turn, advance turn so match is not blocked
      if (this.gameState && this.gameState.activePlayerIndex === playerId) {
        try {
          const res = await this.engine.sendCommand({ action: 'endTurn', playerId });
          if (res && res.ok && res.state) {
            this.setGameState(res.state);
          }
        } catch (_) {}
      }

      // Check remaining active non-bankrupt players
      const activeRemaining = this.players.filter(p => p.connected && !p.isBankrupt && !p.isLeft);
      if (activeRemaining.length <= 1) {
        this.gamePhase = 'GAME_OVER';
        if (this.gameState) {
          this.gameState.turnState = 'GAME_OVER';
          this.gameState.winnerId = activeRemaining[0]?.id ?? null;
        }
      }

      const connectedCount = this.players.filter(p => p.connected && !p.isLeft).length;
      if (connectedCount === 0) {
        this.startEmptyExpiration();
      }

      broadcastToRoom(this, {
        type: 'PLAYER_LEFT',
        playerId,
        playerName: player.name,
        newHostPlayerId: this.hostPlayerId,
        snapshot: this.getSnapshot(),
      });

      return { ok: true, message: 'Successfully left active match.' };
    });
  }

  async kickPlayer(requesterPlayerId, targetPlayerId, reason = 'Kicked by host') {
    return this.enqueueAction(async () => {
      if (requesterPlayerId !== null && requesterPlayerId !== undefined) {
        if (requesterPlayerId !== this.hostPlayerId) {
          throw new Error('Only the room host can kick players.');
        }
      }

      const targetId = parseInt(targetPlayerId, 10);
      const player = this.getPlayerById(targetId);
      if (!player) {
        throw new Error(`Player with ID ${targetPlayerId} not found in room.`);
      }

      if (requesterPlayerId !== null && player.id === this.hostPlayerId) {
        throw new Error('Host cannot kick themselves.');
      }

      console.log(`[MULTIPLAYER SERVER] Kicking player ${player.name} (id: ${player.id}) from room ${this.roomCode}. Reason: ${reason}`);

      // If player has an open socket, send KICKED frame and destroy socket
      if (player.socket && !player.socket.destroyed) {
        try {
          player.socket.write(encodeWsTextFrame(JSON.stringify({
            type: 'KICKED',
            reason: reason || 'You were kicked from the room.',
            roomCode: this.roomCode,
          })));
          player.socket.destroy();
        } catch (_) {}
      }
      player.socket = null;
      player.connected = false;
      player.isLeft = true;
      this.touch();

      // If in lobby, remove player from list entirely
      if (this.gamePhase === 'LOBBY') {
        this.players = this.players.filter(p => p.id !== player.id);

        // If host was removed (e.g. server auto-kick from another room)
        if (player.id === this.hostPlayerId) {
          player.isHost = false;
          const nextHost = this.players.find(p => p.connected && !p.isLeft);
          if (nextHost) {
            nextHost.isHost = true;
            this.hostPlayerId = nextHost.id;
          } else {
            this.hostPlayerId = null;
          }
        }

        const connectedCount = this.players.filter(p => p.connected && !p.isLeft).length;
        if (connectedCount === 0) {
          this.startEmptyExpiration();
        }

        broadcastToRoom(this, {
          type: 'PLAYER_KICKED',
          kickedPlayerId: targetId,
          kickedPlayerName: player.name,
          reason,
          newHostPlayerId: this.hostPlayerId,
          snapshot: this.getSnapshot(),
        });

        return { ok: true, message: `Player ${player.name} removed from lobby.`, snapshot: this.getSnapshot() };
      }

      // If game IN_PROGRESS:
      this.addEvent({
        id: `ev_kick_${Date.now()}_${player.id}`,
        type: 'PLAYER_LEFT',
        category: 'SYSTEM_ERRORS',
        timestamp: Date.now(),
        playerId: targetId,
        playerName: player.name,
        description: `${player.name} was kicked from the match (${reason}).`,
      });

      // Advance turn if it was their active turn
      if (this.gameState && this.gameState.activePlayerIndex === targetId) {
        try {
          const res = await this.engine.sendCommand({ action: 'endTurn', playerId: targetId });
          if (res && res.ok && res.state) {
            this.setGameState(res.state);
          }
        } catch (_) {}
      }

      // Check remaining active non-bankrupt players
      const activeRemaining = this.players.filter(p => p.connected && !p.isBankrupt && !p.isLeft);
      if (activeRemaining.length <= 1) {
        this.gamePhase = 'GAME_OVER';
        if (this.gameState) {
          this.gameState.turnState = 'GAME_OVER';
          this.gameState.winnerId = activeRemaining[0]?.id ?? null;
        }
      }

      const connectedCount = this.players.filter(p => p.connected && !p.isLeft).length;
      if (connectedCount === 0) {
        this.startEmptyExpiration();
      }

      broadcastToRoom(this, {
        type: 'PLAYER_KICKED',
        kickedPlayerId: targetId,
        kickedPlayerName: player.name,
        reason,
        newHostPlayerId: this.hostPlayerId,
        snapshot: this.getSnapshot(),
      });

      return { ok: true, message: `Player ${player.name} kicked from match.`, snapshot: this.getSnapshot() };
    });
  }

  getSnapshot() {
    return {
      roomCode: this.roomCode,
      hostPlayerId: this.hostPlayerId,
      gamePhase: this.gamePhase,
      settingsLocked: this.settingsLocked,
      rules: this.rules,
      actionSequence: this.actionSequence,
      rematchState: {
        readyPlayerIds: Array.from(this.rematchState?.readyPlayers || []),
      },
      joinRequests: Array.from(this.joinRequests.values())
        .filter(r => r.status === 'PENDING')
        .map(r => ({
          requestId: r.requestId,
          name: r.name,
          color: r.color,
          requestedAt: r.requestedAt,
        })),
      players: this.players.map(p => {
        const engP = this.gameState?.players?.find(ep => ep.id === p.id);
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          token: p.token,
          isHuman: p.isHuman,
          isHost: p.isHost,
          connected: p.connected,
          isLeft: Boolean(p.isLeft),
          money: engP ? engP.money : this.rules.defaultStartingMoney,
          position: engP ? engP.position : 0,
          rotationsCompleted: engP ? engP.rotationsCompleted : 0,
          inJail: engP ? engP.inJail : false,
          jailTurns: engP ? engP.jailTurns : 0,
          inRestHouse: engP ? engP.inRestHouse : false,
          ownedProperties: engP ? engP.ownedProperties : [],
          buildings: engP ? engP.buildings : {},
          mortgages: engP ? engP.mortgages : {},
          isBankrupt: engP ? engP.isBankrupt : false,
        };
      }),
      gameState: this.gameState,
      eventLog: this.eventLog,
      transactionLedger: this.transactionLedger,
    };
  }

  destroy() {
    this.cancelEmptyExpiration();
    this.engine.kill();
    for (const req of this.joinRequests.values()) {
      if (req.socket && !req.socket.destroyed) {
        try { req.socket.destroy(); } catch (_) {}
      }
    }
    this.joinRequests.clear();
    this.players.forEach(p => {
      if (p.socket && !p.socket.destroyed) {
        try { p.socket.destroy(); } catch (_) {}
      }
    });
  }
}

// Global active rooms map: roomCode -> Room
const rooms = new Map();

// Helper to auto-kick a client from other rooms when they join/create a new room
async function kickClientFromOtherRooms(clientId, currentRoomCode, sessionToken = null) {
  if (!clientId && !sessionToken) return;
  for (const [code, room] of rooms.entries()) {
    if (code === currentRoomCode) continue;
    const targetPlayer = room.players.find(p =>
      !p.isLeft && (
        (clientId && p.clientId === clientId) ||
        (sessionToken && p.sessionToken === sessionToken)
      )
    );
    if (targetPlayer) {
      console.log(`[MULTIPLAYER SERVER] Auto-kicking player ${targetPlayer.name} (id: ${targetPlayer.id}) from Room ${code} because they connected to Room ${currentRoomCode}`);
      try {
        await room.kickPlayer(null, targetPlayer.id, 'You connected to another room.');
      } catch (err) {
        console.error(`[MULTIPLAYER SERVER] Error auto-kicking player from Room ${code}:`, err);
      }
    }
  }
}

// Registry of closed rooms: roomCode -> { closedAt, reason, closedBy }
const closedRooms = new Map();

function closeRoomAdmin(roomCode, reason = 'Closed by server administrator.', closedBy = 'admin') {
  const code = (roomCode || '').trim().toUpperCase();
  if (closedRooms.has(code)) {
    return { ok: true, alreadyClosed: true, message: `Room ${code} is already closed.` };
  }
  const room = rooms.get(code);
  if (!room) {
    return { ok: false, error: `Room ${code} not found.` };
  }

  closedRooms.set(code, {
    closedAt: Date.now(),
    reason,
    closedBy,
  });

  // Keep closedRooms map bounded
  if (closedRooms.size > 200) {
    const oldestKey = closedRooms.keys().next().value;
    closedRooms.delete(oldestKey);
  }

  // Notify clients
  broadcastToRoom(room, {
    type: 'ROOM_CLOSED',
    roomCode: code,
    reason,
  });

  // Reject any pending join requests
  for (const req of room.joinRequests.values()) {
    if (req.socket && !req.socket.destroyed) {
      try {
        req.socket.write(encodeWsTextFrame(JSON.stringify({
          type: 'JOIN_REQUEST_DECISION',
          status: 'REJECTED',
          reason,
        })));
      } catch (_) {}
    }
  }

  room.isExpired = true;
  room.isClosed = true;
  room.destroy();
  rooms.delete(code);

  console.log(`[MULTIPLAYER SERVER] Admin closed room ${code} (Reason: ${reason}, By: ${closedBy})`);
  return { ok: true, message: `Room ${code} has been successfully closed and cleaned up.` };
}

// Stdin administrative CLI listener for direct terminal management
if (process.stdin && typeof process.stdin.on === 'function') {
  try {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      const line = chunk.toString().trim();
      const match = line.match(/^(?:close|close-room|room-close)\s+([A-Za-z0-9-]+)(?:\s+(.+))?$/i);
      if (match) {
        const code = match[1].toUpperCase();
        const reason = match[2] || 'Closed by server console operator';
        const result = closeRoomAdmin(code, reason, 'server-console');
        console.log(`[ADMIN CLI RESULT]:`, result);
      }
    });
  } catch (_) {}
}

// Periodically clean up abandoned rooms (inactive > 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const allDisconnected = room.players.every(p => !p.connected);
    const idleTime = now - room.lastActivityAt;
    if (allDisconnected && idleTime > 30 * 60 * 1000) {
      console.log(`[MULTIPLAYER SERVER] Cleaning up abandoned room ${code}`);
      room.destroy();
      rooms.delete(code);
    }
  }
}, 60 * 1000);

// ─── MINIMAL PURE RFC 6455 WEBSOCKET FRAME HANDLER ────────────────────────────

function encodeWsTextFrame(dataStr) {
  const payload = Buffer.from(dataStr, 'utf8');
  const length = payload.length;

  let header;
  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function broadcastToRoom(room, messageObj, excludeSocket = null) {
  for (const p of room.players) {
    if (p.connected && p.socket && p.socket !== excludeSocket && !p.socket.destroyed) {
      try {
        const frame = encodeWsTextFrame(JSON.stringify({
          ...messageObj,
          yourPlayerId: p.id,
        }));
        p.socket.write(frame);
      } catch (err) {
        p.connected = false;
      }
    }
  }
}

function handleWsConnection(socket, req, head = null) {
  let buffer = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0);
  let currentRoom = null;
  let currentPlayer = null;
  const clientIp = resolveClientIp(req);

  socket.on('data', async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (buffer.length < 4) break;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) break;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      if (payloadLength > MAX_MESSAGE_SIZE) {
        logSecurityEvent('PAYLOAD_LIMIT_EXCEEDED', { ip: clientIp, payloadLength, maxAllowed: MAX_MESSAGE_SIZE });
        socket.destroy();
        return;
      }

      const maskLength = isMasked ? 4 : 0;
      const totalFrameSize = offset + maskLength + payloadLength;
      if (buffer.length < totalFrameSize) break;

      let payload = buffer.subarray(offset + maskLength, totalFrameSize);
      if (isMasked) {
        const mask = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLength);
        for (let i = 0; i < payloadLength; i++) {
          unmasked[i] = payload[i] ^ mask[i % 4];
        }
        payload = unmasked;
      }

      buffer = buffer.subarray(totalFrameSize);

      // Handle Opcode
      if (opcode === 0x8) { // CLOSE
        socket.end();
        return;
      } else if (opcode === 0x9) { // PING
        const pong = Buffer.alloc(2);
        pong[0] = 0x8a;
        pong[1] = 0;
        socket.write(pong);
        if (currentPlayer) currentPlayer.lastSeen = Date.now();
        continue;
      } else if (opcode === 0xa) { // PONG
        if (currentPlayer) currentPlayer.lastSeen = Date.now();
        continue;
      } else if (opcode === 0x1) { // TEXT FRAME
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          if (currentPlayer) currentPlayer.lastSeen = Date.now();
          await handleClientMessage(msg, socket, (rm, pl) => {
            currentRoom = rm;
            currentPlayer = pl;
          }, clientIp);
        } catch (e) {
          console.error('[WS PARSE ERROR]:', e);
        }
      }
    }
  });

  socket.on('close', () => {
    // CRITICAL: Only mark disconnected if this socket is STILL the player's active socket!
    // If player reconnected or bound a new socket, do NOT drop the new active session.
    if (currentRoom && currentPlayer && currentPlayer.socket === socket) {
      currentRoom.handlePlayerDisconnect(currentPlayer);
      broadcastToRoom(currentRoom, {
        type: 'PLAYER_STATUS',
        playerId: currentPlayer.id,
        connected: false,
        message: `${currentPlayer.name} disconnected.`,
        snapshot: currentRoom.getSnapshot(),
      });
    }
  });

  socket.on('error', () => {
    socket.destroy();
  });
}

async function handleClientMessage(msg, socket, bindContext, clientIp = '127.0.0.1') {
  const { type, roomCode, sessionToken, payload, requestId, clientId } = msg;

  if (type === 'PING') {
    socket.write(encodeWsTextFrame(JSON.stringify({ type: 'PONG', timestamp: Date.now() })));
    return;
  }
  if (type === 'PONG') {
    return;
  }

  if (type === 'LISTEN_JOIN_REQUEST') {
    const room = rooms.get(roomCode);
    if (!room || room.isExpired) {
      socket.write(encodeWsTextFrame(JSON.stringify({ type: 'ERROR', message: 'Room not found or expired.', requestId })));
      return;
    }
    const reqInfo = room.joinRequests.get(payload?.requestId);
    if (reqInfo) {
      reqInfo.socket = socket;
      if (reqInfo.status === 'ACCEPTED') {
        socket.write(encodeWsTextFrame(JSON.stringify({
          type: 'JOIN_REQUEST_DECISION',
          status: 'ACCEPTED',
          roomCode: room.roomCode,
          playerId: reqInfo.playerId,
          sessionToken: reqInfo.sessionToken,
          snapshot: room.getSnapshot(),
          requestId,
        })));
      } else if (reqInfo.status === 'REJECTED') {
        socket.write(encodeWsTextFrame(JSON.stringify({
          type: 'JOIN_REQUEST_DECISION',
          status: 'REJECTED',
          reason: reqInfo.rejectReason || 'Join request was rejected.',
          requestId,
        })));
      }
    }
    return;
  }

  if (type === 'JOIN_WS') {
    const room = rooms.get(roomCode);
    if (!room || room.isExpired) {
      socket.write(encodeWsTextFrame(JSON.stringify({ type: 'ERROR', message: 'Room not found or expired.', requestId })));
      return;
    }

    const cId = clientId || payload?.clientId || msg.clientId;
    if (cId) {
      await kickClientFromOtherRooms(cId, roomCode, sessionToken);
    }

    let player = room.getPlayerByToken(sessionToken);
    if (!player && cId) {
      player = room.players.find(p => p.clientId === cId && !p.isLeft);
    }
    if (!player) {
      socket.write(encodeWsTextFrame(JSON.stringify({ type: 'ERROR', message: 'Invalid player session token.', requestId })));
      return;
    }

    // Disconnect old socket if any, clearing reference first to avoid disconnect race
    const oldSocket = player.socket;
    player.socket = socket;
    if (oldSocket && oldSocket !== socket && !oldSocket.destroyed) {
      try {
        oldSocket.write(encodeWsTextFrame(JSON.stringify({
          type: 'SUPERSEDED',
          message: 'Connected from another session or tab.',
        })));
        oldSocket.destroy();
      } catch (_) {}
    }

    player.connected = true;
    if (cId) player.clientId = cId;
    player.lastSeen = Date.now();
    room.cancelEmptyExpiration();
    bindContext(room, player);

    socket.write(encodeWsTextFrame(JSON.stringify({
      type: 'INIT_SNAPSHOT',
      player: { id: player.id, name: player.name, color: player.color, isHost: player.isHost },
      snapshot: room.getSnapshot(),
      requestId,
    })));

    broadcastToRoom(room, {
      type: 'PLAYER_STATUS',
      playerId: player.id,
      connected: true,
      message: `${player.name} connected.`,
      snapshot: room.getSnapshot(),
    }, socket);
    return;
  }

  const room = rooms.get(roomCode);
  if (!room || room.isExpired) {
    socket.write(encodeWsTextFrame(JSON.stringify({ type: 'ERROR', message: 'Room not found or expired.', requestId })));
    return;
  }

  if (type === 'RESPOND_JOIN_REQUEST') {
    try {
      const result = room.respondJoinRequest(sessionToken, payload?.requestId, payload?.decision);
      socket.write(encodeWsTextFrame(JSON.stringify({
        type: 'JOIN_REQUEST_RESPONDED',
        ...result,
        requestId,
      })));
    } catch (err) {
      socket.write(encodeWsTextFrame(JSON.stringify({
        type: 'ERROR',
        message: err.message,
        requestId,
      })));
    }
    return;
  }

  const player = room.getPlayerByToken(sessionToken);
  if (!player) {
    socket.write(encodeWsTextFrame(JSON.stringify({ type: 'ERROR', message: 'Unauthorized session.', requestId })));
    return;
  }

  bindContext(room, player);

  try {
    if (type === 'UPDATE_RULES') {
      room.updateRules(player.id, payload || {});
      broadcastToRoom(room, {
        type: 'RULES_UPDATED',
        rules: room.rules,
        snapshot: room.getSnapshot(),
        requestId,
      });
    } else if (type === 'UPDATE_PLAYER') {
      room.updatePlayer(player.id, payload || {});
      broadcastToRoom(room, {
        type: 'PLAYER_UPDATED',
        snapshot: room.getSnapshot(),
        requestId,
      });
    } else if (type === 'START_GAME') {
      const snapshot = await room.startGame(player.id);
      broadcastToRoom(room, {
        type: 'GAME_STARTED',
        snapshot,
        requestId,
      });
    } else if (type === 'ACTION') {
      const actionRateKey = `player_${player.sessionToken || player.id}`;
      const rateCheck = globalRateLimiter.consume('GAMEPLAY_ACTION', actionRateKey);
      if (!rateCheck.allowed) {
        logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIp, category: 'GAMEPLAY_ACTION', playerId: player.id });
        socket.write(encodeWsTextFrame(JSON.stringify({
          type: 'ACTION_ERROR',
          message: 'Rate limit exceeded for actions. Please wait a moment.',
          retryAfter: rateCheck.retryAfter,
          requestId,
        })));
        return;
      }
      const { action, ...actionPayload } = payload || {};
      const result = await room.processAction(player.id, action, actionPayload);
      broadcastToRoom(room, {
        type: 'ACTION_RESULT',
        action,
        playerId: player.id,
        actionResult: result.actionResult,
        snapshot: result.snapshot,
        sequence: result.sequence,
        sellPrice: result.sellPrice,
        requestId,
      });
    } else if (type === 'REMATCH_READY') {
      const res = room.signalRematchReady(player.id);
      socket.write(encodeWsTextFrame(JSON.stringify({
        type: 'REMATCH_READY_ACK',
        ...res,
        requestId,
      })));
    } else if (type === 'REMATCH') {
      const snapshot = await room.rematch(player.id);
      broadcastToRoom(room, {
        type: 'REMATCH_STARTED',
        snapshot,
        requestId,
      });
    } else if (type === 'LEAVE_ROOM') {
      const res = await room.leaveRoom(player.id);
      socket.write(encodeWsTextFrame(JSON.stringify({
        type: 'LEFT_ROOM',
        ...res,
        requestId,
      })));
    } else if (type === 'KICK_PLAYER' || type === 'REMOVE_PLAYER') {
      const targetId = payload?.targetPlayerId ?? payload?.playerId;
      const reason = payload?.reason || 'Kicked by host';
      const result = await room.kickPlayer(player.id, targetId, reason);
      socket.write(encodeWsTextFrame(JSON.stringify({
        type: 'KICK_PLAYER_ACK',
        ...result,
        requestId,
      })));
    }
  } catch (err) {
    socket.write(encodeWsTextFrame(JSON.stringify({
      type: 'ACTION_ERROR',
      message: err.message || 'Action failed.',
      requestId,
    })));
  }
}

// ─── HTTP REST API HANDLER (DUAL TRANSPORT & STATIC WEB SERVING) ────────────────

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Server Error loading asset');
      return;
    }
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    };
    if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=300';
    }
    res.writeHead(200, headers);
    res.end(content);
  });
}

function rejectRateLimit(res, category, clientIp, rateResult) {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIp, category, retryAfter: rateResult.retryAfter });
  res.statusCode = 429;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Retry-After', String(rateResult.retryAfter || 5));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({
    ok: false,
    error: `Rate limit exceeded for ${RATE_LIMIT_CONFIGS[category]?.description || category}. Please wait ${rateResult.retryAfter}s and retry.`,
    retryAfter: rateResult.retryAfter,
  }));
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = 204;
    res.end();
    return;
  }

  const clientIp = resolveClientIp(req);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  let body = '';
  let bodyLength = 0;
  req.on('data', chunk => {
    bodyLength += chunk.length;
    if (bodyLength > MAX_MESSAGE_SIZE) {
      logSecurityEvent('PAYLOAD_LIMIT_EXCEEDED', { ip: clientIp, bodyLength, maxAllowed: MAX_MESSAGE_SIZE });
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Payload too large (maximum 64KB).' }));
      req.destroy();
      return;
    }
    body += chunk;
  });
  req.on('end', async () => {
    let payload = {};
    if (body) {
      try { payload = JSON.parse(body); } catch (_) {}
    }

    // General rate limiter on all HTTP requests
    if (pathname.startsWith('/api/') && pathname !== '/api/health') {
      const genCheck = globalRateLimiter.consume('GENERAL_API', clientIp);
      if (!genCheck.allowed) {
        return rejectRateLimit(res, 'GENERAL_API', clientIp, genCheck);
      }
    }

    // Static asset & SPA fallback serving in production (serves dist/)
    if (req.method === 'GET' && !pathname.startsWith('/api/') && pathname !== '/health') {
      const distDir = path.resolve(__dirname, '../dist');
      if (fs.existsSync(distDir)) {
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        const targetPath = safePath === '/' ? path.join(distDir, 'index.html') : path.join(distDir, safePath);
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
          return serveStaticFile(res, targetPath);
        }
        // SPA Fallback: serve dist/index.html for client routes (e.g. /?room=CRN-1234)
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          return serveStaticFile(res, indexPath);
        }
      }
    }

    // Health check (probed by Render, Railway, Fly.io, or frontend health check)
    if (pathname === '/api/health' || pathname === '/health') {
      let connectedPlayers = 0;
      for (const room of rooms.values()) {
        connectedPlayers += room.players.filter(p => p.connected).length;
      }
      return sendJson(res, 200, {
        ok: true,
        status: 'online',
        platform: 'render',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        activeConnections,
        roomsCount: rooms.size,
        connectedPlayers,
        engineBinary: ENGINE_EXE,
        engineAvailable: fs.existsSync(ENGINE_EXE),
      });
    }

    // Create Room: POST /api/multiplayer/room/create
    if (pathname === '/api/multiplayer/room/create') {
      try {
        const rateCheck = globalRateLimiter.consume('ROOM_CREATE', clientIp);
        if (!rateCheck.allowed) {
          return rejectRateLimit(res, 'ROOM_CREATE', clientIp, rateCheck);
        }

        // CAPTCHA verification (Cloudflare Turnstile with fail-closed semantics)
        const captchaRes = await verifyCaptchaToken(payload.captchaToken, clientIp);
        if (!captchaRes.valid && !captchaRes.ok) {
          logSecurityEvent('CAPTCHA_VERIFICATION_FAILED', { ip: clientIp, reason: captchaRes.error });
          return sendJson(res, 403, { ok: false, error: captchaRes.error || 'Human verification failed.', captchaRequired: true });
        }

        const rawCode = payload.roomCode;
        if (rawCode && !validateRoomCode(rawCode)) {
          return sendJson(res, 400, { ok: false, error: 'Invalid room code format. Must be 3-16 alphanumeric characters.' });
        }
        const roomCode = rawCode ? rawCode.trim().toUpperCase() : `CRN-${Math.floor(1000 + Math.random() * 9000)}`;
        if (rooms.has(roomCode)) {
          return sendJson(res, 400, { ok: false, error: 'Room code already exists. Please retry.' });
        }
        if (payload.clientId) {
          await kickClientFromOtherRooms(payload.clientId, roomCode);
        }
        const safeHostName = sanitizePlayerName(payload.hostName, 'Host');
        const safeHostColor = validateColor(payload.hostColor) || 'saffron';
        const room = new Room(roomCode, safeHostName, safeHostColor, payload.rules, payload.clientId);
        rooms.set(roomCode, room);
        const host = room.players[0];
        return sendJson(res, 200, {
          ok: true,
          roomCode,
          sessionToken: host.sessionToken,
          playerId: host.id,
          snapshot: room.getSnapshot(),
        });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    // Join Room: POST /api/multiplayer/room/join
    if (pathname === '/api/multiplayer/room/join') {
      try {
        const rateCheck = globalRateLimiter.consume('ROOM_JOIN', clientIp);
        if (!rateCheck.allowed) {
          return rejectRateLimit(res, 'ROOM_JOIN', clientIp, rateCheck);
        }

        // Enforce CAPTCHA if suspicious repeated failed joins or CAPTCHA_ENFORCEMENT=always
        if (isIpSuspicious(clientIp) || process.env.CAPTCHA_ENFORCEMENT === 'always') {
          const captchaRes = await verifyCaptchaToken(payload.captchaToken, clientIp);
          if (!captchaRes.valid && !captchaRes.ok) {
            logSecurityEvent('CAPTCHA_VERIFICATION_FAILED', { ip: clientIp, reason: captchaRes.error });
            return sendJson(res, 403, { ok: false, error: captchaRes.error || 'Human verification required due to suspicious activity.', captchaRequired: true });
          }
        }

        const { roomCode, playerName, playerColor, clientId, sessionToken } = payload;
        const cleanCode = (roomCode || '').trim().toUpperCase();
        if (!validateRoomCode(cleanCode)) {
          recordFailedJoin(clientIp);
          return sendJson(res, 400, { ok: false, error: 'Invalid room code format.' });
        }
        if (closedRooms.has(cleanCode)) {
          recordFailedJoin(clientIp);
          return sendJson(res, 410, { ok: false, error: 'Room has been closed by the server administrator.' });
        }
        const room = rooms.get(cleanCode);
        if (!room || room.isExpired) {
          recordFailedJoin(clientIp);
          return sendJson(res, 404, { ok: false, error: 'Room not found or has expired. Check the code and try again.' });
        }
        if (clientId) {
          await kickClientFromOtherRooms(clientId, cleanCode, sessionToken);
        }
        const safeName = sanitizePlayerName(playerName, 'Guest Player');
        const safeColor = validateColor(playerColor);
        const joinResult = room.requestJoin(safeName, safeColor, null, clientId, sessionToken);
        clearSuspiciousJoin(clientIp);
        return sendJson(res, 200, {
          ok: true,
          ...joinResult,
        });
      } catch (err) {
        recordFailedJoin(clientIp);
        const currentRoom = rooms.get(cleanCode);
        return sendJson(res, 400, {
          ok: false,
          error: err.message,
          snapshot: (currentRoom && !currentRoom.isExpired) ? currentRoom.getSnapshot() : undefined,
        });
      }
    }

    // Join Request Status: GET /api/multiplayer/room/:code/join-status/:requestId
    const joinStatusMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/join-status\/([A-Za-z0-9_-]+)$/);
    if (joinStatusMatch) {
      const roomCode = joinStatusMatch[1].toUpperCase();
      const requestId = joinStatusMatch[2];
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) {
        return sendJson(res, 404, { ok: false, status: 'REJECTED', error: 'Room no longer exists or has expired.' });
      }
      const reqInfo = room.joinRequests.get(requestId);
      if (!reqInfo) {
        return sendJson(res, 404, { ok: false, status: 'REJECTED', error: 'Join request not found or expired.' });
      }
      return sendJson(res, 200, {
        ok: true,
        status: reqInfo.status,
        playerId: reqInfo.playerId,
        sessionToken: reqInfo.sessionToken,
        rejectReason: reqInfo.rejectReason,
        snapshot: reqInfo.status === 'ACCEPTED' ? room.getSnapshot() : undefined,
      });
    }

    // Host Responds to Join Request: POST /api/multiplayer/room/:code/join-request/respond
    const joinRespondMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/join-request\/respond$/);
    if (joinRespondMatch) {
      const rateCheck = globalRateLimiter.consume('JOIN_REQUEST_RESPOND', clientIp);
      if (!rateCheck.allowed) {
        return rejectRateLimit(res, 'JOIN_REQUEST_RESPOND', clientIp, rateCheck);
      }
      const roomCode = joinRespondMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) {
        return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      }
      try {
        const { sessionToken, requestId, decision } = payload;
        const result = room.respondJoinRequest(sessionToken, requestId, decision);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Reconnect Room: POST /api/multiplayer/room/reconnect
    if (pathname === '/api/multiplayer/room/reconnect') {
      const rateCheck = globalRateLimiter.consume('RECONNECT', clientIp);
      if (!rateCheck.allowed) {
        return rejectRateLimit(res, 'RECONNECT', clientIp, rateCheck);
      }
      const { roomCode, sessionToken } = payload;
      const room = rooms.get((roomCode || '').trim().toUpperCase());
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const player = room.getPlayerByToken(sessionToken);
      if (!player) return sendJson(res, 401, { ok: false, error: 'Invalid reconnect session token.' });
      player.connected = true;
      room.cancelEmptyExpiration();
      return sendJson(res, 200, {
        ok: true,
        playerId: player.id,
        snapshot: room.getSnapshot(),
      });
    }

    // Get Room State: GET /api/multiplayer/room/:code/state
    const stateMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/state$/);
    if (stateMatch) {
      const roomCode = stateMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      return sendJson(res, 200, { ok: true, snapshot: room.getSnapshot() });
    }

    // Process Action via HTTP POST: POST /api/multiplayer/room/:code/action
    const actionMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/action$/);
    if (actionMatch) {
      const roomCode = actionMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const player = room.getPlayerByToken(payload.sessionToken);
      if (!player) return sendJson(res, 401, { ok: false, error: 'Unauthorized.' });

      const actionRateKey = `player_${player.sessionToken || player.id}`;
      const rateCheck = globalRateLimiter.consume('GAMEPLAY_ACTION', actionRateKey);
      if (!rateCheck.allowed) {
        return rejectRateLimit(res, 'GAMEPLAY_ACTION', clientIp, rateCheck);
      }
      try {
        const { action, ...actionPayload } = payload;
        if (action === 'kick' || action === 'remove_player' || action === 'removePlayer') {
          const targetId = actionPayload.targetPlayerId ?? actionPayload.playerId;
          const reason = actionPayload.reason || 'Kicked by host';
          const result = await room.kickPlayer(player.id, targetId, reason);
          return sendJson(res, 200, result);
        }
        if (action === 'update_rules' || action === 'updateRules') {
          room.updateRules(player.id, actionPayload.rules || actionPayload);
          const snapshot = room.getSnapshot();
          broadcastToRoom(room, {
            type: 'RULES_UPDATED',
            rules: room.rules,
            snapshot,
          });
          return sendJson(res, 200, { ok: true, snapshot, rules: room.rules });
        }
        if (action === 'start_game' || action === 'startGame') {
          const snapshot = await room.startGame(player.id);
          broadcastToRoom(room, {
            type: 'GAME_STARTED',
            snapshot,
          });
          return sendJson(res, 200, { ok: true, snapshot });
        }
        const result = await room.processAction(player.id, action, actionPayload);
        broadcastToRoom(room, {
          type: 'ACTION_RESULT',
          action,
          playerId: player.id,
          actionResult: result.actionResult,
          snapshot: result.snapshot,
          sequence: result.sequence,
        });
        return sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Host Kicks Player: POST /api/multiplayer/room/:code/kick or /remove
    const kickMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/(?:kick|remove)$/);
    if (kickMatch) {
      const roomCode = kickMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const hostPlayer = room.getPlayerByToken(payload.sessionToken);
      if (!hostPlayer || hostPlayer.id !== room.hostPlayerId) {
        return sendJson(res, 403, { ok: false, error: 'Only the host can kick players.' });
      }
      try {
        const targetId = payload.targetPlayerId ?? payload.playerId;
        const reason = payload.reason || 'Kicked by host';
        const result = await room.kickPlayer(hostPlayer.id, targetId, reason);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Host Updates Rules: POST /api/multiplayer/room/:code/rules
    const rulesRouteMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/rules$/);
    if (rulesRouteMatch) {
      const roomCode = rulesRouteMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const hostPlayer = room.getPlayerByToken(payload.sessionToken);
      if (!hostPlayer || (hostPlayer.id !== room.hostPlayerId && hostPlayer.id !== 0)) {
        return sendJson(res, 403, { ok: false, error: 'Only the host can modify match rules.' });
      }
      try {
        room.updateRules(hostPlayer.id, payload.rules || payload);
        const snapshot = room.getSnapshot();
        broadcastToRoom(room, {
          type: 'RULES_UPDATED',
          rules: room.rules,
          snapshot,
        });
        return sendJson(res, 200, { ok: true, snapshot, rules: room.rules });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Admin Security Events: GET /api/admin/security/events
    if (pathname === '/api/admin/security/events') {
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      const adminKeyHeader = (req.headers['x-admin-key'] || '').trim();
      const expectedKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || 'crownfall-admin-secret';

      if (bearerToken !== expectedKey && adminKeyHeader !== expectedKey) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: Invalid administrative credentials.' });
      }
      return sendJson(res, 200, {
        ok: true,
        eventsCount: securityEventLog.length,
        events: securityEventLog,
      });
    }

    // Admin Close Room: POST /api/admin/room/:code/close
    const adminCloseMatch = pathname.match(/^\/api\/admin\/room\/([A-Za-z0-9-]+)\/close$/);
    if (adminCloseMatch) {
      const roomCode = adminCloseMatch[1].toUpperCase();
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      const adminKeyHeader = (req.headers['x-admin-key'] || '').trim();
      const expectedKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || 'crownfall-admin-secret';

      if (bearerToken !== expectedKey && adminKeyHeader !== expectedKey) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: Invalid administrative credentials.' });
      }

      const reason = payload.reason || 'Closed by server administrator via API.';
      const result = closeRoomAdmin(roomCode, reason, 'admin-api');
      if (!result.ok && !result.alreadyClosed) {
        return sendJson(res, 404, result);
      }
      return sendJson(res, 200, result);
    }

    // Leave Room: POST /api/multiplayer/room/:code/leave
    const leaveMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/leave$/);
    if (leaveMatch) {
      const roomCode = leaveMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) {
        return sendJson(res, 200, { ok: true, message: 'Room already closed or expired.' });
      }
      const player = room.getPlayerByToken(payload.sessionToken);
      if (!player) {
        return sendJson(res, 200, { ok: true, message: 'Player not currently active in room.' });
      }
      try {
        const result = await room.leaveRoom(player.id);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Rematch Ready: POST /api/multiplayer/room/:code/rematch/ready
    const rematchReadyMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/rematch\/ready$/);
    if (rematchReadyMatch) {
      const roomCode = rematchReadyMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const player = room.getPlayerByToken(payload.sessionToken);
      if (!player) return sendJson(res, 401, { ok: false, error: 'Unauthorized.' });
      try {
        const result = room.signalRematchReady(player.id);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // Rematch Start: POST /api/multiplayer/room/:code/rematch
    const rematchMatch = pathname.match(/^\/api\/multiplayer\/room\/([A-Za-z0-9-]+)\/rematch$/);
    if (rematchMatch) {
      const roomCode = rematchMatch[1].toUpperCase();
      const room = rooms.get(roomCode);
      if (!room || room.isExpired) return sendJson(res, 404, { ok: false, error: 'Room not found or has expired.' });
      const player = room.getPlayerByToken(payload.sessionToken);
      if (!player) return sendJson(res, 401, { ok: false, error: 'Unauthorized.' });
      try {
        const snapshot = await room.rematch(player.id);
        broadcastToRoom(room, {
          type: 'REMATCH_STARTED',
          snapshot,
        });
        return sendJson(res, 200, { ok: true, snapshot });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 404
    sendJson(res, 404, { ok: false, error: 'Endpoint not found.' });
  });
});

// RFC 6455 WebSocket Upgrade Handshake
server.on('upgrade', (req, socket, head) => {
  const upgradeHeader = req.headers['upgrade'];
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  if (activeConnections >= MAX_CONNECTIONS) {
    socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  const clientKey = req.headers['sec-websocket-key'];
  if (!clientKey) {
    socket.destroy();
    return;
  }

  activeConnections++;
  socket.on('close', () => {
    activeConnections = Math.max(0, activeConnections - 1);
  });

  const hash = crypto.createHash('sha1').update(clientKey + WS_GUID).digest('base64');
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${hash}`,
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
  handleWsConnection(socket, req, head);
});

// Periodic cleanup of abandoned/inactive rooms (keeps memory low on 512MB RAM free tier)
const ROOM_INACTIVITY_MS = 25 * 60 * 1000; // 25 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const isStale = (now - room.lastActivityAt) > ROOM_INACTIVITY_MS;
    const allDisconnected = room.players.every(p => !p.connected);
    if (isStale || (allDisconnected && (now - room.lastActivityAt) > 10 * 60 * 1000)) {
      console.log(`[MULTIPLAYER SERVER] Cleaning up inactive room: ${code}`);
      room.destroy();
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

// 25-second server ping heartbeat to prevent Render reverse-proxy timeout (which kills idle connections at ~55s)
const heartbeatInterval = setInterval(() => {
  const pingFrame = Buffer.from([0x89, 0x00]); // RFC 6455 PING opcode with 0 length
  for (const room of rooms.values()) {
    for (const p of room.players) {
      if (p.connected && p.socket && !p.socket.destroyed) {
        try {
          p.socket.write(pingFrame);
        } catch (_) {
          p.connected = false;
        }
      }
    }
    for (const req of room.joinRequests.values()) {
      if (req.socket && !req.socket.destroyed) {
        try {
          req.socket.write(pingFrame);
        } catch (_) {}
      }
    }
  }
}, 25 * 1000);
heartbeatInterval.unref();

// Graceful process shutdown handler (for Render deploys and free-tier spin-down)
function gracefulShutdown(signal) {
  console.log(`[MULTIPLAYER SERVER] Received ${signal}. Initiating graceful shutdown...`);
  if (cleanupInterval) clearInterval(cleanupInterval);
  server.close(() => {
    console.log('[MULTIPLAYER SERVER] HTTP & WebSocket listener closed.');
    for (const [code, room] of rooms.entries()) {
      try {
        broadcastToRoom(room, {
          type: 'SERVER_SHUTDOWN',
          message: 'Server is restarting or sleeping (Render Free Tier). In-memory state terminated.',
        });
        room.destroy();
      } catch (_) {}
    }
    rooms.clear();
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[MULTIPLAYER SERVER] Forcefully terminating process.');
    process.exit(0);
  }, 4000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = {
  server,
  rooms,
  Room,
  CppEngineProcess,
  PORT,
  HOST,
};

// If run directly via node scripts/multiplayer_server.cjs
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`[MULTIPLAYER SERVER] Crownfall Authoritative Server running on http://${HOST}:${PORT}`);
    console.log(`[MULTIPLAYER SERVER] WebSocket available at ws://${HOST}:${PORT}`);
    console.log(`[MULTIPLAYER SERVER] Engine executable: ${ENGINE_EXE} (exists: ${fs.existsSync(ENGINE_EXE)})`);
  });
}

