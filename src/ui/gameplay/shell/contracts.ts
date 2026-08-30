import type { ReactNode } from 'react'

export type DysonShellDirection = 'ltr' | 'rtl'

/**
 * A resource fact that has already been selected and formatted at the
 * presentation boundary. The shell does not derive values or rates.
 */
export interface DysonResourcePresentation {
  readonly label: ReactNode
  readonly value: string
  readonly fullPrecisionValue?: string
  readonly machineValue?: string
  readonly rate?: string
  readonly fullPrecisionRate?: string
  readonly detail?: ReactNode
}

/**
 * The three Unity-ordered resource positions used by the Dyson screen.
 */
export interface DysonResourceHeaderPresentation {
  readonly ariaLabel: string
  readonly cash: DysonResourcePresentation
  readonly totalBots: DysonResourcePresentation
  readonly science: DysonResourcePresentation
}

/**
 * One already-authorized destination. Locked and unrevealed destinations must
 * be omitted by the caller rather than represented as disabled shell items.
 */
export type DysonNavigationItem =
  | {
      readonly id: string
      readonly label: ReactNode
      readonly ariaLabel?: string
      readonly icon?: ReactNode
      readonly iconSrc?: string
      /** Compact value shown on the icon in bottom navigation and beside the label in the drawer. */
      readonly badge?: string
      /** Highlights a newly unlocked destination until it is first visited. */
      readonly newlyUnlocked?: boolean
      readonly progress?: {
        readonly fraction: number
        readonly label: string
      }
      readonly current: true
      readonly bottom?: boolean
      readonly href?: never
      readonly disabled?: never
    }
  | {
      readonly id: string
      readonly label: ReactNode
      readonly ariaLabel?: string
      readonly icon?: ReactNode
      readonly iconSrc?: string
      /** Compact value shown on the icon in bottom navigation and beside the label in the drawer. */
      readonly badge?: string
      /** Highlights a newly unlocked destination until it is first visited. */
      readonly newlyUnlocked?: boolean
      readonly progress?: {
        readonly fraction: number
        readonly label: string
      }
      readonly onActivate?: () => void
      readonly href?: string
      readonly disabled?: boolean
      readonly bottom?: boolean
      readonly current?: false
    }

export interface DysonNavigationPresentation {
  readonly ariaLabel: string
  readonly drawerAriaLabel?: string
  readonly bottomAriaLabel?: string
  readonly items: readonly DysonNavigationItem[]
  readonly includeBottomText?: boolean
}

/**
 * A named presentation region whose contents are owned by another feature.
 */
export interface DysonShellRegion {
  readonly ariaLabel: string
  readonly content: ReactNode
}

export interface DysonGameplayShellProps {
  readonly direction: DysonShellDirection
  readonly skipLinkLabel: string
  readonly menuHeading: ReactNode
  readonly closeMenuLabel: string
  readonly openMenuLabel: string
  readonly moreMenuLabel: string
  readonly moreMenuNewLabel?: string
  readonly heading: ReactNode
  readonly routeTheme?:
    | 'bots'
    | 'research'
    | 'skills'
    | 'infinity'
    | 'reality'
    | 'simulations'
    | 'quantum'
    | 'avocato'
    | 'offline-time'
    | 'statistics'
    | 'story'
    | 'wiki'
    | 'settings'
  /** Optional progression variant used only to refine an active route theme. */
  readonly routeThemeVariant?:
    | 'foundational'
    | 'information'
    | 'space-age'
  readonly navigation: DysonNavigationPresentation
  readonly resources: DysonResourceHeaderPresentation
  readonly showResourceHeader?: boolean
  readonly tinker?: DysonShellRegion
  readonly hasVisibleFacilities: boolean
  /**
   * The facility feature's complete semantic region. It owns its ordered grid
   * and optional next-tier teaser; the shell owns placement only.
   */
  readonly facilities: ReactNode
  readonly swarmVisual?: DysonShellRegion
  readonly info?: DysonShellRegion
  readonly productionSummary?: DysonShellRegion
  readonly distribution?: DysonShellRegion
  readonly sidePanelSupplement?: ReactNode
  /** Temporary route-owned status shown above the active playfield. */
  readonly routeBanner?: DysonShellRegion
  readonly routeSupplement?: DysonShellRegion
  readonly routeContent?: DysonShellRegion
  /** Lets a route-owned scrolling surface meet the shell edges without a
   * second shell inset. The route remains responsible for its content inset. */
  readonly routeContentEdgeToEdge?: boolean
}
