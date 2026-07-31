import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalProgression,
  FrontendGameplayPreviews,
  FrontendSimulationEra,
  FrontendSimulationsDerivedFacts,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type {
  DreamEducationId,
} from '../../../game-state/types'
import type {
  DreamPurchaseCommand,
  DreamTimerId,
  DreamTimerProductionFact,
} from '../../../simulation/dreamFoundationalInformation'
import type { CanonicalDreamDerivedFacts } from '../../../simulation/canonicalDreamDerivedFacts'
import type { DreamSpaceAgePurchase } from '../../../simulation/dreamSpaceAge'
import {
  Button,
  CollapsibleSection,
  FacilityCard,
  InlineImageSymbol,
} from '../../components'
import influenceSymbol from '../../assets/symbol-influence.png'
import strangeMatterSymbol from '../../assets/symbol-strange-matter.png'
import {
  formatGameDuration,
  formatGameNumber,
  formatNumber,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { simulationsMessages as messages } from './messages'
import './simulations.css'

type SimulationsCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'dream.purchase-foundational'
      | 'dream.purchase-space-age'
      | 'dream.start-education'
      | 'time.set-double-time-rate'
      | 'dream.request-black-hole-reset'
  }
>

type PanelId =
  | FrontendSimulationsDerivedFacts['eras']['foundational']['visiblePanelIds'][number]
  | FrontendSimulationsDerivedFacts['eras']['information']['visiblePanelIds'][number]
  | FrontendSimulationsDerivedFacts['eras']['spaceAge']['visiblePanelIds'][number]

type CategoryId =
  | 'foundational'
  | 'information'
  | 'education'
  | 'energy'
  | 'space-age'

export type SpaceAgePurchaseQuantity = 1 | 10 | 50 | 100 | 'max'

const SPACE_AGE_PURCHASE_QUANTITIES = Object.freeze([
  1,
  10,
  50,
  100,
  'max',
] as const satisfies readonly SpaceAgePurchaseQuantity[])

export interface SimulationsCommandAvailability {
  readonly purchaseFoundational: boolean
  readonly purchaseSpaceAge: boolean
  readonly startEducation: boolean
  readonly blackHoleReset: boolean
  readonly setDoubleTimeRate?: boolean
}

export interface SimulationsSurfaceProps {
  readonly locale: EnabledLocale
  readonly facts: FrontendSimulationsDerivedFacts
  readonly progression: FrontendCanonicalProgression['dream']
  readonly previews: FrontendGameplayPreviews['dream']
  readonly influence: bigint
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
  readonly commandAvailability: SimulationsCommandAvailability
  readonly dispatchPlayer: (
    command: SimulationsCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

/**
 * Presents Unity's live Simulation panels. Visibility, production, prices,
 * conversions, research and reset rewards are all published canonical facts;
 * this component only formats them and dispatches player intent.
 */
export function SimulationsSurface({
  locale,
  facts,
  progression,
  previews,
  influence,
  spaceAgePurchaseQuantity,
  commandAvailability,
  dispatchPlayer,
}: SimulationsSurfaceProps) {
  const intl = useIntl()

  if (!facts.live.production.ok) {
    return (
      <section
        className="simulations-surface simulations-surface--unavailable"
        role="alert"
        aria-label={intl.formatMessage(messages.region)}
      >
        {intl.formatMessage(messages.unavailable)}
      </section>
    )
  }

  const panels = createPanelModels({
    intl,
    locale,
    facts,
    progression,
    previews,
    commandAvailability,
    influence,
    spaceAgePurchaseQuantity,
  })
  const categories = createCategories(intl, facts, panels)
  const categoryGroups = createCategoryGroups(intl, categories)

  return (
    <section
      className="simulations-surface"
      aria-label={intl.formatMessage(messages.region)}
      data-era={facts.currentEra}
    >
      <header className="simulations-surface__summary">
        <strong>
          {intl.formatMessage(messages.simulation, {
            value: formatGameNumber(locale, facts.resets.count),
          })}
        </strong>
        <strong
          className="simulations-surface__influence"
          aria-label={intl.formatMessage(messages.influence, {
            value: formatGameNumber(locale, influence),
          })}
        >
          <InlineImageSymbol
            src={influenceSymbol}
            symbol="influence"
            tint
          />
          <span>{formatGameNumber(locale, influence)}</span>
        </strong>
      </header>

      <div className="simulations-surface__scroll-region">
        {categoryGroups.map((group) => (
          <SimulationCategoryGroup
            key={group.id}
            group={group}
            dispatchPlayer={dispatchPlayer}
          />
        ))}
      </div>
    </section>
  )
}

export function SimulationTimeControl({ locale, bankSeconds, rate, enabled, dispatchPlayer, available, spaceAgeAvailable, purchaseSettingsOpen, spaceAgePurchaseQuantity, onPurchaseSettingsOpenChange, onSpaceAgePurchaseQuantityChange }: {
  readonly locale: EnabledLocale
  readonly bankSeconds: number
  readonly rate: number
  readonly enabled: boolean
  readonly available: boolean
  readonly spaceAgeAvailable: boolean
  readonly purchaseSettingsOpen: boolean
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
  readonly onPurchaseSettingsOpenChange: (open: boolean) => void
  readonly onSpaceAgePurchaseQuantityChange: (quantity: SpaceAgePurchaseQuantity) => void
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  return <section className="simulation-time-control" aria-label={intl.formatMessage(messages.timeMultiplier)}>
    <div className="simulation-time-control__header"><strong>{intl.formatMessage(messages.timeMultiplier)}</strong><span>{enabled ? intl.formatMessage(messages.boostRemaining) : intl.formatMessage(messages.offlineTime)}: {formatGameDuration(locale, bankSeconds)}</span>{spaceAgeAvailable && <button type="button" className="simulation-time-control__settings-toggle" aria-label={intl.formatMessage(messages.purchaseSettings)} aria-expanded={purchaseSettingsOpen} onClick={() => onPurchaseSettingsOpenChange(!purchaseSettingsOpen)}><span aria-hidden="true">{'\u2699'}</span></button>}</div>
    <input aria-label={intl.formatMessage(messages.timeMultiplier)} type="range" min="0" max="10" step="1" value={rate} disabled={!available} onChange={(event) => void dispatchPlayer({ kind: 'time.set-double-time-rate', rate: Number(event.currentTarget.value) })} />
    <div className="simulation-time-control__rate">
      <span>
        {intl.formatMessage(messages.simulationSpeedIncreasedBy, {
          value: formatNumber(locale, rate * 100, {
            maximumFractionDigits: 0,
          }),
        })}
      </span>
    </div>
    {spaceAgeAvailable && purchaseSettingsOpen && <div className="simulation-time-control__purchase-settings" role="group" aria-label={intl.formatMessage(messages.purchaseAmount)}>{SPACE_AGE_PURCHASE_QUANTITIES.map((quantity) => <button key={quantity} type="button" aria-pressed={spaceAgePurchaseQuantity === quantity} onClick={() => onSpaceAgePurchaseQuantityChange(quantity)}>{quantity === 'max' ? intl.formatMessage(messages.buyMax) : intl.formatMessage(messages.buyQuantity, { quantity })}</button>)}</div>}
  </section>
}

interface SimulationCategoryModel {
  readonly id: CategoryId
  readonly title: string
  readonly panels: readonly SimulationPanelModel[]
}

interface SimulationCategoryGroupModel {
  readonly id: 'foundational' | 'information' | 'space-age'
  readonly title: string
  readonly categories: readonly SimulationCategoryModel[]
}

interface SimulationPanelModel {
  readonly id: PanelId
  readonly era: FrontendSimulationEra
  readonly title: string
  readonly count?: string
  readonly status: string
  readonly description: string
  readonly progress: readonly SimulationProgressModel[]
  readonly details: readonly SimulationDetailRowModel[]
  readonly action?: {
    readonly primaryLabel: string
    readonly secondaryLabel?: string
    readonly influenceCost?: string
    readonly strangeMatterReward?: string
    readonly accessibleLabel: string
    readonly command: SimulationsCommand
    readonly disabled: boolean
    readonly danger?: boolean
  }
}

interface SimulationDetailRowModel {
  readonly label: string
  readonly value: string
}

interface SimulationProgressModel {
  readonly label: string
  readonly valueText: string
  readonly fraction: number
  readonly showBar?: boolean
}

function SimulationCategoryGroup({
  group,
  dispatchPlayer,
}: {
  readonly group: SimulationCategoryGroupModel
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  return (
    <CollapsibleSection
      className={`simulation-category simulation-category--${group.id}`}
      contentClassName="simulation-category__content"
      defaultExpanded={false}
      storageKey={`simulations.live.${group.id}`}
      title={group.title}
    >
      {group.categories.map((category) => (
        <section
          className="simulation-category__subsection"
          data-category={category.id}
          key={category.id}
        >
          {category.id === 'education' || category.id === 'energy' ? (
            <h3>{category.title}</h3>
          ) : null}
          <ol>
            {category.panels.map((panel) => (
              <li key={panel.id}>
                <SimulationPanelCard
                  panel={panel}
                  headingLevel={
                    category.id === 'education' || category.id === 'energy'
                      ? 'h4'
                      : 'h3'
                  }
                  dispatchPlayer={dispatchPlayer}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </CollapsibleSection>
  )
}

function SimulationPanelCard({
  panel,
  headingLevel,
  dispatchPlayer,
}: {
  readonly panel: SimulationPanelModel
  readonly headingLevel: 'h3' | 'h4'
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const statusInline = panel.era === 'space-age'
  const dialogTitleId = useId()
  const pendingRef = useRef(false)
  const detailsButtonRef = useRef<HTMLButtonElement>(null)
  const detailsDialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const closeDetails = useCallback((): void => {
    setDetailsOpen(false)
    detailsButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!detailsOpen) return
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDetails()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = detailsDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeDetails, detailsOpen])

  const runAction = async (): Promise<void> => {
    if (!panel.action || panel.action.disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer(panel.action.command)
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const progress = (
    <div className="simulation-panel-card__progress-list">
      {panel.progress.map((item) => (
        <SimulationProgress key={item.label} progress={item} />
      ))}
    </div>
  )
  const actions = (
    <div className="simulation-panel-card__actions">
      {panel.action ? (
        <Button
          variant={panel.action.danger ? 'danger' : 'primary'}
          state={pending ? 'pending' : failed ? 'failure' : 'idle'}
          disabled={panel.action.disabled}
          aria-label={panel.action.accessibleLabel}
          onClick={() => void runAction()}
        >
          <span className="simulation-panel-card__action-primary">
            {panel.action.primaryLabel}
          </span>
          {panel.action.influenceCost ? (
            <span className="simulation-panel-card__action-cost">
              <InlineImageSymbol
                src={influenceSymbol}
                className="simulation-panel-card__influence-symbol"
                symbol="influence"
                tint
              />
              <span>{panel.action.influenceCost}</span>
            </span>
          ) : panel.action.strangeMatterReward ? (
            <span className="simulation-panel-card__action-reward">
              <InlineImageSymbol
                src={strangeMatterSymbol}
                symbol="strange-matter"
                tint
              />
              <span>{panel.action.strangeMatterReward}</span>
            </span>
          ) : panel.action.secondaryLabel ? (
            <span className="simulation-panel-card__action-secondary">
              {panel.action.secondaryLabel}
            </span>
          ) : null}
        </Button>
      ) : null}
      <button
        ref={detailsButtonRef}
        type="button"
        className="simulation-panel-card__details"
        onClick={() => setDetailsOpen(true)}
      >
        {intl.formatMessage(messages.details)}
      </button>
    </div>
  )

  return (
    <>
      <FacilityCard
        className={`simulation-panel-card simulation-panel-card--${panel.era}${statusInline ? ' simulation-panel-card--inline-status' : ''}`}
        headingLevel={headingLevel}
        title={
          <>
            <span>{panel.title}</span>
            {panel.count ? (
              <span className="simulation-panel-card__value">
                {panel.count}
              </span>
            ) : null}
            {statusInline ? (
              <>
                <span
                  className="simulation-panel-card__inline-separator"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className="simulation-panel-card__inline-status">
                  {panel.status}
                </span>
              </>
            ) : null}
          </>
        }
        production={statusInline ? null : panel.status}
        description={panel.description}
        progress={progress}
        action={actions}
        feedback={
          failed ? (
            <span role="alert">
              {intl.formatMessage(messages.actionFailed)}
            </span>
          ) : undefined
        }
      />

      {detailsOpen ? (
        <div
          className="simulation-details__backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDetails()
          }}
        >
          <section
            ref={detailsDialogRef}
            className={`simulation-details simulation-details--${panel.era}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <header>
              <h2 id={dialogTitleId}>{panel.title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label={intl.formatMessage(messages.close)}
                onClick={closeDetails}
              >
                <span
                  className="simulation-details__close-icon"
                  aria-hidden="true"
                />
              </button>
            </header>
            <dl className="simulation-details__facts">
              {panel.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </>
  )
}

function SimulationProgress({
  progress,
}: {
  readonly progress: SimulationProgressModel
}) {
  return (
    <div className="simulation-progress">
      <span className="simulation-progress__label">{progress.label}</span>
      <span className="simulation-progress__value">{progress.valueText}</span>
      {progress.showBar === false ? null : (
        <progress
          max={1}
          value={clampUnit(progress.fraction)}
          aria-label={progress.label}
        >
          {progress.valueText}
        </progress>
      )}
    </div>
  )
}

function createCategories(
  intl: IntlShape,
  facts: FrontendSimulationsDerivedFacts,
  panels: ReadonlyMap<PanelId, SimulationPanelModel>,
): SimulationCategoryModel[] {
  const intlPanels = facts.eras.information.visiblePanelIds
  const spacePanels = facts.eras.spaceAge.visiblePanelIds
  const categories: SimulationCategoryModel[] = [
    category(
      'foundational',
      messages.foundational,
      facts.eras.foundational.visiblePanelIds,
      panels,
      intl,
    ),
  ]
  if (facts.eras.information.visible) {
    categories.push(
      category(
        'education',
        messages.education,
        intlPanels.filter(isEducationPanel),
        panels,
        intl,
      ),
      category(
        'information',
        messages.information,
        intlPanels.filter(isInformationProductionPanel),
        panels,
        intl,
      ),
    )
  }
  if (facts.eras.spaceAge.visible) {
    categories.push(
      category(
        'energy',
        messages.energy,
        spacePanels.filter((id) => id === 'solar' || id === 'fusion'),
        panels,
        intl,
      ),
      category(
        'space-age',
        messages.spaceAge,
        spacePanels.filter((id) => id !== 'solar' && id !== 'fusion'),
        panels,
        intl,
      ),
    )
  }
  return categories.filter((entry) => entry.panels.length > 0)
}

function createCategoryGroups(
  intl: IntlShape,
  categories: readonly SimulationCategoryModel[],
): SimulationCategoryGroupModel[] {
  const byId = new Map(categories.map((entry) => [entry.id, entry]))
  const groups: SimulationCategoryGroupModel[] = []
  const foundational = byId.get('foundational')
  if (foundational) {
    groups.push({
      id: 'foundational',
      title: intl.formatMessage(messages.foundational),
      categories: [foundational],
    })
  }

  const information = ['education', 'information']
    .flatMap((id) => {
      const entry = byId.get(id as CategoryId)
      return entry ? [entry] : []
    })
  if (information.length > 0) {
    groups.push({
      id: 'information',
      title: intl.formatMessage(messages.information),
      categories: information,
    })
  }

  const spaceAge = ['energy', 'space-age']
    .flatMap((id) => {
      const entry = byId.get(id as CategoryId)
      return entry ? [entry] : []
    })
  if (spaceAge.length > 0) {
    groups.push({
      id: 'space-age',
      title: intl.formatMessage(messages.spaceAge),
      categories: spaceAge,
    })
  }
  return groups
}

function category(
  id: CategoryId,
  title: MessageDescriptor,
  panelIds: readonly PanelId[],
  panels: ReadonlyMap<PanelId, SimulationPanelModel>,
  intl: IntlShape,
): SimulationCategoryModel {
  const available = panelIds.flatMap((panelId) => {
    const panel = panels.get(panelId)
    return panel ? [panel] : []
  })
  return {
    id,
    title: intl.formatMessage(title),
    panels: available,
  }
}

function createPanelModels(input: {
  readonly intl: IntlShape
  readonly locale: EnabledLocale
  readonly facts: FrontendSimulationsDerivedFacts
  readonly progression: FrontendCanonicalProgression['dream']
  readonly previews: FrontendGameplayPreviews['dream']
  readonly commandAvailability: SimulationsCommandAvailability
  readonly influence: bigint
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
}): ReadonlyMap<PanelId, SimulationPanelModel> {
  const { intl, locale, facts, progression } = input
  const output = new Map<PanelId, SimulationPanelModel>()
  const resources = facts.live.resources
  const production = facts.live.production.ok
    ? facts.live.production.value
    : null
  const display = (value: number | bigint) => formatGameNumber(locale, value)
  const percent = (fraction: number) => intl.formatMessage(messages.percent, {
    value: formatNumber(locale, clampUnit(fraction) * 100, { maximumFractionDigits: 0 }),
  })

  const basicPanels = facts.eras.foundational.visiblePanelIds
  for (const id of basicPanels) {
    const timerId = foundationalTimerId(id)
    const timer = timerId && production
      ? production.foundationalInformation.production.timers[timerId]
      : null
    const count = resources[id as keyof typeof resources]
    const action = foundationalAction(
      id,
      input,
      display,
    )
    const progress: SimulationProgressModel[] = []
    if (timer) {
      const fraction = timer.durationSeconds > 0
        ? timer.currentProgress / timer.durationSeconds
        : 0
      progress.push({
        label: intl.formatMessage(messages.progress),
        valueText: percent(fraction),
        fraction,
      })
    }
    const activeBoost = boostProgress(id, progression, intl, locale)
    if (activeBoost) progress.push(activeBoost)
    const conversion = production?.foundationalInformation.conversions
    if (id === 'housing' && conversion) {
      progress.push(conversionProgress(
        intl,
        locale,
        resources.housing,
        conversion.housingToVillages.inputCostPerConversion,
      ))
    }
    if (id === 'villages' && conversion) {
      progress.push(conversionProgress(
        intl,
        locale,
        resources.villages,
        conversion.villagesToCities.inputCostPerConversion,
      ))
    }
    output.set(id, {
      id,
      era: 'foundational',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: typeof count === 'number' || typeof count === 'bigint'
        ? display(count)
        : undefined,
      status: combinePanelStatus(
        timer
          ? timerProductionStatus(timer, intl, display)
          : intl.formatMessage(messages.owned, {
              value: display(count as number | bigint),
            }),
        boostStatus(id, progression, intl, locale),
      ),
      description: intl.formatMessage(panelDescriptionMessage(id)),
      progress,
      details: timer
        ? timerDetailRows(timer, intl, display)
        : [],
      action,
    })
  }

  for (const id of facts.eras.information.visiblePanelIds) {
    if (isEducationPanel(id)) {
      const educationId = toEducationId(id)
      const education = facts.live.education[educationId]
      const fraction = education.researchTime > 0
        ? education.progress / education.researchTime
        : education.complete ? 1 : 0
      output.set(id, {
        id,
        era: 'information',
        title: intl.formatMessage(panelTitleMessage(id)),
        status: intl.formatMessage(
          education.complete
            ? messages.complete
            : education.active
              ? messages.researching
              : messages.notStarted,
        ),
        description: intl.formatMessage(messages.educationDescription),
        progress: education.complete || education.active
          ? [
              ...(education.active && !education.complete
                ? [{
                    label: intl.formatMessage(messages.timeRemaining),
                    valueText: formatGameDuration(
                      locale,
                      Math.max(
                        0,
                        education.researchTime - education.progress,
                      ),
                    ),
                    fraction,
                    showBar: false,
                  }]
                : []),
              {
                label: intl.formatMessage(messages.researchProgress),
                valueText: percent(fraction),
                fraction,
              },
            ]
          : [],
        details: [
          {
            label: intl.formatMessage(messages.detailBaseDuration),
            value: formatGameDuration(locale, education.researchTime),
          },
          {
            label: intl.formatMessage(messages.detailRemainingDuration),
            value: formatGameDuration(
              locale,
              Math.max(0, education.researchTime - education.progress),
            ),
          },
          {
            label: intl.formatMessage(messages.detailCurrentProgress),
            value: percent(fraction),
          },
        ],
        action: education.complete || education.active
          ? undefined
          : educationAction(educationId, input, display),
      })
      continue
    }

    const timerId = informationTimerId(id)
    const timer = timerId && production
      ? production.foundationalInformation.production.timers[timerId]
      : null
    const count = resources[id as keyof typeof resources]
    const progress: SimulationProgressModel[] = timer
      ? [{
          label: intl.formatMessage(messages.progress),
          valueText: percent(timer.currentProgress / timer.durationSeconds),
          fraction: timer.currentProgress / timer.durationSeconds,
        }]
      : []
    const activeBoost = boostProgress(id, progression, intl, locale)
    if (activeBoost) progress.push(activeBoost)
    output.set(id, {
      id,
      era: 'information',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: typeof count === 'number' || typeof count === 'bigint' ? display(count) : undefined,
      status: combinePanelStatus(
        timer
          ? timerProductionStatus(timer, intl, display)
          : intl.formatMessage(messages.owned, {
              value: display(count as number | bigint),
            }),
        boostStatus(id, progression, intl, locale),
      ),
      description: intl.formatMessage(panelDescriptionMessage(id)),
      progress,
      details: timer
        ? timerDetailRows(timer, intl, display)
        : id === 'rockets' && production
          ? rocketConversionDetailRows(
              production.foundationalInformation.conversions
                .rocketsToSpaceFactories,
              intl,
              display,
            )
          : [],
      action: foundationalAction(id, input, display),
    })
  }

  for (const id of facts.eras.spaceAge.visiblePanelIds) {
    const countKey = id === 'solar'
      ? 'solarPanels'
      : id === 'space-factories'
        ? 'spaceFactories'
        : id === 'railguns'
          ? null
          : id === 'swarm-stats'
            ? 'swarmPanels'
            : 'fusion'
    const count = countKey ? resources[countKey] : undefined
    const progress: SimulationProgressModel[] = []
    let status = count !== undefined
      ? intl.formatMessage(messages.owned, { value: display(count) })
      : intl.formatMessage(messages.energyStored, { value: display(resources.energy) })

    if (id === 'solar' && production) {
      status = intl.formatMessage(messages.energyOutput, {
        value: display(production.spaceAge.production.energy.solarPerSecond),
      })
    } else if (id === 'fusion' && production) {
      status = intl.formatMessage(messages.energyOutput, {
        value: display(production.spaceAge.production.energy.fusionPerSecond),
      })
    } else if (id === 'space-factories' && production) {
      const factory = production.spaceAge.production.spaceFactory
      const activeThroughput = production.spaceAge.railgun
      const fraction = factory.durationSeconds > 0
        ? factory.currentProgress / factory.durationSeconds
        : 0
      progress.push({
        label: intl.formatMessage(messages.progress),
        valueText: percent(fraction),
        fraction,
      }, {
        label: intl.formatMessage(messages.storedPanels),
        valueText: intl.formatMessage(messages.countOfTotal, {
          current: display(resources.dysonPanels),
          total: display(facts.live.dysonPanelCapacity),
        }),
        fraction:
          Number(resources.dysonPanels) /
          Number(facts.live.dysonPanelCapacity),
      }, {
        label: intl.formatMessage(messages.factoryOverdrive),
        valueText: activeThroughput.factoryOverdriveActive
          ? intl.formatMessage(messages.factoryOverdriveActive, {
              multiplier: formatNumber(
                locale,
                activeThroughput.factoryOverdriveMultiplier,
                { maximumFractionDigits: 0 },
              ),
              energy: display(
                activeThroughput.factoryOverdriveEnergyPerSecond,
              ),
            })
          : intl.formatMessage(messages.factoryOverdriveIdle),
        fraction:
          activeThroughput.factoryOverdriveMultiplier /
          Math.max(1, activeThroughput.factoryOverdriveMultiplier),
        showBar: false,
      })
    } else if (id === 'railguns' && production) {
      const railgun = production.spaceAge.railgun
      progress.push({
        label: intl.formatMessage(messages.chargeProgress),
        valueText: intl.formatMessage(messages.countOfTotal, {
          current: display(resources.railgunCharge),
          total: display(railgun.maximumCharge),
        }),
        fraction: resources.railgunCharge / railgun.maximumCharge,
      })
      progress.push({
        label: intl.formatMessage(messages.railgunPayload),
        valueText: intl.formatMessage(messages.railgunPayloadValue, {
          perShot: display(railgun.panelsPerShot),
          perVolley: display(railgun.panelsPerVolley),
        }),
        fraction:
          railgun.mechanicalPayload /
          Math.max(1, railgun.payloadCapacity),
        showBar: false,
      })
      const firingFraction = railgun.shotIntervalSeconds > 0
        ? facts.live.railgun.fireProgress / railgun.shotIntervalSeconds
        : 0
      progress.push({
        label: intl.formatMessage(messages.firingProgress),
        valueText: intl.formatMessage(messages.shotsRemaining, {
          value: display(facts.live.railgun.shotsRemaining),
        }),
        fraction: firingFraction,
      })
    } else if (id === 'swarm-stats' && production) {
      status = intl.formatMessage(messages.energyOutput, {
        value: display(production.spaceAge.production.energy.swarmPerSecond),
      })
    }
    output.set(id, {
      id,
      era: 'space-age',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: count !== undefined ? display(count) : undefined,
      status,
      description: intl.formatMessage(panelDescriptionMessage(id)),
      progress,
      details: spaceAgeDetailRows(id, status, progress, intl),
      action: spaceAgeAction(id, input, display),
    })
  }

  return output
}

function timerDetailRows(
  timer: DreamTimerProductionFact,
  intl: IntlShape,
  display: (value: number | bigint) => string,
): readonly SimulationDetailRowModel[] {
  const outputs = Object.entries(timer.outputPerCycle)
    .filter(([, amount]) => amount > 0)
  const output = outputs.map(([resource, amount]) =>
    intl.formatMessage(messages.detailOutputPerCycle, {
      value: display(amount),
      resource: intl.formatMessage(panelTitleMessage(resource as PanelId)),
    }),
  ).join(' + ')
  const currentRate = Object.entries(timer.outputPerSecond)
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) =>
    intl.formatMessage(messages.detailRatePerSecond, {
      value: display(amount),
      resource: intl.formatMessage(panelTitleMessage(resource as PanelId)),
    }),
  ).join(' + ')
  const speedMultiplier = timer.advanceEnabled
    ? intl.formatMessage(
        timer.multiplierFormula === 'logarithmic-source'
          ? messages.detailLogarithmicMultiplier
          : messages.detailPreparedMultiplier,
        {
          count: display(timer.sourceCount),
          base: display(timer.baseMultiplier),
          global: display(timer.globalMultiplier),
          effective: display(timer.progressPerSecond),
        },
      )
    : intl.formatMessage(messages.detailInactiveMultiplier)

  return [
    { label: intl.formatMessage(messages.detailOutput), value: output },
    {
      label: intl.formatMessage(messages.detailBaseDuration),
      value: intl.formatMessage(messages.detailSeconds, {
        value: display(timer.durationSeconds),
      }),
    },
    {
      label: intl.formatMessage(messages.detailSpeedMultiplier),
      value: speedMultiplier,
    },
    {
      label: intl.formatMessage(messages.detailCurrentRate),
      value: currentRate,
    },
  ]
}

function rocketConversionDetailRows(
  conversion: CanonicalDreamDerivedFacts['foundationalInformation']['conversions']['rocketsToSpaceFactories'],
  intl: IntlShape,
  display: (value: number | bigint) => string,
): readonly SimulationDetailRowModel[] {
  return [
    {
      label: intl.formatMessage(messages.detailConversionRequirement),
      value: intl.formatMessage(messages.detailRocketConversionRequirement, {
        rockets: display(conversion.rocketsPerSpaceFactory),
      }),
    },
    {
      label: intl.formatMessage(messages.detailAvailableConversions),
      value: display(conversion.conversions),
    },
  ]
}

function spaceAgeDetailRows(
  id: PanelId,
  status: string,
  progress: readonly SimulationProgressModel[],
  intl: IntlShape,
): readonly SimulationDetailRowModel[] {
  const rows: SimulationDetailRowModel[] = [{
    label: intl.formatMessage(
      id === 'swarm-stats'
        ? messages.detailCurrentRate
        : messages.detailCurrentOutput,
    ),
    value: status,
  }]
  for (const item of progress) {
    rows.push({ label: item.label, value: item.valueText })
  }
  return rows
}

function foundationalAction(
  id: PanelId,
  input: Parameters<typeof createPanelModels>[0],
  display: (value: number | bigint) => string,
): SimulationPanelModel['action'] {
  const purchase: DreamPurchaseCommand | null =
    id === 'hunters' || id === 'gatherers'
      ? id
      : id === 'community'
        ? 'community-boost'
        : id === 'factories'
          ? 'factories-boost'
          : null
  if (!purchase) return undefined
  const preview = input.previews.foundational.find((item) => item.purchase === purchase)
  if (!preview) return undefined
  const quantity = purchase === 'hunters'
    ? input.progression.huntersPerPurchase
    : purchase === 'gatherers'
      ? input.progression.gatherersPerPurchase
      : 1
  const isBoost = purchase.endsWith('-boost')
  const free = purchase === 'community-boost' && preview.cost === 0n
  const label = input.intl.formatMessage(
    free ? messages.freeBoost : isBoost ? messages.boost : messages.purchase,
    {
      quantity: formatWholeQuantity(input.locale, quantity),
      cost: display(preview.cost),
    },
  )
  return {
    primaryLabel: input.intl.formatMessage(
      isBoost ? messages.boostLabel : messages.purchaseQuantity,
      { quantity: formatWholeQuantity(input.locale, quantity) },
    ),
    secondaryLabel: free
      ? input.intl.formatMessage(messages.freeLabel)
      : undefined,
    influenceCost: free ? undefined : display(preview.cost),
    accessibleLabel: label.replace('\n', ', '),
    command: { kind: 'dream.purchase-foundational', purchase },
    disabled: !preview.eligible || !input.commandAvailability.purchaseFoundational,
  }
}

function educationAction(
  educationId: DreamEducationId,
  input: Parameters<typeof createPanelModels>[0],
  display: (value: number | bigint) => string,
): SimulationPanelModel['action'] {
  const preview = input.previews.education.find((item) => item.educationId === educationId)
  if (!preview) return undefined
  const label = input.intl.formatMessage(messages.start, { cost: display(preview.cost) })
  return {
    primaryLabel: input.intl.formatMessage(messages.startLabel),
    influenceCost: display(preview.cost),
    accessibleLabel: label.replace('\n', ', '),
    command: { kind: 'dream.start-education', educationId },
    disabled: !preview.eligible || !input.commandAvailability.startEducation,
  }
}

function spaceAgeAction(
  id: PanelId,
  input: Parameters<typeof createPanelModels>[0],
  display: (value: number | bigint) => string,
): SimulationPanelModel['action'] {
  if (id === 'swarm-stats') {
    const label = input.intl.formatMessage(messages.blackHole, {
      reward: display(input.facts.resets.blackHole.requestedReward),
    })
    return {
      primaryLabel: input.intl.formatMessage(messages.blackHoleLabel),
      strangeMatterReward: display(
        input.facts.resets.blackHole.requestedReward,
      ),
      accessibleLabel: label.replace('\n', ', '),
      command: { kind: 'dream.request-black-hole-reset' },
      disabled:
        !input.facts.resets.blackHole.eligible ||
        !input.commandAvailability.blackHoleReset,
      danger: true,
    }
  }
  const purchase: DreamSpaceAgePurchase | null = id === 'solar'
    ? 'solar'
    : id === 'fusion'
      ? 'fusion'
      : null
  if (!purchase) return undefined
  const preview = input.previews.spaceAge.find((item) => item.purchase === purchase)
  if (!preview) return undefined
  const quantity = resolveSpaceAgePurchaseQuantity(
    input.spaceAgePurchaseQuantity,
    input.influence,
    preview.cost,
  )
  const totalCost = preview.cost * BigInt(quantity)
  const label = input.intl.formatMessage(messages.purchase, {
    quantity: formatWholeQuantity(input.locale, quantity),
    cost: display(totalCost),
  })
  return {
    primaryLabel: input.intl.formatMessage(messages.purchaseQuantity, {
      quantity: formatWholeQuantity(input.locale, quantity),
    }),
    influenceCost: display(totalCost),
    accessibleLabel: label.replace('\n', ', '),
    command: { kind: 'dream.purchase-space-age', purchase, quantity },
    disabled:
      quantity < 1 ||
      !preview.eligible ||
      !input.commandAvailability.purchaseSpaceAge,
  }
}

function resolveSpaceAgePurchaseQuantity(
  selected: SpaceAgePurchaseQuantity,
  influence: bigint,
  unitCost: bigint,
): number {
  if (selected !== 'max') return selected
  if (unitCost <= 0n || influence < unitCost) return 0
  const affordable = influence / unitCost
  const maximum = BigInt(Number.MAX_SAFE_INTEGER)
  return Number(affordable > maximum ? maximum : affordable)
}

function formatWholeQuantity(
  locale: EnabledLocale,
  value: number | bigint,
): string {
  return formatNumber(locale, Number(value), { maximumFractionDigits: 0 })
}

function conversionProgress(
  intl: IntlShape,
  locale: EnabledLocale,
  current: number,
  required: number,
): SimulationProgressModel {
  const remainder = current % required
  return {
    label: intl.formatMessage(messages.conversionProgress),
    valueText: intl.formatMessage(messages.countOfTotal, {
      current: formatGameNumber(locale, remainder),
      total: formatGameNumber(locale, required),
    }),
    fraction: remainder / required,
  }
}

function boostStatus(
  id: PanelId,
  progression: FrontendCanonicalProgression['dream'],
  intl: IntlShape,
  locale: EnabledLocale,
): string | null {
  void id
  void progression
  void intl
  void locale
  return null
}

function boostProgress(
  id: PanelId,
  progression: FrontendCanonicalProgression['dream'],
  intl: IntlShape,
  locale: EnabledLocale,
): SimulationProgressModel | null {
  const parameters = progression.parameters
  const clock = id === 'community'
    ? parameters.communityBoostClock
    : id === 'factories'
      ? parameters.factoriesBoostClock
      : 0
  const duration = id === 'community'
    ? parameters.communityBoostDuration
    : id === 'factories'
      ? parameters.factoriesBoostDuration
      : 0
  if (clock <= 0 || duration <= 0) return null
  return {
    label: intl.formatMessage(messages.boostRemaining),
    valueText: formatGameDuration(locale, clock),
    fraction: clock / duration,
  }
}

function combinePanelStatus(
  production: string,
  secondary: string | null,
): string {
  return secondary ? `${production} · ${secondary}` : production
}

function timerProductionStatus(
  timer: DreamTimerProductionFact,
  intl: IntlShape,
  display: (value: number | bigint) => string,
): string {
  const outputs = Object.entries(timer.outputPerSecond)
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => {
      return `${display(amount)} ${intl.formatMessage(
        panelTitleMessage(resource as PanelId),
      )}`
    })

  return intl.formatMessage(messages.producing, {
    value: outputs.join(' + '),
  })
}

function foundationalTimerId(id: PanelId): DreamTimerId | null {
  const timerIds: Partial<Record<PanelId, DreamTimerId>> = {
    hunters: 'hunterTimerProgress',
    gatherers: 'gathererTimerProgress',
    community: 'communityTimerProgress',
    housing: 'housingTimerProgress',
    villages: 'villagesTimerProgress',
    workers: 'workersTimerProgress',
    cities: 'citiesTimerProgress',
  }
  return timerIds[id] ?? null
}

function informationTimerId(id: PanelId): DreamTimerId | null {
  return id === 'factories'
    ? 'factoriesTimerProgress'
    : id === 'bots'
      ? 'botsTimerProgress'
      : null
}

function isEducationPanel(id: PanelId): id is
  | 'engineering'
  | 'shipping'
  | 'world-trade'
  | 'world-peace'
  | 'mathematics'
  | 'advanced-physics' {
  return [
    'engineering',
    'shipping',
    'world-trade',
    'world-peace',
    'mathematics',
    'advanced-physics',
  ].includes(id)
}

function isInformationProductionPanel(id: PanelId): boolean {
  return id === 'factories' || id === 'bots' || id === 'rockets'
}

function toEducationId(id: ReturnTypeGuardEducation): DreamEducationId {
  return id === 'world-trade'
    ? 'worldTrade'
    : id === 'world-peace'
      ? 'worldPeace'
      : id === 'advanced-physics'
        ? 'advancedPhysics'
        : id
}

type ReturnTypeGuardEducation =
  | 'engineering'
  | 'shipping'
  | 'world-trade'
  | 'world-peace'
  | 'mathematics'
  | 'advanced-physics'

function panelTitleMessage(id: PanelId): MessageDescriptor {
  const map: Record<PanelId, MessageDescriptor> = {
    hunters: messages.hunters,
    gatherers: messages.gatherers,
    community: messages.community,
    housing: messages.housing,
    villages: messages.villages,
    workers: messages.workers,
    cities: messages.cities,
    engineering: messages.engineering,
    shipping: messages.shipping,
    'world-trade': messages.worldTrade,
    'world-peace': messages.worldPeace,
    mathematics: messages.mathematics,
    'advanced-physics': messages.advancedPhysics,
    factories: messages.factories,
    bots: messages.bots,
    rockets: messages.rockets,
    solar: messages.solar,
    fusion: messages.fusion,
    'space-factories': messages.spaceFactories,
    railguns: messages.railguns,
    'swarm-stats': messages.swarmStats,
  }
  return map[id]
}

function panelDescriptionMessage(id: PanelId): MessageDescriptor {
  if (id === 'hunters') return messages.huntersDescription
  if (id === 'gatherers') return messages.gatherersDescription
  if (id === 'community') return messages.communityDescription
  if (id === 'housing') return messages.housingDescription
  if (id === 'villages') return messages.villagesDescription
  if (id === 'workers') return messages.workersDescription
  if (id === 'cities') return messages.citiesDescription
  if (isEducationPanel(id)) return messages.educationDescription
  if (id === 'factories') return messages.factoriesDescription
  if (id === 'bots') return messages.botsDescription
  if (id === 'rockets') return messages.rocketsDescription
  if (id === 'solar') return messages.solarDescription
  if (id === 'fusion') return messages.fusionDescription
  if (id === 'space-factories') return messages.spaceFactoriesDescription
  if (id === 'railguns') return messages.railgunsDescription
  return messages.swarmStatsDescription
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}
