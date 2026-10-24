/**
 * Crownfall Multiplayer Client
 * Persistent bidirectional WebSocket and HTTP dual-transport client for online multiplayer.
 * Coordinates room creation, joining, lobby synchronization, and authoritative action dispatch.
 */

import { GameRules, GameState } from "./GameEngineInterface"
import { GameplayEventEntry } from "../components/GameplayEventLog"

export interface MultiplayerPlayer {
  id: number
  joinOrder?: number
  name: string
  color: string
  token: string
  isHuman: boolean
  isHost: boolean
  isOriginalHost?: boolean
  connected: boolean
  money: number
  position: number
  rotationsCompleted: number
  inJail: boolean
  jailTurns: number
  inRestHouse: boolean
  ownedProperties: string[]
  buildings: Record<string, number>
  mortgages: Record<string, boolean>
  isBankrupt: boolean
  isLeft?: boolean
}

export type MultiplayerPlayerSnapshot = MultiplayerPlayer

export interface PendingJoinRequest {
  requestId: string
  name: string
  color: string
  requestedAt: number
}

export interface RematchState {
  readyPlayerIds: number[]
  totalEligible?: number
}

export interface MultiplayerRoomSnapshot {
  roomCode: string
  hostPlayerId: number | null
  actingHostPlayerId?: number | null
  originalHostPlayerId?: number | null
  gamePhase: "LOBBY" | "IN_PROGRESS" | "GAME_OVER"
  settingsLocked: boolean
  rules: GameRules
  actionSequence: number
  rematchState?: RematchState
  joinRequests?: PendingJoinRequest[]
  players: MultiplayerPlayer[]
  gameState: GameState | null
  eventLog: GameplayEventEntry[]
  transactionLedger: any[]
}

export interface RollEvent {
  rollId: string
  sequence: number
  playerId: number
  dice1: number
  dice2: number
  diceTotal: number
  isDouble: boolean
  previousPosition: number
  newPosition: number
  spaceName: string
  actionResult: any
  snapshot: MultiplayerRoomSnapshot
}

export type ConnectionStatus = "disconnected" | "connecting" | "reconnecting" | "waking" | "connected" | "error"

/**
 * Resolves production and local development WebSocket/HTTP endpoints.
 * Prioritizes build-time environment variables (VITE_MULTIPLAYER_SERVER_URL, VITE_WS_URL)
 * and falls back to window location with automatic HTTPS -> WSS promotion.
 */
function resolveServerEndpoints(customUrl?: string): { wsUrl: string; httpUrl: string } {
  const envUrl =
    customUrl ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_MULTIPLAYER_SERVER_URL) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WS_URL) ||
    (typeof window !== "undefined" && (window as any).__MULTIPLAYER_SERVER_URL__) ||
    ""

  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, "")
    if (trimmed.startsWith("wss://")) {
      return { wsUrl: trimmed, httpUrl: trimmed.replace(/^wss:/, "https:") }
    }
    if (trimmed.startsWith("ws://")) {
      return { wsUrl: trimmed, httpUrl: trimmed.replace(/^ws:/, "http:") }
    }
    if (trimmed.startsWith("https://")) {
      return { wsUrl: trimmed.replace(/^https:/, "wss:"), httpUrl: trimmed }
    }
    if (trimmed.startsWith("http://")) {
      return { wsUrl: trimmed.replace(/^http:/, "ws:"), httpUrl: trimmed }
    }
    // Hostname without scheme
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:"
    return {
      wsUrl: `${isHttps ? "wss:" : "ws:"}//${trimmed}`,
      httpUrl: `${isHttps ? "https:" : "http:"}//${trimmed}`,
    }
  }

  // Fallback: derive from current window location
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:"
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    host.endsWith(".local")

  if (isLocal) {
    // Resolve dynamically to current window port so phone connecting to 8443 targets 8443
    const port =
      (typeof window !== "undefined" && (window.location.port || (window as any).__MULTIPLAYER_PORT__)) ||
      "8443"
    return {
      wsUrl: `ws://${host}:${port}`,
      httpUrl: `http://${host}:${port}`,
    }
  }

  // Production browser host without explicit env var: assume reverse proxy on same domain
  const portPart = typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : ""
  return {
    wsUrl: `${isHttps ? "wss:" : "ws:"}//${host}${portPart}`,
    httpUrl: `${isHttps ? "https:" : "http:"}//${host}${portPart}`,
  }
}

function getOrCreateClientId(): string {
  if (typeof window === "undefined") {
    return "cid_" + Math.random().toString(36).substring(2, 10)
  }
  // Try sessionStorage first so each browser tab/window gets a distinct client ID
  let cid = sessionStorage.getItem("crownfall_client_id")
  if (!cid) {
    cid = "cid_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10)
    try {
      sessionStorage.setItem("crownfall_client_id", cid)
      localStorage.removeItem("crownfall_client_id")
    } catch (_) {}
  }
  return cid
}

export class MultiplayerClient {
  private ws: WebSocket | null = null
  private serverUrl: string
  private httpBaseUrl: string
  private roomCode: string | null = null
  private sessionToken: string | null = null
  private reconnectToken: string | null = null
  private playerName: string | null = null
  private playerId: number | null = null
  private clientId: string = getOrCreateClientId()
  private status: ConnectionStatus = "disconnected"
  private statusMessage = ""
  private reconnectAttempts = 0
  private maxReconnectAttempts = 6
  private reconnectTimer: number | null = null
  private pingInterval: number | null = null
  private latestSnapshot: MultiplayerRoomSnapshot | null = null

  // Event listeners
  private snapshotListeners: ((snapshot: MultiplayerRoomSnapshot) => void)[] = []
  private rollEventListeners: ((event: RollEvent) => void)[] = []
  private statusListeners: ((status: ConnectionStatus, message?: string) => void)[] = []
  private errorListeners: ((err: string) => void)[] = []
  private joinRequestListeners: ((req: PendingJoinRequest) => void)[] = []
  private joinDecisionListeners: ((status: "ACCEPTED" | "REJECTED", reason?: string, playerId?: number) => void)[] = []
  private rematchStateListeners: ((rematchState: RematchState) => void)[] = []
  private playerLeftListeners: ((playerId: number, playerName: string, newHostPlayerId: number | null) => void)[] = []
  private roomClosedListeners: ((reason: string) => void)[] = []
  private kickedListeners: ((reason: string) => void)[] = []
  private playerKickedListeners: ((playerId: number, playerName: string, reason?: string) => void)[] = []
  private hostChangeListeners: ((newHostId: number | null, originalHostId?: number, actingHostId?: number | null) => void)[] = []
  private pendingJoinRequestId: string | null = null
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timer: number }
  >()

  constructor(customServerUrl?: string) {
    const endpoints = resolveServerEndpoints(customServerUrl)
    this.serverUrl = endpoints.wsUrl
    this.httpBaseUrl = endpoints.httpUrl

    // Attempt to load existing session and high-entropy reconnect token
    if (typeof window !== "undefined") {
      this.roomCode = sessionStorage.getItem("crownfall_mp_room") || localStorage.getItem("crownfall_last_room_code")
      this.sessionToken =
        sessionStorage.getItem("crownfall_mp_token") ||
        (this.roomCode ? localStorage.getItem(`crownfall_session_${this.roomCode}`) : null) ||
        null
      this.playerName =
        sessionStorage.getItem("crownfall_mp_player_name") ||
        (this.roomCode ? localStorage.getItem(`crownfall_name_${this.roomCode}`) : null) ||
        localStorage.getItem("crownfall_last_player_name")
      const pid = sessionStorage.getItem("crownfall_mp_pid")
      if (pid !== null) this.playerId = parseInt(pid, 10)
      if (this.roomCode) {
        this.reconnectToken =
          localStorage.getItem(`crownfall_reconnect_${this.roomCode}`) ||
          sessionStorage.getItem("crownfall_mp_reconnect_token") ||
          localStorage.getItem("crownfall_last_reconnect_token")
      }
    }
  }

  public getWsUrl(): string {
    return this.serverUrl
  }

  public getHttpUrl(): string {
    return this.httpBaseUrl
  }

  public getRoomCode(): string | null {
    return this.roomCode
  }

  public getPlayerId(): number | null {
    return this.playerId
  }

  public getSessionToken(): string | null {
    return this.sessionToken
  }

  public getReconnectToken(): string | null {
    return this.reconnectToken
  }

  public getPendingJoinRequestId(): string | null {
    return this.pendingJoinRequestId
  }

  public getStatus(): ConnectionStatus {
    return this.status
  }

  public getStatusMessage(): string {
    return this.statusMessage
  }

  public getLatestSnapshot(): MultiplayerRoomSnapshot | null {
    return this.latestSnapshot
  }

  public getClientId(): string {
    return this.clientId
  }

  public onKicked(cb: (reason: string) => void): () => void {
    this.kickedListeners.push(cb)
    return () => {
      this.kickedListeners = this.kickedListeners.filter((l) => l !== cb)
    }
  }

  public onPlayerKicked(cb: (playerId: number, playerName: string, reason?: string) => void): () => void {
    this.playerKickedListeners.push(cb)
    return () => {
      this.playerKickedListeners = this.playerKickedListeners.filter((l) => l !== cb)
    }
  }

  public onSnapshot(cb: (snapshot: MultiplayerRoomSnapshot) => void): () => void {
    this.snapshotListeners.push(cb)
    return () => {
      this.snapshotListeners = this.snapshotListeners.filter((l) => l !== cb)
    }
  }

  public onStatusChange(cb: (status: ConnectionStatus, message?: string) => void): () => void {
    this.statusListeners.push(cb)
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb)
    }
  }

  public onError(cb: (err: string) => void): () => void {
    this.errorListeners.push(cb)
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== cb)
    }
  }

  public onJoinRequest(cb: (req: PendingJoinRequest) => void): () => void {
    this.joinRequestListeners.push(cb)
    return () => {
      this.joinRequestListeners = this.joinRequestListeners.filter((l) => l !== cb)
    }
  }

  public onJoinDecision(cb: (status: "ACCEPTED" | "REJECTED", reason?: string, playerId?: number) => void): () => void {
    this.joinDecisionListeners.push(cb)
    return () => {
      this.joinDecisionListeners = this.joinDecisionListeners.filter((l) => l !== cb)
    }
  }

  public onRematchState(cb: (rematchState: RematchState) => void): () => void {
    this.rematchStateListeners.push(cb)
    return () => {
      this.rematchStateListeners = this.rematchStateListeners.filter((l) => l !== cb)
    }
  }

  public onPlayerLeft(cb: (playerId: number, playerName: string, newHostPlayerId: number | null) => void): () => void {
    this.playerLeftListeners.push(cb)
    return () => {
      this.playerLeftListeners = this.playerLeftListeners.filter((l) => l !== cb)
    }
  }

  public onRoomClosed(cb: (reason: string) => void): () => void {
    this.roomClosedListeners.push(cb)
    return () => {
      this.roomClosedListeners = this.roomClosedListeners.filter((l) => l !== cb)
    }
  }

  public onRollEvent(cb: (event: RollEvent) => void): () => void {
    this.rollEventListeners.push(cb)
    return () => {
      this.rollEventListeners = this.rollEventListeners.filter((l) => l !== cb)
    }
  }

  public onHostChange(cb: (newHostId: number | null, originalHostId?: number, actingHostId?: number | null) => void): () => void {
    this.hostChangeListeners.push(cb)
    return () => {
      this.hostChangeListeners = this.hostChangeListeners.filter((l) => l !== cb)
    }
  }

  private setStatus(status: ConnectionStatus, message = "") {
    this.status = status
    this.statusMessage = message
    this.statusListeners.forEach((l) => l(status, message))
  }

  private emitError(err: string) {
    this.errorListeners.forEach((l) => l(err))
  }

  private saveSession(roomCode: string, token: string, playerId: number, reconnectToken?: string, playerName?: string) {
    this.roomCode = roomCode
    this.sessionToken = token
    this.playerId = playerId
    if (playerName) {
      this.playerName = playerName
    }
    if (reconnectToken) {
      this.reconnectToken = reconnectToken
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("crownfall_mp_room", roomCode)
      sessionStorage.setItem("crownfall_mp_token", token)
      sessionStorage.setItem("crownfall_mp_pid", String(playerId))
      if (this.playerName) {
        sessionStorage.setItem("crownfall_mp_player_name", this.playerName)
        try {
          localStorage.setItem(`crownfall_name_${roomCode}`, this.playerName)
          localStorage.setItem("crownfall_last_player_name", this.playerName)
        } catch (_) {}
      }
      try {
        localStorage.setItem("crownfall_last_room_code", roomCode)
        if (token) {
          localStorage.setItem(`crownfall_session_${roomCode}`, token)
        }
      } catch (_) {}
      const rToken = this.reconnectToken
      if (rToken) {
        sessionStorage.setItem("crownfall_mp_reconnect_token", rToken)
        try {
          localStorage.setItem(`crownfall_reconnect_${roomCode}`, rToken)
          localStorage.setItem("crownfall_last_reconnect_token", rToken)
        } catch (_) {}
      }
    }
  }

  public clearSession() {
    this.disconnect()
    if (this.roomCode && typeof window !== "undefined") {
      try {
        localStorage.removeItem(`crownfall_reconnect_${this.roomCode}`)
      } catch (_) {}
    }
    this.roomCode = null
    this.sessionToken = null
    this.reconnectToken = null
    this.playerId = null
    this.latestSnapshot = null
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("crownfall_mp_room")
      sessionStorage.removeItem("crownfall_mp_token")
      sessionStorage.removeItem("crownfall_mp_reconnect_token")
      sessionStorage.removeItem("crownfall_mp_pid")
    }
  }

  /**
   * Proactively checks server availability. Handles Render free-tier cold starts
   * where the initial spin-up can take 45-60 seconds.
   */
  public async checkServerHealth(): Promise<boolean> {
    const wakingTimer = window.setTimeout(() => {
      if (this.status !== "connected") {
        this.setStatus(
          "waking",
          "Server waking up from sleep. This may take ~45–60 seconds, please wait...",
        )
      }
    }, 3500)

    try {
      const res = await fetch(`${this.httpBaseUrl}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
      window.clearTimeout(wakingTimer)
      if (res.ok) {
        if (this.status === "waking" || this.status === "disconnected") {
          this.setStatus("connected", "Server online")
        }
        return true
      }
      return false
    } catch {
      window.clearTimeout(wakingTimer)
      return false
    }
  }

  public async retryConnection(): Promise<void> {
    this.reconnectAttempts = 0
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.setStatus("connecting", "Checking server status...")
    const isUp = await this.checkServerHealth()
    if (!isUp) {
      this.setStatus(
        "waking",
        "Server waking up from sleep. Waiting for server container to initialize...",
      )
    }

    if (this.roomCode && this.sessionToken) {
      await this.reconnect()
    } else {
      this.connectWebSocket()
    }
  }

  public async createRoom(
    hostName: string,
    hostColor: string,
    rules: Partial<GameRules> = {},
    captchaToken?: string,
  ): Promise<{ roomCode: string; playerId: number; snapshot: MultiplayerRoomSnapshot }> {
    const wakingTimer = window.setTimeout(() => {
      this.setStatus(
        "waking",
        "Server waking up from sleep. This may take ~45–60 seconds, please wait...",
      )
    }, 4000)

    try {
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, hostColor, rules, clientId: this.clientId, captchaToken }),
      })
      window.clearTimeout(wakingTimer)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Failed to create room.")

      this.latestSnapshot = data.snapshot
      this.playerName = hostName
      this.saveSession(data.roomCode, data.sessionToken, data.playerId, data.reconnectToken, hostName)
      this.connectWebSocket()
      return { roomCode: data.roomCode, playerId: data.playerId, snapshot: data.snapshot }
    } catch (e: any) {
      window.clearTimeout(wakingTimer)
      if (e?.message && e.message.toLowerCase().includes("failed to fetch")) {
        this.setStatus(
          "waking",
          "Server waking up or unavailable. If waking from sleep, please allow 50 seconds and retry.",
        )
      } else {
        this.emitError(e.message || "Failed to create room.")
      }
      throw e
    }
  }

  public async requestJoinRoom(
    roomCode: string,
    playerName: string,
    playerColor?: string,
    captchaToken?: string,
  ): Promise<{
    status: "ACCEPTED" | "PENDING"
    roomCode: string
    requestId?: string
    playerId?: number
    snapshot?: MultiplayerRoomSnapshot
    message?: string
  }> {
    const wakingTimer = window.setTimeout(() => {
      this.setStatus(
        "waking",
        "Server waking up from sleep. This may take ~45–60 seconds, please wait...",
      )
    }, 4000)

    try {
      if (!this.reconnectToken && typeof window !== "undefined") {
        this.reconnectToken = localStorage.getItem(`crownfall_reconnect_${roomCode}`)
      }
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          playerName,
          playerColor,
          clientId: this.clientId,
          sessionToken: this.sessionToken,
          reconnectToken: this.reconnectToken,
          captchaToken,
        }),
      })
      window.clearTimeout(wakingTimer)
      const data = await res.json()
      if (!data.ok) {
        if (data.snapshot) {
          this.latestSnapshot = data.snapshot
          this.snapshotListeners.forEach((l) => l(data.snapshot))
        }
        throw new Error(data.error || "Failed to submit join request.")
      }

      if (data.status === "ACCEPTED") {
        this.latestSnapshot = data.snapshot
        this.playerName = playerName
        this.saveSession(data.roomCode, data.sessionToken, data.playerId, data.reconnectToken, playerName)
        this.connectWebSocket()
        return {
          status: "ACCEPTED",
          roomCode: data.roomCode,
          playerId: data.playerId,
          snapshot: data.snapshot,
        }
      }

      this.pendingJoinRequestId = data.requestId
      return {
        status: "PENDING",
        roomCode: data.roomCode,
        requestId: data.requestId,
        message: data.message || "Waiting for host approval.",
      }
    } catch (e: any) {
      window.clearTimeout(wakingTimer)
      if (e?.message && e.message.toLowerCase().includes("failed to fetch")) {
        this.setStatus(
          "waking",
          "Server waking up or unavailable. If waking from sleep, please allow 50 seconds and retry.",
        )
      } else {
        this.emitError(e.message || "Failed to join room.")
      }
      throw e
    }
  }

  public async pollJoinRequestStatus(
    roomCode: string,
    requestId: string,
  ): Promise<{
    status: "PENDING" | "ACCEPTED" | "REJECTED"
    playerId?: number
    sessionToken?: string
    reconnectToken?: string
    rejectReason?: string
    snapshot?: MultiplayerRoomSnapshot
  }> {
    try {
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/${roomCode}/join-status/${requestId}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (!data.ok) {
        return { status: "REJECTED", rejectReason: data.error || "Request not found or expired." }
      }

      if (data.status === "ACCEPTED" && data.sessionToken) {
        this.saveSession(roomCode, data.sessionToken, data.playerId, data.reconnectToken)
        if (data.snapshot) {
          this.latestSnapshot = data.snapshot
          this.snapshotListeners.forEach((l) => l(data.snapshot))
        }
        this.connectWebSocket()
      }
      return data
    } catch (_) {
      return { status: "PENDING" }
    }
  }

  public async fetchRoomSnapshot(roomCode?: string): Promise<MultiplayerRoomSnapshot | null> {
    const code = (roomCode || this.roomCode || "").trim().toUpperCase()
    if (!code) return null
    try {
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/${code}/state`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data?.ok && data?.snapshot) {
        this.latestSnapshot = data.snapshot
        this.snapshotListeners.forEach((l) => l(data.snapshot))
        return data.snapshot
      }
    } catch (_) {}
    return null
  }

  public async respondJoinRequest(
    requestId: string,
    decision: "ACCEPT" | "REJECT",
  ): Promise<any> {
    if (!this.roomCode || !this.sessionToken) {
      throw new Error("No active host session.")
    }

    try {
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/${this.roomCode}/join-request/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: this.sessionToken,
          requestId,
          decision,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Failed to process join request.")
      if (data.snapshot) {
        this.latestSnapshot = data.snapshot
        this.snapshotListeners.forEach((l) => l(data.snapshot))
      }
      return data
    } catch (err: any) {
      this.emitError(err.message || "Failed to respond to join request.")
      throw err
    }
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    playerColor?: string,
    captchaToken?: string,
  ): Promise<{ roomCode: string; playerId: number; snapshot: MultiplayerRoomSnapshot }> {
    const res = await this.requestJoinRoom(roomCode, playerName, playerColor, captchaToken)
    if (res.status === "ACCEPTED") {
      return { roomCode: res.roomCode, playerId: res.playerId!, snapshot: res.snapshot! }
    }
    throw new Error("Join request submitted. Waiting for host approval.")
  }

  public async reconnect(): Promise<MultiplayerRoomSnapshot | null> {
    if (typeof window !== "undefined") {
      if (!this.roomCode) {
        this.roomCode =
          sessionStorage.getItem("crownfall_mp_room") ||
          localStorage.getItem("crownfall_last_room_code")
      }
      if (!this.playerName) {
        this.playerName =
          sessionStorage.getItem("crownfall_mp_player_name") ||
          (this.roomCode ? localStorage.getItem(`crownfall_name_${this.roomCode}`) : null) ||
          localStorage.getItem("crownfall_last_player_name")
      }
      if (!this.reconnectToken && this.roomCode) {
        this.reconnectToken =
          localStorage.getItem(`crownfall_reconnect_${this.roomCode}`) ||
          sessionStorage.getItem("crownfall_mp_reconnect_token") ||
          localStorage.getItem("crownfall_last_reconnect_token")
      }
      if (!this.sessionToken) {
        this.sessionToken = sessionStorage.getItem("crownfall_mp_token")
      }
    }
    if (!this.roomCode) return null
    if (!this.sessionToken && !this.reconnectToken && !this.playerName) return null
    try {
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/reconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: this.roomCode,
          sessionToken: this.sessionToken,
          reconnectToken: this.reconnectToken,
          playerName: this.playerName || undefined,
          clientId: this.clientId,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        return null
      }
      this.playerId = data.playerId
      if (data.sessionToken) this.sessionToken = data.sessionToken
      if (data.reconnectToken) this.reconnectToken = data.reconnectToken
      this.saveSession(
        this.roomCode,
        this.sessionToken || data.sessionToken,
        data.playerId,
        this.reconnectToken || data.reconnectToken,
        this.playerName || undefined,
      )
      this.latestSnapshot = data.snapshot
      this.connectWebSocket()
      return data.snapshot
    } catch (_) {
      return null
    }
  }

  public connectWebSocket() {
    if (!this.roomCode) return
    if (!this.sessionToken && !this.reconnectToken) return
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.setStatus("connecting", "Connecting to game server...")
    try {
      let targetWsUrl = this.serverUrl
      if (this.reconnectAttempts >= 2 && this.serverUrl.includes(":8443")) {
        targetWsUrl = this.serverUrl.replace(":8443", ":8444")
      }
      this.ws = new WebSocket(targetWsUrl)

      this.ws.onopen = () => {
        this.setStatus("connected", "Connected to game room")
        this.reconnectAttempts = 0
        // Send handshake to identify player session
        this.ws?.send(
          JSON.stringify({
            type: "JOIN_WS",
            roomCode: this.roomCode,
            sessionToken: this.sessionToken,
            reconnectToken: this.reconnectToken,
            clientId: this.clientId,
          }),
        )

        // 25-second client keepalive ping to prevent proxy/firewall timeouts
        if (this.pingInterval !== null) {
          window.clearInterval(this.pingInterval)
        }
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "PING" }))
          }
        }, 25000)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          // Respond to server ping frames
          if (msg.type === "PING") {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: "PONG" }))
            }
            return
          }
          if (msg.type === "PONG") {
            return
          }

          // Authoritative player identity synchronization
          if (typeof msg.yourPlayerId === "number") {
            this.playerId = msg.yourPlayerId
            if (typeof window !== "undefined") {
              sessionStorage.setItem("crownfall_mp_pid", String(msg.yourPlayerId))
            }
          } else if (msg.type === "INIT_SNAPSHOT") {
            if (msg.player?.id !== undefined) {
              this.playerId = msg.player.id
              if (typeof window !== "undefined") {
                sessionStorage.setItem("crownfall_mp_pid", String(msg.player.id))
              }
            }
            if (msg.player?.sessionToken && typeof msg.player.sessionToken === "string") {
              this.sessionToken = msg.player.sessionToken
              if (typeof window !== "undefined") {
                sessionStorage.setItem("crownfall_mp_token", msg.player.sessionToken)
                if (this.roomCode) {
                  try {
                    localStorage.setItem(`crownfall_session_${this.roomCode}`, msg.player.sessionToken)
                  } catch (_) {}
                }
              }
            }
            const syncToken = msg.player?.reconnectToken
            if (syncToken && typeof syncToken === "string") {
              this.reconnectToken = syncToken
              if (this.roomCode && typeof window !== "undefined") {
                try {
                  localStorage.setItem(`crownfall_reconnect_${this.roomCode}`, syncToken)
                  localStorage.setItem("crownfall_last_reconnect_token", syncToken)
                } catch (_) {}
              }
            }
          }

          // Correlate with pending request
          if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
            const pending = this.pendingRequests.get(msg.requestId)!
            window.clearTimeout(pending.timer)
            this.pendingRequests.delete(msg.requestId)
            if (msg.type === "ACTION_ERROR" || msg.type === "ERROR") {
              const err: any = new Error(msg.message || "Action failed.")
              if (msg.reason) err.reason = msg.reason
              pending.reject(err)
            } else {
              pending.resolve(msg)
            }
          }

          if (msg.type === "ACTION_RESULT") {
            if (msg.action === "roll" && msg.actionResult) {
              const rollEvt: RollEvent = {
                rollId: msg.actionResult.rollId || `roll_${msg.sequence || Date.now()}_${msg.playerId}`,
                sequence: msg.sequence || 0,
                playerId: msg.playerId,
                dice1: msg.actionResult.dice1,
                dice2: msg.actionResult.dice2,
                diceTotal: msg.actionResult.diceTotal,
                isDouble: msg.actionResult.isDouble,
                previousPosition: msg.actionResult.previousPosition,
                newPosition: msg.actionResult.newPosition,
                spaceName: msg.actionResult.spaceName,
                actionResult: msg.actionResult,
                snapshot: msg.snapshot,
              }
              this.rollEventListeners.forEach((l) => l(rollEvt))
            }
          }

          if (
            msg.type === "INIT_SNAPSHOT" ||
            msg.type === "ACTION_RESULT" ||
            msg.type === "GAME_STARTED" ||
            msg.type === "RULES_UPDATED" ||
            msg.type === "PLAYER_UPDATED" ||
            msg.type === "PLAYER_JOINED" ||
            msg.type === "REMATCH_STARTED" ||
            msg.type === "PLAYER_LEFT" ||
            msg.type === "PLAYER_STATUS"
          ) {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
          } else if (msg.type === "HOST_CHANGED") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
            const resolvedHostId = msg.newHostId ?? msg.actingHostPlayerId ?? null
            this.hostChangeListeners.forEach((l) =>
              l(resolvedHostId, msg.originalHostPlayerId, msg.actingHostPlayerId)
            )
          } else if (msg.type === "JOIN_REQUEST") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
            if (msg.request) {
              this.joinRequestListeners.forEach((l) => l(msg.request))
            }
          } else if (msg.type === "JOIN_REQUEST_REJECTED") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
          } else if (msg.type === "JOIN_REQUEST_DECISION") {
            if (msg.status === "ACCEPTED" && msg.sessionToken) {
              this.saveSession(msg.roomCode || this.roomCode, msg.sessionToken, msg.playerId)
              if (msg.snapshot) {
                this.latestSnapshot = msg.snapshot
                this.snapshotListeners.forEach((l) => l(msg.snapshot))
              }
              this.connectWebSocket()
            }
            this.joinDecisionListeners.forEach((l) => l(msg.status, msg.reason, msg.playerId))
          } else if (msg.type === "REMATCH_STATE_CHANGED") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
            if (msg.rematchState) {
              this.rematchStateListeners.forEach((l) => l(msg.rematchState))
            }
          } else if (msg.type === "PLAYER_LEFT") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
            this.playerLeftListeners.forEach((l) => l(msg.playerId, msg.playerName, msg.newHostPlayerId))
          } else if (msg.type === "KICKED") {
            this.clearSession()
            this.setStatus(
              "disconnected",
              msg.reason || "You were kicked from the room by the host.",
            )
            this.kickedListeners.forEach((l) => l(msg.reason || "You were kicked from the room by the host."))
          } else if (msg.type === "SUPERSEDED") {
            this.clearSession()
            this.setStatus(
              "disconnected",
              msg.message || "Connected from another session or tab.",
            )
            this.kickedListeners.forEach((l) => l(msg.message || "Connected from another session or tab."))
          } else if (msg.type === "PLAYER_KICKED") {
            if (msg.snapshot) {
              this.latestSnapshot = msg.snapshot
              this.snapshotListeners.forEach((l) => l(msg.snapshot))
            }
            this.playerKickedListeners.forEach((l) =>
              l(msg.kickedPlayerId, msg.kickedPlayerName, msg.reason),
            )
          } else if (msg.type === "ROOM_CLOSED") {
            this.clearSession()
            this.setStatus(
              "disconnected",
              msg.reason || "Room has been closed by the server administrator.",
            )
            this.roomClosedListeners.forEach((l) => l(msg.reason || "Room closed by administrator."))
          } else if (msg.type === "LEFT_ROOM") {
            this.clearSession()
          } else if (msg.type === "ACTION_ERROR" || msg.type === "ERROR") {
            this.emitError(msg.message || "Server error.")
          } else if (msg.type === "SERVER_SHUTDOWN") {
            this.setStatus(
              "disconnected",
              "Server is restarting. Active rooms may have terminated per free tier sleep policy.",
            )
          }
        } catch (_) {}
      }

      this.ws.onclose = () => {
        if (this.pingInterval !== null) {
          window.clearInterval(this.pingInterval)
          this.pingInterval = null
        }
        for (const [id, req] of this.pendingRequests.entries()) {
          window.clearTimeout(req.timer)
          req.reject(new Error("WebSocket disconnected during request."))
        }
        this.pendingRequests.clear()
        this.setStatus("reconnecting", "Connection lost. Attempting to reconnect...")
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        if (this.pingInterval !== null) {
          window.clearInterval(this.pingInterval)
          this.pingInterval = null
        }
        this.setStatus("error", "WebSocket error encountered")
        this.ws?.close()
      }
    } catch (_) {
      this.setStatus("error", "Failed to initialize WebSocket")
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus(
        "disconnected",
        "Server unavailable. Cloud service may have spun down after inactivity. Click to retry.",
      )
      return
    }
    if (this.reconnectTimer !== null) return

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 12000)
    this.setStatus("reconnecting", `Reconnecting (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connectWebSocket()
    }, delay)
  }

  public disconnect() {
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch (_) {}
      this.ws = null
    }
    this.setStatus("disconnected", "Disconnected")
  }

  private sendHttp(msgType: string, payload: any = {}): Promise<any> {
    if (!this.roomCode) return Promise.reject(new Error("No active room."))
    const endpoint =
      msgType === "KICK_PLAYER" || msgType === "REMOVE_PLAYER" || payload.action === "kick"
        ? `${this.httpBaseUrl}/api/multiplayer/room/${this.roomCode}/kick`
        : `${this.httpBaseUrl}/api/multiplayer/room/${this.roomCode}/action`

    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: this.sessionToken || this.reconnectToken,
        reconnectToken: this.reconnectToken,
        action: payload.action || msgType.toLowerCase(),
        ...payload,
      }),
    }).then(async (res) => {
      const data = await res.json()
      if (!data.ok) {
        const err: any = new Error(data.error || "Action rejected.")
        if (data.reason) err.reason = data.reason
        throw err
      }
      if (data.actionResult && (payload.action === "roll" || data.action === "roll")) {
        const rollEvt: RollEvent = {
          rollId: data.actionResult.rollId || `roll_${data.sequence || Date.now()}_${data.playerId}`,
          sequence: data.sequence || 0,
          playerId: data.playerId ?? data.actionResult.playerId,
          dice1: data.actionResult.dice1,
          dice2: data.actionResult.dice2,
          diceTotal: data.actionResult.diceTotal,
          isDouble: data.actionResult.isDouble,
          previousPosition: data.actionResult.previousPosition,
          newPosition: data.actionResult.newPosition,
          spaceName: data.actionResult.spaceName,
          actionResult: data.actionResult,
          snapshot: data.snapshot,
        }
        this.rollEventListeners.forEach((l) => l(rollEvt))
      }
      if (data.snapshot) {
        this.latestSnapshot = data.snapshot
        this.snapshotListeners.forEach((l) => l(data.snapshot))
      }
      return data
    })
  }

  private sendWsOrHttp(msgType: string, payload: any = {}): Promise<any> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          this.pendingRequests.delete(requestId)
          // Fall back to HTTP if WebSocket message timed out after 5s
          this.sendHttp(msgType, payload).then(resolve).catch(reject)
        }, 5000)

        this.pendingRequests.set(requestId, { resolve, reject, timer })

        try {
          this.ws?.send(
            JSON.stringify({
              type: msgType,
              roomCode: this.roomCode,
              sessionToken: this.sessionToken || this.reconnectToken,
              reconnectToken: this.reconnectToken,
              requestId,
              payload,
            }),
          )
        } catch (err) {
          window.clearTimeout(timer)
          this.pendingRequests.delete(requestId)
          this.sendHttp(msgType, payload).then(resolve).catch(reject)
        }
      })
    }

    return this.sendHttp(msgType, payload)
  }

  public updateRules(newRules: Partial<GameRules>) {
    if (this.latestSnapshot) {
      this.latestSnapshot.rules = {
        ...this.latestSnapshot.rules,
        ...newRules,
      } as any
      if (this.latestSnapshot.gameState) {
        this.latestSnapshot.gameState.rules = {
          ...this.latestSnapshot.gameState.rules,
          ...newRules,
        } as any
      }
    }
    return this.sendWsOrHttp("UPDATE_RULES", newRules)
  }

  public updatePlayer(name?: string, color?: string) {
    return this.sendWsOrHttp("UPDATE_PLAYER", { name, color })
  }

  public startGame() {
    return this.sendWsOrHttp("START_GAME", {})
  }

  public roll(riggedDice?: [number, number]) {
    const payload: any = { action: "roll" }
    if (riggedDice) {
      payload.d1 = riggedDice[0]
      payload.d2 = riggedDice[1]
    }
    return this.sendWsOrHttp("ACTION", payload)
  }

  public buyProperty() {
    return this.sendWsOrHttp("ACTION", { action: "buy" })
  }

  public declineProperty() {
    return this.sendWsOrHttp("ACTION", { action: "decline" })
  }

  public endTurn() {
    return this.sendWsOrHttp("ACTION", { action: "endTurn" })
  }

  public mortgageProperty(propertyId: string) {
    return this.sendWsOrHttp("ACTION", { action: "mortgage", propertyId })
  }

  public unmortgageProperty(propertyId: string) {
    return this.sendWsOrHttp("ACTION", { action: "unmortgage", propertyId })
  }

  public buildBuilding(propertyId: string) {
    return this.sendWsOrHttp("ACTION", { action: "build", propertyId })
  }

  public sellBuilding(propertyId: string) {
    return this.sendWsOrHttp("ACTION", { action: "sell", propertyId })
  }

  public sellProperty(propertyId: string) {
    return this.sendWsOrHttp("ACTION", { action: "sellProperty", propertyId })
  }

  public resign() {
    return this.sendWsOrHttp("ACTION", { action: "resign" })
  }

  public signalRematchReady() {
    return this.sendWsOrHttp("REMATCH_READY", {})
  }

  public rematch() {
    return this.sendWsOrHttp("REMATCH", {})
  }

  public handleTimeout(playerId?: number) {
    return this.sendWsOrHttp("ACTION", { action: "timeout", playerId })
  }

  public async leaveRoom(): Promise<{ ok: boolean; message?: string }> {
    if (!this.roomCode) {
      this.clearSession()
      return { ok: true }
    }
    const currentCode = this.roomCode
    const currentToken = this.sessionToken
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "LEAVE_ROOM",
            roomCode: currentCode,
            sessionToken: currentToken,
          }),
        )
      }
      const res = await fetch(`${this.httpBaseUrl}/api/multiplayer/room/${currentCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: currentToken }),
      })
      const data = await res.json()
      this.clearSession()
      return data
    } catch (err: any) {
      this.clearSession()
      return { ok: true, message: err?.message }
    }
  }

  public createTradeOffer(
    receiverId: number,
    senderProps: string[],
    senderCash: number,
    receiverProps: string[],
    receiverCash: number,
  ) {
    return this.sendWsOrHttp("ACTION", {
      action: "tradeCreate",
      receiverId,
      senderProps,
      senderCash,
      receiverProps,
      receiverCash,
    })
  }

  public acceptTradeOffer(tradeId: string) {
    return this.sendWsOrHttp("ACTION", { action: "tradeAccept", tradeId })
  }

  public rejectTradeOffer(tradeId: string) {
    return this.sendWsOrHttp("ACTION", { action: "tradeReject", tradeId })
  }

  public cancelTradeOffer(tradeId: string) {
    return this.sendWsOrHttp("ACTION", { action: "tradeCancel", tradeId })
  }

  public async kickPlayer(targetPlayerId: number, reason = "Kicked by host"): Promise<{ ok: boolean; message?: string }> {
    if (!this.roomCode) return { ok: true }
    return this.sendWsOrHttp("KICK_PLAYER", { targetPlayerId, reason })
  }

  public async removePlayer(targetPlayerId: number): Promise<{ ok: boolean; message?: string }> {
    return this.kickPlayer(targetPlayerId, "Removed from lobby by host")
  }
}

export const multiplayerClient = new MultiplayerClient()
export default multiplayerClient

