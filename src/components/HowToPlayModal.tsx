import React, { useState } from "react"

interface Section {
  id: string
  title: string
  content: string[]
}

const SECTIONS: Section[] = [
  {
    id: "objective",
    title: "1. Objective & Winning",
    content: [
      "Crownfall is an authoritative real estate strategy game where tycoons build economic dominance through strategic property acquisition, development, and portfolio management.",
      "Win by bankrupting all rival tycoons, or by holding the highest calculated Net Worth when a match concludes.",
      "Net Worth combines your current cash reserves, current depreciated property values, and building investments, minus any active mortgage liabilities.",
    ],
  },
  {
    id: "turns",
    title: "2. Turns & Dice",
    content: [
      "Players take turns rolling two authoritative 6-sided dice in clockwise perimeter order.",
      "Rolling doubles awards an immediate subsequent roll.",
      "Caution: Rolling three consecutive doubles in a single turn constitutes reckless velocity and sends your token directly to Jail detention.",
    ],
  },
  {
    id: "capital",
    title: "3. First Rotation & Starting Capital",
    content: [
      "Starting Capital: Host configures starting funds between Rs40,000 and Rs65,000 (Default: Rs45,000).",
      "Zero Starting Balance: All players begin the match with Rs0 cash in hand.",
      "First Lap Reward: Players receive their full configured Starting Capital only upon completing their first complete rotation around the board (crossing or landing on Start).",
      "Subsequent Start Crossings: Each subsequent pass across Start awards a 5% dividend of starting capital, rounded to the nearest Rs100.",
    ],
  },
  {
    id: "buying",
    title: "4. Buying Properties",
    content: [
      "First-Rotation Restriction: Tycoons cannot purchase properties during their first rotation. You must complete your initial circuit before acquiring real estate.",
      "After the first rotation, landing on an unowned property allows you to purchase it from the bank at the listed base price.",
      "If declined, the property remains unowned until another player lands upon it.",
    ],
  },
  {
    id: "building",
    title: "5. Building Houses & Hotels",
    content: [
      "Monopoly Requirement: You must own all properties within a color set before constructing buildings.",
      "Mode A (Anywhere): Construct buildings on your monopolies at any time during your turn without needing to land on the tile.",
      "Mode B (Landing): You must physically land on a property within your monopoly to construct on it.",
      "Upgrade Progression: Construct up to 3 houses per property. The 4th upgrade converts the 3 houses into a premier Hotel.",
    ],
  },
  {
    id: "rent",
    title: "6. Paying Rent",
    content: [
      "Landing on an opponent's unmortgaged property requires paying the owner rent according to the property title deed.",
      "Base Rent Doubling: If the owner holds all properties of that color group with zero buildings, the base unimproved rent doubles.",
      "Buildings Exponential: Developing houses and hotels dramatically increases rent collection from visiting opponents.",
    ],
  },
  {
    id: "mortgages",
    title: "7. Mortgages, Depreciation & Selling",
    content: [
      "Mortgaging: Mortgaging an unimproved property to the bank awards 50% of its base purchase price. Mortgaged properties collect Rs0 rent.",
      "Unmortgaging: Lift a mortgage by paying the mortgage value plus 10% interest.",
      "Ordinary Property Depreciation: Ordinary city properties depreciate by 10% each time the owner completes a full rotation, down to a 50% minimum value floor.",
      "Building Liquidation: Sell houses and hotels back to the bank for 50% of their construction cost.",
    ],
  },
  {
    id: "chance",
    title: "8. Chance & Community Chest",
    content: [
      "Landing on Chance or Community Chest draws an authoritative card from the deck.",
      "Cards may deliver unexpected financial windfalls, municipal taxes, property assessment fees, board transit, or detention summons.",
    ],
  },
  {
    id: "jail",
    title: "9. Jail & Rest House",
    content: [
      "Jail Detention: Entering Jail puts your puck inside the detention cell. You have up to 2 turns to attempt rolling doubles to escape for free.",
      "Doubles Release: Rolling doubles immediately releases you and advances your token by the rolled count. If doubles are not rolled after 2 attempts, release requires a Rs500 administrative fine.",
      "Just Visiting: Landing on Jail via normal roll places your token outside on the visiting strip without penalty.",
      "Rest House: Landing on Rest House collects 5% of each active opponent's positive current-round net income for the visiting player. Visiting players skip exactly one subsequent scheduled turn.",
    ],
  },
  {
    id: "club",
    title: "10. Club & Special Properties",
    content: [
      "Club: Landing on Club requires you to pay 5% of each opponent's positive current-round income to that opponent.",
      "Special Properties: Electric Company, Water Works, Railway, and Airways are immune to ordinary crossing depreciation (they retain 100% resale value) and have zero mortgage interest.",
      "Transport Scaling: Owning multiple railways or transit utilities scales rent multiplicatively based on dice rolls or station count.",
    ],
  },
  {
    id: "trading",
    title: "11. Trading & Bankruptcy",
    content: [
      "Direct Trading: Propose trades to opponents exchanging cash and unmortgaged properties without buildings.",
      "Bankruptcy: If you cannot settle an authoritative debt after liquidating all houses, hotels, and mortgaging assets, you must declare bankruptcy.",
      "Liquidation: Upon bankruptcy, all remaining assets are surrendered to settle the debt or returned to the bank, and the player is eliminated.",
    ],
  },
  {
    id: "multiplayer",
    title: "12. Multiplayer Room & Turn Basics",
    content: [
      "Room Hosting: The host sets match rules, selects starting capital, and manages the lobby.",
      "Turn Progression: The active player rolls and moves. If turn timers are enabled, passing the timer automatically concludes the turn.",
      "Rematch Lobby: After a match concludes, the host can initiate Another Match to return all connected tycoons to the rematch lobby with identical rules.",
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
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--glass-header, rgba(255, 255, 255, 0.04))",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
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
              Authoritative rules, rotation rewards & strategic financial mechanics
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
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Close Instructions"
          >
            X
          </button>
        </div>

        {/* Search input */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--border-subtle)",
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
              padding: "8px 12px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface, rgba(255, 255, 255, 0.05))",
              color: "var(--ink, #1c1917)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Modal Body: Split 2-column on desktop, stacked on mobile */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            minHeight: 0,
            overflow: "hidden",
          }}
          className="how-to-play-body"
        >
          {/* Section Navigation List */}
          <div
            style={{
              borderRight: "1px solid var(--border-subtle)",
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              background: "rgba(0, 0, 0, 0.02)",
            }}
          >
            {filteredSections.map((s) => {
              const isSelected = s.id === activeSection.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSectionId(s.id)}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: isSelected
                      ? "1px solid var(--gold, #d97706)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "rgba(217, 119, 6, 0.12)"
                      : "transparent",
                    color: isSelected
                      ? "var(--gold-bright, #d97706)"
                      : "var(--ink, #1c1917)",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                >
                  {s.title}
                </button>
              )
            })}
          </div>

          {/* Section Content Display */}
          <div
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
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "17px",
                fontWeight: 700,
                color: "var(--gold-bright, #d97706)",
                margin: 0,
                borderBottom: "1px solid var(--border-subtle)",
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
                fontSize: "13px",
                lineHeight: 1.6,
                color: "var(--ink, #1c1917)",
              }}
            >
              {activeSection.content.map((p, idx) => (
                <p key={idx} style={{ margin: 0 }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "flex-end",
            background: "var(--glass-header, rgba(255, 255, 255, 0.04))",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="action-btn"
            style={{
              padding: "6px 18px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close Guide
          </button>
        </div>
      </section>
    </div>
  )
}

export default HowToPlayModal
