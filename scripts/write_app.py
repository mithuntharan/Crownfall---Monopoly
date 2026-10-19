"""Write the full App.tsx for Crownfall."""
import os

APP_CONTENT = r'''import { useEffect, useRef, useState } from "react";
import {
  BOARD_SPACES,
  CITY_PROPERTIES,
  SPECIAL_PROPERTIES,
  COLOR_GROUPS,
  CHANCE_DECLARATIONS,
  CHEST_DECLARATIONS,
  getCityProperty,
  getSpecialProperty,
  getAnyProperty,
  type PropertyDefinition,
  type SpecialPropertyDefinition,
  type ColorGroup,
  type BoardSpaceDefinition,
} from "./data/businessData";
import { getColorGroupTheme, getPropertyThemeStyle, ROYAL_COLOR_THEMES } from "./theme/colors";
import { defaultEngine } from "./engine/EngineManager";
import type { EnginePlayer, TurnResult, GameState } from "./engine/GameEngineInterface";

type Screen = "menu" | "create" | "join" | "lobby" | "game" | "assets" | "settings" | "gameover";
type Modal = null | "property" | "buy" | "build" | "sell" | "mortgage" | "unmortgage" | "chance" | "chest" | "jail" | "rest" | "players" | "tax";

// Authoritative player data: money starts at Rs0 per Rule 5 (awarded after first rotation).
const defaultPlayerConfigs: EnginePlayer[] = [
  { id: 0, name: "You",   money: 0, color: "saffron", token: "C", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
  { id: 1, name: "Kavya", money: 0, color: "teal",    token: "L", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
  { id: 2, name: "Arjun", money: 0, color: "plum",    token: "T", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
  { id: 3, name: "Meera", money: 0, color: "blue",    token: "S", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
  { id: 4, name: "Dev",   money: 0, color: "gold",    token: "D", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
  { id: 5, name: "Tara",  money: 0, color: "purple",  token: "R", position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, ownedProperties: [], buildings: {}, mortgages: {} },
];
const initialPlayers: EnginePlayer[] = defaultPlayerConfigs.slice(0, 4);

/**
 * EXACT 36-Space Perimeter Board Coordinates (Clockwise)
 * Corner 0=Start(BR), 9=Jail(BL), 18=Club(TL), 27=RestHouse(TR)
 */
const BOARD_POSITIONS: Record<number, { row: number; col: number }> = {
  0:  { row: 10, col: 10 }, 1:  { row: 10, col: 9 },  2:  { row: 10, col: 8 },
  3:  { row: 10, col: 7 },  4:  { row: 10, col: 6 },  5:  { row: 10, col: 5 },
  6:  { row: 10, col: 4 },  7:  { row: 10, col: 3 },  8:  { row: 10, col: 2 },
  9:  { row: 10, col: 1 },  10: { row: 9, col: 1 },   11: { row: 8, col: 1 },
  12: { row: 7, col: 1 },   13: { row: 6, col: 1 },   14: { row: 5, col: 1 },
  15: { row: 4, col: 1 },   16: { row: 3, col: 1 },   17: { row: 2, col: 1 },
  18: { row: 1, col: 1 },   19: { row: 1, col: 2 },   20: { row: 1, col: 3 },
  21: { row: 1, col: 4 },   22: { row: 1, col: 5 },   23: { row: 1, col: 6 },
  24: { row: 1, col: 7 },   25: { row: 1, col: 8 },   26: { row: 1, col: 9 },
  27: { row: 1, col: 10 },  28: { row: 2, col: 10 },  29: { row: 3, col: 10 },
  30: { row: 4, col: 10 },  31: { row: 5, col: 10 },  32: { row: 6, col: 10 },
  33: { row: 7, col: 10 },  34: { row: 8, col: 10 },  35: { row: 9, col: 10 },
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow:     <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    dice:      <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="16" cy="16" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
    users:     <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    gear:      <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9c.13.61.66 1.05 1.55 1H21v4h-.08c-.89-.05-1.42.39-1.55 1Z" /></>,
    close:     <><path d="m6 6 12 12M18 6 6 18" /></>,
    chevron:   <><path d="m9 18 6-6-6-6" /></>,
    signal:    <><path d="M5 12.55a11 11 0 0 1 14.08 0M8.5 16a6 6 0 0 1 7 0M12 20h.01" /></>,
    crown:     <><path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z" /></>,
    home:      <><path d="m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Button({
  children, variant = "primary", icon, disabled, onClick, className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled} onClick={onClick}>
      {children}
      {icon && <Icon name={icon} size={18} />}
    </button>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? "logo-compact" : ""}`}>
      <span className="logo-crest"><Icon name="crown" size={compact ? 12 : 22} /></span>
      <span className="logo-rule" />
      <strong>CROWNFALL</strong>
      <small>.IO ONLINE</small>
    </div>
  );
}

function Token({ player, active = false }: { player: EnginePlayer; active?: boolean }) {
  return (
    <div className={`token token-${player.color} ${active ? "token-active" : ""}`} title={player.name}>
      {player.token}
    </div>
  );
}

function AppHeader({
  title, back, isCppConnected = false,
}: {
  title?: string;
  back?: () => void;
  isCppConnected?: boolean;
}) {
  return (
    <header className="app-header">
      {back ? (
        <button className="icon-button" onClick={back} aria-label="Go back">←</button>
      ) : (
        <Logo compact />
      )}
      {title && <div className="header-title">{title}<small>CROWNFALL</small></div>}
      <div
        className={`engine-badge ${isCppConnected ? "cpp" : "local"}`}
        title={isCppConnected ? "C++ Native Engine Authoritative" : "Local Engine Active"}
      >
        <span className="engine-dot" />
        <span>{isCppConnected ? "C++ ENGINE" : "LOCAL"}</span>
      </div>
    </header>
  );
}

// ─── MENU ────────────────────────────────────────────────────────────────────

function MenuScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="menu-screen">
      <div className="menu-ornament ornament-one" />
      <div className="menu-ornament ornament-two" />
      <section className="menu-hero">
        <div className="edition-seal">EST.<br />INDIA</div>
        <Logo />
        <p>Build your empire.<br />Rule the board.</p>
      </section>
      <section className="menu-actions">
        <Button onClick={() => navigate("create")} icon="arrow">PLAY / CREATE GAME</Button>
        <Button variant="secondary" onClick={() => navigate("join")}>JOIN GAME</Button>
        <div className="menu-links">
          <button onClick={() => navigate("settings")}><Icon name="gear" /> SETTINGS</button>
          <button><span className="question-icon">?</span> HOW TO PLAY</button>
        </div>
      </section>
      <footer className="menu-footer">
        <span>v1.0</span>
        <span className="safe-copy">A MODERN INDIAN CLASSIC</span>
      </footer>
    </main>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────

function SettingRow({ label, value, control }: { label: string; value: string; control: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div><strong>{label}</strong><small>{value}</small></div>
      {control}
    </div>
  );
}

function Toggle() {
  const [on, setOn] = useState(true);
  return (
    <button className={`toggle ${on ? "on" : ""}`} onClick={() => setOn(!on)} aria-label="Toggle setting">
      <span />
    </button>
  );
}

function SetupScreen({
  type, navigate,
  playerCount, setPlayerCount,
  startingMoney, setStartingMoney,
  doublesRule, setDoublesRule,
  playerNames, onUpdatePlayerName,
}: {
  type: "create" | "join";
  navigate: (screen: Screen) => void;
  playerCount: number;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  startingMoney: number;
  setStartingMoney: React.Dispatch<React.SetStateAction<number>>;
  doublesRule: boolean;
  setDoublesRule: React.Dispatch<React.SetStateAction<boolean>>;
  playerNames: string[];
  onUpdatePlayerName: (id: number, name: string) => void;
}) {
  const create = type === "create";
  const cycleStartingMoney = () => {
    if (startingMoney === 20000) setStartingMoney(25000);
    else if (startingMoney === 25000) setStartingMoney(30000);
    else setStartingMoney(20000);
  };

  return (
    <main className="paper-screen">
      <AppHeader title={create ? "CREATE GAME" : "JOIN GAME"} back={() => navigate("menu")} />
      <div className="screen-content">
        <div className="intro-mark">
          {create ? <Icon name="crown" size={28} /> : <Icon name="users" size={28} />}
        </div>
        <div className="section-heading">
          <span>{create ? "HOST A TABLE" : "ENTER A TABLE"}</span>
          <p>{create ? "Set the pace for your next empire." : "Enter the room code shared by your host."}</p>
        </div>
        {!create && (
          <label className="field">
            <span>ROOM CODE</span>
            <input defaultValue="DMN-" placeholder="DMN-4821" />
            <small>Codes are 8 characters</small>
          </label>
        )}
        {create && (
          <div className="settings-card">
            <SettingRow
              label="PLAYERS"
              value={`${playerCount} Players`}
              control={
                <div className="stepper">
                  <button onClick={() => setPlayerCount(Math.max(2, playerCount - 1))} aria-label="Decrease">−</button>
                  <b>{playerCount}</b>
                  <button onClick={() => setPlayerCount(Math.min(6, playerCount + 1))} aria-label="Increase">+</button>
                </div>
              }
            />
            <SettingRow
              label="YOUR NAME"
              value="Shown on your token"
              control={
                <input
                  type="text"
                  value={playerNames[0]}
                  maxLength={20}
                  onChange={(e) => onUpdatePlayerName(0, e.target.value)}
                  style={{
                    height: "32px", borderRadius: "8px", border: "1px solid var(--gold)",
                    padding: "0 10px", fontSize: "13px", fontWeight: 700,
                    background: "var(--surface)", color: "var(--ink)", width: "130px",
                  }}
                />
              }
            />
            <SettingRow
              label="STARTING MONEY"
              value={`Rs${startingMoney.toLocaleString()} (Awarded on 1st rotation)`}
              control={
                <button className="select-like" onClick={cycleStartingMoney} title="Click to cycle">
                  Rs{startingMoney.toLocaleString()} &#x27F3;
                </button>
              }
            />
            <SettingRow
              label="DOUBLES RULE"
              value={doublesRule ? "Classic (Extra turn · 3 to Jail)" : "Single Roll (No doubles)"}
              control={
                <button
                  className={`toggle ${doublesRule ? "on" : ""}`}
                  onClick={() => setDoublesRule(!doublesRule)}
                  aria-label="Toggle doubles rule"
                >
                  <span />
                </button>
              }
            />
            <SettingRow label="TURN TIMEOUT" value="90 sec" control={<button className="select-like">90 sec</button>} />
          </div>
        )}
        <div className="setup-note">
          <Icon name="signal" />
          <div>
            <strong>PRIVATE &amp; SECURE</strong>
            <span>Only players with the room code can join.</span>
          </div>
        </div>
      </div>
      <div className="sticky-action">
        <Button onClick={() => navigate("lobby")} icon="arrow">
          {create ? "CREATE ROOM" : "JOIN ROOM"}
        </Button>
      </div>
    </main>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function LobbyScreen({
  navigate, rematch = false, players, onUpdatePlayerName, onStartGame,
}: {
  navigate: (screen: Screen) => void;
  rematch?: boolean;
  players: EnginePlayer[];
  onUpdatePlayerName: (id: number, name: string) => void;
  onStartGame: () => void;
}) {
  return (
    <main className="paper-screen">
      <AppHeader title={rematch ? "REMATCH LOBBY" : "GAME LOBBY"} back={() => navigate(rematch ? "gameover" : "menu")} />
      <div className="screen-content lobby-content">
        <div className="room-code">
          <div><small>ROOM CODE</small><strong>DMN-4821</strong></div>
          <button>COPY</button>
        </div>
        <div className="lobby-meta">
          <span><i className="status-dot" /> {players.length} OF {players.length} CONNECTED</span>
          <span>YOU ARE HOST</span>
        </div>
        <div className="lobby-list">
          {players.map((player, index) => (
            <div className="lobby-player" key={player.id}>
              <Token player={player} active={index === 0} />
              <div className="lobby-name">
                {index === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{ fontSize: "9px", color: "var(--ink-soft)", fontWeight: 700, letterSpacing: "0.1em" }}>
                      YOUR PLAYER NAME
                    </label>
                    <input
                      type="text"
                      value={player.name}
                      maxLength={20}
                      onChange={(e) => onUpdatePlayerName(0, e.target.value)}
                      style={{
                        height: "32px", borderRadius: "8px", border: "1px solid var(--gold)",
                        padding: "0 10px", fontSize: "13px", fontWeight: 700,
                        background: "var(--surface)", color: "var(--ink)",
                      }}
                    />
                  </div>
                ) : (
                  <strong>{player.name}</strong>
                )}
                <small>
                  {index === 0
                    ? "Saffron Crown (HOST)"
                    : ["Teal Lamp", "Plum Turret", "Blue Ship", "Gold Diamond", "Purple Ring"][index - 1] || "Player"}
                </small>
              </div>
              <span className="ready-pill">READY</span>
            </div>
          ))}
        </div>
        <div className="lobby-tip">
          <span>HOST NOTE</span>
          Local GameEngine active. C++ integration ready.
        </div>
      </div>
      <div className="sticky-action dual">
        <Button variant="secondary">INVITE</Button>
        <Button onClick={onStartGame} icon="arrow">START GAME</Button>
      </div>
    </main>
  );
}

// ─── BOARD ────────────────────────────────────────────────────────────────────

function Board({
  onSelectSpace, playerPositions, players = initialPlayers,
}: {
  onSelectSpace: (space: BoardSpaceDefinition) => void;
  playerPositions: number[];
  players?: EnginePlayer[];
}) {
  return (
    <div className="board-shell">
      <div className="board-grid">
        <div className="board-center">
          <span className="map-line map-line-one" />
          <span className="map-line map-line-two" />
          <div className="board-compass">N</div>
          <div className="board-center-logo"><Logo compact /><small>THE EMPIRE AWAITS</small></div>
          <div className="board-route" />
        </div>
        {BOARD_SPACES.map((space) => {
          const pos = BOARD_POSITIONS[space.index];
          const isCity = space.type === "city";
          const isSpecial = space.type === "special";
          const cityData = isCity && space.propertyId ? CITY_PROPERTIES[space.propertyId] : null;
          const specialData = isSpecial && space.propertyId ? SPECIAL_PROPERTIES[space.propertyId] : null;
          const price = cityData?.purchasePrice || specialData?.purchasePrice;
          const spaceClass =
            space.type === "corner" ? "space-corner" :
            space.type === "chance" ? "space-chance" :
            space.type === "chest"  ? "space-chest"  :
            space.type === "tax"    ? "space-tax"    :
            space.type === "special"? "space-special" :
            `space-${space.colorGroup.toLowerCase()}`;
          const playersOnSpace = playerPositions
            .map((pIndex, idx) => (pIndex === space.index ? players[idx] : null))
            .filter(Boolean) as EnginePlayer[];
          const propertyOwner = space.propertyId
            ? players.find((p) => p.ownedProperties.includes(space.propertyId!))
            : null;
          const isMortgaged = space.propertyId && propertyOwner ? !!propertyOwner.mortgages[space.propertyId] : false;
          const buildingCount = space.propertyId && propertyOwner ? propertyOwner.buildings[space.propertyId] || 0 : 0;

          return (
            <button
              key={space.index}
              className={`board-space ${spaceClass} side-${space.side}`}
              style={{
                gridRow: pos.row,
                gridColumn: pos.col,
                ...(space.colorGroup !== "NONE" ? getPropertyThemeStyle(space.colorGroup) : {}),
              }}
              onClick={() => onSelectSpace(space)}
              aria-label={`${space.name} (Index ${space.index})`}
            >
              <span className="space-band" />
              <div className="board-space-content">
                <b>{space.name}</b>
                {price && <small>Rs{price.toLocaleString()}</small>}
                {space.type === "tax" && <small>Rs500</small>}
              </div>
              {isMortgaged && <span className="tile-mortgage-badge" title="Mortgaged">MORTGAGED</span>}
              {buildingCount > 0 && (
                <span className={`tile-buildings-badge ${buildingCount >= 4 ? "hotel" : ""}`}>
                  {buildingCount >= 4 ? "HOTEL" : `${buildingCount}H`}
                </span>
              )}
              {playersOnSpace.length > 0 && (
                <div className="space-tokens">
                  {playersOnSpace.map((p) => (
                    <Token key={p.id} player={p} active={p.id === 0} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PLAYER STRIP ─────────────────────────────────────────────────────────────

function PlayerStrip({
  players, openPlayers, activePlayerIndex, playerPositions,
}: {
  players: EnginePlayer[];
  openPlayers: () => void;
  activePlayerIndex: number;
  playerPositions: number[];
}) {
  const activeP = players[activePlayerIndex] || players[0];
  const activePos = playerPositions[activePlayerIndex] || 0;
  const currentSpace = BOARD_SPACES[activePos];

  return (
    <section className="player-strip">
      <div className="active-player">
        <Token player={activeP} active />
        <div>
          <small>AT {currentSpace.name} (#{activePos})</small>
          <strong>Rs{activeP.money.toLocaleString()}</strong>
        </div>
      </div>
      <div className="other-players">
        {players.filter((_, idx) => idx !== activePlayerIndex).map((player) => (
          <div className="mini-player" key={player.id}>
            <Token player={player} />
            <span>{player.name}</span>
          </div>
        ))}
      </div>
      <button className="players-more" onClick={openPlayers}>
        <Icon name="users" size={18} /><span>{players.length}</span>
      </button>
    </section>
  );
}

// ─── DICE ─────────────────────────────────────────────────────────────────────

function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, number[]> = {
    1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
  };
  return (
    <div className={`die ${rolling ? "rolling" : ""}`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
        <i key={p} className={dots[value]?.includes(p) ? "show" : ""} />
      ))}
    </div>
  );
}

function DeclarationDice({ total }: { total: number }) {
  const first = Math.max(1, total - 6);
  const second = total - first;
  return (
    <div className="declaration-dice">
      <div className="dice-row">
        <Dice value={first} rolling={false} />
        <Dice value={second} rolling={false} />
      </div>
      <span>DICE RESULT <b>{total}</b></span>
    </div>
  );
}

// ─── PROPERTY CARD ────────────────────────────────────────────────────────────

function PropertyVisual({
  property, owned = false, isMortgaged = false,
}: {
  property?: PropertyDefinition | SpecialPropertyDefinition | null;
  owned?: boolean;
  isMortgaged?: boolean;
}) {
  const prop = property || CITY_PROPERTIES.margoa;
  const isCity = "colorGroup" in prop && prop.colorGroup !== "NONE";
  const city = isCity ? (prop as PropertyDefinition) : null;
  const special = !isCity ? (prop as SpecialPropertyDefinition) : null;
  const colorGroup = city ? city.colorGroup : "NONE";
  const theme = getColorGroupTheme(colorGroup);

  return (
    <div className="property-card" data-group={colorGroup} style={getPropertyThemeStyle(colorGroup)}>
      <div className="property-head">
        <small>{isCity ? "TITLE DEED · CITY PROPERTY" : "SPECIAL INFRASTRUCTURE"}</small>
        <strong>{prop.name.toUpperCase()}</strong>
        <span>{theme.label}</span>
      </div>
      <div className="property-price">
        <small>PURCHASE PRICE</small>
        <strong>Rs{prop.purchasePrice.toLocaleString()}</strong>
        {isMortgaged ? (
          <span className="owner-badge" style={{ background: "#601424", color: "#f8e5b6" }}>MORTGAGED</span>
        ) : (
          owned && <span className="owner-badge">OWNED BY YOU</span>
        )}
      </div>
      {city && (
        <>
          <div className="rent-table">
            <div><span>RENT (BASE)</span><b>Rs{city.baseRent.toLocaleString()}</b></div>
            <div><span>WITH 1 HOUSE</span><b>Rs{city.rentOneHouse.toLocaleString()}</b></div>
            <div><span>WITH 2 HOUSES</span><b>Rs{city.rentTwoHouses.toLocaleString()}</b></div>
            <div><span>WITH 3 HOUSES</span><b>Rs{city.rentThreeHouses.toLocaleString()}</b></div>
            <div><span>WITH HOTEL</span><b>Rs{city.hotelRent.toLocaleString()}</b></div>
          </div>
          <div className="group-rule-note" style={{
            fontSize: "8.5px", textAlign: "center", padding: "6px 12px",
            background: theme.tintBg, color: theme.tintText,
            borderTop: "1px solid rgba(200, 155, 69, 0.3)", fontFamily: "Oswald", letterSpacing: "0.04em",
          }}>
            &#x2736; Base rent is doubled if you own all 5 properties in {theme.label}
          </div>
          <div className="property-foot">
            <span>BUILD COST <b>Rs{city.buildingCost.toLocaleString()}</b></span>
            <span>MORTGAGE <b>Rs{city.mortgageValue.toLocaleString()}</b></span>
          </div>
        </>
      )}
      {special && (
        <>
          <div className="rent-table">
            <div><span>RENT ALONE</span><b>{special.rentAlone}</b></div>
            <div><span>RENT WITH PAIR</span><b>{special.rentWithPair}</b></div>
            <div><span>PAIR RELATIONSHIP</span><b>{special.pair}</b></div>
          </div>
          <div className="property-foot">
            <span>MORTGAGE VALUE <b>Rs{special.mortgageValue.toLocaleString()}</b></span>
          </div>
        </>
      )}
      <div className="property-card-edition">
        <strong>CROWNFALL</strong>
        <small>.IO ONLINE</small>
      </div>
    </div>
  );
}

// ─── MODAL SHELL ──────────────────────────────────────────────────────────────

function ModalShell({
  children, title, close, className = "",
}: {
  children: React.ReactNode;
  title?: string;
  close: () => void;
  className?: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section className={`modal-sheet ${className}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="modal-header">
            <strong>{title}</strong>
            <button onClick={close} aria-label="Close"><Icon name="close" /></button>
          </div>
        )}
        {children}
      </section>
    </div>
  );
}

// ─── GAME MODAL ───────────────────────────────────────────────────────────────

function GameModal({
  type, close, setModal, navigate, selectedProperty, taxSpaceName,
  players = initialPlayers, activePlayerIndex = 0,
  setPlayers, onShowToast, onBuyResolved,
}: {
  type: Exclude<Modal, null>;
  close: () => void;
  setModal: (m: Modal) => void;
  navigate: (s: Screen) => void;
  selectedProperty: PropertyDefinition | SpecialPropertyDefinition;
  taxSpaceName?: string;
  players?: EnginePlayer[];
  activePlayerIndex?: number;
  setPlayers?: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  onShowToast?: (msg: string) => void;
  onBuyResolved?: () => void;
}) {
  const [eventDice, setEventDice] = useState(type === "chance" ? 3 : 2);

  // ── PLAYERS OVERVIEW ──
  if (type === "players") {
    return (
      <ModalShell close={close}>
        <div className="po-header">
          <div className="po-title-row">
            <span className="po-crown">&#x1F451;</span>
            <strong>ALL PLAYERS</strong>
            <small>{players.length} IN GAME</small>
          </div>
          <div className="po-turn-callout">
            <span className="po-turn-label">CURRENT TURN</span>
            <div className="po-turn-player">
              <Token player={players[activePlayerIndex]} active />
              <strong>{players[activePlayerIndex]?.name}</strong>
            </div>
          </div>
        </div>
        <div className="po-list">
          {players.map((p, i) => {
            const isActive = i === activePlayerIndex;
            const isLocalYou = i === 0;
            const cityCount = p.ownedProperties.filter((id) => id in CITY_PROPERTIES).length;
            const specialCount = p.ownedProperties.filter((id) => id in SPECIAL_PROPERTIES).length;
            const totalProps = cityCount + specialCount;
            return (
              <div key={p.id} className={`po-row${isActive ? " po-row--active" : ""}${isLocalYou ? " po-row--you" : ""}`}>
                <div className="po-token-col">
                  <Token player={p} active={isActive} />
                  {isActive && <span className="po-active-dot" aria-hidden="true" />}
                </div>
                <div className="po-info">
                  <div className="po-name-line">
                    <strong className="po-name">{p.name}</strong>
                    {isLocalYou && <span className="po-badge po-badge--you">YOU</span>}
                    {isActive && <span className="po-badge po-badge--turn">TURN</span>}
                  </div>
                  <div className="po-money">Rs{p.money.toLocaleString()}</div>
                  <div className="po-stats">
                    <span>{cityCount} city</span>
                    <span className="po-dot">·</span>
                    <span>{specialCount} special</span>
                    {totalProps === 0 && <span className="po-none">· no properties yet</span>}
                  </div>
                </div>
                <div className="po-status-col">
                  <span className={`po-status-pill ${isActive ? "po-pill--active" : "po-pill--wait"}`}>
                    {isActive ? "ROLLING" : "WAIT"}
                  </span>
                  <span className="po-conn po-conn--connected" title="connected">&#x25CF;</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="po-footer">
          <span>&#x25CF; Connected</span>
          <span>&#x25CC; Reconnecting</span>
          <span>&#x25CB; Offline</span>
        </div>
      </ModalShell>
    );
  }

  // ── CHANCE / CHEST ──
  if (type === "chance" || type === "chest") {
    const declarations = type === "chance" ? CHANCE_DECLARATIONS : CHEST_DECLARATIONS;
    const declaration = declarations.find((item) => item.diceSum === eventDice) ?? declarations[0];
    return (
      <ModalShell close={close} className={`event-modal ${type}`}>
        <div className="event-kicker">{type === "chance" ? "CHANCE" : "COMMUNITY CHEST"}</div>
        <DeclarationDice total={declaration.diceSum} />
        <div className="dice-declaration-picker" aria-label="Preview dice declarations">
          {declarations.map((item) => (
            <button
              key={item.diceSum}
              className={item.diceSum === declaration.diceSum ? "active" : ""}
              onClick={() => setEventDice(item.diceSum)}
            >
              {item.diceSum}
            </button>
          ))}
        </div>
        <small className="declaration-parity">{declaration.section.toUpperCase()} DECLARATION</small>
        <strong className="event-title">{declaration.title}</strong>
        <p>{declaration.declaration}</p>
        <div className={`event-result ${type} result-${declaration.kind}`}>
          <span>{declaration.effect}</span>
          <small>{declaration.effectNote}</small>
        </div>
        <Button onClick={close}>CONTINUE</Button>
      </ModalShell>
    );
  }

  // ── JAIL / REST ──
  if (type === "jail" || type === "rest") {
    return (
      <ModalShell close={close} className="state-modal">
        <div className="state-icon">{type === "jail" ? "III" : "RH"}</div>
        <small className="eyebrow">{type === "jail" ? "SPECIAL STATE" : "SAFE HAVEN"}</small>
        <strong className="event-title">{type === "jail" ? "SENT TO JAIL" : "REST HOUSE"}</strong>
        <p>
          {type === "jail"
            ? "Your token is in Jail. Roll doubles on your next turn or serve 3 turns to be released."
            : "Take a breath. Your turn ends safely here and you miss your next move."}
        </p>
        <div className="meaning-box">
          <span>WHAT HAPPENS NEXT</span>
          <b>{type === "jail" ? "Roll doubles to escape, or wait 3 turns." : "Play continues with the next player."}</b>
        </div>
        <Button onClick={close}>{type === "jail" ? "UNDERSTOOD" : "END TURN"}</Button>
      </ModalShell>
    );
  }

  // ── TAX ──
  if (type === "tax") {
    return (
      <ModalShell close={close} className="state-modal">
        <div className="state-icon">Rs</div>
        <small className="eyebrow">GOVERNMENT LEVY</small>
        <strong className="event-title">{taxSpaceName || "TAX ASSESSMENT"}</strong>
        <p>You landed on a government assessment space. Rs500 has been deducted from your account.</p>
        <div className="meaning-box">
          <span>TAX PAID</span>
          <b>Rs500 · Deducted from player cash</b>
        </div>
        <Button onClick={close}>CONTINUE</Button>
      </ModalShell>
    );
  }

  // ── BUILD ──
  if (type === "build") {
    const isCity = "buildingCost" in selectedProperty;
    const city = isCity ? (selectedProperty as PropertyDefinition) : null;
    const buildCost = city?.buildingCost || 5000;
    const activePlayer = players[activePlayerIndex];
    const userMoney = activePlayer.money;
    const balanceAfter = userMoney - buildCost;
    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0;
    const currentRent = city
      ? (currentBuildings === 0 ? city.baseRent : currentBuildings === 1 ? city.rentOneHouse : currentBuildings === 2 ? city.rentTwoHouses : currentBuildings === 3 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const nextRent = city
      ? (currentBuildings === 0 ? city.rentOneHouse : currentBuildings === 1 ? city.rentTwoHouses : currentBuildings === 2 ? city.rentThreeHouses : city.hotelRent)
      : 0;
    const groupTheme = getColorGroupTheme(city?.colorGroup);

    const handleConfirmBuild = async () => {
      if (!isCity || !city || userMoney < buildCost || currentBuildings >= 4) return;
      const res = await defaultEngine.buildHouseOrHotel(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`BUILT ON ${city.name.toUpperCase()} · -Rs${buildCost.toLocaleString()}`);
      }
      close();
    };

    return (
      <ModalShell title="BUILD ON PROPERTY" close={close}>
        <div className="build-property" style={{ borderLeft: `4px solid ${groupTheme.accent}` }}>
          <div className="tiny-building" style={{ background: groupTheme.accent }}>
            {currentBuildings >= 3 ? "H" : "&#x1F3E0;"}
          </div>
          <span>
            <small>{selectedProperty.name.toUpperCase()} · {groupTheme.label}</small>
            <strong>{currentBuildings >= 3 ? "Upgrade to Hotel" : `Add House #${currentBuildings + 1}`}</strong>
          </span>
        </div>
        <div className="rent-change">
          <div><small>CURRENT RENT</small><b>Rs{currentRent.toLocaleString()}</b></div>
          <Icon name="arrow" />
          <div><small>UPGRADED RENT</small><b style={{ color: groupTheme.accent }}>Rs{nextRent.toLocaleString()}</b></div>
        </div>
        <div className="balance-check">
          <span>BUILDING COST</span><b>Rs{buildCost.toLocaleString()}</b>
          <span>BALANCE AFTER</span><b>Rs{balanceAfter.toLocaleString()}</b>
        </div>
        <Button
          onClick={handleConfirmBuild}
          disabled={userMoney < buildCost || currentBuildings >= 4 || !!activePlayer.mortgages[selectedProperty.id]}
        >
          {currentBuildings >= 4
            ? "MAX BUILDINGS REACHED"
            : userMoney < buildCost
            ? "INSUFFICIENT FUNDS"
            : `CONFIRM BUILD · Rs${buildCost.toLocaleString()}`}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }

  // ── SELL ──
  if (type === "sell") {
    const isCity = "buildingCost" in selectedProperty;
    const city = isCity ? (selectedProperty as PropertyDefinition) : null;
    const buildCost = city?.buildingCost || 0;
    const rawRefund = Math.floor((buildCost * 50) / 100);
    const refund = Math.ceil(rawRefund / 100) * 100;
    const activePlayer = players[activePlayerIndex];
    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0;
    const isHotel = currentBuildings >= 4;
    const projectedBalance = activePlayer.money + refund;

    const handleConfirmSell = async () => {
      if (!isCity || !city || currentBuildings <= 0) return;
      const res = await defaultEngine.sellHouseOrHotel(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`SOLD ${isHotel ? "HOTEL" : "HOUSE"} ON ${city.name.toUpperCase()} · +Rs${refund.toLocaleString()}`);
      }
      close();
    };

    return (
      <ModalShell title="SELL BUILDING" close={close}>
        <div className="build-property" style={{ borderLeft: "4px solid var(--burgundy)" }}>
          <div className="tiny-building" style={{ background: "var(--burgundy)" }}>
            {isHotel ? "H" : "&#x1F3E0;"}
          </div>
          <span>
            <small>{selectedProperty.name.toUpperCase()}</small>
            <strong>{isHotel ? "Sell Hotel to Bank" : "Sell 1 House to Bank"}</strong>
          </span>
        </div>
        <div className="rent-change">
          <div><small>ORIGINAL COST</small><b>Rs{buildCost.toLocaleString()}</b></div>
          <Icon name="arrow" />
          <div><small>REFUND (50%)</small><b style={{ color: "var(--gold)" }}>Rs{refund.toLocaleString()}</b></div>
        </div>
        <div className="balance-check">
          <span>CURRENT CASH</span><b>Rs{activePlayer.money.toLocaleString()}</b>
          <span>CASH AFTER SALE</span><b style={{ color: "var(--green)" }}>Rs{projectedBalance.toLocaleString()}</b>
        </div>
        <Button onClick={handleConfirmSell} disabled={currentBuildings <= 0}>
          CONFIRM SALE · RECEIVE Rs{refund.toLocaleString()}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }

  // ── MORTGAGE ──
  if (type === "mortgage") {
    const activePlayer = players[activePlayerIndex];
    const mortgageVal = selectedProperty.mortgageValue;
    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0;
    const hasBuildings = currentBuildings > 0;
    const projectedBalance = activePlayer.money + mortgageVal;

    const handleConfirmMortgage = async () => {
      if (hasBuildings || activePlayer.mortgages[selectedProperty.id]) return;
      const res = await defaultEngine.mortgageProperty(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`MORTGAGED ${selectedProperty.name.toUpperCase()} · +Rs${mortgageVal.toLocaleString()}`);
      }
      close();
    };

    return (
      <ModalShell title="MORTGAGE PROPERTY" close={close}>
        <PropertyVisual property={selectedProperty} owned />
        {hasBuildings && (
          <div className="lobby-tip" style={{ borderLeftColor: "var(--red)", marginTop: "10px" }}>
            <span>RESTRICTION</span>Must sell all buildings before mortgaging.
          </div>
        )}
        <div className="balance-check" style={{ marginTop: "10px" }}>
          <span>MORTGAGE CASH VALUE</span><b style={{ color: "var(--gold)" }}>Rs{mortgageVal.toLocaleString()}</b>
          <span>CASH AFTER MORTGAGE</span><b style={{ color: "var(--green)" }}>Rs{projectedBalance.toLocaleString()}</b>
        </div>
        <Button onClick={handleConfirmMortgage} disabled={hasBuildings || !!activePlayer.mortgages[selectedProperty.id]}>
          {hasBuildings ? "SELL BUILDINGS FIRST" : `CONFIRM MORTGAGE · RECEIVE Rs${mortgageVal.toLocaleString()}`}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }

  // ── UNMORTGAGE ──
  if (type === "unmortgage") {
    const activePlayer = players[activePlayerIndex];
    const mortgageVal = selectedProperty.mortgageValue;
    const interest = Math.floor((mortgageVal * 10) / 100);
    const totalRepayment = Math.ceil((mortgageVal + interest) / 100) * 100;
    const canAfford = activePlayer.money >= totalRepayment;
    const projectedBalance = activePlayer.money - totalRepayment;

    const handleConfirmUnmortgage = async () => {
      if (!canAfford || !activePlayer.mortgages[selectedProperty.id]) return;
      const res = await defaultEngine.unmortgageProperty(activePlayerIndex, selectedProperty.id);
      if (res.success && setPlayers) {
        setPlayers(res.state.players);
        if (onShowToast) onShowToast(`UNMORTGAGED ${selectedProperty.name.toUpperCase()} · -Rs${totalRepayment.toLocaleString()}`);
      }
      close();
    };

    return (
      <ModalShell title="UNMORTGAGE PROPERTY" close={close}>
        <PropertyVisual property={selectedProperty} isMortgaged />
        <div className="balance-check" style={{ marginTop: "10px" }}>
          <span>PRINCIPAL + 10% INTEREST</span><b>Rs{totalRepayment.toLocaleString()}</b>
          <span>REMAINING CASH</span>
          <b style={{ color: canAfford ? "var(--ink)" : "var(--red)" }}>Rs{projectedBalance.toLocaleString()}</b>
        </div>
        <Button onClick={handleConfirmUnmortgage} disabled={!canAfford}>
          {canAfford ? `CONFIRM UNMORTGAGE · Rs${totalRepayment.toLocaleString()}` : "INSUFFICIENT FUNDS"}
        </Button>
        <Button variant="ghost" onClick={close}>CANCEL</Button>
      </ModalShell>
    );
  }

  // ── BUY ──
  if (type === "buy") {
    const buyerId = activePlayerIndex;
    const buyer = players[buyerId] || players[0];
    const userMoney = buyer.money;
    const price = selectedProperty.purchasePrice;
    const balanceAfter = userMoney - price;
    const canAfford = userMoney >= price;

    const handleConfirmBuy = async () => {
      if (!canAfford) return;
      const res = await defaultEngine.buyCurrentProperty(buyerId);
      if (res.success) {
        if (setPlayers) setPlayers(res.state.players);
        if (onShowToast) onShowToast(`BOUGHT ${selectedProperty.name.toUpperCase()} · -Rs${price.toLocaleString()}`);
      }
      close();
      if (onBuyResolved) onBuyResolved();
    };

    const handleDecline = async () => {
      await defaultEngine.declinePropertyPurchase(buyerId);
      if (onShowToast) onShowToast(`DECLINED ${selectedProperty.name.toUpperCase()}`);
      close();
      if (onBuyResolved) onBuyResolved();
    };

    return (
      <ModalShell close={handleDecline} className="buy-modal">
        <span className="eyebrow">PROPERTY AVAILABLE FOR PURCHASE</span>
        <PropertyVisual property={selectedProperty} />
        <div className="afford-row">
          <span>{buyer.name.toUpperCase()}'S BALANCE</span><b>Rs{userMoney.toLocaleString()}</b>
          <span>AFTER PURCHASE</span><b>Rs{balanceAfter.toLocaleString()}</b>
        </div>
        {!canAfford && (
          <div className="insufficient-funds-alert">
            Insufficient funds: Balance Rs{userMoney.toLocaleString()} is less than price Rs{price.toLocaleString()}.
          </div>
        )}
        <Button onClick={handleConfirmBuy} disabled={!canAfford}>
          {!canAfford ? "INSUFFICIENT CASH" : `BUY FOR Rs${price.toLocaleString()}`}
        </Button>
        <Button variant="ghost" onClick={handleDecline}>DON'T BUY</Button>
      </ModalShell>
    );
  }

  // ── PROPERTY DETAILS (default) ──
  const activePlayer = players[activePlayerIndex] || players[0];
  const isOwner = activePlayer.ownedProperties.includes(selectedProperty.id);
  const isMortgaged = !!activePlayer.mortgages[selectedProperty.id];
  const buildingCount = activePlayer.buildings[selectedProperty.id] || 0;

  return (
    <ModalShell title="PROPERTY DETAILS" close={close}>
      <PropertyVisual property={selectedProperty} owned={isOwner} isMortgaged={isMortgaged} />
      {isOwner && (
        <div className="property-actions">
          {"buildingCost" in selectedProperty && !isMortgaged && (
            <Button onClick={() => setModal("build")}>BUILD</Button>
          )}
          {buildingCount > 0 && (
            <Button variant="secondary" onClick={() => setModal("sell")}>SELL BUILDING</Button>
          )}
          {!isMortgaged ? (
            <Button variant="ghost" onClick={() => setModal("mortgage")}>MORTGAGE</Button>
          ) : (
            <Button variant="primary" onClick={() => setModal("unmortgage")}>UNMORTGAGE</Button>
          )}
        </div>
      )}
      {!isOwner && (
        <div className="property-actions">
          <Button variant="secondary" onClick={() => setModal("buy")}>BUY DEMO</Button>
        </div>
      )}
      <button className="mortgage-link">
        MORTGAGE VALUE: Rs{selectedProperty.mortgageValue.toLocaleString()} <Icon name="chevron" size={16} />
      </button>
    </ModalShell>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
/**
 * GameScreen - Engine-authoritative gameplay loop.
 *
 * All dice, movement, money changes, and events are resolved via
 * defaultEngine.rollAndMove(). The UI animates token movement
 * then shows the appropriate modal from TurnResult.
 */
function GameScreen({
  navigate, onOpenProperty,
  players, setPlayers,
  activePlayerIndex, setActivePlayerIndex,
  turnState, setTurnState,
  playerPositions, setPlayerPositions,
  roundNumber, setRoundNumber,
}: {
  navigate: (screen: Screen) => void;
  onOpenProperty: (prop: PropertyDefinition | SpecialPropertyDefinition) => void;
  players: EnginePlayer[];
  setPlayers: React.Dispatch<React.SetStateAction<EnginePlayer[]>>;
  activePlayerIndex: number;
  setActivePlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  turnState: string;
  setTurnState: React.Dispatch<React.SetStateAction<string>>;
  playerPositions: number[];
  setPlayerPositions: React.Dispatch<React.SetStateAction<number[]>>;
  roundNumber: number;
  setRoundNumber: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [modal, setModal] = useState<Modal>(null);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProp, setSelectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition>(CITY_PROPERTIES.bombay);
  const [taxName, setTaxName] = useState<string>("INCOME TAX");

  const activePlayer = players[activePlayerIndex];
  const userPos = playerPositions[activePlayerIndex];

  const showToast = (msg: string, durationMs = 2800) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), durationMs);
  };

  const handleSelectSpace = (space: BoardSpaceDefinition) => {
    if (space.type === "city" && space.propertyId) {
      const prop = CITY_PROPERTIES[space.propertyId];
      if (prop) { setSelectedProp(prop); setModal("property"); }
    } else if (space.type === "special" && space.propertyId) {
      const sp = SPECIAL_PROPERTIES[space.propertyId];
      if (sp) { setSelectedProp(sp); setModal("property"); }
    } else if (space.type === "chance") {
      setModal("chance");
    } else if (space.type === "chest") {
      setModal("chest");
    } else if (space.type === "tax") {
      setTaxName(space.name); setModal("tax");
    } else if (space.name === "JAIL") {
      setModal("jail");
    } else if (space.name === "REST HOUSE") {
      setModal("rest");
    }
  };

  /** Schedule the next player's turn after a brief hold. */
  const advanceTurn = (engineState: GameState, holdMs = 1200) => {
    window.setTimeout(() => {
      setActivePlayerIndex(engineState.activePlayerIndex);
      setTurnState("WAITING_FOR_ROLL");
    }, holdMs);
  };

  /** Sync engine state to UI and open the correct modal for the result. */
  const resolvePostMovement = (result: TurnResult, engineState: GameState) => {
    setPlayers(engineState.players);
    setRoundNumber(engineState.roundNumber);

    // Start-crossing toasts
    if (result.startingCapitalAwarded) {
      showToast(`STARTING CAPITAL Rs25,000 AWARDED TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    } else if (result.passStartBonusAwarded) {
      showToast(`+Rs1,500 PASS START BONUS TO ${engineState.players[result.playerId]?.name?.toUpperCase()}`);
    }

    if (result.mustGoToJail) {
      setModal("jail");
      advanceTurn(engineState);
      return;
    }
    if (result.mustGoToRestHouse) {
      setModal("rest");
      advanceTurn(engineState);
      return;
    }
    if (result.eligibleToBuy && result.purchasablePropertyId) {
      const prop = CITY_PROPERTIES[result.purchasablePropertyId] || SPECIAL_PROPERTIES[result.purchasablePropertyId];
      if (prop) {
        setSelectedProp(prop);
        setModal("buy");
        // Turn advance happens in handleBuyResolved
        return;
      }
    }
    if (result.rentPaid && result.rentAmount > 0) {
      const recipient = engineState.players.find((p) => p.id === result.rentRecipientId);
      showToast(`RENT -Rs${result.rentAmount.toLocaleString()} TO ${recipient?.name?.toUpperCase() ?? "OWNER"}`);
    }
    if (result.spaceType === "tax" && result.moneyChange < 0) {
      setTaxName(result.spaceName);
      setModal("tax");
      advanceTurn(engineState);
      return;
    }
    if (result.spaceType === "chance") {
      setModal("chance");
      advanceTurn(engineState);
      return;
    }
    if (result.spaceType === "chest") {
      setModal("chest");
      advanceTurn(engineState);
      return;
    }
    advanceTurn(engineState);
  };

  /**
   * Engine-authoritative Roll & Move.
   * 1. Call engine.rollAndMove() for authoritative result.
   * 2. Animate token step-by-step (150ms/step).
   * 3. Resolve landing.
   */
  const roll = async () => {
    if (turnState !== "WAITING_FOR_ROLL" || rolling || moving) return;

    const snapPlayerIndex = activePlayerIndex;
    const snapStartPos = playerPositions[snapPlayerIndex] ?? 0;

    setTurnState("ROLLING");
    setRolling(true);

    // Brief dice animation delay
    await new Promise<void>((resolve) => window.setTimeout(resolve, 750));

    const { result, state: engineState } = await defaultEngine.rollAndMove();

    setDice([result.dice1, result.dice2]);
    setRolling(false);

    // Rest House skip: dice are 0,0 and player is skipped
    if (result.dice1 === 0 && result.dice2 === 0) {
      setTurnState("RESOLVING_LANDING");
      showToast(result.eventDescription || `${activePlayer.name} skips this turn (Rest House).`);
      setPlayers(engineState.players);
      setRoundNumber(engineState.roundNumber);
      window.setTimeout(() => {
        setActivePlayerIndex(engineState.activePlayerIndex);
        setTurnState("WAITING_FOR_ROLL");
      }, 1200);
      return;
    }

    // Animate token movement
    setTurnState("MOVING");
    setMoving(true);

    const targetPos = result.newPosition;
    let currPos = snapStartPos;
    let stepsRemaining = result.diceTotal;

    await new Promise<void>((resolve) => {
      const interval = window.setInterval(() => {
        currPos = (currPos + 1) % 36;
        setPlayerPositions((prev) => {
          const next = [...prev];
          next[snapPlayerIndex] = currPos;
          return next;
        });
        stepsRemaining--;
        if (stepsRemaining <= 0) {
          window.clearInterval(interval);
          setMoving(false);
          setTurnState("RESOLVING_LANDING");
          // Snap to engine-authoritative position (handles jail/rest teleport)
          setPlayerPositions((prev) => {
            const next = [...prev];
            next[snapPlayerIndex] = targetPos;
            return next;
          });
          resolve();
        }
      }, 150);
    });

    resolvePostMovement(result, engineState);
  };

  /** Called when buy/decline decision is made from the buy modal. */
  const handleBuyResolved = () => {
    defaultEngine.getState().then((state) => {
      setPlayers(state.players);
      setRoundNumber(state.roundNumber);
      window.setTimeout(() => {
        setActivePlayerIndex(state.activePlayerIndex);
        setTurnState("WAITING_FOR_ROLL");
      }, 600);
    });
  };

  const localPlayerProps = players[0]?.ownedProperties?.length ?? 0;

  return (
    <main className="game-screen">
      <div className="game-topbar">
        <button className="brand-button" onClick={() => navigate("menu")}><Logo compact /></button>
        <div className="turn-count"><small>ROUND</small><strong>{String(roundNumber).padStart(2, "0")}</strong></div>
        <button className="icon-button game-menu" onClick={() => navigate("settings")}><Icon name="gear" /></button>
      </div>
      <PlayerStrip
        players={players}
        openPlayers={() => setModal("players")}
        activePlayerIndex={activePlayerIndex}
        playerPositions={playerPositions}
      />
      <section className="turn-banner">
        <span>{activePlayerIndex === 0 ? "YOUR TURN" : `${activePlayer.name.toUpperCase()}'S TURN`}</span>
        <p>
          {activePlayer.name}{" "}
          {BOARD_SPACES[userPos ?? 0]?.name
            ? `is at ${BOARD_SPACES[userPos ?? 0].name} (#${userPos ?? 0})`
            : "is on the move…"}
        </p>
        <i>01:24</i>
      </section>
      <Board onSelectSpace={handleSelectSpace} playerPositions={playerPositions} players={players} />
      <section className="game-controls">
        <button className="assets-button" onClick={() => navigate("assets")}>
          <Icon name="briefcase" />
          <span>MY ASSETS<small>{localPlayerProps} {localPlayerProps === 1 ? "property" : "properties"}</small></span>
        </button>
        <div className="dice-total">
          <div className="dice-row">
            <Dice value={dice[0]} rolling={rolling} />
            <Dice value={dice[1]} rolling={rolling} />
          </div>
          <span>TOTAL <b>{dice[0] + dice[1]}</b></span>
        </div>
        <Button
          className="roll-button"
          onClick={roll}
          disabled={rolling || moving || turnState !== "WAITING_FOR_ROLL"}
        >
          {rolling ? "ROLLING..." : moving ? "MOVING..." : turnState === "RESOLVING_LANDING" ? "RESOLVING..." : "ROLL DICE"}
        </Button>
      </section>
      <div className="game-shortcuts">
        <button onClick={() => setModal("chance")}>CHANCE</button>
        <button onClick={() => setModal("chest")}>CHEST</button>
        <button onClick={() => setModal("jail")}>JAIL</button>
      </div>
      {toastMessage && (
        <div className="transaction-toast">
          <span>
            {toastMessage.includes("+") || toastMessage.includes("CAPITAL") || toastMessage.includes("BONUS")
              ? "+" : "-"}
          </span>
          <div>
            <strong>{toastMessage}</strong>
            <small>
              {toastMessage.includes("CAPITAL")
                ? "First Rotation Complete"
                : toastMessage.includes("BONUS")
                ? "Bank to Player"
                : toastMessage.includes("RENT")
                ? "Player to Owner"
                : "Bank to Player"}
            </small>
          </div>
        </div>
      )}
      {modal && (
        <GameModal
          type={modal}
          close={() => setModal(null)}
          setModal={setModal}
          navigate={navigate}
          selectedProperty={selectedProp}
          taxSpaceName={taxName}
          players={players}
          activePlayerIndex={activePlayerIndex}
          setPlayers={setPlayers}
          onShowToast={showToast}
          onBuyResolved={handleBuyResolved}
        />
      )}
    </main>
  );
}

// ─── ASSETS SCREEN ────────────────────────────────────────────────────────────

function AssetsScreen({
  navigate, onInspectProperty, players = initialPlayers,
}: {
  navigate: (screen: Screen) => void;
  onInspectProperty: (prop: PropertyDefinition | SpecialPropertyDefinition) => void;
  players?: EnginePlayer[];
}) {
  const [tab, setTab] = useState<"PROPERTIES" | "SPECIAL" | "MORTGAGES">("PROPERTIES");
  const user = players[0];
  const userOwnedIds = user?.ownedProperties ?? [];
  const ownedCities = userOwnedIds.map((id) => CITY_PROPERTIES[id]).filter(Boolean);
  const ownedSpecials = userOwnedIds.map((id) => SPECIAL_PROPERTIES[id]).filter(Boolean);
  const totalAssetsValue =
    ownedCities.reduce((acc, c) => acc + c.purchasePrice, 0) +
    ownedSpecials.reduce((acc, s) => acc + s.purchasePrice, 0);
  const playerCash = user?.money ?? 0;
  const empty = <div style={{ textAlign: "center", padding: "32px", opacity: 0.5, fontSize: "13px" }}>No properties owned yet.</div>;

  return (
    <main className="paper-screen">
      <AppHeader title="MY ASSETS" back={() => navigate("game")} />
      <div className="portfolio-summary">
        <small>NET WORTH</small>
        <strong>Rs{(playerCash + totalAssetsValue).toLocaleString()}</strong>
        <div>
          <span>Cash <b>Rs{playerCash.toLocaleString()}</b></span>
          <span>Assets <b>Rs{totalAssetsValue.toLocaleString()}</b></span>
        </div>
      </div>
      <div className="asset-tabs">
        {(["PROPERTIES", "SPECIAL", "MORTGAGES"] as const).map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="asset-list">
        {tab === "PROPERTIES" && (ownedCities.length === 0 ? empty : ownedCities.map((city) => {
          const theme = getColorGroupTheme(city.colorGroup);
          const isMortgaged = !!user?.mortgages[city.id];
          const bCount = user?.buildings[city.id] || 0;
          return (
            <button className="asset-card" key={city.id} onClick={() => onInspectProperty(city)}>
              <span className={`asset-color ${theme.cssClass}`} />
              <div>
                <small>{theme.label}{isMortgaged ? " · MORTGAGED" : bCount > 0 ? ` · ${bCount >= 4 ? "HOTEL" : `${bCount} HOUSES`}` : ""}</small>
                <strong>{city.name}</strong>
                <span>Base rent: Rs{city.baseRent} · Hotel: Rs{city.hotelRent}</span>
              </div>
              <b>Rs{city.purchasePrice.toLocaleString()}</b>
              <Icon name="chevron" />
            </button>
          );
        }))}
        {tab === "SPECIAL" && (ownedSpecials.length === 0 ? empty : ownedSpecials.map((sp) => {
          const isMortgaged = !!user?.mortgages[sp.id];
          return (
            <button className="asset-card" key={sp.id} onClick={() => onInspectProperty(sp)}>
              <span className="asset-color color-special" />
              <div>
                <small>SPECIAL INFRASTRUCTURE{isMortgaged ? " · MORTGAGED" : ""}</small>
                <strong>{sp.name}</strong>
                <span>Rent: {sp.rentAlone} ({sp.pair})</span>
              </div>
              <b>Rs{sp.purchasePrice.toLocaleString()}</b>
              <Icon name="chevron" />
            </button>
          );
        }))}
        {tab === "MORTGAGES" && (ownedCities.length === 0 && ownedSpecials.length === 0 ? empty : [...ownedCities, ...ownedSpecials].map((item) => {
          const isMortgaged = !!user?.mortgages[item.id];
          return (
            <button className="asset-card" key={item.id} onClick={() => onInspectProperty(item)}>
              <span className={`asset-color ${"colorGroup" in item ? getColorGroupTheme(item.colorGroup).cssClass : "color-special"}`} />
              <div>
                <small style={{ color: isMortgaged ? "var(--red)" : "var(--green)" }}>
                  {isMortgaged ? "MORTGAGED" : "UNMORTGAGED"}
                </small>
                <strong>{item.name}</strong>
                <span>Mortgage value: Rs{item.mortgageValue.toLocaleString()}</span>
              </div>
              <b style={{ color: "var(--gold)" }}>Rs{item.mortgageValue.toLocaleString()}</b>
              <Icon name="chevron" />
            </button>
          );
        }))}
      </div>
    </main>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

function SettingsScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="paper-screen">
      <AppHeader title="SETTINGS" back={() => navigate("menu")} />
      <div className="screen-content">
        <div className="section-label">GAMEPLAY</div>
        <div className="settings-card">
          <SettingRow label="TURN HINTS" value="Show contextual guidance" control={<Toggle />} />
          <SettingRow label="CONFIRM PURCHASES" value="Prevent accidental buys" control={<Toggle />} />
          <SettingRow label="ANIMATIONS" value="Tactile board feedback" control={<Toggle />} />
        </div>
        <div className="section-label">AUDIO</div>
        <div className="settings-card">
          <SettingRow label="MUSIC" value="Ambient score" control={<Toggle />} />
          <SettingRow label="SOUND EFFECTS" value="Dice, tokens, payments" control={<Toggle />} />
        </div>
        <Button variant="secondary" onClick={() => navigate("gameover")}>VIEW GAME OVER SCREEN</Button>
      </div>
    </main>
  );
}

// ─── GAME OVER ────────────────────────────────────────────────────────────────

function GameOverScreen({
  navigate, players = initialPlayers,
}: {
  navigate: (screen: Screen) => void;
  players?: EnginePlayer[];
}) {
  const ranked = [...players].sort((a, b) => b.money - a.money);
  const winner = ranked[0];
  return (
    <main className="gameover-screen">
      <Logo compact />
      <div className="winner-crown"><Icon name="crown" size={36} /></div>
      <small>WINNER</small>
      <strong className="winner-name">{winner.name}</strong>
      <span className="winner-total">FINAL WORTH · Rs{winner.money.toLocaleString()}</span>
      <section className="rankings">
        <div className="rankings-head">
          <span>FINAL RANKINGS</span>
          <small>{players.length} PLAYERS</small>
        </div>
        {ranked.map((player, i) => (
          <div className="ranking-row" key={player.id}>
            <b>0{i + 1}</b>
            <Token player={player} />
            <span>
              <strong>{player.name}</strong>
              <small>{player.ownedProperties.length} properties</small>
            </span>
            <em>Rs{player.money.toLocaleString()}</em>
          </div>
        ))}
      </section>
      <div className="gameover-actions">
        <Button onClick={() => navigate("lobby")}>REMATCH</Button>
        <Button variant="secondary" onClick={() => navigate("menu")}>RETURN TO LOBBY</Button>
      </div>
    </main>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [splash, setSplash] = useState(true);
  const [inspectedProp, setInspectedProp] = useState<PropertyDefinition | SpecialPropertyDefinition | null>(null);

  // Setup settings (controlled by host in SetupScreen)
  const [playerCount, setPlayerCount] = useState(4);
  const [startingMoney, setStartingMoney] = useState(25000);
  const [doublesRule, setDoublesRule] = useState(true);

  // Authoritative engine-synced game state
  const [players, setPlayers] = useState<EnginePlayer[]>(initialPlayers);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [turnState, setTurnState] = useState<string>("WAITING_FOR_ROLL");
  const [playerPositions, setPlayerPositions] = useState<number[]>([0, 0, 0, 0]);
  const [roundNumber, setRoundNumber] = useState<number>(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const handleUpdatePlayerName = (id: number, newName: string) => {
    const trimmed = newName.trim().substring(0, 20);
    if (!trimmed) return;
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
  };

  /** Start game: initialise engine with setup settings, reset all UI state. */
  const handleStartGame = async () => {
    const playerSetups = defaultPlayerConfigs.slice(0, playerCount).map((cfg, idx) => ({
      name: players[idx]?.name ?? cfg.name,
      color: cfg.color,
      token: cfg.token,
    }));

    const gameState = await defaultEngine.startGame(
      { defaultStartingMoney: startingMoney, doublesRuleEnabled: doublesRule },
      playerSetups,
    );

    setPlayers(gameState.players);
    setActivePlayerIndex(gameState.activePlayerIndex);
    setTurnState(gameState.turnState);
    setPlayerPositions(gameState.players.map(() => 0));
    setRoundNumber(gameState.roundNumber);
    setScreen("game");
  };

  const handleInspectFromAssets = (prop: PropertyDefinition | SpecialPropertyDefinition) => {
    setInspectedProp(prop);
  };

  const playerNames = players.map((p) => p.name);

  if (splash) {
    return (
      <div className="splash">
        <div className="splash-emblem">D</div>
        <Logo />
        <span>PREPARING THE BOARD</span>
        <i />
      </div>
    );
  }

  if (screen === "menu") return <MenuScreen navigate={setScreen} />;

  if (screen === "create" || screen === "join") {
    return (
      <SetupScreen
        type={screen}
        navigate={setScreen}
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        startingMoney={startingMoney}
        setStartingMoney={setStartingMoney}
        doublesRule={doublesRule}
        setDoublesRule={setDoublesRule}
        playerNames={playerNames}
        onUpdatePlayerName={handleUpdatePlayerName}
      />
    );
  }

  if (screen === "lobby") {
    return (
      <LobbyScreen
        navigate={setScreen}
        players={players.slice(0, playerCount)}
        onUpdatePlayerName={handleUpdatePlayerName}
        onStartGame={handleStartGame}
      />
    );
  }

  if (screen === "game") {
    return (
      <GameScreen
        navigate={setScreen}
        onOpenProperty={handleInspectFromAssets}
        players={players}
        setPlayers={setPlayers}
        activePlayerIndex={activePlayerIndex}
        setActivePlayerIndex={setActivePlayerIndex}
        turnState={turnState}
        setTurnState={setTurnState}
        playerPositions={playerPositions}
        setPlayerPositions={setPlayerPositions}
        roundNumber={roundNumber}
        setRoundNumber={setRoundNumber}
      />
    );
  }

  if (screen === "assets") {
    return (
      <>
        <AssetsScreen navigate={setScreen} onInspectProperty={handleInspectFromAssets} players={players} />
        {inspectedProp && (
          <ModalShell title="TITLE DEED CARD" close={() => setInspectedProp(null)}>
            <PropertyVisual property={inspectedProp} owned />
          </ModalShell>
        )}
      </>
    );
  }

  if (screen === "settings") return <SettingsScreen navigate={setScreen} />;

  return <GameOverScreen navigate={setScreen} players={players} />;
}
'''

out_path = r'd:\Monopoly\src\App.tsx'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(APP_CONTENT)

print(f"Written {len(APP_CONTENT)} chars to {out_path}")
