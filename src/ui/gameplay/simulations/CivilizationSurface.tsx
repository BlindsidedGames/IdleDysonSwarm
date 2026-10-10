import { FarmingSurface } from './FarmingSurface'
import { farmingMessages } from './farmingMessages'
import { CIVILIZATION_FOCUS_TUNING } from '../../../simulation/civilizationTuning'
import { useEffect, useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { FrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { formatGameDuration, formatWholeGameNumber } from '../../i18n/formatters'
import { Button, Progress, ProgressControlsPanel, InlineResourceAmount } from '../../components'
import { CIVILIZATION_ACTIVITIES, CIVILIZATION_RESOURCES, CIVILIZATION_SECTIONS, CIVILIZATION_FOCUSES, EMPTY_CIVILIZATION, allocateCivilizationWorkers, civilizationActivityUnlocked, civilizationSpeed, civilizationJobWaiting, civilizationHousing, civilizationActivityInputs, civilizationCycle, nextCivilizationCatalyst, civilizationMilestoneProgress, civilizationOpeningComplete, type CivilizationResource, type CivilizationRecipe, type CivilizationActivityId } from '../../../simulation/civilization'
import { realTimeDuration, realTimeRate } from '../effectiveSpeed'
import { readyDysonMessages } from '../dyson/messages'
import { CivilizationSymbol } from './CivilizationSymbol'
import { foragerEraPresentation } from './civilizationEraPresentation'
import { civilizationMessages as m } from './civilizationMessages'
import { CivilizationCycleProgress } from './CivilizationCycleProgress'
import '../rework/rework.css'
import './simulations.css'
import './civilization.css'

type Dispatch = (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>
export function CivilizationSurface({ gameplay, locale, gameSpeed, dispatchPlayer, activeEraId = 'forager' }: { activeEraId?: string; gameplay: DeepReadonly<FrontendGameplaySnapshot>; locale: EnabledLocale; gameSpeed: number; dispatchPlayer: Dispatch }) {
 return gameplay.progression.civilization?.farming ? <FarmingSurface gameplay={gameplay} locale={locale} gameSpeed={gameSpeed} dispatchPlayer={dispatchPlayer}/> : <ForagerSurface gameplay={gameplay} locale={locale} gameSpeed={gameSpeed} dispatchPlayer={dispatchPlayer} activeEraId={activeEraId}/>
}
export function ForagerSurface({ gameplay, locale, gameSpeed, dispatchPlayer, activeEraId = 'forager' }: { activeEraId?: string; gameplay: DeepReadonly<FrontendGameplaySnapshot>; locale: EnabledLocale; gameSpeed: number; dispatchPlayer: Dispatch }) {
  const intl = useIntl()
  const initial = { ...EMPTY_CIVILIZATION, unlocked: true }
  const initialCrews = allocateCivilizationWorkers(initial)
  const state = gameplay.progression.civilization ?? { ...initial, activities: Object.fromEntries(Object.entries(initial.activities).map(([id, job]) => [id, { ...job, workers: initialCrews[id] }])) }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsId = useId()
  const fractures = gameplay.progression.challenges?.galvanizedSkillIds?.length ?? 0
  const number = (value: bigint | number) => formatWholeGameNumber(locale, value)
  const duration = (seconds: number) => formatGameDuration(locale, realTimeDuration(seconds, gameSpeed), { maximumFractionDigits: 1 })
  const recipe = (items: CivilizationRecipe) => intl.formatList(Object.entries(items).map(([id, value]) => intl.formatMessage(m.amount, { value: number(value!), resource: intl.formatMessage(m[id as CivilizationResource]) })), { type: 'conjunction' })
  const requirements = (items: Readonly<Record<string, bigint>>) => intl.formatList(Object.entries(items).map(([id, target]) => intl.formatMessage(m.milestoneStep, { name: intl.formatMessage(m[id as CivilizationActivityId]), value: number(state.activities[id].completions), target: number(target) })))
  const [pending, setPending] = useState(false), [failed, setFailed] = useState(false)
  const focusToRestore = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!pending && focusToRestore.current) {
      focusToRestore.current.focus()
      focusToRestore.current = null
    }
  }, [pending])
  const busy = useRef(false)
  const action = async (command: CanonicalPlayerCommand) => {
    if (busy.current) return
    busy.current = true; setPending(true); setFailed(false)
    try { const result = await dispatchPlayer(command); if (result.status !== 'accepted') setFailed(true) }
    catch { setFailed(true) } finally { busy.current = false; setPending(false) }
  }
  const milestone = nextCivilizationCatalyst(state), goal = milestone ? civilizationMilestoneProgress(state, milestone) : null
  const iconAmount = (id: CivilizationResource | 'worker' | 'catalyst', amount: bigint, affordable = true) => {
    const label = intl.formatMessage(m.amount, { resource: intl.formatMessage(id === 'worker' ? m.workers : id === 'catalyst' ? m.catalysts : m[id]), value: number(amount) })
    return <span className="civilization-icon-amount" role="img" aria-label={label} title={label} data-affordable={affordable}><InlineResourceAmount leadingSymbol={<CivilizationSymbol resource={id} />} value={number(amount)} /></span>
  }
  const balance = (id: CivilizationResource) => <div key={id} title={intl.formatMessage(m[id])}><dt><span className="ui-visually-hidden">{intl.formatMessage(m[id])}</span><CivilizationSymbol resource={id} /></dt><dd>{number(state.resources[id])}</dd></div>
  const focusLabels = { balanced: m.balanced, provisioning: m.suppliesFocus, settlement: m.growthFocus, craft: m.craft, expeditions: m.tradeFocus }
  const jobs = (ids: CivilizationActivityId[]) => intl.formatList(ids.map(id => intl.formatMessage(m[id])), { type: 'conjunction' })
  const focusRates = { selectedRate: number(CIVILIZATION_FOCUS_TUNING.selectedRate), supportRate: number(CIVILIZATION_FOCUS_TUNING.supportRate) }
  const focusHelp = state.focus === 'balanced' ? intl.formatMessage(m.focusBalancedHelp)
    : state.focus === 'provisioning' ? intl.formatMessage(m.focusSelectedHelp, { ...focusRates, primary: jobs(['gathering', 'hunting']) })
    : state.focus === 'settlement' ? intl.formatMessage(m.focusSupportedHelp, { ...focusRates, primary: jobs(['shelterBuilding', 'campExpansion']), support: jobs(['gathering', 'hunting', 'toolmaking']) })
    : intl.formatMessage(m.focusSupportedHelp, { ...focusRates, primary: jobs(['foodPreservation', 'seasonalExpeditions', 'exchangeNetworks']), support: jobs(['hunting', 'hideworking']) })
  const focusControls = (<div className="civilization-focus">
      <div className="civilization-focus-heading"><span data-total-workers>{iconAmount('worker',state.workers)}</span></div>
      <div className="civilization-focus-options" role="radiogroup" aria-label={intl.formatMessage(m.focus)}>{CIVILIZATION_FOCUSES.map((focus, index) => <button
        key={focus} type="button" role="radio" data-focus={focus} aria-checked={state.focus === focus} tabIndex={state.focus === focus ? 0 : -1} disabled={pending}
        onClick={event => {
          if (state.focus !== focus) {
            if (document.activeElement === event.currentTarget) focusToRestore.current = event.currentTarget
            void action({ kind: 'civilization.set-focus', focus })
          }
        }}
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || pending) return
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? CIVILIZATION_FOCUSES.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + CIVILIZATION_FOCUSES.length) % CIVILIZATION_FOCUSES.length
          const selected = CIVILIZATION_FOCUSES[next]
          const nextButton = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-focus="${selected}"]`)
          if (state.focus !== selected) {
            if (nextButton) focusToRestore.current = nextButton
            void action({ kind: 'civilization.set-focus', focus: selected })
          }
          nextButton?.focus()
        }}>{intl.formatMessage(focusLabels[focus])}</button>)}</div>
    </div>)
  const eraView = foragerEraPresentation(state, activeEraId)
  if (eraView.kind === 'generator') return <article className="civilization-retained-generator" data-feeds-era={eraView.feedsEraId} aria-label={intl.formatMessage(m.foragerGenerator)}><header><strong>{intl.formatMessage(m.foragerGenerator)}</strong>{iconAmount('worker',eraView.source.workers)}</header><dl className="civilization-balances">{CIVILIZATION_RESOURCES.map(balance)}</dl></article>
  return <section className="simulations-surface civilization-surface" data-era="information" aria-label={intl.formatMessage(m.era)}><div className="civilization-era-header">
    <header className="civilization-heading"><h2>{intl.formatMessage(m.era)}</h2><strong className="civilization-fracture">{intl.formatMessage(m.fractures, { value: intl.formatNumber(fractures * 0.05, { style: 'percent', maximumFractionDigits: 0 }) })}</strong></header>
  </div><div className="civilization-scroll">
    <details className="civilization-stock" aria-label={intl.formatMessage(readyDysonMessages.resources)}><summary><dl className="civilization-balances">{(['food','materials','tools'] as const).map(balance)}</dl><span className="civilization-chevron" aria-hidden="true">›</span></summary><dl className="civilization-resource-legend">{([...CIVILIZATION_RESOURCES, 'worker'] as const).map(id => <div key={id}><dt><CivilizationSymbol resource={id} /><span>{intl.formatMessage(id === 'worker' ? m.workers : m[id])}</span></dt><dd>{number(id === 'worker' ? state.workers : state.resources[id])}</dd></div>)}</dl></details>

    <div className="civilization-paths">{CIVILIZATION_SECTIONS.filter(section => CIVILIZATION_ACTIVITIES.some((a, index) => a.section === section && civilizationActivityUnlocked(state, index))).map(section => <section className="civilization-path" key={section}><h3>{intl.formatMessage(m[section])}</h3><ol className="civilization-activities">{CIVILIZATION_ACTIVITIES.map((definition, index) => {
      if (definition.section !== section) return null
      const unlocked = civilizationActivityUnlocked(state, index), job = state.activities[definition.id], cycle = civilizationCycle(state,index)
      if (!unlocked) return null
      const speed = civilizationSpeed(state,index,fractures), waiting = civilizationJobWaiting(state,index)
      const status = waiting.reason === 'demand' ? intl.formatMessage(m.waitingDemand) : waiting.reason === 'workers' ? intl.formatMessage(m.waitingWorkers) : waiting.reason === 'housing' ? intl.formatMessage(m.waitingHousing) : waiting.reason === 'range' ? intl.formatMessage(m.waitingRange) : waiting.reason === 'inputs' ? intl.formatMessage(m.waitingInputs, { name: intl.formatList(waiting.missing.map(id => intl.formatMessage(m[id]))) }) : duration((cycle.seconds-job.progress)/speed)
      return <li key={definition.id}><article className="civilization-activity" data-activity-id={definition.id} data-status={waiting.reason}><details className="civilization-job"><summary>
        <div className="civilization-job-header"><div className="civilization-job-title"><strong>{intl.formatMessage(m[definition.id])}</strong>{iconAmount('worker',job.workers)}</div>
        <div className="civilization-job-recipe">
          <span className="civilization-start-cost" role="group" aria-label={intl.formatMessage(m.inputs)} data-reserved={job.active}>{Object.entries(civilizationActivityInputs(state,index)).map(([id, amount]) => <span key={id}>{iconAmount(id as CivilizationResource,amount!,job.active || state.resources[id as CivilizationResource] >= amount!)}</span>)}</span>
          {Object.keys(civilizationActivityInputs(state,index)).length > 0 && <span className="civilization-recipe-arrow" aria-hidden="true">▶</span>}
          <span className="civilization-output" role="group" aria-label={intl.formatMessage(m.outputs)}>{<>{Object.entries(cycle.outputs).map(([id,amount]) => <span key={id}>{iconAmount(id as CivilizationResource,amount!)}</span>)}{cycle.populationDelta > 0n && iconAmount('worker',cycle.populationDelta)}</>}</span>
        </div></div>
        <CivilizationCycleProgress label={intl.formatMessage(m[definition.id])} value={job.progress} maximum={cycle.seconds} valueText={status} timerText={waiting.reason === 'running' ? status : '∞'} sampleSeconds={state.elapsedSeconds} cycleKey={`${definition.id}:${job.completions}`} gameSpeed={gameSpeed} active={job.active && waiting.reason === 'running'} cycleRate={realTimeRate(speed / cycle.seconds, gameSpeed)} locale={locale} />
        <span className="civilization-chevron" aria-hidden="true">›</span></summary><div className="civilization-activity-details"><dl className="civilization-facts civilization-recipe"><div><dt>{intl.formatMessage(m.inputs)}</dt><dd>{recipe(civilizationActivityInputs(state,index)) || '—'}</dd></div><div><dt>{intl.formatMessage(m.outputs)}</dt><dd>{[recipe(cycle.outputs), cycle.populationDelta > 0n ? intl.formatMessage(m.amount, { value: number(cycle.populationDelta), resource: intl.formatMessage(m.workers) }) : ''].filter(Boolean).join(', ')}</dd></div></dl><dl className="civilization-facts"><div><dt>{intl.formatMessage(m.workers)}</dt><dd>{number(job.workers)}</dd></div><div><dt>{intl.formatMessage(m.completed)}</dt><dd>{number(job.completions)}</dd></div><div><dt>{intl.formatMessage(m.duration)}</dt><dd>{duration(cycle.seconds/(speed||1))}</dd></div></dl>{waiting.reason !== 'running' && <p>{status}</p>}{job.active && <p>{intl.formatMessage(m.paid)}</p>}{index === 0 && <p>{intl.formatMessage(m.bootstrapV4)}</p>}{definition.id === 'campProvisioning' && <p>{intl.formatMessage(m.recruitment)}</p>}{definition.id === 'campExpansion' && <p>{intl.formatMessage(m.conversionV4)}</p>}</div></details></article></li>
    })}</ol></section>)}</div>
    {civilizationOpeningComplete(state) && <section className="civilization-preview"><h3>{intl.formatMessage(m.phaseComplete)}</h3><p>{intl.formatMessage(farmingMessages.handoff)}</p><Button fullWidth disabled={pending} onClick={()=>void action({kind:'civilization.enter-farming'})}>{intl.formatMessage(farmingMessages.begin)}</Button></section>}
  </div>
    <footer className="simulations-surface__footer civilization-dock">
      <ProgressControlsPanel
        ariaLabel={intl.formatMessage(m.catalysts)} className="civilization-control-panel ui-progress-controls-panel--production-summary"
        expanded={settingsOpen} controlsId={settingsId} settingsLabel={intl.formatMessage(m.eraSettings)} onExpandedChange={setSettingsOpen}
        aboveSummary={<>{focusControls}{failed && <p role="alert">{intl.formatMessage(m.failed)}</p>}</>}
        summary={<div className="civilization-catalyst-summary">
          <Progress label={<span className="civilization-goal-label"><CivilizationSymbol resource="catalyst" />{intl.formatMessage(m.nextCatalyst)}</span>} value={goal!.progress} valueText={`${goal!.complete ? 100 : Math.floor(goal!.progress * 100)}%`} />
        </div>}
      >
    <div className="civilization-camp-details" data-focus-description><p>{focusHelp}</p><p>{intl.formatMessage(m.focusEffectV4)}</p>{Object.values(state.activities).some(job => job.legacyCycle || job.cycleReceipt?.legacyWorkMultiplier === 1) && <p>{intl.formatMessage(m.legacyWorkHelp)}</p>}</div>
    <details className="civilization-workforce civilization-distribution" aria-label={intl.formatMessage(m.allocated)}>
      <summary><div className="civilization-allocation-heading"><strong>{intl.formatMessage(m.allocated)}</strong><span className="civilization-allocation-total" data-total-workers>{number(state.workers)}</span><span className="civilization-chevron" aria-hidden="true">›</span></div><dl className="civilization-balances">{CIVILIZATION_SECTIONS.map(section => <div key={section} data-workforce-section={section}><dt>{intl.formatMessage(m[section])}</dt><dd>{number(CIVILIZATION_ACTIVITIES.filter(a => a.section === section).reduce((sum, a) => sum + state.activities[a.id].workers, 0n))}</dd></div>)}</dl></summary>
      <div className="civilization-camp-details">
        <dl className="civilization-facts"><div><dt>{intl.formatMessage(m.housing)}</dt><dd>{number(civilizationHousing(state))}</dd></div><div><dt>{intl.formatMessage(m.equipped)}</dt><dd>{number(state.equippedWorkers)} / {number(state.workers)}</dd></div></dl>
        {state.activities.hideworking.completions > 0n && <div className="civilization-equipment"><p>{intl.formatMessage(m.equipmentEffectV4)}</p><p>{intl.formatMessage(m.equipmentAutomatic)}</p></div>}
      </div>
    </details>
        {CIVILIZATION_ACTIVITIES.some((a, index) => !a.retired && !civilizationActivityUnlocked(state, index)) && <section className="civilization-upcoming"><h3>{intl.formatMessage(m.upcoming)}</h3><dl>{CIVILIZATION_ACTIVITIES.map((definition, index) => definition.retired || civilizationActivityUnlocked(state, index) ? null : <div key={definition.id} data-locked-activity={definition.id}><dt>{intl.formatMessage(m[definition.id])}</dt><dd>{requirements(definition.requires)}</dd></div>)}</dl></section>}
      </ProgressControlsPanel>
    </footer>
  </section>
}
