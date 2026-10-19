# Crownfall — Render Free Tier Deployment Guide

This guide details the deployment of **Crownfall** as a public browser multiplayer game hosted on **Render** under the **Free Tier**.

---

## 1. System Architecture

```mermaid
graph TD
    BrowserClient[Browser Player / Mobile Browser]
    StaticSite[Render Static Site: Crownfall Web<br/>React + TypeScript + Vite]
    WebService[Render Web Service: Crownfall Server<br/>Docker: Node.js 22 + C++ Engine]
    CppEngine[Authoritative C++ Game Engine<br/>monopoly_engine binary]

    BrowserClient -->|HTTPS: HTML / JS / CSS Assets| StaticSite
    BrowserClient -->|WSS / HTTPS: Game Actions & Snapshots| WebService
    WebService -->|STDIN / STDOUT: JSON Command Stream| CppEngine
```

- **Frontend**: Render Static Site built with Vite, outputting to `dist/`.
- **Backend**: Render Web Service built with a multi-stage Dockerfile containing:
  1. Debian build stage compiling the authoritative C++ engine with `g++` and optimizations (`-O3`).
  2. Node.js 22 runtime stage running `scripts/multiplayer_server.cjs` (RFC 6455 WebSocket + HTTP dual transport).
- **Transport**: Encrypted Secure WebSocket (`wss://`) and secure HTTP (`https://`) terminated by Render's TLS reverse proxy.
- **Data Persistence**: In-memory room state. No external database or paid services required.

---

## 2. Render Free Tier Characteristics & Policies

| Attribute | Behavior on Render Free Tier |
|---|---|
| **Monthly Cost** | **$0.00** (Completely free for hobby releases) |
| **Server RAM / CPU** | 512 MB RAM, 0.1 vCPU shared |
| **Inactivity Sleep** | Web Service spins down after **15 minutes** of no incoming traffic |
| **Cold Start Duration** | Waking from sleep takes **~45 to 60 seconds** on the first request |
| **In-Memory Games** | Active games do **not** survive server sleep or restarts |
| **Keep-Alive Policy** | **No artificial keep-alive traffic** is implemented. The application adheres to Render's free tier terms |
| **Frontend Communication** | Crownfall detects cold starts and displays: `⏳ Server Waking Up (Render free tier cold start: ~50s)...` with a manual ping retry button |

---

## 3. Deployment Method A: Automated via Render Blueprint (`render.yaml`)

The repository includes a [render.yaml](file:///d:/Monopoly/render.yaml) blueprint specification for 1-click deployment.

### Steps:
1. Push your repository to your GitHub or GitLab account.
2. Sign in to your **[Render Dashboard](https://dashboard.render.com)**.
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your Crownfall repository.
5. Render will automatically detect `render.yaml` and configure:
   - `crownfall-server` (Docker Web Service, Plan: Free, Health check: `/api/health`)
   - `crownfall-web` (Static Site, Plan: Free, Publish: `dist`, Rewrite: `/*` -> `/index.html`)
6. Once `crownfall-server` finishes building, copy its assigned domain (e.g., `https://crownfall-server.onrender.com`).
7. In the Render Dashboard under `crownfall-web` > **Environment**, update `VITE_MULTIPLAYER_SERVER_URL` to match your server URL, and trigger a redeploy of the static site.

---

## 4. Deployment Method B: Manual Service Setup

If you prefer to configure each service manually in the Render dashboard:

### Step 1: Deploy the C++ Multiplayer Server (Web Service)

1. In the Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Fill in the service parameters:
   - **Name**: `crownfall-server`
   - **Region**: Any free tier region (e.g., *Oregon (US West)* or *Frankfurt (EU Central)*)
   - **Language / Runtime**: **Docker**
   - **Instance Type**: **Free**
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
4. Under **Advanced**:
   - **Health Check Path**: `/api/health`
5. Click **Create Web Service**.
6. Note the public URL provided by Render upon deployment:
   ```
   https://<your-server-name>.onrender.com
   ```

### Step 2: Deploy the Browser Frontend (Static Site)

1. In the Render Dashboard, click **New +** > **Static Site**.
2. Connect your Git repository.
3. Fill in the build settings:
   - **Name**: `crownfall-web`
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `pnpm install && pnpm build` (or `npm run build`)
   - **Publish Directory**: `dist`
4. Under **Environment Variables**, add:
   - **Key**: `VITE_MULTIPLAYER_SERVER_URL`
   - **Value**: `https://<your-server-name>.onrender.com` (use the URL from Step 1)
5. Under **Redirects/Rewrites**:
   - Click **Add Rule**
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
6. Click **Create Static Site**.

---

## 5. Verification & Health Checks

Once deployed, you can verify your deployment manually:

### 1. Backend Health Check
Open your browser or run curl against your server's health endpoint:
```bash
curl https://<your-server-name>.onrender.com/api/health
```
Expected response:
```json
{
  "ok": true,
  "status": "online",
  "platform": "render",
  "version": "1.0.0",
  "uptimeSeconds": 42,
  "memoryUsage": { ... },
  "activeConnections": 0,
  "roomsCount": 0,
  "connectedPlayers": 0,
  "engineBinary": "/app/bin/monopoly_engine",
  "engineAvailable": true
}
```

### 2. Cold Start Verification
When accessing the static website after the server has slept:
1. Open your static site URL: `https://<your-web-name>.onrender.com`.
2. Notice the network badge at the top: `⏳ WAKING UP (~50s)`.
3. Notice the amber notice banner informing users of Render's free tier spin-up.
4. Once Render initializes the container, the pill automatically transitions to: `🟢 ONLINE` / `🟢 SERVER ONLINE`.

### 3. Multiplayer Room Flow
1. Click **Create Game**. Choose a name and token color.
2. Share the generated room code (`CRN-XXXX`) with a second browser tab or mobile device.
3. In the second browser, click **Join Game**, enter the room code, and enter the lobby.
4. Verify that:
   - The host and joined player see each other in real time.
   - When the host clicks **START GAME**, both clients transition to the board.
   - Dice rolls, property purchases, mortgages, debt warnings, and chat events synchronize authoritatively.

---

## 6. Environment Variables Reference

| Variable Name | Target | Purpose | Example |
|---|---|---|---|
| `VITE_WS_URL` | Frontend (Build-time) | Direct Secure WebSocket endpoint | `wss://crownfall-server.onrender.com` |
| `VITE_MULTIPLAYER_SERVER_URL` | Frontend (Build-time) | Server base URL (supports `https://` or `wss://`) | `https://crownfall-server.onrender.com` |
| `PORT` | Backend (Runtime) | Port injected automatically by Render | `10000` |
| `HOST` | Backend (Runtime) | Network interface (must be `0.0.0.0` on Render) | `0.0.0.0` |
| `NODE_ENV` | Backend (Runtime) | Node environment | `production` |
| `MAX_CONNECTIONS` | Backend (Runtime) | Connection limit to safeguard 512MB RAM | `500` |
| `ENGINE_BIN_PATH` | Backend (Runtime) | Optional C++ binary location override | `/app/bin/monopoly_engine` |

---

## 7. Troubleshooting

### Issue: "Server Waking Up (~50s)" persists
- **Cause**: Render free tier services take ~45–60 seconds to spin up on cold start.
- **Fix**: Wait ~50 seconds and click the **Retry Check** / **Ping Server** button. Once the container is running, connections connect immediately.

### Issue: WebSocket fails to connect
- **Cause**: The frontend was built with an invalid `VITE_MULTIPLAYER_SERVER_URL` or HTTP/HTTPS mismatch.
- **Fix**: Ensure `VITE_MULTIPLAYER_SERVER_URL` is set to `https://<your-server-name>.onrender.com` in the Render Static Site environment variables, and trigger a **Manual Deploy > Clear build cache & deploy**.

### Issue: Room disappeared after closing tab for 20 minutes
- **Cause**: Under Render Free Tier, the backend service sleeps after 15 minutes of inactivity. Rooms are held in memory.
- **Fix**: This is expected behavior under free-tier constraints. Create a new room code to start a new match.
