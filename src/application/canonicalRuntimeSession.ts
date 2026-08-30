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
  GameStateSession,
  GameStateSessionFactory,
} from './contracts'

export interface CanonicalRuntimeSkillPresetApplicationOutcome
  extends CanonicalSkillPresetApplicationOutcome {
  /** Stable within a runtime session, including across state clones. */
  readonly applicationSequence: number
}

export interface CanonicalRuntimeState extends CanonicalEventTimeState {
  readonly storedTimeCheater: boolean
  readonly selectedSkillPresetSlot: CanonicalSkillPresetSlot
  /** Last exact preset rebuild result for transient player feedback. */
  readonly lastSkillPresetApplication:
    | Readonly<CanonicalRuntimeSkillPresetApplicationOutcome>
    | null
  readonly debugOptionsEnabled?: boolean
  readonly debugEntitlementPurchased?: boolean
}

export interface CanonicalRuntimeSessionOptions {
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
  private readonly hydrated: HydratedGameStateV1

  constructor(
    prepared: PreparedSave,
    options: Readonly<CanonicalRuntimeSessionOptions>,
  ) {
    this.hydrated = hydrateGameState(prepared)
    const source = prepared.copyValidatedState()
    this.initialState = cloneCanonicalRuntimeState({
      gameState: this.hydrated.state,
      compatibilityTuning: this.hydrated.compatibilityTuning,
      evaluationSnapshot:
        this.hydrated.skillEffectEvaluationSnapshot,
      entitlements: options.entitlements,
      tinker: createCanonicalTinkerRuntimeState(),
      storedTimeCheater: extractStoredTimeCheater(source),
      selectedSkillPresetSlot:
        extractSelectedSkillPresetSlot(source),
      lastSkillPresetApplication: null,
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
    source.cheater = candidate.storedTimeCheater
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
