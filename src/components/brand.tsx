import { cn } from "@/lib/utils"

/**
 * Brand marks for BAHANDI / Burgeri Ops.
 *
 * Colors come straight from the company logo: charcoal #2B2A27, green #1B7A43,
 * orange #E2682B on white. `BahandiMark` mirrors public/favicon.svg so the
 * in-app icon and the browser tab match. `BahandiWordmark` recreates the
 * green-and-orange company logo for use in the footer.
 */

export function BahandiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-9", className)}
      role="img"
      aria-label="Burgeri"
    >
      <rect x="0" y="0" width="64" height="64" rx="14" fill="#2B2A27" />
      <rect x="9" y="11" width="46" height="8" rx="2.5" fill="#1B7A43" />
      <rect x="9" y="45" width="46" height="8" rx="2.5" fill="#1B7A43" />
      <rect x="9" y="24" width="11" height="16" rx="2.5" fill="#E2682B" />
      <rect x="44" y="24" width="11" height="16" rx="2.5" fill="#E2682B" />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="800"
        fontSize="27"
        fill="#FFFFFF"
      >
        B
      </text>
    </svg>
  )
}

export function BahandiWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 236 64"
      className={cn("h-7 w-auto", className)}
      role="img"
      aria-label="BAHANDI"
    >
      <rect x="0" y="0" width="236" height="64" rx="10" fill="#143C27" />
      <rect x="14" y="9" width="208" height="7" rx="2" fill="#1B7A43" />
      <rect x="14" y="48" width="208" height="7" rx="2" fill="#1B7A43" />
      <rect x="14" y="22" width="9" height="20" rx="2" fill="#E2682B" />
      <rect x="213" y="22" width="9" height="20" rx="2" fill="#E2682B" />
      <text
        x="118"
        y="44"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="800"
        fontSize="30"
        letterSpacing="2"
        fill="#FFFFFF"
      >
        BAHANDI
      </text>
    </svg>
  )
}
