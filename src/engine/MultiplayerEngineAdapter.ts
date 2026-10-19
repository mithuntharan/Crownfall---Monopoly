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
    if (snap?.gameState) return snap.gameState

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
        isBankrupt: p.isBankrupt,
        ownedProperties: p.ownedProperties,
        buildings: p.buildings,
        mortgages: p.mortgages,
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

  async buyCurrentProperty(_playerId: number): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.buyProperty()
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async declinePropertyPurchase(_playerId: number): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.declineProperty()
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async endTurn(_playerId: number): Promise<{ state: GameState }> {
    const res = await multiplayerClient.endTurn()
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { state }
  }

  async buildHouseOrHotel(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.buildBuilding(propertyId)
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async sellHouseOrHotel(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.sellBuilding(propertyId)
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async mortgageProperty(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.mortgageProperty(propertyId)
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async unmortgageProperty(_playerId: number, propertyId: string): Promise<{ success: boolean; state: GameState }> {
    const res = await multiplayerClient.unmortgageProperty(propertyId)
    const state = res?.snapshot?.gameState || this.getFallbackState()
    return { success: true, state }
  }

  async endSession(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.resign()
      return { success: true, state: this.getFallbackState() }
    } catch (e: any) {
      return { success: false, state: this.getFallbackState(), error: e?.message }
    }
  }

  async resignPlayer(_playerId: number): Promise<{ success: boolean; state: GameState; error?: string }> {
    try {
      await multiplayerClient.resign()
      return { success: true, state: this.getFallbackState() }
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
}

export const multiplayerEngineAdapter = new MultiplayerEngineAdapter()
