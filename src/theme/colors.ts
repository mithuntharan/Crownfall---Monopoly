/**
 * Centralized Royal Property Color Mapping for CROWNFALL
 *
 * Section 3 & 4 of Specification:
 * - Single source of truth for color propagation
 * - Works within the Royal theme (midnight navy, burgundy, antique gold, warm ivory)
 * - Refined royal accent colors for Green, Yellow, Red, Blue groups
 */

export type ColorGroupId = "GREEN" | "YELLOW" | "RED" | "BLUE" | "NONE"

export interface ColorThemeDefinition {
  id: ColorGroupId
  label: string
  // Primary group accent color for banners and headers
  accent: string
  // Darker shade for gradients and borders
  accentDark: string
  // Border highlight color
  border: string
  // Soft badge / tint background
  tintBg: string
  // Text color on tint background
  tintText: string
  // Contrast text color on accent background
  contrastText: string
  // CSS class key
  cssClass: string
}

export const ROYAL_COLOR_THEMES: Record<ColorGroupId, ColorThemeDefinition> = {
  GREEN: {
    id: "GREEN",
    label: "GREEN GROUP",
    accent: "#265d3f", // Refined royal green
    accentDark: "#173d28",
    border: "#4b8f67",
    tintBg: "#e0efe5",
    tintText: "#18452c",
    contrastText: "#f4fcf6",
    cssClass: "color-green",
  },
  YELLOW: {
    id: "YELLOW",
    label: "YELLOW GROUP",
    accent: "#b58728", // Rich imperial gold/yellow
    accentDark: "#7d5b12",
    border: "#e5b74c",
    tintBg: "#fcf4de",
    tintText: "#5c4109",
    contrastText: "#fffdf5",
    cssClass: "color-yellow",
  },
  RED: {
    id: "RED",
    label: "RED GROUP",
    accent: "#8e2338", // Deep royal crimson
    accentDark: "#581220",
    border: "#c4475f",
    tintBg: "#fcedf0",
    tintText: "#621121",
    contrastText: "#fff5f7",
    cssClass: "color-red",
  },
  BLUE: {
    id: "BLUE",
    label: "BLUE GROUP",
    accent: "#274f7f", // Refined royal navy blue
    accentDark: "#152e4d",
    border: "#4878b3",
    tintBg: "#e3eefc",
    tintText: "#143358",
    contrastText: "#f3f8ff",
    cssClass: "color-blue",
  },
  NONE: {
    id: "NONE",
    label: "SPECIAL UTILITY",
    accent: "#5a4f3b",
    accentDark: "#373024",
    border: "#9e8e74",
    tintBg: "#eee7da",
    tintText: "#3b3425",
    contrastText: "#f8f5ee",
    cssClass: "color-special",
  },
}

/**
 * Get color theme by color group identifier
 */
export function getColorGroupTheme(
  group?: string | null,
): ColorThemeDefinition {
  if (!group) return ROYAL_COLOR_THEMES.NONE
  const upper = group.toUpperCase() as ColorGroupId
  return ROYAL_COLOR_THEMES[upper] || ROYAL_COLOR_THEMES.NONE
}

/**
 * Returns dynamic CSS style variables that automatically propagate the
 * property group color to any element, title deed card, or board space.
 */
export function getPropertyThemeStyle(
  group?: string | null,
): React.CSSProperties {
  const theme = getColorGroupTheme(group)
  return {
    ["--property-accent" as any]: theme.accent,
    ["--property-accent-dark" as any]: theme.accentDark,
    ["--property-border" as any]: theme.border,
    ["--property-tint-bg" as any]: theme.tintBg,
    ["--property-tint-text" as any]: theme.tintText,
  }
}
