import React from "react"
import type { ColorGroup } from "../data/businessData"

export interface PropertyLandmarkArtworkProps {
  propertyId: string
  propertyName?: string
  colorGroup?: ColorGroup | string
  className?: string
  style?: React.CSSProperties
  showLabel?: boolean
}

interface LandmarkMeta {
  landmark: string
  subtitle: string
  svg: (accent: string, bg: string) => React.ReactNode
}

// Color group color mappings for refined travel-poster palettes
function getPalette(group: string) {
  switch (group?.toUpperCase()) {
    case "GREEN":
      return {
        accent: "#10b981",
        accentMuted: "#047857",
        skyTop: "#064e3b",
        skyBottom: "#022c22",
        glow: "rgba(16, 185, 129, 0.35)",
        highlight: "#6ee7b7",
      }
    case "YELLOW":
      return {
        accent: "#f59e0b",
        accentMuted: "#b45309",
        skyTop: "#78350f",
        skyBottom: "#451a03",
        glow: "rgba(245, 158, 11, 0.35)",
        highlight: "#fcd34d",
      }
    case "RED":
      return {
        accent: "#ef4444",
        accentMuted: "#b91c1c",
        skyTop: "#7f1d1d",
        skyBottom: "#450a0a",
        glow: "rgba(239, 68, 68, 0.35)",
        highlight: "#fca5a5",
      }
    case "BLUE":
      return {
        accent: "#3b82f6",
        accentMuted: "#1d4ed8",
        skyTop: "#1e3a8a",
        skyBottom: "#0f172a",
        glow: "rgba(59, 130, 246, 0.35)",
        highlight: "#93c5fd",
      }
    default:
      return {
        accent: "#d97706",
        accentMuted: "#92400e",
        skyTop: "#1e293b",
        skyBottom: "#0f172a",
        glow: "rgba(217, 119, 6, 0.35)",
        highlight: "#fde68a",
      }
  }
}

/**
 * High-quality vector landmark travel-poster illustrations for each Indian Business property.
 */
const LANDMARKS: Record<string, LandmarkMeta> = {
  // ─── GREEN GROUP ───────────────────────────────────────────────────────────
  margoa: {
    landmark: "Church of Our Lady of Grace",
    subtitle: "Portuguese Colonial Baroque · Goa",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_margoa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="60%" stopColor="#047857" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_margoa)" />
        {/* Goan Tropical Sun */}
        <circle cx="250" cy="45" r="28" fill="#fef08a" opacity="0.35" />
        <circle cx="250" cy="45" r="20" fill="#fef08a" opacity="0.7" />
        {/* Distant palms background */}
        <path d="M15 160 L18 100 M18 100 Q8 85 -5 95 M18 100 Q20 80 15 70 M18 100 Q32 85 45 92" stroke="#065f46" strokeWidth="2.5" fill="none" opacity="0.6" />
        <path d="M305 160 L300 95 M300 95 Q312 80 325 90 M300 95 Q298 75 305 65 M300 95 Q285 82 275 90" stroke="#065f46" strokeWidth="2.5" fill="none" opacity="0.6" />
        {/* Church Base and Baroque Facade */}
        <path d="M90 160 L90 100 L115 100 L115 70 L135 70 L135 48 L160 30 L185 48 L185 70 L205 70 L205 100 L230 100 L230 160 Z" fill="#f8fafc" />
        {/* Shadow layer */}
        <path d="M90 100 L115 100 L115 160 L90 160 Z M205 100 L230 100 L230 160 L205 160 Z" fill="#e2e8f0" />
        {/* Bell towers */}
        <rect x="98" y="75" width="10" height="25" fill="#f8fafc" />
        <path d="M95 75 L103 62 L111 75 Z" fill={accent} />
        <rect x="212" y="75" width="10" height="25" fill="#f8fafc" />
        <path d="M209 75 L217 62 L225 75 Z" fill={accent} />
        {/* Central Cross & Rose Window */}
        <circle cx="160" cy="65" r="9" fill={accent} />
        <circle cx="160" cy="65" r="5" fill="#f8fafc" />
        <path d="M160 18 L160 30 M154 22 L166 22" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
        {/* Arched Portals */}
        <path d="M148 160 L148 122 Q160 112 172 122 L172 160 Z" fill="#1e293b" />
        <path d="M102 145 L102 125 Q107 120 112 125 L112 145 Z" fill="#334155" />
        <path d="M208 145 L208 125 Q213 120 218 125 L218 145 Z" fill="#334155" />
        {/* Paved Courtyard and steps */}
        <rect x="0" y="152" width="320" height="8" fill="#334155" />
        <rect x="60" y="154" width="200" height="6" fill="#475569" />
      </svg>
    ),
  },

  cochin: {
    landmark: "Chinese Fishing Nets",
    subtitle: "Cheena Vala Cantilevers · Fort Kochi",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_cochin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="50%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_cochin)" />
        {/* Sunset glow over Arabian sea */}
        <circle cx="160" cy="90" r="42" fill="#fde68a" opacity="0.3" />
        <circle cx="160" cy="90" r="28" fill="#fbbf24" opacity="0.6" />
        {/* Coastal Waterline */}
        <rect x="0" y="120" width="320" height="40" fill="#064e3b" />
        <path d="M0 125 Q80 120 160 126 T320 124 L320 160 L0 160 Z" fill="#022c22" opacity="0.7" />
        {/* Cantilever wooden cantilever beams */}
        <path d="M50 135 L120 60 L180 85 M120 60 L230 40" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        <path d="M120 60 L155 130" stroke="#cbd5e1" strokeWidth="2.5" />
        <path d="M140 135 L210 55 L280 80 M210 55 L310 38" stroke="#f1f5f9" strokeWidth="2.5" />
        {/* Hanging nets */}
        <path d="M180 85 Q220 115 250 110 Q215 95 180 85 Z" fill={highlight} opacity="0.45" stroke="#fef08a" strokeWidth="1" />
        <path d="M280 80 Q305 105 325 100" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="3,3" />
        {/* Support pulleys and counterweights */}
        <circle cx="70" cy="115" r="4" fill="#64748b" />
        <circle cx="65" cy="122" r="5" fill="#475569" />
        {/* Silhouette of traditional wooden boat */}
        <path d="M20 138 Q45 136 65 142 L60 145 L22 145 Z" fill="#0f172a" />
        <line x1="42" y1="130" x2="42" y2="138" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    ),
  },

  ootacamund: {
    landmark: "Nilgiri Mountain Toy Train",
    subtitle: "UNESCO Heritage Railway & Tea Slopes · Ooty",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_ooty" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="60%" stopColor="#047857" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_ooty)" />
        {/* Rolling Nilgiri Blue Hills */}
        <path d="M-20 90 Q60 50 160 80 T340 60 L340 160 L-20 160 Z" fill="#064e3b" opacity="0.6" />
        <path d="M-20 110 Q80 85 180 110 T340 95 L340 160 L-20 160 Z" fill="#047857" />
        <path d="M-20 130 Q90 115 200 135 T340 120 L340 160 L-20 160 Z" fill="#022c22" />
        {/* Stone Arch Viaduct Bridge */}
        <rect x="70" y="112" width="180" height="6" fill="#94a3b8" />
        <path d="M85 118 L85 145 Q100 125 115 145 L115 118 Z" fill="#64748b" />
        <path d="M125 118 L125 145 Q140 125 155 145 L155 118 Z" fill="#64748b" />
        <path d="M165 118 L165 145 Q180 125 195 145 L195 118 Z" fill="#64748b" />
        <path d="M205 118 L205 145 Q220 125 235 145 L235 118 Z" fill="#64748b" />
        {/* Classic Blue & Yellow Steam Toy Train Engine */}
        <rect x="180" y="98" width="45" height="14" rx="2" fill="#2563eb" />
        <rect x="210" y="94" width="15" height="18" rx="2" fill="#1d4ed8" />
        <rect x="175" y="103" width="8" height="9" fill="#0f172a" />
        <line x1="183" y1="92" x2="183" y2="98" stroke="#334155" strokeWidth="2.5" />
        {/* Steam puffs */}
        <circle cx="178" cy="88" r="4" fill="#f8fafc" opacity="0.75" />
        <circle cx="172" cy="82" r="6" fill="#f8fafc" opacity="0.6" />
        <circle cx="164" cy="76" r="8" fill="#f8fafc" opacity="0.4" />
        {/* Passenger coaches */}
        <rect x="135" y="100" width="40" height="12" rx="2" fill="#fbbf24" />
        <rect x="90" y="100" width="40" height="12" rx="2" fill="#2563eb" />
      </svg>
    ),
  },

  chandigadh: {
    landmark: "The Open Hand Monument",
    subtitle: "Le Corbusier Capitol Complex · Chandigarh",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_chd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="70%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_chd)" />
        {/* Shivalik foothills */}
        <polygon points="-20,110 50,75 140,100 230,68 340,105 340,160 -20,160" fill="#065f46" opacity="0.5" />
        {/* Concrete Trench & Podium */}
        <polygon points="120,160 140,125 180,125 200,160" fill="#475569" />
        <rect x="155" y="85" width="10" height="40" fill="#cbd5e1" />
        {/* The Open Hand Sculpture (Hand of Peace & Unity) */}
        <path
          d="M160 85 L145 75 L140 55 Q145 42 153 50 L155 35 Q161 28 167 36 L170 25 Q178 22 182 32 L185 30 Q192 30 190 40 L195 48 Q198 56 190 65 L175 75 L165 85 Z"
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        {/* Palm cutouts / wind vane contour */}
        <path d="M162 48 Q170 42 178 52 T165 68 Z" fill="#94a3b8" opacity="0.4" />
        {/* Geometric plaza foreground */}
        <line x1="0" y1="145" x2="320" y2="145" stroke="#334155" strokeWidth="2" />
        <line x1="160" y1="125" x2="160" y2="160" stroke="#334155" strokeWidth="1.5" />
      </svg>
    ),
  },

  delhi: {
    landmark: "India Gate",
    subtitle: "Triumphal Arch of Kartavya Path · New Delhi",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_delhi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_delhi)" />
        {/* Grand Sun & Aura */}
        <circle cx="160" cy="50" r="32" fill="#fde68a" opacity="0.3" />
        {/* India Gate Main Edifice */}
        {/* Top attic */}
        <rect x="120" y="25" width="80" height="12" fill="#fef08a" />
        <rect x="114" y="37" width="92" height="6" fill="#fde047" />
        {/* Upper cornice */}
        <rect x="110" y="43" width="100" height="8" fill="#fed7aa" />
        {/* Main Pylons */}
        <rect x="115" y="51" width="90" height="90" fill="#ffedd5" />
        {/* Deep Central Arch Cutout */}
        <path d="M142 141 L142 90 Q160 70 178 90 L178 141 Z" fill="#0f172a" />
        {/* Side mini-arches */}
        <path d="M122 135 L122 108 Q127 102 132 108 L132 135 Z" fill="#0f172a" opacity="0.8" />
        <path d="M188 135 L188 108 Q193 102 198 108 L198 135 Z" fill="#0f172a" opacity="0.8" />
        {/* Moulding bands & Amar Jawan Jyoti eternal flame glow */}
        <rect x="115" y="80" width="90" height="4" fill="#fb923c" />
        <circle cx="160" cy="132" r="5" fill="#f97316" />
        <circle cx="160" cy="132" r="2.5" fill="#fef08a" />
        {/* Base steps and Kartavya Path boulevard */}
        <polygon points="105,145 215,145 225,160 95,160" fill="#334155" />
      </svg>
    ),
  },

  // ─── YELLOW GROUP ──────────────────────────────────────────────────────────
  simla: {
    landmark: "Christ Church on The Ridge",
    subtitle: "Historic Neo-Gothic Landmark · Shimla",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_simla" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_simla)" />
        {/* Himalayan Pine Ridges */}
        <polygon points="-20,130 40,85 110,120 190,75 270,115 340,90 340,160 -20,160" fill="#451a03" opacity="0.6" />
        {/* Church Main Nave */}
        <rect x="135" y="80" width="85" height="60" fill="#fef08a" />
        <polygon points="130,80 177,55 225,80" fill="#b45309" />
        {/* Iconic Clock Tower */}
        <rect x="105" y="45" width="30" height="95" fill="#fef9c3" />
        {/* Tower Steeple */}
        <polygon points="100,45 120,15 140,45" fill="#d97706" />
        <line x1="120" y1="15" x2="120" y2="8" stroke="#fef08a" strokeWidth="2" />
        {/* Clock Face */}
        <circle cx="120" cy="60" r="7" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
        <line x1="120" y1="60" x2="120" y2="56" stroke="#451a03" strokeWidth="1" />
        <line x1="120" y1="60" x2="123" y2="60" stroke="#451a03" strokeWidth="1" />
        {/* Stained-glass arched windows */}
        <path d="M152 115 L152 95 Q157 90 162 95 L162 115 Z" fill="#0284c7" />
        <path d="M175 115 L175 95 Q180 90 185 95 L185 115 Z" fill="#0284c7" />
        <path d="M198 115 L198 95 Q203 90 208 95 L208 115 Z" fill="#0284c7" />
        {/* The Ridge Promenade */}
        <rect x="0" y="140" width="320" height="20" fill="#334155" />
      </svg>
    ),
  },

  amritsar: {
    landmark: "The Golden Temple",
    subtitle: "Sri Harmandir Sahib & Amrit Sarovar · Amritsar",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_amritsar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_amritsar)" />
        {/* Divine Aura */}
        <circle cx="160" cy="65" r="45" fill="#fef08a" opacity="0.3" />
        {/* Reflecting Pool: Amrit Sarovar */}
        <rect x="0" y="105" width="320" height="55" fill="#0369a1" />
        <rect x="0" y="105" width="320" height="55" fill="#0284c7" opacity="0.35" />
        {/* Causeway Bridge (Guru's Bridge) */}
        <rect x="40" y="103" width="80" height="6" fill="#f8fafc" />
        {/* Golden Sanctum Main Structure */}
        {/* Lower Marble Floor */}
        <rect x="120" y="78" width="80" height="28" fill="#f8fafc" />
        {/* Upper Golden Floor */}
        <rect x="124" y="52" width="72" height="26" fill="#f59e0b" />
        <rect x="120" y="50" width="80" height="3" fill="#fbbf24" />
        {/* Ornate Chhatris (corner pavilions) */}
        <path d="M125 50 L128 42 L131 50 Z" fill="#fcd34d" />
        <path d="M189 50 L192 42 L195 50 Z" fill="#fcd34d" />
        {/* Golden Central Fluted Dome */}
        <path d="M142 50 Q160 25 178 50 Z" fill="#fcd34d" stroke="#d97706" strokeWidth="1" />
        <circle cx="160" cy="24" r="2.5" fill="#fef08a" />
        <line x1="160" y1="22" x2="160" y2="16" stroke="#fef08a" strokeWidth="2" />
        {/* Arched Doors */}
        <path d="M152 106 L152 88 Q160 82 168 88 L168 106 Z" fill="#b45309" />
        {/* Water Reflection of the Golden Dome */}
        <ellipse cx="160" cy="120" rx="35" ry="12" fill="#fbbf24" opacity="0.35" />
        <ellipse cx="160" cy="132" rx="20" ry="6" fill="#f59e0b" opacity="0.2" />
      </svg>
    ),
  },

  srinagar: {
    landmark: "Dal Lake & Shikara",
    subtitle: "Pir Panjal Peaks & Chinar Lotus Waters · Kashmir",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_srinagar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="45%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_srinagar)" />
        {/* Snow-capped Pir Panjal Mountain Peaks */}
        <polygon points="-20,95 45,40 110,85 180,30 250,75 340,35 340,110 -20,110" fill="#475569" />
        {/* Snow caps */}
        <polygon points="45,40 30,55 60,55" fill="#f8fafc" />
        <polygon points="180,30 162,48 198,48" fill="#f8fafc" />
        <polygon points="340,35 325,48 340,55" fill="#f8fafc" />
        {/* Dal Lake Water Surface */}
        <rect x="0" y="95" width="320" height="65" fill="#0284c7" />
        <path d="M0 100 Q80 96 160 102 T320 98 L320 160 L0 160 Z" fill="#0369a1" opacity="0.6" />
        {/* Traditional Kashmiri Wooden Shikara Boat */}
        <path d="M80 132 Q140 128 220 134 Q228 136 215 142 L85 142 Q75 138 80 132 Z" fill="#78350f" />
        {/* Ornate Fabric Canopy (Curtains & Roof) */}
        <polygon points="110,132 120,110 185,110 195,132" fill="#fbbf24" />
        <path d="M120 110 L185 110 L180 124 L125 124 Z" fill="#dc2626" />
        {/* Boatman with heart-shaped oar */}
        <circle cx="95" cy="122" r="5" fill="#fcd34d" />
        <path d="M92 127 L98 135" stroke="#fcd34d" strokeWidth="2.5" />
        <line x1="88" y1="125" x2="72" y2="148" stroke="#fef08a" strokeWidth="2" />
        {/* Floating Water Lilies */}
        <ellipse cx="250" cy="140" rx="14" ry="4" fill="#047857" />
        <circle cx="252" cy="138" r="3" fill="#f43f5e" />
      </svg>
    ),
  },

  madras: {
    landmark: "Ripon Building & Central Station",
    subtitle: "Victorian Indo-Saracenic Heritage · Chennai",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_madras" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_madras)" />
        {/* Grand Victorian Central Tower */}
        <rect x="145" y="30" width="30" height="110" fill="#f8fafc" />
        <polygon points="140,30 160,8 180,30" fill="#dc2626" />
        {/* Tower Clock */}
        <circle cx="160" cy="50" r="7" fill="#f8fafc" stroke="#dc2626" strokeWidth="1.5" />
        {/* Main Building Wings */}
        <rect x="70" y="70" width="75" height="70" fill="#f8fafc" />
        <rect x="175" y="70" width="75" height="70" fill="#f8fafc" />
        {/* Red Tiles and Cornices */}
        <rect x="68" y="66" width="79" height="5" fill="#dc2626" />
        <rect x="173" y="66" width="79" height="5" fill="#dc2626" />
        {/* Corner Domes */}
        <path d="M72 66 Q82 48 92 66 Z" fill="#f8fafc" stroke="#dc2626" strokeWidth="1" />
        <path d="M228 66 Q238 48 248 66 Z" fill="#f8fafc" stroke="#dc2626" strokeWidth="1" />
        {/* Arched Windows Rows */}
        <rect x="80" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="95" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="110" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="125" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="185" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="200" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="215" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        <rect x="230" y="85" width="8" height="16" rx="3" fill="#1e293b" />
        {/* Base Promenade */}
        <rect x="0" y="140" width="320" height="20" fill="#334155" />
      </svg>
    ),
  },

  bangalore: {
    landmark: "Vidhana Soudha",
    subtitle: "Neo-Dravidian Architectural Marvel · Bengaluru",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_bangalore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="50%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_bangalore)" />
        {/* Massive Granite Edifice */}
        <rect x="50" y="75" width="220" height="65" fill="#cbd5e1" />
        {/* Grand Steps */}
        <polygon points="110,140 210,140 230,160 90,160" fill="#64748b" />
        {/* Central Portico with Grand Granite Columns */}
        <rect x="125" y="70" width="70" height="70" fill="#e2e8f0" />
        <polygon points="120,70 160,45 200,70" fill="#cbd5e1" />
        {/* Central Neo-Dravidian Dome */}
        <path d="M140 45 Q160 12 180 45 Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
        {/* Four Lions Capital Emblem atop Dome */}
        <path d="M157 12 L160 4 L163 12 Z" fill="#fbbf24" />
        {/* Flanking Side Domes */}
        <path d="M60 75 Q70 58 80 75 Z" fill="#e2e8f0" />
        <path d="M240 75 Q250 58 260 75 Z" fill="#e2e8f0" />
        {/* Columns representation */}
        <line x1="135" y1="72" x2="135" y2="140" stroke="#475569" strokeWidth="2.5" />
        <line x1="147" y1="72" x2="147" y2="140" stroke="#475569" strokeWidth="2.5" />
        <line x1="160" y1="72" x2="160" y2="140" stroke="#475569" strokeWidth="2.5" />
        <line x1="173" y1="72" x2="173" y2="140" stroke="#475569" strokeWidth="2.5" />
        <line x1="185" y1="72" x2="185" y2="140" stroke="#475569" strokeWidth="2.5" />
      </svg>
    ),
  },

  // ─── RED GROUP ─────────────────────────────────────────────────────────────
  darjeeling: {
    landmark: "Batasia Loop & Kanchenjunga",
    subtitle: "DHR Toy Train Spiral & Himalayan Peaks · Darjeeling",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_darjeeling" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="45%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_darjeeling)" />
        {/* Majestic Kanchenjunga 5-Peak Himalayan massif */}
        <polygon points="-20,80 50,30 110,65 170,18 230,55 310,24 340,75 340,160 -20,160" fill="#334155" />
        <polygon points="50,30 35,48 65,48" fill="#f8fafc" />
        <polygon points="170,18 150,42 190,42" fill="#f8fafc" />
        <polygon points="310,24 292,45 328,45" fill="#f8fafc" />
        {/* Tea Garden Hill Terraces */}
        <path d="M-20 115 Q90 90 200 120 T340 105 L340 160 L-20 160 Z" fill="#064e3b" />
        <path d="M-20 135 Q100 120 220 140 T340 125 L340 160 L-20 160 Z" fill="#047857" />
        {/* DHR Toy Train Steam Engine */}
        <rect x="70" y="112" width="45" height="16" rx="2" fill="#dc2626" />
        <rect x="100" y="106" width="18" height="22" rx="2" fill="#991b1b" />
        <circle cx="78" cy="128" r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="95" cy="128" r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Steam billowing into crisp Himalayan air */}
        <circle cx="68" cy="100" r="6" fill="#f8fafc" opacity="0.8" />
        <circle cx="60" cy="92" r="9" fill="#f8fafc" opacity="0.6" />
        <circle cx="50" cy="84" r="12" fill="#f8fafc" opacity="0.4" />
      </svg>
    ),
  },

  ahmedabad: {
    landmark: "Sidi Saiyyed Jali",
    subtitle: "Intricate Tree of Life Filigree · Ahmedabad",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_ahmedabad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_ahmedabad)" />
        {/* Grand Sandstone Jali Arch Frame */}
        <path d="M40 160 L40 60 Q160 5 280 60 L280 160 Z" fill="#fde68a" />
        <path d="M50 160 L50 65 Q160 16 270 65 L270 160 Z" fill="#1e293b" />
        {/* The Tree of Life (Trunk and Branches) */}
        <path d="M160 160 L160 100 Q150 80 120 70 M160 100 Q170 80 200 70" stroke="#fef08a" strokeWidth="5" fill="none" />
        <path d="M120 70 Q95 65 75 80 M120 70 Q110 50 100 40" stroke="#fef08a" strokeWidth="3" fill="none" />
        <path d="M200 70 Q225 65 245 80 M200 70 Q210 50 220 40" stroke="#fef08a" strokeWidth="3" fill="none" />
        <path d="M160 100 Q160 65 160 30" stroke="#fef08a" strokeWidth="3" fill="none" />
        {/* Intricate Foliage & Intertwined Tendrils */}
        <circle cx="100" cy="40" r="8" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="160" cy="30" r="9" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="220" cy="40" r="8" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="75" cy="80" r="7" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="245" cy="80" r="7" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="135" cy="55" r="6" fill="none" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="185" cy="55" r="6" fill="none" stroke="#fef08a" strokeWidth="1.5" />
      </svg>
    ),
  },

  bombay: {
    landmark: "Gateway of India",
    subtitle: "Indo-Saracenic Basalt Archway · Mumbai",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_bombay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#450a0a" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_bombay)" />
        {/* Arabian Sea Waters */}
        <rect x="0" y="132" width="320" height="28" fill="#0369a1" />
        <path d="M0 135 Q80 130 160 136 T320 133 L320 160 L0 160 Z" fill="#0c4a6e" opacity="0.7" />
        {/* Basalt Monument Center */}
        {/* Central Arch & Pillars */}
        <rect x="85" y="45" width="150" height="90" fill="#fde68a" />
        {/* Central Dome */}
        <path d="M135 45 Q160 15 185 45 Z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
        {/* Corner Turrets / Minarets */}
        <rect x="80" y="32" width="16" height="103" fill="#fde68a" />
        <path d="M80 32 Q88 18 96 32 Z" fill="#fef08a" />
        <rect x="224" y="32" width="16" height="103" fill="#fde68a" />
        <path d="M224 32 Q232 18 240 32 Z" fill="#fef08a" />
        {/* Great Central Archway Cutout */}
        <path d="M132 135 L132 78 Q160 52 188 78 L188 135 Z" fill="#0f172a" />
        {/* Flanking Arches */}
        <path d="M100 135 L100 95 Q112 85 124 95 L124 135 Z" fill="#1e293b" />
        <path d="M196 135 L196 95 Q208 85 220 95 L220 135 Z" fill="#1e293b" />
        {/* Jali Lattice in Upper Spandrels */}
        <circle cx="160" cy="62" r="5" fill="#f59e0b" />
      </svg>
    ),
  },

  hyderabad: {
    landmark: "Charminar",
    subtitle: "Four Grand Minarets & Arches · Hyderabad",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_hyd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_hyd)" />
        {/* Charminar Square Monument Base */}
        <rect x="95" y="65" width="130" height="75" fill="#fed7aa" />
        {/* Grand 48-Meter Minarets (Corner 1 and Corner 4) */}
        <rect x="80" y="18" width="18" height="122" fill="#ffedd5" />
        <path d="M80 18 Q89 2 98 18 Z" fill="#fde047" />
        <circle cx="89" cy="50" r="11" fill="#fed7aa" />
        <circle cx="89" cy="85" r="11" fill="#fed7aa" />

        <rect x="222" y="18" width="18" height="122" fill="#ffedd5" />
        <path d="M222 18 Q231 2 240 18 Z" fill="#fde047" />
        <circle cx="231" cy="50" r="11" fill="#fed7aa" />
        <circle cx="231" cy="85" r="11" fill="#fed7aa" />
        {/* Great Pointed Grand Arch */}
        <path d="M125 140 L125 90 Q160 55 195 90 L195 140 Z" fill="#0f172a" />
        {/* Upper Balcony / Mosque arcade */}
        <rect x="95" y="55" width="130" height="10" fill="#f97316" />
        <rect x="110" y="60" width="8" height="10" fill="#1e293b" />
        <rect x="130" y="60" width="8" height="10" fill="#1e293b" />
        <rect x="150" y="60" width="8" height="10" fill="#1e293b" />
        <rect x="170" y="60" width="8" height="10" fill="#1e293b" />
        <rect x="190" y="60" width="8" height="10" fill="#1e293b" />
        {/* Ground */}
        <rect x="0" y="140" width="320" height="20" fill="#334155" />
      </svg>
    ),
  },

  kolkatta: {
    landmark: "Howrah Bridge",
    subtitle: "Cantilever Steel Marvel over Hooghly · Kolkata",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_kolkatta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#450a0a" />
            <stop offset="50%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_kolkatta)" />
        {/* Hooghly River */}
        <rect x="0" y="125" width="320" height="35" fill="#0284c7" />
        <path d="M0 128 Q80 122 160 130 T320 126 L320 160 L0 160 Z" fill="#0369a1" opacity="0.6" />
        {/* Howrah Bridge Main Steel Pylons */}
        <path d="M60 135 L85 30 L95 30 L110 135" stroke="#f8fafc" strokeWidth="3" fill="none" />
        <path d="M210 135 L225 30 L235 30 L260 135" stroke="#f8fafc" strokeWidth="3" fill="none" />
        {/* Upper Cantilever Truss Span */}
        <line x1="90" y1="30" x2="230" y2="30" stroke="#f8fafc" strokeWidth="2.5" />
        {/* Diagonal Cross-bracing (Lattice) */}
        <line x1="90" y1="30" x2="135" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="135" y1="30" x2="90" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="135" y1="30" x2="185" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="185" y1="30" x2="135" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="185" y1="30" x2="230" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="230" y1="30" x2="185" y2="115" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Suspended Deck */}
        <rect x="0" y="112" width="320" height="6" fill="#cbd5e1" />
        {/* Wooden ferry boat on river */}
        <path d="M140 142 Q155 138 175 142 L170 146 L143 146 Z" fill="#1e293b" />
      </svg>
    ),
  },

  // ─── BLUE GROUP ────────────────────────────────────────────────────────────
  patna: {
    landmark: "The Golghar",
    subtitle: "Historic Beehive Granary & Ganges · Patna",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_patna" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_patna)" />
        {/* Ganges riverbank */}
        <rect x="0" y="135" width="320" height="25" fill="#0369a1" />
        {/* Giant Beehive / Stupa Dome */}
        <path d="M85 140 Q160 18 235 140 Z" fill="#fed7aa" stroke="#fb923c" strokeWidth="2" />
        {/* Iconic Dual Spiral Staircases curving to the top */}
        <path d="M85 140 Q110 95 160 38" stroke="#7c2d12" strokeWidth="2.5" fill="none" />
        <path d="M235 140 Q210 95 160 38" stroke="#7c2d12" strokeWidth="2.5" fill="none" />
        {/* Top observatory platform */}
        <circle cx="160" cy="34" r="6" fill="#f8fafc" stroke="#c2410c" strokeWidth="1" />
        {/* Windows / grain openings */}
        <circle cx="160" cy="70" r="3" fill="#431407" />
        <circle cx="140" cy="95" r="3" fill="#431407" />
        <circle cx="180" cy="95" r="3" fill="#431407" />
      </svg>
    ),
  },

  indore: {
    landmark: "Rajwada Palace",
    subtitle: "Seven-Storey Maratha Holkar Palace · Indore",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_indore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_indore)" />
        {/* 7-Story Royal Holkar Palace Facade */}
        {/* Stone bottom 3 stories */}
        <rect x="110" y="90" width="100" height="50" fill="#94a3b8" />
        {/* Grand wooden upper 4 stories */}
        <rect x="115" y="72" width="90" height="18" fill="#78350f" />
        <rect x="120" y="54" width="80" height="18" fill="#92400e" />
        <rect x="125" y="38" width="70" height="16" fill="#b45309" />
        <rect x="130" y="24" width="60" height="14" fill="#d97706" />
        {/* Mughal-style Fluted Domes atop */}
        <path d="M150 24 Q160 10 170 24 Z" fill="#fde047" />
        <path d="M132 24 Q138 14 144 24 Z" fill="#fde047" />
        <path d="M176 24 Q182 14 188 24 Z" fill="#fde047" />
        {/* Wooden Jharokha Balconies */}
        <rect x="135" y="42" width="10" height="8" fill="#fef08a" />
        <rect x="155" y="42" width="10" height="8" fill="#fef08a" />
        <rect x="175" y="42" width="10" height="8" fill="#fef08a" />
        {/* Grand Iron-studded Entrance Arch */}
        <path d="M150 140 L150 110 Q160 100 170 110 L170 140 Z" fill="#0f172a" />
      </svg>
    ),
  },

  jaipur: {
    landmark: "Hawa Mahal",
    subtitle: "Palace of Winds & 953 Jharokhas · Jaipur",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_jaipur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="45%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_jaipur)" />
        {/* Crown of Lord Krishna / Pyramidal Honeycomb Facade */}
        {/* Level 5 (top) */}
        <polygon points="145,35 160,18 175,35" fill="#f43f5e" />
        {/* Level 4 */}
        <rect x="135" y="35" width="50" height="20" fill="#fb7185" />
        {/* Level 3 */}
        <rect x="120" y="55" width="80" height="25" fill="#f43f5e" />
        {/* Level 2 */}
        <rect x="105" y="80" width="110" height="30" fill="#e11d48" />
        {/* Level 1 (base) */}
        <rect x="90" y="110" width="140" height="35" fill="#be123c" />
        {/* Domed Casements & Tiny Jharokhas (Screen Windows) */}
        <circle cx="160" cy="45" r="4" fill="#fef08a" />
        <circle cx="140" cy="67" r="4" fill="#fef08a" />
        <circle cx="160" cy="67" r="4" fill="#fef08a" />
        <circle cx="180" cy="67" r="4" fill="#fef08a" />
        <circle cx="120" cy="95" r="4" fill="#fef08a" />
        <circle cx="140" cy="95" r="4" fill="#fef08a" />
        <circle cx="160" cy="95" r="4" fill="#fef08a" />
        <circle cx="180" cy="95" r="4" fill="#fef08a" />
        <circle cx="200" cy="95" r="4" fill="#fef08a" />
        <circle cx="110" cy="125" r="4" fill="#fef08a" />
        <circle cx="130" cy="125" r="4" fill="#fef08a" />
        <circle cx="150" cy="125" r="4" fill="#fef08a" />
        <circle cx="170" cy="125" r="4" fill="#fef08a" />
        <circle cx="190" cy="125" r="4" fill="#fef08a" />
        <circle cx="210" cy="125" r="4" fill="#fef08a" />
        {/* Pink City Street level */}
        <rect x="0" y="145" width="320" height="15" fill="#334155" />
      </svg>
    ),
  },

  agra: {
    landmark: "The Taj Mahal",
    subtitle: "Wonder of the World · Ivory Marble · Agra",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_agra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="45%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_agra)" />
        {/* Full Moon Glow */}
        <circle cx="235" cy="40" r="22" fill="#f8fafc" opacity="0.35" />
        <circle cx="235" cy="40" r="14" fill="#f8fafc" opacity="0.8" />
        {/* Red Sandstone Plinth */}
        <rect x="85" y="118" width="150" height="12" fill="#f8fafc" />
        {/* Main Marble Mausoleum Structure */}
        <rect x="115" y="65" width="90" height="53" fill="#f8fafc" />
        {/* Iconic Onion Central Dome */}
        <path d="M142 65 Q135 32 160 22 Q185 32 178 65 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="160" y1="22" x2="160" y2="12" stroke="#fef08a" strokeWidth="1.5" />
        {/* Flanking Chhatri Domes */}
        <path d="M122 65 Q128 50 134 65 Z" fill="#ffffff" />
        <path d="M186 65 Q192 50 198 65 Z" fill="#ffffff" />
        {/* Grand Iwan Center Arch */}
        <path d="M145 118 L145 80 Q160 68 175 80 L175 118 Z" fill="#1e293b" />
        {/* Four Slender Minarets */}
        <rect x="88" y="42" width="6" height="76" fill="#f8fafc" />
        <path d="M87 42 Q91 32 95 42 Z" fill="#ffffff" />
        <rect x="226" y="42" width="6" height="76" fill="#f8fafc" />
        <path d="M225 42 Q229 32 233 42 Z" fill="#ffffff" />
        {/* Charbagh Reflecting Pool */}
        <polygon points="120,130 200,130 230,160 90,160" fill="#0284c7" />
        <ellipse cx="160" cy="145" rx="30" ry="8" fill="#ffffff" opacity="0.3" />
      </svg>
    ),
  },

  kanpur: {
    landmark: "Kanpur Memorial Church",
    subtitle: "Lombardic Gothic Spires & Ganges Basin · Kanpur",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_kanpur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_kanpur)" />
        {/* Ganges basin banks */}
        <rect x="0" y="138" width="320" height="22" fill="#0369a1" />
        {/* Red Brick Gothic Edifice */}
        <rect x="110" y="80" width="100" height="60" fill="#b91c1c" />
        {/* Soaring Gothic Spire Tower */}
        <rect x="145" y="45" width="30" height="95" fill="#991b1b" />
        <polygon points="140,45 160,10 180,45" fill="#f8fafc" />
        <line x1="160" y1="10" x2="160" y2="3" stroke="#fef08a" strokeWidth="2" />
        {/* Lancet stained glass windows */}
        <path d="M125 110 L125 90 Q130 84 135 90 L135 110 Z" fill="#fde047" />
        <path d="M152 75 L152 60 Q160 54 168 60 L168 75 Z" fill="#fde047" />
        <path d="M185 110 L185 90 Q190 84 195 90 L195 110 Z" fill="#fde047" />
      </svg>
    ),
  },

  // ─── SPECIAL PROPERTIES ────────────────────────────────────────────────────
  railway: {
    landmark: "Indian Railways",
    subtitle: "Lifeline of the Nation · WAP-7 Locomotive",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_rail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="60%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_rail)" />
        {/* Dual Steel Tracks */}
        <line x1="0" y1="135" x2="320" y2="135" stroke="#94a3b8" strokeWidth="3" />
        <line x1="0" y1="145" x2="320" y2="145" stroke="#94a3b8" strokeWidth="3" />
        {/* High-speed Indian Electric / Steam Locomotive */}
        <path d="M80 135 L85 75 Q110 50 180 50 L240 50 L250 135 Z" fill="#dc2626" />
        <rect x="180" y="60" width="45" height="25" rx="3" fill="#38bdf8" />
        {/* Tricolor stripe on loco body */}
        <rect x="85" y="95" width="160" height="4" fill="#f97316" />
        <rect x="85" y="99" width="160" height="4" fill="#f8fafc" />
        <rect x="85" y="103" width="160" height="4" fill="#16a34a" />
        {/* High-beam Headlight & Pantograph */}
        <circle cx="242" cy="78" r="8" fill="#fef08a" />
        <circle cx="242" cy="78" r="5" fill="#ffffff" />
        <polygon points="120,50 140,25 160,25 180,50" stroke="#f8fafc" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },

  roadways: {
    landmark: "National Roadways",
    subtitle: "Grand Trunk Corridor & Highway Transport",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="60%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_road)" />
        {/* Golden Quadrilateral Highway receding to horizon */}
        <polygon points="150,85 170,85 280,160 40,160" fill="#334155" />
        <line x1="160" y1="85" x2="160" y2="160" stroke="#fef08a" strokeWidth="3" strokeDasharray="8,8" />
        {/* Inter-state Transport Volvo Bus */}
        <rect x="125" y="95" width="70" height="38" rx="6" fill="#2563eb" />
        <rect x="130" y="100" width="60" height="15" rx="3" fill="#38bdf8" />
        <circle cx="140" cy="133" r="5" fill="#0f172a" />
        <circle cx="180" cy="133" r="5" fill="#0f172a" />
        {/* Milestone */}
        <rect x="60" y="125" width="16" height="25" rx="8" fill="#f8fafc" stroke="#f59e0b" strokeWidth="2" />
        <circle cx="68" cy="132" r="4" fill="#f59e0b" />
      </svg>
    ),
  },

  electrical_company: {
    landmark: "Electrical Company",
    subtitle: "National Power Grid & High-Voltage Transmission",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_electric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="60%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_electric)" />
        {/* Giant Transmission Tower Pylon */}
        <line x1="160" y1="15" x2="110" y2="160" stroke="#f8fafc" strokeWidth="2.5" />
        <line x1="160" y1="15" x2="210" y2="160" stroke="#f8fafc" strokeWidth="2.5" />
        {/* Cross arms */}
        <line x1="120" y1="45" x2="200" y2="45" stroke="#f8fafc" strokeWidth="2.5" />
        <line x1="100" y1="75" x2="220" y2="75" stroke="#f8fafc" strokeWidth="2.5" />
        <line x1="110" y1="110" x2="210" y2="110" stroke="#f8fafc" strokeWidth="2.5" />
        {/* Internal Cross-Bracing */}
        <line x1="130" y1="45" x2="190" y2="75" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="190" y1="45" x2="130" y2="75" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="120" y1="75" x2="200" y2="110" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="200" y1="75" x2="120" y2="110" stroke="#94a3b8" strokeWidth="1.5" />
        {/* High Voltage Lightning Arc */}
        <polygon points="160,25 152,50 164,50 155,75 170,48 158,48" fill="#fde047" />
      </svg>
    ),
  },

  water_works: {
    landmark: "Water Works",
    subtitle: "Hydro Reservoir & Grand Dam Spillway",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#082f49" />
            <stop offset="60%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_water)" />
        {/* Concrete Hydroelectric Dam Crest */}
        <rect x="40" y="55" width="240" height="30" fill="#64748b" />
        {/* Gushing Spillway Gates */}
        <rect x="70" y="65" width="20" height="20" fill="#0f172a" />
        <rect x="110" y="65" width="20" height="20" fill="#0f172a" />
        <rect x="150" y="65" width="20" height="20" fill="#0f172a" />
        <rect x="190" y="65" width="20" height="20" fill="#0f172a" />
        <rect x="230" y="65" width="20" height="20" fill="#0f172a" />
        {/* Roaring Cascading Waterfalls */}
        <path d="M70 85 Q80 140 60 160 L95 160 Q90 140 90 85 Z" fill="#38bdf8" opacity="0.8" />
        <path d="M110 85 Q120 140 100 160 L135 160 Q130 140 130 85 Z" fill="#bae6fd" opacity="0.9" />
        <path d="M150 85 Q160 140 140 160 L175 160 Q170 140 170 85 Z" fill="#38bdf8" opacity="0.8" />
        <path d="M190 85 Q200 140 180 160 L215 160 Q210 140 210 85 Z" fill="#bae6fd" opacity="0.9" />
        <path d="M230 85 Q240 140 220 160 L255 160 Q250 140 250 85 Z" fill="#38bdf8" opacity="0.8" />
      </svg>
    ),
  },

  motor_boat: {
    landmark: "Coastal Ferry",
    subtitle: "Arabian Sea Catamaran & Passenger Navigation",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_boat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_boat)" />
        {/* Coastal Ocean Waves */}
        <path d="M0 120 Q80 110 160 120 T320 115 L320 160 L0 160 Z" fill="#0369a1" />
        <path d="M0 135 Q70 125 150 135 T320 130 L320 160 L0 160 Z" fill="#0c4a6e" />
        {/* Sleek Twin-Hull Catamaran Ferry */}
        <path d="M80 120 L110 85 L220 85 L245 120 Z" fill="#f8fafc" />
        <rect x="120" y="70" width="85" height="18" rx="3" fill="#38bdf8" />
        {/* Speedboat wake */}
        <path d="M50 135 Q100 122 170 125" stroke="#f8fafc" strokeWidth="3" fill="none" strokeDasharray="6,4" />
      </svg>
    ),
  },

  air_india: {
    landmark: "Air India",
    subtitle: "The Maharaja Flag Carrier · Wings of India",
    svg: (accent, highlight) => (
      <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky_air" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#450a0a" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
        <rect width="320" height="160" fill="url(#sky_air)" />
        {/* Golden Sun & Golden Cloudline */}
        <circle cx="160" cy="80" r="48" fill="#fbbf24" opacity="0.35" />
        <path d="M20 140 Q60 120 100 135 Q140 115 180 130 Q220 110 260 130 T320 125 L320 160 L20 160 Z" fill="#ffffff" opacity="0.85" />
        {/* Iconic Wide-Body Airliner Climbing */}
        <g transform="translate(60, 30) rotate(-12)">
          {/* Fuselage */}
          <path d="M0 45 Q30 38 120 40 Q160 41 180 47 Q160 53 120 54 Q30 56 0 49 Z" fill="#f8fafc" />
          {/* Red livery stripe and tailfin */}
          <path d="M10 45 L15 15 L35 15 L25 45 Z" fill="#dc2626" />
          {/* Golden sun emblem on tail */}
          <circle cx="22" cy="30" r="4" fill="#fbbf24" />
          {/* Swept wings */}
          <polygon points="75,44 115,44 60,85 45,85" fill="#e2e8f0" />
        </g>
      </svg>
    ),
  },
}

/**
 * Universal Landmark Artwork component with graceful fallback.
 */
export const PropertyLandmarkArtwork: React.FC<PropertyLandmarkArtworkProps> = ({
  propertyId,
  propertyName,
  colorGroup = "NONE",
  className = "",
  style,
  showLabel = true,
}) => {
  const cleanId = (propertyId || "").toLowerCase().trim()
  const meta = LANDMARKS[cleanId]
  const palette = getPalette(colorGroup)

  return (
    <div
      className={`property-landmark-artwork ${className}`}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: "8px",
        background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)`,
        border: `1.5px solid ${palette.glow}`,
        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 0 1px ${palette.glow}`,
        ...style,
      }}
    >
      {meta ? (
        meta.svg(palette.accent, palette.highlight)
      ) : (
        /* Graceful Architectural Fallback */
        <svg viewBox="0 0 320 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sky_fallback" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="320" height="160" fill="url(#sky_fallback)" />
          <circle cx="160" cy="70" r="40" fill={palette.glow} />
          <path d="M110 140 L110 90 Q160 50 210 90 L210 140 Z" fill="#334155" stroke={palette.accent} strokeWidth="2" />
          <circle cx="160" cy="90" r="14" fill="#0f172a" stroke={palette.highlight} strokeWidth="1.5" />
        </svg>
      )}

      {/* Subtle Bottom Vignette Gradient to ensure contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(10, 15, 30, 0.88) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Elegant Landmark Identifier Badge */}
      {showLabel && meta && (
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            left: "10px",
            right: "10px",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: '"Oswald", sans-serif',
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.06em",
              color: "#ffffff",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
              lineHeight: 1.15,
            }}
          >
            {meta.landmark}
          </span>
          <span
            style={{
              fontFamily: '"Oswald", sans-serif',
              fontWeight: 600,
              fontSize: "8.5px",
              letterSpacing: "0.05em",
              color: palette.highlight,
              textShadow: "0 1px 2px rgba(0,0,0,0.9)",
              lineHeight: 1.1,
              marginTop: "1px",
            }}
          >
            {meta.subtitle}
          </span>
        </div>
      )}
    </div>
  )
}

export default PropertyLandmarkArtwork
