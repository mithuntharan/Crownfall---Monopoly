import type {
  IGameEngine,
  GameRules,
  GameState,
  TurnResult,
  PlayerSetup,
} from "./GameEngineInterface"

export class CppEngineClient implements IGameEngine {
  private baseUrl = "/api/engine"

  async isCppConnected(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/status`)
      if (!res.ok) return false
      const data = await res.json()
      return !!data.connected
    } catch {
      return false
    }
  }

  async startGame(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startingMoney: rules?.defaultStartingMoney ?? 25000,
        doubles: rules?.doublesRuleEnabled ?? true,
        timerEnabled: rules?.timerEnabled ?? false,
        timerSeconds: rules?.timerSeconds ?? 60,
        devMode: rules?.devMode ?? false,
        playerCount: playerConfigs?.length ?? 4,
        playerName: playerConfigs?.[0]?.name ?? "Player 1",
        p1Name: playerConfigs?.[0]?.name ?? "Player 1",
        p2Name: playerConfigs?.[1]?.name ?? "Player 2",
        p3Name: playerConfigs?.[2]?.name ?? "Player 3",
        p4Name: playerConfigs?.[3]?.name ?? "Player 4",
        p5Name: playerConfigs?.[4]?.name ?? "Player 5",
        p6Name: playerConfigs?.[5]?.name ?? "Player 6",
        p1Color: playerConfigs?.[0]?.color ?? "saffron",
        p2Color: playerConfigs?.[1]?.color ?? "teal",
        p3Color: playerConfigs?.[2]?.color ?? "plum",
        p4Color: playerConfigs?.[3]?.color ?? "blue",
        p5Color: playerConfigs?.[4]?.color ?? "gold",
        p6Color: playerConfigs?.[5]?.color ?? "purple",
        inLobby: false,
        startGame: true,
      }),
    })
    const data = await res.json()
    return data.state
  }

  async resetToLobby(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/resetToLobby`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startingMoney: rules?.defaultStartingMoney ?? 25000,
        doubles: rules?.doublesRuleEnabled ?? true,
        timerEnabled: rules?.timerEnabled ?? false,
        timerSeconds: rules?.timerSeconds ?? 60,
        playerCount: playerConfigs?.length ?? 4,
        inLobby: true,
        startGame: false,
      }),
    })
    const data = await res.json()
    return data.state
  }

  async updateRules(
    rules: Partial<GameRules>,
    requesterId: number = 0,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/updateRules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterId,
        startingMoney: rules.defaultStartingMoney,
        doubles: rules.doublesRuleEnabled,
        timerEnabled: rules.timerEnabled,
        timerSeconds: rules.timerSeconds,
        maxPlayers: rules.maxPlayers,
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      return { success: false, state: data.state, error: data.error }
    }
    return { success: true, state: data.state }
  }

  async rollAndMove(riggedDice?: [number, number], playerId?: number): Promise<{
    result: TurnResult
    state: GameState
  }> {
    const body: Record<string, any> = {}
    if (riggedDice) {
      body.d1 = riggedDice[0]
      body.d2 = riggedDice[1]
    }
    if (typeof playerId === "number") {
      body.playerId = playerId
    }
    const res = await fetch(`${this.baseUrl}/roll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return { result: data.result, state: data.state }
  }

  async buyCurrentProperty(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async declinePropertyPurchase(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async endTurn(playerId: number): Promise<{ state: GameState }> {
    const res = await fetch(`${this.baseUrl}/endTurn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return { state: data.state }
  }

  async buildHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, propertyId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async sellHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, propertyId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async mortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/mortgage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, propertyId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async unmortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    const res = await fetch(`${this.baseUrl}/unmortgage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, propertyId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async getState(): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/state`)
    const data = await res.json()
    return data.state
  }

  async setDevMode(enabled: boolean, requesterId: number = 0): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/setDevMode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, requesterId }),
    })
    const data = await res.json()
    return data.state
  }

  async setActivePlayerIndex(playerId: number): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/setActivePlayer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return data.state
  }

  async setTimerConfig(enabled: boolean, seconds: number): Promise<GameState> {
    const res = await fetch(`${this.baseUrl}/setTimer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, seconds }),
    })
    const data = await res.json()
    return data.state
  }

  async handleTimeout(playerId?: number): Promise<{ success: boolean; state: GameState }> {
    const body: Record<string, any> = {}
    if (typeof playerId === "number") body.playerId = playerId
    const res = await fetch(`${this.baseUrl}/timeout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async createTradeOffer(
    senderId: number,
    receiverId: number,
    senderPropertyIds: string[],
    senderCash: number,
    receiverPropertyIds: string[],
    receiverCash: number,
  ): Promise<{ success: boolean; tradeId?: string; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/tradeCreate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId,
        receiverId,
        senderPropertyIds,
        senderCash,
        receiverPropertyIds,
        receiverCash,
      }),
    })
    const data = await res.json()
    return {
      success: !!data.ok,
      tradeId: data.tradeId,
      state: data.state,
      error: data.error,
    }
  }

  async acceptTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/tradeAccept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }

  async rejectTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/tradeReject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }

  async cancelTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/tradeCancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }

  async endSession(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/endSession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }

  async resignPlayer(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/resign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }

  async updatePlayerName(
    playerId: number,
    newName: string,
  ): Promise<{ success: boolean; state: GameState }> {
    const res = await fetch(`${this.baseUrl}/updatePlayerName`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, newName }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state }
  }

  async updatePlayerColor(
    playerId: number,
    newColor: string,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const res = await fetch(`${this.baseUrl}/updatePlayerColor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, newColor, color: newColor }),
    })
    const data = await res.json()
    return { success: !!data.ok, state: data.state, error: data.error }
  }
}
