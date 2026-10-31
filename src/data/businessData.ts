/**
 * Authoritative Master Game Data for Crownfall (formerly Dominion: Business Edition)
 * Sourced directly from BUSINESS_Master_Datasheet.xlsx
 *
 * DO NOT EDIT MANUALLY. Matches C++ Game Engine data structures identically.
 */

export type ColorGroup = "GREEN" | "YELLOW" | "RED" | "BLUE" | "NONE"

export interface PropertyDefinition {
  id: string
  name: string
  colorGroup: ColorGroup
  purchasePrice: number
  baseRent: number
  rentOneHouse: number
  rentTwoHouses: number
  rentThreeHouses: number
  hotelRent: number
  buildingCost: number
  mortgageValue: number
  sourceStatus: string
}

export interface SpecialPropertyDefinition {
  id: string
  name: string
  purchasePrice: number
  mortgageValue: number
  rentAlone: string
  rentWithPair: string
  pair: string
  pairProperty?: string
  isDiceMultiplier?: boolean
}

export type SpaceType = "corner" | "city" | "special" | "chance" | "chest" | "tax"

export interface BoardSpaceDefinition {
  index: number
  name: string
  type: SpaceType
  colorGroup: ColorGroup
  propertyId?: string
  side: "bottom" | "left" | "top" | "right"
  description?: string

}

export type EventKind = "receive" | "pay" | "move" | "jail" | "rest" | "players" | "buildings"

export interface Declaration {
  diceSum: number
  section: "Odd" | "Even"
  title: string
  declaration: string
  kind: EventKind
  targetSpaceIndex?: number
  alternateTargetSpaceIndex?: number
  effect: string
  effectNote: string
}

export interface ColorGroupData {
  name: string
  properties: string[]
  rule: string
}

// 1. CITY PROPERTIES (20 cities, exact spellings preserved)
export const CITY_PROPERTIES: Record<string, PropertyDefinition> = {
  // GREEN
  margoa: {
    id: "margoa",
    name: "Margoa",
    colorGroup: "GREEN",
    purchasePrice: 4000,
    baseRent: 400,
    rentOneHouse: 2000,
    rentTwoHouses: 3400,
    rentThreeHouses: 4800,
    hotelRent: 6400,
    buildingCost: 5000,
    mortgageValue: 2000,
    sourceStatus: "E",
  },
  cochin: {
    id: "cochin",
    name: "Cochin",
    colorGroup: "GREEN",
    purchasePrice: 3000,
    baseRent: 300,
    rentOneHouse: 1500,
    rentTwoHouses: 2600,
    rentThreeHouses: 3600,
    hotelRent: 4800,
    buildingCost: 3500,
    mortgageValue: 1500,
    sourceStatus: "E",
  },
  ootacamund: {
    id: "ootacamund",
    name: "Ootacamund",
    colorGroup: "GREEN",
    purchasePrice: 2500,
    baseRent: 300,
    rentOneHouse: 1200,
    rentTwoHouses: 2100,
    rentThreeHouses: 3000,
    hotelRent: 4000,
    buildingCost: 3000,
    mortgageValue: 1300,
    sourceStatus: "E",
  },
  chandigadh: {
    id: "chandigadh",
    name: "Chandigadh",
    colorGroup: "GREEN",
    purchasePrice: 2500,
    baseRent: 200,
    rentOneHouse: 900,
    rentTwoHouses: 1600,
    rentThreeHouses: 2500,
    hotelRent: 3500,
    buildingCost: 3000,
    mortgageValue: 1300,
    sourceStatus: "Sourced",
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    colorGroup: "GREEN",
    purchasePrice: 6000,
    baseRent: 800,
    rentOneHouse: 3000,
    rentTwoHouses: 4300,
    rentThreeHouses: 5500,
    hotelRent: 7500,
    buildingCost: 5000,
    mortgageValue: 3000,
    sourceStatus: "Sourced",
  },

  // YELLOW
  simla: {
    id: "simla",
    name: "Simla",
    colorGroup: "YELLOW",
    purchasePrice: 2200,
    baseRent: 200,
    rentOneHouse: 1100,
    rentTwoHouses: 1900,
    rentThreeHouses: 2600,
    hotelRent: 3500,
    buildingCost: 2500,
    mortgageValue: 1100,
    sourceStatus: "E",
  },
  amritsar: {
    id: "amritsar",
    name: "Amritsar",
    colorGroup: "YELLOW",
    purchasePrice: 3300,
    baseRent: 300,
    rentOneHouse: 1600,
    rentTwoHouses: 2800,
    rentThreeHouses: 4000,
    hotelRent: 5300,
    buildingCost: 4000,
    mortgageValue: 1700,
    sourceStatus: "E",
  },
  srinagar: {
    id: "srinagar",
    name: "Srinagar",
    colorGroup: "YELLOW",
    purchasePrice: 5000,
    baseRent: 600,
    rentOneHouse: 3500,
    rentTwoHouses: 5000,
    rentThreeHouses: 7000,
    hotelRent: 8000,
    buildingCost: 6000,
    mortgageValue: 2500,
    sourceStatus: "Sourced",
  },
  madras: {
    id: "madras",
    name: "Madras",
    colorGroup: "YELLOW",
    purchasePrice: 7000,
    baseRent: 700,
    rentOneHouse: 3500,
    rentTwoHouses: 6000,
    rentThreeHouses: 8400,
    hotelRent: 11200,
    buildingCost: 6000,
    mortgageValue: 3500,
    sourceStatus: "E",
  },
  bangalore: {
    id: "bangalore",
    name: "Bangalore",
    colorGroup: "YELLOW",
    purchasePrice: 4000,
    baseRent: 400,
    rentOneHouse: 2000,
    rentTwoHouses: 3400,
    rentThreeHouses: 4800,
    hotelRent: 6400,
    buildingCost: 5000,
    mortgageValue: 2000,
    sourceStatus: "E",
  },

  // RED
  darjeeling: {
    id: "darjeeling",
    name: "Darjeeling",
    colorGroup: "RED",
    purchasePrice: 2500,
    baseRent: 200,
    rentOneHouse: 1200,
    rentTwoHouses: 2600,
    rentThreeHouses: 3500,
    hotelRent: 5000,
    buildingCost: 3000,
    mortgageValue: 1300,
    sourceStatus: "Sourced",
  },
  ahmedabad: {
    id: "ahmedabad",
    name: "Ahmedabad",
    colorGroup: "RED",
    purchasePrice: 4000,
    baseRent: 400,
    rentOneHouse: 2000,
    rentTwoHouses: 3400,
    rentThreeHouses: 4800,
    hotelRent: 6400,
    buildingCost: 5000,
    mortgageValue: 2000,
    sourceStatus: "E",
  },
  bombay: {
    id: "bombay",
    name: "Bombay",
    colorGroup: "RED",
    purchasePrice: 8500,
    baseRent: 1200,
    rentOneHouse: 4000,
    rentTwoHouses: 7200,
    rentThreeHouses: 10200,
    hotelRent: 13600,
    buildingCost: 7000,
    mortgageValue: 4300,
    sourceStatus: "Partial source",
  },
  hyderabad: {
    id: "hyderabad",
    name: "Hyderabad",
    colorGroup: "RED",
    purchasePrice: 3500,
    baseRent: 400,
    rentOneHouse: 1800,
    rentTwoHouses: 3000,
    rentThreeHouses: 4200,
    hotelRent: 5600,
    buildingCost: 4000,
    mortgageValue: 1800,
    sourceStatus: "E",
  },
  kolkatta: {
    id: "kolkatta",
    name: "Kolkatta",
    colorGroup: "RED",
    purchasePrice: 6500,
    baseRent: 700,
    rentOneHouse: 3200,
    rentTwoHouses: 5500,
    rentThreeHouses: 7800,
    hotelRent: 10400,
    buildingCost: 5500,
    mortgageValue: 3300,
    sourceStatus: "E",
  },

  // BLUE
  patna: {
    id: "patna",
    name: "Patna",
    colorGroup: "BLUE",
    purchasePrice: 2000,
    baseRent: 200,
    rentOneHouse: 1000,
    rentTwoHouses: 1700,
    rentThreeHouses: 2400,
    hotelRent: 3200,
    buildingCost: 2500,
    mortgageValue: 1000,
    sourceStatus: "E",
  },
  indore: {
    id: "indore",
    name: "Indore",
    colorGroup: "BLUE",
    purchasePrice: 1500,
    baseRent: 200,
    rentOneHouse: 800,
    rentTwoHouses: 1300,
    rentThreeHouses: 1800,
    hotelRent: 2400,
    buildingCost: 2000,
    mortgageValue: 800,
    sourceStatus: "E",
  },
  jaipur: {
    id: "jaipur",
    name: "Jaipur",
    colorGroup: "BLUE",
    purchasePrice: 3000,
    baseRent: 300,
    rentOneHouse: 1500,
    rentTwoHouses: 2600,
    rentThreeHouses: 3600,
    hotelRent: 4800,
    buildingCost: 3500,
    mortgageValue: 1500,
    sourceStatus: "E",
  },
  agra: {
    id: "agra",
    name: "Agra",
    colorGroup: "BLUE",
    purchasePrice: 2500,
    baseRent: 300,
    rentOneHouse: 1200,
    rentTwoHouses: 2100,
    rentThreeHouses: 3000,
    hotelRent: 4000,
    buildingCost: 3000,
    mortgageValue: 1300,
    sourceStatus: "E",
  },
  kanpur: {
    id: "kanpur",
    name: "Kanpur",
    colorGroup: "BLUE",
    purchasePrice: 4000,
    baseRent: 400,
    rentOneHouse: 2000,
    rentTwoHouses: 3400,
    rentThreeHouses: 4800,
    hotelRent: 6400,
    buildingCost: 5000,
    mortgageValue: 2000,
    sourceStatus: "E",
  },
}

// 2. SPECIAL PROPERTIES (6 properties)
export const SPECIAL_PAIR_MAP: Record<string, string> = {
  railway: "roadways",
  roadways: "railway",
  electrical_company: "air_india",
  air_india: "electrical_company",
  airways: "electrical_company",
  water_works: "motor_boat",
  motor_boat: "water_works",
}

export const SPECIAL_PROPERTIES: Record<string, SpecialPropertyDefinition> = {
  railway: {
    id: "railway",
    name: "Railway",
    purchasePrice: 9500,
    mortgageValue: 4800,
    rentAlone: "₹600 fixed",
    rentWithPair: "max(₹1,000 × Hotels, ₹2,000)",
    pair: "Railway + Roadways",
    pairProperty: "roadways",
    isDiceMultiplier: false,
  },
  roadways: {
    id: "roadways",
    name: "Roadways",
    purchasePrice: 3200,
    mortgageValue: 1600,
    rentAlone: "₹50 × dice",
    rentWithPair: "₹100 × dice",
    pair: "Railway + Roadways",
    pairProperty: "railway",
    isDiceMultiplier: true,
  },
  electrical_company: {
    id: "electrical_company",
    name: "Electrical Company",
    purchasePrice: 2500,
    mortgageValue: 1300,
    rentAlone: "₹25 × dice",
    rentWithPair: "₹75 × dice",
    pair: "Electrical Company + Air India",
    pairProperty: "air_india",
    isDiceMultiplier: true,
  },
  air_india: {
    id: "air_india",
    name: "Air India",
    purchasePrice: 10500,
    mortgageValue: 5300,
    rentAlone: "₹800 fixed",
    rentWithPair: "max(₹1,500 × Hotels, ₹2,500)",
    pair: "Electrical Company + Air India",
    pairProperty: "electrical_company",
    isDiceMultiplier: false,
  },
  water_works: {
    id: "water_works",
    name: "Water Works",
    purchasePrice: 3200,
    mortgageValue: 1600,
    rentAlone: "₹50 × dice",
    rentWithPair: "₹100 × dice",
    pair: "Water Works + Motor Boat",
    pairProperty: "motor_boat",
    isDiceMultiplier: true,
  },
  motor_boat: {
    id: "motor_boat",
    name: "Motor Boat",
    purchasePrice: 5500,
    mortgageValue: 2800,
    rentAlone: "₹75 × dice",
    rentWithPair: "₹150 × dice",
    pair: "Water Works + Motor Boat",
    pairProperty: "water_works",
    isDiceMultiplier: true,
  },
}

// 3. COLOR GROUPS (5 cities per group)
export const COLOR_GROUPS: Record<ColorGroup, ColorGroupData> = {
  GREEN: {
    name: "Green",
    properties: ["Margoa", "Cochin", "Ootacamund", "Chandigadh", "Delhi"],
    rule: "Undeveloped/base rent doubles when complete group is owned",
  },
  YELLOW: {
    name: "Yellow",
    properties: ["Simla", "Amritsar", "Srinagar", "Madras", "Bangalore"],
    rule: "Undeveloped/base rent doubles when complete group is owned",
  },
  RED: {
    name: "Red",
    properties: ["Darjeeling", "Ahmedabad", "Bombay", "Hyderabad", "Kolkatta"],
    rule: "Undeveloped/base rent doubles when complete group is owned",
  },
  BLUE: {
    name: "Blue",
    properties: ["Patna", "Indore", "Jaipur", "Agra", "Kanpur"],
    rule: "Undeveloped/base rent doubles when complete group is owned",
  },
  NONE: {
    name: "Special",
    properties: [],
    rule: "",
  },
}

// 4. BOARD SPACES (36 spaces, exact physical board sequence)
export const BOARD_SPACES: BoardSpaceDefinition[] = [
  // Side 1: Bottom edge (moving Right to Left: 0 at Bottom-Right, 9 at Bottom-Left)
  {
    index: 0,
    name: "START",
    type: "corner",
    colorGroup: "NONE",
    side: "bottom",
  },
  {
    index: 1,
    name: "BOMBAY",
    type: "city",
    colorGroup: "RED",
    propertyId: "bombay",
    side: "bottom",
  },
  {
    index: 2,
    name: "WATER WORKS",
    type: "special",
    colorGroup: "NONE",
    propertyId: "water_works",
    side: "bottom",
  },
  {
    index: 3,
    name: "RAILWAY",
    type: "special",
    colorGroup: "NONE",
    propertyId: "railway",
    side: "bottom",
  },
  {
    index: 4,
    name: "AHMEDABAD",
    type: "city",
    colorGroup: "RED",
    propertyId: "ahmedabad",
    side: "bottom",
  },
  {
    index: 5,
    name: "INCOME TAX",
    description: "10% of net earnings in the current round (actual income minus actual expenses).",

    type: "tax",
    colorGroup: "NONE",
    side: "bottom",
  },
  {
    index: 6,
    name: "INDORE",
    type: "city",
    colorGroup: "BLUE",
    propertyId: "indore",
    side: "bottom",
  },
  {
    index: 7,
    name: "CHANCE",
    type: "chance",
    colorGroup: "NONE",
    side: "bottom",
  },
  {
    index: 8,
    name: "JAIPUR",
    type: "city",
    colorGroup: "BLUE",
    propertyId: "jaipur",
    side: "bottom",
  },

  // Corner 2: Bottom-Left
  { index: 9, name: "JAIL", type: "corner", colorGroup: "NONE", side: "left" },

  // Side 2: Left edge (moving Bottom to Top: 9 at Bottom-Left, 18 at Top-Left)
  {
    index: 10,
    name: "DELHI",
    type: "city",
    colorGroup: "GREEN",
    propertyId: "delhi",
    side: "left",
  },
  {
    index: 11,
    name: "CHANDIGADH",
    type: "city",
    colorGroup: "GREEN",
    propertyId: "chandigadh",
    side: "left",
  },
  {
    index: 12,
    name: "ELECTRICAL COMPANY",
    type: "special",
    colorGroup: "NONE",
    propertyId: "electrical_company",
    side: "left",
  },
  {
    index: 13,
    name: "ROADWAYS",
    type: "special",
    colorGroup: "NONE",
    propertyId: "roadways",
    side: "left",
  },
  {
    index: 14,
    name: "SIMLA",
    type: "city",
    colorGroup: "YELLOW",
    propertyId: "simla",
    side: "left",
  },
  {
    index: 15,
    name: "AMRITSAR",
    type: "city",
    colorGroup: "YELLOW",
    propertyId: "amritsar",
    side: "left",
  },
  {
    index: 16,
    name: "COMMUNITY CHEST",
    type: "chest",
    colorGroup: "NONE",
    side: "left",
  },
  {
    index: 17,
    name: "SRINAGAR",
    type: "city",
    colorGroup: "YELLOW",
    propertyId: "srinagar",
    side: "left",
  },

  // Corner 3: Top-Left
  { index: 18, name: "CLUB", type: "corner", colorGroup: "NONE", side: "top" },

  // Side 3: Top edge (moving Left to Right: 18 at Top-Left, 27 at Top-Right)
  {
    index: 19,
    name: "AGRA",
    type: "city",
    colorGroup: "BLUE",
    propertyId: "agra",
    side: "top",
  },
  {
    index: 20,
    name: "CHANCE",
    type: "chance",
    colorGroup: "NONE",
    side: "top",
  },
  {
    index: 21,
    name: "KANPUR",
    type: "city",
    colorGroup: "BLUE",
    propertyId: "kanpur",
    side: "top",
  },
  {
    index: 22,
    name: "PATNA",
    type: "city",
    colorGroup: "BLUE",
    propertyId: "patna",
    side: "top",
  },
  {
    index: 23,
    name: "DARJEELING",
    type: "city",
    colorGroup: "RED",
    propertyId: "darjeeling",
    side: "top",
  },
  {
    index: 24,
    name: "AIR INDIA",
    type: "special",
    colorGroup: "NONE",
    propertyId: "air_india",
    side: "top",
  },
  {
    index: 25,
    name: "KOLKATTA",
    type: "city",
    colorGroup: "RED",
    propertyId: "kolkatta",
    side: "top",
  },
  {
    index: 26,
    name: "HYDERABAD",
    type: "city",
    colorGroup: "RED",
    propertyId: "hyderabad",
    side: "top",
  },

  // Corner 4: Top-Right
  {
    index: 27,
    name: "REST HOUSE",
    type: "corner",
    colorGroup: "NONE",
    side: "right",
  },

  // Side 4: Right edge (moving Top to Bottom: 27 at Top-Right, 0 at Bottom-Right)
  {
    index: 28,
    name: "MADRAS",
    type: "city",
    colorGroup: "YELLOW",
    propertyId: "madras",
    side: "right",
  },
  {
    index: 29,
    name: "COMMUNITY CHEST",
    type: "chest",
    colorGroup: "NONE",
    side: "right",
  },
  {
    index: 30,
    name: "BANGALORE",
    type: "city",
    colorGroup: "YELLOW",
    propertyId: "bangalore",
    side: "right",
  },
  {
    index: 31,
    name: "WEALTH TAX",
    description: "Assessment on property portfolio: ₹50 undeveloped, ₹100 per house, ₹150 per hotel.",
    type: "tax",
    colorGroup: "NONE",
    side: "right",
  },
  {
    index: 32,
    name: "OOTACAMUND",
    type: "city",
    colorGroup: "GREEN",
    propertyId: "ootacamund",
    side: "right",
  },
  {
    index: 33,
    name: "COCHIN",
    type: "city",
    colorGroup: "GREEN",
    propertyId: "cochin",
    side: "right",
  },
  {
    index: 34,
    name: "MOTOR BOAT",
    type: "special",
    colorGroup: "NONE",
    propertyId: "motor_boat",
    side: "right",
  },
  {
    index: 35,
    name: "MARGOA",
    type: "city",
    colorGroup: "GREEN",
    propertyId: "margoa",
    side: "right",
  },
]

// 5. CHANCE DECLARATIONS (Dice-sum 2-12)
export const CHANCE_DECLARATIONS: Declaration[] = [
  {
    diceSum: 2,
    section: "Even",
    title: "Loss in Share Market",
    declaration: "Loss in share market, Rs. 2000",
    kind: "pay",
    effect: "− ₹2,000",
    effectNote: "YOU → BANK",
  },
  {
    diceSum: 3,
    section: "Odd",
    title: "Lottery Prize",
    declaration: "Lottery prize, Rs. 2500",
    kind: "receive",
    effect: "+ ₹2,500",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 4,
    section: "Even",
    title: "Accident Fine",
    declaration:
      "Fine for accident due to driving under liquor influence, Rs. 1000",
    kind: "pay",
    effect: "− ₹1,000",
    effectNote: "FINE · YOU → BANK",
  },
  {
    diceSum: 5,
    section: "Odd",
    title: "Consolation Prize",
    declaration: "You have won consolation competition prize of Rs. 1000",
    kind: "receive",
    effect: "+ ₹1,000",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 6,
    section: "Even",
    title: "House Renovating",
    declaration: "House Renovating, Rs. 1500",
    kind: "pay",
    effect: "− ₹1,500",
    effectNote: "YOU → BANK",
  },
  {
    diceSum: 7,
    section: "Odd",
    title: "Jack Pot",
    declaration: "You have won Jack Pot of Rs. 2000",
    kind: "receive",
    effect: "+ ₹2,000",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 8,
    section: "Even",
    title: "Fire Loss",
    declaration: "Loss due to fire in godown, Rs. 3000",
    kind: "pay",
    effect: "− ₹3,000",
    effectNote: "LOSS IN GODOWN · YOU → BANK",
  },
  {
    diceSum: 9,
    section: "Odd",
    title: "Go Back to Bombay",
    declaration:
      "Go back to Bombay. If you have to pass starting point, collect Rs. 1500 & go to Darjeeling.",
    kind: "move",
    targetSpaceIndex: 1,
    alternateTargetSpaceIndex: 23,
    effect: "MOVE TO BOMBAY",
    effectNote: "PASS START: + ₹1,500 · THEN DARJEELING",
  },
  {
    diceSum: 10,
    section: "Even",
    title: "Go to Jail",
    declaration: "Go to Jail",
    kind: "jail",
    effect: "GO TO JAIL",
    effectNote: "MOVE DIRECTLY · DO NOT PASS START",
  },
  {
    diceSum: 11,
    section: "Odd",
    title: "Export Performance Prize",
    declaration: "Prize for best performance in export, Rs. 3000",
    kind: "receive",
    effect: "+ ₹3,000",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 12,
    section: "Even",
    title: "Rest House",
    declaration: "Go to Rest House. You cannot play next turn.",
    kind: "rest",
    effect: "REST HOUSE",
    effectNote: "MISS YOUR NEXT TURN",
  },
]

// 6. COMMUNITY CHEST DECLARATIONS (Dice-sum 2-12)
export const CHEST_DECLARATIONS: Declaration[] = [
  {
    diceSum: 2,
    section: "Even",
    title: "Birthday Celebration",
    declaration: "If it is your Birthday. Collect from each player Rs. 500",
    kind: "players",
    effect: "+ ₹500 EACH",
    effectNote: "EACH PLAYER → YOU",
  },
  {
    diceSum: 3,
    section: "Odd",
    title: "Go to Jail",
    declaration: "Go to Jail",
    kind: "jail",
    effect: "GO TO JAIL",
    effectNote: "MOVE DIRECTLY · DO NOT PASS START",
  },
  {
    diceSum: 4,
    section: "Even",
    title: "Beauty Contest",
    declaration: "1st Prize in Beauty contest, Rs. 2500",
    kind: "receive",
    effect: "+ ₹2,500",
    effectNote: "1ST PRIZE · BANK → YOU",
  },
  {
    diceSum: 5,
    section: "Odd",
    title: "School & Medical Fees",
    declaration: "School and medical fees, Rs. 1000",
    kind: "pay",
    effect: "− ₹1,000",
    effectNote: "YOU → BANK",
  },
  {
    diceSum: 6,
    section: "Even",
    title: "Income Tax Refund",
    declaration: "Income tax refund, Rs. 2000",
    kind: "receive",
    effect: "+ ₹2,000",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 7,
    section: "Odd",
    title: "Marriage Celebration",
    declaration: "Marriage celebration, Rs. 2000",
    kind: "pay",
    effect: "− ₹2,000",
    effectNote: "YOU → BANK",
  },
  {
    diceSum: 8,
    section: "Even",
    title: "Rest House",
    declaration: "Go to Rest House. You cannot play next turn.",
    kind: "rest",
    effect: "REST HOUSE",
    effectNote: "MISS YOUR NEXT TURN",
  },
  {
    diceSum: 9,
    section: "Odd",
    title: "General Repairs",
    declaration:
      "Make general repair on all your houses. Each house pay Rs. 50. Each hotel pay Rs. 100.",
    kind: "buildings",
    effect: "₹50 · ₹100",
    effectNote: "EACH HOUSE · EACH HOTEL",
  },
  {
    diceSum: 10,
    section: "Even",
    title: "Interest on Shares",
    declaration: "Receive interest on shares, Rs. 1500",
    kind: "receive",
    effect: "+ ₹1,500",
    effectNote: "BANK → YOU",
  },
  {
    diceSum: 11,
    section: "Odd",
    title: "Insurance Premium",
    declaration: "Pay insurance premium, Rs. 1500",
    kind: "pay",
    effect: "− ₹1,500",
    effectNote: "YOU → BANK",
  },
  {
    diceSum: 12,
    section: "Even",
    title: "Sale of Stocks",
    declaration: "Sale of stocks, collect Rs. 3000",
    kind: "receive",
    effect: "+ ₹3,000",
    effectNote: "BANK → YOU",
  },
]

// Helper functions
export function getCityProperty(
  nameOrId: string,
): PropertyDefinition | undefined {
  const norm = nameOrId.toLowerCase().replace(/\s+/g, "_")
  if (CITY_PROPERTIES[norm]) return CITY_PROPERTIES[norm]
  return Object.values(CITY_PROPERTIES).find(
    (c) => c.name.toLowerCase() === nameOrId.toLowerCase(),
  )
}

export function getSpecialProperty(
  nameOrId: string,
): SpecialPropertyDefinition | undefined {
  const norm = nameOrId.toLowerCase().replace(/\s+/g, "_")
  if (SPECIAL_PROPERTIES[norm]) return SPECIAL_PROPERTIES[norm]
  return Object.values(SPECIAL_PROPERTIES).find(
    (s) => s.name.toLowerCase() === nameOrId.toLowerCase(),
  )
}

export function getAnyProperty(
  nameOrId: string,
): PropertyDefinition | SpecialPropertyDefinition | undefined {
  return getCityProperty(nameOrId) || getSpecialProperty(nameOrId)
}
