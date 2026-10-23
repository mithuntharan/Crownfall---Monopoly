/**
 * Crownfall - Authoritative Game Engine Interface
 * Perfectly mirrors C++ Types.h and GameEngine.h
 */

export type ColorGroup = "GREEN" | "YELLOW" | "RED" | "BLUE" | "NONE"
export type SpaceType = "corner" | "city" | "special" | "chance" | "chest" | "tax"

export type TurnState = "WAITING_FOR_ROLL" | "ROLLING" | "MOVING" | "RESOLVING_LANDING" | "WAITING_FOR_ACTION" | "EXTRA_TURN" | "TURN_COMPLETE" | "GAME_OVER"

export interface EnginePlayer {
  id: number
  name: string
  color: string
  token: string
  isHuman?: boolean
  money: number
  position: number
  rotationsCompleted: number
  inJail: boolean
  jailTurns?: number
  inRestHouse: boolean
  isBankrupt?: boolean
  ownedProperties: string[]
  buildings: Record<string, number>
  mortgages: Record<string, boolean>
  // Live player statistics (Feature 3)
  totalRentReceived?: number
  totalRentPaid?: number
  constructionCount?: number
  destructionCount?: number
  netWorth?: number
  connected?: boolean
  isLeft?: boolean
  isHost?: boolean
}

export interface TurnResult {
  playerId: number
  dice1: number
  dice2: number
  diceTotal: number
  isDouble: boolean
  extraTurnGranted?: boolean
  previousPosition: number
  newPosition: number
  spaceName: string
  spaceType: SpaceType
  eventDescription: string
  moneyChange: number
  passStartBonusAwarded: boolean
  startingCapitalAwarded: boolean
  mustGoToJail: boolean
  mustGoToRestHouse: boolean
  eligibleToBuy: boolean
  purchasablePropertyId: string
  purchasePrice: number
  rentPaid: boolean
  rentAmount: number
  rentRecipientId: number // -1 or 0+
  sequence?: number
  rollId?: string
}

export interface ActivityLogEntry {
  id: number
  timestamp: number
  playerId: number
  playerName: string
  playerColor: string
  type: string
  description: string
  amount: number
}

// Authoritative Financial Transaction Ledger Entry (Feature 2)
export interface TransactionRecord {
  id: string
  turnNumber: number
  timestamp: number
  type: string
  description: string
  amount: number
  primaryPlayerId: number
  primaryPlayerName: string
  counterpartyPlayerId: number
  counterpartyPlayerName: string
  propertyId: string
  resultingBalances: Record<string, number>
}

export interface TurnTimerState {
  enabled: boolean
  duration: number
  durationSeconds: number
  startedAt: number
  remaining: number
  remainingSeconds: number
}

export interface GameRules {
  minPlayers?: number
  maxPlayers?: number
  playerCount?: number
  defaultStartingMoney?: number // 25000, 30000, 35000, 40000, 45000, 50000, 55000
  startingMoneyOptions?: number[]
  doublesRuleEnabled?: boolean
  passStartBonus?: number // 1500
  requireLandingToBuild?: boolean
  baseRentDoublesForSet?: boolean
  unmortgageInterestRatePercent?: number
  buildingRefundPercentage?: number
  timerEnabled?: boolean
  timerSeconds?: number
  devMode?: boolean
}

export interface TradeOffer {
  id: string
  senderId: number
  senderName: string
  receiverId: number
  receiverName: string
  senderPropertyIds: string[]
  senderCash: number
  receiverPropertyIds: string[]
  receiverCash: number
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "INVALIDATED"
  timestamp: number
}

export type GamePhase = "LOBBY" | "IN_PROGRESS" | "GAME_OVER"

export interface GameState {
  roundNumber: number
  activePlayerIndex: number
  turnState: TurnState
  gameStarted: boolean
  gamePhase?: GamePhase
  settingsLocked?: boolean
  consecutiveDoubles?: number
  devMode?: boolean
  lastDice?: [number, number]
  turnTimer?: TurnTimerState
  activityLog?: ActivityLogEntry[]
  transactionLedger?: TransactionRecord[]
  tradeOffers?: TradeOffer[]
  rules?: GameRules
  players: EnginePlayer[]
}

export interface PlayerSetup {
  name: string
  color: string
  token: string
}

export interface IGameEngine {
  isCppConnected(): Promise<boolean>
  startGame(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
    requesterId?: number,
  ): Promise<GameState>
  resetToLobby?(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState>
  updateRules?(
    rules: Partial<GameRules>,
    requesterId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  rollAndMove(riggedDice?: [number, number], playerId?: number): Promise<{
    result: TurnResult
    state: GameState
  }>
  buyCurrentProperty(playerId: number): Promise<{
    success: boolean
    state: GameState
  }>
  declinePropertyPurchase(playerId: number): Promise<{
    success: boolean
    state: GameState
  }>
  endTurn(playerId: number): Promise<{ state: GameState }>
  buildHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }>
  sellHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }>
  mortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }>
  unmortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }>
  sellProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
    sellPrice?: number
    error?: string
  }>
  createTradeOffer?(
    senderId: number,
    receiverId: number,
    senderPropertyIds: string[],
    senderCash: number,
    receiverPropertyIds: string[],
    receiverCash: number,
  ): Promise<{ success: boolean; tradeId?: string; state: GameState; error?: string }>
  acceptTradeOffer?(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  rejectTradeOffer?(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  cancelTradeOffer?(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  endSession?(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  resignPlayer?(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
  getState(): Promise<GameState>
  setDevMode?(enabled: boolean, requesterId?: number): Promise<GameState>
  setActivePlayerIndex?(playerId: number): Promise<GameState>
  setTimerConfig?(enabled: boolean, seconds: number): Promise<GameState>
  handleTimeout?(playerId?: number): Promise<{ success: boolean; state: GameState }>
  updatePlayerName?(playerId: number, newName: string): Promise<{ success: boolean; state: GameState }>
  updatePlayerColor?(
    playerId: number,
    newColor: string,
  ): Promise<{ success: boolean; state: GameState; error?: string }>
}
