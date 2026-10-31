import React from "react"

export interface SpecialPropertyIconProps {
  propertyId: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * 1. Railway: Locomotive engine with headlights, cowcatcher, and tracks
 */
export function RailwayIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Locomotive cab body */}
      <rect x="4" y="3" width="16" height="13" rx="3" />
      {/* Front windows */}
      <path d="M7 7h10M7 10.5h10" />
      {/* Dual headlights */}
      <circle cx="8" cy="13.5" r="1" fill="currentColor" />
      <circle cx="16" cy="13.5" r="1" fill="currentColor" />
      {/* Cowcatcher / plow base */}
      <path d="M5 16l-2 4h18l-2-4" />
      {/* Track ties */}
      <path d="M8 20v2M16 20v2" />
    </svg>
  )
}

/**
 * 2. Roadways: Perspective highway corridor with dashed centerline
 */
export function RoadwaysIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Perspective highway boundaries */}
      <path d="M4 21L9 3h6l5 18" />
      {/* Center divider dashes */}
      <path d="M12 6v2M12 11v2.5M12 16.5v2.5" strokeWidth="2" />
      {/* Road horizon and curb */}
      <path d="M9 3h6" />
      <path d="M3 21h18" />
    </svg>
  )
}

/**
 * 3. Electrical Company: High-voltage transmission power pylon
 */
export function ElectricalIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Pylon framework */}
      <path d="M7 21l3-17h4l3 17" />
      {/* Upper crossarm */}
      <path d="M5 8.5h14" />
      {/* Lower crossarm */}
      <path d="M3 13.5h18" />
      {/* Bracing diagonals */}
      <path d="M8.5 8.5l7 5M15.5 8.5l-7 5" />
      {/* Insulator strings */}
      <path d="M5 8.5v2M19 8.5v2M3 13.5v2M21 13.5v2" />
      {/* Base truss */}
      <path d="M6 21h12" />
    </svg>
  )
}

/**
 * 4. Air India: Commercial passenger airliner silhouette
 */
export function AirIndiaIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Streamlined aircraft planform */}
      <path d="M12 2c-.8 0-1.4.9-1.4 2.2v6.1L2.5 14v2.4l8.1-2.4v4.3L8 19.8v1.6l4-.9 4 .9v-1.6l-2.6-1.5v-4.3l8.1 2.4V14L13.4 10.3V4.2C13.4 2.9 12.8 2 12 2z" />
    </svg>
  )
}

/**
 * 5. Water Works: Hydro reservoir water droplet with internal ripples
 */
export function WaterWorksIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Pure droplet silhouette */}
      <path d="M12 2.5C12 2.5 6 9.5 6 14.5a6 6 0 0012 0c0-5-6-12-6-12z" />
      {/* Concentric wave arcs */}
      <path d="M8.5 15c1 1.2 2.3 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
      <path d="M9.8 12.5c.6.7 1.4 1 2.2 1s1.6-.3 2.2-1" />
    </svg>
  )
}

/**
 * 6. Motor Boat: Speedboat catamaran sailing over ocean waves
 */
export function MotorBoatIcon({ size = 16, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Hull silhouette */}
      <path d="M2.5 14l2-4.5h11l6 4.5H2.5z" />
      {/* Cockpit windshield */}
      <path d="M7.5 9.5l2.5-4.5h4l2.5 4.5" />
      {/* Motor outboard mount */}
      <path d="M2.5 14v3" />
      {/* Ocean water waves */}
      <path d="M2 19c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1" />
    </svg>
  )
}

/**
 * Unified dispatch for all six canonical Crownfall special properties
 */
export function SpecialPropertyIcon({
  propertyId,
  size = 16,
  className = "",
  style,
}: SpecialPropertyIconProps) {
  const norm = (propertyId || "").toLowerCase().trim()

  switch (norm) {
    case "railway":
      return <RailwayIcon size={size} className={className} style={style} />
    case "roadways":
      return <RoadwaysIcon size={size} className={className} style={style} />
    case "electrical_company":
    case "electrical":
      return <ElectricalIcon size={size} className={className} style={style} />
    case "air_india":
    case "airways":
      return <AirIndiaIcon size={size} className={className} style={style} />
    case "water_works":
    case "water":
      return <WaterWorksIcon size={size} className={className} style={style} />
    case "motor_boat":
    case "boat":
      return <MotorBoatIcon size={size} className={className} style={style} />
    default:
      return null
  }
}

export default SpecialPropertyIcon

