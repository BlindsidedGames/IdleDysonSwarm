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
import {
  DysonGameplayShell,
  navigationAssets,
} from '../shell'
import { TinkerSurface } from '../tinker'
import {
  formatGameNumber,
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
  BotDistribution,
  DysonInfo,
} from './DysonControls'
import {
  DysonProductionSummary,
} from './DysonLowerFacts'
import { DysonSwarmVisual } from './DysonSwarmVisual'

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
    formatGameNumber(locale, value)
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
  const hasFacilityContent =
    hasVisibleFacilities || visibility.showNextTierTeaser

  return (
    <DysonGameplayShell
      direction={LOCALE_REGISTRY[locale].direction}
      skipLinkLabel={intl.formatMessage(messages.skipToGame)}
      heading={intl.formatMessage(messages.route)}
      navigation={{
        ariaLabel: intl.formatMessage(messages.primaryNavigation),
        drawerAriaLabel: intl.formatMessage(messages.sideNavigation),
        bottomAriaLabel: intl.formatMessage(messages.bottomNavigation),
        items: [
          {
            id: 'bots',
            label: intl.formatMessage(messages.route),
            iconSrc: navigationAssets.bots,
            current: true,
          },
          {
            id: 'research',
            label: intl.formatMessage(messages.researchRoute),
            iconSrc: navigationAssets.research,
            disabled: true,
          },
          {
            id: 'skills',
            label: intl.formatMessage(messages.skillsRoute),
            iconSrc: navigationAssets.skills,
            disabled: true,
          },
          {
            id: 'infinity',
            label: intl.formatMessage(messages.infinityRoute),
            iconSrc: navigationAssets.infinity,
            disabled: true,
            bottom: false,
          },
          {
            id: 'story',
            label: intl.formatMessage(messages.storyRoute),
            iconSrc: navigationAssets.story,
            disabled: true,
          },
          {
            id: 'wiki',
            label: intl.formatMessage(messages.wikiRoute),
            iconSrc: navigationAssets.wiki,
            disabled: true,
          },
          {
            id: 'offline-time',
            label: intl.formatMessage(messages.offlineTimeRoute),
            iconSrc: navigationAssets.offlineTime,
            disabled: true,
            bottom: false,
          },
          {
            id: 'settings',
            label: intl.formatMessage(messages.settingsRoute),
            iconSrc: navigationAssets.settings,
            disabled: true,
          },
        ],
      }}
      sidePanelSupplement={
        dyson.status === 'ready' ? (
          <>
            <div>
              {intl.formatMessage(messages.cashMultiplier, {
                value: display(dyson.value.globals.moneyMultiplier),
              })}
            </div>
            <div>
              {intl.formatMessage(messages.researchMultiplier, {
                value: display(dyson.value.globals.scienceMultiplier),
              })}
            </div>
            <div>
              {intl.formatMessage(messages.panelLifetime, {
                value: display(
                  dyson.value.globals.panelLifetimeSeconds,
                ),
              })}
            </div>
          </>
        ) : undefined
      }
      hasVisibleFacilities={
        hasFacilityContent
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
      swarmVisual={{
        ariaLabel: intl.formatMessage(messages.dysonSwarm),
        content: <DysonSwarmVisual />,
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
        hasFacilityContent ? (
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
              facilityFacts={dyson.value.presentation.facilities}
              purchasePreviews={
                gameplay.previews.dyson.basicFacilities
              }
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
          </section>
        )
      }
      info={{
        ariaLabel: intl.formatMessage(messages.info),
        content: (
          <DysonInfo
            locale={locale}
            metric={dyson.value.presentation.activePanelMetric}
            currentGoal={dyson.value.presentation.currentGoal}
            panelLifetimeSeconds={
              dyson.value.globals.panelLifetimeSeconds
            }
            totalPanelsDecayed={
              gameplay.progression.dyson.totalPanelsDecayed
            }
            buyMode={
              gameplay.progression.dyson.automation.buyMode
            }
            roundedBulkBuy={
              gameplay.progression.dyson.automation.roundedBulkBuy
            }
            buyModeRouteAvailable={
              gameplay.commands.byKind[
                'dyson.set-buy-mode'
              ].routeAvailable
            }
            roundedBulkRouteAvailable={
              gameplay.commands.byKind[
                'dyson.set-rounded-bulk-buy'
              ].routeAvailable
            }
            dispatchPlayer={dispatchPlayer}
          />
        ),
      }}
      productionSummary={{
        ariaLabel: intl.formatMessage(messages.productionSummary),
        content: (
          <DysonProductionSummary
            gameplay={gameplay}
            locale={locale}
          />
        ),
      }}
      distribution={{
        ariaLabel: intl.formatMessage(messages.botDistribution),
        content: (
          <BotDistribution
            locale={locale}
            distribution={
              gameplay.progression.dyson.botDistribution
            }
            workersFraction={
              gameplay.derived.dysonBotDistribution.workersFraction
            }
            scientistsFraction={
              gameplay.derived.dysonBotDistribution.scientistsFraction
            }
            multitasking={
              gameplay.progression.quantum.unlocks.botMultitasking
            }
            routeAvailable={
              gameplay.commands.byKind[
                'dyson.set-bot-distribution'
              ].routeAvailable
            }
            dispatchPlayer={dispatchPlayer}
          />
        ),
      }}
    />
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
