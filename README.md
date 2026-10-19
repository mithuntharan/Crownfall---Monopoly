# Crownfall — Real-Time Multiplayer Business Board Game

A modern, high-performance web adaptation of the classic Indian business board game (Monopoly style), featuring an authoritative C++17 game engine, a Node.js WebSocket multiplayer server, and an interactive React 19 + Tailwind CSS v4 interface.

---

## 🌟 Key Features

### 🎲 Gameplay & Rules Engine
- **Authentic Indian Cities & Layout**: 28 properties across 8 color groups (Mumbai, Delhi, Kolkata, Chennai, Bangalore, Ahmedabad, Pune, etc.), 4 Railway Stations, and 2 Utilities (Electric Company, Water Works).
- **Authoritative Dual-Engine Architecture**:
  - **Native C++17 Engine** (`cpp/src/GameEngine.cpp`): High-speed, deterministic state machine handling dice rolls, movement invariants, rent calculations, mortgage rules, and bankruptcy liquidation.
  - **Browser TypeScript Engine** (`src/engine/LocalGameEngine.ts`): Fully compatible client-side engine supporting instant offline single-player and bot battles without requiring local compilation.
- **Houses & Hotels**: Build houses and hotels once a full color monopoly is owned, unlocking exponential rent yields.
- **Mortgage & Financial System**: Dynamic mortgage/unmortgage management with a 10% banking fee, automated debt resolution, and asset liquidation on bankruptcy.
- **Chance & Community Chest**: 32 unique event cards including dividend payouts, property repairs, school fees, and travel instructions.
- **Jail & Bail Mechanics**: Speeding penalties (3 consecutive doubles), landing on "Go to Jail", bail payments (₹500), Get Out of Jail Free cards, and doubles-escape logic.
- **Smart Bot AI**: Heuristic bots capable of property evaluations, strategic house upgrades, trade evaluations, and bail decision-making.

### 🌐 Real-Time Multiplayer
- **Room-Based Matchmaking**: Create private 4-character room codes or join existing games.
- **Host Controls & Configuration**: Configurable starting cash, turn timers, bot slots, and dev mode toggles.
- **Robust Turn Lifecycle**: Synchronized dice rolling, token step-by-step movement animations, decision prompts (Buy, Pass, Auction, Trade), and turn-ending handshakes across clients.
- **Resilient Networking**: Automatic reconnection, client ping/heartbeat monitoring, state sync, and spectator mode.
- **Interactive Quick Chat & Emotes**: In-game reactions and chat feed.

### 🎨 Visual & Audio Experience
- **Responsive Board**: Scaled SVG and flex grid board rendering with high-visibility token indicators.
- **Dynamic Token Movement**: Smooth hop animations that traverse the perimeter tile-by-tile.
- **Synthesized Web Audio**: Procedural sound effects using Web Audio API (dice rolls, cash payments, building placement, jail clinks, and bankruptcy horns) — no external audio assets required.
- **Detailed Modals**:
  - Property Deeds & Mortgage Manager
  - Financial Insights & Portfolio Breakdown
  - Full Transaction Ledger & Event Audit Log
  - Trade Proposal & Counter-offer Interface

---

## 🏗️ Architecture & Technology Stack

```
                          ┌─────────────────────────────┐
                          │   React 19 + Tailwind v4    │
                          │   (Vite Frontend Client)    │
                          └──────────────┬──────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         [Single Player / Offline]                 [Multiplayer Online]
      ┌─────────────────────────────┐           ┌─────────────────────────────┐
      │   TypeScript Game Engine    │           │  Node.js WebSocket Server   │
      │  (src/engine/LocalEngine)   │           │ (scripts/multiplayer_server)│
      └─────────────────────────────┘           └──────────────┬──────────────┘
                                                               │ (IPC / spawn)
                                                               ▼
                                                ┌─────────────────────────────┐
                                                │   Authoritative C++ Engine  │
                                                │   (bin/monopoly_engine)     │
                                                └─────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Vite 8
- **Backend / Networking**: Node.js, `ws` (WebSocket), HTTP REST endpoints
- **Native Core**: C++17 compiled via `g++` / `clang++` or CMake
- **Deployment**: Multi-stage Docker container (`Dockerfile`), Render Blueprint (`render.yaml`)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/) or `npm`
- *(Optional for C++ engine compilation)*: `g++` with C++17 support or `make`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/mithuntharan/Crownfall---Monopoly.git
cd Crownfall---Monopoly
npm install
```

### 2. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env.local
```

### 3. Run the Frontend Development Server
```bash
npm run dev
```
The app will open at `http://localhost:5173` (or port specified by Vite).

### 4. (Optional) Run the Multiplayer WebSocket Server
To play online multiplayer locally:
```bash
node scripts/multiplayer_server.cjs
```
The server will start listening on port `8444`. Point `VITE_WS_URL=ws://localhost:8444` in your `.env.local`.

---

## ⚙️ Building the Native C++ Engine

The repository includes pre-compiled binaries in `bin/` (`monopoly_engine.exe` for Windows). To rebuild from source:

### On Windows (MinGW / GCC)
```powershell
g++ -std=c++17 -O3 -Icpp/include cpp/src/BusinessData.cpp cpp/src/GameEngine.cpp cpp/src/main.cpp -o bin/monopoly_engine.exe
```

### On Linux / macOS
```bash
make
# or directly:
g++ -std=c++17 -O3 -Icpp/include cpp/src/BusinessData.cpp cpp/src/GameEngine.cpp cpp/src/main.cpp -o bin/monopoly_engine
```

---

## 🚢 Deployment (Render & Docker)

### 1-Click Render Deployment
The repository includes a ready-to-use `render.yaml` blueprint:
1. Push this repository to GitHub.
2. Link your GitHub account to [Render](https://render.com).
3. Create a **New Blueprint Instance** and select this repository.
4. Render will automatically set up:
   - A **Static Site** for the Vite React frontend.
   - A **Web Service** with the Docker build running the Node.js WebSocket server and compiled C++ engine.

### Docker Build
```bash
docker build -t crownfall-server .
docker run -p 10000:10000 crownfall-server
```

For full production deployment instructions, refer to [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🧪 Running Automated Tests

Run the backend and turn invariant test suite:
```bash
node scripts/test_engine_cases.cjs
node scripts/test_human_vs_bot_turn.cjs
node scripts/test_critical_fixes_phase2.cjs
```

---

## 📁 Repository Structure

```
.
├── cpp/                     # C++17 Authoritative Game Engine
│   ├── include/             # Header files (GameEngine.h, BusinessData.h, Types.h)
│   └── src/                 # Implementation files
├── bin/                     # Native engine executable output
├── scripts/                 # Multiplayer server, engine bridge & test suites
│   ├── multiplayer_server.cjs  # Production Node.js WebSocket & HTTP server
│   ├── engine_bridge.cjs    # Child process IPC adapter for C++ engine
│   └── test_*.cjs           # Automated gameplay and network tests
├── src/                     # React 19 Frontend Application
│   ├── components/          # UI components (Board, Modals, Drawers, Chat)
│   ├── config/              # Game configuration & rules constants
│   ├── data/                # Property board definitions & cards data
│   ├── engine/              # TypeScript local engine & multiplayer adapters
│   ├── theme/               # Board styling & color palettes
│   └── utils/               # Audio synthesis & coordinate calculations
├── Dockerfile               # Multi-stage production container build
├── render.yaml              # Render blueprint specification
└── package.json             # Frontend dependencies and scripts
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
