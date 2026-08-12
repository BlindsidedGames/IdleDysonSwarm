import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import {
  adoptPreparedCanonicalRuntimePublicationV2,
  createCanonicalRuntimePublicationV2,
  registerCanonicalRuntimeApplicationAuthorityV2,
  stageCanonicalRuntimeAdvanceV2,
  type CanonicalRuntimePublicationV2,
} from '../application/canonicalRuntimeSessionV2'
import { Stage7V2BrowserIndexedDbStorage } from '../certification/stage7V2/browserIndexedDbStorage'
import { Stage7V2CertificationRepository } from '../certification/stage7V2/repository'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { encodeSchema13WebSave } from '../save/schema13'
import { CANONICAL_V2_NO_DORMANT_DUE_EVENTS } from '../simulation/canonicalEventTimeModelV2'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import {
  commitV2DysonFacilityPurchase,
  quoteV2DysonFacilityPurchase,
} from '../simulation/dysonV2Commands'
import { formatGameNumber } from '../ui/i18n/formatters'
import '../index.css'
import './v2Inspection.css'

const BUILD_SCOPE = 'stage8-local-inspection-v1'
const PLATFORM = Object.freeze({
  debugOptions: false,
  debugEverEnabled: false,
  cheater: false,
  unlockAllTabs: false,
})
const INFINITY_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)
const RUNTIME_APPLICATION_AUTHORITY =
  registerCanonicalRuntimeApplicationAuthorityV2()

type Status = 'loading' | 'ready' | 'working' | 'failed'
type Timing = Readonly<{
  label: string
  operationMilliseconds: number
  checkpointMilliseconds: number
  readbackMilliseconds: number
  totalMilliseconds: number
}>

function V2InspectionApp() {
  const repositoryRef = useRef<Stage7V2CertificationRepository | null>(null)
  const publicationRef = useRef<Readonly<CanonicalRuntimePublicationV2> | null>(null)
  const [publication, setPublication] = useState<Readonly<CanonicalRuntimePublicationV2> | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Opening the isolated schema13 inspection save...')
  const [timing, setTiming] = useState<Timing | null>(null)

  useEffect(() => {
    let active = true
    void openInspectionRepository().then(({ repository, publication }) => {
      if (!active) return
      repositoryRef.current = repository
      publicationRef.current = publication
      setPublication(publication)
      setStatus('ready')
      setMessage('Schema13 checkpoint opened and read back successfully.')
    }).catch((error: unknown) => {
      if (!active) return
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : String(error))
    })
    return () => { active = false }
  }, [])

  const run = async (
    label: string,
    operation: (source: Readonly<CanonicalRuntimePublicationV2>) => Promise<Readonly<CanonicalRuntimePublicationV2>>,
  ): Promise<void> => {
    const source = publicationRef.current
    const repository = repositoryRef.current
    if (source === null || repository === null || status === 'working') return
    setStatus('working')
    setMessage(`${label}...`)
    try {
      const started = performance.now()
      const candidate = await operation(source)
      const operated = performance.now()
      await checkpoint(repository, candidate)
      const checkpointed = performance.now()
      const readBack = await repository.loadCurrent()
      const readBackAt = performance.now()
      if (readBack === null || readBack.revision !== candidate.revision) {
        throw new Error('The schema13 checkpoint readback did not match the candidate revision.')
      }
      const admitted = createCanonicalRuntimePublicationV2(Object.freeze({
        revision: readBack.revision,
        state: readBack.save.state,
        runtime: readBack.save.runtime,
      }))
      publicationRef.current = admitted
      setPublication(admitted)
      setStatus('ready')
      setTiming(Object.freeze({
        label,
        operationMilliseconds: operated - started,
        checkpointMilliseconds: checkpointed - operated,
        readbackMilliseconds: readBackAt - checkpointed,
        totalMilliseconds: readBackAt - started,
      }))
      setMessage(`${label} completed; schema13 revision ${admitted.revision} was read back.`)
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const portableSave = useMemo(() => publication === null ? '' :
    encodeSchema13WebSave(Object.freeze({
      savedAtUtc: new Date().toISOString(),
      state: publication.state,
      runtime: publication.runtime,
    })), [publication])

  if (publication === null) {
    return <main className="v2-inspection"><h1>V2 local inspection</h1><p role="status">{message}</p></main>
  }

  const state = publication.state
  const resources = [
    ['Money', state.dyson.money],
    ['Science', state.dyson.science],
    ['Bots', state.dyson.bots],
    ['Workers', state.dyson.workers],
    ['Researchers', state.dyson.researchers],
    ['Infinity Points', state.infinity.availablePoints],
    ['Influence', state.reality.influence],
    ['Strange Matter', state.dream.strangeMatter],
    ['Available Quantum Shards', state.quantum.availableShards],
    ['Lifetime Quantum Shards', state.quantum.lifetimeEarnedShards],
  ] as const

  return (
    <main className="v2-inspection">
      <header>
        <h1>V2 local inspection</h1>
        <p>This page is isolated from the normal schema12 save. It exercises the real V2 numeric model and schema13 codec locally.</p>
      </header>

      <section className="v2-inspection__status" aria-label="Inspection status">
        <strong>Revision {publication.revision}</strong>
        <span>Model V{state.modelVersion} / schema13</span>
        <p role="status">{message}</p>
        {timing === null ? null : (
          <output className="v2-inspection__timing" aria-label="Last operation timing">
            {timing.label}: operation {timing.operationMilliseconds.toFixed(2)} ms; checkpoint {timing.checkpointMilliseconds.toFixed(2)} ms; readback {timing.readbackMilliseconds.toFixed(2)} ms; total {timing.totalMilliseconds.toFixed(2)} ms
          </output>
        )}
      </section>

      <section>
        <h2>Canonical resources</h2>
        <div className="v2-inspection__grid">
          {resources.map(([label, value]) => (
            <article key={label}>
              <h3>{label}</h3>
              <strong>{formatGameNumber('en', value)}</strong>
              <code>{gameDecimalToCanonicalString(value)}</code>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Safe local checks</h2>
        <div className="v2-inspection__actions">
          <button disabled={status === 'working'} onClick={() => void run('Advancing one active second', advanceOneSecond)}>Advance 1 second</button>
          <button disabled={status === 'working'} onClick={() => void run('Applying the 1e1000 inspection fixture', applyHugeFixture)}>Set inspection values to 1e1000</button>
          <button disabled={status === 'working'} onClick={() => void run('Purchasing one Assembly Line through the V2 quote/commit authority', purchaseAssemblyLine)}>Buy 1 Assembly Line</button>
          <button disabled={status === 'working'} onClick={() => void run('Re-reading the current schema13 checkpoint', async () => publicationRef.current!)}>Save and read back</button>
          <button disabled={status === 'working'} onClick={() => location.reload()}>Reload page</button>
          <button disabled={status === 'working'} onClick={() => {
            const repository = repositoryRef.current
            if (repository === null) return
            setStatus('working')
            setMessage('Resetting only the isolated inspection save...')
            void repository.cleanup().then(() => location.reload()).catch((error: unknown) => {
              setStatus('failed')
              setMessage(error instanceof Error ? error.message : String(error))
            })
          }}>Reset isolated inspection save</button>
        </div>
        <p>Owned Assembly Lines: {formatGameNumber('en', state.dyson.facilities.assembly_lines[1])}</p>
      </section>

      <details>
        <summary>Portable schema13 evidence</summary>
        <textarea readOnly value={portableSave} aria-label="Portable schema13 save" />
      </details>
    </main>
  )
}

async function openInspectionRepository(): Promise<Readonly<{
  repository: Stage7V2CertificationRepository
  publication: Readonly<CanonicalRuntimePublicationV2>
}>> {
  const repository = new Stage7V2CertificationRepository({
    buildScope: BUILD_SCOPE,
    storage: new Stage7V2BrowserIndexedDbStorage(BUILD_SCOPE),
  })
  let current = await repository.recoverNewestValid()
  if (current === null) {
    const migrated = migratePreparedSaveToV2(
      createDeterministicUnityFirstRunPreparedSave(),
      Object.freeze({ kind: 'trusted-same-device' }),
    )
    const initial = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 0,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    await checkpoint(repository, initial)
    current = await repository.recoverNewestValid()
  }
  if (current === null) throw new Error('The isolated schema13 save could not be opened.')
  return Object.freeze({
    repository,
    publication: createCanonicalRuntimePublicationV2(Object.freeze({
      revision: current.revision,
      state: current.save.state,
      runtime: current.save.runtime,
    })),
  })
}

async function checkpoint(
  repository: Stage7V2CertificationRepository,
  publication: Readonly<CanonicalRuntimePublicationV2>,
): Promise<void> {
  await repository.checkpoint(Object.freeze({
    savedAtUtc: new Date().toISOString(),
    state: publication.state,
    runtime: publication.runtime,
  }), PLATFORM, publication.revision)
}

async function advanceOneSecond(
  source: Readonly<CanonicalRuntimePublicationV2>,
): Promise<Readonly<CanonicalRuntimePublicationV2>> {
  const result = await stageCanonicalRuntimeAdvanceV2(source, Object.freeze({
    expectedRevision: source.revision,
    durationSeconds: 1,
    mode: 'active' as const,
    context: Object.freeze({
      automationIntervalSeconds: 0.1,
      timerAggregationAuthority: null,
      quantumEpochAuthority: null,
      dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
      catalogLookup: null,
      infinityRewardAuthority: INFINITY_AUTHORITY,
    }),
    cancelRequested: null,
  }))
  if (!result.changed) throw new Error(`V2 active advance ended as ${result.status}: ${result.diagnosticCode ?? 'no diagnostic'}`)
  return result.candidate
}

async function applyHugeFixture(
  source: Readonly<CanonicalRuntimePublicationV2>,
): Promise<Readonly<CanonicalRuntimePublicationV2>> {
  const huge = gameDecimalFromCanonicalString('1e1000')
  const one = gameDecimalFromCanonicalString('1e0')
  const state = cloneCanonicalGameStateV2(Object.freeze({
    ...source.state,
    dyson: Object.freeze({
      ...source.state.dyson,
      money: huge,
      science: huge,
      bots: one,
      workers: one,
      researchers: one,
    }),
    infinity: Object.freeze({ ...source.state.infinity, availablePoints: huge }),
    reality: Object.freeze({ ...source.state.reality, influence: huge }),
    dream: Object.freeze({ ...source.state.dream, strangeMatter: huge }),
    quantum: Object.freeze({
      ...source.state.quantum,
      availableShards: huge,
      lifetimeEarnedShards: huge,
    }),
  }))
  return publicationWithDerivedRuntime(source.revision + 1, state, source)
}

async function purchaseAssemblyLine(
  source: Readonly<CanonicalRuntimePublicationV2>,
): Promise<Readonly<CanonicalRuntimePublicationV2>> {
  const quote = quoteV2DysonFacilityPurchase(
    source.state,
    source.revision,
    'assembly_lines',
    'buy-1',
    false,
  )
  const result = commitV2DysonFacilityPurchase(quote, source.state, source.revision)
  if (!result.accepted || !result.changed) throw new Error(`V2 purchase was rejected: ${result.status}`)
  return publicationWithDerivedRuntime(result.revision, result.state, source)
}

function publicationWithDerivedRuntime(
  revision: number,
  state: Parameters<typeof cloneCanonicalGameStateV2>[0],
  source: Readonly<CanonicalRuntimePublicationV2>,
): Readonly<CanonicalRuntimePublicationV2> {
  const derived = deriveDysonV2FromCauses(state, source.runtime)
  const runtime = Object.freeze({
    dysonEvaluationSnapshot: derived.nextEvaluationSnapshot,
    dysonTuningProfile: source.runtime.dysonTuningProfile,
  })
  return adoptPreparedCanonicalRuntimePublicationV2(
    RUNTIME_APPLICATION_AUTHORITY,
    source,
    Object.freeze({ revision, state, runtime }),
  )
}

const root = document.getElementById('root')
if (root !== null) {
  const roots = globalThis as typeof globalThis & {
    __idleDysonV2InspectionRoot?: ReturnType<typeof createRoot>
  }
  const reactRoot = roots.__idleDysonV2InspectionRoot ?? createRoot(root)
  roots.__idleDysonV2InspectionRoot = reactRoot
  reactRoot.render(<StrictMode><V2InspectionApp /></StrictMode>)
}
