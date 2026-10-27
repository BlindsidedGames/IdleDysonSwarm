import { useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { FrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { resolveLocale } from '../../i18n/localeRegistry'
import type { FarmingPurchase, FarmingRecipe, FarmingResource, FarmingState, FarmingWorkplace } from '../../../game-state/types'
import { formatGameCountdown, formatGameNumber } from '../../i18n/formatters'
import { Button, InlineResourceAmount, Progress, ProgressControlsPanel } from '../../components'
import { FARMING_PURCHASES, FARMING_SEASONS, FARMING_TUNING as T, farmingBurials, farmingCapacity, farmingClearingMaterials, farmingComplete, farmingFoodPerWorker, farmingFoodRate, farmingFoodUse, farmingFreeLand, farmingHousing, farmingProtection, farmingProtectionLimit, farmingProtectionRate, farmingGrowthRate, farmingNextPopulation, farmingPurchaseCost, farmingPurchaseCount, farmingPurchaseLand, farmingPurchaseStatus, farmingPurchaseVisible, farmingSeason, farmingWorkplaceCapacity } from '../../../simulation/farming'
import { realTimeDuration, realTimeRate } from '../effectiveSpeed'
import { CivilizationSymbol, SeasonSymbol } from './CivilizationSymbol'
import { FarmingSymbol, type FarmingSymbolId } from './FarmingSymbol'
import { readyDysonMessages } from '../dyson/messages'
import { civilizationMessages as c } from './civilizationMessages'
import { farmingMessages as m, villageMessages as v } from './farmingMessages'
import { CivilizationCycleProgress } from './CivilizationCycleProgress'

type Props = { gameplay: DeepReadonly<FrontendGameplaySnapshot>; locale: EnabledLocale; gameSpeed: number; dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult> }
export function FarmingSurface({ gameplay, gameSpeed, dispatchPlayer }: Props) {
  const intl = useIntl(), locale = resolveLocale(intl.locale), f = gameplay.progression.civilization!.farming! as FarmingState
  const [open, setOpen] = useState(false)
  const [burialsOpen, setBurialsOpen] = useState(false)
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())
  const id = useId(), busy = useRef(new Set<string>())
  const text = (key: keyof typeof v) => intl.formatMessage(v[key])
  const old = (key: keyof typeof m, values?: Record<string, string | number>) => intl.formatMessage(m[key], values)
  const number = (n: number) => formatGameNumber(locale, n, { wholeBelowHundred: true })
  const decimal = (n: number) => formatGameNumber(locale, n)
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
  const seasonDuration = realTimeDuration(T.seasonSeconds, gameSpeed)
  const seasonTimerSamples = [...new Set([seasonDuration, Math.min(seasonDuration, 119), Math.min(seasonDuration, 59.9), Math.min(seasonDuration, 9.99)].map(seconds => formatGameCountdown(locale, seconds)))]
  const quantitySamples = [...new Set([0, .01, 1, 10, 100, 1000, 1e6, 1e9].map(decimal))]
  const name = (resource: FarmingSymbolId): string => resource === 'worker' ? intl.formatMessage(c.population) : resource === 'food' || resource === 'materials' || resource === 'tools' ? intl.formatMessage(c[resource]) : resource === 'workshop' ? old('workshop') : resource === 'granary' ? old('granary') : text(resource)
  const amount = (resource: FarmingSymbolId, n: number, display = decimal(n), affordable = true) => <span className="civilization-icon-amount" role="img" aria-label={old('amount', { resource: name(resource), value: display })} data-affordable={affordable}><InlineResourceAmount leadingSymbol={<FarmingSymbol resource={resource} />} value={display} /></span>
  const foodAmount = (n: number) => <span className="civilization-icon-amount village-food-amount" role="img" aria-label={old('amount', { resource: name('food'), value: decimal(n) })}>{quantitySamples.map(sample => <span className="village-number-sample" aria-hidden="true" key={sample}><InlineResourceAmount leadingSymbol={<FarmingSymbol resource="food" />} value={sample} /></span>)}<span className="village-food-value"><InlineResourceAmount leadingSymbol={<FarmingSymbol resource="food" />} value={decimal(n)} /></span></span>
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
  const lossText = intl.formatMessage(v.residentLoss, { count: Math.min(f.population - 1, Math.ceil(f.population * T.disasterPopulationLoss)), percent: percent(T.disasterPopulationLoss) })
  const recentEvent = !!f.lastDisaster && f.elapsedSeconds - f.lastDisaster.at < T.seasonSeconds / 2
  const jobs = (list: readonly FarmingWorkplace[]) => list.filter(job => farmingWorkplaceCapacity(f, job) > 0).map(job => {
    const crew = f.assignments[job], capacity = farmingWorkplaceCapacity(f, job)
    const food = job === 'crops' || job === 'herding', ritual = job === 'shaman'
    const title = job === 'workshop' ? old('workshop') : text(job)
    const paid = job === 'woodland' || job === 'workshop' ? f.jobs[job] : undefined
    const duration = paid && crew > 0 ? countdown(paid.remainingWork / (crew * speed)) : '∞'
    const inputs: FarmingRecipe = paid?.inputs ?? (job === 'workshop' ? { materials: T.toolMaterials } : {})
    const output: FarmingRecipe = paid?.outputs ?? (job === 'woodland' ? { materials: farmingClearingMaterials(f) } : { tools: T.toolOutput })
    const choices = food ? ['crops', 'herding'] as const : ['woodland', 'workshop', 'shaman'] as const
    const isChoice = choices.filter(id => farmingWorkplaceCapacity(f, id) > 0).length > 1
    const selected = (food ? f.foodPriority : f.workPriority) === job
    return <li key={job}><article className="civilization-activity" data-activity-id={job} data-status={crew > 0 ? 'running' : 'waiting'} data-priority-choice={isChoice || undefined}>
      {isChoice && <label className="civilization-row-priority"><input type="radio" name={`${id}-${food ? 'food' : 'work'}-priority`} value={job} checked={selected} disabled={pending.size > 0 || complete} aria-label={intl.formatMessage(c.priorityChoice, { name: title })} onChange={() => void action(`priority:${job}`, { kind: 'civilization.farming-priority', workplace: job })} /></label>}
      <details className="civilization-job"><summary>
      <div className="village-job-content">
        <div className="civilization-job-header"><div className="civilization-job-title"><strong>{title}</strong><div className="village-job-staffing">
          <span className="civilization-icon-amount" role="img" aria-label={`${intl.formatMessage(v.workingCount, { value: number(crew) })}; ${old('amount', { resource: text('jobSpaces'), value: number(capacity) })}`}><InlineResourceAmount leadingSymbol={<FarmingSymbol resource="worker" />} value={`${number(crew)} / ${number(capacity)}`} /></span>
        </div></div>
          <div className="civilization-job-recipe">{food ? foodAmount(job === 'crops' ? f.cropHarvest : f.livestockHarvest) : ritual ? null : <>
            <span className="civilization-start-cost" role="group" aria-label={old('inputs')} data-reserved={!!paid}>{Object.entries(inputs).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!, decimal(n!), !!paid || f.resources[r as FarmingResource] >= n!)}</span>)}</span>
            {Object.keys(inputs).length > 0 && <span className="civilization-recipe-arrow" aria-hidden="true">▶</span>}<span className="civilization-output" role="group" aria-label={old('outputs')}>{Object.entries(output).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!)}</span>)}{job === 'woodland' && amount('land', 1)}</span></>}
          </div></div>
        {ritual && <div className="village-shaman-defense"><CivilizationCycleProgress label={text('protection')} value={farmingProtection(f)} maximum={1} valueText={percent(farmingProtection(f))} timerText={percent(farmingProtection(f))} timerSamples={[percent(1)]} sampleSeconds={f.elapsedSeconds} cycleKey={`protection:${Math.floor(f.elapsedSeconds / T.seasonSeconds)}`} gameSpeed={gameSpeed} active cycleRate={realTimeRate(farmingProtectionRate(f), gameSpeed)} locale={locale} /></div>}
        {food && <CivilizationCycleProgress label={title} timerSamples={seasonTimerSamples} value={f.elapsedSeconds % T.seasonSeconds} maximum={T.seasonSeconds} valueText={seasonTime} timerText={seasonTime} sampleSeconds={f.elapsedSeconds} cycleKey={`harvest:${Math.floor(f.elapsedSeconds / T.seasonSeconds)}`} gameSpeed={gameSpeed} active cycleRate={realTimeRate(1 / T.seasonSeconds, gameSpeed)} locale={locale} />}
        {!food && !ritual && <CivilizationCycleProgress label={title} value={paid ? paid.work - paid.remainingWork : 0} maximum={paid?.work ?? T.toolWork} valueText={duration} timerText={duration} sampleSeconds={f.elapsedSeconds} cycleKey={`${job}:${paid?.cycle ?? 'waiting'}`} gameSpeed={gameSpeed} active={!!paid && crew > 0} cycleRate={paid ? realTimeRate(crew * speed / paid.work, gameSpeed) : 0} locale={locale} />}
      </div>
        <span className="civilization-chevron" aria-hidden="true">›</span>
      </summary><div className="civilization-activity-details village-job-details">
        <dl className="civilization-facts"><div><dt>{text('jobSpaces')}</dt><dd>{number(capacity)}</dd></div></dl>
        {food ? yields(job, capacity) : ritual ? <dl className="civilization-facts"><div><dt>{intl.formatMessage(v.protectionMaximum, { value: percent(farmingProtectionLimit(f)) })}</dt><dd>{percent(farmingProtection(f))}</dd></div></dl> : <dl className="civilization-facts"><div><dt>{old('inputs')}</dt><dd>{recipe(inputs) || '—'}</dd></div><div><dt>{old('outputs')}</dt><dd>{recipe(output)}{job === 'woodland' && <>, {old('amount', { resource: text('land'), value: '1' })}</>}</dd></div>{!paid && job === 'workshop' && <div><dt>{text('status')}</dt><dd>{text(f.resources.materials < T.toolMaterials ? 'noMaterials' : 'stocked')}</dd></div>}</dl>}
      </div></details>
    </article></li>
  })
  const lock: Record<FarmingPurchase, keyof typeof v> = { workshop: 'needsWoodland', house: 'needsWorkshop', field: 'needsWorkshop', loggingCamp: 'needsWorkshop', pasture: 'needsPasture', granary: 'needsGranary', shrine: 'needsShrine', irrigation: 'needsIrrigation', shamanTraining: 'shamanTraining' }
  const purchaseOrder: readonly FarmingPurchase[] = ['house', 'granary', ...FARMING_PURCHASES.filter(p => p !== 'house' && p !== 'granary')]
  const growthActive = farmingGrowthRate(f, speed) > 0
  const purchases = purchaseOrder.filter(p => p === 'house' || p === 'granary' || farmingPurchaseVisible(f, p)).map(p => {
    const status = farmingPurchaseStatus(f, p), cost = farmingPurchaseCost(f, p)
    const benefit = p === 'shamanTraining' ? <span>{intl.formatMessage(v.protectionMaximum, { value: percent(T.protectionCaps[(f.protectionUpgrades ?? 0) + 1]) })}</span> : p === 'house' ? amount('worker', T.residentsPerHouse, `+${number(T.residentsPerHouse)}`) : p === 'shrine' ? amount('worker', T.shrineWorkers, `+${T.shrineWorkers}`) : p === 'loggingCamp' ? amount('worker', T.loggingCampWorkers, `+${T.loggingCampWorkers}`) : p === 'field' || p === 'pasture' ? amount('worker', T.fieldWorkers, `+${T.fieldWorkers}`) : p === 'granary' ? amount('food', T.granaryCapacity, `+${number(T.granaryCapacity)}`) : p === 'irrigation' ? amount('food', 25, '+25%') : amount('tools', T.toolOutput)
    return <section className="farming-granary" data-building={p} key={p}><details><summary id={`${id}-${p}`}>
      <div className="farming-purchase-title"><FarmingSymbol resource={p} /><strong>{name(p)}</strong>{p !== 'irrigation' && <span aria-label={old('owned', { value: number(farmingPurchaseCount(f, p)) })}>×{number(farmingPurchaseCount(f, p))}</span>}{p === 'house' && <span className="village-building-total">{amount('worker', f.population, `${number(f.population)} / ${number(farmingHousing(f))}`)}</span>}{p === 'granary' && <span className="village-building-total">{amount('food', f.resources.food, `${number(f.resources.food)} / ${number(farmingCapacity(f))}`)}</span>}</div>
      <div className="farming-purchase-values">{status === 'locked' ? <span>{p === 'shamanTraining' ? intl.formatMessage(v.populationRequirement, { value: number(T.protectionPopulationRequirements[f.protectionUpgrades ?? 0]) }) : text(lock[p])}</span> : <><span className="civilization-start-cost" role="group" aria-label={old('nextPrice')}>{Object.entries(cost).map(([r, n]) => <span key={r}>{amount(r as FarmingResource, n!, decimal(n!), f.resources[r as FarmingResource] >= n!)}</span>)}{farmingPurchaseLand(p) > 0 && amount('land', 1, '1', farmingFreeLand(f) >= 1)}</span><span className="civilization-recipe-arrow" aria-hidden="true">▶</span><span className="civilization-output">{benefit}</span></>}</div>
      {p === 'house' && <div className="village-building-meter"><CivilizationCycleProgress label={text('growth')} value={f.growthProgress} maximum={1} valueText={percent(f.growthProgress)} timerText={growthActive ? countdown((1 - f.growthProgress) * T.growthSeconds) : '—'} timerSamples={growthTimerSamples} sampleSeconds={f.elapsedSeconds} cycleKey={`growth:${f.population}:${f.naturalDeaths + f.disasterDeaths + f.starvationDeaths}`} gameSpeed={gameSpeed} active={growthActive} cycleRate={realTimeRate(1 / T.growthSeconds, gameSpeed)} locale={locale} /></div>}
      {p === 'granary' && <div className="village-building-meter"><CivilizationCycleProgress label={text('reserve')} value={f.resources.food} maximum={farmingCapacity(f)} valueText={`${number(f.resources.food)} / ${number(farmingCapacity(f))}`} timerText={percent(f.resources.food / farmingCapacity(f))} timerSamples={[percent(1)]} sampleSeconds={f.elapsedSeconds} cycleKey="storage" gameSpeed={gameSpeed} active={false} cycleRate={0} locale={locale} /></div>}
    </summary><div className="farming-purchase-details">{p === 'field' || p === 'pasture' ? yields(p === 'field' ? 'crops' : 'herding', T.fieldWorkers) : <dl className="civilization-facts"><div><dt>{p === 'house' ? text('housing') : p === 'granary' ? text('reserve') : p === 'loggingCamp' || p === 'shrine' ? text('jobSpaces') : p === 'shamanTraining' ? text('protection') : text('production')}</dt><dd>{benefit}</dd></div></dl>}{status === 'land' && <span role="status">{text('needsLand')}</span>}</div></details>
      <Button variant="purchase" state={pending.has(`purchase:${p}`) ? 'pending' : failed.has(`purchase:${p}`) ? 'failure' : 'idle'} disabled={pending.has(`purchase:${p}`) || status !== 'ready'} aria-describedby={`${id}-${p}`} aria-label={`${old('buy')} ${name(p)}`} onClick={() => void action(`purchase:${p}`, { kind: 'civilization.farming-purchase', purchase: p })}>{old('buy')}</Button>
    </section>
  })
  return <section className="simulations-surface civilization-surface farming-surface" data-era="information" data-farming-phase={f.phase} aria-label={old('era')}>
    <div className="civilization-era-header"><header className="civilization-heading"><h2>{old('era')}</h2><strong className="civilization-fracture">{intl.formatMessage(c.fractures, { value: percent(speed - 1) })}</strong></header></div>
    <div className="civilization-scroll">
      <dl className="civilization-resource-legend civilization-visible-stock" aria-label={intl.formatMessage(readyDysonMessages.resources)}>
        <div><dt aria-label={name('food')}><FarmingSymbol resource="food" /></dt><dd>{number(f.resources.food)}</dd></div>
        {(['materials', 'tools'] as const).filter(r => r === 'materials' || f.workshop).map(r => <div key={r}><dt aria-label={name(r)}><FarmingSymbol resource={r} /></dt><dd>{number(f.resources[r])}</dd></div>)}
        <div><dt aria-label={text('land')}><FarmingSymbol resource="land" /></dt><dd>{number(farmingFreeLand(f))}</dd></div>
        {farmingBurials(f) > 0 && <div><dt className="village-visually-hidden">{text('burials')}</dt><dd><button type="button" className="village-burials-toggle" aria-label={old('amount', { resource: text('burials'), value: number(farmingBurials(f)) })} aria-expanded={burialsOpen} aria-controls={`${id}-burials`} onClick={() => setBurialsOpen(value => !value)}><FarmingSymbol resource="burials" />{number(farmingBurials(f))}</button></dd></div>}
      </dl>
      {burialsOpen && <dl id={`${id}-burials`} className="civilization-facts village-burial-breakdown"><div><dt>{text('starvation')}</dt><dd>{number(f.starvationDeaths)}</dd></div><div><dt>{text('natural')}</dt><dd>{number(f.naturalDeaths)}</dd></div><div><dt>{text('disasterDeaths')}</dt><dd>{number(f.disasterDeaths)}</dd></div></dl>}
      {f.phase === 'complete' && recentEvent && <p className="village-event" role="status">{eventText}</p>}
      {f.phase !== 'complete' && <>
        <section className="village-disasters" aria-label={text('disasterDeaths')}>
          <p className="village-disaster-event" role="status">{recentEvent ? eventText : null}</p>
          <CivilizationCycleProgress label={text('nextDisaster')} timerSamples={seasonTimerSamples} value={f.elapsedSeconds % T.seasonSeconds} maximum={T.seasonSeconds} valueText={seasonTime} timerText={seasonTime} sampleSeconds={f.elapsedSeconds} cycleKey={`disaster:${Math.floor(f.elapsedSeconds / T.seasonSeconds)}`} gameSpeed={gameSpeed} active cycleRate={realTimeRate(1 / T.seasonSeconds, gameSpeed)} locale={locale} />
          <dl className="civilization-facts village-disaster-loss"><div><dt>{text('disasterLoss')}</dt><dd>{lossText}</dd></div></dl>
          {farmingWorkplaceCapacity(f, 'shaman') > 0 && <ol className="civilization-activities village-disaster-shamans">{jobs(['shaman'])}</ol>}
        </section>
        <div className="civilization-paths"><section className="civilization-path"><h3>{text('food')}</h3><ol className="civilization-activities">{jobs(['crops', 'herding'])}</ol></section><section className="civilization-path"><h3>{text('work')}</h3><ol className="civilization-activities">{jobs(['woodland', 'workshop'])}</ol></section></div><section className="farming-shop" aria-label={old('shop')}><h3>{old('shop')}</h3><div className="forager-purchase-grid">{purchases}</div></section>
      </>}
      {failed.size > 0 && <p role="alert">{old('failed')}</p>}
    </div>
    <footer className="simulations-surface__footer civilization-dock"><ProgressControlsPanel className="civilization-control-panel farming-control-panel ui-progress-controls-panel--production-summary" ariaLabel={old('settings')} expanded={open} controlsId={`${id}-settings`} settingsLabel={old('settings')} onExpandedChange={setOpen} summary={<div className="forager-dock-summary"><div className="forager-dock-progress">{f.phase === 'complete' ? <span>{old('betaEndpoint')}</span> : complete ? <Button variant="purchase" fullWidth disabled={pending.has('finish')} onClick={() => void action('finish', { kind: 'civilization.complete-farming' })}>{old('finish')}</Button> : <div className="forager-catalyst-goal"><CivilizationSymbol resource="catalyst" /><div className="civilization-cycle-progress civilization-cycle-progress--animated"><Progress label={intl.formatMessage(c.nextCatalyst)} value={Math.min(1, f.population / next)} valueText={intl.formatMessage(c.populationGoal, { current: number(f.population), target: number(next) })} /><div className="civilization-cycle-track" aria-hidden="true"><span className="civilization-cycle-fill" style={{ transform: `scaleX(${Math.min(1, f.population / next)})` }} /></div></div><InlineResourceAmount leadingSymbol={<CivilizationSymbol resource="worker" />} value={`${number(f.population)} / ${number(next)}`} /></div>}</div><span className="forager-season-clock" role="img" aria-label={`${seasonName}. ${intl.formatMessage(c.seasonRemaining, { time: seasonTime })}`}><InlineResourceAmount leadingSymbol={<SeasonSymbol season={season} />} value={seasonTime} /></span></div>}>
      <div className="forager-season-details"><strong><SeasonSymbol season={season} /> {seasonName}</strong><span>{seasonTime}</span></div>
      <dl className="civilization-facts"><div><dt>{text('disasterRisk')}</dt><dd>{percent(1 - farmingProtection(f))}</dd></div><div><dt>{text('protection')}</dt><dd>{percent(farmingProtection(f))}</dd></div></dl>
      <dl className="civilization-facts"><div><dt>{text('disasterLoss')}</dt><dd>{lossText}</dd></div><div><dt>{text('production')}</dt><dd>{perMinute(farmingFoodRate(f, speed))}</dd></div><div><dt>{text('consumption')}</dt><dd>{perMinute(farmingFoodUse(f))}</dd></div><div><dt>{text('housing')}</dt><dd>{number(farmingHousing(f))}</dd></div><div><dt>{text('reserve')}</dt><dd>{number(f.resources.food)} / {number(farmingCapacity(f))}</dd></div>{f.lastDisaster && <div><dt>{text('lastEvent')}</dt><dd>{eventText}</dd></div>}{farmingBurials(f) > 0 && <><div><dt>{text('starvation')}</dt><dd>{number(f.starvationDeaths)}</dd></div><div><dt>{text('natural')}</dt><dd>{number(f.naturalDeaths)}</dd></div><div><dt>{text('disasterDeaths')}</dt><dd>{number(f.disasterDeaths)}</dd></div></>}</dl>
      <section className="forager-resource-key"><h3>{intl.formatMessage(readyDysonMessages.resources)}</h3><ul>{(['worker', 'food', 'materials', 'tools', 'land'] as const).map(r => <li key={r}><FarmingSymbol resource={r} />{name(r)}</li>)}<li><FarmingSymbol resource="granary" />{text('reserve')}</li>{farmingBurials(f) > 0 && <li><FarmingSymbol resource="burials" />{text('burials')}</li>}</ul></section>{f.skillRewardPending && <p>{old('pendingSkill')}</p>}
    </ProgressControlsPanel></footer>
  </section>
}
