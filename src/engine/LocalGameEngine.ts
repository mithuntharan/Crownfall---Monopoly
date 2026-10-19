import {
  BOARD_SPACES,
  CITY_PROPERTIES,
  SPECIAL_PROPERTIES,
  COLOR_GROUPS,
  CHANCE_DECLARATIONS,
  CHEST_DECLARATIONS,
  type ColorGroup,
} from "../data/businessData"
import type {
  IGameEngine,
  GameRules,
  GameState,
  TurnResult,
  EnginePlayer,
  PlayerSetup,
  ActivityLogEntry,
  TransactionRecord,
  TurnTimerState,
  TradeOffer,
} from "./GameEngineInterface"

export class LocalGameEngine implements IGameEngine {
  private rules: Required<GameRules>
  private players: EnginePlayer[] = []
  private activePlayerIndex = 0
  private roundNumber = 1
  private consecutiveDoubles = 0
  private gameStarted = false
  private gamePhase: "LOBBY" | "IN_PROGRESS" | "GAME_OVER" = "LOBBY"
  private settingsLocked = false
  private turnState: GameState["turnState"] = "WAITING_FOR_ROLL"
  private devMode = false
  private activityLog: ActivityLogEntry[] = []
  private transactionLedger: TransactionRecord[] = []
  private tradeOffers: TradeOffer[] = []
  private nextTradeId = 1
  private timerEnabled = false
  private timerSeconds = 60
  private turnStartedAt = Date.now()
  private logIdCounter = 1
  private txIdCounter = 1
  private lastDice: [number, number] = [0, 0]
  private lastTurnResult: TurnResult | null = null

  private recordTransaction(
    type: string,
    description: string,
    amount: number,
    primaryPlayerId: number,
    counterpartyPlayerId = -1,
    propertyId = "",
  ) {
    const primary = this.players[primaryPlayerId]
    const counterparty = this.players[counterpartyPlayerId]
    const resultingBalances: Record<string, number> = {}
    for (const p of this.players) {
      resultingBalances[p.id] = p.money
    }
    this.transactionLedger.push({
      id: `tx_${this.txIdCounter++}`,
      turnNumber: this.roundNumber,
      timestamp: Date.now(),
      type,
      description,
      amount,
      primaryPlayerId,
      primaryPlayerName: primary ? primary.name : "The Bank",
      counterpartyPlayerId,
      counterpartyPlayerName: counterparty ? counterparty.name : "The Bank",
      propertyId,
      resultingBalances,
    })
    if (this.transactionLedger.length > 250) this.transactionLedger.shift()
  }

  private calculatePlayerNetWorth(playerId: number): number {
    const p = this.players[playerId]
    if (!p || p.isBankrupt) return 0
    let total = p.money
    for (const propId of p.ownedProperties) {
      const city = CITY_PROPERTIES[propId]
      if (city) {
        total += city.purchasePrice
        const b = p.buildings[propId] || 0
        if (b > 0) total += b * city.buildingCost
        if (p.mortgages[propId]) {
          const repayment =
            Math.ceil(
              (city.mortgageValue +
                (city.mortgageValue *
                  (this.rules.unmortgageInterestRatePercent || 10)) /
                  100) /
                100,
            ) * 100
          total -= repayment
        }
      } else {
        const sp = SPECIAL_PROPERTIES[propId]
        if (sp) {
          total += sp.purchasePrice
          if (p.mortgages[propId]) {
            const repayment =
              Math.ceil(
                (sp.mortgageValue +
                  (sp.mortgageValue *
                    (this.rules.unmortgageInterestRatePercent || 10)) /
                    100) /
                  100,
              ) * 100
            total -= repayment
          }
        }
      }
    }
    return total
  }

  constructor(rules: GameRules = {}) {
    this.rules = {
      minPlayers: rules.minPlayers ?? 2,
      maxPlayers: rules.maxPlayers ?? 6,
      playerCount: rules.playerCount ?? 4,
      defaultStartingMoney: rules.defaultStartingMoney ?? 25000,
      startingMoneyOptions: rules.startingMoneyOptions ?? [20000, 25000, 30000],
      doublesRuleEnabled: rules.doublesRuleEnabled ?? true,
      passStartBonus: rules.passStartBonus ?? 1500,
      requireLandingToBuild: rules.requireLandingToBuild ?? false, // New rule: anywhere building
      baseRentDoublesForSet: rules.baseRentDoublesForSet ?? true,
      unmortgageInterestRatePercent: rules.unmortgageInterestRatePercent ?? 10,
      buildingRefundPercentage: rules.buildingRefundPercentage ?? 50,
      timerEnabled: rules.timerEnabled ?? false,
      timerSeconds: rules.timerSeconds ?? 60,
      devMode: rules.devMode ?? false,
    }
    this.timerEnabled = this.rules.timerEnabled
    this.timerSeconds = this.rules.timerSeconds
    this.devMode = this.rules.devMode
    this.players = [
      { id: 0, name: "Player 1", color: "saffron", token: "1", isHuman: true, money: 0, position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, isBankrupt: false, ownedProperties: [], buildings: {}, mortgages: {}, totalRentReceived: 0, totalRentPaid: 0, constructionCount: 0, destructionCount: 0 },
      { id: 1, name: "Player 2", color: "teal", token: "2", isHuman: true, money: 0, position: 0, rotationsCompleted: 0, inJail: false, jailTurns: 0, inRestHouse: false, isBankrupt: false, ownedProperties: [], buildings: {}, mortgages: {}, totalRentReceived: 0, totalRentPaid: 0, constructionCount: 0, destructionCount: 0 },
    ]
  }

  private addLog(playerId: number, type: string, description: string, amount = 0) {
    const p = this.players[playerId]
    this.activityLog.push({
      id: this.logIdCounter++,
      timestamp: Date.now(),
      playerId,
      playerName: p ? p.name : "System",
      playerColor: p ? p.color : "gray",
      type,
      description,
      amount,
    })
    if (this.activityLog.length > 100) this.activityLog.shift()
  }

  async isCppConnected(): Promise<boolean> {
    return false
  }

  async startGame(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    if (rules && !this.settingsLocked) {
      if (rules.defaultStartingMoney !== undefined) {
        this.rules.defaultStartingMoney = rules.defaultStartingMoney
      }
      if (rules.doublesRuleEnabled !== undefined) {
        this.rules.doublesRuleEnabled = rules.doublesRuleEnabled
      }
      if (rules.timerEnabled !== undefined) {
        this.rules.timerEnabled = rules.timerEnabled
      }
      if (rules.timerSeconds !== undefined) {
        this.rules.timerSeconds = rules.timerSeconds
      }
      if (rules.maxPlayers !== undefined) {
        this.rules.maxPlayers = rules.maxPlayers
      }
    }
    this.gamePhase = "IN_PROGRESS"
    this.settingsLocked = true
    this.gameStarted = true

    const configs =
      playerConfigs && playerConfigs.length >= 2
        ? playerConfigs
        : [
            { name: "Player 1", color: "saffron", token: "1" },
            { name: "Player 2", color: "teal", token: "2" },
            { name: "Player 3", color: "plum", token: "3" },
            { name: "Player 4", color: "blue", token: "4" },
          ]

    this.players = configs.map((c, idx) => ({
      id: idx,
      name: c.name,
      color: c.color,
      token: c.token,
      isHuman: (c as any).isHuman !== undefined ? Boolean((c as any).isHuman) : true,
      money: 0, // Starts at 0 per Rule 5
      position: 0, // Start space
      rotationsCompleted: 0,
      inJail: false,
      jailTurns: 0,
      inRestHouse: false,
      isBankrupt: false,
      ownedProperties: [],
      buildings: {},
      mortgages: {},
      totalRentReceived: 0,
      totalRentPaid: 0,
      constructionCount: 0,
      destructionCount: 0,
    }))

    this.transactionLedger = []
    this.txIdCounter = 1

    this.activePlayerIndex = 0
    this.roundNumber = 1
    this.consecutiveDoubles = 0
    this.gameStarted = true
    this.turnState = "WAITING_FOR_ROLL"
    this.lastDice = [0, 0]

    return this.getState()
  }

  async resetToLobby(
    rules?: GameRules,
    playerConfigs?: PlayerSetup[],
  ): Promise<GameState> {
    if (rules) {
      this.rules = {
        ...this.rules,
        ...rules,
      }
      if (rules.timerEnabled !== undefined) this.timerEnabled = rules.timerEnabled
      if (rules.timerSeconds !== undefined) this.timerSeconds = rules.timerSeconds
    }
    this.gamePhase = "LOBBY"
    this.settingsLocked = false
    this.gameStarted = false
    this.activePlayerIndex = 0
    this.roundNumber = 1
    this.consecutiveDoubles = 0
    this.turnState = "WAITING_FOR_ROLL"
    this.lastDice = [0, 0]

    const configs =
      playerConfigs && playerConfigs.length >= 2
        ? playerConfigs
        : [
            { name: "Player 1", color: "saffron", token: "1" },
            { name: "Player 2", color: "teal", token: "2" },
            { name: "Player 3", color: "plum", token: "3" },
            { name: "Player 4", color: "blue", token: "4" },
          ]

    this.players = configs.map((c, idx) => ({
      id: idx,
      name: c.name,
      color: c.color,
      token: c.token,
      isHuman: (c as any).isHuman !== undefined ? Boolean((c as any).isHuman) : true,
      money: 0,
      position: 0,
      rotationsCompleted: 0,
      inJail: false,
      jailTurns: 0,
      inRestHouse: false,
      isBankrupt: false,
      ownedProperties: [],
      buildings: {},
      mortgages: {},
      totalRentReceived: 0,
      totalRentPaid: 0,
      constructionCount: 0,
      destructionCount: 0,
    }))

    this.activityLog = []
    this.transactionLedger = []
    this.tradeOffers = []

    return this.getState()
  }

  async updateRules(
    newRules: Partial<GameRules>,
    requesterId: number = 0,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    if (this.gamePhase === "IN_PROGRESS" || this.settingsLocked) {
      return {
        success: false,
        state: await this.getState(),
        error: "Settings are permanently locked while game is in progress.",
      }
    }
    if (requesterId !== 0) {
      return {
        success: false,
        state: await this.getState(),
        error: "Only the host (Player 1) can edit game settings.",
      }
    }
    this.rules = {
      ...this.rules,
      ...newRules,
    }
    if (newRules.timerEnabled !== undefined) {
      this.timerEnabled = newRules.timerEnabled
    }
    if (newRules.timerSeconds !== undefined) {
      this.timerSeconds = newRules.timerSeconds
    }
    return {
      success: true,
      state: await this.getState(),
    }
  }

  findOwnerOfProperty(propertyId: string): number {
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].ownedProperties.includes(propertyId)) {
        return i
      }
    }
    return -1
  }

  playerOwnsCompleteGroup(playerId: number, group: ColorGroup): boolean {
    if (group === "NONE" || playerId < 0 || playerId >= this.players.length)
      return false
    const groupData = COLOR_GROUPS[group]
    if (!groupData) return false

    const player = this.players[playerId]
    for (const cityName of groupData.properties) {
      const prop = Object.values(CITY_PROPERTIES).find(
        (c) => c.name.toLowerCase() === cityName.toLowerCase(),
      )
      if (!prop) return false
      if (!player.ownedProperties.includes(prop.id)) return false
    }
    return true
  }

  playerOwnedCountInGroup(playerId: number, group: ColorGroup): number {
    if (group === "NONE" || playerId < 0 || playerId >= this.players.length) return 0
    const groupDef = COLOR_GROUPS[group]
    if (!groupDef) return 0
    const player = this.players[playerId]
    let count = 0
    for (const cName of groupDef.properties) {
      const cProp = Object.values(CITY_PROPERTIES).find(
        (p) => p.name.toLowerCase() === cName.toLowerCase(),
      )
      if (cProp && (player.ownedProperties || []).includes(cProp.id)) {
        count++
      }
    }
    return count
  }

  playerOwnsSpecialPair(playerId: number, specialId: string): boolean {
    if (playerId < 0 || playerId >= this.players.length) return false
    const sp = SPECIAL_PROPERTIES[specialId]
    if (!sp) return false

    // Find pair property
    const pairSp = Object.values(SPECIAL_PROPERTIES).find(
      (s) => s.id !== sp.id && s.pair === sp.pair,
    )
    if (!pairSp) return false

    const player = this.players[playerId]
    return (
      player.ownedProperties.includes(sp.id) &&
      player.ownedProperties.includes(pairSp.id)
    )
  }

  calculateRent(propertyId: string, diceTotal: number): number {
    const ownerIdx = this.findOwnerOfProperty(propertyId)
    if (ownerIdx === -1) return 0

    const owner = this.players[ownerIdx]
    if (owner.mortgages[propertyId]) return 0 // Mortgaged

    const city = CITY_PROPERTIES[propertyId]
    if (city) {
      const houses = owner.buildings[propertyId] || 0
      if (houses === 1) return city.rentOneHouse
      if (houses === 2) return city.rentTwoHouses
      if (houses === 3) return city.rentThreeHouses
      if (houses >= 4) return city.hotelRent

      // Owning any 3 properties in the same color group doubles undeveloped/base rent
      if (this.playerOwnedCountInGroup(ownerIdx, city.colorGroup) >= 3) {
        return city.baseRent * 2
      }
      return city.baseRent
    }

    const sp = SPECIAL_PROPERTIES[propertyId]
    if (sp) {
      const hasPair = this.playerOwnsSpecialPair(ownerIdx, propertyId)
      if (sp.isDiceMultiplier) {
        const mult = hasPair
          ? propertyId === "roadways"
            ? 100
            : propertyId === "electrical_company"
              ? 75
              : propertyId === "motor_boat"
                ? 150
                : 100
          : propertyId === "roadways"
            ? 50
            : propertyId === "electrical_company"
              ? 25
              : propertyId === "motor_boat"
                ? 75
                : 50
        return mult * diceTotal
      } else {
        return hasPair
          ? propertyId === "railway"
            ? 1200
            : 1500
          : propertyId === "railway"
            ? 600
            : 800
      }
    }

    return 0
  }

  async rollAndMove(riggedDice?: [number, number], playerId?: number): Promise<{
    result: TurnResult
    state: GameState
  }> {
    if (riggedDice && !this.devMode) {
      throw new Error("Rigged dice only allowed in dev mode")
    }
    if (!this.devMode && typeof playerId === "number" && playerId !== this.activePlayerIndex) {
      throw new Error(`Not your turn. Active player is ${this.activePlayerIndex}`)
    }
    const player = this.players[this.activePlayerIndex]
    const prevPos = player.position

    // Check Rest House
    if (player.inRestHouse) {
      player.inRestHouse = false
      const res: TurnResult = {
        playerId: player.id,
        dice1: 0,
        dice2: 0,
        diceTotal: 0,
        isDouble: false,
        previousPosition: prevPos,
        newPosition: prevPos,
        spaceName: "REST HOUSE",
        spaceType: "corner",
        eventDescription: `${player.name} was resting in Rest House and skips this turn.`,
        moneyChange: 0,
        passStartBonusAwarded: false,
        startingCapitalAwarded: false,
        mustGoToJail: false,
        mustGoToRestHouse: false,
        eligibleToBuy: false,
        purchasablePropertyId: "",
        purchasePrice: 0,
        rentPaid: false,
        rentAmount: 0,
        rentRecipientId: -1,
      }
      if (player.isHuman) {
        this.turnState = "WAITING_FOR_ACTION"
      } else {
        this.activePlayerIndex =
          (this.activePlayerIndex + 1) % this.players.length
        if (this.activePlayerIndex === 0) this.roundNumber++
        this.turnState = "WAITING_FOR_ROLL"
      }
      return { result: res, state: await this.getState() }
    }

    // Roll dice
    const d1 = riggedDice ? riggedDice[0] : Math.ceil(Math.random() * 6)
    const d2 = riggedDice ? riggedDice[1] : Math.ceil(Math.random() * 6)
    this.lastDice = [d1, d2]
    const total = d1 + d2
    const isDouble = d1 === d2

    const res: TurnResult = {
      playerId: player.id,
      dice1: d1,
      dice2: d2,
      diceTotal: total,
      isDouble,
      previousPosition: prevPos,
      newPosition: prevPos,
      spaceName: "",
      spaceType: "corner",
      eventDescription: "",
      moneyChange: 0,
      passStartBonusAwarded: false,
      startingCapitalAwarded: false,
      mustGoToJail: false,
      mustGoToRestHouse: false,
      eligibleToBuy: false,
      purchasablePropertyId: "",
      purchasePrice: 0,
      rentPaid: false,
      rentAmount: 0,
      rentRecipientId: -1,
    }

    // Check Jail status
    const wasInJail = player.inJail
    if (player.inJail) {
      player.jailTurns = (player.jailTurns || 0) + 1
      if (isDouble || player.jailTurns >= 3) {
        player.inJail = false
        player.jailTurns = 0
        res.eventDescription = `${player.name} ${
          isDouble
            ? "rolled doubles and was released from Jail!"
            : "served 3 turns and is released from Jail!"
        }`
      } else {
        res.eventDescription = `${player.name} remains in Jail (turn ${player.jailTurns}/3).`
        if (player.isHuman) {
          this.turnState = "WAITING_FOR_ACTION"
        } else {
          this.activePlayerIndex =
            (this.activePlayerIndex + 1) % this.players.length
          if (this.activePlayerIndex === 0) this.roundNumber++
          this.turnState = "WAITING_FOR_ROLL"
        }
        return { result: res, state: await this.getState() }
      }
    }

    // Check consecutive doubles
    if (this.rules.doublesRuleEnabled && isDouble && !wasInJail) {
      this.consecutiveDoubles++
      if (this.consecutiveDoubles === 3) {
        // Third consecutive double: straight to Jail, no movement resolved
        player.inJail = true
        player.jailTurns = 0
        player.position = 9 // Jail space
        res.mustGoToJail = true
        res.newPosition = 9
        res.spaceName = "JAIL"
        res.eventDescription = `${player.name} was sent to Jail after three consecutive doubles.`
        this.consecutiveDoubles = 0
        if (player.isHuman) {
          this.turnState = "WAITING_FOR_ACTION"
        } else {
          this.activePlayerIndex =
            (this.activePlayerIndex + 1) % this.players.length
          if (this.activePlayerIndex === 0) this.roundNumber++
          this.turnState = "WAITING_FOR_ROLL"
        }
        return { result: res, state: await this.getState() }
      }
    } else if (!wasInJail) {
      this.consecutiveDoubles = 0
    }

    // Movement and Start crossing
    const nextPos = (prevPos + total) % 36
    const passedStart = prevPos + total >= 36
    const startCrossings = Math.floor((prevPos + total) / 36)
    if (passedStart) {
      for (let c = 0; c < startCrossings; c++) {
        this.rules.unmortgageInterestRatePercent =
          Math.round((this.rules.unmortgageInterestRatePercent ?? 10) * 1.05 * 10000) / 10000
      }
      if (player.rotationsCompleted === 0) {
        player.rotationsCompleted = 1
        player.money += this.rules.defaultStartingMoney
        res.startingCapitalAwarded = true
        this.addLog(
          player.id,
          "capital",
          `${player.name} completed first rotation and received ₹${this.rules.defaultStartingMoney.toLocaleString()} starting capital!`,
          this.rules.defaultStartingMoney,
        )
        this.recordTransaction(
          "CAPITAL_REWARD",
          `${player.name} completed first rotation and received ₹${this.rules.defaultStartingMoney.toLocaleString()} starting capital.`,
          this.rules.defaultStartingMoney,
          player.id,
          -1,
        )
      } else {
        player.money += this.rules.passStartBonus
        res.passStartBonusAwarded = true
        this.addLog(
          player.id,
          "start_bonus",
          `${player.name} passed Start and collected ₹${this.rules.passStartBonus.toLocaleString()} bonus.`,
          this.rules.passStartBonus,
        )
        this.recordTransaction(
          "START_REWARD",
          `${player.name} passed Start and collected ₹${this.rules.passStartBonus.toLocaleString()} bonus.`,
          this.rules.passStartBonus,
          player.id,
          -1,
        )
      }
    }

    player.position = nextPos
    res.newPosition = nextPos

    const space = BOARD_SPACES[nextPos]
    res.spaceName = space.name
    res.spaceType = space.type

    const isFirstRotation = player.rotationsCompleted === 0 && !this.devMode

    if (isFirstRotation) {
      res.eventDescription = `${player.name} moved to ${space.name} (First rotation: no purchases or payments).`
    } else {
      if (space.type === "city" || space.type === "special") {
        const ownerIdx = this.findOwnerOfProperty(space.propertyId!)
        if (ownerIdx === -1) {
          // Unowned property available
          res.eligibleToBuy = true
          res.purchasablePropertyId = space.propertyId!
          if (space.type === "city") {
            const c = CITY_PROPERTIES[space.propertyId!]
            res.purchasePrice = c ? c.purchasePrice : 0
          } else {
            const sp = SPECIAL_PROPERTIES[space.propertyId!]
            res.purchasePrice = sp ? sp.purchasePrice : 0
          }
          res.eventDescription = `${player.name} landed on unowned ${space.name} (Price: ₹${res.purchasePrice.toLocaleString()}).`
        } else if (ownerIdx === player.id) {
          res.eventDescription = `${player.name} landed on their own property: ${space.name}.`
        } else {
          // Pay rent
          const rent = this.calculateRent(space.propertyId!, total)
          player.money -= rent
          this.players[ownerIdx].money += rent
          player.totalRentPaid = (player.totalRentPaid || 0) + rent
          this.players[ownerIdx].totalRentReceived =
            (this.players[ownerIdx].totalRentReceived || 0) + rent
          res.rentPaid = true
          res.rentAmount = rent
          res.rentRecipientId = ownerIdx
          this.recordTransaction(
            "RENT",
            `${player.name} paid ₹${rent.toLocaleString()} rent to ${this.players[ownerIdx].name} for ${space.name}.`,
            rent,
            player.id,
            ownerIdx,
            space.propertyId,
          )
          if (player.money < 0) {
            res.eventDescription = `${player.name} owes ₹${rent.toLocaleString()} rent to ${this.players[ownerIdx].name} for ${space.name} (Shortfall / Debt: ₹${(-player.money).toLocaleString()}). Must settle debt or resign.`
            this.addLog(player.id, "debt", `${player.name} incurred debt paying rent. Balance: -₹${(-player.money).toLocaleString()}`, -rent)
          } else {
            res.eventDescription = `${player.name} paid ₹${rent.toLocaleString()} rent to ${this.players[ownerIdx].name} for ${space.name}.`
            this.addLog(player.id, "rent", `${player.name} paid ₹${rent.toLocaleString()} rent to ${this.players[ownerIdx].name} for ${space.name}.`, -rent)
          }
        }
      } else if (space.type === "chance") {
        const decl = CHANCE_DECLARATIONS.find((c) => c.diceSum === total)
        if (decl) {
          res.eventDescription = `CHANCE (Dice ${total}): ${decl.declaration}`
          if (decl.kind === "receive") {
            if (total === 3) {
              player.money += 2500
              res.moneyChange = 2500
            } else if (total === 5) {
              player.money += 1000
              res.moneyChange = 1000
            } else if (total === 7) {
              player.money += 2000
              res.moneyChange = 2000
            } else if (total === 11) {
              player.money += 3000
              res.moneyChange = 3000
            }
          } else if (decl.kind === "pay") {
            if (total === 2) {
              player.money -= 2000
              res.moneyChange = -2000
            } else if (total === 4) {
              player.money -= 1000
              res.moneyChange = -1000
            } else if (total === 6) {
              player.money -= 1500
              res.moneyChange = -1500
            } else if (total === 8) {
              player.money -= 3000
              res.moneyChange = -3000
            }
          } else if (decl.kind === "jail") {
            player.inJail = true
            player.position = 9
            res.mustGoToJail = true
            res.newPosition = 9
            res.eventDescription = `${player.name} drew Chance: Go to Jail.`
          } else if (decl.kind === "rest") {
            player.inRestHouse = true
            player.position = 27
            res.mustGoToRestHouse = true
            res.newPosition = 27
            res.eventDescription = `${player.name} drew Chance: Rest House (skips next turn).`
          } else if (decl.kind === "move" && total === 9) {
            if (player.position > 1) {
              this.rules.unmortgageInterestRatePercent =
                Math.round((this.rules.unmortgageInterestRatePercent ?? 10) * 1.05 * 10000) / 10000
              player.position = 1
            } else {
              player.money += 1500
              res.moneyChange = 1500
              player.position = 23
            }
            res.newPosition = player.position
          }
        }
      } else if (space.type === "chest") {
        const decl = CHEST_DECLARATIONS.find((c) => c.diceSum === total)
        if (decl) {
          res.eventDescription = `COMMUNITY CHEST (Dice ${total}): ${decl.declaration}`
          if (decl.kind === "receive") {
            if (total === 4) {
              player.money += 2500
              res.moneyChange = 2500
            } else if (total === 6) {
              player.money += 2000
              res.moneyChange = 2000
            } else if (total === 10) {
              player.money += 1500
              res.moneyChange = 1500
            } else if (total === 12) {
              player.money += 3000
              res.moneyChange = 3000
            }
          } else if (decl.kind === "pay") {
            if (total === 5) {
              player.money -= 1000
              res.moneyChange = -1000
            } else if (total === 7) {
              player.money -= 2000
              res.moneyChange = -2000
            } else if (total === 11) {
              player.money -= 1500
              res.moneyChange = -1500
            }
          } else if (decl.kind === "jail") {
            player.inJail = true
            player.position = 9
            res.mustGoToJail = true
            res.newPosition = 9
            res.eventDescription = `${player.name} drew Community Chest: Go to Jail.`
          } else if (decl.kind === "rest") {
            player.inRestHouse = true
            player.position = 27
            res.mustGoToRestHouse = true
            res.newPosition = 27
            res.eventDescription = `${player.name} drew Community Chest: Rest House (skips next turn).`
          } else if (decl.kind === "players" && total === 2) {
            let collected = 0
            for (const other of this.players) {
              if (other.id !== player.id && !other.isBankrupt) {
                other.money -= 500
                player.money += 500
                collected += 500
              }
            }
            res.moneyChange = collected
          } else if (decl.kind === "buildings" && total === 9) {
            let repairCost = 0
            for (const count of Object.values(player.buildings)) {
              if (count >= 4) repairCost += 100
              else repairCost += count * 50
            }
            player.money -= repairCost
            res.moneyChange = -repairCost
            res.eventDescription = `${player.name} paid ₹${repairCost.toLocaleString()} for property repairs (₹50/house, ₹100/hotel).`
          }
        }
      } else if (space.type === "corner") {
        if (nextPos === 9) {
          res.eventDescription = `${player.name} is just visiting Jail.`
        } else if (nextPos === 18) {
          res.eventDescription = `${player.name} entered the Royal Club.`
        } else if (nextPos === 27) {
          player.inRestHouse = true
          res.eventDescription = `${player.name} stopped at the Rest House (misses next turn).`
        }
      } else if (space.type === "tax") {
        const tax = 500
        player.money -= tax
        res.moneyChange = -tax
        res.eventDescription = `${player.name} paid ₹${tax} ${space.name} to the Bank.`
      }
    }

    // Turn advancement if no extra turn from doubles
    const extra = Boolean(
      this.rules.doublesRuleEnabled &&
      isDouble &&
      !player.inJail &&
      !wasInJail
    )

    if (res.eligibleToBuy) {
      this.turnState = "WAITING_FOR_ACTION"
    } else if (extra) {
      this.turnState = "EXTRA_TURN"
    } else if (player.isHuman) {
      this.turnState = "WAITING_FOR_ACTION"
    } else {
      this.turnState = "TURN_COMPLETE"
      this.activePlayerIndex =
        (this.activePlayerIndex + 1) % this.players.length
      if (this.activePlayerIndex === 0) this.roundNumber++
    }

    res.extraTurnGranted = extra
    this.lastTurnResult = res
    return { result: res, state: await this.getState() }
  }

  async buyCurrentProperty(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[playerId]
    if (player.rotationsCompleted === 0 && !this.devMode) {
      return { success: false, state: await this.getState() }
    }

    const space = BOARD_SPACES[player.position]
    if (space.type !== "city" && space.type !== "special") {
      return { success: false, state: await this.getState() }
    }

    const ownerIdx = this.findOwnerOfProperty(space.propertyId!)
    if (ownerIdx !== -1) {
      return { success: false, state: await this.getState() }
    }

    let price = 0
    if (space.type === "city") {
      const c = CITY_PROPERTIES[space.propertyId!]
      price = c ? c.purchasePrice : 0
    } else {
      const sp = SPECIAL_PROPERTIES[space.propertyId!]
      price = sp ? sp.purchasePrice : 0
    }

    if (player.money < price) {
      return { success: false, state: await this.getState() }
    }

    player.money -= price
    player.ownedProperties.push(space.propertyId!)
    this.recordTransaction(
      "PURCHASE",
      `${player.name} purchased ${space.name} for ₹${price.toLocaleString()}.`,
      price,
      playerId,
      -1,
      space.propertyId!,
    )

    const extra = Boolean(
      this.rules.doublesRuleEnabled &&
      this.lastDice[0] === this.lastDice[1] &&
      !player.inJail
    )

    if (player.isHuman) {
      this.turnState = extra ? "EXTRA_TURN" : "WAITING_FOR_ACTION"
    } else {
      this.advanceTurn(extra)
    }

    if (this.lastTurnResult) {
      this.lastTurnResult.eligibleToBuy = false
    }

    return { success: true, state: await this.getState() }
  }

  async declinePropertyPurchase(playerId: number): Promise<{
    success: boolean
    state: GameState
  }> {
    const player = this.players[playerId]
    const extra = Boolean(
      this.rules.doublesRuleEnabled &&
      this.lastDice[0] === this.lastDice[1] &&
      !player?.inJail
    )

    if (player?.isHuman) {
      this.turnState = extra ? "EXTRA_TURN" : "WAITING_FOR_ACTION"
    } else {
      this.advanceTurn(extra)
    }

    if (this.lastTurnResult) {
      this.lastTurnResult.eligibleToBuy = false
    }
    return { success: true, state: await this.getState() }
  }

  private advanceTurn(extraTurn: boolean = false) {
    if (!extraTurn) {
      this.consecutiveDoubles = 0
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length
      if (this.activePlayerIndex === 0) this.roundNumber++
      this.turnState = "WAITING_FOR_ROLL"
      this.turnStartedAt = Date.now()
    } else {
      this.turnState = "EXTRA_TURN"
    }
  }

  async endTurn(playerId?: number): Promise<{ state: GameState }> {
    const actingId = typeof playerId === "number" && playerId >= 0 ? playerId : this.activePlayerIndex
    if (!this.devMode && actingId !== this.activePlayerIndex) {
      return { state: await this.getState() }
    }
    const player = this.players[actingId]
    if (player && player.money < 0 && !player.isBankrupt) {
      if (!player.isHuman) {
        for (const propId of player.ownedProperties) {
          if (!player.mortgages[propId]) {
            await this.mortgageProperty(actingId, propId)
            if (player.money >= 0) break
          }
        }
        if (player.money < 0) {
          await this.resignPlayer(actingId)
          return { state: await this.getState() }
        }
      } else {
        return { state: await this.getState() }
      }
    }
    this.advanceTurn(false)
    return { state: await this.getState() }
  }

  async buildHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[playerId]

    const space = BOARD_SPACES[player.position]
    if (this.rules.requireLandingToBuild && space.propertyId !== propertyId) {
      return { success: false, state: await this.getState() }
    }

    const city = CITY_PROPERTIES[propertyId]
    if (!city || !player.ownedProperties.includes(propertyId)) {
      return { success: false, state: await this.getState() }
    }

    const currentBuildings = player.buildings[propertyId] || 0
    if (currentBuildings >= 4) {
      return { success: false, state: await this.getState() }
    }

    // A mortgaged property must never be eligible for construction
    if (player.money < city.buildingCost || player.mortgages[propertyId]) {
      return { success: false, state: await this.getState() }
    }

    player.money -= city.buildingCost
    player.buildings[propertyId] = currentBuildings + 1
    player.constructionCount = (player.constructionCount || 0) + 1
    const bLabel =
      player.buildings[propertyId] === 4
        ? "Hotel"
        : `${player.buildings[propertyId]} House(s)`
    this.recordTransaction(
      "CONSTRUCTION",
      `${player.name} built ${bLabel} on ${city.name} for ₹${city.buildingCost.toLocaleString()}.`,
      city.buildingCost,
      playerId,
      -1,
      propertyId,
    )
    return { success: true, state: await this.getState() }
  }

  async sellHouseOrHotel(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[playerId]
    const city = CITY_PROPERTIES[propertyId]
    if (!city || !player.ownedProperties.includes(propertyId)) {
      return { success: false, state: await this.getState() }
    }

    const currentBuildings = player.buildings[propertyId] || 0
    if (currentBuildings <= 0) {
      return { success: false, state: await this.getState() }
    }

    const rawRefund =
      (city.buildingCost * this.rules.buildingRefundPercentage) / 100
    const refund = Math.ceil(rawRefund / 100) * 100

    player.buildings[propertyId] = currentBuildings - 1
    player.money += refund
    player.destructionCount = (player.destructionCount || 0) + 1
    this.recordTransaction(
      "DESTRUCTION_REFUND",
      `${player.name} destroyed a building on ${city.name} for ₹${refund.toLocaleString()} refund.`,
      refund,
      playerId,
      -1,
      propertyId,
    )
    return { success: true, state: await this.getState() }
  }

  async mortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[playerId]
    if (
      !player.ownedProperties.includes(propertyId) ||
      player.mortgages[propertyId]
    ) {
      return { success: false, state: await this.getState() }
    }

    if ((player.buildings[propertyId] || 0) > 0) {
      return { success: false, state: await this.getState() }
    }

    let mortgageVal = 0
    const city = CITY_PROPERTIES[propertyId]
    if (city) mortgageVal = city.mortgageValue
    else {
      const sp = SPECIAL_PROPERTIES[propertyId]
      if (sp) mortgageVal = sp.mortgageValue
    }

    if (mortgageVal <= 0)
      return { success: false, state: await this.getState() }

    player.mortgages[propertyId] = true
    player.money += mortgageVal
    this.recordTransaction(
      "MORTGAGE",
      `${player.name} mortgaged ${propertyId} and received ₹${mortgageVal.toLocaleString()}.`,
      mortgageVal,
      playerId,
      -1,
      propertyId,
    )
    return { success: true, state: await this.getState() }
  }

  async unmortgageProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[playerId]
    if (
      !player.ownedProperties.includes(propertyId) ||
      !player.mortgages[propertyId]
    ) {
      return { success: false, state: await this.getState() }
    }

    let mortgageVal = 0
    const city = CITY_PROPERTIES[propertyId]
    if (city) mortgageVal = city.mortgageValue
    else {
      const sp = SPECIAL_PROPERTIES[propertyId]
      if (sp) mortgageVal = sp.mortgageValue
    }

    const rate = this.rules.unmortgageInterestRatePercent ?? 10
    const rawRepay =
      mortgageVal +
      (mortgageVal * rate) / 100
    const repay = Math.ceil(rawRepay / 100) * 100

    if (player.money < repay)
      return { success: false, state: await this.getState() }

    player.money -= repay
    player.mortgages[propertyId] = false
    this.recordTransaction(
      "UNMORTGAGE",
      `${player.name} unmortgaged ${propertyId} for ₹${repay.toLocaleString()}.`,
      repay,
      playerId,
      -1,
      propertyId,
    )
    return { success: true, state: await this.getState() }
  }

  async sellProperty(playerId: number, propertyId: string): Promise<{
    success: boolean
    state: GameState
    sellPrice?: number
    error?: string
  }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState(), error: "Invalid player" }
    }
    const player = this.players[playerId]
    if (!player.ownedProperties.includes(propertyId)) {
      return { success: false, state: await this.getState(), error: "Player does not own property" }
    }
    const currentBuildings = player.buildings[propertyId] || 0
    if (currentBuildings > 0) {
      return { success: false, state: await this.getState(), error: "Must sell all buildings first" }
    }

    const city = CITY_PROPERTIES[propertyId]
    const sp = SPECIAL_PROPERTIES[propertyId]
    const basePrice = city?.purchasePrice || sp?.purchasePrice || 0
    const propName = city?.name || sp?.name || propertyId

    const purchaseTx = this.transactionLedger.find(
      (tx) => tx.propertyId === propertyId && tx.type === "PURCHASE",
    )
    const boughtRound = purchaseTx ? purchaseTx.turnNumber : 1
    const roundsElapsed = Math.max(0, this.roundNumber - boughtRound)
    const depreciationPercent = Math.min(90, roundsElapsed * 5)
    const depreciatedValue = Math.max(
      Math.round(basePrice * 0.1),
      Math.round(basePrice * (1 - depreciationPercent / 100)),
    )
    const isMortgaged = !!player.mortgages[propertyId]
    const mortgageValue = city?.mortgageValue || sp?.mortgageValue || Math.round(basePrice * 0.5)
    const mortgageDeduction = isMortgaged ? mortgageValue : 0
    const netSellProceeds = Math.max(0, depreciatedValue - mortgageDeduction)

    player.ownedProperties = player.ownedProperties.filter((id) => id !== propertyId)
    delete player.mortgages[propertyId]
    delete player.buildings[propertyId]
    player.money += netSellProceeds

    const desc = isMortgaged
      ? `${player.name} sold ${propName} back to the bank for ₹${netSellProceeds.toLocaleString()} (depreciated ₹${depreciatedValue.toLocaleString()} minus mortgage payoff ₹${mortgageDeduction.toLocaleString()}).`
      : `${player.name} sold ${propName} back to the bank for ₹${netSellProceeds.toLocaleString()} (${depreciationPercent}% depreciation over ${roundsElapsed} round(s)).`

    this.recordTransaction(
      "PROPERTY_SALE",
      desc,
      netSellProceeds,
      playerId,
      -1,
      propertyId,
    )

    return { success: true, state: await this.getState(), sellPrice: netSellProceeds }
  }

  async getState(): Promise<GameState> {
    const elapsed = Math.floor((Date.now() - this.turnStartedAt) / 1000)
    const remaining = Math.max(0, this.timerSeconds - elapsed)
    return {
      roundNumber: this.roundNumber,
      activePlayerIndex: this.activePlayerIndex,
      turnState: this.turnState,
      gameStarted: this.gameStarted,
      gamePhase: this.gamePhase,
      settingsLocked: this.settingsLocked,
      consecutiveDoubles: this.consecutiveDoubles,
      devMode: this.devMode,
      lastDice: this.lastDice,
      turnTimer: {
        enabled: this.timerEnabled,
        duration: this.timerSeconds,
        durationSeconds: this.timerSeconds,
        startedAt: this.turnStartedAt,
        remaining,
        remainingSeconds: remaining,
      },
      rules: { ...this.rules },
      activityLog: [...this.activityLog],
      transactionLedger: [...this.transactionLedger],
      tradeOffers: [...this.tradeOffers],
      players: this.players.map((p) => ({
        ...JSON.parse(JSON.stringify(p)),
        netWorth: this.calculatePlayerNetWorth(p.id),
      })),
    }
  }

  private invalidateConflictingTrades(acceptedTrade: TradeOffer) {
    for (const offer of this.tradeOffers) {
      if (offer.id === acceptedTrade.id || offer.status !== "PENDING") continue

      const s = this.players[offer.senderId]
      const r = this.players[offer.receiverId]
      if (!s || !r || s.isBankrupt || r.isBankrupt) {
        offer.status = "INVALIDATED"
        continue
      }

      // Check if any property was traded in the accepted trade
      const tradedProps = new Set([...acceptedTrade.senderPropertyIds, ...acceptedTrade.receiverPropertyIds])
      const hasConflict = [...offer.senderPropertyIds, ...offer.receiverPropertyIds].some((p) => tradedProps.has(p))

      // Check if sender/receiver still owns offered properties
      const senderOwnsAll = offer.senderPropertyIds.every((p) => s.ownedProperties.includes(p))
      const receiverOwnsAll = offer.receiverPropertyIds.every((p) => r.ownedProperties.includes(p))

      // Check if players have sufficient cash
      const senderHasCash = s.money >= offer.senderCash
      const receiverHasCash = r.money >= offer.receiverCash

      if (hasConflict || !senderOwnsAll || !receiverOwnsAll || !senderHasCash || !receiverHasCash) {
        offer.status = "INVALIDATED"
      }
    }
  }

  async createTradeOffer(
    senderId: number,
    receiverId: number,
    senderPropertyIds: string[],
    senderCash: number,
    receiverPropertyIds: string[],
    receiverCash: number,
  ): Promise<{ success: boolean; tradeId?: string; state: GameState; error?: string }> {
    if (senderId < 0 || senderId >= this.players.length || receiverId < 0 || receiverId >= this.players.length || senderId === receiverId) {
      return { success: false, state: await this.getState(), error: "Invalid sender or receiver" }
    }
    const sender = this.players[senderId]
    const receiver = this.players[receiverId]
    if (sender.isBankrupt || receiver.isBankrupt) {
      return { success: false, state: await this.getState(), error: "Cannot trade with bankrupt player" }
    }
    if (senderCash < 0 || receiverCash < 0) {
      return { success: false, state: await this.getState(), error: "Negative cash offer" }
    }
    if (sender.money < senderCash) {
      return { success: false, state: await this.getState(), error: "Insufficient sender cash" }
    }
    if (senderPropertyIds.length === 0 && senderCash === 0 && receiverPropertyIds.length === 0 && receiverCash === 0) {
      return { success: false, state: await this.getState(), error: "Empty trade offer" }
    }

    for (const propId of senderPropertyIds) {
      if (!sender.ownedProperties.includes(propId)) {
        return { success: false, state: await this.getState(), error: `Sender does not own ${propId}` }
      }
      if ((sender.buildings[propId] || 0) > 0) {
        return { success: false, state: await this.getState(), error: `Cannot trade property ${propId} with buildings` }
      }
    }
    for (const propId of receiverPropertyIds) {
      if (!receiver.ownedProperties.includes(propId)) {
        return { success: false, state: await this.getState(), error: `Receiver does not own ${propId}` }
      }
      if ((receiver.buildings[propId] || 0) > 0) {
        return { success: false, state: await this.getState(), error: `Cannot trade property ${propId} with buildings` }
      }
    }

    const tradeId = `trade_${this.nextTradeId++}`
    const offer: TradeOffer = {
      id: tradeId,
      senderId,
      senderName: sender.name,
      receiverId,
      receiverName: receiver.name,
      senderPropertyIds: [...senderPropertyIds],
      senderCash,
      receiverPropertyIds: [...receiverPropertyIds],
      receiverCash,
      status: "PENDING",
      timestamp: Date.now(),
    }
    this.tradeOffers.push(offer)

    // Make bots accept trades given to them for time's sake
    const isReceiverBot = !receiver.isHuman
    if (isReceiverBot) {
      await this.acceptTradeOffer(tradeId, receiverId)
    }

    return { success: true, tradeId, state: await this.getState() }
  }

  async acceptTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const offer = this.tradeOffers.find((o) => o.id === tradeId)
    if (!offer || offer.status !== "PENDING") {
      return { success: false, state: await this.getState(), error: "Offer not found or not pending" }
    }
    if (offer.receiverId !== playerId && !this.devMode) {
      return { success: false, state: await this.getState(), error: "Only receiver can accept trade" }
    }

    const sender = this.players[offer.senderId]
    const receiver = this.players[offer.receiverId]
    if (!sender || !receiver || sender.isBankrupt || receiver.isBankrupt) {
      offer.status = "INVALIDATED"
      return { success: false, state: await this.getState(), error: "Player unavailable or bankrupt" }
    }
    if (sender.money < offer.senderCash || receiver.money < offer.receiverCash) {
      offer.status = "INVALIDATED"
      return { success: false, state: await this.getState(), error: "Insufficient funds for trade" }
    }

    for (const p of offer.senderPropertyIds) {
      if (!sender.ownedProperties.includes(p) || (sender.buildings[p] || 0) > 0) {
        offer.status = "INVALIDATED"
        return { success: false, state: await this.getState(), error: `Sender ownership/building mismatch on ${p}` }
      }
    }
    for (const p of offer.receiverPropertyIds) {
      if (!receiver.ownedProperties.includes(p) || (receiver.buildings[p] || 0) > 0) {
        offer.status = "INVALIDATED"
        return { success: false, state: await this.getState(), error: `Receiver ownership/building mismatch on ${p}` }
      }
    }

    // Atomic execution
    if (offer.senderCash > 0) {
      sender.money -= offer.senderCash
      receiver.money += offer.senderCash
    }
    if (offer.receiverCash > 0) {
      receiver.money -= offer.receiverCash
      sender.money += offer.receiverCash
    }
    for (const p of offer.senderPropertyIds) {
      sender.ownedProperties = sender.ownedProperties.filter((x) => x !== p)
      receiver.ownedProperties.push(p)
      if (sender.mortgages[p]) {
        receiver.mortgages[p] = true
        delete sender.mortgages[p]
      }
    }
    for (const p of offer.receiverPropertyIds) {
      receiver.ownedProperties = receiver.ownedProperties.filter((x) => x !== p)
      sender.ownedProperties.push(p)
      if (receiver.mortgages[p]) {
        sender.mortgages[p] = true
        delete receiver.mortgages[p]
      }
    }

    offer.status = "ACCEPTED"
    this.invalidateConflictingTrades(offer)

    this.recordTransaction(
      "TRADE",
      `Trade accepted between ${sender.name} and ${receiver.name}.`,
      offer.senderCash + offer.receiverCash,
      sender.id,
      receiver.id,
    )
    return { success: true, state: await this.getState() }
  }

  async rejectTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const offer = this.tradeOffers.find((o) => o.id === tradeId)
    if (!offer || offer.status !== "PENDING") {
      return { success: false, state: await this.getState(), error: "Offer not found or not pending" }
    }
    if (offer.receiverId !== playerId && !this.devMode) {
      return { success: false, state: await this.getState(), error: "Only receiver can reject offer" }
    }
    offer.status = "REJECTED"
    return { success: true, state: await this.getState() }
  }

  async cancelTradeOffer(
    tradeId: string,
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const offer = this.tradeOffers.find((o) => o.id === tradeId)
    if (!offer || offer.status !== "PENDING") {
      return { success: false, state: await this.getState(), error: "Offer not found or not pending" }
    }
    if (offer.senderId !== playerId && !this.devMode) {
      return { success: false, state: await this.getState(), error: "Only sender can cancel offer" }
    }
    offer.status = "CANCELLED"
    return { success: true, state: await this.getState() }
  }

  async endSession(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    this.turnState = "GAME_OVER"
    this.activityLog.push({
      id: this.logIdCounter++,
      timestamp: Date.now(),
      playerId,
      playerName: this.players[playerId]?.name || "Host",
      playerColor: this.players[playerId]?.color || "#ffd700",
      type: "HOST_TERMINATED",
      description: "Host ended the game session.",
      amount: 0,
    })
    return { success: true, state: await this.getState() }
  }

  async resignPlayer(
    playerId: number,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    if (playerId < 0 || playerId >= this.players.length) {
      return { success: false, state: await this.getState(), error: "Invalid player ID." }
    }
    const player = this.players[playerId]
    if (player.isBankrupt) {
      return { success: false, state: await this.getState(), error: "Player has already resigned." }
    }

    player.isBankrupt = true
    const remainingCash = Math.max(0, player.money)
    player.money = 0

    // Liquidate properties to the bank
    for (const prop of player.ownedProperties) {
      player.buildings[prop] = 0
      player.mortgages[prop] = false
    }
    player.ownedProperties = []
    player.buildings = {}
    player.mortgages = {}

    this.addLog(playerId, "resignation", `${player.name} resigned from the match.`, -remainingCash)
    this.recordTransaction("RESIGNATION", `${player.name} resigned. Assets liquidated to bank.`, remainingCash, playerId, -1)

    // Cancel pending trades
    for (const trade of this.tradeOffers) {
      if (trade.status === "PENDING" && (trade.senderId === playerId || trade.receiverId === playerId)) {
        trade.status = "CANCELLED"
      }
    }

    const alive = this.players.filter((p) => !p.isBankrupt)
    if (alive.length <= 1) {
      this.turnState = "GAME_OVER"
      const winner = alive[0] || player
      this.addLog(winner.id, "game_over", `GAME OVER! ${winner.name} is the winner!`)
    } else if (this.activePlayerIndex === playerId) {
      this.advanceTurn(false)
    }

    return { success: true, state: await this.getState() }
  }

  async setDevMode(enabled: boolean, requesterId: number = 0): Promise<GameState> {
    if (requesterId !== 0) {
      throw new Error("Only the host (Player 0) can modify Dev Mode setting.")
    }
    if (this.gameStarted) {
      throw new Error("Cannot modify Dev Mode: Game settings are permanently locked while match is in progress.")
    }
    this.devMode = enabled
    if (enabled) {
      for (const p of this.players) {
        if (p.rotationsCompleted === 0 && p.money === 0) {
          p.money = this.rules.defaultStartingMoney || 25000
        }
      }
    }
    return this.getState()
  }

  async setActivePlayerIndex(playerId: number): Promise<GameState> {
    if (!this.devMode) return this.getState()
    if (playerId < 0 || playerId >= this.players.length) return this.getState()
    this.activePlayerIndex = playerId
    this.turnState = "WAITING_FOR_ROLL"
    this.turnStartedAt = Date.now()
    return this.getState()
  }

  async setTimerConfig(enabled: boolean, seconds: number): Promise<GameState> {
    this.timerEnabled = enabled
    this.timerSeconds = seconds
    return this.getState()
  }

  async handleTimeout(playerId?: number): Promise<{ success: boolean; state: GameState }> {
    if (!this.gameStarted || this.turnState === "GAME_OVER") return { success: false, state: await this.getState() }
    if (typeof playerId === "number" && playerId >= 0 && playerId !== this.activePlayerIndex && !this.devMode) {
      return { success: false, state: await this.getState() }
    }
    const player = this.players[this.activePlayerIndex]
    if (this.turnState === "WAITING_FOR_ACTION" || this.turnState === "RESOLVING_LANDING") {
      if (this.lastTurnResult?.eligibleToBuy) {
        await this.declinePropertyPurchase(this.activePlayerIndex)
      }
      this.addLog(this.activePlayerIndex, "timeout", `${player.name} timed out. Turn ended.`)
      this.advanceTurn(false)
      return { success: true, state: await this.getState() }
    }
    if (this.turnState === "WAITING_FOR_ROLL" || this.turnState === "EXTRA_TURN") {
      this.addLog(this.activePlayerIndex, "timeout", `${player.name} timed out. Turn skipped.`)
      this.advanceTurn(false)
      return { success: true, state: await this.getState() }
    }
    this.advanceTurn(false)
    return { success: true, state: await this.getState() }
  }

  async updatePlayerName(
    playerId: number,
    newName: string,
  ): Promise<{ success: boolean; state: GameState }> {
    const trimmed = newName.trim().substring(0, 20)
    if (trimmed && this.players[playerId]) {
      this.players[playerId].name = trimmed
      this.addLog(playerId, "rename", `Player ${playerId + 1} renamed to ${trimmed}`)
    }
    return { success: true, state: await this.getState() }
  }

  async updatePlayerColor(
    playerId: number,
    newColor: string,
  ): Promise<{ success: boolean; state: GameState; error?: string }> {
    const clean = newColor.trim().toLowerCase()
    if (!clean) {
      return { success: false, state: await this.getState(), error: "Color cannot be empty." }
    }
    if (!this.players[playerId]) {
      return { success: false, state: await this.getState(), error: "Invalid player ID." }
    }
    const isTaken = this.players.some((p, idx) => idx !== playerId && p.color?.toLowerCase() === clean)
    if (isTaken) {
      return {
        success: false,
        state: await this.getState(),
        error: `Color '${newColor}' is already chosen by another player.`,
      }
    }
    this.players[playerId].color = clean as any
    return { success: true, state: await this.getState() }
  }
}
