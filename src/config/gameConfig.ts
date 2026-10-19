/**
 * CROWNFALL — CENTRALIZED GAMEPLAY CONFIGURATION
 * Single Source of Truth for runtime rules and development/testing options.
 *
 * Switch automatic play on/off and configure delays directly here.
 */

export interface GameplayConfig {
  // =========================================================================
  // 1. DEVELOPMENT & TESTING ONLY SETTINGS
  // =========================================================================

  /**
   * Developer Testing Mode:
   * When enabled, permits controlling any player, rolling dice for any player,
   * and testing state transitions freely.
   */
  devModeDefault: boolean

  // =========================================================================
  // 2. AUTHORITATIVE GAME RULES
  // (Host-controlled in lobby, enforced authoritatively by C++ engine)
  // =========================================================================

  /**
   * Anywhere Building Rule:
   * When false, players can construct houses/hotels on eligible
   * properties they own from anywhere during their turn (no landing required).
   * When true, requires physically landing on the property.
   */
  requireLandingToBuild: boolean

  /**
   * Doubles Rule:
   * Rolling doubles grants an extra turn. Three consecutive doubles sends to Jail.
   */
  doublesRuleDefault: boolean

  /**
   * Starting Capital:
   * Cash awarded upon completing the first board rotation (Default: Rs. 25,000).
   */
  defaultStartingMoney: number

  /**
   * Turn Timer:
   * Optional authoritative countdown per turn (Default: enabled, 60 seconds).
   */
  turnTimerEnabledDefault: boolean
  turnTimerSecondsDefault: number

  /**
   * Building Voluntary Sale / Destruction Refund Percentage:
   * Established rule: 50% refund of the original construction cost,
   * rounded to the nearest Rs. 100 multiple.
   */
  buildingRefundPercentage: number

  /**
   * Pass Start Bonus:
   * Cash collected when passing or landing on Start after rotation 1 (Rs. 1,500).
   */
  passStartBonus: number
}

export const GAME_CONFIG: GameplayConfig = {
  // --- Development & Testing Settings ---
  devModeDefault: false,

  // --- Authoritative Game Rules ---
  requireLandingToBuild: false,
  doublesRuleDefault: true,
  defaultStartingMoney: 25000,
  turnTimerEnabledDefault: true,
  turnTimerSecondsDefault: 60,
  buildingRefundPercentage: 50,
  passStartBonus: 1500,
}
