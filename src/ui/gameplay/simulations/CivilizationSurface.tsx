import { useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { FrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { formatGameCountdown, formatWholeGameNumber } from '../../i18n/formatters'
import { Button, Progress, ProgressControlsPanel, InlineResourceAmount } from '../../components'
import {
  CIVILIZATION_ACTIVITIES, CIVILIZATION_RESOURCES, FORAGER_AUTOMATIC,
  EMPTY_CIVILIZATION, allocateCivilizationWorkers, civilizationActivityUnlocked,
  civilizationEffectiveWorkers, civilizationSeasonOutputs, civilizationSpeed, civilizationJobWaiting, civilizationActivityInputs, civilizationCycle,
  nextCivilizationCatalyst, civilizationMilestoneProgress, civilizationOpeningComplete,
  civilizationGrowthTarget, civilizationSeason, civilizationHuntingUnlocked, type CivilizationResource, type CivilizationRecipe,
} from '../../../simulation/civilization'
import { realTimeDuration, realTimeRate } from '../effectiveSpeed'
import { readyDysonMessages } from '../dyson/messages'
import { CivilizationSymbol, SeasonSymbol } from './CivilizationSymbol'
import { foragerEraPresentation } from './civilizationEraPresentation'
import { civilizationMessages as m } from './civilizationMessages'
import { farmingMessages as fm } from './farmingMessages'
import { CivilizationCycleProgress } from './CivilizationCycleProgress'
import { FarmingSurface } from './FarmingSurface'
import '../rework/rework.css'
import './simulations.css'
import './civilization.css'

type Dispatch = (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>
type Props = { activeEraId?: string; gameplay: DeepReadonly<FrontendGameplaySnapshot>; locale: EnabledLocale; gameSpeed: number; dispatchPlayer: Dispatch }
export function CivilizationSurface(props: Props) {
  if (!props.gameplay.visibility.simulations.routeUnlocked) return null
  return props.gameplay.progression.civilization?.farming ? <FarmingSurface {...props} /> : <ForagerSurface {...props} />
}
export function ForagerSurface({ gameplay, locale, gameSpeed, dispatchPlayer, activeEraId = 'forager' }: Props) {
  const intl = useIntl(), purchaseId = useId(), settingsId = useId()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const initial = { ...EMPTY_CIVILIZATION, unlocked: true, resources: { ...EMPTY_CIVILIZATION.resources, shelters: 1n } }, initialCrews = allocateCivilizationWorkers(initial)
  const state = gameplay.progression.civilization ?? { ...initial, activities: Object.fromEntries(Object.entries(initial.activities).map(([id, job]) => [id, { ...job, workers: initialCrews[id] }])) }
  const [pending, setPending] = useState(false), [failed, setFailed] = useState(false), busy = useRef(false)
  const fractures = gameplay.progression.challenges?.galvanizedSkillIds?.length ?? 0
  const number = (value: bigint | number) => formatWholeGameNumber(locale, value)
  const duration = (seconds: number) => formatGameCountdown(locale, realTimeDuration(seconds, gameSpeed))
  const resourceName = (id: CivilizationResource) => intl.formatMessage(id === 'shelters' ? m.tents : m[id])
  const recipe = (items: CivilizationRecipe) => intl.formatList(Object.entries(items).map(([id, value]) => intl.formatMessage(m.amount, { value: number(value!), resource: resourceName(id as CivilizationResource) })), { type: 'conjunction' })
  const action = async (command: CanonicalPlayerCommand) => {
    if (busy.current) return
    busy.current = true; setPending(true); setFailed(false)
    try { if ((await dispatchPlayer(command)).status !== 'accepted') setFailed(true) }
    catch { setFailed(true) } finally { busy.current = false; setPending(false) }
  }
  const milestone = nextCivilizationCatalyst(state), goal = civilizationMilestoneProgress(state, milestone)
  const iconAmount = (id: CivilizationResource | 'worker' | 'catalyst', amount: bigint | number, affordable = true) => {
    const label = intl.formatMessage(m.amount, { resource: id === 'worker' ? intl.formatMessage(m.population) : id === 'catalyst' ? intl.formatMessage(m.catalysts) : resourceName(id), value: typeof amount === 'number' ? intl.formatNumber(amount, { maximumFractionDigits: 2 }) : number(amount) })
    return <span className="civilization-icon-amount" role="img" aria-label={label} data-affordable={affordable}><InlineResourceAmount leadingSymbol={<CivilizationSymbol resource={id} />} value={typeof amount === 'number' ? intl.formatNumber(amount, { maximumFractionDigits: 2 }) : number(amount)} /></span>
  }
  const balance = (id: CivilizationResource, iconOnly = false) => <div key={id}><dt aria-label={iconOnly ? resourceName(id) : undefined}><CivilizationSymbol resource={id} />{!iconOnly && <span>{resourceName(id)}</span>}</dt><dd>{number(state.resources[id])}</dd></div>
  const resourceEarned = (id: CivilizationResource) => state.resources[id] > 0n || CIVILIZATION_ACTIVITIES.some(activity => state.activities[activity.id].completions > 0n && (activity.outputs[id] ?? 0n) > 0n)
  const showCampPurchase = state.resources.shelters >= 2n || state.activities.shelterBuilding.completions > 0n || state.resources.camps > 0n || state.activities.campExpansion.completions > 0n
  const stockOrder: readonly CivilizationResource[] = ['food', 'materials', 'hides', 'tools', 'clothing', 'shelters', 'camps']
  const season = civilizationSeason(state)
  const americanEnglish = locale === 'en' && globalThis.navigator?.languages?.find(tag => /^en-/i.test(tag))?.toLowerCase() === 'en-us'
  const seasonLabel = intl.formatMessage(season === 'autumn' && americanEnglish ? m.fall : m[season])
  const seasonTime = duration(600 - state.elapsedSeconds % 600)
  const priority = state.priority ?? 'gathering', huntingUnlocked = civilizationHuntingUnlocked(state)
  const priorityAvailable = { provisioning: huntingUnlocked, craft: huntingUnlocked && civilizationActivityUnlocked(state, CIVILIZATION_ACTIVITIES.findIndex(activity => activity.id === 'hideworking')) }
  const eraView = foragerEraPresentation(state, activeEraId)
  if (eraView.kind === 'generator') return <article className="civilization-retained-generator" data-feeds-era={eraView.feedsEraId} aria-label={intl.formatMessage(m.foragerGenerator)}><header><strong>{intl.formatMessage(m.foragerGenerator)}</strong>{iconAmount('worker', eraView.source.workers)}</header><dl className="civilization-balances">{CIVILIZATION_RESOURCES.map(id => balance(id))}</dl></article>
  return <section className="simulations-surface civilization-surface" data-era="information" aria-label={intl.formatMessage(m.era)}>
    <div className="civilization-era-header"><header className="civilization-heading"><h2>{intl.formatMessage(m.era)}</h2><strong className="civilization-fracture">{intl.formatMessage(m.fractures, { value: intl.formatNumber(fractures * 0.05, { style: 'percent', maximumFractionDigits: 0 }) })}</strong></header></div>
    <div className="civilization-scroll">
      <dl className="civilization-resource-legend civilization-visible-stock" aria-label={intl.formatMessage(readyDysonMessages.resources)}><div><dt aria-label={intl.formatMessage(m.population)}><CivilizationSymbol resource="worker" /></dt><dd>{number(state.workers)}</dd></div>{stockOrder.filter(resourceEarned).map(id => balance(id, true))}</dl>
      <div className="civilization-paths">{(['provisioning', 'craft'] as const).map(section => <section className="civilization-path" key={section}>
        <h3>{intl.formatMessage(m[section])}</h3>
        <ol className="civilization-activities" role={priorityAvailable[section] ? 'radiogroup' : undefined} aria-label={priorityAvailable[section] ? intl.formatMessage(section === 'craft' ? m.craftPriority : m.priority) : undefined}>
          {CIVILIZATION_ACTIVITIES.map((definition, index) => {
            if (definition.section !== section || !FORAGER_AUTOMATIC.includes(definition.id)) return null
            if (definition.id === 'hunting' && !huntingUnlocked) {
              const available = state.activities.toolmaking.completions > 0n, affordable = state.resources.tools >= 1n
              return <li key={definition.id}><section className="farming-granary civilization-hunting-purchase"><details><summary id={`${purchaseId}-hunting`}>
                <div className="farming-purchase-title"><CivilizationSymbol resource="hides" /><strong>{intl.formatMessage(m.hunting)}</strong></div>
                <div className="farming-purchase-values">{available ? <span className="civilization-start-cost farming-granary-cost" role="group" aria-label={intl.formatMessage(fm.nextPrice)}>{iconAmount('tools', 1n, affordable)}</span> : <span>{intl.formatMessage(m.huntingPrerequisite)}</span>}</div>
              </summary><div className="farming-purchase-details"><p>{intl.formatMessage(m.huntingUnlock)}</p>{!available && <p>{intl.formatMessage(m.huntingPrerequisite)}</p>}</div></details>
                <Button variant="purchase" state={pending ? 'pending' : failed ? 'failure' : 'idle'} disabled={pending || !available || !affordable} aria-describedby={`${purchaseId}-hunting`} aria-label={intl.formatMessage(m.unlockHunting)} onClick={() => void action({ kind: 'civilization.unlock-hunting' })}>{intl.formatMessage(fm.buy)}</Button>
              </section></li>
            }
            if (!civilizationActivityUnlocked(state, index)) return null
            const job = state.activities[definition.id], cycle = civilizationCycle(state, index), speed = civilizationSpeed(state, index, fractures), waiting = civilizationJobWaiting(state, index)
            const costs = civilizationActivityInputs(state, index), isChoice = priorityAvailable[section]
            const status = waiting.reason === 'demand' ? intl.formatMessage(m.waitingDemand) : waiting.reason === 'workers' ? intl.formatMessage(m.waitingWorkers) : waiting.reason === 'housing' ? intl.formatMessage(m.waitingHousing) : waiting.reason === 'range' ? intl.formatMessage(m.waitingRange) : waiting.reason === 'inputs' ? intl.formatMessage(m.waitingInputs, { name: intl.formatList(waiting.missing.map(resourceName)) }) : duration((cycle.seconds - job.progress) / speed)
            return <li key={definition.id}><article className="civilization-activity" data-activity-id={definition.id} data-status={waiting.reason} data-priority-choice={isChoice || undefined}>
              {isChoice && <label className="civilization-row-priority" title={intl.formatMessage(m.priorityChoice, { name: intl.formatMessage(m[definition.id]) })}><input type="radio" name={`${settingsId}-${section}-priority`} value={definition.id} checked={(section === 'craft' ? state.craftPriority ?? 'hideworking' : priority) === definition.id} disabled={pending || state.chieftain?.enabled} aria-label={intl.formatMessage(m.priorityChoice, { name: intl.formatMessage(m[definition.id]) })} onChange={() => void action({ kind: 'civilization.set-focus', focus: definition.id })} /></label>}
              <details className="civilization-job"><summary>
                <div className="civilization-job-header"><div className="civilization-job-title"><strong>{intl.formatMessage(m[definition.id])}</strong>{iconAmount('worker', civilizationEffectiveWorkers(state, index))}</div>
                  <div className="civilization-job-recipe"><span className="civilization-start-cost" role="group" aria-label={intl.formatMessage(m.inputs)} data-reserved={job.active}>{Object.entries(costs).map(([id, amount]) => <span key={id}>{iconAmount(id as CivilizationResource, amount!, job.active || state.resources[id as CivilizationResource] >= amount!)}</span>)}</span>
                    {Object.keys(costs).length > 0 && <span className="civilization-recipe-arrow" aria-hidden="true">▶</span>}
                    <span className="civilization-output" role="group" aria-label={intl.formatMessage(m.outputs)}>{Object.entries(cycle.outputs).map(([id, amount]) => <span key={id}>{iconAmount(id as CivilizationResource, amount!)}</span>)}</span>
                  </div>
                </div>
                <CivilizationCycleProgress label={intl.formatMessage(m[definition.id])} value={job.progress} maximum={cycle.seconds} valueText={status} timerText={waiting.reason === 'running' ? status : '∞'} sampleSeconds={state.elapsedSeconds} cycleKey={`${definition.id}:${job.completions}`} gameSpeed={gameSpeed} active={job.active && waiting.reason === 'running'} cycleRate={realTimeRate(speed / cycle.seconds, gameSpeed)} locale={locale} />
                <span className="civilization-chevron" aria-hidden="true">›</span>
              </summary><div className="civilization-activity-details">
                {definition.id === 'hunting' && <p>{intl.formatMessage(m.huntingUnlock)}</p>}
                <dl className="civilization-facts civilization-recipe"><div><dt>{intl.formatMessage(m.inputs)}</dt><dd>{recipe(costs) || '—'}</dd></div><div><dt>{intl.formatMessage(m.outputs)}</dt><dd>{recipe(cycle.outputs)}</dd></div></dl>
                <dl className="civilization-facts"><div><dt>{intl.formatMessage(m.workers)}</dt><dd>{number(job.workers)}</dd></div><div><dt>{intl.formatMessage(m.completed)}</dt><dd>{number(job.completions)}</dd></div><div><dt>{intl.formatMessage(m.duration)}</dt><dd>{duration(cycle.seconds / (speed || 1))}</dd></div></dl>
                {waiting.reason !== 'running' && <p>{status}</p>}{job.active && Object.keys(costs).length > 0 && <p>{intl.formatMessage(m.paid)}</p>}
              </div></details>
            </article></li>
          })}
        </ol>
      </section>)}</div>

      <section className="farming-shop civilization-settlement"><h3>{intl.formatMessage(m.settlement)}</h3><div className="forager-purchase-grid">{(['tent', 'camp'] as const).map(building => {
        if (building === 'camp' && !showCampPurchase) return null
        const id = building === 'tent' ? 'shelterBuilding' : 'campExpansion', index = CIVILIZATION_ACTIVITIES.findIndex(a => a.id === id), cost = civilizationActivityInputs(state, index), resource = building === 'tent' ? 'shelters' : 'camps'
        const unlocked = civilizationActivityUnlocked(state, index), affordable = Object.entries(cost).every(([r, n]) => state.resources[r as CivilizationResource] >= n!)
        const missing = Object.fromEntries(Object.entries(cost).filter(([r, n]) => state.resources[r as CivilizationResource] < n!).map(([r, n]) => [r, n! - state.resources[r as CivilizationResource]]))
        return <section className="farming-granary" key={building}><details><summary id={`${purchaseId}-${building}`}>
          <div className="farming-purchase-title"><CivilizationSymbol resource={resource} /><strong>{intl.formatMessage(building === 'tent' ? m.tent : m.camp)}</strong><span aria-label={intl.formatMessage(fm.owned, { value: number(state.resources[resource]) })}>×{number(state.resources[resource])}</span></div>
          <div className="farming-purchase-values">{!unlocked ? <span>{intl.formatMessage(m.tentUnlock)}</span> : <><span className="civilization-start-cost farming-granary-cost" role="group" aria-label={intl.formatMessage(fm.nextPrice)}>{Object.entries(cost).map(([r, n]) => <span key={r}>{iconAmount(r as CivilizationResource, n!, state.resources[r as CivilizationResource] >= n!)}</span>)}</span><span className="civilization-recipe-arrow" aria-hidden="true">▶</span><span className="civilization-output">{iconAmount('worker', building === 'tent' ? 2n : 3n)}</span></>}</div>
        </summary><div className="farming-purchase-details"><p>{intl.formatMessage(building === 'tent' ? m.tentBenefit : m.campBenefit)}</p><p>{intl.formatMessage(fm.nextPrice)}: {recipe(cost)}</p>{!unlocked ? <p role="status">{intl.formatMessage(building === 'tent' ? m.tentUnlock : m.campUnlock)}</p> : !affordable && <p role="status">{intl.formatMessage(fm.missingInputs, { inputs: recipe(missing) })}</p>}</div></details>
          <Button variant="purchase" state={pending ? 'pending' : failed ? 'failure' : 'idle'} disabled={pending || !unlocked || !affordable} aria-describedby={`${purchaseId}-${building}`} aria-label={intl.formatMessage(building === 'tent' ? m.buildTent : m.buildCamp)} onClick={() => void action({ kind: 'civilization.buy-housing', building })}>{intl.formatMessage(fm.buy)}</Button>
        </section>
      })}
      {(state.resources.camps > 0n || state.chieftain) && <section className="farming-granary"><details><summary id={`${purchaseId}-chieftain`}>
        <div className="farming-purchase-title"><CivilizationSymbol resource="chieftain" /><strong>{intl.formatMessage(m.chieftain)}</strong></div>
        <div className="farming-purchase-values">{state.chieftain ? <span>{intl.formatMessage(m.chieftainTarget, { name: intl.formatMessage(civilizationGrowthTarget(state) === 'camp' ? m.camp : m.tent) })}</span> : state.resources.camps < 2n ? <span>{intl.formatMessage(m.locked, { name: <span role="img" aria-label={intl.formatMessage(m.amount, { value: number(2n), resource: resourceName('camps') })}>{number(2n)} <CivilizationSymbol resource="camps" /></span> })}</span> : <><span className="civilization-start-cost farming-granary-cost" role="group" aria-label={intl.formatMessage(fm.nextPrice)}>{iconAmount('tools', 12n, state.resources.tools >= 12n)} {iconAmount('hides', 6n, state.resources.hides >= 6n)}</span><span className="civilization-recipe-arrow" aria-hidden="true">▶</span><span>{intl.formatMessage(m.autoPriority)}</span></>}</div>
      </summary><div className="farming-purchase-details"><p>{intl.formatMessage(m.chieftainHelp)}</p>{!state.chieftain && <p>{intl.formatMessage(m.chieftainRequirement)}</p>}</div></details>
        {state.chieftain ? <Button variant="purchase" disabled={pending} aria-label={intl.formatMessage(m.chieftainAuto)} aria-pressed={state.chieftain.enabled} onClick={() => void action({ kind:'civilization.set-chieftain', enabled:!state.chieftain!.enabled })}>{intl.formatMessage(state.chieftain.enabled ? m.chieftainOn : m.chieftainOff)}</Button> : <Button variant="purchase" disabled={pending || state.resources.camps < 2n || state.resources.tools < 12n || state.resources.hides < 6n} aria-label={intl.formatMessage(m.hireChieftain)} aria-describedby={`${purchaseId}-chieftain`} onClick={() => void action({ kind:'civilization.buy-chieftain' })}>{intl.formatMessage(fm.buy)}</Button>}
      </section>}
      </div></section>
      {failed && <p role="alert">{intl.formatMessage(m.failed)}</p>}
    </div>
    <footer className="simulations-surface__footer civilization-dock">
      <ProgressControlsPanel className="civilization-control-panel forager-control-panel ui-progress-controls-panel--production-summary" ariaLabel={intl.formatMessage(m.eraSettings)} expanded={settingsOpen} controlsId={settingsId} settingsLabel={intl.formatMessage(m.eraSettings)} onExpandedChange={setSettingsOpen}
        summary={<div className="forager-dock-summary"><div className="forager-dock-progress">{civilizationOpeningComplete(state) ? <Button variant="purchase" fullWidth disabled={pending} onClick={() => void action({ kind: 'civilization.enter-farming' })}>{intl.formatMessage(fm.begin)}</Button> : <div className="forager-catalyst-goal"><CivilizationSymbol resource="catalyst" /><div className="civilization-cycle-progress civilization-cycle-progress--animated"><Progress label={intl.formatMessage(m.nextCatalyst)} value={goal.progress} valueText={intl.formatMessage(m.populationGoal, { current: number(state.workers), target: number(milestone.requires.population) })} /><div className="civilization-cycle-track" aria-hidden="true"><span className="civilization-cycle-fill" style={{ transform: `scaleX(${goal.progress})` }} /></div></div><InlineResourceAmount leadingSymbol={<CivilizationSymbol resource="worker" />} value={`${number(state.workers)} / ${number(milestone.requires.population)}`} /></div>}</div><span className="forager-season-clock" role="img" aria-label={`${seasonLabel}. ${intl.formatMessage(m.seasonRemaining, { time: seasonTime })}`} title={seasonLabel}><InlineResourceAmount leadingSymbol={<SeasonSymbol season={season} />} value={seasonTime} /></span></div>}>
        <div className="forager-season-details"><strong><SeasonSymbol season={season} /> {seasonLabel}</strong><span>{intl.formatMessage(m.seasonRemaining, { time: seasonTime })}</span><p className="forager-season-yields">{(['gathering', 'hunting'] as const).map(activity => <span key={activity}>{intl.formatMessage(m[activity])}: {Object.entries(civilizationSeasonOutputs(state, activity)).map(([id, amount]) => <span key={id}>{iconAmount(id as CivilizationResource, amount!)}</span>)}</span>)}</p></div>
        {failed && <p role="alert">{intl.formatMessage(m.failed)}</p>}
        <section className="forager-resource-key"><h3>{intl.formatMessage(readyDysonMessages.resources)}</h3><ul><li><CivilizationSymbol resource="worker" />{intl.formatMessage(m.population)}</li>{stockOrder.map(id => <li key={id}><CivilizationSymbol resource={id} />{resourceName(id)}</li>)}</ul></section>
      </ProgressControlsPanel>
    </footer>
  </section>
}
