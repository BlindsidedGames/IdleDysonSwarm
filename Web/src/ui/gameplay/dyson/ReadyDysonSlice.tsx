import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useIntl } from 'react-intl'
import type {
  FrontendApplicationSnapshot,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type { DeepReadonly } from '../../../core/contracts'
import { defaultSkillPresetColorId } from '../../../game-state/skillPresetColors'
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
  type UiRuntimeDevelopmentControls,
  type UiRuntimeImportResult,
} from '../../runtime'
import { SettingsSurface } from '../settings'
import { DebugSurface } from '../debug'
import type { SkillPresetActions } from '../skills'
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
import {
  SimulationTimeControl,
  type SpaceAgePurchaseQuantity,
} from '../simulations/SimulationsSurface'

const BasicFacilityRegion = lazy(async () => {
  const module = await import('../facilities')
  return { default: module.BasicFacilityRegion }
})

const ResearchSurface = lazy(async () => {
  const module = await import('../research')
  return { default: module.ResearchSurface }
})

const SkillsSurface = lazy(async () => {
  const module = await import('../skills')
  return { default: module.SkillsSurface }
})

const InfinitySurface = lazy(async () => {
  const module = await import('../infinity')
  return { default: module.InfinitySurface }
})

const RealitySurface = lazy(async () => {
  const module = await import('../reality')
  return { default: module.RealitySurface }
})

const SimulationsSurface = lazy(async () => {
  const module = await import('../simulations')
  return { default: module.SimulationsSurface }
})

export const SWARM_VISUALIZATION_STORAGE_KEY =
  'idle-dyson-swarm.show-visualization'

type ReadySnapshot = DeepReadonly<
  Extract<
    FrontendApplicationSnapshot,
    { readonly phase: 'ready' }
  >
>

export interface ReadyDysonRuntimeHostProps {
  readonly runtime: BrowserUiRuntimeFoundation
  readonly locale: EnabledLocale
  readonly resetSave?: () => Promise<UiRuntimeImportResult>
}

/**
 * Owns the single ready-state runtime subscription. The active-time driver and
 * every command remain inside BrowserUiRuntimeFoundation.
 */
function UnprobedReadyDysonRuntimeHost({
  runtime,
  locale,
  resetSave = unavailableReset,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>('bots')
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const dispatchPlayer = useCallback(
    (command: CanonicalPlayerCommand) =>
      runtime.dispatchPlayer(command),
    [runtime],
  )
  const presetActions = useMemo(
    () => createSkillPresetActions(runtime),
    [runtime],
  )
  if (snapshot.phase !== 'ready') return null
  return (
    <ReadyDysonSlice
      snapshot={snapshot}
      locale={locale}
      dispatchPlayer={dispatchPlayer}
      presetActions={presetActions}
      route={route}
      onRouteChange={setRoute}
      resetSave={resetSave}
      development={runtime.development}
    />
  )
}

export function ProbedReadyDysonRuntimeHost({
  runtime,
  locale,
  resetSave = unavailableReset,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>('bots')
  const selectionStartedAt = beginFirstSliceSnapshotSelection()
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const dispatchPlayer = useCallback(
    (command: CanonicalPlayerCommand) =>
      runtime.dispatchPlayer(command),
    [runtime],
  )
  const presetActions = useMemo(
    () => createSkillPresetActions(runtime),
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
      presetActions={presetActions}
      route={route}
      onRouteChange={setRoute}
      resetSave={resetSave}
      development={runtime.development}
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
  readonly presetActions?: SkillPresetActions
  readonly route?: ReadyGameRoute
  readonly onRouteChange?: (route: ReadyGameRoute) => void
  readonly resetSave?: () => Promise<UiRuntimeImportResult>
  readonly development?: UiRuntimeDevelopmentControls
}

export type ReadyGameRoute =
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'reality'
  | 'simulations'
  | 'debug'
  | 'settings'

/**
 * Maps published canonical facts into presentation components without
 * recalculating unlocks, affordability, timing or command outcomes.
 */
export function ReadyDysonSlice({
  snapshot,
  locale,
  dispatchPlayer,
  presetActions,
  route: requestedRoute = 'bots',
  onRouteChange = () => undefined,
  resetSave = unavailableReset,
  development,
}: ReadyDysonSliceProps) {
  const intl = useIntl()
  const [visualizationVisible, setVisualizationVisible] =
    useState(readVisualizationPreference)
  const [purchaseSettingsOpen, setPurchaseSettingsOpen] = useState(false)
  const [spaceAgePurchaseQuantity, setSpaceAgePurchaseQuantity] =
    useState<SpaceAgePurchaseQuantity>(1)
  const gameplay = snapshot.gameplay
  const route =
    (requestedRoute === 'reality' ||
      requestedRoute === 'simulations') &&
    (!gameplay.visibility.reality.routeVisible ||
      !gameplay.visibility.reality.routeUnlocked ||
      (requestedRoute === 'simulations' &&
        !gameplay.visibility.simulations.routeUnlocked))
      ? 'bots'
      : requestedRoute
  const dyson = gameplay.derived.dyson
  const tinker = gameplay.runtime.tinker
  const previousAutomatedRoute = useRef<'bots' | 'research' | null>(
    null,
  )
  const automatedRoute =
    route === 'bots' || route === 'research' ? route : null
  useEffect(() => {
    if (
      (requestedRoute === 'reality' ||
        requestedRoute === 'simulations') &&
      route !== requestedRoute
    ) {
      onRouteChange('bots')
    }
  }, [onRouteChange, requestedRoute, route])
  useEffect(() => {
    if (automatedRoute === null) {
      previousAutomatedRoute.current = null
      return
    }
    if (previousAutomatedRoute.current === automatedRoute) return
    previousAutomatedRoute.current = automatedRoute
    const slot =
      gameplay.progression.skills.tabPresetAutomation[
        automatedRoute
      ]
    if (slot === 0) return
    void dispatchPlayer({
      kind: 'skill.apply-tab-preset-automation',
      tab: automatedRoute,
    })
  }, [
    automatedRoute,
    dispatchPlayer,
    gameplay.progression.skills.tabPresetAutomation,
  ])

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
  const settingsActive = route === 'settings'
  const researchActive = route === 'research'
  const skillsActive = route === 'skills'
  const infinityActive = route === 'infinity'
  const realityActive = route === 'reality'
  const simulationsActive = route === 'simulations'
  const debugActive = route === 'debug'
  const routeHeading = debugActive
    ? messages.debugRoute
    : settingsActive
    ? messages.settingsRoute
    : researchActive
      ? messages.researchRoute
      : skillsActive
        ? messages.skillsRoute
        : infinityActive
          ? messages.infinityRoute
          : realityActive
            ? messages.realityRoute
            : simulationsActive
              ? messages.simulationsRoute
            : messages.route
  const infinityRouteLabel =
    gameplay.derived.infinity.navigationReward === null
      ? intl.formatMessage(messages.infinityRoute)
      : intl.formatMessage(messages.infinityRouteGain, {
          value: display(
            gameplay.derived.infinity.navigationReward,
          ),
        })

  return (
    <DysonGameplayShell
      direction={LOCALE_REGISTRY[locale].direction}
      skipLinkLabel={intl.formatMessage(messages.skipToGame)}
      heading={intl.formatMessage(routeHeading)}
      routeTheme={debugActive ? 'settings' : route}
      routeThemeVariant={
        simulationsActive
          ? gameplay.derived.simulations.currentEra
          : undefined
      }
      navigation={{
        ariaLabel: intl.formatMessage(messages.primaryNavigation),
        drawerAriaLabel: intl.formatMessage(messages.sideNavigation),
        bottomAriaLabel: intl.formatMessage(messages.bottomNavigation),
        items: [
          {
            id: 'bots',
            label: intl.formatMessage(messages.route),
            iconSrc: navigationAssets.bots,
            ...(route === 'bots'
              ? { current: true as const }
              : { onActivate: () => onRouteChange('bots') }),
          },
          {
            id: 'research',
            label: intl.formatMessage(messages.researchRoute),
            iconSrc: navigationAssets.research,
            ...(researchActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('research') }),
          },
          {
            id: 'skills',
            label: intl.formatMessage(messages.skillsRoute),
            iconSrc: navigationAssets.skills,
            ...(gameplay.visibility.skills.routeUnlocked
              ? skillsActive
                ? { current: true as const }
                : { onActivate: () => onRouteChange('skills') }
              : { disabled: true }),
          },
          {
            id: 'infinity',
            label: infinityRouteLabel,
            iconSrc: navigationAssets.infinity,
            ...(gameplay.visibility.infinity.routeUnlocked
              ? infinityActive
                ? { current: true as const }
                : { onActivate: () => onRouteChange('infinity') }
              : { disabled: true }),
          },
          ...(gameplay.visibility.reality.routeVisible
            ? [
                {
                  id: 'reality',
                  label: intl.formatMessage(messages.realityRoute),
                  iconSrc: navigationAssets.reality,
                  ...(gameplay.visibility.reality.routeUnlocked
                    ? realityActive
                      ? { current: true as const }
                      : {
                          onActivate: () =>
                            onRouteChange('reality'),
                        }
                    : {
                        disabled: true,
                        progress: {
                          fraction:
                            gameplay.visibility.reality
                              .unlockProgress.fraction,
                          label: intl.formatMessage(
                            messages.realitySecretsProgress,
                            {
                              current: display(
                                gameplay.visibility.reality
                                  .unlockProgress.currentSecrets,
                              ),
                              required: display(
                                gameplay.visibility.reality
                                  .unlockProgress.requiredSecrets,
                              ),
                            },
                          ),
                        },
                      }),
                },
              ]
            : []),
          ...(gameplay.visibility.simulations.routeUnlocked
            ? [
                {
                  id: 'simulations',
                  label: intl.formatMessage(
                    messages.simulationsRoute,
                  ),
                  iconSrc: navigationAssets.simulations,
                  ...(simulationsActive
                    ? { current: true as const }
                    : {
                        onActivate: () =>
                          onRouteChange('simulations'),
                      }),
                },
              ]
            : []),
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
          ...(development !== undefined
            ? [
                {
                  id: 'debug',
                  label: intl.formatMessage(messages.debugRoute),
                  icon: <span className="dyson-navigation__debug-icon">{'{/}'}</span>,
                  bottom: false,
                  ...(debugActive
                    ? { current: true as const }
                    : { onActivate: () => onRouteChange('debug') }),
                },
              ]
            : []),
          {
            id: 'settings',
            label: intl.formatMessage(messages.settingsRoute),
            iconSrc: navigationAssets.settings,
            ...(settingsActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('settings') }),
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
      routeContent={
        debugActive && development !== undefined
          ? {
              ariaLabel: intl.formatMessage(messages.debugRoute),
              content: (
                <DebugSurface
                  development={development}
                  locale={locale}
                />
              ),
            }
          : settingsActive
          ? {
              ariaLabel: intl.formatMessage(messages.settingsRoute),
              content: (
                <SettingsSurface
                  resetSave={resetSave}
                  visualizationVisible={visualizationVisible}
                  onVisualizationVisibleChange={(visible) => {
                    setVisualizationVisible(visible)
                    writeVisualizationPreference(visible)
                  }}
                />
              ),
            }
          : researchActive
            ? {
                ariaLabel: intl.formatMessage(messages.researchRoute),
                content: (
                  <Suspense
                    fallback={
                      <div
                        aria-label={intl.formatMessage(
                          messages.researchRoute,
                        )}
                        aria-busy="true"
                      />
                    }
                  >
                    <ResearchSurface
                      locale={locale}
                      cards={gameplay.previews.research.cards}
                      researchers={resources.researchers}
                      sciencePerSecond={rates.science}
                      buyMode={
                        gameplay.progression.research.automation
                          .buyMode
                      }
                      roundedBulkBuy={
                        gameplay.progression.research.automation
                          .roundedBulkBuy
                      }
                      presets={gameplay.progression.skills.presets}
                      presetAutomationSlot={
                        gameplay.progression.skills
                          .tabPresetAutomation.research
                      }
                      purchaseRouteAvailable={
                        gameplay.commands.byKind[
                          'research.purchase'
                        ].routeAvailable
                      }
                      buyModeRouteAvailable={
                        gameplay.commands.byKind[
                          'research.set-buy-mode'
                        ].routeAvailable
                      }
                      roundedBulkRouteAvailable={
                        gameplay.commands.byKind[
                          'research.set-rounded-bulk-buy'
                        ].routeAvailable
                      }
                      presetAutomationRouteAvailable={
                        gameplay.commands.byKind[
                          'skill.set-tab-preset-automation'
                        ].routeAvailable
                      }
                      dispatchPlayer={dispatchPlayer}
                    />
                  </Suspense>
                ),
              }
            : skillsActive
              ? {
                  ariaLabel: intl.formatMessage(messages.skillsRoute),
                  content: (
                    <Suspense
                      fallback={
                        <div
                          aria-label={intl.formatMessage(
                            messages.skillsRoute,
                          )}
                          aria-busy="true"
                        />
                      }
                    >
                      <SkillsSurface
                        locale={locale}
                        points={gameplay.resources.skills.points}
                        fragments={
                          gameplay.resources.skills.fragments
                        }
                        catalog={gameplay.previews.skills}
                        presets={gameplay.progression.skills.presets}
                        selectedPresetSlot={
                          gameplay.runtime.selectedSkillPresetSlot
                        }
                        botDistribution={
                          gameplay.progression.dyson.botDistribution
                        }
                        autoAssignNonRefundable={
                          gameplay.progression.skills
                            .autoAssignNonRefundable
                        }
                        commandAvailability={{
                          purchase:
                            gameplay.commands.byKind[
                              'skill.purchase'
                            ].routeAvailable,
                          refund:
                            gameplay.commands.byKind['skill.refund']
                              .routeAvailable,
                          selectPreset:
                            gameplay.commands.byKind[
                              'skill.select-preset'
                            ].routeAvailable,
                          setPresetColor:
                            gameplay.commands.byKind[
                              'skill.set-preset-color'
                            ].routeAvailable,
                          setAutoAssignNonRefundable:
                            gameplay.commands.byKind[
                              'skill.set-auto-assign-non-refundable'
                            ].routeAvailable,
                          reset:
                            gameplay.commands.byKind['skill.reset']
                              .routeAvailable,
                        }}
                        presetActions={presetActions}
                        dispatchPlayer={dispatchPlayer}
                      />
                    </Suspense>
                  ),
                }
              : infinityActive
                ? {
                    ariaLabel: intl.formatMessage(
                      messages.infinityRoute,
                    ),
                    content: (
                      <Suspense
                        fallback={
                          <div
                            aria-label={intl.formatMessage(
                              messages.infinityRoute,
                            )}
                            aria-busy="true"
                          />
                        }
                      >
                        <InfinitySurface
                          locale={locale}
                          resources={gameplay.resources.infinity}
                          progression={{
                            infinity:
                              gameplay.progression.infinity,
                          }}
                          derived={gameplay.derived.infinity}
                          previews={gameplay.previews.infinity}
                          commandAvailability={{
                            purchaseShopItem:
                              gameplay.commands.byKind[
                                'infinity.purchase-shop-item'
                              ].routeAvailable,
                            setBreakTarget:
                              gameplay.commands.byKind[
                                'infinity.set-break-target'
                              ].routeAvailable,
                          }}
                          dispatchPlayer={dispatchPlayer}
                        />
                      </Suspense>
                    ),
                  }
                : realityActive
                  ? {
                      ariaLabel: intl.formatMessage(
                        messages.realityRoute,
                      ),
                      content: (
                        <Suspense
                          fallback={
                            <div
                              aria-label={intl.formatMessage(
                                messages.realityRoute,
                              )}
                              aria-busy="true"
                            />
                          }
                        >
                          <RealitySurface
                            locale={locale}
                            resources={gameplay.resources.reality}
                            derived={gameplay.derived.reality}
                            gatherPreview={
                              gameplay.previews.reality
                                .gatherInfluence
                            }
                            upgrades={
                              gameplay.previews.reality.upgrades
                            }
                            upgradeSections={
                              gameplay.derived.simulations
                                .permanentUpgrades.reality
                            }
                            simulationUpgrades={
                              gameplay.previews.dream.upgrades
                            }
                            simulationUpgradeSections={
                              gameplay.derived.simulations
                                .permanentUpgrades.simulation
                            }
                            strangeMatter={
                              gameplay.resources.dream.strangeMatter
                            }
                            gatherRouteAvailable={
                              gameplay.commands.byKind[
                                'reality.gather-influence'
                              ].routeAvailable
                            }
                            purchaseRouteAvailable={
                              gameplay.commands.byKind[
                                'reality.purchase-upgrade'
                              ].routeAvailable
                            }
                            simulationPurchaseRouteAvailable={
                              gameplay.commands.byKind[
                                'dream.purchase-upgrade'
                              ].routeAvailable
                            }
                            dispatchPlayer={dispatchPlayer}
                          />
                        </Suspense>
                      ),
                    }
                  : simulationsActive
                    ? {
                        ariaLabel: intl.formatMessage(
                          messages.simulationsRoute,
                        ),
                        content: (
                          <Suspense
                            fallback={
                              <div
                                aria-label={intl.formatMessage(
                                  messages.simulationsRoute,
                                )}
                                aria-busy="true"
                              />
                            }
                          >
                            <SimulationsSurface
                              locale={locale}
                              facts={gameplay.derived.simulations}
                              progression={gameplay.progression.dream}
                              previews={gameplay.previews.dream}
                              influence={
                                gameplay.resources.reality.influence
                              }
                              spaceAgePurchaseQuantity={spaceAgePurchaseQuantity}
                              commandAvailability={{
                                purchaseFoundational:
                                  gameplay.commands.byKind[
                                    'dream.purchase-foundational'
                                  ].routeAvailable,
                                purchaseSpaceAge:
                                  gameplay.commands.byKind[
                                    'dream.purchase-space-age'
                                  ].routeAvailable,
                                startEducation:
                                  gameplay.commands.byKind[
                                    'dream.start-education'
                                  ].routeAvailable,
                                blackHoleReset:
                                  gameplay.commands.byKind[
                                    'dream.request-black-hole-reset'
                                  ].routeAvailable,
                                setDoubleTimeRate:
                                  gameplay.commands.byKind[
                                    'time.set-double-time-rate'
                                  ].routeAvailable,
                              }}
                              dispatchPlayer={dispatchPlayer}
                            />
                          </Suspense>
                        ),
                      }
                  : undefined
      }
      routeSupplement={
        simulationsActive && gameplay.progression.timeline.doubleTime.unlocked
          ? {
              ariaLabel: 'Time multiplier',
              content: (
                <SimulationTimeControl
                  locale={locale}
                  bankSeconds={gameplay.resources.time.doubleTimeBankSeconds}
                  rate={gameplay.progression.timeline.doubleTime.rate}
                  enabled={gameplay.progression.timeline.doubleTime.enabled}
                  available={gameplay.commands.byKind['time.set-double-time-rate'].routeAvailable}
                  spaceAgeAvailable={gameplay.derived.simulations.eras.spaceAge.visible}
                  purchaseSettingsOpen={purchaseSettingsOpen}
                  spaceAgePurchaseQuantity={spaceAgePurchaseQuantity}
                  onPurchaseSettingsOpenChange={setPurchaseSettingsOpen}
                  onSpaceAgePurchaseQuantityChange={setSpaceAgePurchaseQuantity}
                  dispatchPlayer={dispatchPlayer}
                />
              ),
            }
          : undefined
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
      showResourceHeader={!realityActive && !simulationsActive}
      swarmVisual={
        visualizationVisible
          ? {
              ariaLabel: intl.formatMessage(messages.dysonSwarm),
              content: (
                <DysonSwarmVisual
                  facts={
                    dyson.value.presentation.swarmVisualization
                  }
                />
              ),
            }
          : undefined
      }
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
            presets={gameplay.progression.skills.presets}
            presetAutomationSlot={
              gameplay.progression.skills.tabPresetAutomation.bots
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
            presetAutomationRouteAvailable={
              gameplay.commands.byKind[
                'skill.set-tab-preset-automation'
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
      distribution={
        route === 'bots' || researchActive
          ? {
              ariaLabel: intl.formatMessage(
                messages.botDistribution,
              ),
              content: (
                <BotDistribution
                  locale={locale}
                  distribution={
                    gameplay.progression.dyson.botDistribution
                  }
                  workersFraction={
                    gameplay.derived.dysonBotDistribution
                      .workersFraction
                  }
                  scientistsFraction={
                    gameplay.derived.dysonBotDistribution
                      .scientistsFraction
                  }
                  multitasking={
                    gameplay.progression.quantum.unlocks
                      .botMultitasking
                  }
                  routeAvailable={
                    gameplay.commands.byKind[
                      'dyson.set-bot-distribution'
                    ].routeAvailable
                  }
                  dispatchPlayer={dispatchPlayer}
                />
              ),
            }
          : undefined
      }
    />
  )
}

function readVisualizationPreference(): boolean {
  try {
    return (
      typeof localStorage === 'undefined' ||
      localStorage.getItem(SWARM_VISUALIZATION_STORAGE_KEY) !==
        'hidden'
    )
  } catch {
    return true
  }
}

function writeVisualizationPreference(visible: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      SWARM_VISUALIZATION_STORAGE_KEY,
      visible ? 'visible' : 'hidden',
    )
  } catch {
    // Presentation preference persistence is best effort. Storage failure
    // must not affect gameplay or prevent changing the current view.
  }
}

function unavailableReset(): Promise<UiRuntimeImportResult> {
  return Promise.resolve({
    imported: false,
    committed: false,
    code: 'RUNTIME-RESET-UNAVAILABLE',
    reason: 'Reset is unavailable in this host.',
    recoveryAvailable: false,
  })
}

function createSkillPresetActions(
  runtime: BrowserUiRuntimeFoundation,
): SkillPresetActions {
  const actions: SkillPresetActions = {
    previewQueueChange: async (request) => {
      const preview = runtime.previewSkillPresetQueueChange(request)
      if (!preview.accepted) throw new Error(preview.reason)
      return {
        affectedSkillIds: preview.affectedSkillIds,
        confirmationRequired: preview.affectedSkillIds.some(
          (skillId) => skillId !== request.skillId,
        ),
      }
    },
    applyQueueChange: async (request) => {
      const snapshot = runtime.snapshot()
      if (
        snapshot.phase !== 'ready' ||
        snapshot.gameplay.runtime.selectedSkillPresetSlot !==
          request.slot
      ) {
        return false
      }
      const result = await runtime.dispatchPlayer({
        kind: request.included
          ? 'skill.add-to-current-preset'
          : 'skill.remove-from-current-preset',
        skillId: request.skillId,
      })
      return result.status === 'accepted'
    },
    exportPreset: async (slot) => runtime.exportSkillPreset(slot),
    previewImportPreset: async (slot, text) => {
      const preview = runtime.previewSkillPresetImport(text)
      if (!preview.accepted) throw new Error(preview.reason)
      return {
        name: preview.payload.presetName,
        queuedSkillCount: preview.payload.skillIds.length,
        workerPercent: Math.round(
          (1 - preview.payload.botDistribution) * 100,
        ),
        colorId:
          preview.payload.colorId ??
          defaultSkillPresetColorId(slot),
      }
    },
    importPreset: async (slot, serialized) => {
      const result = await runtime.dispatchPlayer({
        kind: 'skill.import-preset',
        slot,
        serialized,
      })
      return result.status === 'accepted'
    },
  }
  return Object.freeze(actions)
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
