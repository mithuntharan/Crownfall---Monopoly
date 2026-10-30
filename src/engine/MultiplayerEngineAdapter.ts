import type {
  IGameEngine,
  GameRules,
  GameState,
  TurnResult,
  PlayerSetup,
} from "./GameEngineInterface"
import { multiplayerClient } from "./MultiplayerClient"

/**
 * MultiplayerEngineAdapter
 * Adapts IGameEngine calls to the authoritative online C++ Multiplayer Server.
 * All state mutations are validated on the server's C++ engine and broadcast to connected clients.
 */
export class MultiplayerEngineAdapter implements IGameEngine {
  async isCppConnected(): Promise<boolean> {
    const status = multiplayerClient.getStatus()
    return status === "connected" || status === "connecting"
  }

  getEngineName(): string {
    return "Authoritative C++ Multiplayer Engine"
  }

  private getFallbackState(): GameState {
    const snap = multiplayerClient.getLatestSnapshot()
    if (snap?.gameState) {
      if (snap.rules) {
        snap.gameState.rules = {
          ...snap.gameState.rules,
          ...snap.rules,
        }
      }
      return snap.gameState
    }

    return {
      roundNumber: 1,
      activePlayerIndex: 0,
      turnState: "WAITING_FOR_ROLL",
      gameStarted: snap?.gamePhase === "IN_PROGRESS",
      gamePhase: snap?.gamePhase || "LOBBY",
      settingsLocked: snap?.settingsLocked ?? false,
      consecutiveDoubles: 0,
      turnTimer: undefined,
      activityLog: [],
      transactionLedger: [],
      tradeOffers: [],
      rules: snap?.rules,
      currentTurnId: snap?.gameState?.currentTurnId ?? 1,
      turnPurchasedProperties: snap?.gameState?.turnPurchasedProperties ?? [],
      turnBuildingsBuilt: snap?.gameState?.turnBuildingsBuilt ?? [],
      activeLanding: snap?.gameState?.activeLanding,
      players: (snap?.players || []).map((p, idx) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        token: p.token || String(idx + 1),
        isHuman: p.isHuman,
        money: p.money,
        position: p.position,
        rotationsCompleted: p.rotationsCompleted,
        inJail: p.inJail,
        jailTurns: p.jailTurns,
        inRestHouse: p.inRestHouse,
        restHouseTurns: (p as any).restHouseTurns ?? 0,
        cardJailSkip: (p as any).cardJailSkip ?? false,
        cardJailSkipTurns: (p as any).cardJailSkipTurns ?? 0,
        isBankrupt: p.isBankrupt,
        ownedProperties: p.ownedProperties,
        buildings: p.buildings,
        mortgages: p.mortgages,
        isHost: p.isHost,
        isOriginalHost: p.isOriginalHost,
        joinOrder: p.joinOrder,
        connected: p.connected,
        isLeft: p.isLeft,
      })),
    }
  }

  async getState(): Promise<GameState> {
    return this.getFallbackState()
  }

  async startGame(
    _rules?: GameRules,
    _playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    await multiplayerClient.startGame()
    return this.getFallbackState()
  }

  async resetToLobby(
    _rules?: GameRules,
    _playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    await multiplayerClient.rematch()
    return this.getFallbackState()
  }

  async updateRules(
    rules: Partial<GameRules>,
    _requesterId: number = 0,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.updateRules(rules)
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async rollAndMove(
    riggedDice?: [number, number],
    _playerId?: number,
  ): Promise<{ result: TurnResult; state: GameState }> {
    const res = await multiplayerClient.roll(riggedDice)
    if (!res || !res.actionResult) {
      throw new Error((res && (res as any).error) || "Failed to receive authoritative dice roll from server.")
    }
    const result: TurnResult = res.actionResult
    const state = res.snapshot?.gameState || this.getFallbackState()
    return { result, state }
  }

  async buyCurrentProperty(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.buyProperty()
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Purchase failed." }
    }
  }

  async declinePropertyPurchase(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.declineProperty()
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Decline failed." }
    }
  }

  async endTurn(_playerId: number): Promise<{ state: GameState }> {
    try {
      const res = await multiplayerClient.endTurn()
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { state }
    } catch (_) {
      return { state: this.getFallbackState() }
    }
  }

  async buildHouseOrHotel(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState; error?: string; reason?: string }> {
    try {
      const res = await multiplayerClient.buildBuilding(propertyId)
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error, reason: res?.reason }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Building request rejected.", reason: err?.reason }
    }
  }

  async sellHouseOrHotel(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.sellBuilding(propertyId)
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Sell request rejected." }
    }
  }

  async mortgageProperty(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.mortgageProperty(propertyId)
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Mortgage request rejected." }
    }
  }

  async unmortgageProperty(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.unmortgageProperty(propertyId)
      const success = Boolean(res?.ok ?? res?.success ?? (res?.type === "ACTION_RESULT"))
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success, state, error: res?.error }
    } catch (err: any) {
      return { success: false, state: this.getFallbackState(), error: err?.message || "Unmortgage request rejected." }
    }
  }

  async sellProperty(
    playerId: number,
    propertyId: string,
  ): Promise<{ success: boolean; state: GameState; sellPrice?: number; error?: string }> {
    try {
      const res = await (multiplayerClient as any).sendWsOrHttp?.("ACTION", {
        action: "sellProperty",
        propertyId,
        playerId,
      })
      if (!res || res.ok === false || res.type === "ACTION_ERROR" || res.type === "ERROR") {
        return {
          success: false,
          state: await this.getState(),
          error: res?.message || res?.error || "Failed to sell property.",
        }
      }
      const state = res?.snapshot?.gameState || (await this.getState())
      const sellPrice = typeof res?.sellPrice === "number" ? res.sellPrice : undefined
      return { success: true, state, sellPrice }
    } catch (e: any) {
      return { success: false, state: await this.getState(), error: e?.message }
    }
  }

  async endSession(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.resign()
      const state = res?.snapshot?.gameState || multiplayerClient.getLatestSnapshot()?.gameState || this.getFallbackState()
      return { success: true, state }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async resignPlayer(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.resign()
      const state = res?.snapshot?.gameState || multiplayerClient.getLatestSnapshot()?.gameState || this.getFallbackState()
      return { success: true, state }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async createTradeOffer(
    _senderId: number,
    receiverId: number,
    senderPropertyIds: string[],
    senderCash: number,
    receiverPropertyIds: string[],
    receiverCash: number,
  ): Promise<{ success: boolean; tradeId?: string; state: GameState; error?: string }> {
    try {
      const res = await multiplayerClient.createTradeOffer(
        receiverId,
        senderPropertyIds,
        senderCash,
        receiverPropertyIds,
        receiverCash,
      )
      return { success: true, tradeId: res?.tradeId, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async acceptTradeOffer(
    tradeId: string,
    _playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.acceptTradeOffer(tradeId)
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async rejectTradeOffer(
    tradeId: string,
    _playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.rejectTradeOffer(tradeId)
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async cancelTradeOffer(
    tradeId: string,
    _playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.cancelTradeOffer(tradeId)
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async updatePlayerName(
    _playerId: number,
    newName: string,
  ): Promise<{ success: boolean; state: GameState }> {
    try {
      await multiplayerClient.updatePlayer(newName, undefined)
      return { success: true, state: this.getFallbackState() }
    } catch (_) {
      return { success: false, state: this.getFallbackState() }
    }
  }

  async updatePlayerColor(
    _playerId: number,
    newColor: string,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.updatePlayer(undefined, newColor)
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async handleTimeout(playerId?: number): Promise<{ success: boolean; state: GameState }> {
    try {
      const res = await (multiplayerClient as any).handleTimeout(playerId)
      const state = res?.snapshot?.gameState || this.getFallbackState()
      return { success: true, state }
    } catch (_) {
      return { success: false, state: this.getFallbackState() }
    }
  }
}

export const multiplayerEngineAdapter = new MultiplayerEngineAdapter()
