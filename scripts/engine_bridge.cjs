const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

class CppEngineProcess {
  constructor() {
    this.exePath = resolveEngineBinary();
    this.process = null;
    this.queue = [];
    this.buffer = '';
    this.isStarting = false;
  }

  ensureProcess() {
    if (this.process && !this.process.killed) {
      return true;
    }
    if (!fs.existsSync(this.exePath)) {
      console.warn('[CPP ENGINE BRIDGE] Executable not found at:', this.exePath);
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
        console.log(`[CPP ENGINE] Exited with code ${code}`);
        this.process = null;
        // Reject any pending requests
        while (this.queue.length > 0) {
          const req = this.queue.shift();
          req.reject(new Error(`C++ Engine process exited with code ${code}`));
        }
      });

      return true;
    } catch (err) {
      console.error('[CPP ENGINE BRIDGE] Failed to spawn process:', err);
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
      } catch (e) {}
      this.process = null;
    }
  }
}

const engineProcess = new CppEngineProcess();

// Periodic authoritative timeout check for turn timer
setInterval(async () => {
  if (engineProcess.process && !engineProcess.process.killed && engineProcess.queue.length === 0) {
    try {
      await engineProcess.sendCommand({ action: 'timeout' });
    } catch (_) {}
  }
}, 1000);

function handleEngineRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const action = url.pathname.replace('/api/engine/', '').replace('/api/engine', '');

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    let payload = {};
    if (body) {
      try { payload = JSON.parse(body); } catch (e) {}
    }

    if (action === 'status' || action === '') {
      try {
        const result = await engineProcess.sendCommand({ action: 'status' });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, connected: false, error: err.message }));
      }
      return;
    }

    // Pass action to C++ engine
    try {
      const cmd = { action, ...payload };
      const result = await engineProcess.sendCommand(cmd);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
}

let multiplayerServer = null;
try {
  multiplayerServer = require('./multiplayer_server.cjs');
} catch (_) {}

// Dedicated port listener on 8444 as dual-endpoint fallback for LAN clients
try {
  if (multiplayerServer && multiplayerServer.server && !multiplayerServer.server.listening) {
    multiplayerServer.server.listen(8444, '0.0.0.0', () => {
      console.log('[ENGINE BRIDGE] Dedicated multiplayer listener active on 0.0.0.0:8444');
    }).on('error', () => {
      // Non-fatal if 8444 is already bound or restricted
    });
  }
} catch (_) {}

function attachWebSocket(httpServer) {
  if (!httpServer || !multiplayerServer) return;
  httpServer.on('upgrade', (req, socket, head) => {
    // Pass Vite HMR upgrades through to Vite
    const protocol = req.headers['sec-websocket-protocol'];
    if (protocol === 'vite-hmr') return;
    multiplayerServer.server.emit('upgrade', req, socket, head);
  });
}

function createViteMiddleware() {
  return (req, res, next) => {
    if (req.url && req.url.startsWith('/api/engine')) {
      handleEngineRequest(req, res);
      return;
    }
    if (req.url && (req.url.startsWith('/api/multiplayer') || req.url.startsWith('/api/admin') || req.url.startsWith('/api/health') || req.url === '/health') && multiplayerServer) {
      multiplayerServer.server.emit('request', req, res);
      return;
    }
    next();
  };
}

module.exports = {
  CppEngineProcess,
  engineProcess,
  createViteMiddleware,
  handleEngineRequest,
  attachWebSocket,
};
