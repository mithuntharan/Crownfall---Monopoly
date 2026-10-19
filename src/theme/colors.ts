/**
 * Centralized Royal Property Color Mapping for CROWNFALL
 * Liquid Glass Edition: Deep midnight navy, smoked glass, antique gold, warm ivory.
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
  // Translucent badge / tint background
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
    accent: "#059669", // Luminous Emerald
    accentDark: "#064e3b",
    border: "#10b981",
    tintBg: "rgba(5, 150, 105, 0.18)",
    tintText: "#a7f3d0",
    contrastText: "#f0fdf4",
    cssClass: "color-green",
  },
  YELLOW: {
    id: "YELLOW",
    label: "YELLOW GROUP",
    accent: "#d97706", // Antique Imperial Gold
    accentDark: "#78350f",
    border: "#f59e0b",
    tintBg: "rgba(217, 119, 6, 0.18)",
    tintText: "#fde68a",
    contrastText: "#fffbeb",
    cssClass: "color-yellow",
  },
  RED: {
    id: "RED",
    label: "RED GROUP",
    accent: "#be123c", // Royal Crimson
    accentDark: "#4c0519",
    border: "#e11d48",
    tintBg: "rgba(190, 18, 60, 0.18)",
    tintText: "#fecdd3",
    contrastText: "#fff1f2",
    cssClass: "color-red",
  },
  BLUE: {
    id: "BLUE",
    label: "BLUE GROUP",
    accent: "#2563eb", // Royal Sapphire Navy
    accentDark: "#1e3a8a",
    border: "#3b82f6",
    tintBg: "rgba(37, 99, 235, 0.18)",
    tintText: "#bfdbfe",
    contrastText: "#eff6ff",
    cssClass: "color-blue",
  },
  NONE: {
    id: "NONE",
    label: "SPECIAL PROPERTY",
    accent: "#ffffff",
    accentDark: "#f1f5f9",
    border: "rgba(255, 255, 255, 0.8)",
    tintBg: "rgba(255, 255, 255, 0.95)",
    tintText: "#0f172a",
    contrastText: "#0f172a",
    cssClass: "color-white",
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
