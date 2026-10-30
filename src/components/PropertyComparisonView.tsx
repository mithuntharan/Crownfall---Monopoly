import React, { useState, useMemo } from "react"
import {
  CITY_PROPERTIES,
  SPECIAL_PROPERTIES,
  COLOR_GROUPS,
  type PropertyDefinition,
  type SpecialPropertyDefinition,
} from "../data/businessData"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import {
  calculatePropertyRent,
  playerOwnsSpecialPair,
} from "../engine/portfolioUtils"
import { ROYAL_COLOR_THEMES } from "../theme/colors"
import { getPlayerColorHex } from "../utils/boardCoordinates"

export interface PropertyComparisonViewProps {
  players: EnginePlayer[]
  initialPropertyIds?: (string | null)[]
  onSelectPropertyHighlight?: (propertyId: string | null) => void
}

type AnyProperty =
  | (PropertyDefinition & { isSpecial?: false })
  | (SpecialPropertyDefinition & { isSpecial: true; colorGroup?: "NONE" })

export function PropertyComparisonView({
  players,
  initialPropertyIds,
  onSelectPropertyHighlight,
}: PropertyComparisonViewProps) {
  // Support up to three properties (1, 2, or 3). Never preselect or add automatic pairs.
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>(() => {
    if (initialPropertyIds && initialPropertyIds.length > 0) {
      return [
        initialPropertyIds[0] || null,
        initialPropertyIds[1] || null,
        initialPropertyIds[2] || null,
      ]
    }
    return [null, null, null]
  })

  // Master catalog of all 26 Crownfall properties
  const allProperties = useMemo(() => {
    const list: AnyProperty[] = []
    // 20 Cities
    for (const city of Object.values(CITY_PROPERTIES)) {
      list.push({ ...city, isSpecial: false })
    }
    // 6 Special Properties
    for (const sp of Object.values(SPECIAL_PROPERTIES)) {
      list.push({ ...sp, isSpecial: true, colorGroup: "NONE" })
    }
    return list
  }, [])

  const handleSelect = (slotIndex: number, propId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev]
      next[slotIndex] = propId.trim() ? propId : null
      return next
    })
  }

  const handleRemove = (slotIndex: number) => {
    setSelectedIds((prev) => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
  }

  const handleClearAll = () => {
    setSelectedIds([null, null, null])
  }

  // Helper to find the owner of a property
  const getOwner = (propId: string) => {
    return players.find((p) => (p.ownedProperties || []).includes(propId)) || null
  }

  const renderPropertyCard = (prop: AnyProperty, slotIndex: number) => {
    const owner = getOwner(prop.id)
    const isMortgaged = owner ? !!owner.mortgages?.[prop.id] : false
    const currentRentInfo = owner
      ? calculatePropertyRent(prop.id, owner)
      : { rent: prop.baseRent ?? 0, note: "Unowned" }

    const isCity = !prop.isSpecial
    const city = isCity ? (prop as PropertyDefinition) : null
    const sp = !isCity ? (prop as SpecialPropertyDefinition) : null

    const groupColor =
      isCity && city.colorGroup !== "NONE" && ROYAL_COLOR_THEMES[city.colorGroup]
        ? ROYAL_COLOR_THEMES[city.colorGroup].accent
        : "#c89b45"

    const ownerColorHex = owner ? getPlayerColorHex(owner.color) : "#78716c"

    const buildingCount = (owner && owner.buildings?.[prop.id]) || 0
    const isHotel = buildingCount >= 4
    const houses = isHotel ? 0 : buildingCount

    return (
      <div key={`slot-${slotIndex}-${prop.id}`} className="property-compare-card">
        {/* Card Header */}
        <div
          className="property-compare-card-header"
          style={{ borderTop: `4px solid ${groupColor}` }}
        >
          <div className="prop-badge-row">
            <span
              className="prop-type-badge"
              style={{
                background: isCity
                  ? "rgba(200, 155, 69, 0.18)"
                  : "rgba(120, 113, 108, 0.18)",
                color: isCity ? "var(--ink, #1c1917)" : "#44403c",
                borderColor: isCity
                  ? "rgba(200, 155, 69, 0.4)"
                  : "rgba(120, 113, 108, 0.4)",
              }}
            >
              {isCity ? `${city?.colorGroup} GROUP` : "SPECIAL UTILITY / SERVICE"}
            </span>
            <button
              type="button"
              className="prop-remove-slot-btn"
              onClick={() => handleRemove(slotIndex)}
              title={`Remove Property ${slotIndex + 1}`}
            >
              Remove
            </button>
          </div>

          <h3 className="prop-title">{prop.name}</h3>

          <div className="prop-header-actions-row">
            <div className="prop-quick-price">
              <span>Purchase Price</span>
              <strong>₹{prop.purchasePrice.toLocaleString()}</strong>
            </div>
            {onSelectPropertyHighlight && (
              <button
                type="button"
                className="prop-highlight-board-btn"
                onClick={() => onSelectPropertyHighlight(prop.id)}
                title="Highlight this tile on the board"
              >
                Highlight on Board
              </button>
            )}
          </div>
        </div>

        {/* Ownership & Status */}
        <div className="property-compare-section">
          <div className="section-label">OWNERSHIP &amp; FINANCIAL STATUS</div>
          <div className="prop-owner-banner">
            {owner ? (
              <div className="owner-active-tag">
                <span
                  className="owner-dot"
                  style={{ backgroundColor: ownerColorHex }}
                />
                <span className="owner-name">{owner.name}</span>
                {isMortgaged ? (
                  <span className="owner-status-badge mortgaged">MORTGAGED</span>
                ) : (
                  <span className="owner-status-badge active">ACTIVE</span>
                )}
              </div>
            ) : (
              <div className="owner-unowned-tag">
                <span className="unowned-circle" />
                <span>Unowned (Bank)</span>
              </div>
            )}
          </div>

          <div className="prop-metric-row">
            <span className="metric-label">Current Applicable Rent</span>
            <span className="metric-value">
              {isMortgaged ? (
                <span className="mortgaged-text">₹0 (Mortgaged)</span>
              ) : sp?.isDiceMultiplier ? (
                <span className="multiplier-text">{currentRentInfo.note}</span>
              ) : (
                <strong>
                  ₹{currentRentInfo.rent.toLocaleString()}{" "}
                  <small>({currentRentInfo.note})</small>
                </strong>
              )}
            </span>
          </div>

          {isCity && city && (
            <div className="prop-metric-row">
              <span className="metric-label">Base Rent (Undeveloped)</span>
              <span className="metric-value">₹{city.baseRent.toLocaleString()}</span>
            </div>
          )}

          <div className="prop-metric-row">
            <span className="metric-label">Mortgage Value</span>
            <span className="metric-value">₹{prop.mortgageValue.toLocaleString()}</span>
          </div>

          <div className="prop-metric-row">
            <span className="metric-label">Unmortgage Repayment</span>
            <span className="metric-value">
              {isCity ? (
                <span>
                  ₹{Math.ceil((prop.mortgageValue * 1.1) / 100) * 100}{" "}
                  <small>(+10% Interest)</small>
                </span>
              ) : (
                <span>
                  ₹{prop.mortgageValue.toLocaleString()}{" "}
                  <small>(0% Interest)</small>
                </span>
              )}
            </span>
          </div>
        </div>

        {/* City Development & Rent Ladder */}
        {isCity && city && (
          <div className="property-compare-section">
            <div className="section-label">DEVELOPMENT &amp; RENT LADDER</div>

            <div className="prop-metric-row highlight-box">
              <span className="metric-label">Building Cost</span>
              <span className="metric-value">
                <strong>₹{city.buildingCost.toLocaleString()}</strong> / unit
              </span>
            </div>

            <div className="prop-rent-table">
              <div
                className={`rent-row ${buildingCount === 0 && owner ? "current-level" : ""}`}
              >
                <span className="rent-level">Base Rent</span>
                <span className="rent-amount">₹{city.baseRent.toLocaleString()}</span>
              </div>
              <div className="rent-row sub-row">
                <span className="rent-level">Full Group (2x)</span>
                <span className="rent-amount">
                  ₹{(city.baseRent * 2).toLocaleString()}
                </span>
              </div>
              <div
                className={`rent-row ${houses === 1 ? "current-level" : ""}`}
              >
                <span className="rent-level">With 1 House</span>
                <span className="rent-amount">
                  ₹{city.rentOneHouse.toLocaleString()}
                </span>
              </div>
              <div
                className={`rent-row ${houses === 2 ? "current-level" : ""}`}
              >
                <span className="rent-level">With 2 Houses</span>
                <span className="rent-amount">
                  ₹{city.rentTwoHouses.toLocaleString()}
                </span>
              </div>
              <div
                className={`rent-row ${houses === 3 ? "current-level" : ""}`}
              >
                <span className="rent-level">With 3 Houses</span>
                <span className="rent-amount">
                  ₹{city.rentThreeHouses.toLocaleString()}
                </span>
              </div>
              <div
                className={`rent-row ${isHotel ? "current-level" : ""}`}
              >
                <span className="rent-level">With Hotel</span>
                <span className="rent-amount hotel-rent">
                  ₹{city.hotelRent.toLocaleString()}
                </span>
              </div>
            </div>

            {owner && (
              <div className="current-development-pill">
                Current Level:{" "}
                <strong>
                  {isHotel
                    ? "Hotel"
                    : houses > 0
                      ? `${houses} House${houses > 1 ? "s" : ""}`
                      : "Undeveloped"}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Special Property Dynamics */}
        {!isCity && sp && (
          <div className="property-compare-section">
            <div className="section-label">SPECIAL PAIRING DYNAMICS</div>

            <div className="prop-metric-row highlight-box">
              <span className="metric-label">Paired Counterpart</span>
              <span className="metric-value">
                <strong>{sp.pair}</strong>
              </span>
            </div>

            <div className="prop-metric-row">
              <span className="metric-label">Single Ownership Rent</span>
              <span className="metric-value">
                {sp.isDiceMultiplier ? (
                  <span>
                    50x Dice Total <small>(formula)</small>
                  </span>
                ) : (
                  <span>{sp.rentAlone}</span>
                )}
              </span>
            </div>

            <div className="prop-metric-row">
              <span className="metric-label">Paired Ownership Rent</span>
              <span className="metric-value">
                {sp.isDiceMultiplier ? (
                  <strong style={{ color: "var(--gold-dark, #b45309)" }}>
                    100x Dice Total <small>(formula)</small>
                  </strong>
                ) : (
                  <strong style={{ color: "var(--gold-dark, #b45309)" }}>
                    {sp.rentWithPair}
                  </strong>
                )}
              </span>
            </div>

            {sp.isDiceMultiplier && (
              <div className="dice-multiplier-notice">
                <strong>Dice Multiplier Rule:</strong> Rent is calculated by
                multiplying the dice roll sum (2 to 12) by the applicable factor
                when a player lands on this space.
              </div>
            )}

            {owner && (
              <div className="current-development-pill">
                Pair Status:{" "}
                <strong>
                  {playerOwnsSpecialPair(owner, sp.id)
                    ? "Paired Bonus Active (Both Owned)"
                    : "Single Ownership"}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderEmptySlot = (slotIndex: number) => {
    const isOptional = slotIndex === 2
    return (
      <div key={`empty-slot-${slotIndex}`} className="property-compare-empty-card">
        <div className="empty-slot-badge">
          SLOT {slotIndex + 1}
          {isOptional ? " (OPTIONAL)" : ""}
        </div>
        <h4>Property {slotIndex + 1} Unselected</h4>
        <p>
          Select a property from the Property {slotIndex + 1} selector above to
          inspect and compare its values here.
        </p>
      </div>
    )
  }

  const slotLabels = [
    "PROPERTY 1",
    "PROPERTY 2",
    "PROPERTY 3 (OPTIONAL)",
  ]

  const hasAnySelected = selectedIds.some(Boolean)

  return (
    <div className="property-comparison-container">
      {/* Top Selectors: Three clearly labeled selectors */}
      <div className="property-compare-header-controls">
        <div className="compare-selectors-grid">
          {slotLabels.map((label, idx) => {
            const currentId = selectedIds[idx] || ""
            return (
              <div key={label} className="compare-picker-box">
                <div className="picker-box-top">
                  <label htmlFor={`compare-select-${idx}`}>{label}</label>
                  {currentId && (
                    <button
                      type="button"
                      className="picker-clear-slot-btn"
                      onClick={() => handleRemove(idx)}
                      title={`Remove Property ${idx + 1}`}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select
                  id={`compare-select-${idx}`}
                  value={currentId}
                  onChange={(e) => handleSelect(idx, e.target.value)}
                  className="compare-dropdown"
                >
                  <option value="">
                    -- Select {idx === 2 ? "Property 3 (Optional)" : `Property ${idx + 1}`} --
                  </option>
                  <optgroup label="City Properties (20)">
                    {allProperties
                      .filter((p) => !p.isSpecial)
                      .map((p) => {
                        const isAlreadySelected = selectedIds.some(
                          (id, i) => i !== idx && id === p.id,
                        )
                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={isAlreadySelected}
                          >
                            {p.name} (₹{p.purchasePrice.toLocaleString()})
                            {isAlreadySelected ? " [Selected]" : ""}
                          </option>
                        )
                      })}
                  </optgroup>
                  <optgroup label="Special Utilities & Services (6)">
                    {allProperties
                      .filter((p) => p.isSpecial)
                      .map((p) => {
                        const isAlreadySelected = selectedIds.some(
                          (id, i) => i !== idx && id === p.id,
                        )
                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={isAlreadySelected}
                          >
                            {p.name} (₹{p.purchasePrice.toLocaleString()})
                            {isAlreadySelected ? " [Selected]" : ""}
                          </option>
                        )
                      })}
                  </optgroup>
                </select>
              </div>
            )
          })}
        </div>

        {/* Global Controls */}
        <div className="compare-global-actions">
          <span className="compare-summary-text">
            {hasAnySelected
              ? `Comparing ${selectedIds.filter(Boolean).length} of 3 properties`
              : "No properties selected for comparison"}
          </span>
          {hasAnySelected && (
            <button
              type="button"
              className="compare-clear-btn"
              onClick={handleClearAll}
              title="Clear all selected properties"
            >
              CLEAR ALL
            </button>
          )}
        </div>
      </div>

      {/* Comparison Columns */}
      <div className="property-comparison-grid">
        {selectedIds.map((id, idx) => {
          const prop = id ? allProperties.find((p) => p.id === id) : null
          if (prop) {
            return renderPropertyCard(prop, idx)
          }
          return renderEmptySlot(idx)
        })}
      </div>
    </div>
  )
}

export default PropertyComparisonView
