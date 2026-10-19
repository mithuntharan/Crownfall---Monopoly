import type {
  IGameEngine,
  GameRules,
  GameState,
  TurnResult,
  PlayerSetup,
} from "./GameEngineInterface"
import { CppEngineClient } from "./CppEngineClient"
import { LocalGameEngine } from "./LocalGameEngine"
import { multiplayerClient } from "./MultiplayerClient"
import { multiplayerEngineAdapter } from "./MultiplayerEngineAdapter"

export class EngineManager implements IGameEngine {
  private cppClient: CppEngineClient
  private localEngine: LocalGameEngine
  private useCpp = false
  private hasCheckedConnection = false

  constructor() {
    this.cppClient = new CppEngineClient()
    this.localEngine = new LocalGameEngine()
  }

  async isCppConnected(): Promise<boolean> {
    if (multiplayerClient.getRoomCode()) {
      return multiplayerEngineAdapter.isCppConnected()
    }
    try {
      const connected = await this.cppClient.isCppConnected()
      this.useCpp = connected
      this.hasCheckedConnection = true
      return connected
    } catch {
      this.useCpp = false
      this.hasCheckedConnection = true
      return false
    }
  }

  getEngineName(): string {
    if (multiplayerClient.getRoomCode()) {
      return multiplayerEngineAdapter.getEngineName()
    }
    return this.useCpp
      ? "C++ Native Engine (Authoritative)"
      : "Local TypeScript Engine (Authoritative)"
  }

  isUsingCpp(): boolean {
    if (multiplayerClient.getRoomCode()) {
      return true
    }
    return this.useCpp
  }

  private async getActiveEngine(): Promise<IGameEngine> {
    if (multiplayerClient.getRoomCode()) {
      return multiplayerEngineAdapter
    }
    if (!this.hasCheckedConnection) {
      await this.isCppConnected()
    }
    return this.useCpp ? this.cppClient : this.localEngine
  }

  async startGame(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    await this.isCppConnected()
    const engine = await this.getActiveEngine()
    return engine.startGame(rules, playerConfigs)
  }

  async resetToLobby(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    await this.isCppConnected()
    const engine = await this.getActiveEngine()
    if (engine.resetToLobby) {
      return engine.resetToLobby(rules, playerConfigs)
    }
    return engine.getState()
  }

  async updateRules(
    rules: Partial<GameRules>,
    requesterId: number = 0,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.updateRules) {
      return engine.updateRules(rules, requesterId)
    }
    return { success: false, state: await engine.getState(), error: "updateRules not supported" }
  }

  async rollAndMove(
    riggedDice?: [number, number],
    playerId?: number,
  ): Promise<{
    result: TurnResult
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.rollAndMove(riggedDice, playerId)
  }

  async buyCurrentProperty(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.buyCurrentProperty(playerId)
  }

  async declinePropertyPurchase(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.declinePropertyPurchase(playerId)
  }

  async endTurn(playerId: number): Promise<{ state: GameState }> {
    const engine = await this.getActiveEngine()
    return engine.endTurn(playerId)
  }

  async buildHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.buildHouseOrHotel(playerId, propertyId)
  }

  async sellHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.sellHouseOrHotel(playerId, propertyId)
  }

  async mortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.mortgageProperty(playerId, propertyId)
  }

  async unmortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    return engine.unmortgageProperty(playerId, propertyId)
  }

  async sellProperty(
    playerId: number,
    propertyId: string,
  ): Promise<{
    success: boolean
    state: GameState
    sellPrice?: number
    error?: string
  }> {
    const engine = await this.getActiveEngine()
    if (engine.sellProperty) {
      return engine.sellProperty(playerId, propertyId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "sellProperty not supported on active engine" }
  }

  async getState(): Promise<GameState> {
    const engine = await this.getActiveEngine()
    return engine.getState()
  }

  async setDevMode(enabled: boolean, requesterId?: number): Promise<GameState> {
    const engine = await this.getActiveEngine()
    if (engine.setDevMode) {
      return engine.setDevMode(enabled, requesterId)
    }
    const state = await engine.getState()
    return { ...state, devMode: enabled }
  }

  async setActivePlayerIndex(playerId: number): Promise<GameState> {
    const engine = await this.getActiveEngine()
    if (engine.setActivePlayerIndex) {
      return engine.setActivePlayerIndex(playerId)
    }
    return engine.getState()
  }

  async setTimerConfig(enabled: boolean, seconds: number): Promise<GameState> {
    const engine = await this.getActiveEngine()
    if (engine.setTimerConfig) {
      return engine.setTimerConfig(enabled, seconds)
    }
    return engine.getState()
  }

  async handleTimeout(playerId?: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const engine = await this.getActiveEngine()
    if (engine.handleTimeout) {
      return engine.handleTimeout(playerId)
    }
    const state = await engine.getState()
    return { success: false, state }
  }

  async createTradeOffer(
    senderId: number,
    receiverId: number,
    senderPropertyIds: string[],
    senderCash: number,
    receiverPropertyIds: string[],
    receiverCash: number,
  ): Promise<{ success: boolean; tradeId?: string; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.createTradeOffer) {
      return engine.createTradeOffer(
        senderId,
        receiverId,
        senderPropertyIds,
        senderCash,
        receiverPropertyIds,
        receiverCash,
      )
    }
    const state = await engine.getState()
    return { success: false, state, error: "createTradeOffer unsupported" }
  }

  async acceptTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.acceptTradeOffer) {
      return engine.acceptTradeOffer(tradeId, playerId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "acceptTradeOffer unsupported" }
  }

  async rejectTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.rejectTradeOffer) {
      return engine.rejectTradeOffer(tradeId, playerId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "rejectTradeOffer unsupported" }
  }

  async cancelTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.cancelTradeOffer) {
      return engine.cancelTradeOffer(tradeId, playerId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "cancelTradeOffer unsupported" }
  }

  async endSession(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.endSession) {
      return engine.endSession(playerId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "endSession unsupported" }
  }

  async resignPlayer(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.resignPlayer) {
      return engine.resignPlayer(playerId)
    }
    const state = await engine.getState()
    return { success: false, state, error: "resignPlayer unsupported" }
  }

  async updatePlayerName(
    playerId: number,
    newName: string,
  ): Promise<{ success: boolean; state: GameState }> {
    const engine = await this.getActiveEngine()
    if (engine.updatePlayerName) {
      return engine.updatePlayerName(playerId, newName)
    }
    const state = await engine.getState()
    return { success: true, state }
  }

  async updatePlayerColor(
    playerId: number,
    newColor: string,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const engine = await this.getActiveEngine()
    if (engine.updatePlayerColor) {
      return engine.updatePlayerColor(playerId, newColor)
    }
    const state = await engine.getState()
    return { success: true, state }
  }
}

export const defaultEngine = new EngineManager()
