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
  FrontendGameplayPreviewDemand,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type { DeepReadonly } from '../../../core/contracts'
import { defaultSkillPresetColorId } from '../../../game-state/skillPresetColors'
import type { CanonicalFacilityId } from '../../../game-state/types'
import '../facilities/facilities.css'
import {
  DysonGameplayShell,
  navigationAssets,
} from '../shell'
import { TinkerSurface } from '../tinker'
import {
  formatGameDuration,
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
  useBrowserStoredTimeJob,
  type BrowserUiRuntimeFoundation,
  type UiRuntimeDevelopmentControls,
  type UiRuntimeImportPreviewResult,
  type UiRuntimeImportResult,
  type UiRuntimeSuppliedFile,
} from '../../runtime'
import {
  reportDevelopmentTelemetry,
  startDevelopmentTelemetry,
} from '../../runtime/developmentTelemetry'
import {
  SettingsSurface,
  type SettingsSurfaceProps,
} from '../settings'
import { DebugSurface, type DebugSurfaceDraft } from '../debug'
import type { OfflineTimeSurfaceDraft } from '../offline-time'
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
import {
  wikiProgressionFromResources,
  type WikiCategoryId,
} from '../wiki/wikiProjection'
import { AvocatoMeditationSecretTrigger } from '../quantum/AvocatoMeditationSecretTrigger'
import { AvotationCompletionOverlay } from '../quantum/AvotationProgress'
import type { AvocatoMeditationPlacement } from '../quantum/meditationTargets'
import {
  QuantumControlPanel,
} from '../quantum/QuantumSurface'
import type { QuantumPurchaseQuantity } from '../quantum/quantumPurchaseQuantities'
import type { ReleasePlatformServices } from '../../../platform/releaseFoundation'
import { StorefrontController } from '../../../store/storefront'
import type { StoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'

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

const QuantumSurface = lazy(async () => {
  const module = await import('../quantum')
  return { default: module.QuantumSurface }
})

const AvocatoSurface = lazy(async () => {
  const module = await import('../quantum')
  return { default: module.AvocatoSurface }
})

const OfflineTimeSurface = lazy(async () => {
  const module = await import('../offline-time')
  return { default: module.OfflineTimeSurface }
})

const StatisticsSurface = lazy(async () => {
  const module = await import('../statistics')
  return { default: module.StatisticsSurface }
})

const StoreSurface = lazy(async () => {
  const module = await import('../store')
  return { default: module.StoreSurface }
})

const StorySurface = lazy(async () => {
  const module = await import('../story')
  return { default: module.StorySurface }
})

const WikiSurface = lazy(async () => {
  const module = await import('../wiki')
  return { default: module.WikiSurface }
})

export const SWARM_VISUALIZATION_STORAGE_KEY =
  'idle-dyson-swarm.show-visualization'

const IDLE_STORED_TIME_JOB: StoredTimeJobStatus = Object.freeze({
  kind: 'idle',
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
  readonly resetSave?: () => Promise<UiRuntimeImportResult>
  readonly previewImportSaveFile?: SettingsSurfaceProps['previewImportSaveFile']
  readonly previewImportSaveText?: SettingsSurfaceProps['previewImportSaveText']
  readonly importSaveFile?: (
    file: UiRuntimeSuppliedFile,
  ) => Promise<UiRuntimeImportResult>
  readonly importSaveText?: (
    text: string,
  ) => Promise<UiRuntimeImportResult>
  readonly readSaveText?: () => Promise<string | null>
  readonly downloadSave?: () => Promise<boolean>
  readonly copySaveText?: (text: string) => Promise<void>
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly localDeveloperOptionsPurchased?: boolean
}

/**
 * Owns the single ready-state runtime subscription. The active-time driver and
 * every command remain inside BrowserUiRuntimeFoundation.
 */
function UnprobedReadyDysonRuntimeHost({
  runtime,
  locale,
  resetSave = unavailableReset,
  previewImportSaveFile = unavailableImportPreview,
  previewImportSaveText = unavailableImportPreview,
  importSaveFile = unavailableImport,
  importSaveText = unavailableImport,
  readSaveText = unavailableReadSave,
  downloadSave = unavailableExport,
  copySaveText = unavailableCopy,
  releasePlatformServices,
  localDeveloperOptionsPurchased,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>('bots')
  useLayoutEffect(() => {
    runtime.setGameplayPreviewDemand('bots')
  }, [runtime])
  const changeRoute = useCallback(
    (nextRoute: ReadyGameRoute) => {
      runtime.setGameplayPreviewDemand(
        gameplayPreviewDemandForRoute(nextRoute),
      )
      setRoute(nextRoute)
    },
    [runtime],
  )
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const storedTimeJob = useBrowserStoredTimeJob(runtime)
  const telemetrySnapshotRef = useRef(snapshot)
  telemetrySnapshotRef.current = snapshot
  useEffect(
    () => startDevelopmentTelemetry(() => {
      const current = telemetrySnapshotRef.current
      return {
        visibility: document.visibilityState,
        focused: document.hasFocus(),
        runtimeStatus: runtime.status(),
        snapshot:
          current.phase === 'ready'
            ? {
                revision: current.revision,
                bots: current.gameplay.resources.dyson.bots,
                tinker: current.gameplay.runtime.tinker,
              }
            : { phase: current.phase },
      }
    }),
    [runtime],
  )
  const dispatchPlayer = useCallback(
    async (command: CanonicalPlayerCommand) => {
      const result = await runtime.dispatchPlayer(command)
      if (command.kind.startsWith('tinker.')) {
        reportDevelopmentTelemetry('tinker-command', {
          command,
          result,
        })
      }
      return result
    },
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
      onRouteChange={changeRoute}
      resetSave={resetSave}
      previewImportSaveFile={previewImportSaveFile}
      previewImportSaveText={previewImportSaveText}
      importSaveFile={importSaveFile}
      importSaveText={importSaveText}
      readSaveText={readSaveText}
      downloadSave={downloadSave}
      copySaveText={copySaveText}
      development={runtime.development}
      synchronizeHostEntitlements={runtime.synchronizeHostEntitlements}
      releasePlatformServices={releasePlatformServices}
      localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      storedTimeJob={storedTimeJob}
      cancelStoredTimeJob={() => runtime.storedTime?.cancel()}
    />
  )
}

export function ProbedReadyDysonRuntimeHost({
  runtime,
  locale,
  resetSave = unavailableReset,
  previewImportSaveFile = unavailableImportPreview,
  previewImportSaveText = unavailableImportPreview,
  importSaveFile = unavailableImport,
  importSaveText = unavailableImport,
  readSaveText = unavailableReadSave,
  downloadSave = unavailableExport,
  copySaveText = unavailableCopy,
  releasePlatformServices,
  localDeveloperOptionsPurchased,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>('bots')
  useLayoutEffect(() => {
    runtime.setGameplayPreviewDemand('bots')
  }, [runtime])
  const changeRoute = useCallback(
    (nextRoute: ReadyGameRoute) => {
      runtime.setGameplayPreviewDemand(
        gameplayPreviewDemandForRoute(nextRoute),
      )
      setRoute(nextRoute)
    },
    [runtime],
  )
  const selectionStartedAt = beginFirstSliceSnapshotSelection()
  const snapshot = useBrowserRuntimeSnapshot(runtime)
  const storedTimeJob = useBrowserStoredTimeJob(runtime)
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
      onRouteChange={changeRoute}
      resetSave={resetSave}
      previewImportSaveFile={previewImportSaveFile}
      previewImportSaveText={previewImportSaveText}
      importSaveFile={importSaveFile}
      importSaveText={importSaveText}
      readSaveText={readSaveText}
      downloadSave={downloadSave}
      copySaveText={copySaveText}
      development={runtime.development}
      synchronizeHostEntitlements={runtime.synchronizeHostEntitlements}
      releasePlatformServices={releasePlatformServices}
      localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      storedTimeJob={storedTimeJob}
      cancelStoredTimeJob={() => runtime.storedTime?.cancel()}
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
  readonly previewImportSaveFile?: SettingsSurfaceProps['previewImportSaveFile']
  readonly previewImportSaveText?: SettingsSurfaceProps['previewImportSaveText']
  readonly importSaveFile?: (
    file: UiRuntimeSuppliedFile,
  ) => Promise<UiRuntimeImportResult>
  readonly importSaveText?: (
    text: string,
  ) => Promise<UiRuntimeImportResult>
  readonly readSaveText?: () => Promise<string | null>
  readonly downloadSave?: () => Promise<boolean>
  readonly copySaveText?: (text: string) => Promise<void>
  readonly development?: UiRuntimeDevelopmentControls
  readonly synchronizeHostEntitlements?: () => Promise<boolean>
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly localDeveloperOptionsPurchased?: boolean
  readonly storedTimeJob?: StoredTimeJobStatus
  readonly cancelStoredTimeJob?: () => void
}

export type ReadyGameRoute =
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'reality'
  | 'simulations'
  | 'quantum'
  | 'avocato'
  | 'story'
  | 'wiki'
  | 'offline-time'
  | 'statistics'
  | 'store'
  | 'debug'
  | 'settings'

function gameplayPreviewDemandForRoute(
  route: ReadyGameRoute,
): FrontendGameplayPreviewDemand {
  switch (route) {
    case 'bots':
    case 'research':
    case 'skills':
    case 'infinity':
    case 'reality':
    case 'simulations':
    case 'quantum':
    case 'avocato':
    case 'offline-time':
      return route
    case 'story':
    case 'wiki':
    case 'statistics':
    case 'store':
    case 'debug':
    case 'settings':
      return route
  }
}

const AVOCATO_MEDITATION_ROUTE_PLACEMENT: Partial<
  Record<ReadyGameRoute, AvocatoMeditationPlacement>
> = Object.freeze({
  quantum: 'quantum',
  infinity: 'infinity',
  bots: 'bots',
  skills: 'skills',
  settings: 'settings',
  research: 'research',
})

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
  previewImportSaveFile = unavailableImportPreview,
  previewImportSaveText = unavailableImportPreview,
  importSaveFile = unavailableImport,
  importSaveText = unavailableImport,
  readSaveText = unavailableReadSave,
  downloadSave = unavailableExport,
  copySaveText = unavailableCopy,
  development,
  synchronizeHostEntitlements,
  releasePlatformServices,
  localDeveloperOptionsPurchased,
  storedTimeJob = IDLE_STORED_TIME_JOB,
  cancelStoredTimeJob = () => undefined,
}: ReadyDysonSliceProps) {
  const intl = useIntl()
  const [visualizationVisible, setVisualizationVisible] =
    useState(readVisualizationPreference)
  const [purchaseSettingsOpen, setPurchaseSettingsOpen] = useState(false)
  const [quantumPurchaseSettingsOpen, setQuantumPurchaseSettingsOpen] =
    useState(false)
  const [avotationCompletionVisible, setAvotationCompletionVisible] =
    useState(false)
  const [spaceAgePurchaseQuantity, setSpaceAgePurchaseQuantity] =
    useState<SpaceAgePurchaseQuantity>(1)
  const [quantumPurchaseQuantity, setQuantumPurchaseQuantity] =
    useState<QuantumPurchaseQuantity>(1)
  const debugDraftRef = useRef<DebugSurfaceDraft>({
    amount: '1',
    preset: 'early',
  })
  const offlineTimeDraftRef = useRef<OfflineTimeSurfaceDraft>({
    selectedSeconds: null,
    repeatSeconds: null,
  })
  const wikiTopicRef = useRef<WikiCategoryId>('bots')
  const rememberDebugDraft = useCallback(
    (draft: Readonly<DebugSurfaceDraft>) => {
      debugDraftRef.current = { ...draft }
    },
    [],
  )
  const rememberOfflineTimeDraft = useCallback(
    (draft: Readonly<OfflineTimeSurfaceDraft>) => {
      offlineTimeDraftRef.current = { ...draft }
    },
    [],
  )
  const rememberWikiTopic = useCallback((topic: WikiCategoryId) => {
    wikiTopicRef.current = topic
  }, [])
  const storeVisible =
    releasePlatformServices !== undefined &&
    (releasePlatformServices.hostKind !== 'browser' ||
      releasePlatformServices.storeAvailable === true)
  const storeController = useMemo(
    () => storeVisible
      ? new StorefrontController({
          store: releasePlatformServices.store,
          entitlements: releasePlatformServices.entitlements,
          ...(synchronizeHostEntitlements === undefined
            ? {}
            : {
                onVerifiedOwnershipChanged:
                  synchronizeHostEntitlements,
              }),
        })
      : null,
    [releasePlatformServices, storeVisible, synchronizeHostEntitlements],
  )
  const gameplay = snapshot.gameplay
  const quantumVisible =
    gameplay.resources.infinity.points >= 1n ||
    gameplay.resources.quantum.pointsEarned >= 1n
  const quantumUnlocked =
    gameplay.resources.infinity.points >= 42n ||
    gameplay.resources.quantum.pointsEarned >= 1n
  const requestedRouteUnavailable =
    ((requestedRoute === 'reality' ||
      requestedRoute === 'simulations') &&
      (!gameplay.visibility.reality.routeVisible ||
        !gameplay.visibility.reality.routeUnlocked ||
        (requestedRoute === 'simulations' &&
          !gameplay.visibility.simulations.routeUnlocked))) ||
    (requestedRoute === 'quantum' && !quantumUnlocked) ||
    (requestedRoute === 'store' && !storeVisible) ||
    (requestedRoute === 'avocato' &&
      !gameplay.progression.avocado.unlocked)
  const route =
    requestedRouteUnavailable
      ? 'bots'
      : requestedRoute
  const meditationPlacement: AvocatoMeditationPlacement | null =
    AVOCATO_MEDITATION_ROUTE_PLACEMENT[route] ?? null
  const dyson = gameplay.derived.dyson
  const tinker = gameplay.runtime.tinker
  const previousAutomatedRoute = useRef<'bots' | 'research' | null>(
    null,
  )
  const automatedRoute =
    route === 'bots' || route === 'research' ? route : null
  useEffect(() => {
    if (requestedRouteUnavailable && route !== requestedRoute) {
      onRouteChange('bots')
    }
  }, [onRouteChange, requestedRoute, requestedRouteUnavailable, route])
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
  const automationFacilityIds: CanonicalFacilityId[] = [
    ...visibility.visibleBasicFacilityIds,
  ]
  if (gameplay.progression.quantum.unlocks.matrioshkaBrains) {
    automationFacilityIds.push('matrioshka_brains')
  }
  if (gameplay.progression.quantum.unlocks.birchPlanets) {
    automationFacilityIds.push('birch_planets')
  }
  if (gameplay.progression.quantum.unlocks.galacticBrains) {
    automationFacilityIds.push('galactic_brains')
  }
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
  const quantumRouteActive = route === 'quantum'
  const avocatoActive = route === 'avocato'
  const quantumNavigationActive = quantumRouteActive || avocatoActive
  const storyActive = route === 'story'
  const wikiActive = route === 'wiki'
  const offlineTimeActive = route === 'offline-time'
  const statisticsActive = route === 'statistics'
  const storeActive = route === 'store'
  const debugActive = route === 'debug'
  const navigationVisibility =
    gameplay.progression.meta?.navigationVisibility ?? {
      story: false,
      wiki: false,
      statistics: true,
    }
  const storedTimeCapacitySeconds = Math.max(
    0,
    gameplay.resources.time.storedTimeCapacitySeconds,
  )
  const storedTimeAvailableSeconds = Math.max(
    0,
    Math.min(
      gameplay.resources.time.storedTimeAvailableSeconds,
      storedTimeCapacitySeconds,
    ),
  )
  const storedTimeStorageFraction = storedTimeCapacitySeconds > 0
    ? storedTimeAvailableSeconds / storedTimeCapacitySeconds
    : 0
  const routeHeading = debugActive
    ? messages.debugRoute
    : avocatoActive
      ? messages.avocatoRoute
    : quantumRouteActive
      ? messages.quantumRoute
    : statisticsActive
      ? messages.statisticsRoute
    : storeActive
      ? messages.storeRoute
    : offlineTimeActive
      ? messages.offlineTimeRoute
    : storyActive
      ? messages.storyRoute
    : wikiActive
      ? messages.wikiRoute
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
    <>
      <DysonGameplayShell
      direction={LOCALE_REGISTRY[locale].direction}
      skipLinkLabel={intl.formatMessage(messages.skipToGame)}
      menuHeading={intl.formatMessage(messages.menuHeading)}
      closeMenuLabel={intl.formatMessage(messages.closeMenu)}
      openMenuLabel={intl.formatMessage(messages.openMenu)}
      heading={intl.formatMessage(routeHeading)}
      routeTheme={debugActive ? 'settings' : storeActive ? 'quantum' : route}
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
          ...(quantumVisible
            ? [
                {
                  id: 'quantum',
                  label: intl.formatMessage(messages.quantumRoute),
                  iconSrc: navigationAssets.quantum,
                  ...(quantumUnlocked
                    ? quantumNavigationActive
                      ? { current: true as const }
                      : {
                          onActivate: () =>
                            onRouteChange('quantum'),
                        }
                    : {
                        disabled: true,
                        progress: {
                          fraction: Math.min(
                            1,
                            Number(gameplay.resources.infinity.points) /
                              42,
                          ),
                          label: intl.formatMessage(
                            messages.quantumProgress,
                            {
                              current: display(
                                gameplay.resources.infinity.points,
                              ),
                              required: display(42),
                            },
                          ),
                        },
                      }),
                },
              ]
            : []),
          ...(storeVisible
            ? [
                {
                  id: 'store',
                  label: intl.formatMessage(messages.storeRoute),
                  iconSrc: navigationAssets.store,
                  bottom: false,
                  ...(storeActive
                    ? { current: true as const }
                    : { onActivate: () => onRouteChange('store') }),
                },
              ]
            : []),
          {
            id: 'story',
            label: intl.formatMessage(messages.storyRoute),
            iconSrc: navigationAssets.story,
            bottom: navigationVisibility.story,
            ...(storyActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('story') }),
          },
          {
            id: 'wiki',
            label: intl.formatMessage(messages.wikiRoute),
            iconSrc: navigationAssets.wiki,
            bottom: navigationVisibility.wiki,
            ...(wikiActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('wiki') }),
          },
          {
            id: 'offline-time',
            label: intl.formatMessage(messages.offlineTimeRoute),
            iconSrc: navigationAssets.offlineTime,
            bottom: false,
            progress: {
              fraction: storedTimeStorageFraction,
              label: intl.formatMessage(messages.offlineTimeProgress, {
                stored: formatGameDuration(
                  locale,
                  storedTimeAvailableSeconds,
                ),
                capacity: formatGameDuration(
                  locale,
                  storedTimeCapacitySeconds,
                ),
              }),
            },
            ...(offlineTimeActive
              ? { current: true as const }
              : {
                  onActivate: () => onRouteChange('offline-time'),
                }),
          },
          {
            id: 'statistics',
            label: intl.formatMessage(messages.statisticsRoute),
            iconSrc: navigationAssets.statistics,
            bottom: navigationVisibility.statistics,
            ...(statisticsActive
              ? { current: true as const }
              : {
                  onActivate: () => onRouteChange('statistics'),
                }),
          },
          ...(development !== undefined
            ? [
                {
                  id: 'debug',
                  label: intl.formatMessage(messages.debugRoute),
                  iconSrc: navigationAssets.debug,
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
                  initialDraft={debugDraftRef.current}
                  onDraftChange={rememberDebugDraft}
                />
              ),
            }
          : settingsActive
          ? {
              ariaLabel: intl.formatMessage(messages.settingsRoute),
              content: (
                <SettingsSurface
                  resetSave={resetSave}
                  previewImportSaveFile={previewImportSaveFile}
                  previewImportSaveText={previewImportSaveText}
                  importSaveFile={importSaveFile}
                  importSaveText={importSaveText}
                  readSaveText={readSaveText}
                  downloadSave={downloadSave}
                  copySaveText={copySaveText}
                  development={
                    import.meta.env.DEV ? development : undefined
                  }
                  visualizationVisible={visualizationVisible}
                  onVisualizationVisibleChange={(visible) => {
                    setVisualizationVisible(visible)
                    writeVisualizationPreference(visible)
                  }}
                  navigationVisibility={navigationVisibility}
                  onNavigationVisibilityChange={(item, visible) => {
                    void dispatchPlayer({
                      kind: 'settings.set-navigation-item-visible',
                      item,
                      visible,
                    })
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
                      automationUnlocked={
                        gameplay.progression.infinity
                          .automationUnlocked.research
                      }
                      automationEnabledById={
                        gameplay.progression.research.automation
                          .enabledById
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
                      automationRouteAvailable={
                        gameplay.commands.byKind[
                          'research.set-automation'
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
                            avocatoUnlocked={
                              gameplay.progression.avocado.unlocked
                            }
                            onOpenAvocato={() =>
                              onRouteChange('avocato')
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
                              activeDoubleTimeRate={
                                gameplay.progression.timeline.doubleTime.enabled
                                  ? gameplay.progression.timeline.doubleTime.rate
                                  : 0
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
                    : quantumRouteActive
                      ? {
                          ariaLabel: intl.formatMessage(
                            messages.quantumRoute,
                          ),
                          content: (
                            <Suspense
                              fallback={
                                <div
                                  aria-label={intl.formatMessage(
                                    messages.quantumRoute,
                                  )}
                                  aria-busy="true"
                                />
                              }
                            >
                              <QuantumSurface
                                locale={locale}
                                resources={gameplay.resources.quantum}
                                availableInfinityPoints={
                                  gameplay.resources.infinity.availablePoints
                                }
                                progression={{
                                  quantum: gameplay.progression.quantum,
                                  avocado: gameplay.progression.avocado,
                                  secretProgress:
                                    gameplay.progression.secretProgress,
                                }}
                                previews={gameplay.previews.quantum}
                                meditationPreview={
                                  gameplay.previews.avocado.meditation
                                }
                                commandAvailability={{
                                  purchaseUpgrade:
                                    gameplay.commands.byKind[
                                      'quantum.purchase-upgrade'
                                    ].routeAvailable,
                                  requestLeap:
                                    gameplay.commands.byKind[
                                      'quantum.request-leap'
                                    ].routeAvailable,
                                  completeMeditationStep:
                                    gameplay.commands.byKind[
                                      'avocado.complete-meditation-step'
                                    ].routeAvailable,
                                }}
                                dispatchPlayer={dispatchPlayer}
                                onOpenAvocato={
                                  gameplay.progression.avocado.unlocked
                                    ? () => onRouteChange('avocato')
                                    : undefined
                                }
                                purchaseQuantity={quantumPurchaseQuantity}
                              />
                            </Suspense>
                          ),
                        }
                      : avocatoActive
                        ? {
                            ariaLabel: intl.formatMessage(
                              messages.avocatoRoute,
                            ),
                            content: (
                              <Suspense
                                fallback={
                                  <div
                                    aria-label={intl.formatMessage(
                                      messages.avocatoRoute,
                                    )}
                                    aria-busy="true"
                                  />
                                }
                              >
                                <AvocatoSurface
                                  locale={locale}
                                  unlocked={
                                    gameplay.progression.avocado.unlocked
                                  }
                                  resources={gameplay.resources.avocado}
                                  spendable={{
                                    infinityPoints:
                                      gameplay.resources.infinity
                                        .availablePoints,
                                    influence:
                                      gameplay.resources.reality.influence,
                                    strangeMatter:
                                      gameplay.resources.dream.strangeMatter,
                                  }}
                                  derived={gameplay.derived.avocado}
                                  previews={gameplay.previews.avocado}
                                  commandAvailability={{
                                    feed:
                                      gameplay.commands.byKind[
                                        'avocado.feed'
                                      ].routeAvailable,
                                  }}
                                  dispatchPlayer={dispatchPlayer}
                                />
                              </Suspense>
                            ),
                          }
                        : storyActive
                          ? {
                              ariaLabel: intl.formatMessage(
                                messages.storyRoute,
                              ),
                              content: (
                                <Suspense
                                  fallback={
                                    <div
                                      aria-label={intl.formatMessage(
                                        messages.storyRoute,
                                      )}
                                      aria-busy="true"
                                    />
                                  }
                                >
                                  <StorySurface
                                    story={gameplay.derived.story}
                                  />
                                </Suspense>
                              ),
                            }
                          : wikiActive
                            ? {
                                ariaLabel: intl.formatMessage(
                                  messages.wikiRoute,
                                ),
                                content: (
                                  <Suspense
                                    fallback={
                                      <div
                                        aria-label={intl.formatMessage(
                                          messages.wikiRoute,
                                        )}
                                        aria-busy="true"
                                      />
                                    }
                                  >
                                    <WikiSurface
                                      initialCategory={wikiTopicRef.current}
                                      locale={locale}
                                      onCategoryChange={rememberWikiTopic}
                                      progression={
                                        wikiProgressionFromResources(
                                          gameplay.resources,
                                          gameplay.visibility,
                                        )
                                      }
                                    />
                                  </Suspense>
                                ),
                              }
                            : offlineTimeActive
                              ? {
                                  ariaLabel: intl.formatMessage(
                                    messages.offlineTimeRoute,
                                  ),
                                  content: (
                                    <Suspense
                                      fallback={
                                        <div
                                          aria-label={intl.formatMessage(
                                            messages.offlineTimeRoute,
                                          )}
                                          aria-busy="true"
                                        />
                                      }
                                    >
                                      <OfflineTimeSurface
                                        locale={locale}
                                        resources={gameplay.resources.time}
                                        infinityUsage={
                                          gameplay.progression.infinity
                                        }
                                        previews={gameplay.previews.time}
                                        storedTimeCheater={
                                          gameplay.runtime.storedTimeCheater
                                        }
                                        commandAvailability={{
                                          upgradeStoredCapacity:
                                            gameplay.commands.byKind[
                                              'time.upgrade-stored-capacity'
                                            ].routeAvailable,
                                          requestStoredTimeSpend:
                                            gameplay.commands.byKind[
                                              'time.request-stored-time-spend'
                                            ].routeAvailable,
                                        }}
                                        dispatchPlayer={dispatchPlayer}
                                        jobStatus={storedTimeJob}
                                        cancelJob={cancelStoredTimeJob}
                                        initialDraft={
                                          offlineTimeDraftRef.current
                                        }
                                        onDraftChange={
                                          rememberOfflineTimeDraft
                                        }
                                      />
                                    </Suspense>
                                  ),
                                }
                              : statisticsActive
                                ? {
                                    ariaLabel: intl.formatMessage(
                                      messages.statisticsRoute,
                                    ),
                                    content: (
                                      <Suspense
                                        fallback={
                                          <div
                                            aria-label={intl.formatMessage(
                                              messages.statisticsRoute,
                                            )}
                                            aria-busy="true"
                                          />
                                        }
                                      >
                                        <StatisticsSurface
                                          locale={locale}
                                          statistics={
                                            gameplay.progression.statistics
                                          }
                                          visibility={{
                                            infinity:
                                              gameplay.visibility.infinity
                                                .routeUnlocked,
                                            simulations:
                                              gameplay.visibility.simulations
                                                .routeUnlocked,
                                            reality:
                                              gameplay.visibility.reality
                                                .routeUnlocked,
                                          }}
                                        />
                                      </Suspense>
                                    ),
                                  }
                                : storeActive && storeController !== null
                                  ? {
                                      ariaLabel: intl.formatMessage(
                                        messages.storeRoute,
                                      ),
                                      content: (
                                        <Suspense
                                          fallback={
                                            <div
                                              aria-label={intl.formatMessage(
                                                messages.storeRoute,
                                              )}
                                              aria-busy="true"
                                            />
                                          }
                                        >
                                          <StoreSurface
                                            controller={storeController}
                                            deviceOnlyPurchases={
                                              releasePlatformServices?.hostKind ===
                                              'browser'
                                            }
                                            localDeveloperOptionsPurchased={
                                              localDeveloperOptionsPurchased ??
                                              development?.status().entitled ??
                                              false
                                            }
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
          : quantumRouteActive
            ? {
                ariaLabel: intl.formatMessage(messages.quantumControls),
                content: (
                  <QuantumControlPanel
                    locale={locale}
                    infinityPoints={gameplay.resources.infinity.points}
                    purchaseSettingsOpen={quantumPurchaseSettingsOpen}
                    purchaseQuantity={quantumPurchaseQuantity}
                    onPurchaseSettingsOpenChange={setQuantumPurchaseSettingsOpen}
                    onPurchaseQuantityChange={setQuantumPurchaseQuantity}
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
      showResourceHeader={
        !realityActive && !simulationsActive && !storeActive
      }
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
            automationUnlocked={
              gameplay.progression.infinity.automationUnlocked.bots
            }
            automationFacilityIds={automationFacilityIds}
            automationEnabledFacilities={
              gameplay.progression.dyson.automation.enabledFacilities
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
            automationRouteAvailable={
              gameplay.commands.byKind[
                'dyson.set-facility-automation'
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
      {meditationPlacement !== null ? (
        <AvocatoMeditationSecretTrigger
          placement={meditationPlacement}
          requiredStepIndex={gameplay.progression.secretProgress.step}
          completed={gameplay.progression.secretProgress.completed}
          routeAvailable={
            gameplay.commands.byKind[
              'avocado.complete-meditation-step'
            ].routeAvailable
          }
          dispatchPlayer={dispatchPlayer}
          onSequenceCompleted={() =>
            setAvotationCompletionVisible(true)
          }
        />
      ) : null}
      <AvocatoMeditationSecretTrigger
        placement="side"
        requiredStepIndex={gameplay.progression.secretProgress.step}
        completed={gameplay.progression.secretProgress.completed}
        routeAvailable={
          gameplay.commands.byKind[
            'avocado.complete-meditation-step'
          ].routeAvailable
        }
        dispatchPlayer={dispatchPlayer}
        onSequenceCompleted={() =>
          setAvotationCompletionVisible(true)
        }
      />
      <AvotationCompletionOverlay
        open={avotationCompletionVisible}
        onDismiss={() => setAvotationCompletionVisible(false)}
      />
    </>
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

function unavailableImport(): Promise<UiRuntimeImportResult> {
  return Promise.resolve({
    imported: false,
    committed: false,
    code: 'RUNTIME-IMPORT-UNAVAILABLE',
    reason: 'Import is unavailable in this host.',
    recoveryAvailable: false,
  })
}

function unavailableImportPreview(): Promise<UiRuntimeImportPreviewResult> {
  return Promise.resolve({
    accepted: false,
    code: 'RUNTIME-IMPORT-PREVIEW-UNAVAILABLE',
    reason: 'Import preview is unavailable in this host.',
  })
}

function unavailableExport(): Promise<boolean> {
  return Promise.resolve(false)
}

function unavailableReadSave(): Promise<null> {
  return Promise.resolve(null)
}

function unavailableCopy(): Promise<void> {
  return Promise.resolve()
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
