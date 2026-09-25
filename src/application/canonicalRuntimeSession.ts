import { completeRetiredResearchSecret } from '../simulation/avocadoMeditation'
import { createSpeedrunStatistics, migrateSpeedrunRecords, observeSpeedruns } from '../simulation/speedrunStatistics'
import { achievementIds } from '../achievements/ids'
import { evaluateAchievements, mergeAchievementFacts } from '../achievements/evaluate'
import type { DeepReadonly } from '../core/contracts'
import { requireRecord } from '../save/graph'
import type { PreparedSave } from '../save/prepare'
import { packSettingsFlags } from '../save/settingsFlags'
import type { DysonEntitlements } from '../simulation/canonicalDysonDerivation'
import {
  createCanonicalTinkerRuntimeState,
} from '../simulation/canonicalTinker'
import type { CanonicalEventTimeState } from '../simulation/canonicalEventTimeModel'
import {
  hydrateGameState,
  type HydratedGameStateV1,
} from '../game-state/mapping'
import {
  withDysonSkillEffectEvaluationSnapshot,
} from '../game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalSkillPresetApplicationOutcome,
  CanonicalSkillPresetSlot,
} from './canonicalGameCommands'
import type {
  AutomaticDreamDisasterCause,
  SimulationEra,
} from '../simulation/types'
import type {
  GameStateSession,
  GameStateSessionFactory,
} from './contracts'

export interface CanonicalRuntimeSkillPresetApplicationOutcome
  extends CanonicalSkillPresetApplicationOutcome {
  /** Stable within a runtime session, including across state clones. */
  readonly applicationSequence: number
}

export type CanonicalRuntimePresentationEvent =
  | {
      readonly kind: 'skill-preset-conflict'
      readonly sequence: number
      readonly presetName: string
      readonly application: Readonly<CanonicalRuntimeSkillPresetApplicationOutcome>
    }
  | {
      readonly kind: 'automatic-dream-disaster'
      readonly sequence: number
      readonly cause: AutomaticDreamDisasterCause
      readonly strangeMatterGranted: number
      readonly resetCount: bigint
      readonly firstLifetimeOccurrence: boolean
      readonly preResetEra: SimulationEra
    }

export interface CanonicalRuntimeState extends CanonicalEventTimeState {
  readonly storedTimeCheater: boolean
  /** Loaded checkpoint baseline, pending the first successful startup replay. */
  readonly coldStartCheckpointAtUtc?: string | null
  readonly selectedSkillPresetSlot: CanonicalSkillPresetSlot
  /** Last exact preset rebuild result for transient player feedback. */
  readonly lastSkillPresetApplication:
    | Readonly<CanonicalRuntimeSkillPresetApplicationOutcome>
    | null
  /** Sequenced session facts retained across ordinary snapshot publication. */
  readonly presentationEvents: readonly Readonly<CanonicalRuntimePresentationEvent>[]
  readonly unlockAllTabs?: boolean
  readonly debugOptionsEnabled?: boolean
  readonly debugEntitlementPurchased?: boolean
}

export interface CanonicalRuntimeSessionOptions {
  readonly nowUtcMilliseconds?: () => number
  readonly captureAchievements?: boolean
  readonly persistAchievements?: boolean
  readonly entitlements: Readonly<DysonEntitlements>
}

/**
 * Binds one prepared Unity graph to its canonical runtime carriers.
 *
 * Compatibility tuning and the evaluation snapshot are extracted anew for
 * every opened/imported save. Tinker is intentionally reset because Unity
 * does not persist its running coroutine.
 */
export class CanonicalRuntimeSession
  implements GameStateSession<CanonicalRuntimeState>
{
  readonly initialState: CanonicalRuntimeState
  private readonly persistAchievements: boolean
  private readonly hydrated: HydratedGameStateV1
  private readonly nowUtcMilliseconds: (() => number) | undefined

  constructor(
    prepared: PreparedSave,
    options: Readonly<CanonicalRuntimeSessionOptions>,
  ) {
    this.persistAchievements = options.persistAchievements === true
    this.nowUtcMilliseconds = options.nowUtcMilliseconds
    this.hydrated = hydrateGameState(prepared)
    const source = prepared.copyValidatedState()
    this.initialState = cloneCanonicalRuntimeState({
      ...(options.captureAchievements ? {achievementEvidence:{unlocked: this.persistAchievements ? readSavedAchievements(source.idsAchievementEvidence) : [],statistics:{},presence:''}} : {}),
      gameState: completeRetiredResearchSecret(this.hydrated.state.statistics.speedruns ? { ...this.hydrated.state, statistics: { ...this.hydrated.state.statistics, speedruns: migrateSpeedrunRecords(this.hydrated.state.statistics.speedruns) } } : observeSpeedruns({
        ...this.hydrated.state,
        statistics: { ...this.hydrated.state.statistics,
          speedruns: createSpeedrunStatistics(this.hydrated.state.meta.createdAtLegacyText, false) },
      }, Date.now(), true)),
      compatibilityTuning: this.hydrated.compatibilityTuning,
      evaluationSnapshot:
        this.hydrated.skillEffectEvaluationSnapshot,
      entitlements: options.entitlements,
      tinker: createCanonicalTinkerRuntimeState(),
      storedTimeCheater: extractStoredTimeCheater(source),
      ...(
        typeof source.idsLastActiveAtUtc === 'string' &&
        Number.isFinite(Date.parse(source.idsLastActiveAtUtc))
          ? { coldStartCheckpointAtUtc: source.idsLastActiveAtUtc } : {}
      ),
      selectedSkillPresetSlot:
        extractSelectedSkillPresetSlot(source),
      lastSkillPresetApplication: null,
      presentationEvents: [],
      unlockAllTabs: extractBoolean(source, 'debugOptions') &&
        extractBoolean(source, 'unlockAllTabs'),
      debugOptionsEnabled: extractBoolean(source, 'debugOptions'),
      debugEntitlementPurchased: extractBoolean(
        source,
        'debugEverEnabled',
      ),
    })
  }

  prepare(
    state:
      | CanonicalRuntimeState
      | DeepReadonly<CanonicalRuntimeState>,
  ): PreparedSave {
    const candidate = cloneCanonicalRuntimeState(
      state as CanonicalRuntimeState,
    )
    let prepared = this.hydrated.prepare(candidate.gameState)
    prepared = withDysonSkillEffectEvaluationSnapshot(
      prepared,
      candidate.evaluationSnapshot,
    )
    const source = prepared.copyValidatedState()
    if (this.persistAchievements) {
      const facts = mergeAchievementFacts(candidate.achievementEvidence, evaluateAchievements(candidate.gameState, false))
      source.idsAchievementEvidence = readSavedAchievements(facts.unlocked)
    }
    source.cheater = candidate.storedTimeCheater
    source.unlockAllTabs = candidate.unlockAllTabs === true
    source.debugOptions = candidate.debugOptionsEnabled
    source.debugEverEnabled = candidate.debugEntitlementPurchased
    packSettingsFlags(source)
    const dyson = requireRecord(
      source.dysonVerseSaveData,
      'Dyson save',
    )
    dyson.selectedPreset = candidate.selectedSkillPresetSlot
    return prepared.withValidatedState(source)
  }

  prepareForPersistence(
    state: CanonicalRuntimeState | DeepReadonly<CanonicalRuntimeState>,
  ): PreparedSave {
    const prepared = this.prepare(state)
    if (this.nowUtcMilliseconds === undefined) return prepared
    const source = prepared.copyValidatedState()
    // Retain an unconsumed startup baseline if replay failed. After successful
    // replay, the credited bank and fresh baseline commit in the same save.
    source.idsLastActiveAtUtc = state.coldStartCheckpointAtUtc
      ?? new Date(this.nowUtcMilliseconds()).toISOString()
    if (state.coldStartCheckpointAtUtc != null) {
      // A failed startup replay must also survive a subsequent departure
      // marker, whose newer time must not hide the still-uncredited interval.
      source.dateQuitString = state.coldStartCheckpointAtUtc
    }
    return prepared.withValidatedState(source)
  }
}

function extractBoolean(
  source: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  const value = source[key]
  return typeof value === 'boolean' ? value : false
}

export function createCanonicalRuntimeSessionFactory(
  options: Readonly<CanonicalRuntimeSessionOptions>,
): GameStateSessionFactory<CanonicalRuntimeState> {
  const captured = Object.freeze({
    nowUtcMilliseconds: options.nowUtcMilliseconds,
    captureAchievements: options.captureAchievements,
    persistAchievements: options.persistAchievements,
    entitlements: Object.freeze({ ...options.entitlements }),
  })
  return Object.freeze({
    open: (prepared: PreparedSave) =>
      new CanonicalRuntimeSession(prepared, captured),
  })
}

export function cloneCanonicalRuntimeState(
  state: Readonly<CanonicalRuntimeState>,
): CanonicalRuntimeState {
  return structuredClone(state)
}

function extractStoredTimeCheater(
  source: Readonly<Record<string, unknown>>,
): boolean {
  if (typeof source.cheater !== 'boolean') {
    throw new Error("Unity's stored-time cheater field must be boolean.")
  }
  return source.cheater
}

function extractSelectedSkillPresetSlot(
  source: Readonly<Record<string, unknown>>,
): CanonicalSkillPresetSlot {
  const dyson = requireRecord(
    source.dysonVerseSaveData,
    'Dyson save',
  )
  const value = dyson.selectedPreset
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new Error(
      "Unity's selected skill preset must be an integer from 1 through 5.",
    )
  }
  return value as CanonicalSkillPresetSlot
}

/** Optional bounded evidence. Invalid metadata must never prevent loading a save. */
function readSavedAchievements(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(achievementIds)
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && allowed.has(id)))].sort()
}
