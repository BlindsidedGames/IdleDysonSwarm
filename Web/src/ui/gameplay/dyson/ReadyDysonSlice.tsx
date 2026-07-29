import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { useIntl } from 'react-intl'
import type {
  FrontendApplicationSnapshot,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type { DeepReadonly } from '../../../core/contracts'
import '../facilities/facilities.css'
import { DysonGameplayShell } from '../shell'
import { TinkerSurface } from '../tinker'
import {
  formatNumber,
  type NumericValue,
} from '../../i18n/formatters'
import {
  LOCALE_REGISTRY,
  type EnabledLocale,
} from '../../i18n/localeRegistry'
import {
  useBrowserRuntimeSnapshot,
  type BrowserUiRuntimeFoundation,
} from '../../runtime'
import {
  beginFirstSliceSnapshotSelection,
  isNewCommittedRevision,
  recordFirstSliceReactCommit,
  type FirstSliceCommitRevision,
} from '../../performance/firstSliceCommitProbe'
import { readyDysonMessages as messages } from './messages'
import {
  DysonBotDistributionFacts,
  DysonProductionSummary,
} from './DysonLowerFacts'

const BasicFacilityRegion = lazy(async () => {
  const module = await import('../facilities')
  return { default: module.BasicFacilityRegion }
})

type ReadySnapshot = DeepReadonly<
  Extract<
    FrontendApplicationSnapshot,
    { readonly phase: 'ready' }
  >
>

export interface ReadyDysonRuntimeHostProps {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly locale: EnabledLocale
}

/**
 * Owns the single ready-state runtime subscription. The active-time driver and
 * every command remain inside BrowserUiRuntimeFoundation.
 */
function UnprobedReadyDysonRuntimeHost({
  runtime,
  locale,
}: ReadyDysonRuntimeHostProps) {
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const dispatchPlayer = useCallback(
    (command: CanonicalPlayerCommand) =>
      runtime.dispatchPlayer(command),
    [runtime],
  )
  if (snapshot.phase !== 'ready') return null
  return (
    <ReadyDysonSlice
      snapshot={snapshot}
      locale={locale}
      dispatchPlayer={dispatchPlayer}
    />
  )
}

export function ProbedReadyDysonRuntimeHost({
  runtime,
  locale,
}: ReadyDysonRuntimeHostProps) {
  const selectionStartedAt = beginFirstSliceSnapshotSelection()
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const dispatchPlayer = useCallback(
    (command: CanonicalPlayerCommand) =>
      runtime.dispatchPlayer(command),
    [runtime],
  )
  const previousRevision = useRef<FirstSliceCommitRevision | null>(
    null,
  )
  const sessionRevision =
    snapshot.phase === 'ready' ? snapshot.revision.session : null
  const stateRevision =
    snapshot.phase === 'ready' ? snapshot.revision.state : null
  useLayoutEffect(() => {
    const committedAt = performance.now()

    if (sessionRevision === null || stateRevision === null) return
    const current = {
      session: sessionRevision,
      state: stateRevision,
    }
    const shouldRecord = isNewCommittedRevision(
      previousRevision.current,
      current,
    )
    previousRevision.current = current
    if (shouldRecord) {
      recordFirstSliceReactCommit(
        selectionStartedAt,
        committedAt,
        current,
      )
    }
  }, [selectionStartedAt, sessionRevision, stateRevision])
  if (snapshot.phase !== 'ready') return null
  return (
    <ReadyDysonSlice
      snapshot={snapshot}
      locale={locale}
      dispatchPlayer={dispatchPlayer}
    />
  )
}

/**
 * Selects the zero-probe production host statically. Performance-mode builds
 * substitute the revision-paired measurement host before tree shaking.
 */
export const ReadyDysonRuntimeHost =
  import.meta.env.MODE === 'performance'
    ? ProbedReadyDysonRuntimeHost
    : UnprobedReadyDysonRuntimeHost

export interface ReadyDysonSliceProps {
  readonly snapshot: ReadySnapshot
  readonly locale: EnabledLocale
  readonly dispatchPlayer: BrowserUiRuntimeFoundation['dispatchPlayer']
}

/**
 * Maps published canonical facts into presentation components without
 * recalculating unlocks, affordability, timing or command outcomes.
 */
export function ReadyDysonSlice({
  snapshot,
  locale,
  dispatchPlayer,
}: ReadyDysonSliceProps) {
  const intl = useIntl()
  const gameplay = snapshot.gameplay
  const dyson = gameplay.derived.dyson
  const tinker = gameplay.runtime.tinker

  if (dyson.status !== 'ready') {
    return (
      <main role="alert">
        {intl.formatMessage(messages.unavailable)}
      </main>
    )
  }

  const resources = gameplay.resources.dyson
  const rates = dyson.value.rates
  const visibility = gameplay.visibility.dyson
  const display = (value: NumericValue) =>
    formatDisplayNumber(locale, value)
  const precise = (value: NumericValue) =>
    formatPreciseNumber(locale, value)
  const cashValue = (value: string) =>
    intl.formatMessage(messages.cashValue, { value })
  const cashRate = (value: string) =>
    intl.formatMessage(messages.cashRate, { value })
  const scienceRate = (value: string) =>
    intl.formatMessage(messages.scienceRate, { value })
  const hasVisibleFacilities =
    visibility.visibleBasicFacilityIds.length > 0

  return (
    <DysonGameplayShell
      direction={LOCALE_REGISTRY[locale].direction}
      skipLinkLabel={intl.formatMessage(messages.skipToGame)}
      heading={intl.formatMessage(messages.route)}
      navigation={{
        ariaLabel: intl.formatMessage(messages.primaryNavigation),
        items: [
          {
            id: 'bots',
            label: intl.formatMessage(messages.route),
            current: true,
          },
        ],
      }}
      hasVisibleFacilities={
        hasVisibleFacilities
      }
      resources={{
        ariaLabel: intl.formatMessage(messages.resources),
        cash: {
          label: intl.formatMessage(messages.cash),
          value: cashValue(display(resources.money)),
          fullPrecisionValue: cashValue(precise(resources.money)),
          machineValue: String(resources.money),
          rate: cashRate(display(rates.money)),
          fullPrecisionRate: cashRate(precise(rates.money)),
        },
        totalBots: {
          label: intl.formatMessage(messages.totalBots),
          value: display(resources.bots),
          fullPrecisionValue: precise(resources.bots),
          machineValue: String(resources.bots),
        },
        science: {
          label: intl.formatMessage(messages.science),
          value: display(resources.science),
          fullPrecisionValue: precise(resources.science),
          machineValue: String(resources.science),
          rate: scienceRate(display(rates.science)),
          fullPrecisionRate: scienceRate(precise(rates.science)),
        },
      }}
      tinker={
        visibility.showTinker && tinker.status === 'ready'
          ? {
              ariaLabel: intl.formatMessage(messages.tinker),
              content: (
                <TinkerSurface
                  facts={tinker.value}
                  dispatch={dispatchPlayer}
                />
              ),
            }
          : undefined
      }
      facilities={
        hasVisibleFacilities ? (
          <Suspense
            fallback={
              <div
                aria-label={intl.formatMessage(messages.facilities)}
                aria-busy="true"
              />
            }
          >
          <BasicFacilityRegion
          locale={locale}
          visibleBasicFacilityIds={
            visibility.visibleBasicFacilityIds
          }
          showNextTierTeaser={visibility.showNextTierTeaser}
          facilityFacts={{
            assembly_lines: {
              owned:
                gameplay.progression.dyson.facilities.assembly_lines,
              productionPerSecond: rates.bots,
            },
            ai_managers: {
              owned:
                gameplay.progression.dyson.facilities.ai_managers,
              productionPerSecond: rates.assembly_lines,
            },
            servers: {
              owned: gameplay.progression.dyson.facilities.servers,
              productionPerSecond: rates.ai_managers,
            },
            data_centers: {
              owned:
                gameplay.progression.dyson.facilities.data_centers,
              productionPerSecond: rates.servers,
            },
            planets: {
              owned: gameplay.progression.dyson.facilities.planets,
              productionPerSecond: rates.data_centers,
            },
          }}
          purchasePreviews={gameplay.previews.dyson.basicFacilities}
          purchaseRouteAvailable={
            gameplay.commands.byKind[
              'dyson.purchase-basic-facility'
            ].routeAvailable
          }
          revision={snapshot.revision}
          dispatchPlayer={dispatchPlayer}
          />
          </Suspense>
        ) : (
          <section
            className="basic-facility-region"
            aria-label={intl.formatMessage(messages.facilities)}
          >
            {visibility.showNextTierTeaser && (
            <div className="basic-facility-region__teaser-surface">
              <bdi>{intl.formatMessage(messages.teaser)}</bdi>
            </div>
            )}
          </section>
        )
      }
      productionSummary={{
        ariaLabel: intl.formatMessage(messages.productionSummary),
        content: (
          <DysonProductionSummary
            gameplay={gameplay}
            locale={locale}
          />
        ),
      }}
      botDistribution={{
        ariaLabel: intl.formatMessage(messages.botDistribution),
        content: (
          <DysonBotDistributionFacts
            gameplay={gameplay}
            locale={locale}
          />
        ),
      }}
    />
  )
}

function formatDisplayNumber(
  locale: EnabledLocale,
  value: NumericValue,
): string {
  const magnitude =
    typeof value === 'bigint'
      ? value < 0n
        ? -value
        : value
      : Math.abs(value)
  return formatNumber(
    locale,
    value,
    magnitude >= 1000
      ? {
          notation: 'compact',
          maximumSignificantDigits: 4,
        }
      : {
          maximumFractionDigits: 3,
          useGrouping: true,
        },
  )
}

function formatPreciseNumber(
  locale: EnabledLocale,
  value: NumericValue,
): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 20,
    useGrouping: true,
  })
}
