import { ReworkChallengesSurface } from '../rework/ReworkChallengesSurface'
import { AvocatoSurface } from '../quantum/AvocatoSurface'
import { isAvocatoRouteUnlocked } from './avocatoNavigation'
import { CivilizationSurface } from '../simulations/CivilizationSurface'
import { ReworkTranscendenceSurface, ReworkMigrationNotice } from '../rework/ReworkSurfaces'
import { activeGameSpeed, realTimeRate } from '../effectiveSpeed'
import { TabPresetQuickActions } from '../skills/TabPresetQuickActions'
import { discoveryMessages } from '../discovery/messages'
import { NonRefundableSkillConfirmationProvider } from '../skills/NonRefundableSkillConfirmation'
import { useConfirmedTabPresetDispatch } from '../skills/useConfirmedTabPresetDispatch'
import { StoredTimeNavigationProgress } from '../offline-time/QuickStoredTime'
import { challengeMessages } from '../infinity/challengeMessages'
import { useBotBoost } from '../store/useBotBoost'
import { boostMessages } from '../store/boostMessages'
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
import {
  DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
  type BottomNavigationDestinationId,
} from '../../../game-state/navigationPreferences'
import { useBottomNavigationText } from '../../bottom-navigation-text'
import '../facilities/facilities.css'
import {
  DysonGameplayShell,
  navigationAssets,
} from '../shell'
import { TinkerSurface } from '../tinker'
import { GameplayNotificationHost } from '../notifications'
import {
  formatGameDuration,
  formatGameNumber,
  formatNumber,
  formatWholeGameNumber,
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
  type UiRuntimeImportPreviewResult,
  type UiRuntimeImportResult,
  type UiRuntimeSuppliedFile,
  type UiRuntimeStoredTimeControls,
} from '../../runtime'
import {
  reportDevelopmentTelemetry,
  startDevelopmentTelemetry,
} from '../../runtime/developmentTelemetry'
import {
  readPresentationPreference,
  writeBooleanPresentationPreference,
  writePresentationPreference,
} from '../../presentationPreferences'
import type { SettingsSurfaceProps } from '../settings'
import type { DebugSurfaceDraft } from '../debug'
import type {
} from '../offline-time'
import type {
  SkillPresetActions,
  SkillTreeViewState,
} from '../skills'
import {
  beginFirstSliceSnapshotSelection,
  isNewCommittedRevision,
  recordFirstSliceReactCommit,
  type FirstSliceCommitRevision,
} from '../../performance/firstSliceCommitProbe'
import { readyDysonMessages as messages } from './messages'
import {
  BotDistribution,
  DysonGoalSummary,
  DysonInfo,
  DysonRunFacts,
} from './DysonControls'
import { LazySurfacePending } from './LazySurfacePending'
import {
  DysonProductionSummary,
} from './DysonLowerFacts'
import { DysonSwarmVisual } from './DysonSwarmVisual'
import { shouldSettleRapidInfinityVisualization } from './rapidInfinityVisualization'
import {
  HIGHLIGHTABLE_ROUTES,
  isHighlightableRoute,
  reconcileStoredRouteHighlights,
  type HighlightableRoute,
  type StoredRouteHighlights,
} from './routeHighlights'
import {
  wikiProgressionFromResources,
  type WikiCategoryId,
} from '../wiki/wikiProjection'
import type { ReleasePlatformServices } from '../../../platform/releaseFoundation'
import type { ReleaseFooterPresentation } from '../../../platform/releaseFooter'
import { Capacitor } from '@capacitor/core'
import { blindsidedGamesDestination } from '../../../platform/communityLinks'
import type { GameAudioService } from '../../../audio'

const FacilityRegion = lazy(async () => {
  const module = await import('../facilities')
  return { default: module.FacilityRegion }
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

const OfflineTimeSurface = lazy(async () => {
  const module = await import('../offline-time')
  return { default: module.OfflineTimeSurface }
})

const StatisticsSurface = lazy(async () => {
  const module = await import('../statistics')
  return { default: module.StatisticsSurface }
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
export const QUANTUM_HIDE_MAXED_STORAGE_KEY =
  'idle-dyson-swarm.quantum-hide-maxed.v1'
const SKILL_PRESET_APPLICATION_NOTICES_STORAGE_KEY =
  'idle-dyson-swarm.skill-preset-application-notices.v1'
const SettingsSurface = lazy(async () => {
  const module = await import('../settings')
  return { default: module.SettingsSurface }
})

const DebugSurface = lazy(async () => {
  const module = await import('../debug')
  return { default: module.DebugSurface }
})

const StoreRouteSurface = lazy(async () => {
  const module = await import('../store')
  return { default: module.StoreRouteSurface }
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
  readonly readSaveExport?: SettingsSurfaceProps['readSaveExport']
  readonly downloadSaveText?: SettingsSurfaceProps['downloadSaveText']
  readonly copySaveText?: (text: string) => Promise<void>
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly releaseFooter?: Readonly<ReleaseFooterPresentation>
  readonly localDeveloperOptionsPurchased?: boolean
  readonly audio?: GameAudioService
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
  readSaveExport = unavailableReadSaveExport,
  downloadSaveText = unavailableDownloadSaveText,
  copySaveText = unavailableCopy,
  releasePlatformServices,
  releaseFooter,
  localDeveloperOptionsPurchased,
  audio,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>(
    readGameplayRoutePreference,
  )
  useLayoutEffect(() => {
    runtime.setGameplayPreviewDemand(gameplayPreviewDemandForRoute(route))
  }, [route, runtime])
  const changeRoute = useCallback(
    (nextRoute: ReadyGameRoute) => {
      runtime.setGameplayPreviewDemand(
        gameplayPreviewDemandForRoute(nextRoute),
      )
      writeGameplayRoutePreference(nextRoute)
      setRoute(nextRoute)
    },
    [runtime],
  )
  const snapshot = useBrowserRuntimeSnapshot(runtime)
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
      onFacilityDetailsDemandChange={runtime.setFacilityDetailsDemand}
      onPresentationEventsAccepted={runtime.acknowledgePresentationEvents}
      dispatchPlayer={dispatchPlayer}
      presetActions={presetActions}
      route={route}
      onRouteChange={changeRoute}
      resetSave={resetSave}
      previewImportSaveFile={previewImportSaveFile}
      previewImportSaveText={previewImportSaveText}
      importSaveFile={importSaveFile}
      importSaveText={importSaveText}
      readSaveExport={readSaveExport}
      downloadSaveText={downloadSaveText}
      copySaveText={copySaveText}
      development={runtime.development}
      synchronizeHostEntitlements={runtime.synchronizeHostEntitlements}
      releasePlatformServices={releasePlatformServices}
      releaseFooter={releaseFooter}
      localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      audio={audio}
      storedTime={runtime.storedTime}
      openExternalUrl={runtime.openExternalUrl}
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
  readSaveExport = unavailableReadSaveExport,
  downloadSaveText = unavailableDownloadSaveText,
  copySaveText = unavailableCopy,
  releasePlatformServices,
  releaseFooter,
  localDeveloperOptionsPurchased,
  audio,
}: ReadyDysonRuntimeHostProps) {
  const [route, setRoute] = useState<ReadyGameRoute>(
    readGameplayRoutePreference,
  )
  useLayoutEffect(() => {
    runtime.setGameplayPreviewDemand(gameplayPreviewDemandForRoute(route))
  }, [route, runtime])
  const changeRoute = useCallback(
    (nextRoute: ReadyGameRoute) => {
      runtime.setGameplayPreviewDemand(
        gameplayPreviewDemandForRoute(nextRoute),
      )
      writeGameplayRoutePreference(nextRoute)
      setRoute(nextRoute)
    },
    [runtime],
  )
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
      onFacilityDetailsDemandChange={runtime.setFacilityDetailsDemand}
      onPresentationEventsAccepted={runtime.acknowledgePresentationEvents}
      dispatchPlayer={dispatchPlayer}
      presetActions={presetActions}
      route={route}
      onRouteChange={changeRoute}
      resetSave={resetSave}
      previewImportSaveFile={previewImportSaveFile}
      previewImportSaveText={previewImportSaveText}
      importSaveFile={importSaveFile}
      importSaveText={importSaveText}
      readSaveExport={readSaveExport}
      downloadSaveText={downloadSaveText}
      copySaveText={copySaveText}
      development={runtime.development}
      synchronizeHostEntitlements={runtime.synchronizeHostEntitlements}
      releasePlatformServices={releasePlatformServices}
      releaseFooter={releaseFooter}
      localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      audio={audio}
      storedTime={runtime.storedTime}
      openExternalUrl={runtime.openExternalUrl}
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
  readonly onFacilityDetailsDemandChange?: (expanded: boolean) => void
  readonly onPresentationEventsAccepted?: (session: number, sequence: number) => void
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
  readonly readSaveExport?: SettingsSurfaceProps['readSaveExport']
  readonly downloadSaveText?: SettingsSurfaceProps['downloadSaveText']
  readonly copySaveText?: (text: string) => Promise<void>
  readonly development?: UiRuntimeDevelopmentControls
  readonly synchronizeHostEntitlements?: () => Promise<boolean>
  readonly releasePlatformServices?: Readonly<ReleasePlatformServices>
  readonly releaseFooter?: Readonly<ReleaseFooterPresentation>
  readonly localDeveloperOptionsPurchased?: boolean
  readonly storedTime?: UiRuntimeStoredTimeControls
  readonly audio?: GameAudioService
  readonly openExternalUrl?: SettingsSurfaceProps['openExternalUrl']
}

export type ReadyGameRoute =
  | 'transcendence'
  | 'bots'
  | 'research'
  | 'skills'
  | 'infinity'
  | 'challenges'
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

export const GAMEPLAY_ROUTE_STORAGE_KEY =
  'idle-dyson-swarm.gameplay.last-route.v1'
const READY_GAME_ROUTES = new Set<ReadyGameRoute>([
  'transcendence',
  'bots',
  'research',
  'skills',
  'infinity',
  'challenges',
  'reality',
  'simulations',
  'quantum',
  'avocato',
  'story',
  'wiki',
  'offline-time',
  'statistics',
  'store',
  'debug',
  'settings',
])

function readGameplayRoutePreference(): ReadyGameRoute {
  const stored = readPresentationPreference(GAMEPLAY_ROUTE_STORAGE_KEY)
  return stored !== null && READY_GAME_ROUTES.has(stored as ReadyGameRoute)
    ? stored as ReadyGameRoute
    : 'bots'
}

function writeGameplayRoutePreference(route: ReadyGameRoute): void {
  writePresentationPreference(GAMEPLAY_ROUTE_STORAGE_KEY, route)
}

function gameplayPreviewDemandForRoute(
  route: ReadyGameRoute,
): FrontendGameplayPreviewDemand {
  switch (route) {
    case 'transcendence': return 'bots'
    case 'challenges':
      return 'infinity'
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

/**
 * Maps published canonical facts into presentation components without
 * recalculating unlocks, affordability, timing or command outcomes.
 */
export function ReadyDysonSlice(props: ReadyDysonSliceProps) {
  return <NonRefundableSkillConfirmationProvider><ReadyDysonSliceContent {...props} /></NonRefundableSkillConfirmationProvider>
}

function ReadyDysonSliceContent({
  snapshot,
  locale,
  dispatchPlayer: unconfirmedDispatchPlayer,
  presetActions,
  onPresentationEventsAccepted,
  onFacilityDetailsDemandChange,
  route: requestedRoute = 'bots',
  onRouteChange = () => undefined,
  resetSave = unavailableReset,
  previewImportSaveFile = unavailableImportPreview,
  previewImportSaveText = unavailableImportPreview,
  importSaveFile = unavailableImport,
  importSaveText = unavailableImport,
  readSaveExport = unavailableReadSaveExport,
  downloadSaveText = unavailableDownloadSaveText,
  copySaveText = unavailableCopy,
  development,
  synchronizeHostEntitlements,
  releasePlatformServices,
  releaseFooter,
  localDeveloperOptionsPurchased,
  storedTime,
  audio,
  openExternalUrl,
}: ReadyDysonSliceProps) {
  const bottomNavigationTextPreference = useBottomNavigationText()
  const intl = useIntl()
  const [visualizationVisible, setVisualizationVisible] =
    useState(readVisualizationPreference)
  const [
    showSkillPresetApplicationNotices,
    setShowSkillPresetApplicationNotices,
  ] = useState(() =>
    readPresentationPreference(
      SKILL_PRESET_APPLICATION_NOTICES_STORAGE_KEY,
    ) !== 'false',
  )
  const debugDraftRef = useRef<DebugSurfaceDraft>({
    amount: '1',
    preset: 'early',
  })
  const wikiTopicRef = useRef<WikiCategoryId>('bots')
  const skillTreeViewRef = useRef<SkillTreeViewState | null>(null)
  const rememberDebugDraft = useCallback(
    (draft: Readonly<DebugSurfaceDraft>) => {
      debugDraftRef.current = { ...draft }
    },
    [],
  )
  const rememberWikiTopic = useCallback((topic: WikiCategoryId) => {
    wikiTopicRef.current = topic
  }, [])
  const rememberSkillTreeView = useCallback(
    (view: SkillTreeViewState) => {
      skillTreeViewRef.current = view
    },
    [],
  )
  const storeVisible =
    releasePlatformServices !== undefined
  const gameplay = snapshot.gameplay
  const gameSpeed = activeGameSpeed(gameplay.resources.time, gameplay.progression.timeline)
  const dispatchPlayer = useConfirmedTabPresetDispatch({
    dispatchPlayer: unconfirmedDispatchPlayer,
    autoAssignNonRefundable: gameplay.progression.skills.autoAssignNonRefundable,
    presets: gameplay.progression.skills.presets,
    catalog: gameplay.previews.skills,
    previewNonRefundableAssignment: presetActions?.previewNonRefundableAssignment,
  })
  const discoveryUnlocked = gameplay.progression.discovery?.unlocked === true
  const ownsBotBoost = gameplay.derived.dyson.status === 'ready' && gameplay.derived.dyson.value.entitlements.permanentBotBoost === true
  const botBoostStatus = useBotBoost(gameplay.progression.meta.botBoost, ownsBotBoost)
  const allTabsUnlocked = gameplay.visibility.allTabsUnlocked === true
  const transcendenceAvailable = isAvocatoRouteUnlocked({
    firstInfinityComplete: gameplay.progression.meta.firstInfinityComplete, discoveryUnlocked,
    overflowPoints: gameplay.resources.avocado.overflowPoints, overflowPending: gameplay.progression.infinity.botCapTransitionPending,
    developmentOverride: allTabsUnlocked,
  })
  const challengesUnlocked = allTabsUnlocked || (gameplay.progression.challenges?.unlocked ?? false)
  const requestedRouteUnavailable =
    ((requestedRoute === 'transcendence' || requestedRoute === 'avocato') && !transcendenceAvailable) ||
    (requestedRoute === 'challenges' && !challengesUnlocked) ||
    (requestedRoute === 'research' && !discoveryUnlocked &&
      !(gameplay.visibility.research?.routeUnlocked ?? true)) ||
    (requestedRoute === 'skills' &&
      !gameplay.visibility.skills.routeUnlocked) ||
    (requestedRoute === 'infinity' &&
      !gameplay.visibility.infinity.routeUnlocked) ||
    (requestedRoute === 'reality' || requestedRoute === 'quantum') ||
    (requestedRoute === 'store' && !storeVisible) ||
    (requestedRoute === 'offline-time' &&
      gameplay.resources.time.storedTimeCapacitySeconds <= 0) ||
    (requestedRoute === 'debug' && development === undefined)
  const route =
    requestedRouteUnavailable
      ? 'bots'
      : requestedRoute === 'research' && discoveryUnlocked ? 'transcendence' : requestedRoute
  const dyson = gameplay.derived.dyson
  const rapidInfinityVisualization =
    shouldSettleRapidInfinityVisualization({
      automaticResetEnabled:
        gameplay.progression.infinity.automaticResetEnabled,
      infinityCycleSeconds:
        gameplay.progression.timeline?.infinityCycleSeconds ??
        Number.POSITIVE_INFINITY,
      recentInfinityCycles:
        gameplay.progression.statistics?.recentInfinityCycles,
    })
  const tinker = gameplay.runtime.tinker
  const previousAutomatedSelection = useRef<{
    readonly route: 'bots' | 'research'
    readonly slot: number
  } | null>(null)
  const lastPresetApplication =
    gameplay.runtime.lastSkillPresetApplication
  const [
    dismissedPresetApplicationSequence,
    setDismissedPresetApplicationSequence,
  ] = useState<number | null>(null)
  const visiblePresetApplication =
    lastPresetApplication !== null &&
    lastPresetApplication.blockedByRetainedSkillIds.length > 0 &&
    lastPresetApplication.applicationSequence !==
      dismissedPresetApplicationSequence
      ? lastPresetApplication
      : undefined
  const updateShowSkillPresetApplicationNotices = useCallback(
    (show: boolean) => {
      setShowSkillPresetApplicationNotices(show)
      writeBooleanPresentationPreference(
        SKILL_PRESET_APPLICATION_NOTICES_STORAGE_KEY,
        show,
      )
      if (lastPresetApplication !== null) {
        setDismissedPresetApplicationSequence(
          lastPresetApplication.applicationSequence,
        )
      }
    },
    [lastPresetApplication],
  )
  const dismissPresetApplication = useCallback(() => {
    if (lastPresetApplication !== null) {
      setDismissedPresetApplicationSequence(
        lastPresetApplication.applicationSequence,
      )
    }
  }, [lastPresetApplication])
  const automatedRoute =
    route === 'bots' || route === 'research' ? route : null
  const automatedPresetSlot = automatedRoute === null
    ? 0
    : gameplay.progression.skills.tabPresetAutomation[automatedRoute]
  useEffect(() => {
    if (requestedRouteUnavailable && route !== requestedRoute) {
      onRouteChange('bots')
    }
  }, [onRouteChange, requestedRoute, requestedRouteUnavailable, route])
  useEffect(() => {
    if (automatedRoute === null) {
      previousAutomatedSelection.current = null
      return
    }
    const previousSelection = previousAutomatedSelection.current
    if (
      previousSelection?.route === automatedRoute &&
      previousSelection.slot === automatedPresetSlot
    ) {
      return
    }
    previousAutomatedSelection.current = {
      route: automatedRoute,
      slot: automatedPresetSlot,
    }
    if (automatedPresetSlot === 0) return
    if (
      previousSelection?.route === automatedRoute &&
      lastPresetApplication?.trigger === 'automatic' &&
      lastPresetApplication.slot === automatedPresetSlot
    ) {
      return
    }
    void dispatchPlayer({
      kind: 'skill.apply-tab-preset-automation',
      tab: automatedRoute,
    }).catch(() => undefined)
  }, [
    automatedRoute,
    automatedPresetSlot,
    dispatchPlayer,
    lastPresetApplication?.slot,
    lastPresetApplication?.trigger,
  ])

  const highlightableRouteUnlocks = useMemo(() => ({
    research: gameplay.visibility.research?.routeUnlocked ?? true,
    skills: gameplay.visibility.skills.routeUnlocked,
    infinity: gameplay.visibility.infinity.routeUnlocked,
    challenges: challengesUnlocked,
    reality: gameplay.visibility.reality.routeUnlocked,
    simulations: gameplay.visibility.simulations.routeUnlocked,
    quantum: gameplay.visibility.quantum.routeUnlocked,
  }), [
    gameplay.visibility.infinity.routeUnlocked,
    challengesUnlocked,
    gameplay.visibility.reality.routeUnlocked,
    gameplay.visibility.research?.routeUnlocked,
    gameplay.visibility.simulations.routeUnlocked,
    gameplay.visibility.skills.routeUnlocked,
    gameplay.visibility.quantum.routeUnlocked,
  ])
  const { newlyUnlockedRoutes, markVisited } = useNewRouteHighlights(
    gameplay.progression.meta?.navigationRouteDiscovery,
    highlightableRouteUnlocks,
    route,
    dispatchPlayer,
  )
  const navigateTo = useCallback((nextRoute: ReadyGameRoute) => {
    markVisited(nextRoute)
    onRouteChange(nextRoute)
  }, [markVisited, onRouteChange])

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
  const quantumUnlocks = gameplay.progression.quantum.unlocks
  const unlockedMegaStructureIds: CanonicalFacilityId[] = [
    ...(quantumUnlocks.matrioshkaBrains
      ? ['matrioshka_brains' as const]
      : []),
    ...(quantumUnlocks.birchPlanets
      ? ['birch_planets' as const]
      : []),
    ...(quantumUnlocks.galacticBrains
      ? ['galactic_brains' as const]
      : []),
  ]
  const automationFacilityIds: CanonicalFacilityId[] = [
    'assembly_lines',
    'ai_managers',
    'servers',
    'data_centers',
    'planets',
    ...unlockedMegaStructureIds,
  ]
  const automationResearchIds = [
    'research.science_boost',
    'research.money_multiplier',
    'research.assembly_line_upgrade',
    'research.ai_manager_upgrade',
    'research.server_upgrade',
    'research.data_center_upgrade',
    'research.planet_upgrade',
    ...unlockedMegaStructureIds.map((facilityId) =>
      `research.${facilityId}_upgrade`,
    ),
  ]
  const display = (value: NumericValue) =>
    formatGameNumber(locale, value)
  const displayWhole = (value: NumericValue) =>
    formatWholeGameNumber(locale, value)
  const precise = (value: NumericValue) =>
    formatPreciseNumber(locale, value)
  const cashValue = (value: string) =>
    intl.formatMessage(messages.cashValue, { value })
  const cashRate = (value: string) =>
    intl.formatMessage(messages.cashRate, { value })
  const scienceRate = (value: string) =>
    intl.formatMessage(messages.scienceRate, { value })
  const hasVisibleFacilities =
    visibility.visibleFacilityIds.length > 0
  const hasFacilityContent =
    hasVisibleFacilities ||
    visibility.showNextFacilityTeaser
  const settingsActive = route === 'settings'
  const researchActive = route === 'research'
  const botMultitasking =
    gameplay.progression.quantum.unlocks.botMultitasking
  const skillsActive = route === 'skills'
  const infinityActive = route === 'infinity'
  const challengesActive = route === 'challenges'
  const simulationsActive = route === 'simulations'
  const storyActive = route === 'story'
  const wikiActive = route === 'wiki'
  const offlineTimeActive = route === 'offline-time'
  const statisticsActive = route === 'statistics'
  const storeActive = route === 'store'
  const debugActive = route === 'debug'
  const showSharedResourceHeader = !(
    skillsActive ||
    challengesActive ||
    infinityActive ||
    simulationsActive ||
    storyActive ||
    wikiActive ||
    statisticsActive ||
    storeActive ||
    settingsActive || route === 'transcendence' || route === 'avocato'
  )
  const navigationVisibility =
    gameplay.progression.meta?.navigationVisibility ??
    DEFAULT_BOTTOM_NAVIGATION_VISIBILITY
  const bottomNavigationIncludeText =
    bottomNavigationTextPreference.includeText
  const bottomVisible = (id: BottomNavigationDestinationId) =>
    navigationVisibility[id] ?? DEFAULT_BOTTOM_NAVIGATION_VISIBILITY[id]
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
  const availableNavigationItems: BottomNavigationDestinationId[] = [
    ...(transcendenceAvailable ? ['transcendence' as const, 'avocato' as const] : []),
    'bots',
    ...(!discoveryUnlocked ? ['research' as const] : []),
    ...(gameplay.visibility.skills.routeVisible ? ['skills' as const] : []),
    ...(gameplay.visibility.infinity.routeVisible ? ['infinity' as const] : []),
    ...(challengesUnlocked ? ['challenges' as const] : []),
    'simulations',
    ...(storeVisible ? ['store' as const] : []),
    'story',
    'wiki',
    ...(storedTimeCapacitySeconds > 0 ? ['offline-time' as const] : []),
    'statistics',
    'settings',
  ]
  const routeHeading = challengesActive
    ? challengeMessages.route
    : debugActive
    ? messages.debugRoute
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
    : route === 'avocato' ? messages.avocatoRoute
    : route === 'transcendence' ? discoveryMessages.route
    : researchActive
      ? messages.researchRoute
      : skillsActive
        ? messages.skillsRoute
        : infinityActive
          ? messages.infinityRoute
          : simulationsActive
              ? messages.simulationsRoute
            : messages.route
  const presetQuickActions = gameplay.visibility.skills.routeUnlocked ? (
    <TabPresetQuickActions
      presets={gameplay.progression.skills.presets}
      selectedSlot={gameplay.runtime.selectedSkillPresetSlot}
      disabled={!gameplay.commands.byKind['skill.select-preset'].routeAvailable || gameplay.progression.challenges?.active === 'blank-slate'}
      discoveryUnlocked={discoveryUnlocked}
      presetActions={presetActions}
      dispatchPlayer={dispatchPlayer}
    />
  ) : undefined

  const infinityRouteLabel =
    gameplay.progression.infinity.botCapTransitionPending ||
    gameplay.derived.infinity.navigationReward === null
      ? intl.formatMessage(messages.infinityRoute)
      : intl.formatMessage(messages.infinityRouteGain, {
          value: displayWhole(
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
      moreMenuLabel={intl.formatMessage(messages.moreMenu)}
      moreMenuNewLabel={intl.formatMessage(messages.moreMenuNew)}
      releaseFooter={releaseFooter === undefined
        ? undefined
        : intl.formatMessage(messages.releaseFooter, releaseFooter)}
      heading={intl.formatMessage(routeHeading)}
      routeTheme={route === 'transcendence' ? 'avocato' : challengesActive ? 'infinity' : debugActive ? 'statistics' : storeActive ? 'bots' : route}
      routeContentEdgeToEdge={storeActive}
      routeThemeVariant={
        simulationsActive ? 'information' : gameplay.derived.simulations?.currentEra ?? 'foundational'
      }
      navigation={{
        ariaLabel: intl.formatMessage(messages.primaryNavigation),
        drawerAriaLabel: intl.formatMessage(messages.sideNavigation),
        bottomAriaLabel: intl.formatMessage(messages.bottomNavigation),
        includeBottomText: bottomNavigationIncludeText,
        items: [
          ...(transcendenceAvailable ? [{
            id: 'transcendence', label: intl.formatMessage(discoveryMessages.route), iconSrc: navigationAssets.transcendence,
            bottom: bottomVisible('transcendence'),
            ...(route === 'transcendence' ? { current: true as const } : { onActivate: () => navigateTo('transcendence') }),
          }, {
            id: 'avocato', label: intl.formatMessage(messages.avocatoRoute), iconSrc: navigationAssets.avocato,
            iconMaskMode: 'luminance' as const,
            bottom: bottomVisible('avocato'),
            ...(route === 'avocato' ? { current: true as const } : { onActivate: () => navigateTo('avocato') }),
          }] : []),
          {
            id: 'bots',
            label: intl.formatMessage(messages.route),
            iconSrc: navigationAssets.bots,
            bottom: bottomVisible('bots'),
            ...(route === 'bots'
              ? { current: true as const }
              : { onActivate: () => onRouteChange('bots') }),
          },
          ...(!discoveryUnlocked ? [{
            id: 'research',
            label: intl.formatMessage(messages.researchRoute),
            iconSrc: navigationAssets.research,
            bottom: bottomVisible('research'),
            newlyUnlocked: newlyUnlockedRoutes.has('research'),
            ...(gameplay.visibility.research?.routeUnlocked ?? true
              ? researchActive
                ? { current: true as const }
                : { onActivate: () => navigateTo('research') }
              : { disabled: true }),
          }] : []),
          ...(gameplay.visibility.skills.routeVisible
            ? [{
                id: 'skills',
                label: intl.formatMessage(messages.skillsRoute),
                ariaLabel: skillsActive ||
                  gameplay.resources.skills.points <= 0n
                  ? intl.formatMessage(messages.skillsRoute)
                  : `${intl.formatMessage(messages.skillsRoute)}: ${displayWhole(
                    gameplay.resources.skills.points,
                  )}`,
                iconSrc: navigationAssets.skills,
                bottom: bottomVisible('skills'),
                badge: skillsActive ||
                  gameplay.resources.skills.points <= 0n
                  ? undefined
                  : displayWhole(gameplay.resources.skills.points),
                newlyUnlocked: newlyUnlockedRoutes.has('skills'),
                ...(skillsActive
                  ? { current: true as const }
                  : { onActivate: () => navigateTo('skills') }),
              }]
            : []),
          ...(gameplay.visibility.infinity.routeVisible
            ? [{
                id: 'infinity',
                label: infinityRouteLabel,
                ariaLabel: newlyUnlockedRoutes.has('infinity')
                  ? intl.formatMessage(messages.infinityRouteNew)
                  : undefined,
                iconSrc: navigationAssets.infinity,
                bottom: bottomVisible('infinity'),
                newlyUnlocked: newlyUnlockedRoutes.has('infinity'),
                ...(gameplay.visibility.infinity.routeUnlocked
                  ? infinityActive
                    ? { current: true as const }
                    : { onActivate: () => navigateTo('infinity') }
                  : {
                      disabled: true,
                      progress: {
                        fraction:
                          gameplay.visibility.infinity.unlockProgress.fraction,
                        label: intl.formatMessage(
                          messages.infinityBotsProgress,
                          {
                            destination: intl.formatMessage(
                              messages.infinityRoute,
                            ),
                            current: display(
                              gameplay.visibility.infinity.unlockProgress
                                .currentBots,
                            ),
                            required: display(
                              gameplay.visibility.infinity.unlockProgress
                                .requiredBots,
                            ),
                          },
                        ),
                      },
                    }),
              }]
            : []),
          ...(challengesUnlocked ? [{
            id: 'challenges',
            label: intl.formatMessage(challengeMessages.route),
            iconSrc: navigationAssets.challenges,
            iconMaskMode: 'luminance' as const,
            bottom: bottomVisible('challenges'),
            newlyUnlocked: newlyUnlockedRoutes.has('challenges'),
            ...(challengesActive ? { current: true as const }
              : { onActivate: () => navigateTo('challenges') }),
          }] : []),
          {
            id: 'simulations', label: intl.formatMessage(messages.simulationsRoute),
            iconSrc: navigationAssets.simulations, bottom: bottomVisible('simulations'),
            ...(simulationsActive ? { current: true as const } : { onActivate: () => navigateTo('simulations') }),
          },
          ...(storeVisible
            ? [
                {
                  id: 'store',
                  label: intl.formatMessage(messages.storeRoute),
                  iconSrc: navigationAssets.store,
                  badge: botBoostStatus.badge,
                  badgeOutlined: !botBoostStatus.active,
                  badgeReady: botBoostStatus.badgeReady,
                  ariaLabel: intl.formatMessage(boostMessages.navigation, { status: botBoostStatus.status }),
                  drawerIndicator: <span className="dyson-navigation__status">{!ownsBotBoost && botBoostStatus.active ? botBoostStatus.time : botBoostStatus.status}</span>,
                  bottom: bottomVisible('store'),
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
            bottom: bottomVisible('story'),
            ...(storyActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('story') }),
          },
          {
            id: 'wiki',
            label: intl.formatMessage(messages.wikiRoute),
            iconSrc: navigationAssets.wiki,
            bottom: bottomVisible('wiki'),
            ...(wikiActive
              ? { current: true as const }
              : { onActivate: () => onRouteChange('wiki') }),
          },
          ...(storedTimeCapacitySeconds > 0
            ? [{
                id: 'offline-time',
                drawerIndicator: <>
                  <span className="dyson-navigation__status">{formatGameDuration(locale, storedTimeAvailableSeconds)}</span>
                  <StoredTimeNavigationProgress storedTime={storedTime} />
                </>,
                label: intl.formatMessage(messages.offlineTimeRoute),
                ariaLabel: intl.formatMessage(messages.offlineTimeProgress, {
                  stored: formatGameDuration(
                    locale,
                    storedTimeAvailableSeconds,
                  ),
                  capacity: formatGameDuration(
                    locale,
                    storedTimeCapacitySeconds,
                  ),
                }),
                iconSrc: navigationAssets.offlineTime,
                bottom: bottomVisible('offline-time'),
                ...(offlineTimeActive
                  ? { current: true as const }
                  : {
                      onActivate: () => onRouteChange('offline-time'),
                    }),
              }]
            : []),
          {
            id: 'statistics',
            label: intl.formatMessage(messages.statisticsRoute),
            iconSrc: navigationAssets.statistics,
            bottom: bottomVisible('statistics'),
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
            bottom: bottomVisible('settings'),
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
                <Suspense
                  fallback={<LazySurfacePending />}
                >
                  <DebugSurface
                    development={development}
                    allTabsUnlocked={allTabsUnlocked}
                    locale={locale}
                    initialDraft={debugDraftRef.current}
                    onDraftChange={rememberDebugDraft}
                  />
                </Suspense>
              ),
            }
          : settingsActive
          ? {
              ariaLabel: intl.formatMessage(messages.settingsRoute),
              content: (
                <Suspense
                  fallback={<LazySurfacePending />}
                >
                  <SettingsSurface
                  showAchievements={releasePlatformServices?.showAchievements}
                  achievementProvider={releasePlatformServices?.achievementProvider}
                  resetSave={resetSave}
                  previewImportSaveFile={previewImportSaveFile}
                  previewImportSaveText={previewImportSaveText}
                  importSaveFile={importSaveFile}
                  importSaveText={importSaveText}
                  readSaveExport={readSaveExport}
                  downloadSaveText={downloadSaveText}
                  copySaveText={copySaveText}
                  storedTime={storedTime}
                  audio={audio}
                  processingIntervalMilliseconds={
                    gameplay.progression.timeline.processing
                      ?.activeIntervalMilliseconds ?? 33
                  }
                  processingIntervalAvailable={
                    gameplay.commands.byKind[
                      'settings.set-processing-interval'
                    ]?.routeAvailable ?? false
                  }
                  onProcessingIntervalChange={(milliseconds) =>
                    dispatchPlayer({
                      kind: 'settings.set-processing-interval',
                      milliseconds,
                    })}
                  development={
                    import.meta.env.DEV ? development : undefined
                  }
                  visualizationVisible={visualizationVisible}
                  onVisualizationVisibleChange={(visible) => {
                    setVisualizationVisible(visible)
                    writeVisualizationPreference(visible)
                  }}
                  navigationVisibility={navigationVisibility}
                  availableNavigationItems={availableNavigationItems}
                  bottomNavigationIncludeText={
                    bottomNavigationIncludeText
                  }
                  onNavigationVisibilityChange={(item, visible) => {
                    void dispatchPlayer({
                      kind: 'settings.set-navigation-item-visible',
                      item,
                      visible,
                    })
                  }}
                  onBottomNavigationIncludeTextChange={(includeText) => {
                    bottomNavigationTextPreference.setIncludeText(includeText)
                  }}
                  openExternalUrl={openExternalUrl}
                  developerDestination={blindsidedGamesDestination(
                    Capacitor.getPlatform() === 'android'
                      ? 'android'
                      : Capacitor.getPlatform() === 'ios'
                        ? 'ios'
                        : 'web',
                  )}
                  />
                </Suspense>
              ),
            }
          : route === 'transcendence'
            ? { ariaLabel: intl.formatMessage(discoveryMessages.route), content: <ReworkTranscendenceSurface gameplay={gameplay} locale={locale} gameSpeed={gameSpeed} onOpenStore={() => navigateTo('avocato')} /> }
          : route === 'avocato'
            ? { ariaLabel: intl.formatMessage(messages.avocatoRoute), content: <AvocatoSurface
                locale={locale} resources={gameplay.resources.avocado} previews={gameplay.previews.avocado}
                discovery={gameplay.progression.discovery}
                discoveryAvailable={gameplay.commands.byKind['discovery.purchase'].routeAvailable}
                commandAvailability={{ overflowReset: gameplay.commands.byKind['avocado.request-overflow-reset'].routeAvailable }}
                dispatchPlayer={dispatchPlayer} onDiscoveryUnlocked={() => navigateTo('transcendence')} /> }
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
                      presetQuickActions={presetQuickActions}
                      researchDisabled={gameplay.progression.challenges?.active === 'trial-and-error' || gameplay.progression.challenges?.active === 'no-science'}
                      locale={locale}
                      cards={gameplay.previews.research.cards}
                      researchers={resources.researchers}
                      sciencePerSecond={realTimeRate(rates.science, gameSpeed)}
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
                      automationResearchIds={automationResearchIds}
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
                      summarySupplement={
                        botMultitasking
                          ? (
                              <>
                                {botMultitasking && (
                                  <BotDistribution
                                    locale={locale}
                                    distribution={
                                      gameplay.progression.dyson
                                        .botDistribution
                                    }
                                    multitasking
                                    routeAvailable={false}
                                    dispatchPlayer={dispatchPlayer}
                                  />
                                )}
                              </>
                            )
                          : undefined
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
                        gameSpeed={gameSpeed}
                        discoveryUnlocked={discoveryUnlocked}
                        galvanizers={gameplay.progression.challenges?.galvanizers ?? 0n}
                        hasEarnedGalvanizer={gameplay.progression.challenges?.hasEarnedGalvanizer ?? false}
                        skillsDisabled={gameplay.progression.challenges?.active === 'blank-slate'}
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
                        presetApplication={
                          showSkillPresetApplicationNotices &&
                          visiblePresetApplication?.trigger !== 'automatic'
                            ? visiblePresetApplication
                            : undefined
                        }
                        onDismissPresetApplication={
                          lastPresetApplication === null
                            ? undefined
                            : dismissPresetApplication
                        }
                        showPresetApplicationNotifications={
                          showSkillPresetApplicationNotices
                        }
                        onShowPresetApplicationNotificationsChange={
                          updateShowSkillPresetApplicationNotices
                        }
                        presetActions={presetActions}
                        dispatchPlayer={dispatchPlayer}
                        initialTreeView={skillTreeViewRef.current}
                        onTreeViewChange={rememberSkillTreeView}
                      />
                    </Suspense>
                  ),
                }
              : challengesActive
                ? {
                    ariaLabel: intl.formatMessage(challengeMessages.route),
                    content: <ReworkChallengesSurface progress={gameplay.progression.challenges} earnedIp={gameplay.resources.infinity.points} firstInfinity={gameplay.progression.meta.firstInfinityComplete} breakTheLoop={gameplay.progression.quantum.unlocks.breakTheLoop} overflowPending={gameplay.progression.infinity.botCapTransitionPending} dispatchPlayer={dispatchPlayer} />,
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
                          discoveryUnlocked={gameplay.progression.discovery?.unlocked === true}
                          lastInfinityCycle={gameplay.progression.statistics.recentInfinityCycles?.[0]}
                          onViewOverflow={() => navigateTo('avocato')}
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
                            setAutomaticReset:
                              gameplay.commands.byKind[
                                'infinity.set-automatic-reset'
                              ].routeAvailable,
                            requestReset:
                              !gameplay.progression.infinity.botCapTransitionPending &&
                              (gameplay.commands.byKind[
                                'infinity.request-reset'
                              ]?.routeAvailable ?? false),
                          }}
                          dispatchPlayer={dispatchPlayer}
                        />
                      </Suspense>
                    ),
                  }
                : simulationsActive
                  ? { ariaLabel: intl.formatMessage(messages.simulationsRoute), content: <CivilizationSurface gameplay={gameplay} locale={locale} gameSpeed={gameSpeed} dispatchPlayer={dispatchPlayer} /> }
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
                                    <WikiSurface discoveryUnlocked={discoveryUnlocked}
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
                                        previews={gameplay.previews.time}
                                        storedTimeCheater={
                                          gameplay.runtime.storedTimeCheater
                                        }
                                        commandAvailability={{
                                          upgradeStoredCapacity:
                                            gameplay.commands.byKind[
                                              'time.upgrade-stored-capacity'
                                            ].routeAvailable,
                                          setOfflineBoost:
                                            gameplay.commands.byKind['time.set-offline-boost-multiplier'].routeAvailable,
                                        }}
                                        dispatchPlayer={dispatchPlayer}
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
                                          onClearBest={async (milestone) => (await dispatchPlayer({ kind: 'statistics.clear-speedrun-best', milestone })).status === 'accepted'}
                                          locale={locale}
                                          discovery={gameplay.progression.discovery}
                                          discoveryEffects={gameplay.derived.discovery}
                                          statistics={
                                            gameplay.progression.statistics
                                          }
                                          currentBreakTarget={
                                            gameplay.progression.infinity
                                              .breakTarget
                                          }
                                          swarmScale={
                                            dyson.value.presentation.swarmScale
                                          }
                                          visibility={{
                                            infinity:
                                              gameplay.visibility.infinity
                                                .routeUnlocked,
                                            simulations: false,
                                            reality: false,
                                          }}
                                        />
                                      </Suspense>
                                    ),
                                  }
                                : storeActive && releasePlatformServices !== undefined
                                  ? {
                                      ariaLabel: intl.formatMessage(
                                        messages.storeRoute,
                                      ),
                                      content: (
                                        <Suspense
                                          fallback={<LazySurfacePending />}
                                        >
                                          <StoreRouteSurface
                                            botBoost={{
                                              boost: gameplay.progression.meta.botBoost,
                                              owned: ownsBotBoost,
                                              platform: Capacitor.getPlatform() === 'ios' ? 'ios' : Capacitor.getPlatform() === 'android' ? 'android'
                                                : releasePlatformServices.hostKind === 'desktop-native' ? 'desktop'
                                                : /android/i.test(navigator.userAgent) ? 'android'
                                                : /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'web',
                                              onClaim: async () => (await dispatchPlayer({ kind: 'boost.claim' })).status === 'accepted',
                                              onSetEnabled: async (enabled) => (await dispatchPlayer({ kind: 'boost.set-enabled', enabled })).status === 'accepted',
                                              openExternalUrl: openExternalUrl ?? (async (url) => { window.open(url, '_blank', 'noopener,noreferrer') }),
                                            }}
                                            releasePlatformServices={releasePlatformServices}
                                            synchronizeHostEntitlements={synchronizeHostEntitlements}
                                            deviceOnlyPurchases={
                                              releasePlatformServices?.hostKind ===
                                              'browser'
                                            }
                                            restoreAvailable={
                                              releasePlatformServices?.storeRestoreAvailable
                                            }
                                            localDeveloperOptionsPurchased={
                                              localDeveloperOptionsPurchased ??
                                              development?.status().purchasedInGame ??
                                              false
                                            }
                                          />
                                        </Suspense>
                                      ),
                                    }
                                : undefined
      }
      persistentNotice={
        <ReworkMigrationNotice gameplay={gameplay} dispatchPlayer={dispatchPlayer} />
      }
      notifications={
        <GameplayNotificationHost
          sessionRevision={snapshot.revision.session}
          events={gameplay.runtime.presentationEvents}
          onEventsAccepted={onPresentationEventsAccepted}
          locale={locale}
          showPresetApplicationNotices={showSkillPresetApplicationNotices}
          onViewReality={() => navigateTo('simulations')}
        />
      }
      resources={{
        ariaLabel: intl.formatMessage(messages.resources),
        cash: {
          label: intl.formatMessage(messages.cash),
          value: cashValue(display(resources.money)),
          fullPrecisionValue: cashValue(precise(resources.money)),
          machineValue: String(resources.money),
          rate: cashRate(display(realTimeRate(rates.money, gameSpeed))),
          fullPrecisionRate: cashRate(precise(realTimeRate(rates.money, gameSpeed))),
        },
        totalBots: {
          label: intl.formatMessage(messages.totalBots),
          value: display(resources.bots),
          fullPrecisionValue: precise(resources.bots),
          machineValue: String(resources.bots),
          ...(route === 'bots'
            ? {
                detail: (
                  <DysonGoalSummary
                    locale={locale}
                    currentGoal={dyson.value.presentation.currentGoal}
                  />
                ),
              }
            : {}),
        },
        science: discoveryUnlocked ? undefined : {
          label: intl.formatMessage(messages.science),
          value: display(resources.science),
          fullPrecisionValue: precise(resources.science),
          machineValue: String(resources.science),
          rate: scienceRate(display(realTimeRate(rates.science, gameSpeed))),
          fullPrecisionRate: scienceRate(precise(realTimeRate(rates.science, gameSpeed))),
        },
      }}
      showResourceHeader={showSharedResourceHeader}
      swarmVisual={
        visualizationVisible
          ? {
              ariaLabel: intl.formatMessage(messages.dysonSwarm),
              content: (
                <DysonSwarmVisual
                  facts={
                    dyson.value.presentation.swarmVisualization
                  }
                  mode={
                    rapidInfinityVisualization
                      ? 'rapid-settled'
                      : 'progressive'
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
                  gameSpeed={gameSpeed}
                  facts={tinker.value}
                  storedTime={storedTime}
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
            <div className="dyson-facility-flow">
              <FacilityRegion
                onDetailsDemandChange={onFacilityDetailsDemandChange}
                locale={locale}
                visibility={visibility}
                facts={dyson.value.presentation.facilities}
                purchasePreviews={gameplay.previews.dyson.facilities}
                purchaseRouteAvailable={
                  gameplay.commands.byKind[
                    'dyson.purchase-facility'
                  ].routeAvailable
                }
                automationEnabledFacilities={
                  gameplay.progression.dyson.automation.enabledFacilities
                }
                automationUnlocked={
                  gameplay.progression.infinity.automationUnlocked.bots
                }
                gameSpeed={gameSpeed}
                revision={snapshot.revision}
                dispatchPlayer={dispatchPlayer}
              />
            </div>
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
            presetQuickActions={presetQuickActions}
            summary={(
              <div
                className={
                  route === 'bots' && botMultitasking && !discoveryUnlocked
                    ? 'dyson-info__summary dyson-info__summary--multitasking'
                    : 'dyson-info__summary dyson-info__summary--single-production'
                }
              >
                <DysonProductionSummary
                  gameSpeed={gameSpeed}
                  gameplay={gameplay}
                  locale={locale}
                />
                {route === 'bots' && botMultitasking && !discoveryUnlocked && (
                  <BotDistribution
                    locale={locale}
                    distribution={
                      gameplay.progression.dyson.botDistribution
                    }
                    multitasking
                    routeAvailable={false}
                    dispatchPlayer={dispatchPlayer}
                  />
                )}
              </div>
            )}
            statusSummary={(
              <>
                <DysonRunFacts
                  locale={locale}
                  metric={dyson.value.presentation.activePanelMetric}
                  panelLifetimeSeconds={
                    dyson.value.globals.panelLifetimeSeconds
                  }
                  totalPanelsDecayed={
                    gameplay.progression.dyson.totalPanelsDecayed
                  }
                />
              </>
            )}
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
      distribution={
        (route === 'bots' || researchActive) && !botMultitasking && !discoveryUnlocked
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
                  multitasking={
                    botMultitasking
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
    </>
  )
}

function readVisualizationPreference(): boolean {
  const preference = readPresentationPreference(SWARM_VISUALIZATION_STORAGE_KEY)
  return preference === null || preference === 'visible'
}

function useNewRouteHighlights(
  stored: StoredRouteHighlights | undefined,
  unlockedByRoute: Readonly<Record<HighlightableRoute, boolean>>,
  currentRoute: ReadyGameRoute,
  dispatchPlayer: (
    command: CanonicalPlayerCommand,
  ) => Promise<unknown>,
) {
  const derived = useMemo(() => {
    const baseline = stored ?? {
      knownRoutes: HIGHLIGHTABLE_ROUTES.filter((routeId) =>
        unlockedByRoute[routeId],
      ),
      unvisitedRoutes: [],
    }
    return reconcileStoredRouteHighlights(
      baseline,
      unlockedByRoute,
      currentRoute,
    )
  }, [currentRoute, stored, unlockedByRoute])

  useEffect(() => {
    if (
      stored !== undefined &&
      stored.knownRoutes.join('|') === derived.knownRoutes.join('|') &&
      stored.unvisitedRoutes.join('|') === derived.unvisitedRoutes.join('|')
    ) return
    void dispatchPlayer({
      kind: 'navigation.set-route-discovery',
      knownRoutes: derived.knownRoutes,
      unvisitedRoutes: derived.unvisitedRoutes,
    })
  }, [
    derived,
    dispatchPlayer,
    stored,
  ])

  const markVisited = useCallback((routeId: ReadyGameRoute) => {
    if (!isHighlightableRoute(routeId)) return
    if (!derived.unvisitedRoutes.includes(routeId)) return
    void dispatchPlayer({
      kind: 'navigation.set-route-discovery',
      knownRoutes: derived.knownRoutes,
      unvisitedRoutes: derived.unvisitedRoutes.filter(
        (id) => id !== routeId,
      ),
    })
  }, [derived, dispatchPlayer])

  return {
    newlyUnlockedRoutes: new Set(derived.unvisitedRoutes),
    markVisited,
  }
}

function writeVisualizationPreference(visible: boolean): void {
  writePresentationPreference(
    SWARM_VISUALIZATION_STORAGE_KEY,
    visible ? 'visible' : 'hidden',
  )
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

function unavailableDownloadSaveText(_text: string): Promise<boolean> {
  return Promise.resolve(false)
}

function unavailableReadSaveExport(): Promise<null> {
  return Promise.resolve(null)
}

function unavailableCopy(): Promise<void> {
  return Promise.resolve()
}

function createSkillPresetActions(
  runtime: BrowserUiRuntimeFoundation,
): SkillPresetActions {
  const actions: SkillPresetActions = {
    previewNonRefundableAssignment: (skillIds) => runtime.previewNonRefundableSkillAssignment(skillIds),
    previewProduction: (skillId, kind) => runtime.previewSkillProduction(skillId, kind),
    previewSelection: async (slot) =>
      runtime.previewSkillPresetSelection(slot),
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
      const preview = runtime.previewSkillPresetImport(text, slot)
      if (!preview.accepted) throw new Error(preview.reason)
      return {
        name: preview.payload.presetName,
        queuedSkillCount: preview.payload.skillIds.length,
        queuedSkillIds: preview.payload.skillIds,
        workerPercent: Math.round(
          (1 - preview.payload.botDistribution) * 100,
        ),
        colorId:
          preview.payload.colorId ??
          defaultSkillPresetColorId(slot),
        lockedQueuedSkillCount: preview.blockedSkillIds?.length ?? 0,
        retainedSkillIds: preview.retainedSkillIds,
        blockedByRetainedSkillIds:
          preview.blockedByRetainedSkillIds,
      }
    },
    importPreset: async (slot, serialized, retainedConflict) => {
      const result = await runtime.dispatchPlayer({
        kind: 'skill.import-preset',
        slot,
        serialized,
        ...(retainedConflict === undefined
          ? {}
          : {
              retainedConflictPolicy: {
                kind: 'confirmed' as const,
                retainedSkillIds: retainedConflict.retainedSkillIds,
                blockedSkillIds: retainedConflict.blockedSkillIds,
              },
            }),
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
