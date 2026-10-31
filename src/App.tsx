import { useEffect, useState, useMemo, useRef, useCallback } from "react"



import {

  BOARD_SPACES,

  CITY_PROPERTIES,

  SPECIAL_PROPERTIES,
  SPECIAL_PAIR_MAP,

  COLOR_GROUPS,

  CHANCE_DECLARATIONS,

  CHEST_DECLARATIONS,

  getCityProperty,

  type PropertyDefinition,

  type SpecialPropertyDefinition,

  type BoardSpaceDefinition,

} from "./data/businessData"



import { getColorGroupTheme, getPropertyThemeStyle } from "./theme/colors"



import { defaultEngine } from "./engine/EngineManager"



import { GAME_CONFIG } from "./config/gameConfig"



import type {

  EnginePlayer,

  TurnResult,

  GameState,

  ActivityLogEntry,

  TurnTimerState,

  TransactionRecord,

  TradeOffer,

  GameRules,

  GamePhase,

} from "./engine/GameEngineInterface"



type PlayerColor = string

import CrownfallErrorBoundary from "./components/CrownfallErrorBoundary"

import PlayerPuck from "./components/PlayerPuck"

import { calculatePlayerPortfolio, getPlayerHotelCount, playerOwnsSpecialPair } from "./engine/portfolioUtils"

import TransactionLedgerModal from "./components/TransactionLedgerModal"

import GameInfoModal, { type GameInfoTab } from "./components/GameInfoModal"

import StandingsModal from "./components/StandingsModal"

import { TradeModal } from "./components/TradeModal"

import { QuickChatWidget } from "./components/QuickChatWidget"

import { MortgageManagerModal } from "./components/MortgageManagerModal"

import MortgageStatusIndicator from "./components/MortgageStatusIndicator"

import PropertyLandmarkArtwork from "./components/PropertyLandmarkArtwork"

import { SpecialPropertyIcon } from "./components/SpecialPropertyIcons"

import { TimelineReplayModal } from "./components/TimelineReplayModal"

import { FinancialInsightsModal } from "./components/FinancialInsightsModal"

import { PreferencesModal } from "./components/PreferencesModal"

import {

  GameplayEventLog,

  type GameplayEventEntry,

  EVENT_LOG_CATEGORIES,

  matchGameplayEventCategory as matchEventCategory,

  type EventLogCategory,

} from "./components/GameplayEventLog"

import { DiceRollHistory, type DiceRollRecord } from "./components/DiceRollHistory"

import {

  multiplayerClient,

  type ConnectionStatus,

  type RollEvent,

  type PendingJoinRequest,

  type MultiplayerRoomSnapshot,

  type MultiplayerPlayer,

  type MultiplayerPlayerSnapshot,

} from "./engine/MultiplayerClient"

import {

  BoardCenterNotification,

  type BoardCenterNotificationItem,

} from "./components/BoardCenterNotification"

import {

  BoardCenterPurchaseControl,

  type PendingPurchaseInfo,

} from "./components/BoardCenterPurchaseControl"

import { BoardCenterRecentEvents } from "./components/BoardCenterRecentEvents"

import Dice3D from "./components/Dice3D"

import {

  ANIMATION_TIMINGS,

  getAdaptiveStepSchedule,

  EASE_OUT_EXPO,

} from "./config/animationConfig"

import {

  getTileCenterPercent,

  getMultiTokenOffset,

  getPlayerColorHex,

} from "./utils/boardCoordinates"

import {

  type GamePreferences,

  loadPreferences,

  savePreferences,

  audioSystem,

  triggerHaptic,

} from "./utils/audioSystem"



type Screen = "menu" | "create" | "join" | "lobby" | "game" | "settings" | "gameover"



type Modal =

  | null

  | "property"

  | "buy"

  | "build"

  | "sell"

  | "mortgage"

  | "unmortgage"

  | "sell_property"

  | "chance"

  | "chest"

  | "jail"

  | "rest"

  | "players"

  | "standings"

  | "tax"

  | "rent"

  | "activity_log"

  | "construction_manager"

  | "trade"

  | "mortgage_manager"

  | "timeline"

  | "insights"

  | "preferences"

  | "confirm_end_session"

  | "confirm_resign"

  | "confirm_quit_game"

  | "kick_player"

  | "game_info"



type RentInfo = {

  propertyName: string

  propertyId: string

  payerIdx: number

  recipientIdx: number

  amount: number

  isBankrupt: boolean

}



// Authoritative player data: money starts at Rs0 per Rule 5 (awarded after first rotation).



const defaultPlayerConfigs: EnginePlayer[] = [

  {

    id: 0,

    name: "Player 1",

    isHuman: true,

    money: 0,

    color: "saffron",

    token: "1",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },



  {

    id: 1,

    name: "Player 2",

    isHuman: true,

    money: 0,

    color: "teal",

    token: "2",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },



  {

    id: 2,

    name: "Player 3",

    isHuman: true,

    money: 0,

    color: "plum",

    token: "3",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },



  {

    id: 3,

    name: "Player 4",

    isHuman: true,

    money: 0,

    color: "blue",

    token: "4",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },



  {

    id: 4,

    name: "Player 5",

    isHuman: true,

    money: 0,

    color: "gold",

    token: "5",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },



  {

    id: 5,

    name: "Player 6",

    isHuman: true,

    money: 0,

    color: "burgundy",

    token: "6",

    position: 0,

    rotationsCompleted: 0,

    inJail: false,

    jailTurns: 0,

    inRestHouse: false,

    restHouseTurns: 0,

    cardJailSkip: false,

    cardJailSkipTurns: 0,

    ownedProperties: [],

    buildings: {},

    mortgages: {},

  },

]



function getStoredPlayerName(idx: number): string | null {

  if (typeof window === "undefined") return null

  try {

    return sessionStorage.getItem(`crownfall_player_name_${idx}`) ?? sessionStorage.getItem(`dominion_player_name_${idx}`)

  } catch (_) {

    return null

  }

}



function setStoredPlayerName(idx: number, name: string): void {

  if (typeof window === "undefined") return

  try {

    sessionStorage.setItem(`crownfall_player_name_${idx}`, name)

    sessionStorage.setItem(`dominion_player_name_${idx}`, name)

  } catch (_) {}

}



function getStoredPlayerColor(idx: number): string | null {

  if (typeof window === "undefined") return null

  try {

    return sessionStorage.getItem(`crownfall_player_color_${idx}`) ?? sessionStorage.getItem(`dominion_player_color_${idx}`)

  } catch (_) {

    return null

  }

}



function setStoredPlayerColor(idx: number, color: string): void {

  if (typeof window === "undefined") return

  try {

    sessionStorage.setItem(`crownfall_player_color_${idx}`, color)

    sessionStorage.setItem(`dominion_player_color_${idx}`, color)

  } catch (_) {}

}



function getStoredPlayerId(): number | null {

  if (typeof window === "undefined") return null

  try {

    const s = sessionStorage.getItem("crownfall_player_id") ?? sessionStorage.getItem("crownfall_mp_pid") ?? sessionStorage.getItem("dominion_player_id")

    if (s !== null && !isNaN(parseInt(s, 10))) return parseInt(s, 10)

  } catch (_) {}

  return null

}



function setStoredPlayerId(id: number): void {

  if (typeof window === "undefined") return

  try {

    sessionStorage.setItem("crownfall_player_id", String(id))

    sessionStorage.setItem("crownfall_mp_pid", String(id))

    sessionStorage.setItem("dominion_player_id", String(id))

  } catch (_) {}

}



function isStoredSessionActive(): boolean {

  if (typeof window === "undefined") return false

  try {

    return (sessionStorage.getItem("crownfall_session_active") ?? sessionStorage.getItem("dominion_session_active")) === "true"

  } catch (_) {

    return false

  }

}



function setStoredSessionActive(active: boolean): void {

  if (typeof window === "undefined") return

  try {

    sessionStorage.setItem("crownfall_session_active", active ? "true" : "false")

    sessionStorage.setItem("dominion_session_active", active ? "true" : "false")

  } catch (_) {}

}



function getStoredSessionGameId(): string | null {

  if (typeof window === "undefined") return null

  try {

    return sessionStorage.getItem("crownfall_current_game_id")

  } catch (_) {

    return null

  }

}



function setStoredSessionGameId(gameId: string | null): void {

  if (typeof window === "undefined") return

  try {

    if (gameId) {

      sessionStorage.setItem("crownfall_current_game_id", gameId)

    } else {

      sessionStorage.removeItem("crownfall_current_game_id")

      sessionStorage.removeItem("crownfall_session_ledger")

    }

  } catch (_) {}

}



function getStoredLedgerCache(): TransactionRecord[] | null {

  if (typeof window === "undefined") return null

  try {

    const isSessionActive = sessionStorage.getItem("crownfall_session_active") === "true"

    if (!isSessionActive) return null

    const cached = sessionStorage.getItem("crownfall_session_ledger")

    if (cached) {

      const parsed = JSON.parse(cached)

      if (Array.isArray(parsed)) return parsed

    }

  } catch (_) {}

  return null

}



function setStoredLedgerCache(ledger: TransactionRecord[]): void {

  if (typeof window === "undefined") return

  try {

    const isSessionActive = sessionStorage.getItem("crownfall_session_active") === "true"

    if (isSessionActive && ledger.length > 0) {

      sessionStorage.setItem("crownfall_session_ledger", JSON.stringify(ledger))

    } else if (!isSessionActive) {

      sessionStorage.removeItem("crownfall_session_ledger")

    }

  } catch (_) {}

}



function getInitialPlayers(): EnginePlayer[] {

  const hostCfg = defaultPlayerConfigs[0]

  try {

    const saved = getStoredPlayerName(0)

    if (saved && saved.trim()) {

      return [{ ...hostCfg, name: saved.trim(), isHuman: true }]

    }

  } catch (_) {}

  return [{ ...hostCfg, isHuman: true }]

}



const initialPlayers: EnginePlayer[] = getInitialPlayers()



/**

 * EXACT 36-Space Perimeter Board Coordinates (Clockwise)

 * Corner 0=Start(BR), 9=Jail(BL), 18=Club(TL), 27=RestHouse(TR)

 */



interface BoardPosition {

  row: number

  col: number

}



const BOARD_POSITIONS: Record<number, BoardPosition> = {

  0: { row: 10, col: 10 },

  1: { row: 10, col: 9 },

  2: { row: 10, col: 8 },



  3: { row: 10, col: 7 },

  4: { row: 10, col: 6 },

  5: { row: 10, col: 5 },



  6: { row: 10, col: 4 },

  7: { row: 10, col: 3 },

  8: { row: 10, col: 2 },



  9: { row: 10, col: 1 },

  10: { row: 9, col: 1 },

  11: { row: 8, col: 1 },



  12: { row: 7, col: 1 },

  13: { row: 6, col: 1 },

  14: { row: 5, col: 1 },



  15: { row: 4, col: 1 },

  16: { row: 3, col: 1 },

  17: { row: 2, col: 1 },



  18: { row: 1, col: 1 },

  19: { row: 1, col: 2 },

  20: { row: 1, col: 3 },



  21: { row: 1, col: 4 },

  22: { row: 1, col: 5 },

  23: { row: 1, col: 6 },



  24: { row: 1, col: 7 },

  25: { row: 1, col: 8 },

  26: { row: 1, col: 9 },



  27: { row: 1, col: 10 },

  28: { row: 2, col: 10 },

  29: { row: 3, col: 10 },



  30: { row: 4, col: 10 },

  31: { row: 5, col: 10 },

  32: { row: 6, col: 10 },



  33: { row: 7, col: 10 },

  34: { row: 8, col: 10 },

  35: { row: 9, col: 10 },

}



interface IconProps {

  name: string

  size?: number

}



function Icon({ name, size = 20 }: IconProps) {

  const paths: Record<string, React.ReactNode> = {

    arrow: (

      <>

        <path d="M5 12h14M13 6l6 6-6 6" />

      </>

    ),



    dice: (

      <>

        <rect x="3" y="3" width="18" height="18" rx="4" />

        <circle cx="8" cy="8" r="1" fill="currentColor" />

        <circle cx="16" cy="16" r="1" fill="currentColor" />

        <circle cx="12" cy="12" r="1" fill="currentColor" />

      </>

    ),



    users: (

      <>

        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />

      </>

    ),



    briefcase: (

      <>

        <rect x="3" y="7" width="18" height="13" rx="2" />

        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />

      </>

    ),



    gear: (

      <>

        <circle cx="12" cy="12" r="3" />

        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-1.55V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9c.13.61.66 1.05 1.55 1H21v4h-.08c-.89-.05-1.42.39-1.55 1Z" />

      </>

    ),



    close: (

      <>

        <path d="m6 6 12 12M18 6 6 18" />

      </>

    ),



    chevron: (

      <>

        <path d="m9 18 6-6-6-6" />

      </>

    ),



    signal: (

      <>

        <path d="M5 12.55a11 11 0 0 1 14.08 0M8.5 16a6 6 0 0 1 7 0M12 20h.01" />

      </>

    ),



    home: (

      <>

        <path d="m3 11 9-8 9 8v10h-6v-7H9v7H3V11Z" />

      </>

    ),



    handshake: (

      <>

        <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0l-1.7 1.7" />

        <path d="m13 7.1-1.3-1.3a1 1 0 0 0-1.4 0L6 10.1a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l1.7-1.7" />

        <path d="m18 11 3-3" />

        <path d="m3 13 3 3" />

      </>

    ),



    scroll: (

      <>

        <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />

        <path d="M19 17V5a2 2 0 0 0-2-2H4" />

        <path d="M15 8h-5" />

        <path d="M15 12h-5" />

      </>

    ),



    trophy: (

      <>

        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />

        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />

        <path d="M4 22h16" />

        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />

        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />

        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />

      </>

    ),



    check: (

      <>

        <polyline points="20 6 9 17 4 12" />

      </>

    ),



    chart: (

      <>

        <path d="M3 3v18h18" />

        <path d="m19 9-5 5-4-4-3 3" />

      </>

    ),



    bell: (

      <>

        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />

        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />

      </>

    ),



    ledger: (

      <>

        <rect x="4" y="3" width="16" height="18" rx="2" />

        <path d="M8 7h8M8 11h8M8 15h5" />

      </>

    ),



    info: (

      <>

        <circle cx="12" cy="12" r="10" />

        <path d="M12 16v-4M12 8h.01" />

      </>

    ),

  }



  const iconContent = paths[name] || (

    <>

      <circle cx="12" cy="12" r="8" />

      <path d="M12 8v4M12 16h.01" />

    </>

  )



  return (

    <svg

      width={size}

      height={size}

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.8"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden="true"

    >

      {iconContent}

    </svg>

  )

}



function Button({

  children,

  variant = "primary",

  icon,

  disabled,

  onClick,

  className = "",

  style,

  title,

}: {

  children: React.ReactNode



  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"



  icon?: string



  disabled?: boolean



  onClick?: () => void



  className?: string



  style?: React.CSSProperties



  title?: string

}) {

  return (

    <button

      className={`btn btn-${variant} ${className}`}

      disabled={disabled}

      onClick={onClick}

      style={style}

      title={title}

    >

      {children}

      {icon && <Icon name={icon} size={18} />}

    </button>

  )

}



function Logo({ compact = false }: { compact?: boolean }) {

  return (

    <div className={`logo ${compact ? "logo-compact" : ""}`}>

      <strong>CROWNFALL</strong>

      <small>.IO ONLINE</small>

    </div>

  )

}



function Token({

  player,

  active = false,

  gliding = false,

  className = "",

  size = "sm",

}: {

  player: EnginePlayer

  active?: boolean

  gliding?: boolean

  className?: string

  size?: "xs" | "sm" | "md" | "lg" | "xl" | number

}) {

  return (

    <PlayerPuck

      player={player}

      size={size}

      active={active}

      gliding={gliding}

      className={className}

    />

  )

}



function AppHeader({

  title,

  back,

  isCppConnected = false,

}: {

  title?: string



  back?: () => void



  isCppConnected?: boolean

}) {

  return (

    <header className="app-header">

      {back ? (

        <button className="icon-button" onClick={back} aria-label="Go back">

          ←

        </button>

      ) : (

        <Logo compact />

      )}

      {title && (

        <div className="header-title">

          {title}

          <small>CROWNFALL</small>

        </div>

      )}

      <div className="edition-pill">

        <span>.IO MULTIPLAYER</span>

      </div>

    </header>

  )

}



// ─── MENU ────────────────────────────────────────────────────────────────────



function MenuScreen({ navigate }: { navigate: (screen: Screen) => void }) {

  return (

    <main className="menu-screen">

      <div className="menu-container">

        <section className="menu-hero">

          <div className="edition-seal">

            EST.

            <br />

            INDIA

          </div>

          <Logo />

          <p>

            Build your empire.

            <br />

            Rule the board.

          </p>

        </section>

        <section className="menu-actions">

          <Button onClick={() => navigate("create")} icon="arrow">

            PLAY / CREATE GAME

          </Button>

          <Button variant="secondary" onClick={() => navigate("join")}>

            JOIN GAME

          </Button>

          <div className="menu-links">

            <button onClick={() => navigate("settings")}>

              <Icon name="gear" /> SETTINGS

            </button>

            <button>

              <span className="question-icon">?</span> HOW TO PLAY

            </button>

          </div>

        </section>

        <footer className="menu-footer">

          <span>v1.0</span>

          <span className="safe-copy">A MODERN INDIAN CLASSIC</span>

        </footer>

      </div>

    </main>

  )

}



// ─── SETUP ────────────────────────────────────────────────────────────────────



function SettingRow({

  label,

  value,

  control,

}: {

  label: string

  value: string

  control: React.ReactNode

}) {

  return (

    <div className="setting-row">

      <div className="setting-row-text" style={{ minWidth: 0, flex: "1 1 auto" }}>

        <strong>{label}</strong>

        <small>{value}</small>

      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>

        {control}

      </div>

    </div>

  )

}



function Toggle({

  on: controlledOn,

  onChange,

  label,

}: {

  on?: boolean

  onChange?: (val: boolean) => void

  label?: string

} = {}) {

  const [internalOn, setInternalOn] = useState(true)

  const isControlled = controlledOn !== undefined

  const isOn = isControlled ? controlledOn : internalOn



  const handleClick = () => {

    if (isControlled) {

      onChange?.(!controlledOn)

    } else {

      setInternalOn(!internalOn)

      onChange?.(!internalOn)

    }

  }



  return (

    <button

      type="button"

      className={`toggle ${isOn ? "on" : ""}`}

      onClick={handleClick}

      aria-label={label || "Toggle setting"}

      style={{ flexShrink: 0 }}

    >

      <span />

    </button>

  )

}



export const AVAILABLE_PLAYER_COLORS = [

  { id: "saffron", name: "Saffron", hex: "#d97706" },

  { id: "teal", name: "Teal", hex: "#0d9488" },

  { id: "plum", name: "Plum", hex: "#9333ea" },

  { id: "blue", name: "Blue", hex: "#2563eb" },

  { id: "gold", name: "Gold", hex: "#ca8a04" },

  { id: "burgundy", name: "Burgundy", hex: "#991b1b" },

  { id: "emerald", name: "Emerald", hex: "#059669" },

  { id: "purple", name: "Purple", hex: "#7c3aed" },

  { id: "coral", name: "Coral", hex: "#f97316" },

  { id: "bronze", name: "Bronze", hex: "#b45309" },

]



export function generateCrownfallRoomCode(): string {

  const digits = Math.floor(1000 + Math.random() * 9000)

  return `CRN-${digits}`

}



export function normalizeAndValidateRoomCode(code: string): { valid: boolean; normalized: string } {

  const clean = code.trim().toUpperCase()

  const valid = /^CRN-[A-Z0-9]{4}$/i.test(clean)

  return { valid, normalized: clean }

}



function SetupScreen({

  type,

  navigate,

  roomCode,

  setRoomCode,

  localPlayerId = 0,

  setLocalPlayerId,

  players,

  onUpdatePlayerName,

  onUpdatePlayerColor,

  rules,

  startingMoney = 45000,

}: {

  type: "create" | "join"

  navigate: (screen: Screen) => void

  roomCode: string

  setRoomCode: (code: string) => void

  localPlayerId: number

  setLocalPlayerId: (id: number) => void

  players: EnginePlayer[]

  onUpdatePlayerName: (id: number, name: string) => void

  onUpdatePlayerColor?: (id: number, color: string) => void

  rules?: GameRules

  startingMoney?: number

}) {

  const create = type === "create"

  const [inputCode, setInputCode] = useState(create ? roomCode : "CRN-")

  const [codeError, setCodeError] = useState<string | null>(null)

  const [colorError, setColorError] = useState<string | null>(null)

  const [nameError, setNameError] = useState<string | null>(null)



  const [enteredName, setEnteredName] = useState(() => {

    if (create) {

      return players[0]?.name || getStoredPlayerName(0) || "Player 1"

    }

    return ""

  })

  const [enteredColor, setEnteredColor] = useState<string>(() => {

    if (create) {

      return players[0]?.color || getStoredPlayerColor(0) || "saffron"

    }

    return "teal"

  })



  const [targetRoomSnapshot, setTargetRoomSnapshot] = useState<MultiplayerRoomSnapshot | null>(null)

  const [isLookingUpRoom, setIsLookingUpRoom] = useState<boolean>(false)



  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isPendingApproval, setIsPendingApproval] = useState(false)

  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  const [captchaToken, setCaptchaToken] = useState<string>("")

  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)

  const turnstileSiteKey = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY) || ""



  // Initialize Cloudflare Turnstile if site key is configured

  useEffect(() => {

    if (!turnstileSiteKey || typeof window === "undefined") return

    const turnstileObj = (window as any).turnstile

    if (turnstileObj && turnstileContainerRef.current) {

      try {

        turnstileObj.render(turnstileContainerRef.current, {

          sitekey: turnstileSiteKey,

          callback: (token: string) => {

            setCaptchaToken(token)

            setCodeError(null)

          },

          "error-callback": () => {

            setCaptchaToken("")

          },

          "expired-callback": () => {

            setCaptchaToken("")

          },

        })

      } catch (_) {}

    }

  }, [turnstileSiteKey])



  // Look up authoritative target room state when entering a room code in Join mode

  useEffect(() => {

    if (create) return

    const { valid, normalized } = normalizeAndValidateRoomCode(inputCode)

    if (!valid) {

      setTargetRoomSnapshot(null)

      return

    }



    let isMounted = true

    const lookup = async () => {

      try {

        setIsLookingUpRoom(true)

        const snap = await multiplayerClient.fetchRoomSnapshot(normalized)

        if (isMounted && snap) {

          setTargetRoomSnapshot(snap)

        }

      } finally {

        if (isMounted) setIsLookingUpRoom(false)

      }

    }



    lookup()



    // Periodically refresh room occupancy while on the join screen

    const pollInterval = setInterval(() => {

      if (typeof document !== "undefined" && document.visibilityState === "visible") {

        multiplayerClient.fetchRoomSnapshot(normalized).then((snap) => {

          if (isMounted && snap) {

            setTargetRoomSnapshot(snap)

          }

        })

      }

    }, 2000)



    // Listen to live snapshot events for this room code

    const unsub = multiplayerClient.onSnapshot((snap) => {

      if (isMounted && snap.roomCode?.toUpperCase() === normalized) {

        setTargetRoomSnapshot(snap)

      }

    })



    return () => {

      isMounted = false

      clearInterval(pollInterval)

      unsub()

    }

  }, [create, inputCode])



  // Ensure selected color is genuinely available whenever target room occupancy updates

  useEffect(() => {

    if (create || !targetRoomSnapshot) return

    const occupied = new Set(

      (targetRoomSnapshot.players || [])

        .filter((p: MultiplayerPlayerSnapshot) => !p.isLeft)

        .map((p: MultiplayerPlayerSnapshot) => (p.color || "").trim().toLowerCase())

    )

    if (occupied.has(enteredColor.toLowerCase())) {

      const firstFree = AVAILABLE_PLAYER_COLORS.find(

        (c) => !occupied.has(c.id.toLowerCase())

      )

      if (firstFree) {

        setEnteredColor(firstFree.id)

        setColorError(null)

      }

    }

  }, [create, targetRoomSnapshot, enteredColor])



  // Polling & WebSocket listening effect for join approval

  useEffect(() => {

    if (!isPendingApproval || !pendingRequestId) return

    const { normalized } = normalizeAndValidateRoomCode(inputCode)



    const pollTimer = setInterval(async () => {

      try {

        const res = await multiplayerClient.pollJoinRequestStatus(normalized, pendingRequestId)

        if (res.status === "ACCEPTED") {

          clearInterval(pollTimer)

          setIsPendingApproval(false)

          setRoomCode(normalized)

          const assignedId = res.playerId ?? multiplayerClient.getPlayerId() ?? 1

          const trimmed = enteredName.trim()

          if (trimmed) {

            setStoredPlayerName(assignedId, trimmed)

            setStoredPlayerColor(assignedId, enteredColor)

            onUpdatePlayerName(assignedId, trimmed)

            if (onUpdatePlayerColor) onUpdatePlayerColor(assignedId, enteredColor)

          }

          setLocalPlayerId(assignedId)

          navigate("game")

        } else if (res.status === "REJECTED") {

          clearInterval(pollTimer)

          setIsPendingApproval(false)

          setCodeError(res.rejectReason || "Join request was declined by the room host.")

        }

      } catch (_) {}

    }, 1500)



    const unsubDecision = multiplayerClient.onJoinDecision((status, reason, playerId) => {

      if (status === "ACCEPTED") {

        clearInterval(pollTimer)

        setIsPendingApproval(false)

        setRoomCode(normalized)

        const assignedId = playerId ?? multiplayerClient.getPlayerId() ?? 1

        const trimmed = enteredName.trim()

        if (trimmed) {

          setStoredPlayerName(assignedId, trimmed)

          setStoredPlayerColor(assignedId, enteredColor)

          onUpdatePlayerName(assignedId, trimmed)

          if (onUpdatePlayerColor) onUpdatePlayerColor(assignedId, enteredColor)

        }

        setLocalPlayerId(assignedId)

        navigate("game")

      } else if (status === "REJECTED") {

        clearInterval(pollTimer)

        setIsPendingApproval(false)

        setCodeError(reason || "Join request was declined by the room host.")

      }

    })



    return () => {

      clearInterval(pollTimer)

      unsubDecision()

    }

  }, [isPendingApproval, pendingRequestId, inputCode, navigate, setRoomCode, setLocalPlayerId, enteredName, enteredColor, onUpdatePlayerName, onUpdatePlayerColor])



  const handleContinue = async () => {

    const trimmedName = enteredName.trim()

    if (!trimmedName) {

      setNameError("Please enter a valid player name.")

      return

    }

    setNameError(null)



    if (create) {

      onUpdatePlayerName(0, trimmedName)

      if (onUpdatePlayerColor) onUpdatePlayerColor(0, enteredColor)

      setIsSubmitting(true)

      setCodeError(null)

      try {

        const startCap = rules?.defaultStartingMoney ?? startingMoney ?? 45000

        const initialRules: Partial<GameRules> = {

          defaultStartingMoney: startCap,

          startingMoneyOptions: [40000, 45000, 50000, 55000, 60000, 65000],

          passStartBonus: Math.floor((startCap * 5 + 5000) / 10000) * 100,

          ...rules,

        }

        const res = await multiplayerClient.createRoom(trimmedName, enteredColor, initialRules, captchaToken)

        setRoomCode(res.roomCode)

        setLocalPlayerId(0)

        navigate("game")

      } catch (err: any) {

        setCodeError(err?.message || "Failed to create room.")

      } finally {

        setIsSubmitting(false)

      }

    } else {

      const { valid, normalized } = normalizeAndValidateRoomCode(inputCode)

      if (!valid) {

        setCodeError("Invalid game code. Enter a valid Crownfall code beginning with CRN- (e.g. CRN-4821).")

        return

      }



      // Check current room occupancy and capacity if room snapshot is available

      if (targetRoomSnapshot) {

        const activePlayers = (targetRoomSnapshot.players || []).filter((p: MultiplayerPlayerSnapshot) => !p.isLeft)

        const maxCapacity = targetRoomSnapshot.rules?.maxPlayers ?? 4

        if (activePlayers.length >= maxCapacity) {

          setCodeError(`Room ${normalized} is currently full (${activePlayers.length}/${maxCapacity} players).`)

          return

        }

        const isColorOccupied = activePlayers.some(

          (p: MultiplayerPlayerSnapshot) => (p.color || "").trim().toLowerCase() === enteredColor.toLowerCase()

        )

        if (isColorOccupied) {

          setColorError(`Color '${enteredColor}' is already taken in this room. Please select an available color.`)

          return

        }

      }



      setIsSubmitting(true)

      setCodeError(null)

      try {

        const res = await multiplayerClient.requestJoinRoom(normalized, trimmedName, enteredColor, captchaToken)

        if (res.status === "ACCEPTED") {

          const assignedId = res.playerId ?? multiplayerClient.getPlayerId() ?? 1

          setStoredPlayerName(assignedId, trimmedName)

          setStoredPlayerColor(assignedId, enteredColor)

          onUpdatePlayerName(assignedId, trimmedName)

          if (onUpdatePlayerColor) onUpdatePlayerColor(assignedId, enteredColor)

          setRoomCode(res.roomCode)

          setLocalPlayerId(assignedId)

          navigate("game")

        } else if (res.status === "PENDING") {

          setPendingRequestId(res.requestId || null)

          setIsPendingApproval(true)

        }

      } catch (err: any) {

        setCodeError(err?.message || "Failed to submit join request.")

      } finally {

        setIsSubmitting(false)

      }

    }

  }



  if (isPendingApproval) {

    return (

      <main className="paper-screen">

        <AppHeader

          title="WAITING FOR APPROVAL"

          back={() => {

            setIsPendingApproval(false)

            setPendingRequestId(null)

          }}

        />

        <div className="screen-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "32px", gap: "18px" }}>

          <div style={{

            width: "68px",

            height: "68px",

            borderRadius: "50%",

            background: "rgba(200, 155, 69, 0.15)",

            border: "2px solid var(--gold)",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            boxShadow: "0 0 25px rgba(200, 155, 69, 0.3)",

          }}>

            <Icon name="users" size={32} />

          </div>



          <div>

            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--gold-300)", textTransform: "uppercase" }}>

              ROOM CODE: {inputCode.toUpperCase()}

            </span>

            <h2 style={{ fontSize: "19px", fontWeight: 800, margin: "8px 0 4px", color: "var(--ink)" }}>

              WAITING FOR HOST APPROVAL

            </h2>

            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", maxWidth: "340px", margin: "0 auto", lineHeight: 1.5 }}>

              Your join request as <strong style={{ color: "var(--gold)" }}>{enteredName.trim() || "Guest Player"}</strong> has been submitted to the room host. Please wait while the host reviews and confirms your admission.

            </p>

          </div>



          <div style={{

            padding: "16px 20px",

            background: "var(--surface)",

            borderRadius: "10px",

            border: "1px solid var(--border-subtle)",

            width: "100%",

            maxWidth: "320px",

            display: "flex",

            flexDirection: "column",

            gap: "8px",

            fontSize: "12px",

          }}>

            <div style={{ display: "flex", justifyContent: "space-between" }}>

              <span style={{ color: "rgba(255,255,255,0.6)" }}>Status:</span>

              <span style={{ color: "var(--gold)", fontWeight: 700 }}>Pending Host Decision</span>

            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>

              <span style={{ color: "rgba(255,255,255,0.6)" }}>Player Name:</span>

              <span style={{ color: "#fff", fontWeight: 700 }}>{enteredName.trim() || "Guest Player"}</span>

            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>

              <span style={{ color: "rgba(255,255,255,0.6)" }}>Requested Color:</span>

              <span style={{ color: "var(--gold-300)", fontWeight: 700, textTransform: "uppercase" }}>{enteredColor}</span>

            </div>

          </div>



          <Button

            variant="outline"

            onClick={() => {

              setIsPendingApproval(false)

              setPendingRequestId(null)

            }}

            style={{ marginTop: "8px", width: "100%", maxWidth: "320px" }}

          >

            CANCEL REQUEST

          </Button>

        </div>

      </main>

    )

  }



  return (

    <main className="paper-screen">

      <AppHeader

        title={create ? "CREATE GAME" : "JOIN GAME"}

        back={() => navigate("menu")}

      />

      <div className="screen-content">

        <div className="intro-mark">

          <Icon name="users" size={28} />

        </div>

        <div className="section-heading">

          <span>{create ? "PLAYER SETUP" : "ENTER TABLE"}</span>

          <p>

            {create

              ? "Configure your player identity before entering the pre-game lobby as host."

              : "Enter your room code and choose your multiplayer identity."}

          </p>

        </div>



        {!create && (

          <div style={{ marginBottom: "16px" }}>

            <label className="field">

              <span>ROOM CODE</span>

              <input

                value={inputCode}

                onChange={(e) => {

                  setInputCode(e.target.value)

                  setCodeError(null)

                }}

                placeholder="CRN-4821"

                maxLength={8}

                style={{ textTransform: "uppercase" }}

              />

              <small>Enter an 8-character Crownfall room code (e.g. CRN-4821)</small>

            </label>

            {codeError && (

              <div style={{ color: "var(--red)", fontSize: "11px", marginTop: "4px" }}>

                {codeError}

              </div>

            )}

          </div>

        )}



        <div className="settings-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Input 1: Player Name */}

          <div>

            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px", letterSpacing: "0.06em" }}>

              1. PLAYER NAME

            </label>

            <input

              type="text"

              value={enteredName}

              maxLength={20}

              onChange={(e) => {

                setNameError(null)

                setEnteredName(e.target.value)

              }}

              placeholder={create ? "Enter host name" : "Enter your name"}

              style={{

                width: "100%",

                height: "36px",

                borderRadius: "8px",

                border: nameError ? "1.5px solid var(--red)" : "1.5px solid var(--gold)",

                padding: "0 12px",

                fontSize: "14px",

                fontWeight: 600,

                background: "#ffffff",

                color: "#0f172a",

              }}

            />

            {nameError && (

              <div style={{ color: "var(--red)", fontSize: "11px", marginTop: "4px" }}>

                {nameError}

              </div>

            )}

          </div>



          {/* Input 2: Character / Token Color */}

          <div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>

              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)", letterSpacing: "0.06em" }}>

                2. CHARACTER / TOKEN COLOR

              </label>

              <span style={{ fontSize: "11px", color: "var(--gold-300)", fontWeight: 700, textTransform: "uppercase" }}>

                {enteredColor}

              </span>

            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: "8px" }}>

              {AVAILABLE_PLAYER_COLORS.map((c) => {

                const isSelected = enteredColor.toLowerCase() === c.id

                const occupyingPlayer = !create && targetRoomSnapshot

                  ? (targetRoomSnapshot.players || []).find(

                      (p: MultiplayerPlayerSnapshot) => !p.isLeft && (p.color || "").trim().toLowerCase() === c.id

                    )

                  : null

                const isTaken = Boolean(occupyingPlayer)



                return (

                  <button

                    key={c.id}

                    type="button"

                    disabled={isTaken}

                    aria-disabled={isTaken}

                    onClick={() => {

                      if (isTaken) {

                        const available = AVAILABLE_PLAYER_COLORS.filter(

                          (ac) => !(targetRoomSnapshot?.players || []).some(

                            (p: MultiplayerPlayerSnapshot) => !p.isLeft && (p.color || "").trim().toLowerCase() === ac.id

                          )

                        ).map((ac) => ac.name).join(", ")

                        setColorError(`Color '${c.name}' is already chosen by ${occupyingPlayer?.name || "another player"}. Available colors: ${available || "None"}`)

                        return

                      }

                      setColorError(null)

                      setEnteredColor(c.id)

                    }}

                    style={{

                      padding: "8px 6px",

                      borderRadius: "10px",

                      border: isSelected ? "1.5px solid var(--gold-bright)" : "1px solid var(--glass-border)",

                      background: isSelected ? "rgba(217, 119, 6, 0.16)" : isTaken ? "rgba(14, 22, 42, 0.3)" : "rgba(14, 22, 42, 0.6)",

                      boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.3)" : "none",

                      cursor: isTaken ? "not-allowed" : "pointer",

                      opacity: isTaken ? 0.35 : 1,

                      display: "flex",

                      flexDirection: "column",

                      alignItems: "center",

                      justifyContent: "center",

                      gap: "6px",

                      transition: "all 0.18s ease",

                      position: "relative",

                    }}

                    title={isTaken ? `${c.name} (Occupied by ${occupyingPlayer?.name || "player"})` : c.name}

                  >

                    <PlayerPuck

                      player={{ name: c.name, color: c.id, token: c.name.charAt(0) }}

                      size="sm"

                      active={isSelected}

                    />

                    <span style={{ fontSize: "10px", fontWeight: 700, color: isSelected ? "var(--gold-bright)" : isTaken ? "rgba(255,255,255,0.4)" : "var(--text-subtle)", letterSpacing: "0.04em" }}>

                      {c.name}

                    </span>

                    {isTaken && (

                      <span style={{ fontSize: "8px", fontWeight: 700, color: "var(--red-light)", letterSpacing: "0.05em", textTransform: "uppercase" }}>

                        TAKEN

                      </span>

                    )}

                  </button>

                )

              })}

            </div>

            {colorError && (

              <div style={{ color: "var(--red)", fontSize: "10px", marginTop: "4px" }}>

                {colorError}

              </div>

            )}

          </div>

        </div>





        {turnstileSiteKey && (

          <div

            ref={turnstileContainerRef}

            className="turnstile-wrapper"

            style={{ margin: "14px auto", minHeight: "65px", display: "flex", justifyContent: "center" }}

          />

        )}

      </div>

      <div className="sticky-action">

        <Button onClick={handleContinue} icon="arrow" disabled={isSubmitting}>

          {isSubmitting ? "PROCESSING..." : create ? "CREATE MATCH ROOM" : "REQUEST TO JOIN"}

        </Button>

      </div>

    </main>

  )

}



function LobbyScreen({

  navigate,

  rematch = false,

  roomCode = "CRN-1000",

  players,

  onUpdatePlayerName,

  onUpdatePlayerColor,

  onStartGame,

  onOpenHostSettings,

  localPlayerId = 0,

  setLocalPlayerId,

  timerEnabled = true,

  timerSeconds = 60,

  startingMoney = 45000,

  doublesRule = true,

  startGameError = null,

  onClearStartError,

  connectionStatus = "connected",

  connectionMessage = "",

  onRetryConnection,

  onRemovePlayer,

  pendingRequests = [],

  onAcceptJoinRequest,

  onRejectJoinRequest,

}: {

  navigate: (screen: Screen) => void

  rematch?: boolean

  roomCode: string

  players: EnginePlayer[]

  onUpdatePlayerName: (id: number, name: string) => void

  onUpdatePlayerColor?: (id: number, color: string) => void

  onStartGame: () => void

  onOpenHostSettings?: () => void

  localPlayerId?: number

  setLocalPlayerId?: (id: number) => void

  timerEnabled?: boolean

  timerSeconds?: number

  startingMoney?: number

  doublesRule?: boolean

  startGameError?: string | null

  onClearStartError?: () => void

  connectionStatus?: ConnectionStatus

  connectionMessage?: string

  onRetryConnection?: () => void

  onRemovePlayer?: (playerId: number) => void

  pendingRequests?: PendingJoinRequest[]

  onAcceptJoinRequest?: (requestId: string) => void

  onRejectJoinRequest?: (requestId: string) => void

}) {

  const [colorValidationError, setColorValidationError] = useState<string | null>(null)

  const [nameValidationError, setNameValidationError] = useState<string | null>(null)

  const [showQuitConfirm, setShowQuitConfirm] = useState(false)

  const [isLeavingRoom, setIsLeavingRoom] = useState(false)

  const [leaveError, setLeaveError] = useState<string | null>(null)



  const snapshot = multiplayerClient.getLatestSnapshot()

  const isMultiplayer = Boolean(roomCode || multiplayerClient.getRoomCode())

  const actingHostId = isMultiplayer

    ? (snapshot?.actingHostPlayerId ?? snapshot?.hostPlayerId ?? 0)

    : 0

  const isLocalHost = Boolean(localPlayerId !== null && localPlayerId === actingHostId)



  const handleConfirmQuitLobby = async () => {

    if (isLeavingRoom) return

    setIsLeavingRoom(true)

    setLeaveError(null)

    try {

      if (roomCode) {

        const res = await multiplayerClient.leaveRoom()

        if (res && (res as any).error) {

          setLeaveError((res as any).error)

          setIsLeavingRoom(false)

          return

        }

      }

      setShowQuitConfirm(false)

      navigate("menu")

    } catch (err: any) {

      setLeaveError(err?.message || "Communication error leaving room.")

      setIsLeavingRoom(false)

    }

  }



  return (

    <main className="paper-screen">

      <AppHeader

        title={rematch ? "REMATCH LOBBY" : "PRE-GAME LOBBY"}

        back={rematch ? () => navigate("gameover") : () => setShowQuitConfirm(true)}

      />

      <div className="screen-content lobby-content">

        <div className="room-code">

          <div>

            <small>ROOM CODE</small>

            <strong>{roomCode}</strong>

          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

            <button onClick={() => {

              if (navigator?.clipboard) {

                navigator.clipboard.writeText(roomCode)

              }

            }}>COPY</button>

            <button

              type="button"

              className="quit-game-btn"

              style={{ padding: "6px 12px", fontSize: "11px", height: "30px", lineHeight: "1" }}

              onClick={() => setShowQuitConfirm(true)}

              title="Leave room and return to main menu"

            >

              QUIT ROOM

            </button>

          </div>

        </div>

        <div className="lobby-meta">

          <span>

            <i className="status-dot" /> {players.length} OF {players.length} SEATS READY

          </span>

          <span>

            {isLocalHost

              ? (players[localPlayerId]?.isOriginalHost !== false ? "YOU ARE HOST" : "YOU ARE ACTING HOST")

              : `SEAT: PLAYER ${localPlayerId + 1} (${players[localPlayerId]?.name || "YOU"})`}

          </span>

        </div>



        {/* Host Pending Join Requests Banner */}

        {isLocalHost && pendingRequests && pendingRequests.length > 0 && (

          <div

            className="lobby-pending-requests-card"

            style={{

              marginBottom: "12px",

              padding: "12px 14px",

              borderRadius: "10px",

              background: "rgba(200, 155, 69, 0.16)",

              border: "1.5px solid var(--gold)",

              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",

              display: "flex",

              flexDirection: "column",

              gap: "8px",

            }}

          >

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

              <strong style={{ fontSize: "12px", color: "var(--gold-light)", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>

                PENDING JOIN REQUESTS ({pendingRequests.length})

              </strong>

              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>Host approval required</span>

            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

              {pendingRequests.map((req) => (

                <div

                  key={req.requestId}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    background: "rgba(0,0,0,0.5)",

                    padding: "8px 12px",

                    borderRadius: "8px",

                    border: "1px solid rgba(255,255,255,0.12)",

                    gap: "8px",

                    flexWrap: "wrap",

                  }}

                >

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                    <span

                      style={{

                        width: "12px",

                        height: "12px",

                        borderRadius: "50%",

                        backgroundColor: getPlayerColorHex(req.color as any),

                        display: "inline-block",

                        boxShadow: "0 0 6px rgba(0,0,0,0.5)",

                      }}

                    />

                    <strong style={{ fontSize: "13px", color: "#fff" }}>{req.name}</strong>

                    <span style={{ fontSize: "10px", color: "var(--gold-300)", textTransform: "uppercase", fontWeight: 700 }}>

                      ({req.color})

                    </span>

                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>

                    <button

                      type="button"

                      onClick={() => onAcceptJoinRequest?.(req.requestId)}

                      style={{

                        padding: "5px 12px",

                        background: "#16a34a",

                        color: "#fff",

                        border: "none",

                        borderRadius: "6px",

                        fontSize: "11px",

                        fontWeight: 700,

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        gap: "4px",

                      }}

                    >

                      ✓ ACCEPT

                    </button>

                    <button

                      type="button"

                      onClick={() => onRejectJoinRequest?.(req.requestId)}

                      style={{

                        padding: "5px 10px",

                        background: "rgba(220, 38, 38, 0.25)",

                        color: "#fca5a5",

                        border: "1px solid rgba(239, 68, 68, 0.6)",

                        borderRadius: "6px",

                        fontSize: "11px",

                        fontWeight: 700,

                        cursor: "pointer",

                      }}

                    >

                      ✕ DECLINE

                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}



        <div className="lobby-list">

          {players.map((player, index) => {

            const isSelf = index === localPlayerId

            return (

              <div

                className="lobby-player"

                key={player.id}

                style={isSelf ? { outline: "2px solid var(--gold)", borderRadius: "8px" } : {}}

                onClick={() => {

                  if (!multiplayerClient.getRoomCode()) {

                    setLocalPlayerId?.(index)

                  }

                }}

              >

                <Token player={player} active={isSelf} />

                <div className="lobby-name">

                  {isSelf ? (

                    <div

                      style={{

                        display: "flex",

                        flexDirection: "column",

                        gap: "4px",

                      }}

                    >

                      <label

                        style={{

                          fontSize: "9px",

                          color: "var(--ink-soft)",

                          fontWeight: 700,

                          letterSpacing: "0.1em",

                        }}

                      >

                        YOUR PLAYER NAME {player.isHost ? (player.isOriginalHost !== false ? "(HOST)" : "(ACTING HOST)") : (index === 0 && !isMultiplayer ? "(HOST)" : "")}

                      </label>

                      <input

                        type="text"

                        value={player.name}

                        maxLength={20}

                        onChange={(e) => {

                          setNameValidationError(null)

                          onUpdatePlayerName(index, e.target.value)

                        }}

                        onBlur={() => {

                          const trimmed = player.name.trim()

                          if (trimmed.length === 0) {

                            setNameValidationError("Player name cannot be empty.")

                          } else {

                            setNameValidationError(null)

                            if (trimmed !== player.name) {

                              onUpdatePlayerName(index, trimmed)

                            }

                          }

                        }}

                        placeholder="Enter your name"

                        style={{

                          height: "32px",

                          borderRadius: "8px",

                          border: nameValidationError ? "1.5px solid var(--red)" : "1px solid var(--gold)",

                          padding: "0 10px",

                          fontSize: "13px",

                          fontWeight: 600,

                          background: "#ffffff",

                          color: "#0f172a",

                        }}

                      />

                      {nameValidationError && (

                        <small style={{ color: "var(--red)", fontSize: "10px", marginTop: "2px" }}>

                          {nameValidationError}

                        </small>

                      )}

                      <label

                        style={{

                          fontSize: "9px",

                          color: "var(--ink-soft)",

                          fontWeight: 700,

                          letterSpacing: "0.1em",

                          marginTop: "2px",

                        }}

                      >

                        YOUR TOKEN COLOR

                      </label>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>

                        {AVAILABLE_PLAYER_COLORS.map((c) => {

                          const isTaken = players.some((p, pIdx) => pIdx !== index && p.connected !== false && !p.isLeft && p.color?.toLowerCase() === c.id)

                          const isCurrent = player.color?.toLowerCase() === c.id

                          return (

                            <button

                              key={c.id}

                              type="button"

                              onClick={(e) => {

                                e.stopPropagation()

                                if (isTaken) {

                                  const available = AVAILABLE_PLAYER_COLORS.filter(

                                    (ac) => !players.some((p) => p.connected !== false && !p.isLeft && p.color?.toLowerCase() === ac.id)

                                  ).map((ac) => ac.name).join(", ")

                                  setColorValidationError(`Color '${c.name}' is already chosen by another player. Available: ${available || "None"}`)

                                  return

                                }

                                setColorValidationError(null)

                                onUpdatePlayerColor?.(index, c.id)

                              }}

                              title={isTaken ? `${c.name} (Taken)` : c.name}

                              style={{

                                background: "transparent",

                                padding: 0,

                                border: "none",

                                opacity: isTaken ? 0.35 : 1,

                                cursor: isTaken ? "not-allowed" : "pointer",

                              }}

                            >

                              <PlayerPuck

                                player={{ name: c.name, color: c.id, token: c.name.charAt(0) }}

                                size="sm"

                                active={isCurrent}

                              />

                            </button>

                          )

                        })}

                      </div>

                      {colorValidationError && (

                        <small style={{ color: "var(--red)", fontSize: "10px", marginTop: "2px" }}>

                          {colorValidationError}

                        </small>

                      )}

                    </div>

                  ) : (

                    <strong>{player.name}</strong>

                  )}

                  <small>

                    {player.color.toUpperCase()} ·{" "}

                    {player.isHost

                      ? (player.isOriginalHost !== false ? "Crown (HOST)" : "Crown (ACTING HOST)")

                      : (index === 0 && !isMultiplayer)

                        ? "Crown (HOST)"

                        : [

                            "Lamp",

                            "Turret",

                            "Ship",

                            "Diamond",

                            "Ring",

                          ][index - 1] || "Player"}

                    {isSelf ? " · [YOU]" : ""}

                  </small>

                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                  <span className="ready-pill" style={isSelf ? { background: "var(--gold)", color: "var(--ink)" } : {}}>

                    {isSelf ? "YOU" : "READY"}

                  </span>

                  {isLocalHost && !player.isHost && (

                    <button

                      type="button"

                      className="lobby-kick-btn"

                      onClick={(e) => {

                        e.stopPropagation()

                        onRemovePlayer?.(index)

                      }}

                      title={`Host Control: Remove ${player.name} from lobby`}

                      style={{

                        padding: "4px 8px",

                        background: "rgba(220, 38, 38, 0.2)",

                        border: "1px solid rgba(239, 68, 68, 0.6)",

                        borderRadius: "6px",

                        color: "#fca5a5",

                        fontFamily: '"Oswald", sans-serif',

                        fontSize: "10px",

                        fontWeight: 700,

                        letterSpacing: "0.08em",

                        cursor: "pointer",

                        transition: "all 0.15s ease",

                      }}

                    >

                      ✕ REMOVE

                    </button>

                  )}

                </div>

              </div>

            )

          })}

        </div>



        {/* Lobby Rules Summary */}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>

          <div className="lobby-tip" style={{ margin: 0 }}>

            <span>MATCH RULES {isLocalHost ? "(YOU ARE HOST)" : "(HOST CONTROLLED)"}</span>

            Timer: {timerEnabled ? `${timerSeconds}s per turn` : "Disabled"} · Starting Cash: ₹{startingMoney.toLocaleString()} · Start Bonus: ₹{(Math.floor((startingMoney * 5 + 5000) / 10000) * 100).toLocaleString()} (5%) · Doubles: {doublesRule ? "Classic (Extra Roll)" : "Single Roll (Doubles Off)"}

          </div>

        </div>

      </div>



      {startGameError && (

        <div

          style={{

            margin: "0 16px 10px 16px",

            padding: "10px 14px",

            borderRadius: "8px",

            background: "rgba(142, 35, 56, 0.15)",

            border: "1px solid var(--red)",

            color: "var(--red)",

            fontSize: "12px",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

          }}

        >

          <span>{startGameError}</span>

          {onClearStartError && (

            <button

              onClick={onClearStartError}

              style={{

                background: "transparent",

                border: "none",

                color: "var(--red)",

                fontWeight: "bold",

                cursor: "pointer",

                padding: "2px 6px",

                fontSize: "14px",

              }}

            >

              ✕

            </button>

          )}

        </div>

      )}



      <div className="sticky-action dual">

        <Button variant="secondary" onClick={() => {

          if (navigator?.clipboard) {

            navigator.clipboard.writeText(window.location.origin + "?join=" + roomCode)

          }

        }}>INVITE</Button>

        {isLocalHost && onOpenHostSettings && (

          <Button variant="secondary" onClick={onOpenHostSettings}>

            HOST SETTINGS

          </Button>

        )}

        {isLocalHost ? (

          <Button onClick={onStartGame} icon="arrow">

            START GAME

          </Button>

        ) : (

          <button

            disabled

            style={{

              flex: 1,

              padding: "12px",

              borderRadius: "10px",

              background: "rgba(255,255,255,0.08)",

              border: "1px dashed var(--gold)",

              color: "var(--gold-300)",

              fontSize: "12px",

              fontWeight: 700,

              fontFamily: "Oswald, sans-serif",

              letterSpacing: "0.08em",

              cursor: "not-allowed",

              textAlign: "center",

            }}

          >

            WAITING FOR HOST TO START

          </button>

        )}

      </div>



      {showQuitConfirm && (

        <div className="modal-backdrop" onClick={() => !isLeavingRoom && setShowQuitConfirm(false)}>

          <div

            className="modal-sheet"

            onClick={(e) => e.stopPropagation()}

            style={{ maxWidth: "420px", margin: "auto" }}

          >

            <div className="sheet-handle" />

            <div className="modal-header">

              <strong>LEAVE ROOM</strong>

              <button

                onClick={() => !isLeavingRoom && setShowQuitConfirm(false)}

                disabled={isLeavingRoom}

                aria-label="Close"

              >

                ✕

              </button>

            </div>

            <div style={{ padding: "18px 16px", textAlign: "center" }}>

              <p style={{ color: "var(--ink)", fontSize: "14px", marginBottom: "8px", fontWeight: 700 }}>

                Leave Lobby & Return to Main Menu?

              </p>

              <p style={{ color: "var(--ink-soft)", fontSize: "12px", marginBottom: "16px", lineHeight: 1.5 }}>

                Are you sure you want to quit room <strong>"{roomCode}"</strong>?

                {isLocalHost

                  ? " As the host, host authority will transfer to an eligible remaining player."

                  : " Your seat will be vacated."}

              </p>

              {leaveError && (

                <div

                  style={{

                    marginBottom: "14px",

                    padding: "8px 12px",

                    background: "rgba(220, 38, 38, 0.15)",

                    border: "1px solid var(--red)",

                    borderRadius: "6px",

                    color: "var(--red)",

                    fontSize: "12px",

                  }}

                >

                  {leaveError}

                </div>

              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>

                <Button variant="ghost" onClick={() => setShowQuitConfirm(false)} disabled={isLeavingRoom}>

                  Cancel

                </Button>

                <Button

                  variant="danger"

                  onClick={handleConfirmQuitLobby}

                  disabled={isLeavingRoom}

                >

                  {isLeavingRoom ? "Leaving..." : "Confirm Leave"}

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>

  )

}



// ─── BOARD SPACE LABEL MEASURED-FIT ──────────────────────────────────────────



let textMeasureCanvas: HTMLCanvasElement | null = null



function measureWordWidth(

  word: string,

  fontSize: number,

  fontWeight: number = 700,

  fontFamily: string = "Oswald",

): number {

  if (typeof document === "undefined") {

    return word.length * fontSize * 0.48

  }

  if (!textMeasureCanvas) {

    textMeasureCanvas = document.createElement("canvas")

  }

  const ctx = textMeasureCanvas.getContext("2d")

  if (!ctx) {

    return word.length * fontSize * 0.48

  }

  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`

  return ctx.measureText(word).width

}



function calculateFittingFontSize(

  lines: string[],

  usableW: number,

  usableH: number,

  isCorner: boolean,

): number {

  const maxFs = isCorner ? 14.5 : 12.0

  const minFs = 6.5

  const fontFamily = isCorner ? "Playfair Display" : "DM Sans"

  const fontWeight = isCorner ? 800 : 600

  const lineHeightMultiplier = isCorner ? 1.1 : 1.12

  const targetW = usableW * 0.88 // 12% safety margin to ensure no overflow on phones



  if (usableW <= 0 || usableH <= 0) return 10



  let low = minFs

  let high = maxFs

  let best = minFs



  for (let iter = 0; iter < 8; iter++) {

    const mid = (low + high) / 2

    let fits = true

    const totalH = lines.length * mid * lineHeightMultiplier

    if (totalH > usableH) {

      fits = false

    } else {

      for (const line of lines) {

        const measuredW = measureWordWidth(line, mid, fontWeight, fontFamily)

        if (measuredW > targetW) {

          fits = false

          break

        }

      }

    }

    if (fits) {

      best = mid

      low = mid // Try larger

    } else {

      high = mid // Try smaller

    }

  }



  return Math.round(best * 10) / 10

}



function BoardSpaceLabel({

  space,

  price,

  boardWidth,

}: {

  space: BoardSpaceDefinition

  price?: number

  boardWidth: number

}) {

  const isCorner = space.type === "corner"

  const tile1fr = boardWidth / 11.4

  const tile17fr = 1.7 * tile1fr



  // Usable width and height calculation

  // For side-left & side-right, layout width is 1.0fr (tile1fr) because of our rotated box sizing

  const usableW = isCorner

    ? Math.max(20, tile17fr - 8)

    : Math.max(16, tile1fr - 5)



  const hasPrice = space.type === "city" || space.type === "special" || space.type === "tax"

  const usableH = isCorner

    ? Math.max(20, tile17fr - 10)

    : hasPrice

      ? Math.max(16, tile17fr * 0.74 - 15)

      : Math.max(18, tile17fr * 0.86 - 6)



  // Split multi-word names strictly at space boundaries so words never break in half

  const words = space.name.split(" ")

  const lines = words



  const fontSize = calculateFittingFontSize(lines, usableW, usableH, isCorner)

  const specialPropId = space.type === "special" ? space.propertyId : undefined



  if (space.index === 9) {
    return (
      <div className="jail-tile-split" aria-label="Jail: In Jail and Just Visiting">
        <div className="jail-cell-zone">
          <svg className="jail-bars-svg" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <rect x="2" y="1" width="20" height="18" rx="2" strokeWidth="1.4" opacity="0.4" />
            <line x1="2" y1="5" x2="22" y2="5" />
            <line x1="2" y1="15" x2="22" y2="15" />
            <line x1="6" y1="1" x2="6" y2="19" />
            <line x1="10" y1="1" x2="10" y2="19" />
            <line x1="14" y1="1" x2="14" y2="19" />
            <line x1="18" y1="1" x2="18" y2="19" />
          </svg>
          <span className="jail-cell-label">IN JAIL</span>
        </div>
        <div className="jail-visiting-zone">
          <span className="jail-visiting-label">JUST VISITING</span>
        </div>
      </div>
    )
  }

  return (

    <div className="board-space-content">

      {specialPropId && (

        <span className="special-space-icon" aria-hidden="true">

          <SpecialPropertyIcon propertyId={specialPropId} size={15} />

        </span>

      )}

      <b

        className="board-space-label"

        style={{

          fontSize: `${fontSize}px`,

          lineHeight: 1.15,

          wordBreak: "keep-all",

          overflowWrap: "normal",

          maxWidth: "100%",

          overflow: "hidden",

          textOverflow: "ellipsis",

        }}

      >

        {lines.map((line, idx) => (

          <span

            key={idx}

            className="space-name-line"

            style={{

              display: "block",

              whiteSpace: "nowrap",

              wordBreak: "keep-all",

              overflowWrap: "normal",

              maxWidth: "100%",

              overflow: "hidden",

              textOverflow: "ellipsis",

            }}

          >

            {line}

          </span>

        ))}

      </b>

      {price ? <span className="price-chip">₹{price.toLocaleString()}</span> : null}

    </div>

  )

}



// ─── ANIMATED CASH TRANSFERS & BALANCE ────────────────────────────────────────



function AnimatedBalance({

  value,

  duration = 800,

  reducedMotion = false,

}: {

  value: number

  duration?: number

  reducedMotion?: boolean

}) {

  const [displayVal, setDisplayVal] = useState(value)

  const prevValRef = useRef(value)

  const animRef = useRef<number | null>(null)



  useEffect(() => {

    if (reducedMotion || prevValRef.current === value) {

      setDisplayVal(value)

      prevValRef.current = value

      return

    }



    const startVal = prevValRef.current

    const targetVal = value

    const startTime = performance.now()



    const tick = (now: number) => {

      const elapsed = now - startTime

      const progress = Math.min(1, elapsed / duration)

      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const current = Math.round(startVal + (targetVal - startVal) * ease)

      setDisplayVal(current)



      if (progress < 1) {

        animRef.current = requestAnimationFrame(tick)

      } else {

        setDisplayVal(targetVal)

        prevValRef.current = targetVal

      }

    }



    animRef.current = requestAnimationFrame(tick)

    return () => {

      if (animRef.current) cancelAnimationFrame(animRef.current)

    }

  }, [value, duration, reducedMotion])



  return <span>₹{displayVal.toLocaleString()}</span>

}



export interface ActiveCashTransfer {

  id: string

  amount: number

  type: string

  payerId: number

  payerName: string

  payerColor: string

  recipientId: number

  recipientName: string

  recipientColor: string

  isBank: boolean

  timestamp: number

}



function CashTransfersOverlay({

  transfers,

  reducedMotion = false,

}: {

  transfers: ActiveCashTransfer[]

  reducedMotion?: boolean

}) {

  if (!transfers || transfers.length === 0) return null



  // Strictly enforce at most TWO simultaneously visible notifications

  const visibleTransfers = transfers.slice(-2)

  if (visibleTransfers.length === 0) return null



  return (

    <div className="cash-transfers-overlay" aria-live="polite" aria-atomic="true">

      {visibleTransfers.map((t) => {

        const isP2P = !t.isBank && t.recipientId >= 0

        const typeUp = t.type.toUpperCase()

        const isIncome = typeUp.includes("REWARD") || typeUp.includes("PASS") || typeUp.includes("MORTGAGE") || typeUp.includes("REFUND")

        

        let pillClass = "cash-transfer-pill p2p"

        if (!isP2P) {

          pillClass = isIncome ? "cash-transfer-pill bank-income" : "cash-transfer-pill bank-expense"

        }



        return (

          <div

            key={t.id}

            className={pillClass}

            style={reducedMotion ? { animation: "none" } : undefined}

          >

            {isP2P ? (

              <>

                <span className="transfer-type-tag" style={{ color: "#b45309", fontWeight: 800 }}>TRANSFER</span>

                <span style={{ color: "var(--text-primary, #1e2024)", fontWeight: 700 }}>₹{t.amount.toLocaleString()}</span>

                <span style={{ opacity: 0.4, color: "var(--text-muted, #686d76)" }}>•</span>

                <span style={{ color: getPlayerColorHex(t.payerColor), fontWeight: 700 }}>{t.payerName}</span>

                <span style={{ color: "var(--gold, #b45309)" }}>➔</span>

                <span style={{ color: getPlayerColorHex(t.recipientColor), fontWeight: 700 }}>{t.recipientName}</span>

              </>

            ) : isIncome ? (

              <>

                <span className="transfer-type-tag" style={{ color: "var(--financial-gain, #059669)", fontWeight: 800 }}>PAYOUT</span>

                <span style={{ color: "var(--financial-gain, #047857)", fontWeight: 800 }}>+₹{t.amount.toLocaleString()}</span>

                <span style={{ opacity: 0.4, color: "var(--text-muted, #686d76)" }}>•</span>

                <span className="bank-party-label" style={{ color: "var(--gold-bright, #b45309)", fontWeight: 700 }}>Bank ➔</span>

                <span style={{ color: getPlayerColorHex(t.payerColor), fontWeight: 700 }}>{t.payerName}</span>

              </>

            ) : (

              <>

                <span className="transfer-type-tag" style={{ color: "var(--financial-loss, #be123c)", fontWeight: 800 }}>PAYMENT</span>

                <span style={{ color: "var(--financial-loss, #9f1239)", fontWeight: 800 }}>-₹{t.amount.toLocaleString()}</span>

                <span style={{ opacity: 0.4, color: "var(--text-muted, #686d76)" }}>•</span>

                <span style={{ color: getPlayerColorHex(t.payerColor), fontWeight: 700 }}>{t.payerName}</span>

                <span className="bank-party-label" style={{ color: "var(--gold-bright, #b45309)", fontWeight: 700 }}>➔ Bank</span>

              </>

            )}

          </div>

        )

      })}

    </div>

  )

}



// ─── BOARD ────────────────────────────────────────────────────────────────────



function Board({

  onSelectSpace,

  playerPositions,

  players = initialPlayers,

  moving = false,

  movingPlayerIndex = null,

  activePlayerIndex = 0,

  localPlayerId = 0,

  isMultiplayer = false,

  activeNotification = null,

  queueCount = 0,

  onDismissNotification = () => {},

  isDismissingNotification = false,

  pendingPurchase = null,

  onConfirmBuyCenter = () => {},

  onDeclineCenter = () => {},

  isSubmittingPurchase = false,

  isHumanTurn = false,

  stepDuration = 180,

  recentEvents = [],

  onOpenFullLog,

  selectedPlayerIdHighlight,

  selectedPropertyIdHighlight,

  landingHighlightTileIndex,

}: {

  onSelectSpace: (space: BoardSpaceDefinition) => void

  playerPositions: number[]

  players?: EnginePlayer[]

  moving?: boolean

  movingPlayerIndex?: number | null

  activePlayerIndex?: number

  localPlayerId?: number

  isMultiplayer?: boolean

  activeNotification?: BoardCenterNotificationItem | null

  queueCount?: number

  onDismissNotification?: () => void

  isDismissingNotification?: boolean

  pendingPurchase?: PendingPurchaseInfo | null

  onConfirmBuyCenter?: () => void

  onDeclineCenter?: () => void

  isSubmittingPurchase?: boolean

  isHumanTurn?: boolean

  stepDuration?: number

  recentEvents?: GameplayEventEntry[]

  onOpenFullLog?: () => void

  selectedPlayerIdHighlight?: number | null

  selectedPropertyIdHighlight?: string | null

  landingHighlightTileIndex?: number | null

}) {

  const [boardWidth, setBoardWidth] = useState<number>(() => {

    if (typeof window !== "undefined") {

      return Math.min(window.innerWidth - 32, 600)

    }

    return 600

  })

  const gridRef = useRef<HTMLDivElement>(null)



  useEffect(() => {

    if (!gridRef.current) return

    const updateWidth = () => {

      if (gridRef.current) {

        const w = gridRef.current.clientWidth

        if (w > 0) setBoardWidth(w)

      }

    }

    updateWidth()



    let ro: ResizeObserver | null = null

    if (typeof ResizeObserver !== "undefined") {

      ro = new ResizeObserver(() => {

        updateWidth()

      })

      ro.observe(gridRef.current)

    }



    window.addEventListener("resize", updateWidth)

    return () => {

      if (ro) ro.disconnect()

      window.removeEventListener("resize", updateWidth)

    }

  }, [])



  return (

    <div className="board-shell">

      <div className="board-grid" ref={gridRef}>

        <div className="board-center">

          <span className="map-line map-line-one" />

          <span className="map-line map-line-two" />

          <div className="board-compass">N</div>

          <div className="board-center-logo">

            <Logo compact />

            <span className="board-center-motto">THE EMPIRE AWAITS</span>

          </div>

          {(() => {

            const isPendingBuyer = Boolean(

              pendingPurchase &&

              isHumanTurn &&

              (!isMultiplayer || (pendingPurchase.buyerId === localPlayerId && activePlayerIndex === localPlayerId))

            )

            const purchaseInfo: PendingPurchaseInfo | null = isPendingBuyer && pendingPurchase ? pendingPurchase : null

            return (

              <>

                {!purchaseInfo && (

                  <BoardCenterRecentEvents

                    events={recentEvents}

                    onOpenFullLog={onOpenFullLog}

                  />

                )}

                {purchaseInfo ? (() => {

                  const currentBuyer = players.find((p) => p.id === purchaseInfo.buyerId) || players[purchaseInfo.buyerId]

                  const latestBuyerCash = currentBuyer ? currentBuyer.money : purchaseInfo.buyerMoney

                  const canAfford = latestBuyerCash >= purchaseInfo.purchasePrice

                  if (!canAfford) return null

                  const activePending: PendingPurchaseInfo = {

                    ...purchaseInfo,

                    buyerMoney: latestBuyerCash,

                    canAfford: true,

                  }

                  return (

                    <BoardCenterPurchaseControl

                      pending={activePending}

                      onBuy={onConfirmBuyCenter}

                      onDecline={onDeclineCenter}

                      isSubmitting={isSubmittingPurchase}

                    />

                  )

                })() : null}

              </>

            )

          })()}

        </div>



        {/* Continuous Gliding Tokens Overlay centered inside board tiles */}

        <div className="board-tokens-overlay" aria-hidden="true">

          {players.map((player, idx) => {

            const tileIdx = (((playerPositions[idx] !== undefined ? playerPositions[idx] : (player.position ?? 0)) % 36) + 36) % 36

            const isDetained = Boolean(tileIdx === 9 && (player.inJail || (player.jailTurns ?? 0) > 0))

            const center = getTileCenterPercent(tileIdx, isDetained)

            const targetMovingIndex =

              movingPlayerIndex !== null && movingPlayerIndex !== undefined

                ? movingPlayerIndex

                : activePlayerIndex

            const isGliding = Boolean(moving && idx === targetMovingIndex)

            const playersOnSameTile = players

              .map((p, pIdx) => ({ p, pIdx }))

              .filter((item) => {

                const pTile = (((playerPositions[item.pIdx] !== undefined ? playerPositions[item.pIdx] : (item.p.position ?? 0)) % 36) + 36) % 36

                if (pTile !== tileIdx) return false

                if (tileIdx === 9) {

                  const itemDetained = Boolean(item.p.inJail || (item.p.jailTurns ?? 0) > 0)

                  return itemDetained === isDetained

                }

                return true

              })

            const rank = playersOnSameTile.findIndex((item) => item.pIdx === idx)

            const offset = getMultiTokenOffset(rank >= 0 ? rank : 0, playersOnSameTile.length)



            return (

              <div

                key={player.id}

                className={`board-gliding-token-wrapper ${isGliding ? "is-gliding" : ""}`}

                style={{

                  left: `${center.x}%`,

                  top: `${center.y}%`,

                  transform: `translate(calc(-50% + ${offset.dx}px), calc(-50% + ${offset.dy}px))`,

                  transition: isGliding

                    ? `left ${stepDuration}ms ${EASE_OUT_EXPO}, top ${stepDuration}ms ${EASE_OUT_EXPO}`

                    : "none",

                }}

              >

                <Token

                  player={player}

                  size="sm"

                  active={idx === (moving ? targetMovingIndex : activePlayerIndex)}

                  gliding={isGliding}

                  className={isGliding ? "token-gliding" : ""}

                />

              </div>

            )

          })}

        </div>



        {BOARD_SPACES.map((space) => {

          const pos = BOARD_POSITIONS[space.index]



          const isCity = space.type === "city"



          const isSpecial = space.type === "special"



          const isRailway = space.propertyId === "railway" || space.name.toUpperCase().includes("RAILWAY")



          const cityData =

            isCity && space.propertyId

              ? CITY_PROPERTIES[space.propertyId]

              : null



          const specialData =

            isSpecial && space.propertyId

              ? SPECIAL_PROPERTIES[space.propertyId]

              : null



          const price = cityData?.purchasePrice || specialData?.purchasePrice



          const spaceClass =

            space.type === "corner"

              ? "space-corner"

              : isRailway

                ? "space-special space-railway"

                : space.type === "chance"

                  ? "space-chance"

                  : space.type === "chest"

                    ? "space-chest"

                    : space.type === "tax"

                      ? "space-tax"

                      : space.type === "special"

                        ? "space-special"

                        : `space-${space.colorGroup.toLowerCase()}`



          const propertyOwner = space.propertyId

            ? players.find((p) => p.ownedProperties.includes(space.propertyId!))

            : null



          const isOwnerHighlighted =

            selectedPlayerIdHighlight !== null &&

            selectedPlayerIdHighlight !== undefined &&

            propertyOwner?.id === selectedPlayerIdHighlight



          const isPropertyHighlighted = Boolean(

            selectedPropertyIdHighlight && space.propertyId === selectedPropertyIdHighlight,

          )



          const isLandingHighlighted = Boolean(

            landingHighlightTileIndex !== null &&

            landingHighlightTileIndex !== undefined &&

            landingHighlightTileIndex === space.index &&

            !propertyOwner,

          )



          const highlightClass = `${isOwnerHighlighted ? "is-owner-highlighted" : ""} ${isPropertyHighlighted ? "is-property-highlighted" : ""} ${isLandingHighlighted ? "is-landing-highlighted" : ""}`.trim()



          const isMortgaged =

            space.propertyId && propertyOwner

              ? !!propertyOwner.mortgages[space.propertyId]

              : false



          const buildingCount =

            space.propertyId && propertyOwner

              ? propertyOwner.buildings[space.propertyId] || 0

              : 0



          return (

            <button

              key={space.index}

              className={`board-space ${spaceClass} side-${space.side} ${highlightClass}`}

              style={{

                gridRow: pos.row,



                gridColumn: pos.col,



                ...(space.colorGroup !== "NONE"

                  ? getPropertyThemeStyle(space.colorGroup)

                  : {}),



                ...(isOwnerHighlighted && propertyOwner

                  ? { ["--highlight-owner-color" as any]: getPlayerColorHex(propertyOwner.color) }

                  : {}),

              }}

              onClick={() => onSelectSpace(space)}

              aria-label={`${space.name} (Index ${space.index})`}

            >

              {propertyOwner && (

                <div

                  className="tile-ownership-ring"

                  aria-hidden="true"

                />

              )}

              {isCity && space.colorGroup !== "NONE" && <span className="space-band" />}

              <BoardSpaceLabel

                space={space}

                price={price}

                boardWidth={boardWidth}

              />

              <MortgageStatusIndicator

                isMortgaged={isMortgaged}

                variant="tile"

                side={space.side}

                ownerName={propertyOwner?.name}

              />

              {buildingCount > 0 && propertyOwner && !isMortgaged && (

                <div

                  className={`tile-buildings-container side-${space.side} ${buildingCount >= 4 ? "has-hotel" : "has-houses"}`}

                  title={buildingCount >= 4 ? `Hotel constructed by ${propertyOwner.name}` : `${buildingCount} House${buildingCount > 1 ? "s" : ""} built by ${propertyOwner.name}`}

                  aria-label={buildingCount >= 4 ? "Hotel" : `${buildingCount} Houses`}

                >

                  {buildingCount >= 4 ? (

                    <span

                      className="building-marker-hotel"

                      style={{ color: "#ffffff" }}

                    >

                      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">

                        <path d="M5.5 17.5V5.5C5.5 3.8 6.9 2.5 8.5 2.5H15.5C17.1 2.5 18.5 3.8 18.5 5.5V17.5H20C21.1 17.5 22 18.4 22 19.5C22 20.6 21.1 21.5 20 21.5H4C2.9 21.5 2 20.6 2 19.5C2 18.4 2.9 17.5 4 17.5H5.5Z" />

                      </svg>

                    </span>

                  ) : (

                    <span

                      className="building-marker-house-group"

                      style={{ color: "#ffffff" }}

                    >

                      <span className="building-marker-house">

                        <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">

                          <path d="M8.5 5.5C10.2 4 13.8 4 15.5 5.5L19.8 10.2C20.6 11 20.2 12.5 18.8 12.5H17.5V17.5C17.5 19.2 16.2 20.5 14.5 20.5H9.5C7.8 20.5 6.5 19.2 6.5 17.5V12.5H5.2C3.8 12.5 3.4 11 4.2 10.2L8.5 5.5Z" />

                        </svg>

                      </span>

                      {buildingCount > 1 && (

                        <span className="building-count-badge">

                          {"\u00D7"}{buildingCount}

                        </span>

                      )}

                    </span>

                  )}

                </div>

              )}

              {propertyOwner && (

                <span

                  className={`tile-owner-indicator side-${space.side}`}

                  style={{

                    backgroundColor: getPlayerColorHex(propertyOwner.color),

                    borderColor: getPlayerColorHex(propertyOwner.color),

                    boxShadow: `0 0 6px 1.5px ${getPlayerColorHex(propertyOwner.color)}aa, inset 0 0 2px rgba(255, 255, 255, 0.45)`,

                  }}

                  title={`Owned by ${propertyOwner.name} (${propertyOwner.color})`}

                />

              )}

            </button>

          )

        })}

      </div>

    </div>

  )

}



// ─── PLAYER STRIP ─────────────────────────────────────────────────────────────



function PlayerStrip({

  players,

  openPlayers,

  activePlayerIndex,

  playerPositions,

  isHost = false,

  isMultiplayer = false,

  localPlayerId,

  onKickPlayer,

  selectedPlayerIdHighlight,

  onToggleSelectPlayerHighlight,

  reducedMotion = false,

}: {

  players: EnginePlayer[]

  openPlayers: () => void

  activePlayerIndex: number

  playerPositions: number[]

  isHost?: boolean

  isMultiplayer?: boolean

  localPlayerId?: number

  onKickPlayer?: (playerId: number) => void

  selectedPlayerIdHighlight?: number | null

  onToggleSelectPlayerHighlight?: (playerId: number) => void

  reducedMotion?: boolean

}) {

  return (

    <section className="player-strip">

      <div className="player-strip-inner">

        {players.map((player, idx) => {

          const isActive = idx === activePlayerIndex

          const isHighlightSelected = selectedPlayerIdHighlight === player.id

          const pos = playerPositions[idx] || 0

          const space = BOARD_SPACES[pos]

          const propCount = player.ownedProperties?.length ?? 0

          const isBankrupt = (player as { isBankrupt?: boolean }).isBankrupt ?? false

          const isJailed = (player as { isJailed?: boolean }).isJailed ?? false

          const isResting = Boolean((player as any).inRestHouse || (player as any).isResting)

          const canKick = isHost && isMultiplayer && player.id !== localPlayerId && !isBankrupt



          let statusIcon = ""

          let statusClass = ""

          if (isBankrupt) { statusIcon = "BANKRUPT"; statusClass = "bankrupt" }

          else if (isJailed) { statusIcon = "JAILED"; statusClass = "jailed" }

          else if (isResting) { statusIcon = "RESTING"; statusClass = "resting" }



          return (

            <div

              key={player.id}

              className={`ps-player ${isActive ? "ps-active" : ""} ${isHighlightSelected ? "ps-selected-highlight" : ""} ${statusClass}`}

              onClick={() => onToggleSelectPlayerHighlight?.(player.id)}

              style={{ cursor: "pointer" }}

              title={`Click to ${isHighlightSelected ? "clear highlight" : "highlight properties on board"}`}

            >

              <Token player={player} active={isActive} />

              <div className="ps-info">

                <div className="ps-name">

                  {player.name}

                  {statusIcon && <span className="ps-status-icon">{statusIcon}</span>}

                  {canKick && (

                    <button

                      type="button"

                      className="ps-kick-btn"

                      onClick={(e) => {

                        e.stopPropagation()

                        if (window.confirm(`Kick ${player.name} from the match?`)) {

                          onKickPlayer?.(player.id)

                        }

                      }}

                      title={`Host Control: Kick ${player.name} from match`}

                      style={{

                        marginLeft: "4px",

                        padding: "1px 5px",

                        fontSize: "9px",

                        fontWeight: 700,

                        background: "rgba(239, 68, 68, 0.25)",

                        border: "1px solid rgba(239, 68, 68, 0.6)",

                        borderRadius: "3px",

                        color: "#fca5a5",

                        cursor: "pointer",

                      }}

                    >

                      KICK

                    </button>

                  )}

                </div>

                <div className="ps-balance">

                  <AnimatedBalance value={player.money} reducedMotion={reducedMotion} />

                </div>

                <div className="ps-meta">

                  <span className="ps-pos" title={`At ${space?.name ?? pos}`}>#{pos}</span>

                  {propCount > 0 && (

                    <span className="ps-props" title={`${propCount} properties`}>{propCount}P</span>

                  )}

                </div>

              </div>

              {isActive && <div className="ps-active-bar" />}

            </div>

          )

        })}

      </div>

      <button className="players-more" onClick={openPlayers}>

        <Icon name="users" size={18} />

        <span>{players.length}</span>

      </button>

    </section>

  )

}



// ─── DICE ─────────────────────────────────────────────────────────────────────



interface DiceProps {

  value: number

  rolling: boolean

  settling?: boolean

  settleDuration?: number

  dieIndex?: number

  reducedMotion?: boolean

  size?: number

}



function Dice({

  value,

  rolling,

  settling = false,

  settleDuration,

  dieIndex = 1,

  reducedMotion = false,

  size = 34,

}: DiceProps) {

  return (

    <Dice3D

      value={value}

      rolling={rolling}

      settling={settling}

      settleDuration={settleDuration}

      dieIndex={dieIndex}

      reducedMotion={reducedMotion}

      size={size}

    />

  )

}



function DeclarationDice({ total }: { total: number }) {

  const first = Math.max(1, total - 6)



  const second = total - first



  return (

    <div className="declaration-dice">

      <div className="dice-row">

        <Dice value={first} rolling={false} dieIndex={1} size={34} />

        <Dice value={second} rolling={false} dieIndex={2} size={34} />

      </div>

      <span>

        DICE RESULT <b>{total}</b>

      </span>

    </div>

  )

}



function ActivityLogModal({

  log,

  close,

}: {

  log: ActivityLogEntry[]

  close: () => void

}) {

  const [filter, setFilter] = useState<EventLogCategory>("ALL")



  const categoryCounts = useMemo(() => {

    const counts: Record<EventLogCategory, number> = {

      ALL: log.length,

      TURNS_DICE: 0,

      RENT_PAYMENTS: 0,

      PROPERTIES: 0,

      CONSTRUCTION: 0,

      CHANCE_CHEST: 0,

      MOVEMENT_LOCATIONS: 0,

      SYSTEM_ERRORS: 0,

    }

    for (const e of log) {

      for (const cat of EVENT_LOG_CATEGORIES) {

        if (cat.id !== "ALL" && matchEventCategory(e.type, cat.id)) {

          counts[cat.id]++

        }

      }

    }

    return counts

  }, [log])



  const filtered = useMemo(() => {

    if (filter === "ALL") return log

    return log.filter((e) => matchEventCategory(e.type, filter))

  }, [log, filter])



  const displayEntries = useMemo(() => [...filtered].reverse(), [filtered])



  return (

    <ModalShell

      title="TURN ACTIVITY LOG"

      close={close}

      className="activity-log-modal"

    >

      <div className="activity-log-subhead">

        <span>AUTHORITATIVE GAME EVENT FEED</span>

        <span className="ready-pill">{log.length} EVENTS</span>

      </div>

      <div className="activity-log-filter-row" style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px" }}>

        {EVENT_LOG_CATEGORIES.map((cat) => {

          const count = categoryCounts[cat.id] ?? 0

          return (

            <button

              key={cat.id}

              type="button"

              className={`activity-log-filter-btn ${filter === cat.id ? "active" : ""}`}

              onClick={() => setFilter(cat.id)}

              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}

            >

              <span>{cat.icon}</span>

              <span>{cat.label}</span>

              <span

                style={{

                  padding: "1px 5px",

                  borderRadius: "8px",

                  fontSize: "9px",

                  background: filter === cat.id ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)",

                }}

              >

                {count}

              </span>

            </button>

          )

        })}

      </div>

      <div className="activity-log-feed">

        {displayEntries.length === 0 ? (

          <div

            style={{

              textAlign: "center",

              padding: "28px",

              color: "var(--ink-soft)",

            }}

          >

            {filter === "ALL"

              ? "No activity events recorded yet."

              : `No ${EVENT_LOG_CATEGORIES.find((c) => c.id === filter)?.label || filter} events recorded yet.`}

          </div>

        ) : (

          displayEntries.map((entry) => {

            const date = new Date(entry.timestamp)

            const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`

            return (

              <div key={entry.id} className="activity-log-entry">

                <div className="activity-log-entry-left">

                  <span className="activity-log-seq">#{entry.id}</span>

                  <span className={`activity-log-type-tag ${entry.type}`}>

                    {entry.type.replace("_", " ")}

                  </span>

                </div>

                <div className="activity-log-body">

                  <div className="activity-log-headline">

                    <span className="activity-log-player-chip">

                      <span

                        style={{

                          width: "8px",

                          height: "8px",

                          borderRadius: "50%",

                          background: `var(--${entry.playerColor || "gold"})`,

                          display: "inline-block",

                        }}

                      />

                      {entry.playerName}

                    </span>

                    <span className="activity-log-time">{timeStr}</span>

                  </div>

                  <div className="activity-log-desc">{entry.description}</div>

                  {entry.amount !== 0 && (

                    <span

                      className={`activity-log-amount-tag ${

                        entry.amount > 0 ? "gain" : "loss"

                      }`}

                    >

                      {entry.amount > 0

                        ? `+Rs${entry.amount.toLocaleString()}`

                        : `-Rs${Math.abs(entry.amount).toLocaleString()}`}

                    </span>

                  )}

                </div>

              </div>

            )

          })

        )}

      </div>

      <Button variant="ghost" onClick={close} style={{ marginTop: "8px" }}>

        CLOSE LOG

      </Button>

    </ModalShell>

  )

}



function ConstructionManagerModal({

  activePlayer,

  close,

  onBuild,

  onDestroy,

  isSubmitting,

  rules,

  turnBuildingsBuilt = [],

  turnPurchasedProperties = [],

  activeLanding = null,

}: {

  activePlayer: EnginePlayer

  close: () => void

  onBuild: (propertyId: string) => Promise<void>

  onDestroy: (propertyId: string) => Promise<void>

  isSubmitting: boolean

  rules?: GameRules

  turnBuildingsBuilt?: string[]

  turnPurchasedProperties?: string[]

  activeLanding?: { propertyId: string | null; position: number; isActive: boolean } | null

}) {

  const [filterGroup, setFilterGroup] = useState<string>("ALL")



  const isRequireLanding = rules?.requireLandingToBuild ?? false



  // Find all city properties owned by active player

  const ownedCityProps = useMemo(() => {

    return (activePlayer.ownedProperties || [])

      .map((id) => CITY_PROPERTIES[id])

      .filter(Boolean)

  }, [activePlayer.ownedProperties])



  // Group status helper

  const isGroupComplete = (group: string) => {

    const groupCities = Object.values(CITY_PROPERTIES).filter((c) => c.colorGroup === group)

    return groupCities.every((c) => (activePlayer.ownedProperties || []).includes(c.id))

  }



  const getGroupOwnedCount = (group: string) => {

    const groupCities = Object.values(CITY_PROPERTIES).filter((c) => c.colorGroup === group)

    const owned = groupCities.filter((c) => (activePlayer.ownedProperties || []).includes(c.id))

    return { count: owned.length, total: groupCities.length }

  }



  const filteredProperties = useMemo(() => {

    if (filterGroup === "ALL") return ownedCityProps

    return ownedCityProps.filter((p) => p.colorGroup === filterGroup)

  }, [ownedCityProps, filterGroup])



  return (

    <ModalShell title="CONSTRUCTION MANAGER" close={close} className="construction-modal">

      <div className="construction-header-info">

        <div>

          <small>BUILDING EMPIRE OF</small>

          <strong>{activePlayer.name.toUpperCase()}</strong>

        </div>

        <div style={{ textAlign: "right" }}>

          <small>TREASURY BALANCE</small>

          <strong style={{ color: "var(--gold)" }}>₹{activePlayer.money.toLocaleString()}</strong>

        </div>

      </div>



      <div className="construction-subhead">

        {isRequireLanding

          ? "BUILD MODE A — LAND TO BUILD ACTIVE · MUST BE ON PROPERTY"

          : "BUILD MODE B — BUILD FROM ANYWHERE ACTIVE · MAX 1 BUILD PER PROPERTY PER TURN"}

      </div>



      <div className="activity-log-filter-row" style={{ margin: "6px 0 10px" }}>

        {["ALL", "GREEN", "YELLOW", "RED", "BLUE"].map((grp) => (

          <button

            key={grp}

            className={`activity-log-filter-btn ${filterGroup === grp ? "active" : ""}`}

            onClick={() => setFilterGroup(grp)}

          >

            {grp}

          </button>

        ))}

      </div>



      <div className="construction-property-list">

        {filteredProperties.length === 0 ? (

          <div style={{ textAlign: "center", padding: "26px 10px", color: "var(--ink-soft)" }}>

            {ownedCityProps.length === 0

              ? "No city properties owned yet. Land on and purchase properties to unlock construction."

              : `No properties owned in ${filterGroup} group.`}

          </div>

        ) : (

          filteredProperties.map((city) => {

            const theme = getColorGroupTheme(city.colorGroup)

            const isMortgaged = !!activePlayer.mortgages[city.id]

            const bCount = activePlayer.buildings[city.id] || 0

            const groupComplete = isGroupComplete(city.colorGroup)

            const { count, total } = getGroupOwnedCount(city.colorGroup)



            const propSpaceIndex = BOARD_SPACES.findIndex((s) => s.propertyId === city.id)

            const isCurrentlyOnProperty = activePlayer.position === propSpaceIndex

            const isLandingEligible = activeLanding

              ? (activeLanding.isActive && activeLanding.propertyId === city.id && activeLanding.position === propSpaceIndex)

              : isCurrentlyOnProperty



            const purchasedThisTurn = turnPurchasedProperties.includes(city.id)

            const builtThisTurn = turnBuildingsBuilt.includes(city.id)



            const canAfford = activePlayer.money >= city.buildingCost

            let canBuild = !isMortgaged && bCount < 4 && canAfford && !purchasedThisTurn && (isRequireLanding ? (isCurrentlyOnProperty && isLandingEligible) : !builtThisTurn)

            const canDestroy = bCount > 0



            // 50% refund, rounded to nearest 100

            const destroyRefund = Math.ceil(((city.buildingCost * 50) / 100) / 100) * 100



            // Reason if cannot build

            let buildReason = ""

            if (canBuild) {

              buildReason = ""

            } else if (bCount >= 4) {

              buildReason = "Maximum construction limit reached (Hotel)."

            } else if (isMortgaged) {

              buildReason = "Property is mortgaged."

            } else if (purchasedThisTurn) {

              buildReason = "You must wait until your next turn to build on this property."

            } else if (isRequireLanding && !isLandingEligible) {

              buildReason = "Land on this property during your turn to build."

            } else if (isRequireLanding && !isCurrentlyOnProperty) {

              buildReason = "You must be on this property to build."

            } else if (!isRequireLanding && builtThisTurn) {

              buildReason = "You have already built on this property this turn."

            } else if (!canAfford) {

              buildReason = `Needs ₹${city.buildingCost.toLocaleString()} (Short ₹${(city.buildingCost - activePlayer.money).toLocaleString()})`

            }



            const nextBType = bCount === 3 ? "Hotel" : `House #${bCount + 1}`



            return (

              <div key={city.id} className="construction-card">

                <div className="construction-card-top">

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                    <span

                      style={{

                        width: "12px",

                        height: "12px",

                        borderRadius: "3px",

                        background: theme.accent,

                        boxShadow: "0 0 4px rgba(0,0,0,0.2)",

                      }}

                    />

                    <div>

                      <strong>{city.name}</strong>

                      <small style={{ display: "block", color: "var(--ink-soft)", fontSize: "10px" }}>

                        {theme.label} · {bCount === 4 ? "HOTEL" : bCount > 0 ? `${bCount} HOUSES` : "UNDEVELOPED"}

                        {isMortgaged ? " · [MORTGAGED]" : ""}

                      </small>

                    </div>

                  </div>

                  <div className="construction-badge-row">

                    {[1, 2, 3, 4].map((slot) => (

                      <span

                        key={slot}

                        className={`construction-slot ${

                          bCount >= slot ? (slot === 4 ? "hotel-slot" : "house-slot") : ""

                        }`}

                        title={slot === 4 ? "Hotel" : `House ${slot}`}

                      >

                        {slot === 4 ? "H" : slot}

                      </span>

                    ))}

                  </div>

                </div>



                <div className="construction-card-body">

                  <div className="construction-metrics">

                    <span>

                      Rent: ₹{(

                        bCount === 4

                          ? city.hotelRent

                          : bCount === 3

                            ? city.rentThreeHouses

                            : bCount === 2

                              ? city.rentTwoHouses

                              : bCount === 1

                                ? city.rentOneHouse

                                : city.baseRent

                      ).toLocaleString()}

                    </span>

                    <span>Build Cost: ₹{city.buildingCost.toLocaleString()}</span>

                  </div>



                  {!canBuild && buildReason && (

                    <div className="construction-reason">

                      {buildReason}

                    </div>

                  )}



                  <div className="construction-actions">

                    <Button

                      onClick={() => onBuild(city.id)}

                      disabled={!canBuild || isSubmitting}

                      className="btn-sm"

                    >

                      {isSubmitting

                        ? "..."

                        : bCount >= 4

                          ? "HOTEL REACHED"

                          : purchasedThisTurn

                            ? "WAIT UNTIL NEXT TURN"

                            : isRequireLanding && !isCurrentlyOnProperty

                              ? "MUST BE ON PROPERTY"

                              : isRequireLanding && !isLandingEligible

                                ? "LAND ON PROPERTY TO BUILD"

                                : !isRequireLanding && builtThisTurn

                                  ? "BUILT THIS TURN"

                                  : `BUILD ${nextBType.toUpperCase()} · ₹${city.buildingCost.toLocaleString()}`}

                    </Button>

                    {canDestroy && (

                      <Button

                        variant="secondary"

                        onClick={() => onDestroy(city.id)}

                        disabled={isSubmitting}

                        className="btn-sm"

                        style={{ background: "rgba(113, 31, 49, 0.2)", borderColor: "var(--red)" }}

                      >

                        DESTROY ({bCount === 4 ? "HOTEL" : "HOUSE"}) · +₹{destroyRefund.toLocaleString()}

                      </Button>

                    )}

                  </div>

                </div>

              </div>

            )

          })

        )}

      </div>



      <Button variant="ghost" onClick={close} style={{ marginTop: "10px" }}>

        CLOSE MANAGER

      </Button>

    </ModalShell>

  )

}



// ─── PROPERTY CARD ────────────────────────────────────────────────────────────



function PropertyVisual({

  property,

  owned = false,

  isMortgaged = false,

  ownerName,

  ownerColor,

  buildingCount = 0,

  isGroupMonopoly = false,

  hasSpecialPair = false,

  hotelCount = 0,

}: {

  property?: PropertyDefinition | SpecialPropertyDefinition | null

  owned?: boolean

  isMortgaged?: boolean

  ownerName?: string

  ownerColor?: string

  buildingCount?: number

  isGroupMonopoly?: boolean

  hasSpecialPair?: boolean

  hotelCount?: number

}) {

  const prop = property || CITY_PROPERTIES.margoa



  const isCity = "colorGroup" in prop && prop.colorGroup !== "NONE"



  const city = isCity ? (prop as PropertyDefinition) : null



  const special = !isCity ? (prop as SpecialPropertyDefinition) : null



  const colorGroup = city ? city.colorGroup : "NONE"



  const theme = getColorGroupTheme(colorGroup)



  // Applicable rent tier calculation:

  // - Mortgaged: rent is suspended (no payable tier applies)

  // - Unmortgaged:

  //   * 0 houses: Base rent (doubled if owner holds a color group monopoly)

  //   * 1-3 houses: Corresponding house rent tier

  //   * 4+ buildings: Hotel rent tier

  const isPropertyOwned = Boolean(ownerName || owned)

  const applicableCityTier = (!isPropertyOwned || isMortgaged)

    ? null

    : buildingCount >= 4

      ? 4

      : buildingCount



  const applicableSpecialTier = (!isPropertyOwned || isMortgaged)

    ? null

    : hasSpecialPair

      ? "pair"

      : "alone"



  return (

    <div

      className="property-card"

      data-group={colorGroup}

      style={getPropertyThemeStyle(colorGroup)}

    >

      <div className="property-head">

        <small>

          {isCity ? "TITLE DEED · CITY PROPERTY" : "SPECIAL INFRASTRUCTURE"}

        </small>

        <strong style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>

          {!isCity && prop.id && <SpecialPropertyIcon propertyId={prop.id} size={18} />}

          <span>{prop.name.toUpperCase()}</span>

        </strong>

        <span>{theme.label}</span>

      </div>

      <PropertyLandmarkArtwork

        propertyId={prop.id}

        propertyName={prop.name}

        colorGroup={colorGroup}

      />

      <div className="property-price">

        <div className="price-item">

          <small>PURCHASE PRICE</small>

          <strong>₹{prop.purchasePrice.toLocaleString()}</strong>

        </div>

        <div className="property-status-badges" style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>

          {owned ? (

            <span

              className="owner-badge"

              style={{

                boxShadow: ownerColor ? `0 0 7px 1.5px ${getPlayerColorHex(ownerColor)}88` : "0 0 6px 1px rgba(16, 185, 129, 0.4)",

                borderColor: ownerColor ? getPlayerColorHex(ownerColor) : "rgba(16, 185, 129, 0.6)",

              }}

            >

              OWNED BY YOU{buildingCount > 0 ? ` (${buildingCount >= 4 ? "HOTEL" : `${buildingCount} ${buildingCount === 1 ? "HOUSE" : "HOUSES"}`})` : ""}

            </span>

          ) : ownerName ? (

            <span

              className="owner-badge other-player-badge"

              style={{

                borderColor: ownerColor ? getPlayerColorHex(ownerColor) : "rgba(212, 175, 55, 0.45)",

                boxShadow: ownerColor ? `0 0 7px 1.5px ${getPlayerColorHex(ownerColor)}88` : "0 2px 8px rgba(0, 0, 0, 0.2)",

              }}

            >

              OWNED BY {ownerName.toUpperCase()}{buildingCount > 0 ? ` (${buildingCount >= 4 ? "HOTEL" : `${buildingCount} ${buildingCount === 1 ? "HOUSE" : "HOUSES"}`})` : ""}

            </span>

          ) : (

            <span

              className="owner-badge unowned-badge"

            >

              UNOWNED / BANK-OWNED

            </span>

          )}

          <MortgageStatusIndicator

            isMortgaged={isMortgaged}

            variant="badge"

            ownerName={ownerName}

          />

        </div>

      </div>

      {city && (

        <>

          <div className="rent-table">

            {isMortgaged && (

              <div className="rent-suspended-banner">

                <span>RENT SUSPENDED WHILE MORTGAGED · ₹0 DUE</span>

              </div>

            )}

            <div

              className={`rent-tier-row ${

                applicableCityTier === 0 ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                RENT (BASE)

                {applicableCityTier === 0 && (

                  <span className="rent-tier-active-badge">

                    {isGroupMonopoly ? "APPLICABLE (2× GROUP)" : "APPLICABLE"}

                  </span>

                )}

              </span>

              <b>

                ₹

                {(

                  city.baseRent * (applicableCityTier === 0 && isGroupMonopoly ? 2 : 1)

                ).toLocaleString()}

              </b>

            </div>

            <div

              className={`rent-tier-row ${

                applicableCityTier === 1 ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                WITH 1 HOUSE

                {applicableCityTier === 1 && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>₹{city.rentOneHouse.toLocaleString()}</b>

            </div>

            <div

              className={`rent-tier-row ${

                applicableCityTier === 2 ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                WITH 2 HOUSES

                {applicableCityTier === 2 && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>₹{city.rentTwoHouses.toLocaleString()}</b>

            </div>

            <div

              className={`rent-tier-row ${

                applicableCityTier === 3 ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                WITH 3 HOUSES

                {applicableCityTier === 3 && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>₹{city.rentThreeHouses.toLocaleString()}</b>

            </div>

            <div

              className={`rent-tier-row ${

                applicableCityTier === 4 ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                WITH HOTEL

                {applicableCityTier === 4 && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>₹{city.hotelRent.toLocaleString()}</b>

            </div>

          </div>

          <div

            className="group-rule-note"

            style={{

              fontSize: "8.5px",

              textAlign: "center",

              padding: "6px 12px",



              background: theme.tintBg,

              color: theme.tintText,



              borderTop: "1px solid rgba(200, 155, 69, 0.3)",

              fontFamily: "Oswald",

              letterSpacing: "0.04em",

            }}

          >

            &#x2736; Base rent is doubled if you own any 3 properties in{" "}

            {theme.label}

          </div>

          <div className="property-foot">

            <span>

              BUILD COST <b>₹{city.buildingCost.toLocaleString()}</b>

            </span>

            <span>

              MORTGAGE <b>₹{city.mortgageValue.toLocaleString()}</b>

            </span>

          </div>

        </>

      )}

      {special && (

        <>

          <div className="rent-table">

            {isMortgaged && (

              <div className="rent-suspended-banner">

                <span>RENT SUSPENDED WHILE MORTGAGED · ₹0 DUE</span>

              </div>

            )}

            <div

              className={`rent-tier-row ${

                applicableSpecialTier === "alone" ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                RENT ALONE

                {applicableSpecialTier === "alone" && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>{special.rentAlone}</b>

            </div>

            <div

              className={`rent-tier-row ${

                applicableSpecialTier === "pair" ? "is-active-tier" : "is-secondary-tier"

              }`}

            >

              <span>

                RENT WITH PAIR

                {applicableSpecialTier === "pair" && (

                  <span className="rent-tier-active-badge">APPLICABLE</span>

                )}

              </span>

              <b>

                {special.id === "railway" ? (

                  hasSpecialPair && isPropertyOwned ? (

                    `₹${Math.max(1000 * hotelCount, 2000).toLocaleString()} (max(1000 × ${hotelCount}H, 2000))`

                  ) : (

                    "max(₹1,000 × Hotels, ₹2,000)"

                  )

                ) : (special.id === "air_india" || special.id === "airways") ? (

                  hasSpecialPair && isPropertyOwned ? (

                    `₹${Math.max(1500 * hotelCount, 2500).toLocaleString()} (max(1500 × ${hotelCount}H, 2500))`

                  ) : (

                    "max(₹1,500 × Hotels, ₹2,500)"

                  )

                ) : (

                  special.rentWithPair

                )}

              </b>

            </div>

            <div className="rent-tier-row is-secondary-tier">

              <span>PAIR RELATIONSHIP</span>

              <b>{special.pair}</b>

            </div>

          </div>

          <div className="property-foot">

            <span>

              MORTGAGE VALUE <b>₹{special.mortgageValue.toLocaleString()}</b>

            </span>

          </div>

        </>

      )}

      <div className="property-card-edition">

        <strong>CROWNFALL</strong>

        <small>.IO EDITION</small>

      </div>

    </div>

  )

}



// ─── MODAL SHELL ──────────────────────────────────────────────────────────────



function ModalShell({

  children,

  title,

  close,

  className = "",

}: {

  children: React.ReactNode



  title?: string



  close: () => void



  className?: string

}) {

  return (

    <div className="modal-backdrop" onMouseDown={close}>

      <section

        className={`modal-sheet ${className}`}

        onMouseDown={(e) => e.stopPropagation()}

      >

        <div className="sheet-handle" />

        {title && (

          <div className="modal-header">

            <strong>{title}</strong>

            <button onClick={close} aria-label="Close">

              <Icon name="close" />

            </button>

          </div>

        )}

        {children}

      </section>

    </div>

  )

}



// ─── SELL PROPERTY VIEW ──────────────────────────────────────────────────────



function SellPropertyView({

  selectedProperty,

  propertyOwnerCrossings,

  setPropertyOwnerCrossings,

  players = initialPlayers,

  localPlayerId = 0,

  activePlayerIndex = 0,

  transactionLedger = [],

  roundNumber = 1,

  setPlayers,

  onShowToast,

  onAddGameplayEvent,

  close,

}: {

  selectedProperty: PropertyDefinition | SpecialPropertyDefinition

  propertyOwnerCrossings?: Record<string, number>

  setPropertyOwnerCrossings?: React.Dispatch<React.SetStateAction<Record<string, number>>>

  players?: EnginePlayer[]

  localPlayerId?: number

  activePlayerIndex?: number

  transactionLedger?: TransactionRecord[]

  roundNumber?: number

  setPlayers?: React.Dispatch<React.SetStateAction<EnginePlayer[]>>

  onShowToast?: (msg: string) => void

  onAddGameplayEvent?: (entry: GameplayEventEntry) => void

  close: () => void

}) {

  const [isSubmittingSell, setIsSubmittingSell] = useState(false)



  const isCity = "colorGroup" in selectedProperty && selectedProperty.colorGroup !== "NONE"

  const city = isCity ? (selectedProperty as PropertyDefinition) : null

  const groupTheme = city ? getColorGroupTheme(city.colorGroup) : null



  const owner =

    (players || []).find((p) => (p.ownedProperties || []).includes(selectedProperty.id)) ||

    (players && players[localPlayerId]) ||

    (players && players[activePlayerIndex]) ||

    initialPlayers[0]



  const propPrice = selectedProperty.purchasePrice

  const currentBuildings = (owner.buildings && owner.buildings[selectedProperty.id]) || 0

  const hasBuildings = currentBuildings > 0

  const isMortgaged = Boolean(owner.mortgages && owner.mortgages[selectedProperty.id])

  const mortgageValue = (selectedProperty as any).mortgageValue || Math.round(propPrice * 0.5)



  // Authoritative owner crossing calculation for resale depreciation:

  // Decreases by 5 percentage points per qualifying crossing of this space by its current owner after purchase.

  // Special properties have ZERO resale depreciation:

  const isSpecial = !isCity || Boolean(SPECIAL_PROPERTIES[selectedProperty.id])

  const crossings = propertyOwnerCrossings?.[selectedProperty.id] ?? 0

  const depreciationPercent = isSpecial ? 0 : Math.min(100, crossings * 5)

  const resalePercentage = isSpecial ? 100 : Math.max(0, 100 - depreciationPercent)

  const depreciatedValue = isSpecial ? propPrice : Math.round((propPrice * resalePercentage) / 100)

  const mortgageDeduction = isMortgaged ? mortgageValue : 0

  const netProceeds = Math.max(0, depreciatedValue - mortgageDeduction)

  const projectedBalance = owner.money + netProceeds



  const handleConfirmSellProperty = async () => {

    if (hasBuildings || isSubmittingSell) return

    setIsSubmittingSell(true)

    try {

      const res = await defaultEngine.sellProperty(owner.id, selectedProperty.id)

      if (res && res.success) {

        if (setPlayers && res.state?.players) {

          setPlayers(res.state.players)

        }

        if (setPropertyOwnerCrossings && res.state?.propertyOwnerCrossings) {

          setPropertyOwnerCrossings(res.state.propertyOwnerCrossings)

        }

        audioSystem.playPurchase()

        const proceeds = typeof res.sellPrice === "number" ? res.sellPrice : netProceeds

        const msg = isMortgaged

          ? `Sold ${selectedProperty.name} for ₹${proceeds.toLocaleString()} net (₹${depreciatedValue.toLocaleString()}${isSpecial ? " (zero depreciation)" : " depreciated"} minus ₹${mortgageDeduction.toLocaleString()} mortgage payoff).`

          : isSpecial

          ? `Sold ${selectedProperty.name} for ₹${proceeds.toLocaleString()} (special property, zero depreciation).`

          : `Sold ${selectedProperty.name} for ₹${proceeds.toLocaleString()} (${depreciationPercent}% depreciation).`

        onShowToast?.(msg)

        onAddGameplayEvent?.({

          id: `sell_${Date.now()}_${selectedProperty.id}`,

          type: "SELL_PROPERTY" as any,

          timestamp: Date.now(),

          playerId: owner.id,

          playerName: owner.name,

          propertyId: selectedProperty.id,

          propertyName: selectedProperty.name,

          amount: proceeds,

          description: `${owner.name} sold ${selectedProperty.name} back to the bank for ₹${proceeds.toLocaleString()}${isMortgaged ? ` (${isSpecial ? "zero depreciation" : `depreciated ₹${depreciatedValue.toLocaleString()}`} minus ₹${mortgageDeduction.toLocaleString()} mortgage debt cleared)` : isSpecial ? " (special property, zero depreciation)" : ` (${depreciationPercent}% depreciation over ${crossings} owner crossing${crossings === 1 ? "" : "s"})`}.`,

        })

        try {

          new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

        } catch (_) {}

        close()

      } else {

        audioSystem.playWarning()

        onShowToast?.(res?.error || `Could not sell ${selectedProperty.name}.`)

      }

    } catch (err: any) {

      audioSystem.playWarning()

      onShowToast?.(err?.message || `Could not sell ${selectedProperty.name}.`)

    } finally {

      setIsSubmittingSell(false)

    }

  }



  return (

    <ModalShell title="Sell Property" close={close} className="sell-property-modal">

      <div className="sell-property-header-card">

        <div className="sell-property-meta">

          <span className="sell-property-type-tag">

            {isCity && groupTheme ? `${groupTheme.label} · City Property` : "Special Infrastructure"}

          </span>

          <strong className="sell-property-title-name" title={selectedProperty.name} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>

            {isSpecial && <SpecialPropertyIcon propertyId={selectedProperty.id} size={16} />}

            <span>{selectedProperty.name}</span>

          </strong>

        </div>

        <div className="sell-property-owner-pill">

          <span

            className="sell-property-owner-dot"

            style={{ backgroundColor: getPlayerColorHex(owner.color) }}

          />

          <span>{owner.name}</span>

        </div>

      </div>



      {hasBuildings && (

        <div className="sell-warning-card warning-restriction">

          <div>

            <span className="sell-warning-label">Restriction:</span>

            All houses and hotels must be sold before selling this property back to the bank.

          </div>

        </div>

      )}



      {isMortgaged && (

        <div className="sell-warning-card warning-mortgage">

          <div>

            <span className="sell-warning-label">Mortgaged Property:</span>

            The outstanding bank mortgage loan of ₹{mortgageValue.toLocaleString()} will be automatically settled from the sale proceeds.

          </div>

        </div>

      )}



      <div className="sell-breakdown-card">

        <div className="sell-breakdown-row">

          <span>Original Purchase Price</span>

          <b>₹{propPrice.toLocaleString()}</b>

        </div>



        <div className="sell-breakdown-row">

          <span>Owner Crossings</span>

          <b>

            {isSpecial

              ? "Special Property · Zero Depreciation"

              : `${crossings} ${crossings === 1 ? "crossing" : "crossings"} (${depreciationPercent}% depreciation)`}

          </b>

        </div>



        <div className="sell-breakdown-row">

          <span>{isSpecial ? "Base Resale Value (100%)" : `Depreciated Resale Value (${resalePercentage}%)`}</span>

          <b>₹{depreciatedValue.toLocaleString()}</b>

        </div>



        {isMortgaged && (

          <div className="sell-breakdown-row" style={{ color: "var(--crimson, #be123c)" }}>

            <span style={{ color: "var(--crimson, #be123c)" }}>Less: Mortgage Payoff</span>

            <b style={{ color: "var(--crimson, #be123c)" }}>-₹{mortgageDeduction.toLocaleString()}</b>

          </div>

        )}



        <div className="sell-breakdown-divider" />



        <div className="sell-breakdown-row net-proceeds-row">

          <span>Net Sale Proceeds</span>

          <b>₹{netProceeds.toLocaleString()}</b>

        </div>



        <div className="sell-breakdown-row projected-cash-row">

          <span>Cash After Sale</span>

          <b>₹{projectedBalance.toLocaleString()}</b>

        </div>

      </div>



      <div className="sell-action-buttons">

        <Button

          variant="ghost"

          onClick={close}

          disabled={isSubmittingSell}

        >

          Cancel

        </Button>

        <Button

          variant="danger"

          onClick={handleConfirmSellProperty}

          disabled={hasBuildings || isSubmittingSell}

          className="sell-btn-confirm"

        >

          {isSubmittingSell

            ? "Selling..."

            : hasBuildings

            ? "Sell Buildings First"

            : `Confirm Sale · Receive ₹${netProceeds.toLocaleString()}`}

        </Button>

      </div>

    </ModalShell>

  )

}



// ─── GAME MODAL ───────────────────────────────────────────────────────────────



function GameModal({

  type,

  close,

  setModal,

  navigate: _navigate,

  selectedProperty,

  taxSpaceName,



  players = initialPlayers,

  activePlayerIndex = 0,



  setPlayers,

  onShowToast,

  onBuyResolved,



  lastDiceTotal,

  onModalAcknowledged,

  playerPositions,



  rentInfo,

  localPlayerId = 0,

  activityLog = [],

  turnState = "WAITING_FOR_ROLL",

  transactionLedger = [],

  tradeOffers = [],

  setTradeOffers,

  preferences,

  onUpdatePreferences,

  roundNumber = 1,

  onEndSession,

  onResign,

  onAddGameplayEvent,

  unmortgageInterestRatePercent = 10.0,

  rules,

  onUpdateRules,

  isGameStarted = false,

  isHost = true,

  onQuitGame,

  isLeavingRoom = false,

  roomCode,

  isMultiplayer = false,

  pendingPurchase = null,

  onKickPlayer,

  turnBuildingsBuilt = [],

  turnPurchasedProperties = [],

  activeLanding = null,

  currentTurnId = 1,

  onUpdateTurnBuildings,

  onUpdateTurnPurchased,

  onClearLandingHighlight,

  propertyOwnerCrossings,

  setPropertyOwnerCrossings,

}: {

  type: Exclude<Modal, null>



  close: () => void



  setModal?: (m: Modal) => void



  navigate?: (s: Screen) => void



  selectedProperty: PropertyDefinition | SpecialPropertyDefinition



  taxSpaceName?: string



  players?: EnginePlayer[]



  activePlayerIndex?: number



  setPlayers?: React.Dispatch<React.SetStateAction<EnginePlayer[]>>



  onShowToast?: (msg: string) => void



  onBuyResolved?: () => void



  lastDiceTotal?: number



  onModalAcknowledged?: () => void



  playerPositions?: number[]



  rentInfo?: RentInfo

  localPlayerId?: number

  activityLog?: ActivityLogEntry[]

  turnState?: string

  transactionLedger?: TransactionRecord[]

  tradeOffers?: TradeOffer[]

  setTradeOffers?: React.Dispatch<React.SetStateAction<TradeOffer[]>>

  preferences?: GamePreferences

  onUpdatePreferences?: (prefs: GamePreferences) => void

  roundNumber?: number

  onEndSession?: () => void

  onResign?: () => void

  onQuitGame?: () => void

  isLeavingRoom?: boolean

  roomCode?: string

  onAddGameplayEvent?: (entry: GameplayEventEntry) => void

  unmortgageInterestRatePercent?: number

  rules?: GameRules

  onUpdateRules?: (rules: Partial<GameRules>) => Promise<{ success: boolean; error?: string }>

  isGameStarted?: boolean

  isHost?: boolean

  isMultiplayer?: boolean

  pendingPurchase?: PendingPurchaseInfo | null

  onKickPlayer?: (playerId: number) => void

  turnBuildingsBuilt?: string[]

  turnPurchasedProperties?: string[]

  activeLanding?: { propertyId: string | null; position: number; isActive: boolean } | null

  currentTurnId?: number

  onUpdateTurnBuildings?: (buildings: string[]) => void

  onUpdateTurnPurchased?: (properties: string[]) => void

  onClearLandingHighlight?: (tileIndex?: number) => void

  propertyOwnerCrossings?: Record<string, number>

  setPropertyOwnerCrossings?: React.Dispatch<React.SetStateAction<Record<string, number>>>

}) {

  if (type === "trade") {

    return (

      <TradeModal

        players={players || []}

        localPlayerId={localPlayerId}

        tradeOffers={tradeOffers}

        onCreateOffer={async (rId, sProps, sCash, rProps, rCash) => {

          if (!defaultEngine.createTradeOffer) return false

          const res = await defaultEngine.createTradeOffer(localPlayerId, rId, sProps, sCash, rProps, rCash)

          if (res.success) {

            const targetPlayer = (players || []).find((p) => p.id === rId)

            const isBot = !targetPlayer?.isHuman

            if (isBot && res.tradeId && defaultEngine.acceptTradeOffer) {

              const acceptRes = await defaultEngine.acceptTradeOffer(res.tradeId, rId)

              if (acceptRes.success) {

                if (setPlayers) setPlayers(acceptRes.state.players)

                if (setTradeOffers) setTradeOffers(acceptRes.state.tradeOffers || [])

                try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

                onShowToast?.(`TRADE ACCEPTED BY ${targetPlayer?.name || "BOT"}!`)

                return true

              }

            }

            if (setPlayers) setPlayers(res.state.players)

            if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            onShowToast?.("TRADE PROPOSED")

            return true

          }

          return false

        }}

        onAcceptOffer={async (tradeId) => {

          if (!defaultEngine.acceptTradeOffer) return false

          const res = await defaultEngine.acceptTradeOffer(tradeId, localPlayerId)

          if (res.success) {

            if (setPlayers) setPlayers(res.state.players)

            if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            onShowToast?.("TRADE ACCEPTED & EXECUTED")

            return true

          }

          return false

        }}

        onRejectOffer={async (tradeId) => {

          if (!defaultEngine.rejectTradeOffer) return false

          const res = await defaultEngine.rejectTradeOffer(tradeId, localPlayerId)

          if (res.success) {

            if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            onShowToast?.("TRADE REJECTED")

            return true

          }

          return false

        }}

        onCancelOffer={async (tradeId) => {

          if (!defaultEngine.cancelTradeOffer) return false

          const res = await defaultEngine.cancelTradeOffer(tradeId, localPlayerId)

          if (res.success) {

            if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            onShowToast?.("TRADE CANCELLED")

            return true

          }

          return false

        }}

        close={close}

      />

    )

  }



  if (type === "mortgage_manager") {

    const activePlayer = (players && players[localPlayerId]) || (players && players[0])

    if (!activePlayer) return null

    return (

      <MortgageManagerModal

        player={activePlayer}

        onMortgage={async (propId) => {

          const res = await defaultEngine.mortgageProperty(activePlayer.id, propId)

          if (res.success && setPlayers) {

            setPlayers(res.state.players)

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            return true

          }

          return false

        }}

        onUnmortgage={async (propId) => {

          const res = await defaultEngine.unmortgageProperty(activePlayer.id, propId)

          if (res.success && setPlayers) {

            setPlayers(res.state.players)

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

            return true

          }

          return false

        }}

        close={close}

      />

    )

  }



  if (type === "timeline") {

    return (

      <TimelineReplayModal

        activityLog={activityLog || []}

        transactionLedger={transactionLedger || []}

        players={players || []}

        roundNumber={roundNumber}

        close={close}

      />

    )

  }



  if (type === "insights" || type === "standings" || type === "players") {

    return (

      <FinancialInsightsModal

        players={players || []}

        localPlayerId={localPlayerId}

        transactionLedger={transactionLedger || []}

        roundNumber={roundNumber}

        isHost={isHost}

        isMultiplayer={Boolean(roomCode || multiplayerClient.getRoomCode())}

        onKickPlayer={onKickPlayer}

        close={close}

      />

    )

  }



  if (type === "preferences") {

    return (

      <PreferencesModal

        preferences={preferences ?? loadPreferences()}

        onUpdatePreferences={(newPrefs) => onUpdatePreferences?.(newPrefs)}

        rules={rules}

        onUpdateRules={onUpdateRules}

        isGameStarted={isGameStarted}

        isHost={isHost}

        roomCode={roomCode || multiplayerClient.getRoomCode() || undefined}

        close={close}

      />

    )

  }



  if (type === "confirm_resign") {

    const resignPlayerObj = players.find((p) => p.id === localPlayerId) || players[localPlayerId] || players[0]

    return (

      <ModalShell title="RESIGN MATCH" close={close}>

        <div style={{ padding: "18px 16px", textAlign: "center" }}>

          <p style={{ color: "var(--ink)", fontSize: "14px", marginBottom: "8px", fontWeight: 700 }}>

            Surrender & Resign from the Match?

          </p>

          <p style={{ color: "var(--ink-soft)", fontSize: "12px", marginBottom: "20px", lineHeight: 1.5 }}>

            Resigning as <strong>{resignPlayerObj?.name}</strong> will liquidate your properties to the Bank, surrender your position, and settle all debts. The match will continue for the remaining players.

          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>

            <Button variant="ghost" onClick={close}>Cancel</Button>

            <Button

              variant="danger"

              onClick={async () => {

                close()

                if (onResign) {

                  onResign()

                } else {

                  try {

                    const res = await defaultEngine.resignPlayer?.(localPlayerId)

                    if (res && res.success && res.state) {

                      if (setPlayers && res.state.players) {

                        setPlayers(res.state.players)

                      }

                      if (res.state.turnState === "GAME_OVER") {

                        _navigate?.("gameover")

                      }

                    }

                    try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

                  } catch (_) {}

                  onShowToast?.("You have surrendered and resigned from the match.")

                }

              }}

            >

              Confirm Resignation

            </Button>

          </div>

        </div>

      </ModalShell>

    )

  }



  if (type === "confirm_end_session") {

    return (

      <ModalShell title="END GAME SESSION" close={close}>

        <div style={{ padding: "16px", textAlign: "center" }}>

          <p style={{ color: "var(--ink)", fontSize: "14px", marginBottom: "16px", lineHeight: 1.5 }}>

            Are you sure you want to end this game session for all players? The authoritative game state will conclude immediately.

          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>

            <Button variant="ghost" onClick={close}>Cancel</Button>

            <Button

              variant="danger"

              onClick={async () => {

                await defaultEngine.endSession?.(localPlayerId)

                try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

                close()

                onEndSession?.()

              }}

            >

              End Game

            </Button>

          </div>

        </div>

      </ModalShell>

    )

  }



  if (type === "confirm_quit_game") {

    const localPlayer = players?.find((p) => p.id === localPlayerId) || players?.[0]

    return (

      <ModalShell title="QUIT GAME" close={isLeavingRoom ? () => {} : close}>

        <div style={{ padding: "18px 16px", textAlign: "center" }}>

          <p style={{ color: "var(--ink)", fontSize: "14px", marginBottom: "8px", fontWeight: 700 }}>

            Quit Game & Return to Main Menu?

          </p>

          <p style={{ color: "var(--ink-soft)", fontSize: "12px", marginBottom: "20px", lineHeight: 1.5 }}>

            Are you sure you want to quit{roomCode ? ` room "${roomCode}"` : ""}, <strong>{localPlayer?.name}</strong>?

            You will leave the room and your slot will be vacated.

          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>

            <Button variant="ghost" onClick={close} disabled={isLeavingRoom}>Cancel</Button>

            <Button

              variant="danger"

              disabled={isLeavingRoom}

              onClick={() => {

                onQuitGame?.()

              }}

            >

              {isLeavingRoom ? "Leaving..." : "Confirm Quit"}

            </Button>

          </div>

        </div>

      </ModalShell>

    )

  }



  if (type === "kick_player") {

    const kickablePlayers = (players || []).filter(

      (p) => p.id !== localPlayerId && !p.isBankrupt,

    )

    return (

      <ModalShell title="KICK PLAYER" close={close}>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

          <p style={{ color: "var(--ink-soft)", fontSize: "12px", margin: 0, lineHeight: 1.4 }}>

            Select a player to remove from this match. This action cannot be undone.

          </p>

          {kickablePlayers.length === 0 ? (

            <div style={{ textAlign: "center", padding: "18px 0", color: "var(--text-muted)", fontSize: "13px" }}>

              No other active players available to kick.

            </div>

          ) : (

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              {kickablePlayers.map((target) => (

                <div

                  key={target.id}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    padding: "8px 12px",

                    borderRadius: "8px",

                    border: "1px solid var(--border-subtle)",

                    background: "rgba(0, 0, 0, 0.04)",

                  }}

                >

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                    <span

                      style={{

                        width: "10px",

                        height: "10px",

                        borderRadius: "50%",

                        backgroundColor: getPlayerColorHex(target.color),

                      }}

                    />

                    <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{target.name}</strong>

                    <span style={{ fontSize: "11px", color: "var(--ink-soft)" }}>

                      (₹{target.money.toLocaleString()})

                    </span>

                  </div>

                  <Button

                    variant="danger"

                    onClick={() => {

                      if (window.confirm(`Are you sure you want to kick ${target.name}?`)) {

                        onKickPlayer?.(target.id)

                        close()

                      }

                    }}

                    style={{ padding: "4px 10px", fontSize: "11px" }}

                  >

                    Kick

                  </Button>

                </div>

              ))}

            </div>

          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>

            <Button variant="ghost" onClick={close}>

              Cancel

            </Button>

          </div>

        </div>

      </ModalShell>

    )

  }



  if (type === "activity_log") {

    return (

      <TransactionLedgerModal

        ledger={transactionLedger || []}

        activityLog={activityLog || []}

        players={players || []}

        close={close}

      />

    )

  }



  if (type === "construction_manager") {

    const activePlayer = (players && players[activePlayerIndex]) || (players && players[0])

    if (!activePlayer) return null

    return (

      <ConstructionManagerModal

        activePlayer={activePlayer}

        close={close}

        isSubmitting={false}

        rules={rules}

        turnBuildingsBuilt={turnBuildingsBuilt}

        turnPurchasedProperties={turnPurchasedProperties}

        activeLanding={activeLanding}

        onBuild={async (propId) => {

          const res = await defaultEngine.buildHouseOrHotel(activePlayerIndex, propId)

          if (res.success && setPlayers) {

            audioSystem.playBuild()

            setPlayers(res.state.players)

            if (onUpdateTurnBuildings) {

              if (res.state.turnBuildingsBuilt) {

                onUpdateTurnBuildings(res.state.turnBuildingsBuilt)

              } else if (!rules?.requireLandingToBuild) {

                onUpdateTurnBuildings(Array.from(new Set([...turnBuildingsBuilt, propId])))

              }

            }

            const count = res.state.players[activePlayerIndex]?.buildings[propId] || 0

            const isHotel = count === 4

            const propName = CITY_PROPERTIES[propId]?.name || propId

            const pName = activePlayer.name

            const bMsg = isHotel

              ? `${pName} constructed a Hotel on ${propName}!`

              : `${pName} built House #${count} on ${propName}.`

            onAddGameplayEvent?.({

              id: `build_${Date.now()}_${propId}`,

              type: isHotel ? ("BUILD_HOTEL" as any) : ("BUILD_HOUSE" as any),

              timestamp: Date.now(),

              playerId: activePlayer.id,

              playerName: pName,

              propertyId: propId,

              propertyName: propName,

              description: bMsg,

            })

            onShowToast?.(bMsg)

            try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

          } else {

            audioSystem.playWarning()

            const errMsg = res.error || (

              res.reason === "PROPERTY_PURCHASED_THIS_TURN"

                ? "You must wait until your next turn to build on this property."

                : res.reason === "MODE_A_PLAYER_NOT_ON_PROPERTY"

                ? "You must be on this property to build."

                : res.reason === "MODE_A_MUST_LAND_HERE"

                ? "Land on this property during your turn to build."

                : res.reason === "MODE_B_BUILD_ALLOWANCE_USED"

                ? "You have already built on this property this turn."

                : "Building request rejected by authoritative game engine."

            )

            onShowToast?.(errMsg)

          }

        }}

        onDestroy={async (propId) => {

          const oldCount = activePlayer.buildings[propId] || 0

          const res = await defaultEngine.sellHouseOrHotel(activePlayerIndex, propId)

          if (res.success && setPlayers) {

            audioSystem.playDestroyRefund()

            setPlayers(res.state.players)

            const wasHotel = oldCount === 4

            const propName = CITY_PROPERTIES[propId]?.name || propId

            const pName = activePlayer.name

            const dMsg = wasHotel

              ? `${pName} demolished Hotel on ${propName}!`

              : `${pName} sold a House on ${propName}.`

            onAddGameplayEvent?.({

              id: `destroy_${Date.now()}_${propId}`,

              type: wasHotel ? ("DESTROY_HOTEL" as any) : ("DESTROY_HOUSE" as any),

              timestamp: Date.now(),

              playerId: activePlayer.id,

              playerName: pName,

              propertyId: propId,

              propertyName: propName,

              description: dMsg,

            })

            onShowToast?.(dMsg)

          } else {

            audioSystem.playWarning()

          }

        }}

      />

    )

  }



  const initialDice =

    lastDiceTotal && lastDiceTotal >= 2 && lastDiceTotal <= 12

      ? lastDiceTotal

      : type === "chance"

        ? 3

        : 2



  // ── OBSOLETE GAMEPLAY POPUPS (CHANCE, CHEST, JAIL, REST, TAX, RENT) ──

  // All routine gameplay events are displayed via the compact board-center event log.

  if (

    type === "chance" ||

    type === "chest" ||

    type === "jail" ||

    type === "rest" ||

    type === "tax" ||

    type === "rent"

  ) {

    return null

  }



  // ── BUILD ──



  if (type === "build") {

    const [isSubmitting, setIsSubmitting] = useState(false)



    const isCity = "buildingCost" in selectedProperty



    const city = isCity ? selectedProperty as PropertyDefinition : null



    const buildCost = city?.buildingCost || 5000



    const activePlayer = players[activePlayerIndex]



    const userMoney = activePlayer.money



    const balanceAfter = userMoney - buildCost



    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0



    const currentRent = city

      ? currentBuildings === 0

        ? city.baseRent

        : currentBuildings === 1

          ? city.rentOneHouse

          : currentBuildings === 2

            ? city.rentTwoHouses

            : currentBuildings === 3

              ? city.rentThreeHouses

              : city.hotelRent

      : 0



    const nextRent = city

      ? currentBuildings === 0

        ? city.rentOneHouse

        : currentBuildings === 1

          ? city.rentTwoHouses

          : currentBuildings === 2

            ? city.rentThreeHouses

            : city.hotelRent

      : 0



    const groupTheme = getColorGroupTheme(city?.colorGroup)



    const groupProps = city?.colorGroup

      ? (COLOR_GROUPS[city.colorGroup]?.properties ?? [])

      : []



    const ownsCompleteGroup =

      groupProps.length > 0 &&

      groupProps.every((name) => {

        const prop = getCityProperty(name)



        return prop && activePlayer.ownedProperties.includes(prop.id)

      })



    const propSpaceIndex = BOARD_SPACES.findIndex(

      (s) => s.propertyId === selectedProperty.id,

    )



    const isRequireLanding = rules?.requireLandingToBuild ?? false

    const isCurrentlyOnProperty = (playerPositions && playerPositions[activePlayerIndex] === propSpaceIndex) || (activePlayer.position === propSpaceIndex)

    const isLandingEligible = activeLanding

      ? (activeLanding.isActive && activeLanding.propertyId === selectedProperty.id && activeLanding.position === propSpaceIndex)

      : isCurrentlyOnProperty



    const purchasedThisTurn = turnPurchasedProperties?.includes(selectedProperty.id) ?? false

    const builtThisTurn = turnBuildingsBuilt?.includes(selectedProperty.id) ?? false



    let canBuild =

      isCity &&

      !!city &&

      userMoney >= buildCost &&

      currentBuildings < 4 &&

      !activePlayer.mortgages[selectedProperty.id] &&

      !purchasedThisTurn &&

      (isRequireLanding ? (isCurrentlyOnProperty && isLandingEligible) : !builtThisTurn)



    let buildReason = ""

    if (canBuild) {

      buildReason = ""

    } else if (currentBuildings >= 4) {

      buildReason = "Maximum construction limit reached (Hotel)."

    } else if (activePlayer.mortgages[selectedProperty.id]) {

      buildReason = "Property is mortgaged."

    } else if (purchasedThisTurn) {

      buildReason = "You must wait until your next turn to build on this property."

    } else if (isRequireLanding && !isLandingEligible) {

      buildReason = "Land on this property during your turn to build."

    } else if (isRequireLanding && !isCurrentlyOnProperty) {

      buildReason = "You must be on this property to build."

    } else if (!isRequireLanding && builtThisTurn) {

      buildReason = "You have already built on this property this turn."

    } else if (userMoney < buildCost) {

      buildReason = `Cannot afford · Need ₹${buildCost.toLocaleString()}`

    }



    const handleConfirmBuild = async () => {

      if (!canBuild || isSubmitting) return

      setIsSubmitting(true)

      try {

        const res = await defaultEngine.buildHouseOrHotel(

          activePlayerIndex,

          selectedProperty.id,

        )



        if (res.success && setPlayers) {

          audioSystem.playBuild()

          setPlayers(res.state.players)

          if (onUpdateTurnBuildings) {

            if (res.state.turnBuildingsBuilt) {

              onUpdateTurnBuildings(res.state.turnBuildingsBuilt)

            } else if (!rules?.requireLandingToBuild) {

              onUpdateTurnBuildings(Array.from(new Set([...turnBuildingsBuilt, selectedProperty.id])))

            }

          }

          try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

        } else {

          audioSystem.playWarning()

          const errMsg = res.error || (

            res.reason === "PROPERTY_PURCHASED_THIS_TURN"

              ? "You must wait until your next turn to build on this property."

              : res.reason === "MODE_A_PLAYER_NOT_ON_PROPERTY"

              ? "You must be on this property to build."

              : res.reason === "MODE_A_MUST_LAND_HERE"

              ? "Land on this property during your turn to build."

              : res.reason === "MODE_B_BUILD_ALLOWANCE_USED"

              ? "You have already built on this property this turn."

              : "Building request rejected by authoritative game engine."

          )

          onShowToast?.(errMsg)

        }

      } finally {

        setIsSubmitting(false)

        close()

      }

    }



    return (

      <ModalShell title="BUILD ON PROPERTY" close={close}>

        <div

          className="build-property"

          style={{ borderLeft: `4px solid ${groupTheme.accent}` }}

        >

          <div

            className="tiny-building"

            style={{ background: groupTheme.accent }}

          >

            {currentBuildings >= 3 ? "H" : "B"}

          </div>

          <span>

            <small>

              {selectedProperty.name.toUpperCase()} · {groupTheme.label}

            </small>

            <strong>

              {currentBuildings >= 3

                ? "Upgrade to Hotel"

                : `Add House #${currentBuildings + 1}`}

            </strong>

          </span>

        </div>

        <div className="rent-change">

          <div>

            <small>CURRENT RENT</small>

            <b>₹{currentRent.toLocaleString()}</b>

          </div>

          <Icon name="arrow" />

          <div>

            <small>UPGRADED RENT</small>

            <b style={{ color: groupTheme.accent }}>

              ₹{nextRent.toLocaleString()}

            </b>

          </div>

        </div>

        <div className="balance-check">

          <span>BUILDING COST</span>

          <b>₹{buildCost.toLocaleString()}</b>

          <span>BALANCE AFTER</span>

          <b>₹{balanceAfter.toLocaleString()}</b>

        </div>

        <div

          className="lobby-tip"

          style={{ borderLeftColor: isRequireLanding ? "var(--gold)" : "var(--green)", marginTop: "8px" }}

        >

          <span>{isRequireLanding ? "BUILD MODE A — LAND TO BUILD ACTIVE" : "BUILD MODE B — BUILD FROM ANYWHERE ACTIVE"}</span>

          {isRequireLanding

            ? "Must land on a previously owned property and remain there during the same logical turn. Cannot build on the turn purchased."

            : "No landing requirement. Maximum 1 build per property per logical turn. Cannot build on the turn purchased."}

        </div>

        {buildReason && !canBuild && (

          <div

            className="lobby-tip"

            style={{ borderLeftColor: "var(--red)", marginTop: "8px" }}

          >

            <span>BUILDING RESTRICTION</span>

            {buildReason}

          </div>

        )}

        <Button onClick={handleConfirmBuild} disabled={!canBuild || isSubmitting}>

          {isSubmitting

            ? "CONSTRUCTING..."

            : buildReason && !canBuild

              ? buildReason

              : `CONFIRM BUILD · ₹${buildCost.toLocaleString()}`}

        </Button>

        <Button variant="ghost" onClick={close}>

          CANCEL

        </Button>

      </ModalShell>

    )

  }



  // ── DESTROY / SELL BUILDING ──



  if (type === "sell") {

    const [isSubmitting, setIsSubmitting] = useState(false)



    const isCity = "buildingCost" in selectedProperty



    const city = isCity ? (selectedProperty as PropertyDefinition) : null



    const buildCost = city?.buildingCost || 0



    const rawRefund = Math.floor((buildCost * 50) / 100)



    const refund = Math.ceil(rawRefund / 100) * 100



    const activePlayer = players[activePlayerIndex]



    const currentBuildings = activePlayer.buildings[selectedProperty.id] || 0



    const isHotel = currentBuildings >= 4



    const projectedBalance = activePlayer.money + refund



    const handleConfirmSell = async () => {

      if (!isCity || !city || currentBuildings <= 0 || isSubmitting) return

      setIsSubmitting(true)



      try {

        const res = await defaultEngine.sellHouseOrHotel(

          activePlayerIndex,

          selectedProperty.id,

        )



        if (res.success && setPlayers) {

          audioSystem.playDestroyRefund()

          setPlayers(res.state.players)

        }

      } finally {

        setIsSubmitting(false)

        close()

      }

    }



    return (

      <ModalShell title="DESTROY BUILDING" close={close}>

        <div

          className="build-property"

          style={{ borderLeft: "4px solid var(--burgundy)" }}

        >

          <div

            className="tiny-building"

            style={{ background: "var(--burgundy)" }}

          >

            {isHotel ? "H" : "B"}

          </div>

          <span>

            <small>{selectedProperty.name.toUpperCase()}</small>

            <strong>

              {isHotel ? "Destroy Hotel (Reverts to 3 Houses)" : `Destroy House #${currentBuildings}`}

            </strong>

          </span>

        </div>

        <div

          className="lobby-tip"

          style={{ borderLeftColor: "var(--gold)", marginTop: "8px" }}

        >

          <span>DESTROY RULE</span>Voluntary building removal refunds 50% of the original construction cost.

        </div>

        <div className="rent-change">

          <div>

            <small>ORIGINAL COST</small>

            <b>₹{buildCost.toLocaleString()}</b>

          </div>

          <Icon name="arrow" />

          <div>

            <small>REFUND (50%)</small>

            <b style={{ color: "var(--gold)" }}>₹{refund.toLocaleString()}</b>

          </div>

        </div>

        <div className="balance-check">

          <span>CURRENT CASH</span>

          <b>₹{activePlayer.money.toLocaleString()}</b>

          <span>CASH AFTER REFUND</span>

          <b style={{ color: "var(--green)" }}>

            ₹{projectedBalance.toLocaleString()}

          </b>

        </div>

        <Button onClick={handleConfirmSell} disabled={currentBuildings <= 0 || isSubmitting}>

          {isSubmitting

            ? "PROCESSING..."

            : isHotel

              ? `CONFIRM DESTROY HOTEL · RECEIVE ₹${refund.toLocaleString()}`

              : `CONFIRM DESTROY HOUSE · RECEIVE ₹${refund.toLocaleString()}`}

        </Button>

        <Button variant="ghost" onClick={close}>

          CANCEL

        </Button>

      </ModalShell>

    )

  }



  // ── MORTGAGE ──



  if (type === "mortgage") {

    const owner = (players || []).find((p) => (p.ownedProperties || []).includes(selectedProperty.id)) ||

      (players && players[activePlayerIndex]) || initialPlayers[0]



    const mortgageVal = selectedProperty.mortgageValue



    const currentBuildings = (owner.buildings && owner.buildings[selectedProperty.id]) || 0



    const hasBuildings = currentBuildings > 0



    const projectedBalance = owner.money + mortgageVal



    const handleConfirmMortgage = async () => {

      if (hasBuildings || (owner.mortgages && owner.mortgages[selectedProperty.id])) return



      const res = await defaultEngine.mortgageProperty(

        owner.id,

        selectedProperty.id,

      )



      if (res.success && setPlayers) {

        setPlayers(res.state.players)

      }



      close()

    }



    return (

      <ModalShell title="MORTGAGE PROPERTY" close={close}>

        <PropertyVisual

          property={selectedProperty}

          owned={owner?.id === localPlayerId}

          ownerName={owner?.name}

          ownerColor={owner?.color}

          buildingCount={currentBuildings}

          hotelCount={owner ? getPlayerHotelCount(owner) : 0}

          hasSpecialPair={Boolean(owner && !isCity && SPECIAL_PAIR_MAP[selectedProperty.id] && (owner.ownedProperties || []).includes(SPECIAL_PAIR_MAP[selectedProperty.id]))}

        />

        {hasBuildings && (

          <div

            className="lobby-tip"

            style={{ borderLeftColor: "var(--red)", marginTop: "10px" }}

          >

            <span>RESTRICTION</span>Must sell all buildings before mortgaging.

          </div>

        )}

        <div className="balance-check" style={{ marginTop: "10px" }}>

          <span>MORTGAGE CASH VALUE</span>

          <b style={{ color: "var(--gold)" }}>

            ₹{mortgageVal.toLocaleString()}

          </b>

          <span>CASH AFTER MORTGAGE</span>

          <b style={{ color: "var(--green)" }}>

            ₹{projectedBalance.toLocaleString()}

          </b>

        </div>

        <Button

          onClick={handleConfirmMortgage}

          disabled={

            hasBuildings || !!(owner.mortgages && owner.mortgages[selectedProperty.id])

          }

        >

          {hasBuildings

            ? "SELL BUILDINGS FIRST"

            : `CONFIRM MORTGAGE · RECEIVE ₹${mortgageVal.toLocaleString()}`}

        </Button>

        <Button variant="ghost" onClick={close}>

          CANCEL

        </Button>

      </ModalShell>

    )

  }



  // ── UNMORTGAGE ──



  if (type === "unmortgage") {

    const owner = (players || []).find((p) => (p.ownedProperties || []).includes(selectedProperty.id)) ||

      (players && players[activePlayerIndex]) || initialPlayers[0]



    const isSpecial = !("buildingCost" in selectedProperty) || Boolean(SPECIAL_PROPERTIES[selectedProperty.id])



    const mortgageVal = selectedProperty.mortgageValue



    const interest = isSpecial ? 0 : Math.floor((mortgageVal * 10) / 100)



    const totalRepayment = isSpecial ? mortgageVal : Math.ceil((mortgageVal + interest) / 100) * 100



    const canAfford = owner.money >= totalRepayment



    const projectedBalance = owner.money - totalRepayment



    const handleConfirmUnmortgage = async () => {

      if (!canAfford || !(owner.mortgages && owner.mortgages[selectedProperty.id])) return



      const res = await defaultEngine.unmortgageProperty(

        owner.id,

        selectedProperty.id,

      )



      if (res.success && setPlayers) {

        setPlayers(res.state.players)

      }



      close()

    }



    return (

      <ModalShell title="UNMORTGAGE PROPERTY" close={close}>

        <PropertyVisual

          property={selectedProperty}

          owned={owner?.id === localPlayerId}

          ownerName={owner?.name}

          ownerColor={owner?.color}

          isMortgaged

          buildingCount={0}

          hotelCount={owner ? getPlayerHotelCount(owner) : 0}

          hasSpecialPair={Boolean(owner && !isCity && SPECIAL_PAIR_MAP[selectedProperty.id] && (owner.ownedProperties || []).includes(SPECIAL_PAIR_MAP[selectedProperty.id]))}

        />

        <div className="balance-check" style={{ marginTop: "10px" }}>

          <span>{isSpecial ? "PRINCIPAL (ZERO INTEREST)" : "PRINCIPAL + 10% INTEREST"}</span>

          <b>₹{totalRepayment.toLocaleString()}</b>

          <span>REMAINING CASH</span>

          <b style={{ color: canAfford ? "var(--ink)" : "var(--red)" }}>

            ₹{projectedBalance.toLocaleString()}

          </b>

        </div>

        <Button onClick={handleConfirmUnmortgage} disabled={!canAfford}>

          {canAfford

            ? `CONFIRM UNMORTGAGE · ₹${totalRepayment.toLocaleString()}`

            : `CANNOT AFFORD · NEED ₹${totalRepayment.toLocaleString()}`}

        </Button>

        <Button variant="ghost" onClick={close}>

          CANCEL

        </Button>

      </ModalShell>

    )

  }



  // ── SELL PROPERTY (5% DEPRECIATION PER OWNER CROSSING AFTER BUYING) ──



  if (type === "sell_property") {

    return (

      <SellPropertyView

        selectedProperty={selectedProperty}

        propertyOwnerCrossings={propertyOwnerCrossings}

        setPropertyOwnerCrossings={setPropertyOwnerCrossings}

        players={players}

        localPlayerId={localPlayerId}

        activePlayerIndex={activePlayerIndex}

        transactionLedger={transactionLedger}

        roundNumber={roundNumber}

        setPlayers={setPlayers}

        onShowToast={onShowToast}

        onAddGameplayEvent={onAddGameplayEvent}

        close={close}

      />

    )

  }



  // ── BUY (Non-modal: Handled at board center) ──

  if (type === "buy") {

    return null

  }



  // ── PROPERTY DETAILS (Royal Indian Title Deed & Management Card) ──

  if (type === "property") {

    const isCity = "buildingCost" in selectedProperty

    const city = isCity ? (selectedProperty as PropertyDefinition) : null

    const propId = selectedProperty.id

    const propName = selectedProperty.name

    const propPrice = selectedProperty.purchasePrice

    const mortgageVal = selectedProperty.mortgageValue



    const owner = (players || []).find((p) => (p.ownedProperties || []).includes(propId))

    const isUnowned = !owner

    const isOwner = Boolean(owner && owner.id === localPlayerId)

    const isOwnedByActive = owner?.id === activePlayerIndex

    const activePlayer = (players && players[activePlayerIndex]) || (players && players[0]) || initialPlayers[0]

    const propOwner = owner || activePlayer

    const isMortgaged = !!(propOwner && propOwner.mortgages && propOwner.mortgages[propId])

    const buildings = (propOwner && propOwner.buildings && propOwner.buildings[propId]) || 0



    const canAct = (activePlayerIndex === localPlayerId || !multiplayerClient.getRoomCode()) && isOwner



    const isSpecial = !isCity || Boolean(SPECIAL_PROPERTIES[propId])

    const unmortgageRate = isSpecial ? 0 : (propOwner?.unmortgageInterestRatePercent ?? unmortgageInterestRatePercent ?? 10.0)

    const rawFee = (mortgageVal * unmortgageRate) / 100

    const redemptionFee = isSpecial ? 0 : Math.ceil(rawFee / 100) * 100

    const redemptionCost = mortgageVal + redemptionFee



    const propSpaceIndex = BOARD_SPACES.findIndex((s) => s.propertyId === propId)

    const isRequireLanding = rules?.requireLandingToBuild ?? false

    const isLandedHere = (playerPositions && playerPositions[activePlayerIndex] === propSpaceIndex) || (activePlayer.position === propSpaceIndex)

    const isLandingEligible = activeLanding

      ? (activeLanding.isActive && activeLanding.propertyId === propId && activeLanding.position === propSpaceIndex)

      : isLandedHere



    const purchasedThisTurn = turnPurchasedProperties?.includes(propId) ?? false

    const builtThisTurn = turnBuildingsBuilt?.includes(propId) ?? false



    const buildCost = city?.buildingCost || 0

    let canBuild =

      canAct &&

      isCity &&

      !isMortgaged &&

      buildings < 4 &&

      propOwner.money >= buildCost &&

      !purchasedThisTurn &&

      (isRequireLanding ? (isLandedHere && isLandingEligible) : !builtThisTurn)



    let buildReason = ""

    if (canBuild) {

      buildReason = ""

    } else if (buildings >= 4) {

      buildReason = "Maximum construction limit reached (Hotel)."

    } else if (isMortgaged) {

      buildReason = "Property is mortgaged."

    } else if (purchasedThisTurn) {

      buildReason = "You must wait until your next turn to build on this property."

    } else if (isRequireLanding && !isLandingEligible) {

      buildReason = "Land on this property during your turn to build."

    } else if (isRequireLanding && !isLandedHere) {

      buildReason = "You must be on this property to build."

    } else if (!isRequireLanding && builtThisTurn) {

      buildReason = "You have already built on this property this turn."

    } else if (propOwner.money < buildCost) {

      buildReason = `Cannot afford · Need ₹${buildCost.toLocaleString()}`

    }



    const refund = Math.ceil(Math.floor((buildCost * 50) / 100) / 100) * 100

    const canDestroy = canAct && isCity && buildings > 0

    const canMortgage = isOwner && !isMortgaged && buildings === 0

    const canRedeem = isOwner && isMortgaged && propOwner.money >= redemptionCost



    const viewerPlayer = (players && players[localPlayerId]) || activePlayer

    const isViewerActive = (!isMultiplayer || localPlayerId === activePlayerIndex) && (viewerPlayer.id === activePlayerIndex)

    const isViewerLandedHere = (playerPositions && playerPositions[viewerPlayer.id] === propSpaceIndex) || (viewerPlayer.position === propSpaceIndex)



    const matchesPendingOpportunity = pendingPurchase

      ? (pendingPurchase.propertyId === propId && pendingPurchase.buyerId === viewerPlayer.id)

      : activeLanding

      ? (activeLanding.isActive && activeLanding.propertyId === propId && activeLanding.position === propSpaceIndex)

      : isViewerLandedHere



    const isPurchaseTurnStateValid = (turnState === "WAITING_FOR_ACTION" || turnState === "RESOLVING_LANDING") && !purchasedThisTurn



    const isEligibleToBuy =

      isUnowned &&

      isViewerActive &&

      isViewerLandedHere &&

      isPurchaseTurnStateValid &&

      matchesPendingOpportunity &&

      viewerPlayer.rotationsCompleted >= 1



    const [isSubmitting, setIsSubmitting] = useState(false)



    const handleBuyFromCard = async () => {

      if (isSubmitting || !isEligibleToBuy || viewerPlayer.money < propPrice) return

      setIsSubmitting(true)

      try {

        const res = await defaultEngine.buyCurrentProperty(viewerPlayer.id)

        if (res.success && setPlayers) {

          audioSystem.playPurchase()

          const mergedPlayers = res.state.players.map((p, idx) => {

            let name = p.name

            let color = p.color

            if (!name || !name.trim()) {

              try {

                const saved = getStoredPlayerName(idx)

                if (saved && saved.trim()) name = saved.trim()

              } catch (_) {}

            }

            return { ...p, name, color }

          })

          setPlayers(mergedPlayers)

          if (res.state.propertyOwnerCrossings && setPropertyOwnerCrossings) {

            setPropertyOwnerCrossings(res.state.propertyOwnerCrossings)

          }

          if (res.state.turnPurchasedProperties && onUpdateTurnPurchased) {

            onUpdateTurnPurchased(res.state.turnPurchasedProperties)

          } else if (onUpdateTurnPurchased) {

            onUpdateTurnPurchased(Array.from(new Set([...(turnPurchasedProperties || []), propId])))

          }

          if (res.state.turnBuildingsBuilt && onUpdateTurnBuildings) {

            onUpdateTurnBuildings(res.state.turnBuildingsBuilt)

          }

          onAddGameplayEvent?.({

            id: `card_buy_${Date.now()}_${viewerPlayer.id}_${propId}`,

            type: "BUY",

            timestamp: Date.now(),

            playerId: viewerPlayer.id,

            playerName: viewerPlayer.name,

            propertyId: propId,

            propertyName: propName,

            amount: propPrice,

            description: `${viewerPlayer.name} bought ${propName} for ₹${propPrice.toLocaleString()}.`,

          })

          try {

            new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

          } catch (_) {}

          onClearLandingHighlight?.()

          onBuyResolved?.()

        } else {

          audioSystem.playWarning()

        }

      } finally {

        setIsSubmitting(false)

      }

    }



    const handleDeclineFromCard = async () => {

      if (isSubmitting) return

      setIsSubmitting(true)

      try {

        await defaultEngine.declinePropertyPurchase(activePlayer.id)

        audioSystem.playWarning()

        close()

      } finally {

        setIsSubmitting(false)

      }

    }



    const handleBuildFromCard = async () => {

      if (isSubmitting || !canBuild) return

      setIsSubmitting(true)

      try {

        const res = await defaultEngine.buildHouseOrHotel(propOwner.id, propId)

        if (res.success && setPlayers) {

          audioSystem.playBuild()

          setPlayers(res.state.players)

          if (onUpdateTurnBuildings) {

            if (res.state.turnBuildingsBuilt) {

              onUpdateTurnBuildings(res.state.turnBuildingsBuilt)

            } else if (!rules?.requireLandingToBuild) {

              onUpdateTurnBuildings(Array.from(new Set([...turnBuildingsBuilt, propId])))

            }

          }

          const count = res.state.players.find((p) => p.id === propOwner.id)?.buildings[propId] || 0

          const isHotel = count === 4

          const pName = propOwner.name

          const bMsg = isHotel

            ? `${pName} constructed a Hotel on ${propName}!`

            : `${pName} built House #${count} on ${propName}.`

          onAddGameplayEvent?.({

            id: `build_${Date.now()}_${propId}`,

            type: isHotel ? ("BUILD_HOTEL" as any) : ("BUILD_HOUSE" as any),

            timestamp: Date.now(),

            playerId: propOwner.id,

            playerName: pName,

            propertyId: propId,

            propertyName: propName,

            description: bMsg,

          })

          onShowToast?.(bMsg)

          try {

            new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

          } catch (_) {}

        } else {

          audioSystem.playWarning()

          const errMsg = res.error || (

            res.reason === "PROPERTY_PURCHASED_THIS_TURN"

              ? "You must wait until your next turn to build on this property."

              : res.reason === "MODE_A_PLAYER_NOT_ON_PROPERTY"

              ? "You must be on this property to build."

              : res.reason === "MODE_A_MUST_LAND_HERE"

              ? "Land on this property during your turn to build."

              : res.reason === "MODE_B_BUILD_ALLOWANCE_USED"

              ? "You have already built on this property this turn."

              : "Building request rejected by authoritative game engine."

          )

          onShowToast?.(errMsg)

        }

      } finally {

        setIsSubmitting(false)

      }

    }



    const handleDestroyFromCard = async () => {

      if (isSubmitting || !canDestroy) return

      setIsSubmitting(true)

      try {

        const oldCount = propOwner.buildings[propId] || 0

        const res = await defaultEngine.sellHouseOrHotel(propOwner.id, propId)

        if (res.success && setPlayers) {

          audioSystem.playDestroyRefund()

          setPlayers(res.state.players)

          const wasHotel = oldCount === 4

          const pName = propOwner.name

          const dMsg = wasHotel

            ? `${pName} demolished Hotel on ${propName}!`

            : `${pName} sold a House on ${propName}.`

          onAddGameplayEvent?.({

            id: `destroy_${Date.now()}_${propId}`,

            type: wasHotel ? ("DESTROY_HOTEL" as any) : ("DESTROY_HOUSE" as any),

            timestamp: Date.now(),

            playerId: propOwner.id,

            playerName: pName,

            propertyId: propId,

            propertyName: propName,

            description: dMsg,

          })

          onShowToast?.(dMsg)

          try {

            new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

          } catch (_) {}

        } else {

          audioSystem.playWarning()

        }

      } finally {

        setIsSubmitting(false)

      }

    }



    const handleMortgageFromCard = async () => {

      if (isSubmitting || !canMortgage) return

      setIsSubmitting(true)

      try {

        const res = await defaultEngine.mortgageProperty(propOwner.id, propId)

        if (res.success && setPlayers) {

          setPlayers(res.state.players)

          try {

            new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

          } catch (_) {}

        } else {

          audioSystem.playWarning()

        }

      } finally {

        setIsSubmitting(false)

      }

    }



    const handleRedeemFromCard = async () => {

      if (isSubmitting || !canRedeem) return

      setIsSubmitting(true)

      try {

        const res = await defaultEngine.unmortgageProperty(propOwner.id, propId)

        if (res.success && setPlayers) {

          setPlayers(res.state.players)

          try {

            new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

          } catch (_) {}

        } else {

          audioSystem.playWarning()

        }

      } finally {

        setIsSubmitting(false)

      }

    }



    let isGroupMonopoly = false

    if (owner && isCity && city) {

      const citiesInGroup = Object.values(CITY_PROPERTIES).filter((c) => c.colorGroup === city.colorGroup)

      const ownedInGroup = (owner.ownedProperties || []).filter((id) =>

        citiesInGroup.some((c) => c.id === id)

      ).length

      isGroupMonopoly = ownedInGroup >= 3

    }

    const pairSpId = SPECIAL_PAIR_MAP[propId] || (

      SPECIAL_PROPERTIES[propId]

        ? Object.values(SPECIAL_PROPERTIES).find(

            (s) => s.id !== propId && s.pair === SPECIAL_PROPERTIES[propId].pair

          )?.id

        : undefined

    )

    const hasSpecialPair = Boolean(owner && !isCity && pairSpId && (owner.ownedProperties || []).includes(pairSpId))

    const ownerHotelCount = owner ? getPlayerHotelCount(owner) : 0



    return (

      <ModalShell title="PROPERTY DETAILS" close={close} className="property-details-sheet custom-scrollbar">

        <PropertyVisual

          property={selectedProperty}

          owned={isOwner}

          ownerName={owner?.name}

          ownerColor={owner?.color}

          isMortgaged={isMortgaged}

          buildingCount={buildings}

          hotelCount={ownerHotelCount}

          isGroupMonopoly={isGroupMonopoly}

          hasSpecialPair={hasSpecialPair}

        />



        {/* Mortgage & Charges Status Section */}

        <div className="property-card-mortgage-section">

          <div className="mortgage-info-header">

            <strong>MORTGAGE STATUS & REPAYMENT</strong>

            <span className={`mortgage-badge ${isMortgaged ? "is-mortgaged" : "is-active"}`}>

              {isMortgaged ? "MORTGAGED" : "UNMORTGAGED"}

            </span>

          </div>

          <div className="mortgage-info-grid">

            <div>

              <small>MORTGAGE VALUE</small>

              <b>₹{mortgageVal.toLocaleString()}</b>

            </div>

            <div>

              <small>CHARGE / TAX RATE</small>

              <b>{unmortgageRate.toFixed(2).replace(/\.00$/, "")}%</b>

            </div>

            <div>

              <small>REDEMPTION COST</small>

              <b style={{ color: isMortgaged ? "var(--red)" : "var(--ink)" }}>

                ₹{redemptionCost.toLocaleString()}

              </b>

            </div>

          </div>

        </div>



        {/* Action Controls Section */}

        <div className="property-card-actions">

          {/* 1. Unowned case */}

          {isUnowned && isEligibleToBuy && (

            <div className="unowned-buy-controls">

              {viewerPlayer.money >= propPrice ? (

                <Button

                  onClick={handleBuyFromCard}

                  disabled={isSubmitting}

                >

                  {isSubmitting

                    ? "BUYING..."

                    : `BUY PROPERTY · ₹${propPrice.toLocaleString()}`}

                </Button>

              ) : (

                <div className="unowned-inspection-note">

                  <div className="unowned-status-heading">Unowned Property</div>

                  <div className="unowned-status-desc">You can't afford this property.</div>

                </div>

              )}

            </div>

          )}



          {isUnowned && !isEligibleToBuy && (

            <div className="unowned-inspection-note">

              <div className="unowned-status-heading">Unowned Property</div>

              <div className="unowned-status-desc">

                {viewerPlayer.rotationsCompleted === 0

                  ? "First rotation restriction: Land here after passing Start to purchase."

                  : `Land on ${propName} on your turn to purchase for ₹${propPrice.toLocaleString()}.`}

              </div>

            </div>

          )}



          {/* 2. Owned by another player */}

          {owner && !isOwner && (

            <div className="owner-other-note">

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                <span

                  style={{

                    display: "inline-block",

                    width: "14px",

                    height: "8px",

                    borderRadius: "2px",

                    backgroundColor: getPlayerColorHex(owner.color),

                  }}

                />

                <strong>OWNED BY {owner.name.toUpperCase()}</strong>

              </div>

              <small>

                {isMortgaged

                  ? "This property is mortgaged (No rent collected)."

                  : `Standard rent applies when other players land here.`}

              </small>

            </div>

          )}



          {/* 3. Owned by you / active player — Strict 2×2 Action Grid */}

          {isOwner && (

            <div className="property-actions-2x2-grid">

              {/* ROW 1: [ Build ] [ Destroy ] */}

              <button

                type="button"

                className="prop-action-btn prop-btn-build"

                onClick={handleBuildFromCard}

                disabled={!canBuild || isSubmitting}

                title={buildReason || undefined}

              >

                <span className="prop-btn-main">

                  {isSubmitting

                    ? "Constructing..."

                    : buildings >= 4

                    ? "Hotel Built"

                    : !isCity

                    ? "Can't Build"

                    : buildings === 3

                    ? "Build Hotel"

                    : "Build House"}

                </span>

                <span className="prop-btn-sub">

                  {!isCity

                    ? "Special Property"

                    : buildings >= 4

                    ? "Max Level"

                    : `· ₹${buildCost.toLocaleString()}`}

                </span>

              </button>



              <button

                type="button"

                className="prop-action-btn prop-btn-destructive"

                onClick={handleDestroyFromCard}

                disabled={!canDestroy || isSubmitting}

                title={!isCity ? "Special property cannot have buildings" : buildings === 0 ? "No buildings to demolish" : undefined}

              >

                <span className="prop-btn-main">

                  {isSubmitting

                    ? "Demolishing..."

                    : buildings >= 4

                    ? "Demolish Hotel"

                    : "Demolish"}

                </span>

                <span className="prop-btn-sub">

                  {!isCity || buildings === 0

                    ? "No buildings"

                    : `· +₹${refund.toLocaleString()} (50%)`}

                </span>

              </button>



              {/* ROW 2: [ Mortgage / Unmortgage ] [ Sell ] */}

              {!isMortgaged ? (

                <button

                  type="button"

                  className="prop-action-btn prop-btn-neutral"

                  onClick={handleMortgageFromCard}

                  disabled={!canMortgage || isSubmitting}

                  title={buildings > 0 ? "Sell all buildings before mortgaging" : undefined}

                >

                  <span className="prop-btn-main">Mortgage</span>

                  <span className="prop-btn-sub">

                    {buildings > 0 ? "Sell buildings first" : `· +₹${mortgageVal.toLocaleString()}`}

                  </span>

                </button>

              ) : (

                <button

                  type="button"

                  className="prop-action-btn prop-btn-neutral"

                  onClick={handleRedeemFromCard}

                  disabled={!canRedeem || isSubmitting}

                  title={propOwner.money < redemptionCost ? `Need ₹${redemptionCost.toLocaleString()}` : undefined}

                >

                  <span className="prop-btn-main">Unmortgage</span>

                  <span className="prop-btn-sub">

                    {propOwner.money < redemptionCost

                      ? `Need ₹${redemptionCost.toLocaleString()}`

                      : `· -₹${redemptionCost.toLocaleString()}`}

                  </span>

                </button>

              )}



              <button

                type="button"

                className="prop-action-btn prop-btn-destructive"

                onClick={() => setModal?.("sell_property")}

                disabled={buildings > 0 || isSubmitting}

                title={buildings > 0 ? "Sell all buildings before selling property" : isSpecial ? `Sell back to bank for 100% purchase price (₹${propPrice.toLocaleString()} · Zero depreciation)` : "Sell back to bank"}

              >

                <span className="prop-btn-main">Sell Property</span>

                <span className="prop-btn-sub">

                  {buildings > 0

                    ? "Sell buildings first"

                    : isSpecial

                    ? `100% value · ₹${propPrice.toLocaleString()}`

                    : `${Math.max(0, 100 - (propertyOwnerCrossings?.[propId] ?? 0) * 5)}% value · -5%/crossing`}

                </span>

              </button>

            </div>

          )}



          <Button variant="ghost" onClick={close}>

            CLOSE

          </Button>

        </div>

      </ModalShell>

    )

  }



  return null

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

  navigate,

  onOpenProperty: _onOpenProperty,

  roomCode = "",



  players,

  setPlayers,



  activePlayerIndex,

  setActivePlayerIndex,



  turnState,

  setTurnState,



  playerPositions,

  setPlayerPositions,



  roundNumber,

  setRoundNumber,



  isCppConnected = false,



  localPlayerId = 0,

  setLocalPlayerId: _setLocalPlayerId,



  activityLog = [],

  setActivityLog,



  turnTimer = null,

  setTurnTimer,



  timerEnabled = false,

  timerSeconds = 60,

  transactionLedger = [],

  setTransactionLedger,

  eventLogList,

  setEventLogList,

  tradeOffers = [],

  setTradeOffers,

  preferences,

  onUpdatePreferences,

  sessionRestored = false,

  onEndSession,

  rules,

  onUpdateRules,

  setEngineRules: incomingSetEngineRules,

  isGameStarted = false,

  isHost = true,

  doublesRule = true,

  onStartGame,

  connectionStatus = "connected",

  connectionMessage = "",

  onRetryConnection,

  isGlobalMovementActiveRef,

  pendingSnapshotRef,

  applyGameStateSnapshot,

  onKickPlayer,

  pendingRequests: incomingPendingRequests,

  onAcceptJoinRequest: incomingAcceptJoinRequest,

  onRejectJoinRequest: incomingRejectJoinRequest,

  turnBuildingsBuilt: incomingTurnBuildingsBuilt,

  setTurnBuildingsBuilt: incomingSetTurnBuildingsBuilt,

  turnPurchasedProperties: incomingTurnPurchasedProperties,

  setTurnPurchasedProperties: incomingSetTurnPurchasedProperties,

  activeLanding: incomingActiveLanding,

  setActiveLanding: incomingSetActiveLanding,

  currentTurnId: incomingCurrentTurnId,

  setCurrentTurnId: incomingSetCurrentTurnId,

  propertyOwnerCrossings: incomingPropertyOwnerCrossings,

  setPropertyOwnerCrossings: incomingSetPropertyOwnerCrossings,

}: {

  navigate: (screen: Screen) => void



  onOpenProperty: (prop: PropertyDefinition | SpecialPropertyDefinition) => void



  roomCode?: string

  players: EnginePlayer[]



  setPlayers: React.Dispatch<React.SetStateAction<EnginePlayer[]>>



  activePlayerIndex: number



  setActivePlayerIndex: React.Dispatch<React.SetStateAction<number>>



  turnState: string



  setTurnState: React.Dispatch<React.SetStateAction<string>>



  playerPositions: number[]



  setPlayerPositions: React.Dispatch<React.SetStateAction<number[]>>



  roundNumber: number



  setRoundNumber: React.Dispatch<React.SetStateAction<number>>



  isCppConnected?: boolean



  localPlayerId?: number



  setLocalPlayerId?: (id: number) => void



  activityLog?: ActivityLogEntry[]



  setActivityLog?: React.Dispatch<React.SetStateAction<ActivityLogEntry[]>>



  turnTimer?: TurnTimerState | null



  setTurnTimer?: React.Dispatch<React.SetStateAction<TurnTimerState | null>>



  timerEnabled?: boolean



  timerSeconds?: number

  transactionLedger?: TransactionRecord[]

  setTransactionLedger?: React.Dispatch<React.SetStateAction<TransactionRecord[]>>

  eventLogList?: GameplayEventEntry[]

  setEventLogList?: React.Dispatch<React.SetStateAction<GameplayEventEntry[]>>

  tradeOffers?: TradeOffer[]

  setTradeOffers?: React.Dispatch<React.SetStateAction<TradeOffer[]>>

  preferences?: GamePreferences

  onUpdatePreferences?: (prefs: GamePreferences) => void

  sessionRestored?: boolean

  onEndSession?: () => void

  rules?: GameRules

  onUpdateRules?: (rules: Partial<GameRules>) => Promise<{ success: boolean; error?: string }>

  setEngineRules?: (rules: Partial<GameRules> | ((prev: GameRules) => GameRules)) => void

  isGameStarted?: boolean

  isHost?: boolean

  doublesRule?: boolean

  onStartGame?: () => void

  connectionStatus?: ConnectionStatus

  connectionMessage?: string

  onRetryConnection?: () => void

  isGlobalMovementActiveRef?: React.MutableRefObject<boolean>

  pendingSnapshotRef?: React.MutableRefObject<any>

  applyGameStateSnapshot?: (gs: any) => void

  onKickPlayer?: (playerId: number) => void

  pendingRequests?: PendingJoinRequest[]

  onAcceptJoinRequest?: (requestId: string) => void

  onRejectJoinRequest?: (requestId: string) => void

  turnBuildingsBuilt?: string[]

  setTurnBuildingsBuilt?: React.Dispatch<React.SetStateAction<string[]>>

  turnPurchasedProperties?: string[]

  setTurnPurchasedProperties?: React.Dispatch<React.SetStateAction<string[]>>

  activeLanding?: { propertyId: string | null; position: number; isActive: boolean } | null

  setActiveLanding?: React.Dispatch<React.SetStateAction<{ propertyId: string | null; position: number; isActive: boolean } | null>>

  currentTurnId?: number

  setCurrentTurnId?: React.Dispatch<React.SetStateAction<number>>

  propertyOwnerCrossings?: Record<string, number>

  setPropertyOwnerCrossings?: React.Dispatch<React.SetStateAction<Record<string, number>>>

}) {

  const [isLeavingRoom, setIsLeavingRoom] = useState(false)

  const [isResigning, setIsResigning] = useState(false)



  const handleResign = async () => {

    if (isResigning) return

    setIsResigning(true)

    try {

      const res = await defaultEngine.resignPlayer?.(localPlayerId)

      if (res && res.success && res.state) {

        if (applyGameStateSnapshot) {

          applyGameStateSnapshot(res.state)

        }

        if (res.state.players && setPlayers) {

          setPlayers(res.state.players)

        }

        if (res.state.turnState === "GAME_OVER") {

          setTurnState("GAME_OVER")

          navigate("gameover")

        }

      }

      try {

        new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

      } catch (_) {}

      showToast("You have surrendered and resigned from the match.")

      setModal(null)

    } catch (err: any) {

      showToast(`Resignation failed: ${err?.message || "Communication error"}`)

    } finally {

      setIsResigning(false)

    }

  }



  const handleConfirmQuit = async () => {

    if (isLeavingRoom) return

    setIsLeavingRoom(true)

    try {

      if (multiplayerClient.getRoomCode()) {

        const res = await multiplayerClient.leaveRoom()

        if (res && (res as any).error) {

          showToast(`Could not leave room: ${(res as any).error}`)

          setIsLeavingRoom(false)

          return

        }

      } else {

        await defaultEngine.resetToLobby?.().catch(() => {})

      }

      setModal(null)

      navigate("menu")

    } catch (err: any) {

      showToast(`Leave room failed: ${err?.message || "Communication error"}`)

      setIsLeavingRoom(false)

    }

  }



  const isEffectiveHost = Boolean(

    Boolean(roomCode || multiplayerClient.getRoomCode())

      ? (localPlayerId !== null && (multiplayerClient.getLatestSnapshot()?.actingHostPlayerId ?? multiplayerClient.getLatestSnapshot()?.hostPlayerId) === localPlayerId)

      : (localPlayerId === 0 || isHost)

  )



  const [localPendingRequests, setLocalPendingRequests] = useState<PendingJoinRequest[]>(() => {

    return (multiplayerClient.getLatestSnapshot()?.joinRequests as PendingJoinRequest[]) || []

  })



  useEffect(() => {

    const unsubReq = multiplayerClient.onJoinRequest((req) => {

      setLocalPendingRequests((prev) => {

        if (prev.some((r) => r.requestId === req.requestId)) return prev

        return [...prev, req]

      })

      showToast(`Join request from ${req.name}!`)

    })



    const unsubSnap = multiplayerClient.onSnapshot((snap) => {

      if (snap?.joinRequests) {

        setLocalPendingRequests(snap.joinRequests)

      }

    })



    return () => {

      unsubReq()

      unsubSnap()

    }

  }, [])



  // Background polling for host in room to guarantee immediate join request discovery

  useEffect(() => {

    if (!roomCode || !isEffectiveHost) return

    const pollTimer = setInterval(() => {

      multiplayerClient.fetchRoomSnapshot(roomCode).catch(() => {})

    }, 2500)

    return () => clearInterval(pollTimer)

  }, [roomCode, isEffectiveHost])



  const combinedPendingRequests = useMemo(() => {

    const map = new Map<string, PendingJoinRequest>()

    ;(incomingPendingRequests || []).forEach((r) => map.set(r.requestId, r))

    ;(localPendingRequests || []).forEach((r) => map.set(r.requestId, r))

    return Array.from(map.values())

  }, [incomingPendingRequests, localPendingRequests])



  const handleActionAcceptJoin = async (requestId: string) => {

    try {

      if (incomingAcceptJoinRequest) {

        await incomingAcceptJoinRequest(requestId)

      } else {

        await multiplayerClient.respondJoinRequest(requestId, "ACCEPT")

        showToast("Player admitted to the table!")

      }

      setLocalPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId))

    } catch (err: any) {

      showToast(err?.message || "Failed to admit player")

    }

  }



  const handleActionRejectJoin = async (requestId: string) => {

    try {

      if (incomingRejectJoinRequest) {

        await incomingRejectJoinRequest(requestId)

      } else {

        await multiplayerClient.respondJoinRequest(requestId, "REJECT")

        showToast("Player join request declined.")

      }

      setLocalPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId))

    } catch (err: any) {

      showToast(err?.message || "Failed to reject player")

    }

  }



  const effectivePendingRequests = combinedPendingRequests

  const effectiveAcceptJoin = handleActionAcceptJoin

  const effectiveRejectJoin = handleActionRejectJoin



  const pendingTradesCount = (tradeOffers || []).filter(

    (t) => t.receiverId === localPlayerId && t.status === "PENDING",

  ).length



  // Quick Pop-in for Received Trade Offers (pops in for 1.2s then transitions directly into trade tab)

  const [activeTradePopup, setActiveTradePopup] = useState<TradeOffer | null>(null)

  const knownTradeIdsRef = useRef<Set<string>>(new Set())



  useEffect(() => {

    const pendingIncoming = (tradeOffers || []).filter(

      (t) => t.receiverId === localPlayerId && t.status === "PENDING",

    )

    for (const offer of pendingIncoming) {

      if (!knownTradeIdsRef.current.has(offer.id)) {

        knownTradeIdsRef.current.add(offer.id)

        setActiveTradePopup(offer)

        const popTimer = setTimeout(() => {

          setActiveTradePopup(null)

          setGameInfoInitialTab("trade")

          setGameInfoOpen(true)

        }, 1200)

        return () => clearTimeout(popTimer)

      }

    }

  }, [tradeOffers, localPlayerId])



  const [modal, setModal] = useState<Modal>(null)



  const [rolling, setRolling] = useState(false)

  const [diceRolling, setDiceRolling] = useState(false)

  const [diceSettling, setDiceSettling] = useState(false)



  const [moving, setMoving] = useState(false)

  const [movingPlayerIndex, setMovingPlayerIndex] = useState<number | null>(null)

  const rollingRef = useRef(false)

  const movingRef = useRef(false)

  const isMovementInProgressRef = useRef(false)

  const lastProcessedRollSeqRef = useRef<number>(-1)

  const lastProcessedRollIdRef = useRef<string>("")

  const movementGenerationRef = useRef<number>(0)

  rollingRef.current = rolling

  movingRef.current = moving



  const setMovementActive = useCallback((active: boolean) => {

    isMovementInProgressRef.current = active

    if (isGlobalMovementActiveRef) {

      isGlobalMovementActiveRef.current = active

    }

  }, [isGlobalMovementActiveRef])



  const [dice, setDice] = useState<[number, number]>([1, 1])



  const [turnDiceTotal, setTurnDiceTotal] = useState<number | undefined>(

    undefined,

  )



  const [pendingAdvanceState, setPendingAdvanceState] =

    useState<GameState | null>(null)



  const [toastMessage, setToastMessage] = useState<string | null>(null)



  const [selectedProp, setSelectedProp] =

    useState<PropertyDefinition | SpecialPropertyDefinition>(

      CITY_PROPERTIES.bombay,

    )



  const [taxName, setTaxName] = useState<string>("INCOME TAX")



  const [currentRentInfo, setCurrentRentInfo] = useState<RentInfo | undefined>(

    undefined,

  )



  const [localSecondsRemaining, setLocalSecondsRemaining] =

    useState<number>(timerSeconds)



  // ── SMART BOARD HIGHLIGHTING STATE ──

  const [selectedPlayerIdHighlight, setSelectedPlayerIdHighlight] = useState<number | null>(null)

  const [selectedPropertyIdHighlight, setSelectedPropertyIdHighlight] = useState<string | null>(null)

  const [landingHighlight, setLandingHighlight] = useState<{ tileIndex: number; id: number } | null>(null)

  const destinationTimerRef = useRef<any>(null)



  const triggerLandingHighlight = useCallback((tileIndex: number) => {

    if (destinationTimerRef.current) {

      clearTimeout(destinationTimerRef.current)

      destinationTimerRef.current = null

    }

    const highlightId = Date.now()

    setLandingHighlight({

      tileIndex,

      id: highlightId,

    })

    destinationTimerRef.current = setTimeout(() => {

      setLandingHighlight((current) => {

        if (current && current.id === highlightId) {

          return null

        }

        return current

      })

      destinationTimerRef.current = null

    }, 2200)

  }, [])



  const clearLandingHighlight = useCallback((targetTileIndex?: number | null) => {

    if (targetTileIndex !== undefined && targetTileIndex !== null) {

      setLandingHighlight((current) => {

        if (current && current.tileIndex === targetTileIndex) {

          if (destinationTimerRef.current) {

            clearTimeout(destinationTimerRef.current)

            destinationTimerRef.current = null

          }

          return null

        }

        return current

      })

    } else {

      if (destinationTimerRef.current) {

        clearTimeout(destinationTimerRef.current)

        destinationTimerRef.current = null

      }

      setLandingHighlight(null)

    }

  }, [])



  // ── ANIMATED CASH TRANSFERS FROM AUTHORITATIVE LEDGER (STRICT 2-SLOT QUEUE) ──

  const seenTxIdsRef = useRef<Set<string>>(new Set())

  const transferTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const pendingTransfersRef = useRef<ActiveCashTransfer[]>([])

  const [activeCashTransfers, setActiveCashTransfers] = useState<ActiveCashTransfer[]>([])



  // Cleanup all active transfer timers on unmount

  useEffect(() => {

    return () => {

      transferTimersRef.current.forEach((t) => clearTimeout(t))

      transferTimersRef.current.clear()

    }

  }, [])



  const queueTransferOrShow = useCallback((transfers: ActiveCashTransfer[]) => {

    setActiveCashTransfers((prev) => {

      let currentQueue = [...prev]

      for (const t of transfers) {

        if (currentQueue.some((item) => item.id === t.id)) continue

        // When queue has 2 items, evict oldest and immediately clean up its timer

        if (currentQueue.length >= 2) {

          const evicted = currentQueue.shift()

          if (evicted) {

            const timer = transferTimersRef.current.get(evicted.id)

            if (timer) {

              clearTimeout(timer)

              transferTimersRef.current.delete(evicted.id)

            }

          }

        }

        currentQueue.push(t)

        // Set individual expiry timer for newly added notification (2400ms duration)

        const tId = t.id

        const timer = setTimeout(() => {

          transferTimersRef.current.delete(tId)

          setActiveCashTransfers((cur) => cur.filter((item) => item.id !== tId))

        }, 2400)

        transferTimersRef.current.set(tId, timer)

      }

      return currentQueue.slice(-2)

    })

  }, [])



  useEffect(() => {

    if (!transactionLedger || transactionLedger.length === 0) return

    // Seed existing transaction IDs on first load/mount to prevent alert spam from prior turns

    if (seenTxIdsRef.current.size === 0) {

      for (const tx of transactionLedger) {

        seenTxIdsRef.current.add(tx.id)

      }

      return

    }



    const newTxs = transactionLedger.filter((tx) => !seenTxIdsRef.current.has(tx.id))

    if (newTxs.length === 0) return



    for (const tx of newTxs) {

      seenTxIdsRef.current.add(tx.id)

    }



    const transfers: ActiveCashTransfer[] = newTxs.map((tx) => {

      const payer = players.find((p) => p.id === tx.primaryPlayerId)

      const recipient = tx.counterpartyPlayerId >= 0 ? players.find((p) => p.id === tx.counterpartyPlayerId) : null

      return {

        id: tx.id,

        amount: tx.amount,

        type: tx.type,

        payerId: tx.primaryPlayerId,

        payerName: payer?.name || "Player",

        payerColor: payer?.color || "#c89b45",

        recipientId: tx.counterpartyPlayerId,

        recipientName: recipient?.name || (tx.counterpartyPlayerId === -1 ? "Bank" : "Player"),

        recipientColor: recipient?.color || "#ffd700",

        isBank: tx.counterpartyPlayerId === -1,

        timestamp: Date.now(),

      }

    })



    if (isMovementInProgressRef.current || movingRef.current || rollingRef.current) {

      // Movement in progress: queue payments so they appear strictly AFTER puck lands

      pendingTransfersRef.current.push(...transfers)

    } else {

      // Non-movement event (e.g. voluntary mortgaging, trading, building sale): show immediately

      queueTransferOrShow(transfers)

    }

  }, [transactionLedger, players, queueTransferOrShow])



  // ── BOARD-CENTRE EVENT NOTIFICATIONS QUEUE (Part 2) ──

  const [boardNotificationQueue, setBoardNotificationQueue] = useState<BoardCenterNotificationItem[]>([])

  const [currentBoardNotification, setCurrentBoardNotification] = useState<BoardCenterNotificationItem | null>(null)

  const [isNotificationDismissing, setIsNotificationDismissing] = useState<boolean>(false)

  const notificationTimerRef = useRef<number | null>(null)



  const dismissCurrentBoardNotification = useCallback(() => {

    setIsNotificationDismissing(true)

    if (notificationTimerRef.current !== null) {

      window.clearTimeout(notificationTimerRef.current)

      notificationTimerRef.current = null

    }

    window.setTimeout(() => {

      setCurrentBoardNotification(null)

      setIsNotificationDismissing(false)

    }, 280)

  }, [])



  const addBoardNotification = useCallback((item: BoardCenterNotificationItem) => {

    setBoardNotificationQueue((prev) => {

      if (prev.some((n) => n.id === item.id)) return prev

      return [...prev, item]

    })

  }, [])



  useEffect(() => {

    if (currentBoardNotification === null && boardNotificationQueue.length > 0) {

      const nextItem = boardNotificationQueue[0]

      setBoardNotificationQueue((prev) => prev.slice(1))

      setCurrentBoardNotification(nextItem)

      setIsNotificationDismissing(false)



      if (notificationTimerRef.current !== null) {

        window.clearTimeout(notificationTimerRef.current)

      }

      const dur = nextItem.durationMs ?? 4200

      notificationTimerRef.current = window.setTimeout(() => {

        dismissCurrentBoardNotification()

      }, dur)

    }

  }, [currentBoardNotification, boardNotificationQueue, dismissCurrentBoardNotification])



  // ── EXACTLY 2 NEW FEATURES: EVENT LOG & DICE HISTORY ──

  const [internalEventLogList, setInternalEventLogList] = useState<GameplayEventEntry[]>([])

  const effectiveEventLogList = eventLogList ?? internalEventLogList

  const effectiveSetEventLogList = setEventLogList ?? setInternalEventLogList

  const [eventLogOpen, setEventLogOpen] = useState<boolean>(false)

  const [diceHistoryList, setDiceHistoryList] = useState<DiceRollRecord[]>([])

  const [diceHistoryOpen, setDiceHistoryOpen] = useState<boolean>(false)



  // ── COMBINED INFORMATION PANEL (Game Info: Ledger, Trade, Events) ──

  const [gameInfoOpen, setGameInfoOpen] = useState<boolean>(false)

  const [gameInfoInitialTab, setGameInfoInitialTab] = useState<GameInfoTab>("ledger")

  const engineRules = rules ?? null

  const setEngineRules = useCallback(

    (newRules: Partial<GameRules> | ((prev: GameRules) => GameRules)) => {

      if (incomingSetEngineRules) {

        incomingSetEngineRules(newRules)

      } else if (onUpdateRules) {

        if (typeof newRules === "function") {

          onUpdateRules(newRules(rules ?? ({} as any)))

        } else {

          onUpdateRules(newRules)

        }

      }

    },

    [incomingSetEngineRules, onUpdateRules, rules],

  )



  const addGameplayEvent = (entry: GameplayEventEntry) => {

    effectiveSetEventLogList((prev) => {

      // 1. Direct ID match

      if (prev.some((e) => e.id === entry.id)) return prev



      // 2. Authoritative identity deduplication: prevent repeated effects, multiple producers, or network replays from duplicating the same event

      const isDuplicate = prev.some((e) => {

        const sameType = (e.type || "").toUpperCase() === (entry.type || "").toUpperCase()

        const samePlayer = e.playerId !== undefined && e.playerId === entry.playerId

        if (!sameType || !samePlayer) return false



        // Matching sequence numbers

        if (e.sequenceNumber !== undefined && entry.sequenceNumber !== undefined) {

          return e.sequenceNumber === entry.sequenceNumber

        }



        // Matching property for BUY or DECLINE

        if (e.propertyId && entry.propertyId && e.propertyId === entry.propertyId) {

          return Math.abs(e.timestamp - entry.timestamp) < 4000

        }



        // Close timestamp window (2.5s) for action events of same type & player

        if (Math.abs(e.timestamp - entry.timestamp) < 2500) {

          const typeUpper = e.type.toUpperCase()

          if (["ROLL_MOVE", "ROLL", "BUY", "DECLINE", "START_PASS", "TAX", "JAIL", "CLUB", "REST", "TURN_CHANGE"].includes(typeUpper)) {

            return true

          }

        }

        return false

      })

      if (isDuplicate) return prev



      return [entry, ...prev].slice(0, 100)

    })

  }



  const addDiceRollRecord = (record: DiceRollRecord) => {

    setDiceHistoryList((prev) => {

      if (prev.some((r) => r.id === record.id)) return prev

      return [record, ...prev].slice(0, 50)

    })

  }



  const activePlayer = players[activePlayerIndex] || players[0]



  const isMultiplayer = Boolean(roomCode || multiplayerClient.getRoomCode())



  // Authoritative Turn Identity: In multiplayer must match localPlayerId; in local pass-and-play, any active player can act

  const isHumanTurn = Boolean(

    (!isMultiplayer || activePlayerIndex === localPlayerId) &&

    turnState !== "GAME_OVER"

  )



  // 150-second (2 min 30 sec) Turn Timer for Human Player (Informational only: never force-ends turn)

  const currentTurnDuration = useMemo(() => {

    return turnTimer?.durationSeconds || timerSeconds || 60

  }, [turnTimer?.durationSeconds, timerSeconds])



  const [humanTimeRemaining, setHumanTimeRemaining] = useState<number>(currentTurnDuration)

  const [hasRolledThisTurn, setHasRolledThisTurn] = useState<boolean>(false)

  const isEndingTurnRef = useRef<boolean>(false)

  const timerFiredRef = useRef<boolean>(false)

  const advanceTurnTimeoutRef = useRef<number | null>(null)

  const turnEpochRef = useRef<number>(0)

  const prevActivePlayerIndexRef = useRef<number>(activePlayerIndex)



interface ActivePurchaseOpportunity {

  propertyId: string

  propertyName: string

  purchasePrice: number

  colorGroup?: string

  buyerId: number

  buyerName: string

  turnId: number

  skipped: boolean

  purchased: boolean

}



  // ── NON-MODAL BOARD-CENTRE PROPERTY PURCHASE STATE ──

  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchaseInfo | null>(null)

  const [purchaseOpportunity, setPurchaseOpportunity] = useState<ActivePurchaseOpportunity | null>(null)

  const purchaseOpportunityRef = useRef<ActivePurchaseOpportunity | null>(null)

  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState<boolean>(false)



  // Authoritative building rules state (synchronized with App / server snapshots)

  const [internalTurnBuildingsBuilt, internalSetTurnBuildingsBuilt] = useState<string[]>([])

  const turnBuildingsBuilt = incomingTurnBuildingsBuilt ?? internalTurnBuildingsBuilt

  const setTurnBuildingsBuilt = incomingSetTurnBuildingsBuilt ?? internalSetTurnBuildingsBuilt



  const [internalTurnPurchasedProperties, internalSetTurnPurchasedProperties] = useState<string[]>([])

  const turnPurchasedProperties = incomingTurnPurchasedProperties ?? internalTurnPurchasedProperties

  const setTurnPurchasedProperties = incomingSetTurnPurchasedProperties ?? internalSetTurnPurchasedProperties



  const [internalActiveLanding, internalSetActiveLanding] = useState<{ propertyId: string | null; position: number; isActive: boolean } | null>(null)

  const activeLanding = incomingActiveLanding !== undefined ? incomingActiveLanding : internalActiveLanding

  const setActiveLanding = incomingSetActiveLanding ?? internalSetActiveLanding



  const [internalCurrentTurnId, internalSetCurrentTurnId] = useState<number>(1)

  const currentTurnId = incomingCurrentTurnId ?? internalCurrentTurnId

  const setCurrentTurnId = incomingSetCurrentTurnId ?? internalSetCurrentTurnId



  const [internalPropertyOwnerCrossings, internalSetPropertyOwnerCrossings] = useState<Record<string, number>>({})

  const propertyOwnerCrossings = incomingPropertyOwnerCrossings ?? internalPropertyOwnerCrossings

  const setPropertyOwnerCrossings = incomingSetPropertyOwnerCrossings ?? internalSetPropertyOwnerCrossings



  // Immediately clear landing highlight if the landed property becomes owned (local, bot, or multiplayer)

  useEffect(() => {

    if (!landingHighlight) return

    const highlightedSpace = BOARD_SPACES[landingHighlight.tileIndex]

    if (!highlightedSpace?.propertyId) return

    const propId = highlightedSpace.propertyId

    const isNowOwned = players.some((p) => p.ownedProperties?.includes(propId))

    if (isNowOwned) {

      clearLandingHighlight()

    }

  }, [players, landingHighlight, clearLandingHighlight])



  // Re-evaluate affordability during active turn if player gains funds (e.g. mortgaging or trading)

  useEffect(() => {

    if (!purchaseOpportunity || purchaseOpportunity.skipped || purchaseOpportunity.purchased) {

      return

    }

    const propId = purchaseOpportunity.propertyId

    const isAlreadyOwned = players.some((p) => p.ownedProperties?.includes(propId))

    if (isAlreadyOwned) {

      setPurchaseOpportunity((prev) => (prev ? { ...prev, purchased: true } : null))

      if (purchaseOpportunityRef.current) purchaseOpportunityRef.current.purchased = true

      setPendingPurchase(null)

      return

    }



    const buyer = players.find((p) => p.id === purchaseOpportunity.buyerId) || players[purchaseOpportunity.buyerId]

    if (!buyer) return

    const canAfford = buyer.money >= purchaseOpportunity.purchasePrice

    if (canAfford) {

      setPendingPurchase((prev) => {

        if (!prev) {

          return {

            propertyId: purchaseOpportunity.propertyId,

            propertyName: purchaseOpportunity.propertyName,

            purchasePrice: purchaseOpportunity.purchasePrice,

            colorGroup: purchaseOpportunity.colorGroup,

            buyerId: purchaseOpportunity.buyerId,

            buyerName: buyer.name,

            buyerMoney: buyer.money,

            canAfford: true,

          }

        }

        if (prev.buyerMoney !== buyer.money || !prev.canAfford) {

          return {

            ...prev,

            buyerMoney: buyer.money,

            canAfford: true,

          }

        }

        return prev

      })

    } else {

      setPendingPurchase(null)

    }

  }, [players, purchaseOpportunity])



  // Configurable gliding animation step duration

  const currentStepDuration = useMemo(() => {

    return preferences?.reducedMotion

      ? 15

      : preferences?.animationSpeed === "slow"

      ? 190

      : preferences?.animationSpeed === "fast"

      ? 105

      : 140

  }, [preferences?.reducedMotion, preferences?.animationSpeed])



  const [activeStepDuration, setActiveStepDuration] = useState<number>(() => currentStepDuration)



  useEffect(() => {

    setActiveStepDuration(currentStepDuration)

  }, [currentStepDuration])



  const animatePlayerMovement = useCallback(

    async (

      movingPlayerId: number,

      startPos: number,

      targetPos: number,

      stepsToWalk: number,

      isStraightToJail: boolean = false,

      isFinalStage: boolean = true,

    ) => {

      const currentGen = ++movementGenerationRef.current



      const finishMovement = () => {

        if (movementGenerationRef.current !== currentGen) return

        setActiveStepDuration(currentStepDuration)

        setPlayerPositions((prev) => {

          const next = [...prev]

          next[movingPlayerId] = targetPos

          return next

        })

        setMoving(false)

        movingRef.current = false

        setMovementActive(false)

        setMovingPlayerIndex(null)



        // Only trigger the landing highlight for the final authoritative destination

        if (isFinalStage) {

          triggerLandingHighlight(targetPos)

        }



        // Release queued landing payment notifications strictly upon visual landing

        if (pendingTransfersRef.current.length > 0) {

          const toShow = [...pendingTransfersRef.current]

          pendingTransfersRef.current = []

          queueTransferOrShow(toShow)

        }



        if (pendingSnapshotRef?.current) {

          const snap = pendingSnapshotRef.current

          pendingSnapshotRef.current = null

          if (snap.players && Array.isArray(snap.players)) {

            setPlayers((prev) => {

              return snap.players.map((mp: any, idx: number) => {

                const existing = prev.find((p) => p.id === mp.id) || prev[idx]

                return {

                  ...existing,

                  ...mp,

                  money: mp.money ?? existing?.money ?? 0,

                  position: mp.position ?? existing?.position ?? 0,

                  name: mp.name || existing?.name,

                  color: mp.color || existing?.color,

                  ownedProperties: mp.ownedProperties ? [...mp.ownedProperties] : (existing?.ownedProperties ? [...existing.ownedProperties] : []),

                  buildings: mp.buildings ? { ...mp.buildings } : (existing?.buildings ? { ...existing.buildings } : {}),

                  mortgages: mp.mortgages ? { ...mp.mortgages } : (existing?.mortgages ? { ...existing.mortgages } : {}),

                }

              })

            })

          }

          if (snap.gameState && applyGameStateSnapshot) {

            applyGameStateSnapshot(snap.gameState)

          }

          if (snap.eventLog && snap.eventLog.length > 0) {

            effectiveSetEventLogList(snap.eventLog)

          }

        }

      }



      setMovementActive(true)

      setMovingPlayerIndex(movingPlayerId)



      if (destinationTimerRef.current) {

        clearTimeout(destinationTimerRef.current)

      }

      setLandingHighlight(null)



      // Guarantee position is precisely at startPos before movement begins

      setPlayerPositions((prev) => {

        const next = [...prev]

        next[movingPlayerId] = startPos

        return next

      })

      setMoving(true)

      movingRef.current = true



      // Controlled special movement: Jail send, card-induced jump, or 0-step action

      if (stepsToWalk === 0 || isStraightToJail) {

        if (startPos === targetPos) {

          finishMovement()

          return

        }



        // Controlled exponential transit across the board without abrupt snapping or teleporting

        const transitMs = preferences?.reducedMotion

          ? 30

          : ANIMATION_TIMINGS.TOKEN.controlledTransit

        setActiveStepDuration(transitMs)

        setPlayerPositions((prev) => {

          const next = [...prev]

          next[movingPlayerId] = targetPos

          return next

        })



        await new Promise<void>((resolve) => window.setTimeout(resolve, transitMs))

        if (movementGenerationRef.current !== currentGen) return



        audioSystem.playMoveComplete()

        const holdMs = preferences?.reducedMotion ? 20 : ANIMATION_TIMINGS.TOKEN.landingHold

        await new Promise<void>((resolve) => window.setTimeout(resolve, holdMs))

        if (movementGenerationRef.current !== currentGen) return



        finishMovement()

        return

      }



      // Step schedule with adaptive distance-scaled velocity and exponential ease-out landing

      const schedule = getAdaptiveStepSchedule(

        stepsToWalk,

        preferences?.animationSpeed,

        preferences?.reducedMotion,

      )

      let currPos = startPos



      for (let step = 0; step < stepsToWalk; step++) {

        currPos = (currPos + 1) % 36

        const stepMs = schedule.stepDurations[step] ?? 120

        setActiveStepDuration(stepMs)



        setPlayerPositions((prev) => {

          const next = [...prev]

          next[movingPlayerId] = currPos

          return next

        })



        await new Promise<void>((resolve) => window.setTimeout(resolve, stepMs))

        if (movementGenerationRef.current !== currentGen) return

      }



      audioSystem.playMoveComplete()

      const landingHold = preferences?.reducedMotion ? 20 : ANIMATION_TIMINGS.TOKEN.landingHold

      await new Promise<void>((resolve) => window.setTimeout(resolve, landingHold))

      if (movementGenerationRef.current !== currentGen) return



      finishMovement()

    },

    [

      preferences?.animationSpeed,

      preferences?.reducedMotion,

      currentStepDuration,

      setMovementActive,

      setPlayerPositions,

      pendingSnapshotRef,

      applyGameStateSnapshot,

      triggerLandingHighlight,

    ],

  )



  // Invalidate pending callbacks and reset state on active player change

  useEffect(() => {

    if (prevActivePlayerIndexRef.current !== activePlayerIndex) {

      prevActivePlayerIndexRef.current = activePlayerIndex

      turnEpochRef.current += 1

      timerFiredRef.current = false

      if (advanceTurnTimeoutRef.current !== null) {

        window.clearTimeout(advanceTurnTimeoutRef.current)

        advanceTurnTimeoutRef.current = null

      }

      isEndingTurnRef.current = false

      setPendingPurchase(null)

      setPurchaseOpportunity(null)

      purchaseOpportunityRef.current = null

      if (isHumanTurn) {

        const initialSec = turnTimer?.remainingSeconds ?? currentTurnDuration

        setHumanTimeRemaining(initialSec > 0 ? initialSec : currentTurnDuration)

        setHasRolledThisTurn(false)

      }

    }

  }, [activePlayerIndex, isHumanTurn, currentTurnDuration, turnTimer?.remainingSeconds])



  // Steady 1-second countdown for human turn. When reaching zero, trigger authoritative engine timeout

  useEffect(() => {

    if (!isGameStarted || !isHumanTurn || turnState === "GAME_OVER" || !timerEnabled) return

    const currentEpoch = turnEpochRef.current

    const playerAtStart = activePlayerIndex



    const tick = window.setInterval(() => {

      setHumanTimeRemaining((prev) => {

        if (prev <= 1) {

          if (!timerFiredRef.current && turnEpochRef.current === currentEpoch && !isEndingTurnRef.current) {

            timerFiredRef.current = true

            isEndingTurnRef.current = true

            defaultEngine.handleTimeout(playerAtStart).then(async (res) => {

              if (turnEpochRef.current !== currentEpoch) return

              if (res && res.state) {

                syncAuthoritativeState()

              }

            }).catch(() => {})

          }

          return 0

        }

        return prev - 1

      })

    }, 1000)



    return () => window.clearInterval(tick)

  }, [isGameStarted, isHumanTurn, activePlayerIndex, turnState, timerEnabled])



  const formatTimer = (sec: number) => {

    const m = Math.floor(sec / 60)

    const s = sec % 60

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`

  }



  // End Turn Action: Allowed only after mandatory actions resolved, prohibited on doubles and negative debt

  const isMustSkip = Boolean(activePlayer?.inRestHouse || activePlayer?.cardJailSkip)



  const canEndTurn = Boolean(

    isHumanTurn &&

    !rolling &&

    !moving &&

    !diceRolling &&

    !diceSettling &&

    modal === null &&

    activePlayer.money >= 0 &&

    (isMustSkip

      ? turnState !== "GAME_OVER"

      : (

          turnState !== "WAITING_FOR_ROLL" &&

          turnState !== "ROLLING" &&

          turnState !== "MOVING" &&

          turnState !== "RESOLVING_LANDING" &&

          turnState !== "EXTRA_TURN" &&

          turnState !== "GAME_OVER" &&

          (hasRolledThisTurn || turnState === "WAITING_FOR_ACTION" || turnState === "TURN_COMPLETE")

        ))

  )



  const activePlayerPhaseText = useMemo(() => {

    if (turnState === "GAME_OVER") return "Game Over"

    if (rolling || diceRolling) return "Rolling dice..."

    if (moving) return "Moving token..."

    if (pendingPurchase) return "Awaiting purchase decision"

    if (activePlayer?.inRestHouse) return isHumanTurn ? "Rest House: Turn Skipped" : `${activePlayer.name} resting (Turn Skipped)`

    if (activePlayer?.cardJailSkip) return isHumanTurn ? "Jail: Turn Skipped" : `${activePlayer.name} in Jail (Turn Skipped)`

    if (turnState === "WAITING_FOR_ROLL") return isHumanTurn ? "Your roll" : "Awaiting roll"

    if (turnState === "EXTRA_TURN") return isHumanTurn ? "Doubles! Roll again" : "Rolling extra turn"

    if (turnState === "RESOLVING_LANDING") return "Resolving landing"

    if (canEndTurn) return isHumanTurn ? "Ready to end turn" : "Resolving turn"

    if (turnState === "WAITING_FOR_ACTION") return "Action pending"

    return "In Progress"

  }, [turnState, rolling, diceRolling, moving, pendingPurchase, isHumanTurn, canEndTurn, activePlayer])



  const handleConfirmBuyCenter = async () => {

    if (!pendingPurchase || isSubmittingPurchase) return

    const buyerId = pendingPurchase.buyerId

    const buyer = players.find((p) => p.id === buyerId) || players[buyerId] || players[0]

    if (buyer.money < pendingPurchase.purchasePrice) {

      const needed = pendingPurchase.purchasePrice - buyer.money

      showToast(`Insufficient cash: need ₹${needed.toLocaleString()} more (Have ₹${buyer.money.toLocaleString()})`)

      return

    }



    setIsSubmittingPurchase(true)

    let purchaseSucceeded = false

    try {

      const res = await defaultEngine.buyCurrentProperty(buyerId)

      if (res.success) {

        purchaseSucceeded = true

        audioSystem.playPurchase()

        clearLandingHighlight()

        if (purchaseOpportunityRef.current) {

          purchaseOpportunityRef.current.purchased = true

        }

        setPurchaseOpportunity((prev) => (prev ? { ...prev, purchased: true } : null))

        setPendingPurchase(null)



        const mergedPlayers = res.state.players.map((p, pIdx) => {

          let name = p.name

          let color = p.color

          if (!name || !name.trim()) {

            try {

              const saved = getStoredPlayerName(pIdx)

              if (saved && saved.trim()) name = saved.trim()

            } catch (_) {}

          }

          return { ...p, name, color }

        })

        setPlayers(mergedPlayers)

        if (res.state.propertyOwnerCrossings) {

          setPropertyOwnerCrossings(res.state.propertyOwnerCrossings)

        }

        setTurnState(res.state.turnState)

        if (res.state.turnPurchasedProperties) {

          setTurnPurchasedProperties(res.state.turnPurchasedProperties)

        } else {

          setTurnPurchasedProperties((prev) => Array.from(new Set([...prev, pendingPurchase.propertyId])))

        }

        if (res.state.turnBuildingsBuilt) {

          setTurnBuildingsBuilt(res.state.turnBuildingsBuilt)

        }

        if (res.state.activeLanding !== undefined) {

          setActiveLanding(res.state.activeLanding)

        }

        if (res.state.currentTurnId !== undefined) {

          setCurrentTurnId(res.state.currentTurnId)

        }

        if (res.state.turnState === "EXTRA_TURN") {

          setHasRolledThisTurn(false)

        }

        const buyMsg = `${buyer.name} bought ${pendingPurchase.propertyName} for ₹${pendingPurchase.purchasePrice.toLocaleString()}.`

        const engineBuyId = res.state.activityLog && res.state.activityLog.length > 0

          ? [...res.state.activityLog].reverse().find((l) => (l.type === "buy" || l.type === "BUY") && l.playerId === buyerId)?.id

          : undefined

        const stableBuyId = engineBuyId !== undefined ? `engine_buy_${engineBuyId}` : `buy_${buyerId}_${pendingPurchase.propertyId}_${Date.now()}`

        addGameplayEvent({

          id: stableBuyId,

          type: "BUY",

          timestamp: Date.now(),

          playerId: buyerId,

          playerName: buyer.name,

          propertyId: pendingPurchase.propertyId,

          propertyName: pendingPurchase.propertyName,

          amount: pendingPurchase.purchasePrice,

          description: buyMsg,

        })

        addBoardNotification({

          id: `board_buy_${Date.now()}_${buyerId}`,

          type: "PURCHASE",

          category: "PROPERTY PURCHASE",

          message: `${buyer.name} bought ${pendingPurchase.propertyName} for ₹${pendingPurchase.purchasePrice.toLocaleString()}`,

          amount: pendingPurchase.purchasePrice,

          durationMs: 1000,

          timestamp: Date.now(),

          icon: "",

        })

        try {

          new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

        } catch (_) {}

      } else {

        audioSystem.playWarning()

        const errMsg = (res as any).error || "Property purchase was rejected by the engine."

        showToast(errMsg)

        addBoardNotification({

          id: `board_buy_err_${Date.now()}`,

          type: "ERROR",

          category: "PURCHASE FAILED",

          message: errMsg,

          durationMs: 1500,

          timestamp: Date.now(),

          icon: "",

        })

      }

    } finally {

      setIsSubmittingPurchase(false)

      if (purchaseSucceeded) {

        setPendingPurchase(null)

      }

    }

  }



  const handleDeclineCenter = async () => {

    if (!pendingPurchase || isSubmittingPurchase) return

    const buyerId = pendingPurchase.buyerId

    const buyer = players[buyerId] || players[0]

    setIsSubmittingPurchase(true)

    try {

      if (purchaseOpportunityRef.current) {

        purchaseOpportunityRef.current.skipped = true

      }

      clearLandingHighlight()

      setPurchaseOpportunity((prev) => (prev ? { ...prev, skipped: true } : null))

      setPendingPurchase(null)



      const res = await defaultEngine.declinePropertyPurchase(buyerId)

      audioSystem.playWarning()

      if (res && res.state) {

        setTurnState(res.state.turnState)

        if (res.state.turnState === "EXTRA_TURN") {

          setHasRolledThisTurn(false)

        }

      }

      const decMsg = `${buyer.name} declined to buy ${pendingPurchase.propertyName}.`

      addGameplayEvent({

        id: `decline_${Date.now()}_${buyerId}_${pendingPurchase.propertyId}`,

        type: "DECLINE",

        timestamp: Date.now(),

        playerId: buyerId,

        playerName: buyer.name,

        propertyId: pendingPurchase.propertyId,

        propertyName: pendingPurchase.propertyName,

        description: decMsg,

      })

      addBoardNotification({

        id: `board_decline_${Date.now()}_${buyerId}`,

        type: "DECLINE",

        category: "PURCHASE DECLINED",

        message: `${buyer.name} declined to buy ${pendingPurchase.propertyName}`,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })

    } finally {

      setIsSubmittingPurchase(false)

      setPendingPurchase(null)

    }

  }



  const handleCreateTradeOffer = async (

    receiverId: number,

    senderProps: string[],

    senderCash: number,

    receiverProps: string[],

    receiverCash: number,

  ) => {

    if (!defaultEngine.createTradeOffer) return false

    const res = await defaultEngine.createTradeOffer(localPlayerId, receiverId, senderProps, senderCash, receiverProps, receiverCash)

    if (res.success) {

      const targetPlayer = (players || []).find((p) => p.id === receiverId)

      const isBot = !targetPlayer?.isHuman

      if (isBot && res.tradeId && defaultEngine.acceptTradeOffer) {

        const acceptRes = await defaultEngine.acceptTradeOffer(res.tradeId, receiverId)

        if (acceptRes.success) {

          if (setPlayers) setPlayers(acceptRes.state.players)

          if (setTradeOffers) setTradeOffers(acceptRes.state.tradeOffers || [])

          try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

          showToast(`TRADE ACCEPTED BY ${targetPlayer?.name || "BOT"}!`)

          return true

        }

      }

      if (setPlayers) setPlayers(res.state.players)

      if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

      try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

      showToast("TRADE PROPOSED")

      return true

    }

    return false

  }



  const handleAcceptTradeOffer = async (tradeId: string) => {

    if (!defaultEngine.acceptTradeOffer) return false

    const res = await defaultEngine.acceptTradeOffer(tradeId, localPlayerId)

    if (res.success) {

      if (setPlayers) setPlayers(res.state.players)

      if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

      try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

      showToast("TRADE ACCEPTED & EXECUTED")

      return true

    }

    return false

  }



  const handleRejectTradeOffer = async (tradeId: string) => {

    if (!defaultEngine.rejectTradeOffer) return false

    const res = await defaultEngine.rejectTradeOffer(tradeId, localPlayerId)

    if (res.success) {

      if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

      try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

      showToast("TRADE REJECTED")

      return true

    }

    return false

  }



  const handleCancelTradeOffer = async (tradeId: string) => {

    if (!defaultEngine.cancelTradeOffer) return false

    const res = await defaultEngine.cancelTradeOffer(tradeId, localPlayerId)

    if (res.success) {

      if (setTradeOffers) setTradeOffers(res.state.tradeOffers || [])

      try { new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" }) } catch (_) {}

      showToast("TRADE CANCELLED")

      return true

    }

    return false

  }



  const handleManualEndTurn = async () => {

    if (!canEndTurn || isEndingTurnRef.current) return

    if (activePlayer.money < 0) {

      showToast(`Outstanding debt of ₹${Math.abs(activePlayer.money).toLocaleString()} must be settled or you must resign before ending turn.`)

      return

    }

    isEndingTurnRef.current = true

    try {

      audioSystem.playTurnChange()

      if (purchaseOpportunityRef.current) {

        purchaseOpportunityRef.current.skipped = true

      }

      setPurchaseOpportunity((prev) => (prev ? { ...prev, skipped: true } : null))

      setPendingPurchase(null)



      const res = await defaultEngine.endTurn(activePlayerIndex)

      if ((res as any).error) {

        showToast((res as any).error)

        return

      }

      const nextState = res.state

      setHasRolledThisTurn(false)

      // Immediately clear turn-scoped purchase and building tracking from next authoritative engine state

      const endTurnMergedPlayers = nextState.players.map((p, pIdx) => {

        let name = p.name

        let color = p.color

        if (!name || !name.trim()) {

          try {

            const saved = getStoredPlayerName(pIdx)

            if (saved && saved.trim()) name = saved.trim()

          } catch (_) {}

        }

        return { ...p, name, color }

      })

      setPlayers(endTurnMergedPlayers)

      if (nextState.propertyOwnerCrossings) {

        setPropertyOwnerCrossings(nextState.propertyOwnerCrossings)

      }

      setTurnPurchasedProperties(nextState.turnPurchasedProperties ?? [])

      setTurnBuildingsBuilt(nextState.turnBuildingsBuilt ?? [])

      setActiveLanding(nextState.activeLanding ?? null)

      if (nextState.currentTurnId !== undefined) setCurrentTurnId(nextState.currentTurnId)

      addGameplayEvent({

        id: `manual_end_${Date.now()}_${activePlayerIndex}`,

        type: "TURN_CHANGE",

        timestamp: Date.now(),

        playerId: activePlayerIndex,

        playerName: activePlayer.name,

        description: `${activePlayer.name} ended turn. It is now ${nextState.players[nextState.activePlayerIndex]?.name}'s turn.`

      })

      advanceTurn(nextState, 300)

    } finally {

      isEndingTurnRef.current = false

    }

  }



  // Authoritative auto-advance for skipped turns (Rest House or card Jail)

  useEffect(() => {

    if (

      isGameStarted &&

      isMustSkip &&

      isHumanTurn &&

      turnState !== "GAME_OVER" &&

      !rolling &&

      !moving &&

      !diceRolling &&

      !diceSettling &&

      modal === null

    ) {

      const skipTimer = window.setTimeout(() => {

        if (!isEndingTurnRef.current) {

          handleManualEndTurn()

        }

      }, 1500)

      return () => window.clearTimeout(skipTimer)

    }

  }, [isGameStarted, isMustSkip, isHumanTurn, turnState, activePlayerIndex, rolling, moving, diceRolling, diceSettling, modal])



  // Autonomous bot property purchase logic

  const handleBotPropertyPurchase = async (

    botId: number,

    prop: PropertyDefinition | SpecialPropertyDefinition,

    engineState: GameState,

  ) => {

    // Defense-in-depth: Never allow bot purchase handler to process human player

    const bot = engineState.players[botId]

    const isBotHuman = Boolean(bot?.isHuman ?? (botId === localPlayerId))

    if (isBotHuman) {

      console.warn(`[handleBotPropertyPurchase] Blocked: Player #${botId} is human!`)

      return

    }



    try {

      const price = prop.purchasePrice

      const sensible = bot && bot.money >= price + 1000



      if (sensible) {

        const res = await defaultEngine.buyCurrentProperty(botId)

        if (res.success) {

          clearLandingHighlight()

          const mergedPlayers = res.state.players.map((p, pIdx) => {

            let name = p.name

            let color = p.color

            if (!name || !name.trim()) {

              try {

                const saved = getStoredPlayerName(pIdx)

                if (saved && saved.trim()) name = saved.trim()

              } catch (_) {}

            }

            return { ...p, name, color }

          })

          setPlayers(mergedPlayers)

          if (res.state.propertyOwnerCrossings) {

            setPropertyOwnerCrossings(res.state.propertyOwnerCrossings)

          }

          if (res.state.turnPurchasedProperties) {

            setTurnPurchasedProperties(res.state.turnPurchasedProperties)

          }

          if (res.state.turnBuildingsBuilt) {

            setTurnBuildingsBuilt(res.state.turnBuildingsBuilt)

          }

          if (res.state.activeLanding !== undefined) {

            setActiveLanding(res.state.activeLanding)

          }

          if (res.state.currentTurnId !== undefined) {

            setCurrentTurnId(res.state.currentTurnId)

          }

          const engineBuyId = res.state.activityLog && res.state.activityLog.length > 0

            ? [...res.state.activityLog].reverse().find((l) => (l.type === "buy" || l.type === "BUY") && l.playerId === botId)?.id

            : undefined

          const stableBuyId = engineBuyId !== undefined ? `engine_buy_${engineBuyId}` : `bot_buy_${botId}_${prop.id}_${Date.now()}`

          addGameplayEvent({

            id: stableBuyId,

            type: "BUY",

            timestamp: Date.now(),

            playerId: botId,

            playerName: bot.name,

            propertyId: prop.id,

            propertyName: prop.name,

            amount: price,

            description: `${bot.name} bought ${prop.name} for ₹${price.toLocaleString()}.`,

          })

          addBoardNotification({

            id: `board_bot_buy_${Date.now()}_${botId}_${prop.id}`,

            type: "PURCHASE",

            category: "PROPERTY PURCHASE",

            message: `${bot.name} bought ${prop.name} for ₹${price.toLocaleString()}`,

            amount: price,

            durationMs: 1000,

            timestamp: Date.now(),

            icon: "",

          })

          audioSystem.playPurchase()

          advanceTurn(res.state, 800)

          return

        }

      }



      // Declined purchase

      const res = await defaultEngine.declinePropertyPurchase(botId)

      addGameplayEvent({

        id: `bot_decline_${Date.now()}_${botId}_${prop.id}`,

        type: "DECLINE",

        timestamp: Date.now(),

        playerId: botId,

        playerName: bot.name,

        propertyId: prop.id,

        propertyName: prop.name,

        description: `${bot.name} declined to buy ${prop.name}.`,

      })

      advanceTurn(res.state || engineState, 600)

    } catch (_) {

      advanceTurn(engineState, 600)

    }

  }



  const userPos = playerPositions[activePlayerIndex]



  const showToast = (msg: string, durationMs = 1200) => {

    const isError = /insufficient|not permitted|failed|cannot|error|blocked|invalid|must|wait|already/i.test(msg)

    addBoardNotification({

      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

      type: isError ? "ERROR" : "INFO",

      category: isError ? "NOTICE" : "INFO",

      message: msg,

      timestamp: Date.now(),

      durationMs: durationMs || 1000,

    })

  }



  // Synchronize authoritative state from engine

  const syncAuthoritativeState = async () => {

    if (

      rollingRef.current ||

      movingRef.current ||

      isMovementInProgressRef.current ||

      rolling ||

      moving ||

      diceRolling ||

      diceSettling

    )

      return

    try {

      const state = await defaultEngine.getState()

      // Re-check synchronously after await to eliminate async race condition

      if (

        rollingRef.current ||

        movingRef.current ||

        isMovementInProgressRef.current ||

        rolling ||

        moving ||

        diceRolling ||

        diceSettling

      )

        return



      const mergedPlayers = state.players.map((p, idx) => {

        let name = p.name

        let color = p.color

        if (!name || !name.trim()) {

          try {

            const saved = getStoredPlayerName(idx)

            if (saved && saved.trim()) name = saved.trim()

          } catch (_) {}

        }

        return { ...p, name, color }

      })

      setPlayers(mergedPlayers)

      setRoundNumber(state.roundNumber)

      if (state.propertyOwnerCrossings) setPropertyOwnerCrossings(state.propertyOwnerCrossings)

      if (state.rules) {

        setEngineRules(state.rules)

      }

      if (state.turnState === "GAME_OVER") {

        setTurnState("GAME_OVER")

        navigate("gameover")

        return

      }

      if (

        turnState !== "RESOLVING_LANDING" &&

        turnState !== "ROLLING" &&

        turnState !== "MOVING" &&

        modal === null &&

        !isMovementInProgressRef.current &&

        !movingRef.current &&

        !rollingRef.current

      ) {

        setTurnState(state.turnState)

        setActivePlayerIndex(state.activePlayerIndex)

      }

      if (state.activityLog) {

        if (setActivityLog) setActivityLog(state.activityLog)

        const buyLogs = state.activityLog.filter((l) => l.type === "buy" || l.type === "BUY")

        if (buyLogs.length > 0) {

          effectiveSetEventLogList((prev) => {

            let next = [...prev]

            let changed = false

            for (const b of buyLogs) {

              const eventId = `engine_buy_${b.id}`

              if (!next.some((e) => e.id === eventId || (e.playerId === b.playerId && (e.description === b.description || (e.type?.toUpperCase() === "BUY" && Math.abs(e.timestamp - b.timestamp) < 4000))))) {

                next.push({

                  id: eventId,

                  type: "BUY",

                  timestamp: b.timestamp,

                  playerId: b.playerId,

                  playerName: b.playerName,

                  amount: Math.abs(b.amount),

                  description: b.description,

                })

                changed = true

              }

            }

            if (!changed) return prev

            return next.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)

          })

        }

      }

      if (state.transactionLedger && setTransactionLedger) {

        setTransactionLedger((prev) => {

          const existingIds = new Set(prev.map((t) => t.id))

          const toAdd = (state.transactionLedger || []).filter((t) => !existingIds.has(t.id))

          if (toAdd.length === 0) return prev

          return [...prev, ...toAdd]

        })

      }

      if (state.turnTimer && setTurnTimer) {

        setTurnTimer(state.turnTimer)

      }

      if (state.tradeOffers && setTradeOffers) {

        setTradeOffers(state.tradeOffers)

      }

      if (state.turnBuildingsBuilt !== undefined) setTurnBuildingsBuilt(state.turnBuildingsBuilt || [])

      if (state.turnPurchasedProperties !== undefined) setTurnPurchasedProperties(state.turnPurchasedProperties || [])

      if (state.activeLanding !== undefined) setActiveLanding(state.activeLanding)

      if (state.currentTurnId !== undefined) setCurrentTurnId(state.currentTurnId)

      if (

        !rollingRef.current &&

        !movingRef.current &&

        !isMovementInProgressRef.current &&

        !diceRolling &&

        !diceSettling

      ) {

        if (state.lastDice && state.lastDice[0] > 0 && state.lastDice[1] > 0) {

          setDice(state.lastDice)

        }

      }

      if (!rollingRef.current && !movingRef.current && !isMovementInProgressRef.current) {

        setPlayerPositions((prev) => {

          const next = [...prev]

          state.players.forEach((p, idx) => {

            next[idx] = p.position

          })

          return next

        })

      }

    } catch (_) {}

  }



  // Inter-tab and periodic polling sync

  useEffect(() => {

    let isMounted = true

    const bc =

      typeof BroadcastChannel !== "undefined"

        ? new BroadcastChannel("crownfall_sync")

        : null

    const handleBc = (evt: MessageEvent) => {

      if (isMounted && evt.data?.type === "SYNC") {

        syncAuthoritativeState()

      }

    }

    bc?.addEventListener("message", handleBc)



    const interval = window.setInterval(() => {

      if (isMounted) syncAuthoritativeState()

    }, 750)



    return () => {

      isMounted = false

      bc?.removeEventListener("message", handleBc)

      bc?.close()

      window.clearInterval(interval)

    }

  }, [])



  // Authoritative multiplayer roll event subscription (synchronizes remote player rolls & movements)

  useEffect(() => {

    const unsubRoll = multiplayerClient.onRollEvent(async (evt: RollEvent) => {

      // 1. Deduplicate stale or duplicate roll events

      if (evt.sequence && evt.sequence <= lastProcessedRollSeqRef.current) {

        return

      }

      if (evt.rollId && lastProcessedRollIdRef.current === evt.rollId) {

        return

      }

      // If initiated locally, mark sequence and do not animate a second time

      if (evt.playerId === localPlayerId) {

        if (evt.sequence) lastProcessedRollSeqRef.current = Math.max(lastProcessedRollSeqRef.current, evt.sequence)

        if (evt.rollId) lastProcessedRollIdRef.current = evt.rollId

        return

      }



      // 2. Mark this roll event sequence

      if (evt.sequence) lastProcessedRollSeqRef.current = evt.sequence

      if (evt.rollId) lastProcessedRollIdRef.current = evt.rollId



      const remotePlayerId = evt.playerId

      const remotePlayer = players[remotePlayerId] || { name: `Player ${remotePlayerId + 1}` }

      const startPos = evt.previousPosition !== undefined ? evt.previousPosition : (playerPositions[remotePlayerId] ?? 0)



      // Immediately freeze movement progress and anchor remote player puck to start position

      // to eliminate any async snapshot race condition or puck jumping to destination ahead of time

      setMovementActive(true)

      setMovingPlayerIndex(remotePlayerId)

      setPlayerPositions((prev) => {

        const next = [...prev]

        next[remotePlayerId] = startPos

        return next

      })



      // 3. Visual dice tumble and reveal

      setTurnState("ROLLING")

      setDiceRolling(true)

      setDiceSettling(false)



      if (preferences?.soundEffects) {

        audioSystem.playDiceRoll()

      }



      const remoteTumbleMs = preferences?.reducedMotion

        ? ANIMATION_TIMINGS.DICE.reducedMotion.tumble

        : preferences?.animationSpeed === "fast"

        ? ANIMATION_TIMINGS.DICE.fast.tumble

        : preferences?.animationSpeed === "slow"

        ? ANIMATION_TIMINGS.DICE.slow.tumble

        : ANIMATION_TIMINGS.DICE.standard.tumble



      const remoteSettleMs = preferences?.reducedMotion

        ? ANIMATION_TIMINGS.DICE.reducedMotion.settle

        : preferences?.animationSpeed === "fast"

        ? ANIMATION_TIMINGS.DICE.fast.settle

        : preferences?.animationSpeed === "slow"

        ? ANIMATION_TIMINGS.DICE.slow.settle

        : ANIMATION_TIMINGS.DICE.standard.settle



      await new Promise((r) => window.setTimeout(r, remoteTumbleMs))



      // Set authoritative dice from remote player's accepted roll

      setDice([evt.dice1, evt.dice2])

      setDiceRolling(false)

      setDiceSettling(true)



      // Add to dice roll record and event log

      addDiceRollRecord({

        id: `dice_${evt.rollId || Date.now()}`,

        timestamp: Date.now(),

        playerId: remotePlayerId,

        playerName: remotePlayer.name,

        dice1: evt.dice1,

        dice2: evt.dice2,

        total: evt.diceTotal,

        isDouble: evt.isDouble,

        spaceName: evt.spaceName,

      })



      await new Promise((r) => window.setTimeout(r, remoteSettleMs))

      setDiceSettling(false)



      // 4. Animate remote player token along perimeter

      setTurnState("MOVING")

      const isRemainingInJail = Boolean(

        evt.actionResult?.eventDescription?.toLowerCase().includes("remains in jail") ||

        (evt.newPosition === 9 && evt.previousPosition === 9 && !evt.isDouble)

      )

      const targetPos = isRemainingInJail ? 9 : evt.newPosition

      const effectiveStartPos = isRemainingInJail ? 9 : (evt.previousPosition !== undefined ? evt.previousPosition : startPos)

      const isStraightToJail = Boolean(

        evt.actionResult?.mustGoToJail &&

        (evt.actionResult?.eventDescription?.toLowerCase().includes("three consecutive doubles") ||

         evt.actionResult?.eventDescription?.toLowerCase().includes("consecutive doubles"))

      )

      const stepsToWalk = (isStraightToJail || isRemainingInJail) ? 0 : evt.diceTotal

      const intermediatePos = (effectiveStartPos + evt.diceTotal) % 36

      const isCardRedirection = !isStraightToJail && !isRemainingInJail && targetPos !== intermediatePos



      if (isCardRedirection) {

        await animatePlayerMovement(

          remotePlayerId,

          effectiveStartPos,

          intermediatePos,

          stepsToWalk,

          false,

          false,

        )

        await new Promise((r) => window.setTimeout(r, preferences?.reducedMotion ? 40 : 220))

        await animatePlayerMovement(

          remotePlayerId,

          intermediatePos,

          targetPos,

          0,

          targetPos === 9,

          true,

        )

      } else {

        await animatePlayerMovement(

          remotePlayerId,

          effectiveStartPos,

          targetPos,

          stepsToWalk,

          isStraightToJail || isRemainingInJail,

          true,

        )

      }



      // 5. Converge to authoritative state strictly after visual landing

      setTurnState("RESOLVING_LANDING")



      addGameplayEvent({

        id: evt.rollId ? `move_${evt.rollId}` : `move_${Date.now()}_${remotePlayerId}_${evt.newPosition}`,

        sequenceNumber: evt.sequence,

        type: "ROLL_MOVE",

        timestamp: Date.now(),

        playerId: remotePlayerId,

        playerName: remotePlayer.name,

        description: `${remotePlayer.name} rolled [${evt.dice1}, ${evt.dice2}] = ${evt.diceTotal}${evt.isDouble ? " (DOUBLES!)" : ""} and moved to ${evt.spaceName}.`,

      })

      if (evt.snapshot?.gameState) {

        const gs = evt.snapshot.gameState

        setRoundNumber(gs.roundNumber)

        if (gs.propertyOwnerCrossings) {

          setPropertyOwnerCrossings(gs.propertyOwnerCrossings)

        }

        if (gs.turnTimer && setTurnTimer) setTurnTimer(gs.turnTimer)

        if (gs.transactionLedger && setTransactionLedger) setTransactionLedger(gs.transactionLedger)

        if (gs.tradeOffers && setTradeOffers) setTradeOffers(gs.tradeOffers)

        if (gs.players) {

          setPlayers((prev) =>

            gs.players.map((mp: any, idx: number) => {

              const existing = prev.find((p) => p.id === mp.id) || prev[idx]

              return {

                id: mp.id,

                name: mp.name,

                color: mp.color as PlayerColor,

                token: mp.token || String(idx + 1),

                isHuman: mp.isHuman,

                money: mp.money ?? existing?.money ?? 0,

                position: mp.position ?? existing?.position ?? 0,

                rotationsCompleted: mp.rotationsCompleted ?? existing?.rotationsCompleted ?? 0,

                inJail: mp.inJail ?? existing?.inJail ?? false,

                jailTurns: mp.jailTurns ?? existing?.jailTurns ?? 0,

                inRestHouse: mp.inRestHouse ?? existing?.inRestHouse ?? false,

                restHouseTurns: mp.restHouseTurns !== undefined ? mp.restHouseTurns : (existing?.restHouseTurns ?? 0),

                cardJailSkip: mp.cardJailSkip ?? existing?.cardJailSkip ?? false,

                cardJailSkipTurns: mp.cardJailSkipTurns !== undefined ? mp.cardJailSkipTurns : (existing?.cardJailSkipTurns ?? 0),

                ownedProperties: mp.ownedProperties ?? existing?.ownedProperties ?? [],

                buildings: mp.buildings ?? existing?.buildings ?? {},

                mortgages: mp.mortgages ?? existing?.mortgages ?? {},

                isBankrupt: mp.isBankrupt ?? existing?.isBankrupt ?? false,

              }

            }),

          )

        }

        if (evt.sequence >= lastProcessedRollSeqRef.current) {

          setActivePlayerIndex(gs.activePlayerIndex)

          setTurnState(gs.turnState)

        }

      }

    })



    return () => {

      unsubRoll()

    }

  }, [players, localPlayerId, playerPositions, preferences, animatePlayerMovement, setRoundNumber, setTurnTimer, setTransactionLedger, setTradeOffers, setPlayers, setActivePlayerIndex, setTurnState])



  // Synchronize local countdown display with human turn timer during human turn

  useEffect(() => {

    if (isHumanTurn) {

      setLocalSecondsRemaining(humanTimeRemaining)

    } else if (turnTimer?.remainingSeconds !== undefined) {

      setLocalSecondsRemaining(turnTimer.remainingSeconds)

    }

  }, [isHumanTurn, humanTimeRemaining, turnTimer?.remainingSeconds])



  const handleSelectSpace = (space: BoardSpaceDefinition) => {

    setTurnDiceTotal(undefined)

    setPendingAdvanceState(null)



    if (space.type === "city" && space.propertyId) {

      const prop = CITY_PROPERTIES[space.propertyId]

      if (prop) {

        setSelectedProp(prop)

        setModal("property")

      }

    } else if (space.type === "special" && space.propertyId) {

      const sp = SPECIAL_PROPERTIES[space.propertyId]

      if (sp) {

        setSelectedProp(sp)

        setModal("property")

      }

    } else if (space.type === "tax") {

      if (space.index === 5 || space.name.toUpperCase().includes("INCOME")) {

        showToast("Income Tax: 10% of net earnings (income − expenses) in the current round.")

        addBoardNotification({

          id: `info_tax_${Date.now()}`,

          type: "TAX",

          category: "INCOME TAX",

          message: "Income Tax: 10% of net round earnings (actual income − expenses).",

          amount: 0,

          durationMs: 2500,

          timestamp: Date.now(),

          icon: "",

        })

      } else {

        showToast("Wealth Tax: ₹50 per unbuilt property, ₹100 per house, ₹150 per hotel.")

        addBoardNotification({

          id: `info_tax_${Date.now()}`,

          type: "TAX",

          category: "WEALTH TAX",

          message: "Wealth Tax: ₹50 per unbuilt property, ₹100 per house, ₹150 per hotel.",

          amount: 0,

          durationMs: 2500,

          timestamp: Date.now(),

          icon: "",

        })

      }

    } else if (space.index === 0) {

      const startingCap = engineRules?.defaultStartingMoney ?? rules?.defaultStartingMoney ?? 45000

      const startBonus = Math.floor((startingCap * 5 + 5000) / 10000) * 100

      showToast(`Start: Awards 100% starting capital (₹${startingCap.toLocaleString()}) on first rotation. Subsequent qualifying crossings collect 5% bonus (₹${startBonus.toLocaleString()}).`)

      addBoardNotification({

        id: `info_start_${Date.now()}`,

        type: "START_PASS",

        category: "START SPACE",

        message: `First rotation awards ₹${startingCap.toLocaleString()} starting capital. Subsequent qualifying crossings collect ₹${startBonus.toLocaleString()} (5% bonus).`,

        amount: startBonus,

        durationMs: 3000,

        timestamp: Date.now(),

        icon: "",

      })

    } else if (space.index === 18) {

      showToast("Royal Club: Visitors pay 5% of each active opponent's current-round positive earnings.")

      addBoardNotification({

        id: `info_club_${Date.now()}`,

        type: "CLUB",

        category: "ROYAL CLUB",

        message: "Royal Club: Pay 5% of each active opponent's current-round positive earnings.",

        amount: 0,

        durationMs: 3000,

        timestamp: Date.now(),

        icon: "",

      })

    } else if (space.index === 27) {

      showToast("Rest House: Visitors collect 5% of each active opponent's current-round positive earnings and skip their next turn.")

      addBoardNotification({

        id: `info_rest_${Date.now()}`,

        type: "REST",

        category: "REST HOUSE",

        message: "Rest House: Collect 5% of each active opponent's current-round positive earnings and skip next turn.",

        amount: 0,

        durationMs: 3000,

        timestamp: Date.now(),

        icon: "",

      })

    }

  }



  /** Schedule the next player's turn after a brief hold. */

  const advanceTurn = (engineState: GameState, holdMs = 1200) => {

    if (advanceTurnTimeoutRef.current !== null) {

      window.clearTimeout(advanceTurnTimeoutRef.current)

      advanceTurnTimeoutRef.current = null

    }

    setPendingPurchase(null)

    setPurchaseOpportunity(null)

    if (purchaseOpportunityRef.current) {

      purchaseOpportunityRef.current = null

    }

    advanceTurnTimeoutRef.current = window.setTimeout(() => {

      advanceTurnTimeoutRef.current = null

      audioSystem.playTurnChange()

      setActivePlayerIndex(engineState.activePlayerIndex)

      if (!isMultiplayer && _setLocalPlayerId) {

        _setLocalPlayerId(engineState.activePlayerIndex)

      }



      if (engineState.players && engineState.players.length > 0) {

        const advMergedPlayers = engineState.players.map((p, pIdx) => {

          let name = p.name

          let color = p.color

          if (!name || !name.trim()) {

            try {

              const saved = getStoredPlayerName(pIdx)

              if (saved && saved.trim()) name = saved.trim()

            } catch (_) {}

          }

          return { ...p, name, color }

        })

        setPlayers(advMergedPlayers)

      }



      setTurnState(engineState.turnState)

      setTurnPurchasedProperties(engineState.turnPurchasedProperties ?? [])

      setTurnBuildingsBuilt(engineState.turnBuildingsBuilt ?? [])

      setActiveLanding(engineState.activeLanding ?? null)

      if (engineState.currentTurnId !== undefined) setCurrentTurnId(engineState.currentTurnId)

      if (engineState.turnState === "GAME_OVER") {

        navigate("gameover")

      }

    }, holdMs)

  }



  const handleModalAcknowledged = () => {

    setModal(null)



    if (pendingAdvanceState) {

      const targetState = pendingAdvanceState

      setPendingAdvanceState(null)



      if (isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!multiplayerClient.getRoomCode()) {

        advanceTurn(targetState, 300)

      }

    }

  }



  /** Sync engine state to UI and open the correct modal for the result. */

  const resolvePostMovement = (result: TurnResult, engineState: GameState) => {

    const mergedPlayers = engineState.players.map((p, idx) => {

      if (!p.name || !p.name.trim()) {

        try {

          const saved = getStoredPlayerName(idx)

          if (saved && saved.trim()) return { ...p, name: saved.trim() }

        } catch (_) {}

      }

      return p

    })

    setPlayers(mergedPlayers)



    setRoundNumber(engineState.roundNumber)

    if (engineState.propertyOwnerCrossings) {

      setPropertyOwnerCrossings(engineState.propertyOwnerCrossings)

    }



    setTurnDiceTotal(result.diceTotal)



    if (engineState.activityLog && setActivityLog) {

      setActivityLog(engineState.activityLog)

    }



    if (engineState.turnTimer && setTurnTimer) {

      setTurnTimer(engineState.turnTimer)

    }



    if (engineState.turnPurchasedProperties !== undefined) {

      setTurnPurchasedProperties(engineState.turnPurchasedProperties || [])

    }

    if (engineState.turnBuildingsBuilt !== undefined) {

      setTurnBuildingsBuilt(engineState.turnBuildingsBuilt || [])

    }

    if (engineState.activeLanding !== undefined) {

      setActiveLanding(engineState.activeLanding)

    }

    if (engineState.currentTurnId !== undefined) {

      setCurrentTurnId(engineState.currentTurnId)

    }



    // Determine authoritative doubles rule status and extra turn eligibility

    const isDoublesRuleActive = Boolean(

      engineRules?.doublesRuleEnabled ?? rules?.doublesRuleEnabled ?? doublesRule

    )

    const hasExtraTurn = Boolean(

      (result.extraTurnGranted !== undefined ? result.extraTurnGranted : isDoublesRuleActive) &&

      isDoublesRuleActive &&

      result.isDouble &&

      !result.mustGoToJail

    )



    const isMultiplayer = Boolean(multiplayerClient.getRoomCode())

    const isActingPlayerLocal = result.playerId === localPlayerId

    const isActingPlayerHuman = isMultiplayer || Boolean(engineState.players[result.playerId]?.isHuman ?? true)



    // Event 7: Start-crossing (capital rotation & pass bonus)

    if (result.startingCapitalAwarded) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const capAmount = engineRules?.defaultStartingMoney ?? rules?.defaultStartingMoney ?? 45000

      const capMsg = `${pName} completed first rotation and received ₹${capAmount.toLocaleString()} starting capital!`

      addGameplayEvent({

        id: `capital_${Date.now()}_${result.playerId}`,

        type: "START_PASS",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        amount: capAmount,

        description: capMsg,

      })

      addBoardNotification({

        id: `board_cap_${Date.now()}_${result.playerId}`,

        type: "START_PASS",

        category: "START ROTATION",

        message: capMsg,

        amount: capAmount,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })

    } else if (result.passStartBonusAwarded) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const startCap = engineRules?.defaultStartingMoney ?? rules?.defaultStartingMoney ?? 45000

      const bonusAmount = engineRules?.passStartBonus ?? rules?.passStartBonus ?? Math.floor((startCap * 5 + 5000) / 10000) * 100

      const passMsg = `${pName} crossed START and collected ₹${bonusAmount.toLocaleString()} bonus.`

      addGameplayEvent({

        id: `pass_start_${Date.now()}_${result.playerId}`,

        type: "START_PASS",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        amount: bonusAmount,

        description: passMsg,

      })

      addBoardNotification({

        id: `board_pass_${Date.now()}_${result.playerId}`,

        type: "START_PASS",

        category: "START BONUS",

        message: passMsg,

        amount: bonusAmount,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })

    }



    // Event 4: Jail (sent to jail)

    if (result.mustGoToJail) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const jailMsg = result.eventDescription || `${pName} was sent to Jail.`

      addGameplayEvent({

        id: `jail_${Date.now()}_${result.playerId}`,

        type: "JAIL",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        description: jailMsg,

      })

      addBoardNotification({

        id: `board_jail_${Date.now()}_${result.playerId}`,

        type: "JAIL",

        category: "ARREST & JAIL",

        message: jailMsg,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })

      if (isActingPlayerLocal || isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

        window.setTimeout(async () => {

          try {

            const endRes = await defaultEngine.endTurn(result.playerId)

            advanceTurn(endRes.state, 500)

          } catch (_) {}

        }, 1200)

      }

      return

    }



    // Event 4: Jail (just visiting on space 9 - only when not serving a jail sentence)

    const isPlayerInJailSentence = Boolean(

      engineState.players[result.playerId]?.inJail ||

      result.eventDescription?.toLowerCase().includes("jail") ||

      result.eventDescription?.toLowerCase().includes("remains in jail")

    )

    if (result.newPosition === 9 && !result.mustGoToJail && !isPlayerInJailSentence) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const visitMsg = `${pName} is just visiting Jail.`

      addGameplayEvent({

        id: `jail_visit_${Date.now()}_${result.playerId}`,

        type: "JAIL",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        description: visitMsg,

      })

      addBoardNotification({

        id: `board_jail_visit_${Date.now()}_${result.playerId}`,

        type: "JAIL",

        category: "JUST VISITING",

        message: visitMsg,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })

    }



    // Event 5: Club visit (space 18)

    if (result.newPosition === 18) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const clubMsg = result.eventDescription || `${pName} entered the Royal Club.`

      addGameplayEvent({

        id: `club_${Date.now()}_${result.playerId}`,

        type: "CLUB" as any,

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        description: clubMsg,

      })

    }



    // Event 6: Rest House visit (space 27)

    if (result.newPosition === 27 && result.previousPosition !== 27) {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const restMsg = result.eventDescription || `${pName} stopped at the Rest House (will skip next turn).`

      addGameplayEvent({

        id: `rest_${Date.now()}_${result.playerId}`,

        type: "REST",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        description: restMsg,

      })

      showToast(restMsg)

    }



    // Purchase Decision: Human must decide explicitly; Bot buys automatically

    if (result.eligibleToBuy && result.purchasablePropertyId) {

      const prop =

        CITY_PROPERTIES[result.purchasablePropertyId] ||

        SPECIAL_PROPERTIES[result.purchasablePropertyId]



      if (prop) {

        setSelectedProp(prop)

        const buyer = engineState.players[result.playerId]

        const isBuyerHuman = isMultiplayer

          ? result.playerId === localPlayerId

          : Boolean(buyer?.isHuman ?? (result.playerId === localPlayerId))



        if (isBuyerHuman) {

          const buyerMoney = buyer?.money || 0

          const canAfford = buyerMoney >= prop.purchasePrice



          const opp: ActivePurchaseOpportunity = {

            propertyId: prop.id,

            propertyName: prop.name,

            purchasePrice: prop.purchasePrice,

            colorGroup: "colorGroup" in prop ? (prop as any).colorGroup : undefined,

            buyerId: result.playerId,

            buyerName: buyer?.name || "Player",

            turnId: currentTurnId,

            skipped: false,

            purchased: false,

          }

          setPurchaseOpportunity(opp)

          purchaseOpportunityRef.current = opp



          if (canAfford) {

            // Human player can afford: non-modal purchase controls integrated into board center

            setPendingPurchase({

              propertyId: prop.id,

              propertyName: prop.name,

              purchasePrice: prop.purchasePrice,

              colorGroup: "colorGroup" in prop ? (prop as any).colorGroup : undefined,

              buyerId: result.playerId,

              buyerName: buyer?.name || "Player",

              buyerMoney,

              canAfford: true,

            })

          } else {

            // Cannot afford: Do not display a separate Cannot Afford screen, modal, or center-board overlay.

            // Display the normal property information card with small in-card affordability note.

            // Do not create a second notification for the same affordability condition.

            // Do not block End Turn.

            setPendingPurchase(null)

            setModal("property")

          }



          if (isActingPlayerLocal || isHumanTurn) {

            setTurnState("WAITING_FOR_ACTION")

            setHasRolledThisTurn(true)

          }

          return

        } else if (!isMultiplayer && localPlayerId === 0) {

          // Bot player: automated background purchase according to game rules (host only)

          handleBotPropertyPurchase(result.playerId, prop, engineState)

          return

        }

      }

    }



    if (result.rentPaid && result.rentAmount > 0) {

      audioSystem.playRentPayment()

      const space = BOARD_SPACES[result.newPosition]

      const propName = space?.name ?? "Property"

      const recipientIdx = engineState.players.findIndex(

        (p) => p.id === result.rentRecipientId,

      )

      const payerIdx = engineState.players.findIndex(

        (p) => p.id === result.playerId,

      )

      const payerName = engineState.players[payerIdx]?.name || `Player ${payerIdx + 1}`

      const recipientName = engineState.players[recipientIdx]?.name || "Owner"

      const isBankrupt = engineState.players[payerIdx]?.isBankrupt ?? false



      const rentMsg = `${payerName} paid ₹${result.rentAmount.toLocaleString()} rent to ${recipientName} for ${propName}.${isBankrupt ? " (BANKRUPTCY!)" : ""}`



      addGameplayEvent({

        id: `rent_${Date.now()}_${result.playerId}_${result.rentRecipientId}_${result.rentAmount}`,

        type: "RENT",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: payerName,

        propertyName: propName,

        amount: result.rentAmount,

        description: rentMsg,

      })



      addBoardNotification({

        id: `board_rent_${Date.now()}_${result.playerId}`,

        type: "RENT",

        category: "RENT PAYMENT",

        message: rentMsg,

        amount: result.rentAmount,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })



      if (hasExtraTurn) {

        setTurnState("EXTRA_TURN")

        setHasRolledThisTurn(false)

      } else if (isActingPlayerLocal || isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

        window.setTimeout(async () => {

          try {

            const endRes = await defaultEngine.endTurn(result.playerId)

            advanceTurn(endRes.state, 500)

          } catch (_) {}

        }, 1200)

      }

      return

    }



    if (result.spaceType === "tax") {

      setTaxName(result.spaceName)

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      const taxAmount = Math.max(0, -result.moneyChange)

      const taxMsg = result.eventDescription || (taxAmount > 0

        ? `${pName} paid ₹${taxAmount.toLocaleString()} ${result.spaceName} to the Bank.`

        : `${pName} owed ₹0 ${result.spaceName} to the Bank.`)

      addGameplayEvent({

        id: `tax_${Date.now()}_${result.playerId}`,

        type: "TAX",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        amount: taxAmount,

        description: taxMsg,

      })

      addBoardNotification({

        id: `board_tax_${Date.now()}_${result.playerId}`,

        type: "TAX",

        category: "TAX ASSESSMENT",

        message: taxMsg,

        amount: taxAmount,

        durationMs: 1200,

        timestamp: Date.now(),

        icon: "",

      })

      if (taxAmount > 0 && preferences?.soundEffects) {

        audioSystem.playRentPayment()

      }

      if (hasExtraTurn) {

        setTurnState("EXTRA_TURN")

        setHasRolledThisTurn(false)

      } else if (isActingPlayerLocal || isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

        window.setTimeout(async () => {

          try {

            const endRes = await defaultEngine.endTurn(result.playerId)

            advanceTurn(endRes.state, 500)

          } catch (_) {}

        }, 1200)

      }

      return

    }



    // Event 2: Compact board-centre notifications for Chance

    if (result.spaceType === "chance") {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      let desc = result.eventDescription || `${pName} landed on Chance.`

      desc = desc.replace(/^CHANCE\s*\(Dice\s*\d+\):\s*/i, "")

      const chanceMsg = `CHANCE — ${pName} ${desc.startsWith(pName) ? desc.slice(pName.length).trim() : desc}`



      addGameplayEvent({

        id: `chance_${Date.now()}_${result.playerId}`,

        type: "CHANCE",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        amount: result.moneyChange !== 0 ? Math.abs(result.moneyChange) : undefined,

        description: chanceMsg,

      })



      addBoardNotification({

        id: `board_chance_${Date.now()}_${result.playerId}`,

        type: "CHANCE",

        category: "CHANCE DECLARATION",

        message: chanceMsg,

        amount: result.moneyChange,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })



      if (hasExtraTurn) {

        setTurnState("EXTRA_TURN")

        setHasRolledThisTurn(false)

      } else if (isActingPlayerLocal || isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

        window.setTimeout(async () => {

          try {

            const endRes = await defaultEngine.endTurn(result.playerId)

            advanceTurn(endRes.state, 500)

          } catch (_) {}

        }, 1200)

      }

      return

    }



    // Event 1: Compact board-centre notifications for Community Chest

    if (result.spaceType === "chest") {

      const pName = engineState.players[result.playerId]?.name || `Player ${result.playerId + 1}`

      let desc = result.eventDescription || `${pName} opened Community Chest.`

      desc = desc.replace(/^COMMUNITY CHEST\s*\(Dice\s*\d+\):\s*/i, "")

      const chestMsg = `COMMUNITY CHEST — ${pName} ${desc.startsWith(pName) ? desc.slice(pName.length).trim() : desc}`



      addGameplayEvent({

        id: `chest_${Date.now()}_${result.playerId}`,

        type: "CHEST",

        timestamp: Date.now(),

        playerId: result.playerId,

        playerName: pName,

        amount: result.moneyChange !== 0 ? Math.abs(result.moneyChange) : undefined,

        description: chestMsg,

      })



      addBoardNotification({

        id: `board_chest_${Date.now()}_${result.playerId}`,

        type: "CHEST",

        category: "COMMUNITY CHEST",

        message: chestMsg,

        amount: result.moneyChange,

        durationMs: 1000,

        timestamp: Date.now(),

        icon: "",

      })



      if (hasExtraTurn) {

        setTurnState("EXTRA_TURN")

        setHasRolledThisTurn(false)

      } else if (isActingPlayerLocal || isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

        window.setTimeout(async () => {

          try {

            const endRes = await defaultEngine.endTurn(result.playerId)

            advanceTurn(endRes.state, 500)

          } catch (_) {}

        }, 1200)

      }

      return

    }



    // Non-modal landing

    if (hasExtraTurn) {

      setTurnState("EXTRA_TURN")

      setHasRolledThisTurn(false)

    } else if (isActingPlayerLocal || isHumanTurn) {

      setTurnState("WAITING_FOR_ACTION")

      setHasRolledThisTurn(true)

    } else if (!isMultiplayer && !isActingPlayerHuman && localPlayerId === 0) {

      window.setTimeout(async () => {

        try {

          const endRes = await defaultEngine.endTurn(result.playerId)

          advanceTurn(endRes.state, 500)

        } catch (_) {}

      }, 1200)

    }

  }



  /**

   * Engine-authoritative Roll & Move with Tumbling & Settling Animations.

   */



  const roll = async (isAuto: boolean | any = false) => {

    const isAutoRoll = isAuto === true



    if (

      !isGameStarted ||

      (turnState !== "WAITING_FOR_ROLL" && turnState !== "EXTRA_TURN") ||

      rolling ||

      moving ||

      rollingRef.current ||

      movingRef.current ||

      isMovementInProgressRef.current

    )

      return



    const snapPlayerIndex = activePlayerIndex

    const actingPlayer = players[snapPlayerIndex]



    if (actingPlayer?.inRestHouse || actingPlayer?.cardJailSkip || (actingPlayer?.restHouseTurns ?? 0) > 0 || (actingPlayer?.cardJailSkipTurns ?? 0) > 0) {

      console.warn(`[Roll] Blocked roll: player #${snapPlayerIndex} turn is skipped.`)

      showToast(`${actingPlayer?.name || 'Player'}'s turn is skipped.`)

      return

    }



    // Authoritative client-side turn guard: only active player can roll in multiplayer

    if (isMultiplayer && snapPlayerIndex !== localPlayerId) {

      console.warn(`[Roll] Blocked manual roll: not your turn (active: ${snapPlayerIndex}, local: ${localPlayerId})`)

      showToast(`It is ${actingPlayer?.name || 'Player ' + (snapPlayerIndex + 1)}'s turn. Please wait for their roll.`)

      return

    }



    // Never allow automatic roll on human player's turn in ANY mode!

    if (isAutoRoll) {

      console.warn(`[Roll] Blocked automatic roll on player #${snapPlayerIndex}`)

      return

    }



    const snapStartPos = playerPositions[snapPlayerIndex] ?? 0



    setTurnState("ROLLING")

    setRolling(true)

    rollingRef.current = true

    setMovementActive(true)

    setDiceRolling(true)

    setDiceSettling(false)

    setMovingPlayerIndex(snapPlayerIndex)

    setPlayerPositions((prev) => {

      const next = [...prev]

      next[snapPlayerIndex] = snapStartPos

      return next

    })



    if (preferences?.soundEffects) {

      audioSystem.playDiceRoll()

    }

    if (preferences?.hapticFeedback) {

      triggerHaptic(25)

    }



    const diceTiming = preferences?.reducedMotion

      ? ANIMATION_TIMINGS.DICE.reducedMotion

      : preferences?.animationSpeed === "fast"

      ? ANIMATION_TIMINGS.DICE.fast

      : preferences?.animationSpeed === "slow"

      ? ANIMATION_TIMINGS.DICE.slow

      : ANIMATION_TIMINGS.DICE.standard



    const minTumbleMs = diceTiming.tumble

    const settleDelay = diceTiming.settle



    const tumbleDelayPromise = new Promise((resolve) => window.setTimeout(resolve, minTumbleMs))



    try {

      const actingId = isAutoRoll ? snapPlayerIndex : localPlayerId

      const enginePromise = defaultEngine.rollAndMove(

        undefined,

        actingId,

      )



      const [{ result, state: engineState }] = await Promise.all([

        enginePromise,

        tumbleDelayPromise,

      ])



      setDice([result.dice1, result.dice2])

      setDiceRolling(false)

      setDiceSettling(true)



      if (result.sequence) lastProcessedRollSeqRef.current = Math.max(lastProcessedRollSeqRef.current, result.sequence)

      if (result.rollId) lastProcessedRollIdRef.current = result.rollId



      // Authoritative Dice Roll History recording

      addDiceRollRecord({

        id: `dice_${Date.now()}_${snapPlayerIndex}_${result.dice1}_${result.dice2}_${result.newPosition}`,

        timestamp: Date.now(),

        playerId: snapPlayerIndex,

        playerName: engineState.players[snapPlayerIndex]?.name || `Player ${snapPlayerIndex + 1}`,

        dice1: result.dice1,

        dice2: result.dice2,

        total: result.diceTotal,

        isDouble: result.isDouble,

        spaceName: result.spaceName,

      })



      // Settle animation duration

      await new Promise((resolve) => window.setTimeout(resolve, settleDelay))

      setDiceSettling(false)



      // Short hold so the player clearly sees the final dice total before moving

      const viewHoldMs = preferences?.reducedMotion ? 40 : 160

      await new Promise((resolve) => window.setTimeout(resolve, viewHoldMs))



      // Animate token movement along clockwise board perimeter

      setTurnState("MOVING")

      setRolling(false)

      rollingRef.current = false



      const isRemainingInJail = Boolean(

        result.eventDescription?.toLowerCase().includes("remains in jail") ||

        (result.newPosition === 9 && (result.previousPosition === 9 || snapStartPos === 9) && !result.isDouble)

      )



      const targetPos = isRemainingInJail ? 9 : result.newPosition



      const isStraightToJail = Boolean(

        result.mustGoToJail &&

        (result.eventDescription

          ?.toLowerCase()

          .includes("three consecutive doubles") ||

          result.eventDescription?.toLowerCase().includes("consecutive doubles"))

      )



      const stepsToWalk = (isStraightToJail || isRemainingInJail) ? 0 : result.diceTotal

      const startPos = isRemainingInJail ? 9 : (result.previousPosition !== undefined ? result.previousPosition : snapStartPos)

      const intermediatePos = (startPos + result.diceTotal) % 36

      const isCardRedirection = !isStraightToJail && !isRemainingInJail && targetPos !== intermediatePos



      if (isCardRedirection) {

        await animatePlayerMovement(

          snapPlayerIndex,

          startPos,

          intermediatePos,

          stepsToWalk,

          false,

          false,

        )

        await new Promise((r) => window.setTimeout(r, preferences?.reducedMotion ? 40 : 220))

        await animatePlayerMovement(

          snapPlayerIndex,

          intermediatePos,

          targetPos,

          0,

          true,

          true,

        )

      } else {

        await animatePlayerMovement(

          snapPlayerIndex,

          startPos,

          targetPos,

          stepsToWalk,

          isStraightToJail || isRemainingInJail,

          true,

        )

      }



      // Strictly post-landing presentation:

      setTurnState("RESOLVING_LANDING")



      // Add ROLL_MOVE to event log strictly upon visual landing

      addGameplayEvent({

        id: `move_${Date.now()}_${snapPlayerIndex}_${result.newPosition}`,

        type: "ROLL_MOVE",

        timestamp: Date.now(),

        playerId: snapPlayerIndex,

        playerName: engineState.players[snapPlayerIndex]?.name || `Player ${snapPlayerIndex + 1}`,

        description: `${engineState.players[snapPlayerIndex]?.name || `Player ${snapPlayerIndex + 1}`} rolled [${result.dice1}, ${result.dice2}] = ${result.diceTotal}${result.isDouble ? " (DOUBLES!)" : ""} and moved to ${result.spaceName}.`,

      })



      resolvePostMovement(result, engineState)

      try {

        new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

      } catch (_) {}

    } catch (err: any) {

      setRolling(false)

      rollingRef.current = false

      setMoving(false)

      movingRef.current = false

      setMovementActive(false)

      setMovingPlayerIndex(null)

      setDiceRolling(false)

      setDiceSettling(false)

      showToast(err?.message || "Action not permitted")

    }

  }



  /** Called when buy/decline decision is made from the buy modal. */

  const handleBuyResolved = () => {

    clearLandingHighlight()

    defaultEngine.getState().then((state) => {

      const mergedPlayers = state.players.map((p, idx) => {

        if (!p.name || !p.name.trim()) {

          try {

            const saved = getStoredPlayerName(idx)

            if (saved && saved.trim()) return { ...p, name: saved.trim() }

          } catch (_) {}

        }

        return p

      })

      setPlayers(mergedPlayers)



      setRoundNumber(state.roundNumber)

      if (state.propertyOwnerCrossings) setPropertyOwnerCrossings(state.propertyOwnerCrossings)



      if (state.activityLog && setActivityLog) setActivityLog(state.activityLog)

      if (state.turnTimer && setTurnTimer) setTurnTimer(state.turnTimer)



      if (state.turnPurchasedProperties) setTurnPurchasedProperties(state.turnPurchasedProperties)

      if (state.turnBuildingsBuilt) setTurnBuildingsBuilt(state.turnBuildingsBuilt)

      if (state.activeLanding !== undefined) setActiveLanding(state.activeLanding)

      if (state.currentTurnId !== undefined) setCurrentTurnId(state.currentTurnId)



      try {

        new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

      } catch (_) {}



      if (multiplayerClient.getRoomCode()) {

        setTurnState(state.turnState)

        setActivePlayerIndex(state.activePlayerIndex)

        if (state.activePlayerIndex === localPlayerId) {

          setHasRolledThisTurn(true)

        }

      } else if (isHumanTurn) {

        setTurnState("WAITING_FOR_ACTION")

        setHasRolledThisTurn(true)

      } else {

        advanceTurn(state, 600)

      }

    })

  }







  const localPlayerProps = players[localPlayerId]?.ownedProperties?.length ?? 0



  return (

    <main className="game-screen">

      <div className="game-topbar">

        <div className="game-topbar-player-section">

          <div

            className="turn-timer-badge topbar-player-badge"

            title={`Playing as ${players[localPlayerId]?.name || `Player ${localPlayerId + 1}`}`}

          >

            <span

              className="status-color-dot"

              style={{

                width: "8px",

                height: "8px",

                borderRadius: "50%",

                backgroundColor: getPlayerColorHex(players[localPlayerId]?.color || "saffron"),

                display: "inline-block",

                marginRight: "6px",

                flexShrink: 0,

              }}

            />

            <span className="topbar-player-label">PLAYING AS:</span>

            <strong className="topbar-player-name">

              {players[localPlayerId]?.name || `Player ${localPlayerId + 1}`}

            </strong>

          </div>

        </div>



        <div className="game-topbar-actions">

          {/* Navigation: Game Info */}

          <button

            type="button"

            className="topbar-action-btn game-info-btn"

            onClick={() => {

              setGameInfoInitialTab("ledger")

              setGameInfoOpen(true)

            }}

            title="Open Game Info: Ledger, Trade, Events & Insights"

          >

            <Icon name="ledger" size={13} />

            <span>GAME INFO</span>

            {pendingTradesCount > 0 && (

              <span className="topbar-btn-badge alert">{pendingTradesCount}</span>

            )}

          </button>



          <span className="topbar-actions-divider" aria-hidden="true" />



          {/* Consequential: Kick (Host only) */}

          {isEffectiveHost && (

            <button

              type="button"

              className="topbar-action-btn kick-btn"

              onClick={() => setModal("kick_player")}

              title="Host Controls: Manage and Kick Players"

            >

              <span>KICK</span>

            </button>

          )}



          {/* Consequential: Resign */}

          <button

            type="button"

            className="topbar-action-btn resign-btn"

            onClick={() => setModal("confirm_resign")}

            title="Surrender & Resign Match"

          >

            <span>RESIGN</span>

          </button>



          {/* Consequential: End Game (Host only) */}

          {isEffectiveHost && (

            <button

              type="button"

              className="topbar-action-btn end-session-btn"

              onClick={() => setModal("confirm_end_session")}

              title="Host Controls: End Game Session"

            >

              <span>END GAME</span>

            </button>

          )}



          <span className="topbar-actions-divider" aria-hidden="true" />



          {/* Navigation: Settings */}

          <button

            type="button"

            className="icon-button game-menu"

            onClick={() => setModal("preferences")}

            aria-label="Settings"

            title="Game Settings & Preferences"

          >

            <Icon name="gear" />

          </button>

        </div>

      </div>



      {/* Prominent Authoritative Room Code Display (Feature 1B) */}

      {roomCode && !isGameStarted && (

        <div

          className="lobby-room-code-banner"

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            flexWrap: "wrap",

            gap: "8px",

            padding: "8px 14px",

            margin: "4px 10px 8px",

            borderRadius: "8px",

            background: "linear-gradient(135deg, rgba(200, 155, 69, 0.22) 0%, rgba(26, 21, 11, 0.85) 100%)",

            border: "1.5px solid var(--gold)",

            boxShadow: "0 4px 15px rgba(0,0,0,0.4)",

            zIndex: 10,

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>

            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "var(--gold)" }}>

              ROOM CODE:

            </span>

            <strong

              style={{

                fontFamily: '"Oswald", sans-serif',

                fontSize: "16px",

                fontWeight: 800,

                letterSpacing: "0.12em",

                color: "#ffffff",

                background: "rgba(0,0,0,0.6)",

                padding: "2px 8px",

                borderRadius: "5px",

                border: "1px solid rgba(200, 155, 69, 0.5)",

              }}

            >

              {roomCode}

            </strong>

            <button

              type="button"

              onClick={() => {

                navigator.clipboard?.writeText(roomCode)

                showToast(`Room code ${roomCode} copied!`)

              }}

              style={{

                padding: "4px 8px",

                background: "var(--gold)",

                color: "#1a150b",

                border: "none",

                borderRadius: "5px",

                fontWeight: 800,

                fontSize: "11px",

                cursor: "pointer",

              }}

            >

              COPY CODE

            </button>

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "rgba(255,255,255,0.85)" }}>

            <span>Confirmed: <strong>{players.length}</strong> / {rules?.maxPlayers ?? 4}</span>

            <span style={{ color: "var(--gold-300)" }}>•</span>

            <span style={{ color: isHost ? "#4ade80" : "var(--gold-300)", fontWeight: 700 }}>

              {isHost ? "HOST" : "GUEST"}

            </span>

          </div>

        </div>

      )}



      <div className="game-layout-container">

        <div className="game-board-column" style={{ position: "relative" }}>

          <Board

            onSelectSpace={handleSelectSpace}

            playerPositions={playerPositions}

            players={players}

            moving={moving}

            movingPlayerIndex={movingPlayerIndex}

            activePlayerIndex={activePlayerIndex}

            activeNotification={currentBoardNotification}

            queueCount={boardNotificationQueue.length}

            onDismissNotification={dismissCurrentBoardNotification}

            isDismissingNotification={isNotificationDismissing}

            pendingPurchase={pendingPurchase}

            onConfirmBuyCenter={handleConfirmBuyCenter}

            onDeclineCenter={handleDeclineCenter}

            isSubmittingPurchase={isSubmittingPurchase}

            isHumanTurn={isHumanTurn}

            localPlayerId={localPlayerId}

            isMultiplayer={isMultiplayer}

            stepDuration={activeStepDuration}

            recentEvents={effectiveEventLogList}

            onOpenFullLog={() => {

              setGameInfoInitialTab("events")

              setGameInfoOpen(true)

            }}

            selectedPlayerIdHighlight={selectedPlayerIdHighlight}

            selectedPropertyIdHighlight={selectedPropertyIdHighlight}

            landingHighlightTileIndex={landingHighlight?.tileIndex ?? null}

          />

          <CashTransfersOverlay

            transfers={activeCashTransfers}

            reducedMotion={preferences?.reducedMotion}

          />

        </div>



        <div className="game-sidebar-column">

          <section className="turn-banner">

            <div

              style={{

                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                width: "100%",

              }}

            >

              <span>

                {activePlayerIndex === localPlayerId

                  ? "YOUR TURN"

                  : `${activePlayer.name.toUpperCase()}'S TURN`}

              </span>

              {timerEnabled && (

                <div

                  className={`turn-timer-badge ${

                    localSecondsRemaining <= 10

                      ? "urgent"

                      : localSecondsRemaining <= 20

                        ? "warning"

                        : ""

                  }`}

                  title="Authoritative turn timer"

                >

                  &#x23F1;&#xFE0F; {localSecondsRemaining}s

                </div>

              )}

            </div>

            <p>

              {activePlayer.name}{" "}

              {BOARD_SPACES[userPos ?? 0]?.name

                ? `is at ${BOARD_SPACES[userPos ?? 0].name} (#${userPos ?? 0})`

                : "is on the move…"}

            </p>

          </section>



          <PlayerStrip

            players={players}

            openPlayers={() => {

              setGameInfoInitialTab("insights")

              setGameInfoOpen(true)

            }}

            activePlayerIndex={activePlayerIndex}

            playerPositions={playerPositions}

            isHost={isEffectiveHost}

            isMultiplayer={Boolean(roomCode || multiplayerClient.getRoomCode())}

            localPlayerId={localPlayerId}

            onKickPlayer={onKickPlayer}

            selectedPlayerIdHighlight={selectedPlayerIdHighlight}

            onToggleSelectPlayerHighlight={(pId) =>

              setSelectedPlayerIdHighlight((prev) => (prev === pId ? null : pId))

            }

            reducedMotion={preferences?.reducedMotion}

          />



          {/* Host Pending Join Requests Banner */}

          {isEffectiveHost && effectivePendingRequests && effectivePendingRequests.length > 0 && (

            <div

              className="game-pending-requests-banner"

              style={{

                background: "linear-gradient(135deg, rgba(200, 155, 69, 0.25), rgba(28, 24, 16, 0.96))",

                border: "2px solid var(--gold)",

                borderRadius: "12px",

                padding: "12px 16px",

                margin: "12px 0",

                boxShadow: "0 6px 24px rgba(200, 155, 69, 0.35)",

                display: "flex",

                flexDirection: "column",

                gap: "10px",

              }}

            >

              <div

                style={{

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  borderBottom: "1px solid rgba(200, 155, 69, 0.35)",

                  paddingBottom: "8px",

                }}

              >

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                  <div>

                    <div

                      style={{

                        fontFamily: '"Oswald", sans-serif',

                        fontSize: "13px",

                        fontWeight: 700,

                        letterSpacing: "0.08em",

                        color: "var(--gold-light)",

                      }}

                    >

                      PENDING JOIN REQUESTS ({effectivePendingRequests.length})

                    </div>

                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.78)" }}>

                      Players are waiting for your approval to enter the match.

                    </div>

                  </div>

                </div>

                <span

                  style={{

                    fontSize: "10px",

                    background: "rgba(200, 155, 69, 0.3)",

                    border: "1px solid var(--gold)",

                    padding: "3px 8px",

                    borderRadius: "12px",

                    color: "#fff",

                    fontWeight: 700,

                    letterSpacing: "0.04em",

                  }}

                >

                  HOST ACTION REQUIRED

                </span>

              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                {effectivePendingRequests.map((req) => (

                  <div

                    key={req.requestId}

                    style={{

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "space-between",

                      background: "rgba(0, 0, 0, 0.65)",

                      padding: "8px 12px",

                      borderRadius: "8px",

                      border: "1px solid rgba(255, 255, 255, 0.15)",

                      gap: "10px",

                      flexWrap: "wrap",

                    }}

                  >

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

                      <span

                        style={{

                          width: "14px",

                          height: "14px",

                          borderRadius: "50%",

                          backgroundColor: getPlayerColorHex(req.color as any),

                          display: "inline-block",

                          boxShadow: "0 0 8px rgba(0,0,0,0.6)",

                          border: "1.5px solid #fff",

                        }}

                      />

                      <div>

                        <strong style={{ fontSize: "14px", color: "#ffffff", letterSpacing: "0.03em" }}>{req.name}</strong>

                        <span style={{ fontSize: "11px", color: "var(--gold-300)", marginLeft: "8px", fontWeight: 700, textTransform: "uppercase" }}>

                          ({req.color})

                        </span>

                      </div>

                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>

                      <button

                        type="button"

                        onClick={() => effectiveAcceptJoin(req.requestId)}

                        style={{

                          padding: "6px 14px",

                          background: "#16a34a",

                          color: "#ffffff",

                          border: "none",

                          borderRadius: "6px",

                          fontSize: "12px",

                          fontWeight: 700,

                          cursor: "pointer",

                          display: "flex",

                          alignItems: "center",

                          gap: "4px",

                          boxShadow: "0 2px 8px rgba(22, 163, 74, 0.4)",

                        }}

                      >

                        ✓ ACCEPT

                      </button>

                      <button

                        type="button"

                        onClick={() => effectiveRejectJoin(req.requestId)}

                        style={{

                          padding: "6px 12px",

                          background: "rgba(220, 38, 38, 0.25)",

                          color: "#fca5a5",

                          border: "1px solid rgba(239, 68, 68, 0.6)",

                          borderRadius: "6px",

                          fontSize: "12px",

                          fontWeight: 700,

                          cursor: "pointer",

                        }}

                      >

                        ✕ DECLINE

                      </button>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          )}



          {activePlayer.money < 0 && activePlayerIndex === localPlayerId && (

            <div

              className="debt-settlement-banner"

              style={{

                background: "linear-gradient(135deg, rgba(142, 35, 56, 0.95), rgba(90, 15, 30, 0.95))",

                border: "2px solid #ef4444",

                borderRadius: "10px",

                padding: "12px 14px",

                margin: "10px 0",

                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.35)",

                color: "#fff",

                display: "flex",

                flexDirection: "column",

                gap: "8px",

              }}

            >

              <div>

                <div style={{ fontFamily: '"Oswald", sans-serif', fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", color: "#fca5a5" }}>

                  MANDATORY DEBT SETTLEMENT

                </div>

                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", marginTop: "2px" }}>

                  Current Balance: <strong style={{ color: "#fca5a5" }}>₹{activePlayer.money.toLocaleString()}</strong> &nbsp;|&nbsp; Outstanding Debt: <strong style={{ color: "#f87171" }}>₹{Math.abs(activePlayer.money).toLocaleString()}</strong>

                </div>

              </div>

              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>

                You cannot finish your turn or advance while your balance is negative. Settle your debt through incoming money transfers or property trading, or resign to surrender your position.

              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>

                <button

                  type="button"

                  className="btn-trade-settle"

                  onClick={() => {

                    setGameInfoInitialTab("trade")

                    setGameInfoOpen(true)

                  }}

                  style={{

                    flex: 1,

                    minHeight: "38px",

                    padding: "8px 12px",

                    background: "rgba(200, 155, 69, 0.25)",

                    border: "1px solid var(--gold)",

                    borderRadius: "6px",

                    color: "var(--gold-300)",

                    fontFamily: '"Oswald", sans-serif',

                    fontSize: "11px",

                    fontWeight: 700,

                    cursor: "pointer",

                  }}

                >

                  TRADE / REQUEST ASSISTANCE

                </button>

                <button

                  type="button"

                  className="btn-resign-settle"

                  onClick={() => setModal("confirm_resign")}

                  style={{

                    flex: 1,

                    minHeight: "38px",

                    padding: "8px 12px",

                    background: "rgba(239, 68, 68, 0.25)",

                    border: "1px solid #ef4444",

                    borderRadius: "6px",

                    color: "#fca5a5",

                    fontFamily: '"Oswald", sans-serif',

                    fontSize: "11px",

                    fontWeight: 700,

                    cursor: "pointer",

                  }}

                >

                  RESIGN MATCH

                </button>

              </div>

            </div>

          )}



          <section className="game-controls">

            <div className="controls-status-strip">

              <div className="dice-total">

                <div className="dice-row">

                  <Dice

                    value={dice[0]}

                    rolling={diceRolling}

                    settling={diceSettling}

                    settleDuration={

                      preferences?.reducedMotion

                        ? ANIMATION_TIMINGS.DICE.reducedMotion.settle

                        : preferences?.animationSpeed === "fast"

                        ? ANIMATION_TIMINGS.DICE.fast.settle

                        : preferences?.animationSpeed === "slow"

                        ? ANIMATION_TIMINGS.DICE.slow.settle

                        : ANIMATION_TIMINGS.DICE.standard.settle

                    }

                    dieIndex={1}

                    reducedMotion={preferences?.reducedMotion}

                  />

                  <Dice

                    value={dice[1]}

                    rolling={diceRolling}

                    settling={diceSettling}

                    settleDuration={

                      preferences?.reducedMotion

                        ? ANIMATION_TIMINGS.DICE.reducedMotion.settle

                        : preferences?.animationSpeed === "fast"

                        ? ANIMATION_TIMINGS.DICE.fast.settle

                        : preferences?.animationSpeed === "slow"

                        ? ANIMATION_TIMINGS.DICE.slow.settle

                        : ANIMATION_TIMINGS.DICE.standard.settle

                    }

                    dieIndex={2}

                    reducedMotion={preferences?.reducedMotion}

                  />

                </div>

                <span>

                  {activePlayer?.inRestHouse ? (

                    <b style={{ color: "#fca5a5" }}>REST HOUSE</b>

                  ) : activePlayer?.cardJailSkip ? (

                    <b style={{ color: "#fca5a5" }}>JAIL SKIP</b>

                  ) : (

                    <>TOTAL <b>{dice[0] + dice[1]}</b></>

                  )}

                </span>

              </div>

              {!isGameStarted ? (

                <div className="human-turn-timer-badge" title="Pre-Game Lobby">

                  <span className="timer-digits">LOBBY</span>

                </div>

              ) : isHumanTurn ? (

                <div

                  className={`human-turn-timer-badge ${humanTimeRemaining <= 30 ? "low-time" : ""}`}

                  title="Your Turn Countdown (150 seconds)"

                >

                  <span className="timer-digits">{formatTimer(humanTimeRemaining)}</span>

                </div>

              ) : (

                <div className="human-turn-timer-badge waiting-turn" title={`Waiting for ${activePlayer.name}'s turn`}>

                  <span className="timer-digits">{activePlayer.name.toUpperCase()}</span>

                </div>

              )}

            </div>



            <div className="controls-action-row">

              {!isGameStarted ? (

                isHost ? (

                  players.length < 2 ? (

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>

                      <Button

                        className="roll-button start-game-button"

                        disabled

                        style={{

                          background: "rgba(200, 155, 69, 0.2)",

                          border: "1px dashed var(--gold)",

                          color: "var(--gold-300)",

                          fontWeight: 700,

                          fontSize: "12px",

                          letterSpacing: "0.06em",

                          cursor: "not-allowed",

                        }}

                      >

                        START GAME (NEED 2+ PLAYERS)

                      </Button>

                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.75)", textAlign: "center" }}>

                        Waiting for players to join with room code <strong style={{ color: "var(--gold)" }}>{roomCode}</strong>.

                      </div>

                      {isEffectiveHost && effectivePendingRequests && effectivePendingRequests.length > 0 && (

                        <div

                          style={{

                            fontSize: "11px",

                            color: "var(--gold-light)",

                            background: "rgba(200, 155, 69, 0.2)",

                            border: "1px solid var(--gold)",

                            padding: "6px 10px",

                            borderRadius: "6px",

                            textAlign: "center",

                            fontWeight: 700,

                          }}

                        >

                          {effectivePendingRequests.length} join request(s) awaiting your approval above!

                        </div>

                      )}

                    </div>

                  ) : (

                    <Button

                      className="roll-button start-game-button"

                      onClick={() => onStartGame?.()}

                      style={{

                        background: "linear-gradient(135deg, #c89b45 0%, #a87928 100%)",

                        color: "#1a150b",

                        fontWeight: 800,

                        fontSize: "14px",

                        letterSpacing: "0.08em",

                        boxShadow: "0 4px 15px rgba(200, 155, 69, 0.4)",

                      }}

                    >

                      START GAME ({players.length} PLAYERS)

                    </Button>

                  )

                ) : (

                  <Button

                    className="roll-button"

                    disabled

                    style={{

                      background: "rgba(255,255,255,0.08)",

                      border: "1px dashed var(--gold)",

                      color: "var(--gold-300)",

                      cursor: "not-allowed",

                      fontSize: "12px",

                      fontWeight: 700,

                    }}

                  >

                    WAITING FOR HOST TO START GAME

                  </Button>

                )

              ) : (

                /* Feature 1: One Adaptive Roll Dice / End Turn Button */

                (() => {

                  const isMustSkip = Boolean(activePlayer?.inRestHouse || activePlayer?.cardJailSkip)

                  const isRollPhase = (turnState === "WAITING_FOR_ROLL" || turnState === "EXTRA_TURN") && !isMustSkip

                  const isBusy =

                    rolling ||

                    moving ||

                    diceRolling ||

                    diceSettling ||

                    rollingRef.current ||

                    movingRef.current ||

                    isMovementInProgressRef.current ||

                    turnState === "ROLLING" ||

                    turnState === "MOVING" ||

                    turnState === "RESOLVING_LANDING"



                  if (isMustSkip) {

                    const skipReason = activePlayer?.inRestHouse ? "REST HOUSE" : "JAIL"

                    const skipLabel = !isHumanTurn

                      ? `WAITING FOR ${activePlayer.name.toUpperCase()} (SKIPPING TURN)...`

                      : `SKIP TURN (${skipReason})`

                    const skipDisabled = !isHumanTurn || isBusy || !canEndTurn || isEndingTurnRef.current



                    return (

                      <Button

                        className="roll-button end-turn-mode adaptive-action-btn end-turn-ready"

                        onClick={() => {

                          if (!skipDisabled && isHumanTurn) {

                            handleManualEndTurn()

                          }

                        }}

                        disabled={skipDisabled}

                        style={{

                          background: isHumanTurn ? "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)" : undefined,

                          borderColor: isHumanTurn ? "#ef4444" : undefined,

                          color: "#fff",

                          cursor: skipDisabled ? "not-allowed" : "pointer",

                          opacity: skipDisabled ? 0.65 : 1,

                        }}

                        title={`Player must skip this turn due to ${skipReason.toLowerCase()}. Click to advance turn.`}

                      >

                        {skipLabel}

                      </Button>

                    )

                  }



                  if (isRollPhase) {

                    const rollDisabled = !isHumanTurn || isBusy || (isMultiplayer && activePlayerIndex !== localPlayerId)

                    let rollLabel = "ROLL DICE"

                    if (rolling || diceRolling) rollLabel = "ROLLING..."

                    else if (moving) rollLabel = "MOVING..."

                    else if (diceSettling) rollLabel = "SETTLING..."

                    else if (turnState === "EXTRA_TURN") {

                      rollLabel = isHumanTurn

                        ? "ROLL AGAIN (DOUBLES!)"

                        : `WAITING FOR ${activePlayer.name.toUpperCase()} (DOUBLES)...`

                    } else if (!isHumanTurn) {

                      rollLabel = `WAITING FOR ${activePlayer.name.toUpperCase()}...`

                    }



                    const rollTitle = !isHumanTurn

                      ? `Waiting for ${activePlayer.name}'s turn`

                      : turnState === "EXTRA_TURN"

                        ? "Doubles rolled: click to roll again!"

                        : "Roll the dice to move across the board"



                    return (

                      <Button

                        className="roll-button adaptive-action-btn"

                        onClick={() => {

                          if (!rollDisabled && !rollingRef.current) {

                            roll(false)

                          }

                        }}

                        disabled={rollDisabled}

                        style={!isHumanTurn ? { opacity: 0.65, cursor: "not-allowed" } : undefined}

                        title={rollTitle}

                      >

                        {rollLabel}

                      </Button>

                    )

                  }



                  // Post-roll phase: Adaptive End Turn

                  const endTurnDisabled = !isHumanTurn || isBusy || !canEndTurn || isEndingTurnRef.current

                  let endTurnLabel = "END TURN"

                  if (rolling || diceRolling) endTurnLabel = "ROLLING..."

                  else if (moving) endTurnLabel = "MOVING..."

                  else if (diceSettling) endTurnLabel = "SETTLING..."

                  else if (turnState === "RESOLVING_LANDING") endTurnLabel = "RESOLVING..."

                  else if (activePlayer.money < 0) endTurnLabel = "SETTLE DEBT FIRST"

                  else if (modal !== null) endTurnLabel = "RESOLVE ACTION FIRST"

                  else if (!isHumanTurn) endTurnLabel = `WAITING FOR ${activePlayer.name.toUpperCase()}...`



                  const endTurnTitle = !isHumanTurn

                    ? `Waiting for ${activePlayer.name}'s turn`

                    : activePlayer.money < 0

                      ? "Must settle outstanding debt or resign before ending turn"

                      : modal !== null

                        ? "Resolve pending action before ending turn"

                        : "Finish your turn and pass to next player"



                  return (

                    <Button

                      className={`roll-button end-turn-mode adaptive-action-btn ${canEndTurn ? "end-turn-ready" : ""}`}

                      onClick={() => {

                        if (canEndTurn && !isEndingTurnRef.current && isHumanTurn) {

                          handleManualEndTurn()

                        }

                      }}

                      disabled={endTurnDisabled}

                      style={!canEndTurn ? { opacity: 0.65, cursor: "not-allowed" } : undefined}

                      title={endTurnTitle}

                    >

                      {endTurnLabel}

                    </Button>

                  )

                })()

              )}

            </div>



            {/* Host Settings / Match Rules Trigger (only shown before match starts for host) */}

            {!isGameStarted && isHost && (

              <button

                className="host-settings-action-btn"

                onClick={() => setModal("preferences")}

                title="Configure match rules before starting"

                style={{

                  width: "100%",

                  marginTop: "6px",

                  padding: "7px 10px",

                  borderRadius: "6px",

                  border: "1px solid var(--gold)",

                  background: "rgba(200, 155, 69, 0.12)",

                  color: "var(--gold-300)",

                  fontFamily: "Oswald, sans-serif",

                  fontSize: "11px",

                  fontWeight: 600,

                  letterSpacing: "0.06em",

                  cursor: "pointer",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  gap: "6px",

                  transition: "all 0.2s ease",

                }}

              >

                <Icon name="gear" size={14} />

                <span>CONFIGURE MATCH RULES</span>

              </button>

            )}

          </section>



        </div>

      </div>

      {modal && (

        <GameModal

          type={modal}

          close={handleModalAcknowledged}

          setModal={setModal}

          navigate={navigate}

          selectedProperty={selectedProp}

          taxSpaceName={taxName}

          players={players}

          activePlayerIndex={activePlayerIndex}

          setPlayers={setPlayers}

          onShowToast={showToast}

          onBuyResolved={handleBuyResolved}

          lastDiceTotal={turnDiceTotal}

          onModalAcknowledged={handleModalAcknowledged}

          playerPositions={playerPositions}

          rentInfo={currentRentInfo}

          localPlayerId={localPlayerId}

          activityLog={activityLog}

          turnState={turnState}

          transactionLedger={transactionLedger}

          tradeOffers={tradeOffers}

          setTradeOffers={setTradeOffers}

          preferences={preferences}

          onUpdatePreferences={onUpdatePreferences}

          roundNumber={roundNumber}

          onEndSession={() => {

            setTurnState("GAME_OVER")

            navigate("gameover")

          }}

          onResign={handleResign}

          onAddGameplayEvent={addGameplayEvent}

          unmortgageInterestRatePercent={engineRules?.unmortgageInterestRatePercent ?? 10.0}

          rules={rules}

          onUpdateRules={onUpdateRules}

          isGameStarted={Boolean(isGameStarted)}

          isHost={Boolean(isHost)}

          onQuitGame={handleConfirmQuit}

          isLeavingRoom={isLeavingRoom}

          roomCode={roomCode}

          onKickPlayer={onKickPlayer}

          turnBuildingsBuilt={turnBuildingsBuilt}

          turnPurchasedProperties={turnPurchasedProperties}

          activeLanding={activeLanding}

          currentTurnId={currentTurnId}

          onUpdateTurnBuildings={setTurnBuildingsBuilt}

          onUpdateTurnPurchased={setTurnPurchasedProperties}

          onClearLandingHighlight={clearLandingHighlight}

          propertyOwnerCrossings={propertyOwnerCrossings}

          setPropertyOwnerCrossings={setPropertyOwnerCrossings}

          isMultiplayer={isMultiplayer}

          pendingPurchase={pendingPurchase}

        />

      )}

      <QuickChatWidget

        localPlayer={players[localPlayerId] || players[0]}

        isMultiplayer={Boolean(roomCode || multiplayerClient.getRoomCode())}

        soundEnabled={preferences?.soundEffects ?? true}

      />

      <GameInfoModal

        isOpen={gameInfoOpen}

        initialTab={gameInfoInitialTab}

        onClose={() => setGameInfoOpen(false)}

        transactionLedger={transactionLedger}

        players={players}

        localPlayerId={localPlayerId}

        tradeOffers={tradeOffers}

        onCreateOffer={handleCreateTradeOffer}

        onAcceptOffer={handleAcceptTradeOffer}

        onRejectOffer={handleRejectTradeOffer}

        onCancelOffer={handleCancelTradeOffer}

        events={effectiveEventLogList}

        onClearEvents={() => effectiveSetEventLogList([])}

        isHost={isEffectiveHost}

        isMultiplayer={Boolean(roomCode || multiplayerClient.getRoomCode())}

        onKickPlayer={onKickPlayer}

        onSelectPropertyHighlight={(propId) => setSelectedPropertyIdHighlight(propId)}

      />

      <GameplayEventLog

        isOpen={eventLogOpen}

        onClose={() => setEventLogOpen(false)}

        events={effectiveEventLogList}

        onClear={() => effectiveSetEventLogList([])}

      />

      <DiceRollHistory

        isOpen={diceHistoryOpen}

        onClose={() => setDiceHistoryOpen(false)}

        records={diceHistoryList}

        onClear={() => setDiceHistoryList([])}

      />

      {activeTradePopup && (

        <div

          className="trade-popin-toast"

          role="alert"

          onClick={() => {

            setActiveTradePopup(null)

            setGameInfoInitialTab("trade")

            setGameInfoOpen(true)

          }}

          style={{

            position: "fixed",

            top: "24px",

            left: "50%",

            transform: "translateX(-50%)",

            zIndex: 9999,

            display: "flex",

            alignItems: "center",

            gap: "14px",

            padding: "14px 24px",

            background: "linear-gradient(135deg, rgba(20, 26, 40, 0.98), rgba(10, 14, 22, 0.98))",

            border: "2px solid #eab308",

            borderRadius: "14px",

            boxShadow: "0 10px 35px rgba(234, 179, 8, 0.4), 0 0 20px rgba(0, 0, 0, 0.8)",

            cursor: "pointer",

            animation: "pulse-glow 0.8s ease-in-out infinite alternate",

            backdropFilter: "blur(12px)",

          }}

        >

          <div

            style={{

              width: "40px",

              height: "40px",

              borderRadius: "50%",

              background: "radial-gradient(circle, #eab308, #ca8a04)",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: "12px",

              fontWeight: 800,

              color: "#1c1810",

              boxShadow: "0 0 12px rgba(234, 179, 8, 0.6)",

            }}

          >

            DEAL

          </div>

          <div>

            <div

              style={{

                fontFamily: '"Oswald", sans-serif',

                fontSize: "14px",

                fontWeight: 700,

                letterSpacing: "0.1em",

                color: "#fde047",

                textTransform: "uppercase",

              }}

            >

              Incoming Trade Proposal!

            </div>

            <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.9)" }}>

              {players[activeTradePopup.senderId]?.name || `Player ${activeTradePopup.senderId + 1}`} sent you a deal • Opening trade desk...

            </div>

          </div>

          <button

            type="button"

            className="btn-primary"

            style={{

              padding: "6px 14px",

              fontSize: "12px",

              fontWeight: 700,

              borderRadius: "8px",

              border: "1px solid #eab308",

              background: "#ca8a04",

              color: "#000",

              cursor: "pointer",

            }}

          >

            OPEN NOW

          </button>

        </div>

      )}

    </main>

  )

}



// ─── SETTINGS ─────────────────────────────────────────────────────────────────



function SettingsScreen({

  navigate,

  preferences,

  onUpdatePreferences,

}: {

  navigate: (screen: Screen) => void

  preferences?: GamePreferences

  onUpdatePreferences?: (prefs: GamePreferences) => void

}) {

  const currentPrefs = preferences ?? loadPreferences()



  const handleToggleSound = (soundEffects: boolean) => {

    onUpdatePreferences?.({ ...currentPrefs, soundEffects })

  }



  const handleToggleReducedMotion = (reducedMotion: boolean) => {

    onUpdatePreferences?.({ ...currentPrefs, reducedMotion })

  }



  const handleToggleHaptic = (hapticFeedback: boolean) => {

    onUpdatePreferences?.({ ...currentPrefs, hapticFeedback })

  }



  return (

    <main className="paper-screen">

      <AppHeader title="SETTINGS" back={() => navigate("menu")} />

      <div className="screen-content">

        <div className="section-label">APPEARANCE &amp; THEME</div>

        <div className="settings-card">

          <SettingRow

            label="DARK THEME"

            value="Charcoal and graphite liquid-glass aesthetic"

            control={

              <Toggle

                on={currentPrefs.theme === "dark"}

                onChange={(isDark) =>

                  onUpdatePreferences?.({

                    ...currentPrefs,

                    theme: isDark ? "dark" : "light",

                  })

                }

                label="Toggle Dark Theme"

              />

            }

          />

          <SettingRow

            label="REDUCED MOTION"

            value="Simplified token gliding and transitions"

            control={

              <Toggle

                on={currentPrefs.reducedMotion}

                onChange={handleToggleReducedMotion}

                label="Toggle Reduced Motion"

              />

            }

          />

          <SettingRow

            label="TACTILE VIBRATION"

            value="Haptic feedback on dice rolls &amp; payments"

            control={

              <Toggle

                on={currentPrefs.hapticFeedback}

                onChange={handleToggleHaptic}

                label="Toggle Haptic Feedback"

              />

            }

          />

        </div>



        <div className="section-label">AUDIO</div>

        <div className="settings-card">

          <SettingRow

            label="SOUND EFFECTS"

            value="Synthesized tones for dice, tokens, payments"

            control={

              <Toggle

                on={currentPrefs.soundEffects}

                onChange={handleToggleSound}

                label="Toggle Sound Effects"

              />

            }

          />

        </div>



        <Button variant="secondary" onClick={() => navigate("gameover")}>

          VIEW GAME OVER SCREEN

        </Button>

      </div>

    </main>

  )

}



// ─── GAME OVER ────────────────────────────────────────────────────────────────



function GameOverScreen({

  navigate,

  players = initialPlayers,

  onRematch,

  transactionLedger = [],

  eventLogList = [],

  localPlayerId = 0,

  roomCode,

  isHost = false,

  roundNumber = 1,

}: {

  navigate: (screen: Screen) => void

  players?: EnginePlayer[]

  onRematch?: () => void

  transactionLedger?: TransactionRecord[]

  eventLogList?: GameplayEventEntry[]

  localPlayerId?: number

  roomCode?: string

  isHost?: boolean

  roundNumber?: number

}) {

  const [showInsights, setShowInsights] = useState(false)

  const [showEventLog, setShowEventLog] = useState(false)

  const [isRematchLoading, setIsRematchLoading] = useState(false)

  const [rematchError, setRematchError] = useState<string | null>(null)

  const [rematchReady, setRematchReady] = useState(false)

  const [rematchState, setRematchState] = useState<{ readyPlayerIds: number[]; totalEligible?: number }>({

    readyPlayerIds: [],

  })



  useEffect(() => {

    const unsub = multiplayerClient.onRematchState((state) => {

      setRematchState(state)

    })

    return () => unsub()

  }, [])



  // Eligible active players (non-left, connected)

  const connectedCount = players.filter((p) => p.connected !== false).length



  const handleRematchClick = async () => {

    if (isRematchLoading) return

    setRematchError(null)



    if (roomCode) {

      if (isHost) {

        if (connectedCount < 2) {

          setRematchError("Cannot start rematch: at least 2 connected players are required.")

          return

        }

        setIsRematchLoading(true)

        try {

          await multiplayerClient.rematch()

        } catch (err: any) {

          setIsRematchLoading(false)

          setRematchError(err?.message || "Failed to start rematch.")

        }

      } else {

        // Guest player signals rematch readiness

        setIsRematchLoading(true)

        try {

          await multiplayerClient.signalRematchReady()

          setRematchReady(true)

        } catch (err: any) {

          setRematchError(err?.message || "Failed to send rematch request.")

        } finally {

          setIsRematchLoading(false)

        }

      }

    } else {

      if (onRematch) onRematch()

      else navigate("game")

    }

  }



  const handleReturnToMenu = async () => {

    if (roomCode) {

      await multiplayerClient.leaveRoom().catch(() => {})

    }

    navigate("menu")

  }



  // Non-bankrupt players ranked first (sorted by cash desc), then bankrupt/resigned players

  const ranked = [...players].sort((a, b) => {

    if (Boolean(a.isBankrupt) !== Boolean(b.isBankrupt)) {

      return a.isBankrupt ? 1 : -1

    }

    return b.money - a.money

  })



  const winner = ranked.find((p) => !p.isBankrupt) || ranked[0]

  const isNoWinner = !winner || (winner.isBankrupt && ranked.every((p) => p.isBankrupt))



  return (

    <main className="gameover-screen">

      <Logo compact />

      <div className="winner-crown">

        <Icon name="trophy" size={36} />

      </div>

      <small>{isNoWinner ? "MATCH CONCLUDED" : "WINNER"}</small>

      <strong className="winner-name">{isNoWinner ? "No Active Victor" : winner.name}</strong>

      <span className="winner-total">

        {isNoWinner

          ? "All players eliminated / resigned"

          : `FINAL WORTH · Rs${winner.money.toLocaleString()}`}

      </span>

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

              <strong>

                {player.name}

                {player.isBankrupt && (

                  <span style={{ marginLeft: "6px", color: "var(--red)", fontSize: "10px", fontWeight: "bold" }}>

                    [BANKRUPT / RESIGNED]

                  </span>

                )}

              </strong>

              <small>{player.ownedProperties.length} properties</small>

            </span>

            <em>₹{player.money.toLocaleString()}</em>

          </div>

        ))}

      </section>

      <div className="gameover-actions">

        {roomCode && (

          <div className="rematch-status-badge" style={{ justifyContent: "center" }}>

            <span>ROOM: {roomCode}</span>

            <span>·</span>

            <span>{isHost ? "YOU ARE HOST" : "GUEST PLAYER"}</span>

            {rematchState.readyPlayerIds.length > 0 && (

              <>

                <span>·</span>

                <span>{rematchState.readyPlayerIds.length} READY</span>

              </>

            )}

          </div>

        )}



        {rematchError && (

          <div style={{ color: "var(--red)", fontSize: "12px", textAlign: "center", padding: "6px" }}>

            {rematchError}

          </div>

        )}



        <Button

          onClick={handleRematchClick}

          disabled={isRematchLoading || (Boolean(roomCode) && isHost && connectedCount < 2) || (Boolean(roomCode) && !isHost && rematchReady)}

        >

          {isRematchLoading

            ? "INITIALIZING REMATCH..."

            : roomCode

              ? isHost

                ? connectedCount < 2

                  ? "REMATCH (NEED 2+ PLAYERS)"

                  : "START REMATCH (SAME RULES)"

                : rematchReady

                  ? "REMATCH READY · WAITING FOR HOST"

                  : "READY FOR REMATCH"

              : "REMATCH (SAME RULES)"}

        </Button>

        <Button variant="secondary" onClick={() => setShowInsights(true)}>

          VIEW FINAL INSIGHTS

        </Button>

        <Button variant="secondary" onClick={() => setShowEventLog(true)}>

          VIEW MATCH LOG ({eventLogList.length})

        </Button>

        <Button variant="ghost" onClick={handleReturnToMenu}>

          RETURN TO MAIN MENU

        </Button>

      </div>



      {showInsights && (

        <FinancialInsightsModal

          players={players}

          localPlayerId={localPlayerId}

          transactionLedger={transactionLedger as any}

          roundNumber={roundNumber}

          close={() => setShowInsights(false)}

        />

      )}



      {showEventLog && (

        <GameplayEventLog

          isOpen={showEventLog}

          onClose={() => setShowEventLog(false)}

          events={eventLogList}

          onClear={() => {}}

        />

      )}

    </main>

  )

}



// ─── APP ROOT ─────────────────────────────────────────────────────────────────



export default function App() {

  const [screen, setScreen] = useState<Screen>("menu")



  const [splash, setSplash] = useState(true)



  const [inspectedProp, setInspectedProp] =

    useState<PropertyDefinition | SpecialPropertyDefinition | null>(null)



  // Setup settings (controlled by host in SetupScreen)

  const [playerCount, setPlayerCount] = useState(4)

  const [startingMoney, setStartingMoney] = useState(45000)

  const [doublesRule, setDoublesRule] = useState(true)



  // Host Lobby & Permanent Game-Settings Lock state

  const [roomCode, setRoomCode] = useState<string>(() => generateCrownfallRoomCode())

  const [gamePhase, setGamePhase] = useState<GamePhase>("LOBBY")

  const [settingsLocked, setSettingsLocked] = useState<boolean>(false)

  const [lobbyModal, setLobbyModal] = useState<Modal | null>(null)

  const [startGameError, setStartGameError] = useState<string | null>(null)

  const [rules, setRules] = useState<GameRules>({

    defaultStartingMoney: 45000,

    startingMoneyOptions: [40000, 45000, 50000, 55000, 60000, 65000],

    passStartBonus: 2300,

    doublesRuleEnabled: true,

    maxPlayers: 4,

    minPlayers: 2,

    timerEnabled: false,

    timerSeconds: 60,

    requireLandingToBuild: false,

  })



  const setEngineRules = useCallback(

    (newRules: Partial<GameRules> | ((prev: GameRules) => GameRules)) => {

      setRules((prev) => {

        const resolved = typeof newRules === "function" ? newRules(prev) : newRules

        return { ...prev, ...resolved }

      })

    },

    [],

  )



  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string, durationMs = 2500) => {

    setToastMessage(msg)

    window.setTimeout(() => {

      setToastMessage((prev) => (prev === msg ? null : prev))

    }, durationMs)

  }, [])



  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>(() => {

    return (multiplayerClient.getLatestSnapshot()?.joinRequests as PendingJoinRequest[]) || []

  })



  const handleAcceptJoinRequest = async (requestId: string) => {

    try {

      await multiplayerClient.respondJoinRequest(requestId, "ACCEPT")

      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId))

      showToast("Player admitted to table!")

    } catch (err: any) {

      showToast(err?.message || "Failed to admit player")

    }

  }



  const handleRejectJoinRequest = async (requestId: string) => {

    try {

      await multiplayerClient.respondJoinRequest(requestId, "REJECT")

      setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId))

      showToast("Player join request declined.")

    } catch (err: any) {

      showToast(err?.message || "Failed to reject player")

    }

  }



  const handleUpdateRules = async (

    newRules: Partial<GameRules>,

  ): Promise<{ success: boolean; error?: string }> => {

    if (settingsLocked || gamePhase === "IN_PROGRESS") {

      return { success: false, error: "Game settings are permanently locked for this match." }

    }

    const currentHostId = multiplayerClient.getLatestSnapshot()?.actingHostPlayerId ?? multiplayerClient.getLatestSnapshot()?.hostPlayerId ?? 0

    const isMultiplayerActive = Boolean(roomCode || multiplayerClient.getRoomCode())

    if (isMultiplayerActive && localPlayerId !== currentHostId) {

      return { success: false, error: "Only the active host can modify match settings." }

    }



    try {

      const res = await defaultEngine.updateRules(newRules, localPlayerId)

      if (res.success) {

        if (newRules.defaultStartingMoney !== undefined) {

          setStartingMoney(newRules.defaultStartingMoney)

          const bonus = Math.floor((newRules.defaultStartingMoney * 5 + 5000) / 10000) * 100

          setRules((prev) => ({ ...prev, ...newRules, passStartBonus: bonus }))

        } else {

          setRules((prev) => ({ ...prev, ...newRules }))

        }

        if (newRules.doublesRuleEnabled !== undefined) setDoublesRule(newRules.doublesRuleEnabled)

        if (newRules.timerEnabled !== undefined) setTimerEnabled(newRules.timerEnabled)

        if (newRules.timerSeconds !== undefined) setTimerSeconds(newRules.timerSeconds)

        if (newRules.maxPlayers !== undefined) setPlayerCount(newRules.maxPlayers)

        try {

          new BroadcastChannel("crownfall_sync").postMessage({ type: "RULES_SYNC", rules: newRules })

        } catch (_) {}

        return { success: true }

      }

      return { success: false, error: res.error || "Failed to update rules." }

    } catch (e: any) {

      return { success: false, error: e?.message || "Failed to update rules." }

    }

  }



  // Authoritative engine-synced game state



  const [players, setPlayers] = useState<EnginePlayer[]>(initialPlayers)



  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0)



  const [turnState, setTurnState] = useState<string>("WAITING_FOR_ROLL")



  const [playerPositions, setPlayerPositions] = useState<number[]>([0, 0, 0, 0])



  const [roundNumber, setRoundNumber] = useState<number>(1)



  const isMovementInProgressRef = useRef(false)

  const pendingSnapshotRef = useRef<any>(null)



  const [turnBuildingsBuilt, setTurnBuildingsBuilt] = useState<string[]>([])

  const [turnPurchasedProperties, setTurnPurchasedProperties] = useState<string[]>([])

  const [activeLanding, setActiveLanding] = useState<{ propertyId: string | null; position: number; isActive: boolean } | null>(null)

  const [currentTurnId, setCurrentTurnId] = useState<number>(1)

  const [propertyOwnerCrossings, setPropertyOwnerCrossings] = useState<Record<string, number>>({})



  const applyGameStateSnapshot = useCallback((gs: any) => {

    if (isMovementInProgressRef.current) {

      pendingSnapshotRef.current = { ...(pendingSnapshotRef.current || {}), gameState: gs }

      return

    }

    setActivePlayerIndex(gs.activePlayerIndex)

    setTurnState(gs.turnState)

    setRoundNumber(gs.roundNumber)

    if (gs.players && Array.isArray(gs.players)) {

      setPlayerPositions(gs.players.map((p: any) => p.position))

      setPlayers((prev) => {

        return gs.players.map((p: any, idx: number) => {

          const existing = prev.find((ep) => ep.id === p.id) || prev[idx]

          let name = p.name || existing?.name

          let color = p.color || existing?.color

          if (!name || !name.trim()) {

            try {

              const saved = getStoredPlayerName(idx)

              if (saved && saved.trim()) name = saved.trim()

            } catch (_) {}

          }

          return {

            id: p.id,

            name: name || `Player ${idx + 1}`,

            color: (color || AVAILABLE_PLAYER_COLORS[idx % AVAILABLE_PLAYER_COLORS.length].id) as PlayerColor,

            token: p.token || existing?.token || String(idx + 1),

            isHuman: p.isHuman !== undefined ? p.isHuman : (existing?.isHuman ?? true),

            connected: p.connected !== false,

            isHost: p.isHost !== undefined ? p.isHost : existing?.isHost,

            isLeft: Boolean(p.isLeft),

            money: p.money ?? existing?.money ?? 0,

            position: p.position ?? existing?.position ?? 0,

            rotationsCompleted: p.rotationsCompleted ?? existing?.rotationsCompleted ?? 0,

            inJail: p.inJail ?? existing?.inJail ?? false,

            jailTurns: p.jailTurns ?? existing?.jailTurns ?? 0,

            inRestHouse: p.inRestHouse ?? existing?.inRestHouse ?? false,

            restHouseTurns: p.restHouseTurns !== undefined ? p.restHouseTurns : (existing?.restHouseTurns ?? 0),

            cardJailSkip: p.cardJailSkip ?? existing?.cardJailSkip ?? false,

            cardJailSkipTurns: p.cardJailSkipTurns !== undefined ? p.cardJailSkipTurns : (existing?.cardJailSkipTurns ?? 0),

            ownedProperties: p.ownedProperties ? [...p.ownedProperties] : (existing?.ownedProperties ? [...existing.ownedProperties] : []),

            buildings: p.buildings ? { ...p.buildings } : (existing?.buildings ? { ...existing.buildings } : {}),

            mortgages: p.mortgages ? { ...p.mortgages } : (existing?.mortgages ? { ...existing.mortgages } : {}),

            isBankrupt: p.isBankrupt ?? existing?.isBankrupt ?? false,

          }

        })

      })

    }

    if (gs.propertyOwnerCrossings) {

      setPropertyOwnerCrossings(gs.propertyOwnerCrossings)

    }

    if (gs.transactionLedger) setTransactionLedger(gs.transactionLedger)

    if (gs.tradeOffers) setTradeOffers(gs.tradeOffers)

    if (gs.turnTimer) setTurnTimer(gs.turnTimer)

    if (gs.turnPurchasedProperties !== undefined) setTurnPurchasedProperties(gs.turnPurchasedProperties || [])

    if (gs.turnBuildingsBuilt !== undefined) setTurnBuildingsBuilt(gs.turnBuildingsBuilt || [])

    if (gs.activeLanding !== undefined) setActiveLanding(gs.activeLanding)

    if (gs.currentTurnId !== undefined) setCurrentTurnId(gs.currentTurnId)

    if (gs.rules) {

      setEngineRules(gs.rules)

    }

    if (gs.turnState === "GAME_OVER") {

      setScreen("gameover")

    }

  }, [])



  const [isCppConnected, setIsCppConnected] = useState<boolean>(false)

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => multiplayerClient.getStatus())

  const [connectionMessage, setConnectionMessage] = useState<string>(() => multiplayerClient.getStatusMessage())



  // Feature 1: Trade Offers

  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([])



  // Feature 7: Local Presentation Preferences

  const [preferences, setPreferences] = useState<GamePreferences>(loadPreferences)



  // Feature 3: Session Recovery

  const [sessionRestored, setSessionRestored] = useState<boolean>(false)



  // Synchronize active theme attribute to HTML and Body on mount & preference change

  useEffect(() => {

    if (typeof document !== "undefined") {

      const activeTheme = preferences?.theme === "light" ? "light" : "dark"

      document.documentElement.setAttribute("data-theme", activeTheme)

      document.body.setAttribute("data-theme", activeTheme)

      document.body.classList.toggle("reduced-motion", !!preferences?.reducedMotion)

    }

  }, [preferences?.theme, preferences?.reducedMotion])



  const handleUpdatePreferences = (newPrefs: GamePreferences) => {

    const activeTheme: "light" | "dark" = newPrefs.theme === "light" ? "light" : "dark"

    const updated: GamePreferences = { ...newPrefs, theme: activeTheme }

    setPreferences(updated)

    savePreferences(updated)

    if (typeof document !== "undefined") {

      document.documentElement.setAttribute("data-theme", activeTheme)

      document.body.setAttribute("data-theme", activeTheme)

      document.body.classList.toggle("reduced-motion", !!newPrefs.reducedMotion)

    }

  }



  // Feature 2: Turn Timer settings

  const [timerEnabled, setTimerEnabled] = useState<boolean>(true)

  const [timerSeconds, setTimerSeconds] = useState<number>(60)







  // Part 1: Multiplayer identity & Dev Mode

  const [localPlayerId, setLocalPlayerIdState] = useState<number>(() => {

    try {

      const q = new URLSearchParams(window.location.search).get("player")

      if (q !== null && !isNaN(parseInt(q, 10))) return parseInt(q, 10)

      const mpId = multiplayerClient.getPlayerId()

      if (mpId !== null && mpId !== undefined) return mpId

      const s = getStoredPlayerId()

      if (s !== null) return s

    } catch (_) {}

    return 0

  })



  const setLocalPlayerId = (id: number) => {

    setLocalPlayerIdState(id)

    setStoredPlayerId(id)

  }







  // Feature 1: Turn Activity Log & Authoritative Event Log

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])

  const [eventLogList, setEventLogList] = useState<GameplayEventEntry[]>([])



  // Feature 2: Authoritative financial transaction ledger with persistence & deduplication

  const [transactionLedger, setTransactionLedger] = useState<TransactionRecord[]>(() => {

    return getStoredLedgerCache() ?? []

  })



  useEffect(() => {

    setStoredLedgerCache(transactionLedger)

  }, [transactionLedger])



  // Feature 2: Authoritative Turn Timer State

  const [turnTimer, setTurnTimer] = useState<TurnTimerState | null>(null)



  useEffect(() => {

    const timer = window.setTimeout(() => setSplash(false), 900)



    defaultEngine.isCppConnected().then((connected) => {

      setIsCppConnected(connected)

    })



    if (preferences.reducedMotion && typeof document !== "undefined") {

      document.body.classList.add("reduced-motion")

    }



    // Session recovery: check if previous game session was active

    const wasActive = isStoredSessionActive()

    if (wasActive) {

      defaultEngine

        .getState()

        .then((state) => {

          if (state && state.gameStarted) {

            const recoveredPlayers = state.players.map((p, idx) => {

              let name = p.name

              let color = p.color

              try {

                if (!name || !name.trim()) {

                  const saved = getStoredPlayerName(idx)

                  if (saved && saved.trim()) name = saved.trim()

                }

                if (!color) {

                  const savedColor = getStoredPlayerColor(idx)

                  if (savedColor && savedColor.trim()) color = savedColor.trim() as PlayerColor

                }

              } catch (_) {}

              return { ...p, name, color }

            })

            setPlayers(recoveredPlayers)

            setActivePlayerIndex(state.activePlayerIndex)

            setTurnState(state.turnState)

            setRoundNumber(state.roundNumber)

            if (state.propertyOwnerCrossings) setPropertyOwnerCrossings(state.propertyOwnerCrossings)

            setPlayerPositions(state.players.map((p) => p.position))

            if (state.activityLog) setActivityLog(state.activityLog)

            if (state.transactionLedger) setTransactionLedger(state.transactionLedger)

            if (state.tradeOffers) setTradeOffers(state.tradeOffers)

            setGamePhase("IN_PROGRESS")

            setSettingsLocked(true)

            setScreen("game")

            setSessionRestored(true)

          } else {

            setStoredSessionActive(false)

            setGamePhase("LOBBY")

            setSettingsLocked(false)

            defaultEngine.resetToLobby?.().catch(() => {})

          }

        })

        .catch(() => {})

    } else {

      defaultEngine.resetToLobby?.().catch(() => {})

      setGamePhase("LOBBY")

      setSettingsLocked(false)

    }



    return () => window.clearTimeout(timer)

  }, [])



  // Active theme is synchronized by the preferences effect above



  useEffect(() => {

    let isMounted = true

    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("crownfall_sync") : null

    const handleBc = (evt: MessageEvent) => {

      if (!isMounted) return

      if (evt.data?.type === "RULES_SYNC" && evt.data?.rules) {

        if (evt.data.rules.defaultStartingMoney !== undefined) {

          setStartingMoney(evt.data.rules.defaultStartingMoney)

          const bonus = Math.floor((evt.data.rules.defaultStartingMoney * 5 + 5000) / 10000) * 100

          setRules((prev) => ({ ...prev, ...evt.data.rules, passStartBonus: bonus }))

        } else {

          setRules((prev) => ({ ...prev, ...evt.data.rules }))

        }

        if (evt.data.rules.doublesRuleEnabled !== undefined) setDoublesRule(evt.data.rules.doublesRuleEnabled)

        if (evt.data.rules.timerEnabled !== undefined) setTimerEnabled(evt.data.rules.timerEnabled)

        if (evt.data.rules.timerSeconds !== undefined) setTimerSeconds(evt.data.rules.timerSeconds)

      } else if (evt.data?.type === "COLOR_SYNC" && typeof evt.data?.playerId === "number" && evt.data?.color) {

        setPlayers((prev) => prev.map((p) => p.id === evt.data.playerId ? { ...p, color: evt.data.color as PlayerColor } : p))

      } else if (evt.data?.type === "START_GAME") {

        setGamePhase("IN_PROGRESS")

        setSettingsLocked(true)

        setScreen("game")

      } else if (evt.data?.type === "SYNC") {

        if (defaultEngine && defaultEngine.getState) {

          defaultEngine.getState().then((st) => {

            if (!isMounted || !st) return

            if (isMovementInProgressRef.current) {

              pendingSnapshotRef.current = { ...(pendingSnapshotRef.current || {}), gameState: st, players: st.players }

              return

            }

            if (applyGameStateSnapshot) {

              applyGameStateSnapshot(st)

            }

            if (st.players && Array.isArray(st.players)) {

              setPlayers((prev) => {

                return st.players.map((p, idx) => {

                  const existing = prev.find((ep) => ep.id === p.id) || prev[idx]

                  return {

                    ...p,

                    name: existing?.name || p.name,

                    color: (existing?.color || p.color) as PlayerColor,

                  }

                })

              })

            }

            if (st.propertyOwnerCrossings) {

              setPropertyOwnerCrossings(st.propertyOwnerCrossings)

            }

          }).catch(() => {})

        }

      }

    }

    bc?.addEventListener("message", handleBc)

    return () => {

      isMounted = false

      bc?.removeEventListener("message", handleBc)

      bc?.close()

    }

  }, [])



  // Multiplayer room snapshot & connection status synchronization

  useEffect(() => {

    // Proactively check server health on mount (handles Render free tier cold start)

    multiplayerClient.checkServerHealth().catch(() => {})



    const unsubStatus = multiplayerClient.onStatusChange((status, msg) => {

      setConnectionStatus(status)

      if (msg) setConnectionMessage(msg)

    })



    const unsubSnapshot = multiplayerClient.onSnapshot((snapshot) => {

      if (!snapshot) return

      setRoomCode(snapshot.roomCode)



      if (snapshot.rules) {

        if (snapshot.rules.defaultStartingMoney !== undefined) {

          setStartingMoney(snapshot.rules.defaultStartingMoney)

          const bonus = Math.floor((snapshot.rules.defaultStartingMoney * 5 + 5000) / 10000) * 100

          setRules((prev) => ({ ...prev, ...snapshot.rules, passStartBonus: bonus }))

        } else {

          setRules((prev) => ({ ...prev, ...snapshot.rules }))

        }

        if (snapshot.rules.doublesRuleEnabled !== undefined) setDoublesRule(snapshot.rules.doublesRuleEnabled)

        if (snapshot.rules.timerEnabled !== undefined) setTimerEnabled(snapshot.rules.timerEnabled)

        if (snapshot.gamePhase === "IN_PROGRESS" && snapshot.rules.playerCount !== undefined) {

          setPlayerCount(snapshot.rules.playerCount)

        } else if (snapshot.rules.maxPlayers !== undefined) {

          setPlayerCount(snapshot.rules.maxPlayers)

        }

      }



      if (snapshot.players && snapshot.players.length > 0) {

        setPlayers((prev) => {

          return snapshot.players.map((mp, idx) => {

            const existing = prev.find((p) => p.id === mp.id) || prev[idx]

            return {

              id: mp.id,

              name: mp.name,

              color: mp.color as PlayerColor,

              token: mp.token || String(idx + 1),

              isHuman: mp.isHuman,

              connected: mp.connected !== false,

              isHost: mp.isHost !== undefined ? mp.isHost : existing?.isHost,

              isLeft: Boolean(mp.isLeft),

              money: mp.money ?? existing?.money ?? 0,

              position: isMovementInProgressRef.current ? (existing?.position ?? mp.position ?? 0) : (mp.position ?? existing?.position ?? 0),

              rotationsCompleted: mp.rotationsCompleted ?? existing?.rotationsCompleted ?? 0,

              inJail: mp.inJail ?? existing?.inJail ?? false,

              jailTurns: mp.jailTurns ?? existing?.jailTurns ?? 0,

              inRestHouse: mp.inRestHouse ?? existing?.inRestHouse ?? false,

              restHouseTurns: mp.restHouseTurns !== undefined ? mp.restHouseTurns : (existing?.restHouseTurns ?? 0),

              cardJailSkip: mp.cardJailSkip ?? existing?.cardJailSkip ?? false,

              cardJailSkipTurns: mp.cardJailSkipTurns !== undefined ? mp.cardJailSkipTurns : (existing?.cardJailSkipTurns ?? 0),

              ownedProperties: mp.ownedProperties ?? existing?.ownedProperties ?? [],

              buildings: mp.buildings ?? existing?.buildings ?? {},

              mortgages: mp.mortgages ?? existing?.mortgages ?? {},

              isBankrupt: mp.isBankrupt ?? existing?.isBankrupt ?? false,

            }

          })

        })

      }



      if (snapshot.gameState) {

        if (snapshot.gameState.propertyOwnerCrossings) {

          setPropertyOwnerCrossings(snapshot.gameState.propertyOwnerCrossings)

        }

        if (isMovementInProgressRef.current) {

          pendingSnapshotRef.current = { ...(pendingSnapshotRef.current || {}), ...snapshot }

        } else {

          applyGameStateSnapshot(snapshot.gameState)

        }

      }



      if (snapshot.eventLog && snapshot.eventLog.length > 0) {

        if (isMovementInProgressRef.current) {

          if (pendingSnapshotRef.current) {

            pendingSnapshotRef.current.eventLog = snapshot.eventLog

          } else {

            pendingSnapshotRef.current = { eventLog: snapshot.eventLog }

          }

        } else {

          setEventLogList(snapshot.eventLog)

        }

      }



      const mpPlayerId = multiplayerClient.getPlayerId()

      if (mpPlayerId !== null && mpPlayerId !== undefined) {

        setLocalPlayerIdState((cur) => {

          if (cur !== mpPlayerId) {

            setStoredPlayerId(mpPlayerId)

            return mpPlayerId

          }

          return cur

        })

      }



      if (snapshot.gamePhase === "IN_PROGRESS") {

        setGamePhase("IN_PROGRESS")

        setSettingsLocked(true)

        if (snapshot.gameState?.turnState !== "GAME_OVER") {

          setScreen("game")

        }

      } else if (snapshot.gamePhase === "LOBBY") {

        setGamePhase("LOBBY")

        setSettingsLocked(false)

      }



      try {

        new BroadcastChannel("crownfall_sync").postMessage({ type: "SYNC" })

      } catch (_) {}

    })



    const unsubRoomClosed = multiplayerClient.onRoomClosed((reason) => {

      showToast(reason)

      setScreen("menu")

      setGamePhase("LOBBY")

      setSettingsLocked(false)

      setRoomCode(generateCrownfallRoomCode())

    })



    const unsubPlayerLeft = multiplayerClient.onPlayerLeft((pId, pName) => {

      showToast(`${pName} left the room.`)

    })



    const unsubKicked = multiplayerClient.onKicked((reason) => {

      showToast(reason || "You were kicked from the room.")

      setScreen("menu")

      setGamePhase("LOBBY")

      setSettingsLocked(false)

      setRoomCode(generateCrownfallRoomCode())

    })



    const unsubPlayerKicked = multiplayerClient.onPlayerKicked((pId, pName, reason) => {

      showToast(`${pName} was kicked from the room (${reason || "Host removed"}).`)

    })



    const unsubReq = multiplayerClient.onJoinRequest((req) => {

      setPendingRequests((prev) => {

        if (prev.some((r) => r.requestId === req.requestId)) return prev

        return [...prev, req]

      })

      showToast(`Join request from ${req.name}!`)

    })



    const unsubSnapReq = multiplayerClient.onSnapshot((snap) => {

      if (snap?.joinRequests) {

        setPendingRequests(snap.joinRequests)

      }

    })



    if (multiplayerClient.getRoomCode() && (multiplayerClient.getSessionToken() || multiplayerClient.getReconnectToken())) {

      multiplayerClient.reconnect().then((snap) => {

        if (snap) {

          const pid = multiplayerClient.getPlayerId()

          if (pid !== null && pid !== undefined) {

            setLocalPlayerId(pid)

          }

        }

      }).catch(() => {})

    }



    return () => {

      unsubStatus()

      unsubSnapshot()

      unsubRoomClosed()

      unsubPlayerLeft()

      unsubKicked()

      unsubPlayerKicked()

      unsubReq()

      unsubSnapReq()

    }

  }, [])



  const handleUpdatePlayerName = (id: number, newName: string) => {

    // Preserve what the user types, including empty string and spaces while editing

    const rawName = newName.substring(0, 20)



    setPlayers((prev) =>

      prev.map((p) => (p.id === id ? { ...p, name: rawName } : p)),

    )



    const trimmed = rawName.trim()

    if (trimmed.length > 0) {

      setStoredPlayerName(id, trimmed)

      defaultEngine.updatePlayerName(id, trimmed).catch(() => {})

    }

  }



  const handleUpdatePlayerColor = (id: number, newColor: string) => {

    const clean = newColor.trim().toLowerCase()

    const colorDef = AVAILABLE_PLAYER_COLORS.find((c) => c.id === clean)

    const colorName = colorDef ? colorDef.name : clean



    // Check taken status among other active confirmed players

    const isTaken = players.some(

      (p) => p.id !== id && p.connected !== false && !p.isLeft && p.color?.toLowerCase() === clean

    )

    if (isTaken) {

      showToast(`Color '${colorName}' is already taken by another player.`)

      console.warn(`[Color] Selection '${newColor}' rejected: already taken by another player`)

      return

    }



    // Call engine authoritatively: if server rejects, preserve current valid color

    defaultEngine.updatePlayerColor?.(id, clean)

      .then((res) => {

        if (res && (res as any).success === false) {

          const errMsg = (res as any).error || `Color '${colorName}' is no longer available.`

          showToast(errMsg)

          return

        }

        setStoredPlayerColor(id, clean)

        setPlayers((prev) =>

          prev.map((p) => (p.id === id ? { ...p, color: clean as PlayerColor } : p))

        )

      })

      .catch((err: any) => {

        const errMsg = err?.message || `Color '${colorName}' is no longer available.`

        showToast(errMsg)

      })



    try {

      new BroadcastChannel("crownfall_sync").postMessage({ type: "COLOR_SYNC", playerId: id, color: clean })

    } catch (_) {}

  }



  /** Start game: initialise engine with setup settings, permanently lock rules, reset all UI state. */

  const handleStartGame = async () => {

    const authoritativeHostId = multiplayerClient.getLatestSnapshot()?.actingHostPlayerId ?? multiplayerClient.getLatestSnapshot()?.hostPlayerId ?? 0

    const isMultiplayerActive = Boolean(roomCode || multiplayerClient.getRoomCode())

    if (isMultiplayerActive && localPlayerId !== authoritativeHostId) {

      console.warn("Only the active host can start the game.")

      return

    }



    // Filter confirmed connected human participants (no disconnected/left players)

    const confirmedPlayers = players.filter((p) => p.connected !== false)

    if (confirmedPlayers.length < 2) {

      setStartGameError("At least 2 human players are required to start a match. Waiting for players to join with the room code.")

      showToast("Waiting for other players to join before starting!")

      return

    }



    // Submission validation: reject empty or whitespace-only names

    const emptyPlayer = confirmedPlayers.find((p) => !p.name || !p.name.trim())

    if (emptyPlayer) {

      const msg = `Player ${emptyPlayer.id + 1} must enter a valid name before starting.`

      setStartGameError(msg)

      showToast(msg)

      return

    }



    // Authoritative color uniqueness validation at match start: reject if any duplicate exists

    const colorUsage = new Set<string>()

    for (const p of confirmedPlayers) {

      const col = (p.color || "").toLowerCase().trim()

      if (!col) {

        const msg = `${p.name} must select a valid color.`

        setStartGameError(msg)

        showToast(msg)

        return

      }

      if (colorUsage.has(col)) {

        const colorDef = AVAILABLE_PLAYER_COLORS.find((c) => c.id === col)

        const colorName = colorDef ? colorDef.name : col

        const msg = `Cannot start game: Duplicate color '${colorName}' selected. Each player must choose a distinct color.`

        setStartGameError(msg)

        showToast(msg)

        return

      }

      colorUsage.add(col)

    }

    setStartGameError(null)



    try {

      const effectiveCount = confirmedPlayers.length

      const currentMax = rules.maxPlayers ?? playerCount



      const playerSetups = confirmedPlayers.map((p, idx) => {

        const chosenName = p.name.trim()

        setStoredPlayerName(idx, chosenName)

        const col = (p.color || "saffron").toLowerCase()

        return {

          name: chosenName,

          color: col as PlayerColor,

          token: p.token || String(idx + 1),

          isHuman: true,

        }

      })



      const startCap = rules.defaultStartingMoney ?? startingMoney ?? 45000

      const finalRules: GameRules = {

        defaultStartingMoney: startCap,

        startingMoneyOptions: [40000, 45000, 50000, 55000, 60000, 65000],

        passStartBonus: Math.floor((startCap * 5 + 5000) / 10000) * 100,

        doublesRuleEnabled: rules.doublesRuleEnabled ?? doublesRule,

        maxPlayers: currentMax,

        playerCount: effectiveCount,

        timerEnabled: rules.timerEnabled ?? timerEnabled,

        timerSeconds: rules.timerSeconds ?? timerSeconds,

        requireLandingToBuild: rules.requireLandingToBuild ?? false,

      }

      setPlayerCount(effectiveCount)



      // Generate distinct new session identity for current game

      const newSessionId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      setStoredSessionGameId(newSessionId)



      const gameState = await defaultEngine.startGame(finalRules, playerSetups)



      setGamePhase("IN_PROGRESS")

      setSettingsLocked(true)

      setStoredSessionActive(true)



      const mergedStartPlayers = gameState.players.map((p, idx) => {

        const setup = playerSetups[idx]

        return {

          ...p,

          name: setup?.name || p.name,

          color: (setup?.color || p.color) as PlayerColor,

        }

      })

      setPlayers(mergedStartPlayers)



      setActivePlayerIndex(gameState.activePlayerIndex)



      setTurnState(gameState.turnState)



      setPlayerPositions(gameState.players.map(() => 0))



      setRoundNumber(gameState.roundNumber)



      // Clean slate for session: initialize fresh event log and financial ledger

      setActivityLog(gameState.activityLog ?? [])

      setTransactionLedger(gameState.transactionLedger ?? [])

      setEventLogList([])



      if (gameState.turnTimer) {

        setTurnTimer(gameState.turnTimer)

      }



      if (gameState.tradeOffers) {

        setTradeOffers(gameState.tradeOffers)

      }



      setTurnPurchasedProperties(gameState.turnPurchasedProperties ?? [])

      setTurnBuildingsBuilt(gameState.turnBuildingsBuilt ?? [])

      setActiveLanding(gameState.activeLanding ?? null)

      setCurrentTurnId(gameState.currentTurnId ?? 1)



      try {

        new BroadcastChannel("crownfall_sync").postMessage({ type: "START_GAME", rules: finalRules })

      } catch (_) {}



      setScreen("game")

    } catch (err: any) {

      console.error("[Crownfall] Failed to start game:", err)

      setStartGameError(err?.message || "Failed to initialize game session with engine. Please retry.")

    }

  }



  const handleInspectFromAssets = (

    prop: PropertyDefinition | SpecialPropertyDefinition,

  ) => {

    setInspectedProp(prop)

  }



  const handleRemovePlayer = async (indexToRemove: number) => {

    if (localPlayerId !== 0 || indexToRemove === 0) return

    const targetPlayer = players[indexToRemove]

    const removedName = targetPlayer?.name || `Player ${indexToRemove + 1}`

    if (multiplayerClient.getRoomCode()) {

      try {

        await multiplayerClient.kickPlayer(targetPlayer.id, "Host removed from lobby")

      } catch (err: any) {

        showToast(`Could not remove player: ${err?.message || "Error"}`)

        return

      }

    }

    setPlayers((prev) => {

      const filtered = prev.filter((_, idx) => idx !== indexToRemove)

      return filtered.map((p, idx) => ({ ...p, id: idx }))

    })

    setPlayerCount((prev) => Math.max(2, prev - 1))

    showToast(`Removed ${removedName} from lobby`)

  }



  const handleKickPlayerInGame = async (targetPlayerId: number) => {

    if (!multiplayerClient.getRoomCode()) return

    const target = players.find((p) => p.id === targetPlayerId)

    const targetName = target?.name || `Player ${targetPlayerId + 1}`

    try {

      await multiplayerClient.kickPlayer(targetPlayerId, "Host kicked from match")

      showToast(`Kicked ${targetName} from the match`)

    } catch (err: any) {

      showToast(`Failed to kick player: ${err?.message || "Error"}`)

    }

  }





  const playerNames = players.map((p) => p.name)



  const handleNavigate = (newScreen: Screen) => {

    if (newScreen === "menu" || newScreen === "create" || newScreen === "join") {

      setStoredSessionActive(false)

      setStoredSessionGameId(null)

      setActivityLog([])

      setTransactionLedger([])

      setEventLogList([])

      setGamePhase("LOBBY")

      setSettingsLocked(false)

      defaultEngine.resetToLobby?.().catch(() => {})

    }

    setScreen(newScreen)

  }



  if (splash) {

    return (

      <div className="splash">

        <div className="splash-emblem">C</div>

        <Logo />

        <span>PREPARING THE BOARD</span>

        <i />

      </div>

    )

  }



  const isMultiplayerActive = Boolean(roomCode || multiplayerClient.getRoomCode())

  const authoritativeHostId = multiplayerClient.getLatestSnapshot()?.actingHostPlayerId ?? multiplayerClient.getLatestSnapshot()?.hostPlayerId ?? 0

  const isEffectiveHost = Boolean(

    isMultiplayerActive

      ? (localPlayerId !== null && localPlayerId === authoritativeHostId)

      : (localPlayerId === 0)

  )



  if (screen === "menu") return <MenuScreen navigate={handleNavigate} />



  if (screen === "create" || screen === "join") {

    return (

      <CrownfallErrorBoundary fallbackTitle="Player Setup Chamber" onReset={() => handleNavigate("menu")}>

        <SetupScreen

          type={screen}

          navigate={handleNavigate}

          roomCode={roomCode}

          setRoomCode={setRoomCode}

          localPlayerId={localPlayerId}

          setLocalPlayerId={setLocalPlayerId}

          players={players}

          onUpdatePlayerName={handleUpdatePlayerName}

          onUpdatePlayerColor={handleUpdatePlayerColor}

          rules={rules}

          startingMoney={startingMoney}

        />

      </CrownfallErrorBoundary>

    )

  }



  if (screen === "lobby") {

    return (

      <CrownfallErrorBoundary fallbackTitle="Pre-Game Lobby Chamber" onReset={() => handleNavigate("menu")}>

        <LobbyScreen

          navigate={handleNavigate}

          roomCode={roomCode}

          players={players.slice(0, rules.maxPlayers ?? playerCount)}

          onUpdatePlayerName={handleUpdatePlayerName}

          onUpdatePlayerColor={handleUpdatePlayerColor}

          onStartGame={handleStartGame}

          onOpenHostSettings={() => setLobbyModal("preferences")}

          localPlayerId={localPlayerId}

          setLocalPlayerId={setLocalPlayerId}

          timerEnabled={rules.timerEnabled ?? timerEnabled}

          timerSeconds={rules.timerSeconds ?? timerSeconds}

          startingMoney={rules.defaultStartingMoney ?? startingMoney}

          doublesRule={rules.doublesRuleEnabled ?? doublesRule}

          startGameError={startGameError}

          onClearStartError={() => setStartGameError(null)}

          connectionStatus={connectionStatus}

          connectionMessage={connectionMessage}

          onRetryConnection={() => multiplayerClient.retryConnection()}

          onRemovePlayer={handleRemovePlayer}

          pendingRequests={pendingRequests}

          onAcceptJoinRequest={handleAcceptJoinRequest}

          onRejectJoinRequest={handleRejectJoinRequest}

        />

        {lobbyModal && (

          <GameModal

            type={lobbyModal}

            close={() => setLobbyModal(null)}

            players={players}

            localPlayerId={localPlayerId}

            preferences={preferences}

            onUpdatePreferences={handleUpdatePreferences}

            rules={rules}

            onUpdateRules={handleUpdateRules}

            isGameStarted={gamePhase === "IN_PROGRESS"}

            isHost={isEffectiveHost}

            selectedProperty={CITY_PROPERTIES.bombay}

            propertyOwnerCrossings={propertyOwnerCrossings}

            setPropertyOwnerCrossings={setPropertyOwnerCrossings}

          />

        )}

      </CrownfallErrorBoundary>

    )

  }



  if (screen === "game") {

    return (

      <CrownfallErrorBoundary fallbackTitle="Crownfall Match Chamber" onReset={() => handleNavigate("menu")}>

        <GameScreen

          navigate={handleNavigate}

          onOpenProperty={handleInspectFromAssets}

          roomCode={roomCode}

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

          isCppConnected={isCppConnected}

          localPlayerId={localPlayerId}

          setLocalPlayerId={setLocalPlayerId}

          activityLog={activityLog}

          setActivityLog={setActivityLog}

          turnTimer={turnTimer}

          setTurnTimer={setTurnTimer}

          timerEnabled={rules.timerEnabled ?? timerEnabled}

          timerSeconds={rules.timerSeconds ?? timerSeconds}

          transactionLedger={transactionLedger}

          setTransactionLedger={setTransactionLedger}

          eventLogList={eventLogList}

          setEventLogList={setEventLogList}

          tradeOffers={tradeOffers}

          setTradeOffers={setTradeOffers}

          preferences={preferences}

          onUpdatePreferences={handleUpdatePreferences}

          sessionRestored={sessionRestored}

          onEndSession={() => {

            setTurnState("GAME_OVER")

            setScreen("gameover")

          }}

          rules={rules}

          setEngineRules={setEngineRules}

          onUpdateRules={handleUpdateRules}

          isGameStarted={gamePhase === "IN_PROGRESS"}

          isHost={isEffectiveHost}

          doublesRule={rules.doublesRuleEnabled ?? doublesRule}

          onStartGame={handleStartGame}

          connectionStatus={connectionStatus}

          connectionMessage={connectionMessage}

          onRetryConnection={() => multiplayerClient.retryConnection()}

          isGlobalMovementActiveRef={isMovementInProgressRef}

          pendingSnapshotRef={pendingSnapshotRef}

          applyGameStateSnapshot={applyGameStateSnapshot}

          onKickPlayer={handleKickPlayerInGame}

          pendingRequests={pendingRequests}

          onAcceptJoinRequest={handleAcceptJoinRequest}

          turnBuildingsBuilt={turnBuildingsBuilt}

          setTurnBuildingsBuilt={setTurnBuildingsBuilt}

          turnPurchasedProperties={turnPurchasedProperties}

          setTurnPurchasedProperties={setTurnPurchasedProperties}

          activeLanding={activeLanding}

          setActiveLanding={setActiveLanding}

          currentTurnId={currentTurnId}

          setCurrentTurnId={setCurrentTurnId}

          onRejectJoinRequest={handleRejectJoinRequest}

          propertyOwnerCrossings={propertyOwnerCrossings}

          setPropertyOwnerCrossings={setPropertyOwnerCrossings}

        />

        {lobbyModal && (

          <GameModal

            type={lobbyModal}

            close={() => setLobbyModal(null)}

            players={players}

            localPlayerId={localPlayerId}

            preferences={preferences}

            onUpdatePreferences={handleUpdatePreferences}

            rules={rules}

            onUpdateRules={handleUpdateRules}

            isGameStarted={gamePhase === "IN_PROGRESS"}

            isHost={isEffectiveHost}

            selectedProperty={CITY_PROPERTIES.bombay}

            onKickPlayer={handleKickPlayerInGame}

            propertyOwnerCrossings={propertyOwnerCrossings}

            setPropertyOwnerCrossings={setPropertyOwnerCrossings}

          />

        )}

      </CrownfallErrorBoundary>

    )

  }



  if (screen === "settings") {

    return (

      <SettingsScreen

        navigate={handleNavigate}

        preferences={preferences}

        onUpdatePreferences={handleUpdatePreferences}

      />

    )

  }



  return (

    <>

      <GameOverScreen

        navigate={handleNavigate}

        players={players}

        roomCode={roomCode || undefined}

        isHost={isEffectiveHost}

        onRematch={() => {

          if (multiplayerClient.getRoomCode()) {

            multiplayerClient.rematch().catch((err: any) => {

              showToast(`Rematch failed: ${err?.message || "Error"}`)

            })

          } else {

            handleStartGame()

          }

        }}

        transactionLedger={transactionLedger}

        eventLogList={eventLogList}

        localPlayerId={localPlayerId}

        roundNumber={roundNumber}

      />

      {toastMessage && (

        <div

          style={{

            position: "fixed",

            bottom: "24px",

            left: "50%",

            transform: "translateX(-50%)",

            background: "rgba(20, 20, 25, 0.95)",

            border: "1.5px solid var(--gold)",

            borderRadius: "8px",

            padding: "10px 18px",

            color: "#ffffff",

            fontFamily: '"Oswald", sans-serif',

            fontSize: "13px",

            letterSpacing: "0.04em",

            boxShadow: "0 6px 20px rgba(0,0,0,0.6)",

            zIndex: 99999,

            pointerEvents: "none",

          }}

        >

          {toastMessage}

        </div>

      )}

    </>

  )

}

