import React, { useState } from "react"

interface Section {
  id: string
  title: string
  content: string[]
}

const SECTIONS: Section[] = [
  {
    id: "objective",
    title: "1. Objective & Winning Conditions",
    content: [
      "Crownfall is an authoritative real estate strategy game where tycoons build economic dominance through strategic property acquisition, development, and portfolio management.",
      "Win by bankrupting all rival tycoons, or by holding the highest calculated Net Worth when a match concludes.",
      "Net Worth calculation combines your current cash reserves, current depreciated property values, and building investments (50% value), minus any active mortgage liabilities.",
    ],
  },
  {
    id: "dice_mechanics",
    title: "2. Authoritative Dice Rolls",
    content: [
      "Authoritative Dice: Each move is governed by two synchronized 6-sided dice.",
      "Doubles Bonus: Rolling matching dice awards an immediate subsequent roll during the active turn.",
      "Speeding Penalty: Rolling three consecutive doubles in a single turn constitutes reckless velocity and sends your token directly to Jail detention.",
      "Multiplier Scaling: Dynamic utility properties multiply the rolled dice total to establish rent obligations.",
    ],
  },
  {
    id: "starting_capital",
    title: "3. Zero Starting Balance & Initial Lap",
    content: [
      "Zero Starting Balance: All tycoons enter the match with ₹0 starting cash in hand.",
      "Configured Starting Capital: The host configures starting funds between ₹40,000 and ₹65,000 (Default: ₹45,000).",
      "First Lap Payout: Players receive their full configured Starting Capital only upon completing their first complete rotation around the board (crossing or landing on Start).",
    ],
  },
  {
    id: "rotation_rewards",
    title: "4. Subsequent Rotation Dividends",
    content: [
      "Start Crossing Dividends: Each subsequent crossing of Start after your first rotation awards a 5% dividend of starting capital.",
      "Rounding Precision: Dividends are rounded to the nearest ₹100 (for example, ₹2,300 on a ₹45,000 baseline).",
      "Continuous Growth: Completing laps supplies regular liquidity to sustain developments and rent obligations.",
    ],
  },
  {
    id: "first_rotation_ban",
    title: "5. First-Rotation Property Acquisition Ban",
    content: [
      "Acquisition Restriction: Tycoons are strictly prohibited from purchasing any properties during their first rotation around the board.",
      "Equal Starting Field: You must complete your initial circuit and collect your starting capital before acquiring real estate.",
      "Strategic Positioning: Use the first rotation to assess opponents' trajectories and plan monopoly targets.",
    ],
  },
  {
    id: "property_purchase",
    title: "6. Property Purchasing & Decline",
    content: [
      "Direct Acquisition: After completing your first rotation, landing on an unowned property grants you the right to purchase it at the listed deed price.",
      "Decline Option: If you choose not to purchase, the property remains unowned until another tycoon lands on it.",
      "Deed Registry: Purchased properties are immediately added to your title portfolio and begin collecting rent from visitors.",
    ],
  },
  {
    id: "monopolies",
    title: "7. Color Monopolies & Set Ownership",
    content: [
      "Monopoly Formation: Owning every property within a color set completes the group monopoly.",
      "Doubled Base Rent: Undeveloped properties within a completed monopoly collect double the base rent listed on the deed.",
      "Development Unlock: Completing a color set is a mandatory prerequisite before constructing houses or hotels.",
    ],
  },
  {
    id: "build_modes",
    title: "8. Build Modes (Mode A vs. Mode B)",
    content: [
      "Host Configuration: The match host designates the building rule during room creation.",
      "Mode A (Construct Anywhere): Construct improvements on your monopolies from anywhere at any time during your turn (up to 1 house per property per turn).",
      "Mode B (Physical Landing): You must physically land on a property within your monopoly to construct an improvement on it.",
    ],
  },
  {
    id: "building_progression",
    title: "9. Houses & Hotel Upgrades",
    content: [
      "Even Construction: Houses must be built evenly across all properties in a color group.",
      "Upgrade Sequence: Construct up to 3 houses per property at the listed building cost.",
      "Hotel Conversion: Purchasing the 4th upgrade converts 3 houses into a premier Hotel.",
      "Rent Maximization: Developed hotels generate the highest rent collection on the board.",
    ],
  },
  {
    id: "rent_calculations",
    title: "10. Rent Collection & Calculations",
    content: [
      "Mandatory Settlement: Landing on an opponent's unmortgaged property requires immediate rent payment according to deed status.",
      "Monopoly Multiplier: Undeveloped monopolies double base rent. Buildings scale rent exponentially.",
      "Mortgage Immunity: Opponents landing on mortgaged properties pay ₹0 rent.",
    ],
  },
  {
    id: "mortgage_system",
    title: "11. Mortgage System & Interest Rates",
    content: [
      "Emergency Liquidity: Mortgaging an unimproved property to the Bank yields 50% of its base purchase price.",
      "Zero Rent While Mortgaged: Mortgaged properties collect no rent from visiting players.",
      "Unmortgage Repayment: City properties require repaying the mortgage value plus 10% interest. Special utilities require 0% interest.",
      "Prerequisite: All buildings on a color set must be liquidated before mortgaging any property in the group.",
    ],
  },
  {
    id: "depreciation",
    title: "12. Ordinary Property Depreciation",
    content: [
      "Rotation Wear: Ordinary city properties depreciate by 10% of their base price each time the owner completes a full rotation around the board.",
      "Depreciation Floor: City properties stop depreciating once they reach a 50% minimum value floor.",
      "Valuation Impact: Depreciated values affect player Net Worth and liquidation, while mortgage values and building costs remain constant.",
    ],
  },
  {
    id: "special_properties",
    title: "13. Special Properties & Utilities",
    content: [
      "Unique Assets: Electric Company, Water Works, Railway, and Airways operate under specialized commercial rules.",
      "Immune to Depreciation: Special properties retain 100% resale value and do not suffer rotation depreciation.",
      "Zero Mortgage Interest: Special properties incur 0% interest when unmortgaged.",
      "Dynamic Rent: Utilities scale rent by dice roll multipliers (4x for 1 utility, 10x for both). Transport stations scale rent exponentially based on the count of stations owned.",
    ],
  },
  {
    id: "chance_chest",
    title: "14. Chance & Community Chest Cards",
    content: [
      "Authoritative Draws: Landing on Chance or Community Chest draws an authoritative card from the deck.",
      "Diverse Events: Cards include municipal tax assessments, unexpected dividends, street repair charges, spatial teleportation, or detention orders.",
      "Immediate Execution: Card effects execute automatically upon draw.",
    ],
  },
  {
    id: "jail_mechanics",
    title: "15. Jail Detention & Escape Rules",
    content: [
      "Entering Detention: Sent to Jail via Go to Jail square, Chance/Chest card, or rolling 3 consecutive doubles.",
      "Free Escape via Doubles: While detained, you have up to 2 turns to attempt rolling doubles. Rolling doubles immediately releases you and advances your token.",
      "Administrative Release: If doubles are not rolled after 2 attempts, release requires paying a ₹500 administrative fine.",
      "Just Visiting: Landing on the Jail tile during normal perimeter movement places your token on the outer strip with zero penalty.",
    ],
  },
  {
    id: "rest_club",
    title: "16. Rest House & Club Mechanics",
    content: [
      "Rest House Dividend & Skip: Landing on Rest House awards the visitor 5% of each active rival's positive current-round net income. The visiting player skips exactly one subsequent scheduled turn.",
      "Rest House Protection: Safe skip behavior ensures you miss exactly 1 turn without infinite lock.",
      "Club Charge: Landing on Club requires the visitor to pay 5% of each opponent's positive current-round net income to that opponent.",
    ],
  },
  {
    id: "bankruptcy",
    title: "17. Trading, Debt Settlement & Bankruptcy",
    content: [
      "Peer-to-Peer Trading: Propose mutually agreed exchanges of properties and cash with any active opponent.",
      "Debt Settlement: When cash is insufficient to pay debts, liquidate buildings at 50% cost and mortgage unimproved properties.",
      "Authoritative Bankruptcy: If a player cannot satisfy an outstanding debt after exhausting all liquidation options, they must declare Bankruptcy.",
      "Elimination: All remaining assets are surrendered to the creditor or returned to the Bank, and the bankrupt player is eliminated from the match.",
    ],
  },
]

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const [activeSectionId, setActiveSectionId] = useState<string>("objective")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const activeSection =
    filteredSections.find((s) => s.id === activeSectionId) ||
    filteredSections[0] ||
    SECTIONS[0]

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal-sheet how-to-play-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "780px",
          maxWidth: "min(780px, 96vw)",
          maxHeight: "min(90vh, 90dvh)",
          height: "min(680px, 90dvh)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div className="sheet-handle" style={{ margin: "8px auto 4px" }} />

        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.25))",
            background: "var(--glass-header, rgba(255, 255, 255, 0.04))",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: "18px",
                fontWeight: 800,
                color: "var(--gold-bright, #d97706)",
                margin: 0,
                letterSpacing: "0.04em",
              }}
            >
              HOW TO PLAY CROWNFALL
            </h2>
            <p
              style={{
                fontSize: "11px",
                color: "var(--ink-soft, #78716c)",
                margin: "2px 0 0",
              }}
            >
              Authoritative rules, rotation rewards &amp; strategic financial mechanics
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="action-btn"
            style={{
              width: "30px",
              height: "30px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "rgba(0, 0, 0, 0.06)",
              border: "1px solid rgba(200, 155, 69, 0.35)",
              color: "var(--ink-soft, #44403c)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
            aria-label="Close guide"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.15))",
            background: "rgba(0, 0, 0, 0.02)",
          }}
        >
          <input
            type="text"
            placeholder="Search rules, rotation rewards, jail, mortgages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.3))",
              background: "var(--input-bg, #ffffff)",
              color: "var(--text-primary, #1c1917)",
              outline: "none",
            }}
          />
        </div>

        {/* Body content: split 2 columns (Topics / Detail) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            flex: 1,
            overflow: "hidden",
          }}
        >
          {/* Table of contents */}
          <div
            className="custom-scrollbar"
            style={{
              borderRight: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.15))",
              overflowY: "auto",
              background: "rgba(0, 0, 0, 0.02)",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSectionId(s.id)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: activeSection.id === s.id ? 700 : 500,
                  color:
                    activeSection.id === s.id
                      ? "var(--gold-bright, #d97706)"
                      : "var(--ink, #1c1917)",
                  background:
                    activeSection.id === s.id
                      ? "rgba(200, 155, 69, 0.18)"
                      : "transparent",
                  border:
                    activeSection.id === s.id
                      ? "1px solid rgba(200, 155, 69, 0.4)"
                      : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1.3,
                }}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Section details */}
          <div
            className="custom-scrollbar"
            style={{
              padding: "20px 24px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <h3
              style={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--gold-bright, #d97706)",
                margin: 0,
                letterSpacing: "0.02em",
                borderBottom: "1px solid rgba(200, 155, 69, 0.2)",
                paddingBottom: "8px",
              }}
            >
              {activeSection.title}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {activeSection.content.map((paragraph, idx) => (
                <p
                  key={idx}
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "var(--text-primary, #1c1917)",
                    margin: 0,
                  }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.15))",
            background: "var(--glass-header, rgba(255, 255, 255, 0.04))",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: "6px 18px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "6px",
            }}
          >
            CLOSE GUIDE
          </button>
        </div>
      </section>
    </div>
  )
}

export default HowToPlayModal
