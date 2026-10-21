import { useId, useRef, useState, type CSSProperties } from 'react'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { FrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { FarmingPurchase, FarmingRecipe, FarmingResource, FarmingState, FarmingWorkplace } from '../../../game-state/types'
import { formatGameCountdown, formatWholeGameNumber } from '../../i18n/formatters'
import { Button, InlineResourceAmount, Progress, ProgressControlsPanel } from '../../components'
import { FARMING_PURCHASES, FARMING_SEASONS, FARMING_TUNING as T, farmingAssigned, farmingBurials, farmingCapacity, farmingClearingMaterials, farmingComplete, farmingFoodBalance, farmingFoodPerWorker, farmingFoodRate, farmingFoodUse, farmingFreeLand, farmingHousing, farmingUnassigned, farmingProtection, farmingGrowthRate, farmingNextPopulation, farmingPurchaseCost, farmingPurchaseCount, farmingPurchaseLand, farmingPurchaseStatus, farmingPurchaseVisible, farmingSeason, farmingWorkplaceCapacity } from '../../../simulation/farming'
import { realTimeDuration, realTimeRate } from '../effectiveSpeed'
import { CivilizationSymbol, SeasonSymbol } from './CivilizationSymbol'
import { FarmingSymbol, type FarmingSymbolId } from './FarmingSymbol'
import { readyDysonMessages } from '../dyson/messages'
import { civilizationMessages as c } from './civilizationMessages'
import { farmingMessages as m, villageMessages as v } from './farmingMessages'
import { CivilizationCycleProgress } from './CivilizationCycleProgress'

type Props = { gameplay: DeepReadonly<FrontendGameplaySnapshot>; locale: EnabledLocale; gameSpeed: number; dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult> }
export function FarmingSurface({ gameplay, locale, gameSpeed, dispatchPlayer }: Props) {
  const intl = useIntl(), f = gameplay.progression.civilization!.farming! as FarmingState
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const id = useId(), busy = useRef(new Set<string>())
  const text = (key: keyof typeof v) => intl.formatMessage(v[key])
  const old = (key: keyof typeof m, values?: Record<string, string | number>) => intl.formatMessage(m[key], values)
  const number = (n: number) => formatWholeGameNumber(locale, n)
  const decimal = (n: number) => intl.formatNumber(n, { maximumFractionDigits: 2 })
  const perMinute = (n: number) => intl.formatMessage(v.perMinute, { value: decimal(n) })
  const percent = (n: number) => intl.formatNumber(n, { style: 'percent', maximumFractionDigits: 0 })
  const speed = 1 + (gameplay.progression.challenges?.galvanizedSkillIds?.length ?? 0) * .05
  const complete = farmingComplete(f), next = farmingNextPopulation(f), season = farmingSeason(f)
  const seasonName = intl.formatMessage(c[season])
  const countdown = (n: number) => formatGameCountdown(locale, realTimeDuration(n, gameSpeed))
  const seasonTime = countdown(T.seasonSeconds - f.elapsedSeconds % T.seasonSeconds)
  const growthDuration = realTimeDuration(T.growthSeconds, gameSpeed)
  // Size the header timer for its localized minute/second formats, not each tick.
  const growthTimerSamples = [...new Set([growthDuration, Math.min(growthDuration, 119), Math.min(growthDuration, 59.9), Math.min(growthDuration, 9.99)].map(seconds => formatGameCountdown(locale, seconds)))]
  const balance = farmingFoodBalance(f, speed)
  const name = (resource: FarmingSymbolId): string => resource === 'worker' ? intl.formatMessage(c.population) : resource === 'food' || resource === 'materials' || resource === 'tools' ? intl.formatMessage(c[resource]) : resource === 'workshop' ? old('workshop') : resource === 'granary' ? old('granary') : text(resource)
  const amount = (resource: FarmingSymbolId, n: number, display = decimal(n), affordable = true) => <span className="civilization-icon-amount" role="img" aria-label={old('amount', { resource: name(resource), value: display })} data-affordable={affordable}><InlineResourceAmount leadingSymbol={<FarmingSymbol resource={resource} />} value={display} /></span>
  const recipe = (value: FarmingRecipe) => intl.formatList(Object.entries(value).map(([r, n]) => old('amount', { resource: name(r as FarmingResource), value: decimal(n!) })))
  const action = async (key: string, command: CanonicalPlayerCommand) => {
    if (busy.current.has(key)) return
    busy.current.add(key)
    setPending(new Set(busy.current))
    setFailed(previous => { const next = new Set(previous); next.delete(key); return next })
    try {
      if ((await dispatchPlayer(command)).status !== 'accepted') setFailed(previous => new Set(previous).add(key))
    } catch {
      setFailed(previous => new Set(previous).add(key))
    } finally {
      busy.current.delete(key)
      setPending(new Set(busy.current))
    }
  }
  const yields = (job: 'crops' | 'herding', crew: number) => <div className="village-yield-table">
    <div className="village-yield-heading"><span>{text('fullCrew')}</span>{amount('worker', crew)}</div>
    <ul className="village-season-yields">{FARMING_SEASONS.map((s, i) => <li key={s}><SeasonSymbol season={s} /><span>{intl.formatMessage(c[s])}</span>{amount('food', farmingFoodPerWorker(f, job, speed, i) * crew, perMinute(farmingFoodPerWorker(f, job, speed, i) * crew))}</li>)}</ul>
  </div>
  const eventText = f.lastDisaster ? intl.formatMessage(v[f.lastDisaster.prevented ? 'averted' : f.lastDisaster.kind], { value: decimal(f.lastDisaster.loss) }) : null
  const recentEvent = !!f.lastDisaster && f.elapsedSeconds - f.lastDisaster.at < T.seasonSeconds / 2
  const jobs = (list: readonly FarmingWorkplace[]) => list.filter(job => farmingWorkplaceCapacity(f, job) > 0).map(job => {
    const crew = f.assignments[job], capacity = farmingWorkplaceCapacity(f, job), desired = f.desiredJobs[job]
    const food = job === 'crops' || job === 'herding', ritual = job === 'shaman'
    const title = job === 'workshop' ? old('workshop') : text(job)
    const paid = job === 'woodland' || job === 'workshop' ? f.jobs[job] : undefined
    const duration = paid && crew > 0 ? countdown(paid.remainingWork / (crew * speed)) : '∞'
    const inputs: FarmingRecipe = paid?.inputs ?? (job === 'workshop' ? { materials: T.toolMaterials } : {})
    const output: FarmingRecipe = paid?.outputs ?? (job === 'woodland' ? { materials: farmingClearingMaterials(f) } : { tools: T.toolOutput })
    const changeJobs = (count: number) => void action(`jobs:${job}`, { kind: 'civilization.farming-jobs', workplace: job, count })
    const jobLabel = intl.formatMessage(v.jobsFor, { name: title })
    return <li key={job}><article className="civilization-activity" data-activity-id={job} data-status={crew > 0 ? 'running' : 'waiting'}>
      <details className="civilization-job"><summary>
      <div className="village-job-controls" role="group" aria-label={jobLabel} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <Button variant="purchase" disabled={pending.has(`jobs:${job}`) || desired === 0 || complete} aria-label={intl.formatMessage(v.fewerJobs, { name: title })} onClick={() => changeJobs(desired - 1)}>−</Button>
        <Button variant="purchase" disabled={pending.has(`jobs:${job}`) || desired >= capacity || complete} aria-label={intl.formatMessage(v.moreJobs, { name: title })} onClick={() => changeJobs(desired + 1)}>+</Button>
      </div>
      <div className="village-job-content">
        <div className="civilization-job-header"><div className="civilization-job-title"><strong>{title}</strong><div className="village-job-staffing">
          <span className="civilization-icon-amount" role="img" aria-label={intl.formatMessage(v.workingCount, { value: number(crew) })}><InlineResourceAmount leadingSymbol={<FarmingSymbol resource="worker" />} value={number(crew)} /></span>
          <span aria-hidden="true">·</span>
          <span className="village-crew-count village-job-limit" role="group" aria-label={jobLabel}><InlineResourceAmount leadingSymbol={<span>{text('jobs')}</span>} value={<span className="village-crew-count"><span className="village-job-count-field" style={{ '--village-count-width': `${String(desired).length}ch` } as CSSProperties}><input onClick={event => event.stopPropagation()} className="village-job-count" key={`${job}:${desired}`} type="number" inputMode="numeric" min={0} max={capacity} step={1} defaultValue={desired} disabled={pending.has(`jobs:${job}`) || complete} aria-label={jobLabel} onBlur={event => { const count = event.currentTarget.valueAsNumber; event.currentTarget.value = String(desired); if (Number.isSafeInteger(count) && count >= 0 && count <= capacity && count !== desired) changeJobs(count) }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} /></span><span aria-hidden="true">/</span><span aria-label={old('amount', { resource: text('jobSpaces'), value: number(capacity) })}>{number(capacity)}</span></span>} /></span>
        </div></div>
          <div className="civilization-job-recipe">{food ? amount('food', farmingFoodPerWorker(f, job, speed) * crew, perMinute(farmingFoodPerWorker(f, job, speed) * crew)) : ritual ? null : <>
            <span className="civilization-start-cost" role="group" aria-label={old('inputs')} data-reserved={!!paid}>{Object.entries(inputs).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!, decimal(n!), !!paid || f.resources[r as FarmingResource] >= n!)}</span>)}</span>
            {Object.keys(inputs).length > 0 && <span className="civilization-recipe-arrow" aria-hidden="true">▶</span>}<span className="civilization-output" role="group" aria-label={old('outputs')}>{Object.entries(output).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!)}</span>)}{job === 'woodland' && amount('land', 1)}</span></>}
          </div></div>
        {ritual && <div className="village-shaman-defense village-disaster-meter village-disaster-defense">
          <Progress label={text('protection')} value={farmingProtection(f)} valueText={percent(farmingProtection(f))} />
          <div className="civilization-cycle-track" aria-hidden="true"><span className="civilization-cycle-fill" style={{ transform: `scaleX(${farmingProtection(f)})` }} /></div>
        </div>}
        {!food && !ritual && <CivilizationCycleProgress label={title} value={paid ? paid.work - paid.remainingWork : 0} maximum={paid?.work ?? T.toolWork} valueText={duration} timerText={duration} sampleSeconds={f.elapsedSeconds} cycleKey={`${job}:${paid?.cycle ?? 'waiting'}`} gameSpeed={gameSpeed} active={!!paid && crew > 0} cycleRate={paid ? realTimeRate(crew * speed / paid.work, gameSpeed) : 0} locale={locale} />}
      </div>
        <span className="civilization-chevron" aria-hidden="true">›</span>
      </summary><div className="civilization-activity-details village-job-details">
        <dl className="civilization-facts"><div><dt>{text('jobSpaces')}</dt><dd>{number(capacity)}</dd></div></dl>
        {food ? yields(job, desired) : ritual ? <dl className="civilization-facts"><div><dt>{text('protection')}</dt><dd>{percent(farmingProtection(f))}</dd></div></dl> : <dl className="civilization-facts"><div><dt>{old('inputs')}</dt><dd>{recipe(inputs) || '—'}</dd></div><div><dt>{old('outputs')}</dt><dd>{recipe(output)}{job === 'woodland' && <>, {old('amount', { resource: text('land'), value: '1' })}</>}</dd></div>{!paid && job === 'workshop' && <div><dt>{text('status')}</dt><dd>{text(f.resources.materials < T.toolMaterials ? 'noMaterials' : 'stocked')}</dd></div>}</dl>}
      </div></details>
    </article></li>
  })
  const lock: Record<FarmingPurchase, keyof typeof v> = { workshop: 'needsWoodland', house: 'needsWorkshop', field: 'needsWorkshop', loggingCamp: 'needsWorkshop', pasture: 'needsPasture', granary: 'needsGranary', shrine: 'needsShrine', irrigation: 'needsIrrigation' }
  const purchases = FARMING_PURCHASES.filter(p => farmingPurchaseVisible(f, p)).map(p => {
    const status = farmingPurchaseStatus(f, p), cost = farmingPurchaseCost(f, p)
    const benefit = p === 'house' ? <span>{text('housing')} +{amount('worker', T.residentsPerHouse)}</span> : p === 'shrine' ? amount('worker', T.shrineWorkers, `+${T.shrineWorkers}`) : p === 'loggingCamp' ? amount('worker', T.loggingCampWorkers, `+${T.loggingCampWorkers}`) : p === 'field' || p === 'pasture' ? amount('worker', T.fieldWorkers, `+${T.fieldWorkers}`) : p === 'granary' ? amount('food', T.granaryCapacity, `+${number(T.granaryCapacity)}`) : p === 'irrigation' ? amount('food', 25, '+25%') : amount('tools', T.toolOutput)
    return <section className="farming-granary" key={p}><details><summary id={`${id}-${p}`}>
      <div className="farming-purchase-title"><FarmingSymbol resource={p} /><strong>{name(p)}</strong>{p !== 'irrigation' && <span aria-label={old('owned', { value: number(farmingPurchaseCount(f, p)) })}>×{number(farmingPurchaseCount(f, p))}</span>}</div>
      <div className="farming-purchase-values">{status === 'locked' ? <span>{text(lock[p])}</span> : <><span className="civilization-start-cost" role="group" aria-label={old('nextPrice')}>{Object.entries(cost).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!, decimal(n!), f.resources[r as FarmingResource] >= n!)}</span>)}{farmingPurchaseLand(p) > 0 && amount('land', 1, '1', farmingFreeLand(f) >= 1)}</span><span className="civilization-recipe-arrow" aria-hidden="true">▶</span><span className="civilization-output">{benefit}</span></>}</div>
    </summary><div className="farming-purchase-details">{p === 'field' || p === 'pasture' ? yields(p === 'field' ? 'crops' : 'herding', T.fieldWorkers) : <dl className="civilization-facts"><div><dt>{p === 'house' ? text('housing') : p === 'granary' ? text('reserve') : p === 'loggingCamp' || p === 'shrine' ? text('jobSpaces') : text('production')}</dt><dd>{benefit}</dd></div></dl>}{status === 'land' && <span role="status">{text('needsLand')}</span>}</div></details>
      <Button variant="purchase" state={pending.has(`purchase:${p}`) ? 'pending' : failed.has(`purchase:${p}`) ? 'failure' : 'idle'} disabled={pending.has(`purchase:${p}`) || status !== 'ready'} aria-describedby={`${id}-${p}`} aria-label={`${old('buy')} ${name(p)}`} onClick={() => void action(`purchase:${p}`, { kind: 'civilization.farming-purchase', purchase: p })}>{old('buy')}</Button>
    </section>
  })
  return <section className="simulations-surface civilization-surface farming-surface" data-era="information" data-farming-phase={f.phase} aria-label={old('era')}>
    <div className="civilization-era-header"><header className="civilization-heading"><h2>{old('era')}</h2><strong className="civilization-fracture">{intl.formatMessage(c.fractures, { value: percent(speed - 1) })}</strong></header></div>
    <div className="civilization-scroll">
      <dl className="civilization-resource-legend civilization-visible-stock" aria-label={intl.formatMessage(readyDysonMessages.resources)}>
        <div><dt aria-label={text('housing')}><FarmingSymbol resource="house" /></dt><dd>{number(f.population)} / {number(farmingHousing(f))}</dd></div>
        <div><dt aria-label={text('work')}><FarmingSymbol resource="worker" /></dt><dd><span aria-label={intl.formatMessage(v.workingCount, { value: number(farmingAssigned(f)) })}>{number(farmingAssigned(f))}</span>{farmingUnassigned(f) > 0 && <><span aria-hidden="true"> / </span><span className="village-idle" aria-label={old('amount', { resource: text('idle'), value: number(farmingUnassigned(f)) })}>{number(farmingUnassigned(f))}</span></>}</dd></div>
        {farmingGrowthRate(f, speed) > 0 && <div><dt>{text('growth')}</dt><dd className="village-growth-value"><span>+1 ·</span><span className="village-growth-timer">{growthTimerSamples.map(sample => <span className="village-growth-timer-sample" aria-hidden="true" key={sample}>{sample}</span>)}<bdi>{countdown((1 - f.growthProgress) * T.growthSeconds)}</bdi></span></dd></div>}
        <div><dt aria-label={name('food')}><FarmingSymbol resource="food" /></dt><dd>{number(f.resources.food)}</dd></div>
        {(['materials', 'tools'] as const).filter(r => r === 'materials' || f.workshop).map(r => <div key={r}><dt aria-label={name(r)}><FarmingSymbol resource={r} /></dt><dd>{number(f.resources[r])}</dd></div>)}
        <div><dt aria-label={text('land')}><FarmingSymbol resource="land" /></dt><dd>{number(farmingFreeLand(f))}</dd></div>
        {f.granaries > 0 && <div><dt aria-label={text('reserve')}><FarmingSymbol resource="granary" /></dt><dd>{number(f.resources.food)} / {number(farmingCapacity(f))}{balance < 0 && f.resources.food > 0 && <> · {countdown(f.resources.food / -balance * 60)}</>}</dd></div>}
        {farmingBurials(f) > 0 && <div><dt aria-label={text('burials')}><FarmingSymbol resource="burials" /></dt><dd>{number(farmingBurials(f))}</dd></div>}
      </dl>
      {f.phase === 'complete' && recentEvent && <p className="village-event" role="status">{eventText}</p>}
      {f.phase !== 'complete' && <>
        <section className="village-disasters" aria-labelledby={`${id}-disasters`}>
          <h3 id={`${id}-disasters`}>{text('disasterDeaths')}</h3>
          <div className="village-disaster-progress">
            <div className="village-disaster-meter">
              <Progress label={text('nextDisaster')} value={(f.elapsedSeconds % T.seasonSeconds) / T.seasonSeconds} valueText={seasonTime} />
              <div className="civilization-cycle-track" aria-hidden="true"><span className="civilization-cycle-fill" style={{ transform: `scaleX(${(f.elapsedSeconds % T.seasonSeconds) / T.seasonSeconds})` }} /></div>
            </div>
          </div>
          {recentEvent && <p className="village-disaster-event" role="status">{eventText}</p>}
          {farmingWorkplaceCapacity(f, 'shaman') > 0 && <ol className="civilization-activities village-disaster-shamans">{jobs(['shaman'])}</ol>}
        </section>
        <div className="civilization-paths"><section className="civilization-path"><h3>{text('food')}</h3><ol className="civilization-activities">{jobs(['crops', 'herding'])}</ol></section><section className="civilization-path"><h3>{text('work')}</h3><ol className="civilization-activities">{jobs(['woodland', 'workshop'])}</ol></section></div><section className="farming-shop" aria-label={old('shop')}><h3>{old('shop')}</h3><div className="forager-purchase-grid">{purchases}</div></section>
      </>}
      {failed.size > 0 && <p role="alert">{old('failed')}</p>}
    </div>
    <footer className="simulations-surface__footer civilization-dock"><ProgressControlsPanel className="civilization-control-panel farming-control-panel ui-progress-controls-panel--production-summary" ariaLabel={old('settings')} expanded={open} controlsId={`${id}-settings`} settingsLabel={old('settings')} onExpandedChange={setOpen} summary={<div className="forager-dock-summary"><div className="forager-dock-progress">{f.phase === 'complete' ? <span>{old('betaEndpoint')}</span> : complete ? <Button variant="purchase" fullWidth disabled={pending.has('finish')} onClick={() => void action('finish', { kind: 'civilization.complete-farming' })}>{old('finish')}</Button> : <div className="forager-catalyst-goal"><CivilizationSymbol resource="catalyst" /><div className="civilization-cycle-progress civilization-cycle-progress--animated"><Progress label={intl.formatMessage(c.nextCatalyst)} value={Math.min(1, f.population / next)} valueText={intl.formatMessage(c.populationGoal, { current: number(f.population), target: number(next) })} /><div className="civilization-cycle-track" aria-hidden="true"><span className="civilization-cycle-fill" style={{ transform: `scaleX(${Math.min(1, f.population / next)})` }} /></div></div><InlineResourceAmount leadingSymbol={<CivilizationSymbol resource="worker" />} value={`${number(f.population)} / ${number(next)}`} /></div>}</div><span className="forager-season-clock" role="img" aria-label={`${seasonName}. ${intl.formatMessage(c.seasonRemaining, { time: seasonTime })}`}><InlineResourceAmount leadingSymbol={<SeasonSymbol season={season} />} value={seasonTime} /></span></div>}>
      <div className="forager-season-details"><strong><SeasonSymbol season={season} /> {seasonName}</strong><span>{seasonTime}</span></div>
      <dl className="civilization-facts"><div><dt>{text('disasterRisk')}</dt><dd>{percent(1 - farmingProtection(f))}</dd></div><div><dt>{text('protection')}</dt><dd>{percent(farmingProtection(f))}</dd></div></dl>
      <dl className="civilization-facts"><div><dt>{text('disasterLoss')}</dt><dd>{percent(T.disasterPopulationLoss)}</dd></div><div><dt>{text('production')}</dt><dd>{perMinute(farmingFoodRate(f, speed))}</dd></div><div><dt>{text('consumption')}</dt><dd>{perMinute(farmingFoodUse(f))}</dd></div><div><dt>{text('housing')}</dt><dd>{number(farmingHousing(f))}</dd></div>{f.granaries > 0 && <div><dt>{text('reserve')}</dt><dd>{number(f.resources.food)} / {number(farmingCapacity(f))}</dd></div>}{f.lastDisaster && <div><dt>{text('lastEvent')}</dt><dd>{eventText}</dd></div>}{farmingBurials(f) > 0 && <><div><dt>{text('starvation')}</dt><dd>{number(f.starvationDeaths)}</dd></div><div><dt>{text('natural')}</dt><dd>{number(f.naturalDeaths)}</dd></div><div><dt>{text('disasterDeaths')}</dt><dd>{number(f.disasterDeaths)}</dd></div></>}</dl>
      <section className="forager-resource-key"><h3>{intl.formatMessage(readyDysonMessages.resources)}</h3><ul>{(['worker', 'food', 'materials', 'tools', 'land'] as const).map(r => <li key={r}><FarmingSymbol resource={r} />{name(r)}</li>)}{f.granaries > 0 && <li><FarmingSymbol resource="granary" />{text('reserve')}</li>}{farmingBurials(f) > 0 && <li><FarmingSymbol resource="burials" />{text('burials')}</li>}</ul></section>{f.skillRewardPending && <p>{old('pendingSkill')}</p>}
    </ProgressControlsPanel></footer>
  </section>
}
