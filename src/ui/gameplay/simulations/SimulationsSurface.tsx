import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
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
import { DREAM_PRODUCER_COST_EXPONENT } from '../../../simulation/dreamFoundationalInformation'
import type { CanonicalDreamDerivedFacts } from '../../../simulation/canonicalDreamDerivedFacts'
import {
  DREAM_SPACE_AGE_COST_EXPONENT,
  type DreamSpaceAgePurchase,
} from '../../../simulation/dreamSpaceAge'
import { buyXCost, maxAffordable } from '../../../simulation/transactions'
import {
  Button,
  CollapsibleSection,
  FacilityCard,
  InlineImageSymbol,
  ProgressControlsPanel,
} from '../../components'
import influenceSymbol from '../../assets/symbol-influence.png'
import strangeMatterSymbol from '../../assets/symbol-strange-matter.png'
import {
  formatGameDuration,
  formatGameEnergyParts,
  formatGameNumber,
  formatGameNumberParts,
  formatNumber,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { readyDysonMessages } from '../dyson/messages'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { simulationsMessages as messages } from './messages'
import './simulations.css'

type SimulationsCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'dream.purchase-foundational'
      | 'dream.purchase-space-age'
      | 'dream.start-education'
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

const RESERVOIR_RATE_SMOOTHING = 0.25
const RESERVOIR_IDLE_TIMEOUT_MS = 500
export const SIMULATION_FORMULAS_STORAGE_KEY =
  'idle-dyson-swarm.simulations.show-formulas'

export interface SimulationsCommandAvailability {
  readonly purchaseFoundational: boolean
  readonly purchaseSpaceAge: boolean
  readonly startEducation: boolean
  readonly blackHoleReset: boolean
}

export interface SimulationsSurfaceProps {
  readonly locale: EnabledLocale
  readonly facts: FrontendSimulationsDerivedFacts
  readonly progression: FrontendCanonicalProgression['dream']
  readonly previews: FrontendGameplayPreviews['dream']
  readonly influence: number
  readonly activeDoubleTimeRate: number
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
  readonly onSpaceAgePurchaseQuantityChange?: (
    quantity: SpaceAgePurchaseQuantity,
  ) => void
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
  activeDoubleTimeRate,
  spaceAgePurchaseQuantity,
  onSpaceAgePurchaseQuantityChange = () => undefined,
  commandAvailability,
  dispatchPlayer,
}: SimulationsSurfaceProps) {
  const intl = useIntl()
  const reducedMotion = usePrefersReducedMotion()
  const purchaseSettingsId = useId()
  const [purchaseSettingsOpen, setPurchaseSettingsOpen] = useState(false)
  const [showFormulas, setShowFormulas] = useState(() => {
    try {
      return localStorage.getItem(SIMULATION_FORMULAS_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const updateShowFormulas = (next: boolean): void => {
    setShowFormulas(next)
    try {
      localStorage.setItem(SIMULATION_FORMULAS_STORAGE_KEY, String(next))
    } catch {
      // Device-local presentation persistence must never block gameplay.
    }
  }

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
    cyclePresentation: cyclePresentationForRate(activeDoubleTimeRate),
    spaceAgePurchaseQuantity,
  })
  const categories = createCategories(intl, facts, panels)
  const categoryGroups = createCategoryGroups(
    intl,
    categories,
    highlightedEnergy(locale, facts.live.resources.energy, 'joules'),
  )

  return (
    <section
      className="simulations-surface"
      aria-label={intl.formatMessage(messages.region)}
      data-era={facts.currentEra}
    >
      <div className="simulations-surface__scroll-region">
        {categoryGroups.map((group) => (
          <SimulationCategoryGroup
            key={group.id}
            group={group}
            reducedMotion={reducedMotion}
            showFormulas={showFormulas}
            dispatchPlayer={dispatchPlayer}
          />
        ))}
      </div>

      <footer className="simulations-surface__footer">
        <ProgressControlsPanel
          ariaLabel={intl.formatMessage(readyDysonMessages.purchaseSettings)}
          className="simulations-surface__control-panel"
          expanded={purchaseSettingsOpen}
          controlsId={purchaseSettingsId}
          settingsLabel={intl.formatMessage(readyDysonMessages.purchaseSettings)}
          onExpandedChange={setPurchaseSettingsOpen}
          summary={(
            <div className="simulations-surface__summary">
              <strong>
                {intl.formatMessage(messages.simulation, {
                  value: formatNumber(locale, facts.resets.count, {
                    maximumFractionDigits: 0,
                    useGrouping: false,
                  }),
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
                <span>
                  {renderSimulationText(highlightedNumber(locale, influence))}
                </span>
              </strong>
            </div>
          )}
        >
          <div className="simulations-surface__settings">
            <span className="simulations-surface__settings-title">
              {intl.formatMessage(messages.purchaseAmount)}
            </span>
            <div
              className="simulations-purchase-quantity"
              role="group"
              aria-label={intl.formatMessage(messages.purchaseAmount)}
            >
              {SPACE_AGE_PURCHASE_QUANTITIES.map((quantity) => (
                <button
                  key={quantity}
                  type="button"
                  aria-pressed={spaceAgePurchaseQuantity === quantity}
                  onClick={() => onSpaceAgePurchaseQuantityChange(quantity)}
                >
                  {quantity === 'max'
                    ? intl.formatMessage(messages.buyMax)
                    : intl.formatMessage(messages.buyQuantity, { quantity })}
                </button>
              ))}
            </div>
            <label className="simulations-surface__show-formulas">
              <input
                type="checkbox"
                checked={showFormulas}
                onChange={(event) =>
                  updateShowFormulas(event.currentTarget.checked)
                }
              />
              <span>{intl.formatMessage(messages.showFormulasInline)}</span>
            </label>
          </div>
        </ProgressControlsPanel>
      </footer>
    </section>
  )
}

interface SimulationCategoryModel {
  readonly id: CategoryId
  readonly title: string
  readonly panels: readonly SimulationPanelModel[]
}

interface SimulationCategoryGroupModel {
  readonly id: 'foundational' | 'information' | 'space-age'
  readonly title: string
  readonly status?: SimulationText
  readonly categories: readonly SimulationCategoryModel[]
}

interface SimulationPanelModel {
  readonly id: PanelId
  readonly era: FrontendSimulationEra
  readonly title: string
  readonly count?: SimulationText
  readonly status: SimulationText
  readonly description: string
  readonly complete?: boolean
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
  readonly value: SimulationText
}

interface SimulationProgressModel {
  readonly label: string
  readonly valueText: SimulationText
  readonly fraction: number
  readonly showBar?: boolean
  readonly animation?: {
    readonly normalizedRatePerSecond?: number
    readonly inferRate?: 'increasing' | 'decreasing' | 'either'
    readonly active: boolean
    readonly wraps: boolean
  }
  readonly cycle?: {
    readonly presentation: CyclePresentationMode
    readonly throughputText: SimulationText
  }
  readonly reservoir?: {
    readonly sample: number
    readonly idleTimeoutMs?: number
    readonly formatRate: (ratePerSecond: number) => SimulationText
  }
}

interface SimulationTextPart {
  readonly text: string
  readonly highlight?: boolean
}

interface SimulationTextModel {
  readonly parts: readonly SimulationTextPart[]
}

type SimulationText = string | SimulationTextModel

function renderSimulationText(value: SimulationText): ReactNode {
  if (typeof value === 'string') return value
  return value.parts.map((part, index) => (
    <Fragment key={`${index}:${part.text}`}>
      {part.highlight ? (
        <span className="simulation-numeric-highlight">{part.text}</span>
      ) : part.text}
    </Fragment>
  ))
}

function simulationTextToString(value: SimulationText): string {
  return typeof value === 'string'
    ? value
    : value.parts.map((part) => part.text).join('')
}

function highlightedNumber(
  locale: EnabledLocale,
  value: number | bigint,
): SimulationTextModel {
  const parts = formatGameNumberParts(locale, value)
  return {
    parts: [
      { text: parts.value, highlight: true },
      ...(parts.suffix ? [{ text: parts.suffix }] : []),
    ],
  }
}

function highlightedEnergy(
  locale: EnabledLocale,
  value: number,
  unit: 'joules' | 'watts',
): SimulationTextModel {
  const parts = formatGameEnergyParts(locale, value, unit)
  return {
    parts: [
      { text: parts.value, highlight: true },
      ...(parts.unit ? [{ text: ` ${parts.unit}` }] : []),
    ],
  }
}

function signedHighlightedNumber(
  locale: EnabledLocale,
  value: number,
): SimulationTextModel {
  const magnitude = highlightedNumber(locale, Math.abs(value))
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return {
    parts: [
      ...(sign ? [{ text: sign, highlight: true }] : []),
      ...magnitude.parts,
    ],
  }
}

function signedHighlightedEnergy(
  locale: EnabledLocale,
  value: number,
): SimulationTextModel {
  const magnitude = highlightedEnergy(locale, Math.abs(value), 'watts')
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return {
    parts: [
      ...(sign ? [{ text: sign, highlight: true }] : []),
      ...magnitude.parts,
    ],
  }
}

function joinSimulationText(
  first: SimulationText,
  second: SimulationText,
): SimulationTextModel {
  const parts = (value: SimulationText): readonly SimulationTextPart[] =>
    typeof value === 'string' ? [{ text: value }] : value.parts
  return {
    parts: [...parts(first), { text: ' · ' }, ...parts(second)],
  }
}

function highlightedFormattedNumber(
  value: string,
  suffix = '',
): SimulationTextModel {
  return {
    parts: [
      { text: value, highlight: true },
      ...(suffix ? [{ text: suffix }] : []),
    ],
  }
}

function formatSimulationMessage(
  intl: IntlShape,
  descriptor: MessageDescriptor,
  values: Readonly<Record<string, string | number | SimulationText>>,
): SimulationTextModel {
  const richValues: SimulationText[] = []
  const plainValues: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') {
      plainValues[key] = value
      continue
    }
    const index = richValues.push(value) - 1
    plainValues[key] = `\uE000${index}\uE001`
  }
  const formatted = intl.formatMessage(descriptor, plainValues)
  const parts: SimulationTextPart[] = []
  const marker = /\uE000(\d+)\uE001/g
  let cursor = 0
  for (const match of formatted.matchAll(marker)) {
    const start = match.index ?? 0
    if (start > cursor) parts.push({ text: formatted.slice(cursor, start) })
    const replacement = richValues[Number(match[1])]
    if (typeof replacement === 'string') {
      parts.push({ text: replacement })
    } else if (replacement) {
      parts.push(...replacement.parts)
    }
    cursor = start + match[0].length
  }
  if (cursor < formatted.length) parts.push({ text: formatted.slice(cursor) })
  return { parts }
}

function SimulationCategoryGroup({
  group,
  reducedMotion,
  showFormulas,
  dispatchPlayer,
}: {
  readonly group: SimulationCategoryGroupModel
  readonly reducedMotion: boolean
  readonly showFormulas: boolean
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  return (
    <CollapsibleSection
      className={`simulation-category simulation-category--${group.id}`}
      contentClassName="simulation-category__content"
      defaultExpanded={false}
      storageKey={`simulations.live.${group.id}`}
      ariaLabel={group.title}
      title={
        <span className="simulation-category__title">
          <span>{group.title}</span>
          {group.status ? (
            <span className="simulation-category__status">
              {renderSimulationText(group.status)}
            </span>
          ) : null}
        </span>
      }
    >
      {group.categories.map((category) => (
        <SimulationCategorySubsection
          key={category.id}
          category={category}
          reducedMotion={reducedMotion}
          showFormulas={showFormulas}
          dispatchPlayer={dispatchPlayer}
        />
      ))}
    </CollapsibleSection>
  )
}

function SimulationCategorySubsection({
  category,
  reducedMotion,
  showFormulas,
  dispatchPlayer,
}: {
  readonly category: SimulationCategoryModel
  readonly reducedMotion: boolean
  readonly showFormulas: boolean
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const educationComplete =
    category.id === 'education' &&
    category.panels.length > 0 &&
    category.panels.every((panel) => panel.complete === true)
  const panels = (
    <ol>
      {category.panels.map((panel) => (
        <li key={panel.id}>
          <SimulationPanelCard
            panel={panel}
            reducedMotion={reducedMotion}
            showFormulas={showFormulas}
            headingLevel={category.id === 'education' ? 'h4' : 'h3'}
            dispatchPlayer={dispatchPlayer}
          />
        </li>
      ))}
    </ol>
  )

  if (category.id !== 'education') {
    return (
      <section
        className="simulation-category__subsection"
        data-category={category.id}
      >
        {panels}
      </section>
    )
  }

  return (
    <CollapsibleSection
      key={educationComplete ? 'complete' : 'active'}
      className="simulation-category__subsection simulation-category__subsection--collapsible"
      contentClassName="simulation-category__subsection-content"
      headingLevel="h3"
      storageKey={`simulations.live.education.${educationComplete ? 'complete' : 'active'}`}
      defaultExpanded={!educationComplete}
      ariaLabel={category.title}
      title={(
        <span className="simulation-category__subsection-title">
          <span>{category.title}</span>
          {educationComplete ? (
            <span>{intl.formatMessage(messages.complete)}</span>
          ) : null}
        </span>
      )}
    >
      {panels}
    </CollapsibleSection>
  )
}

function SimulationPanelCard({
  panel,
  reducedMotion,
  showFormulas,
  headingLevel,
  dispatchPlayer,
}: {
  readonly panel: SimulationPanelModel
  readonly reducedMotion: boolean
  readonly showFormulas: boolean
  readonly headingLevel: 'h3' | 'h4'
  readonly dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const statusInline = panel.era === 'space-age' || panel.complete === true
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

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

  const progress = panel.progress.length > 0 ||
    (showFormulas && panel.details.length > 0) ? (
    <div className="simulation-panel-card__progress-content">
      {panel.progress.length > 0 ? (
        <div className="simulation-panel-card__progress-list">
          {panel.progress.map((item) => (
            <SimulationProgress
              key={item.label}
              progress={item}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      ) : null}
      {showFormulas && panel.details.length > 0 ? (
        <dl className="simulation-panel-card__formulae">
          {panel.details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{renderSimulationText(detail.value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  ) : null
  const actions = panel.action ? (
    <div className="simulation-panel-card__actions">
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
    </div>
  ) : null

  return (
      <FacilityCard
        className={`simulation-panel-card simulation-panel-card--${panel.era}${statusInline ? ' simulation-panel-card--inline-status' : ''}${panel.complete ? ' simulation-panel-card--complete' : ''}${panel.action ? '' : ' simulation-panel-card--no-action'}`}
        headingLevel={headingLevel}
        title={
          <>
            <span>{panel.title}</span>
            {panel.count ? (
              <span className="simulation-panel-card__value">
                {renderSimulationText(panel.count)}
              </span>
            ) : null}
            {statusInline && panel.status && panel.id !== 'space-factories' ? (
              <>
                <span
                  className="simulation-panel-card__inline-separator"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className="simulation-panel-card__inline-status">
                  {renderSimulationText(panel.status)}
                </span>
              </>
            ) : null}
          </>
        }
        production={statusInline ? null : renderSimulationText(panel.status)}
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
  )
}

function SimulationProgress({
  progress,
  reducedMotion,
}: {
  readonly progress: SimulationProgressModel
  readonly reducedMotion: boolean
}) {
  const fillRef = useRef<HTMLSpanElement>(null)
  const cycleMode = progress.cycle?.presentation ?? 'slow'
  const reservoirRate = useSmoothedReservoirRate(
    progress.reservoir?.sample,
    progress.reservoir?.idleTimeoutMs,
  )
  const cycleUsesThroughput = progress.cycle !== undefined && cycleMode !== 'slow'
  const baseValueText = cycleUsesThroughput
    ? progress.cycle?.throughputText ?? progress.valueText
    : progress.valueText
  const valueText =
    reservoirRate !== null && progress.reservoir
      ? joinSimulationText(
          baseValueText,
          progress.reservoir.formatRate(reservoirRate),
        )
      : baseValueText
  const fraction = cycleUsesThroughput ? 1 : clampUnit(progress.fraction)
  const presentation = progress.cycle
    ? cycleMode
    : progress.reservoir
      ? 'reservoir'
      : 'static'
  const animation = progress.animation ??
    (progress.reservoir
      ? {
          inferRate: 'increasing' as const,
          active: true,
          wraps: false,
        }
      : undefined)
  useForwardProgressAnimation(fillRef, {
    canonicalProgress: fraction,
    normalizedRatePerSecond:
      animation?.normalizedRatePerSecond,
    inferRate: animation?.inferRate,
    active:
      progress.showBar !== false &&
      presentation !== 'medium' &&
      presentation !== 'fast' &&
      animation?.active === true,
    wraps: animation?.wraps ?? false,
    reducedMotion,
  })
  const style = {
    '--simulation-progress-fraction': fraction,
  } as CSSProperties

  return (
    <div
      className="simulation-progress"
      data-presentation={presentation}
      style={style}
    >
      <span className="simulation-progress__label">{progress.label}</span>
      <span className="simulation-progress__value">
        {renderSimulationText(valueText)}
      </span>
      {progress.showBar === false ? null : (
        <>
          <div className="simulation-progress__track" aria-hidden="true">
            <span
              ref={fillRef}
              className="simulation-progress__fill"
              style={{ transform: `scaleX(${fraction})` }}
            />
          </div>
          <progress
            max={1}
            value={fraction}
            aria-label={progress.label}
            aria-valuetext={simulationTextToString(valueText)}
          >
            {simulationTextToString(valueText)}
          </progress>
        </>
      )}
    </div>
  )
}

type CyclePresentationMode = 'slow' | 'medium' | 'fast'

function cyclePresentationForRate(rate: number): CyclePresentationMode {
  if (rate >= 8) return 'fast'
  if (rate >= 1) return 'medium'
  return 'slow'
}

function useSmoothedReservoirRate(
  sample: number | undefined,
  idleTimeoutMs = RESERVOIR_IDLE_TIMEOUT_MS,
): number | null {
  const previous = useRef<{
    readonly sample: number
    readonly time: number
  } | undefined>(undefined)
  const smoothed = useRef<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    if (sample === undefined || !Number.isFinite(sample)) {
      previous.current = undefined
      smoothed.current = null
      setRate(null)
      return
    }

    const now = Date.now()
    const prior = previous.current
    previous.current = { sample, time: now }
    if (!prior || now <= prior.time) {
      smoothed.current = null
      setRate(null)
      return
    }

    const rawRate = (sample - prior.sample) / ((now - prior.time) / 1_000)
    if (!Number.isFinite(rawRate)) return
    const next = smoothed.current === null
      ? rawRate
      : smoothed.current * (1 - RESERVOIR_RATE_SMOOTHING) +
        rawRate * RESERVOIR_RATE_SMOOTHING
    smoothed.current = Math.abs(next) < 1e-9 ? 0 : next
    setRate(smoothed.current)
  }, [sample])

  useEffect(() => {
    if (sample === undefined || !Number.isFinite(sample)) return
    const idleTimeout = window.setTimeout(() => {
      smoothed.current = 0
      setRate(0)
    }, idleTimeoutMs)
    return () => window.clearTimeout(idleTimeout)
  }, [idleTimeoutMs, sample])

  return rate
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
  spaceAgeEnergy: SimulationText,
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
      status: formatSimulationMessage(intl, messages.energyStored, {
        value: spaceAgeEnergy,
      }),
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
  readonly influence: number
  readonly cyclePresentation: CyclePresentationMode
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
}): ReadonlyMap<PanelId, SimulationPanelModel> {
  const { intl, locale, facts, progression, cyclePresentation } = input
  const output = new Map<PanelId, SimulationPanelModel>()
  const resources = facts.live.resources
  const production = facts.live.production.ok
    ? facts.live.production.value
    : null
  const display = (value: number | bigint) => formatGameNumber(locale, value)
  const displayRich = (value: number | bigint) => highlightedNumber(locale, value)
  const displayEnergyRich = (
    value: number,
    unit: 'joules' | 'watts',
  ) => highlightedEnergy(locale, value, unit)
  const percentRich = (fraction: number) => highlightedFormattedNumber(
    formatNumber(locale, clampUnit(fraction) * 100, {
      maximumFractionDigits: 0,
    }),
    '%',
  )

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
      progress.push(productionProgress(
        timer,
        cyclePresentation,
        intl,
        displayRich,
        percentRich,
      ))
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
        ? displayRich(count)
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
      const fraction = education.complete
        ? 1
        : education.researchTime > 0
          ? education.progress / education.researchTime
          : 0
      const educationStatus = intl.formatMessage(
        education.complete
          ? messages.complete
          : education.active
            ? messages.researching
            : messages.notStarted,
      )
      output.set(id, {
        id,
        era: 'information',
        title: intl.formatMessage(panelTitleMessage(id)),
        status: educationStatus,
        description: intl.formatMessage(educationEffectMessage(educationId)),
        complete: education.complete,
        progress: education.active && !education.complete
          ? [
              {
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
              },
              {
                label: intl.formatMessage(messages.researchProgress),
                valueText: percentRich(fraction),
                fraction,
              },
            ]
          : [],
        details: [],
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
      ? [productionProgress(
          timer,
          cyclePresentation,
          intl,
          displayRich,
          percentRich,
        )]
      : []
    const activeBoost = boostProgress(id, progression, intl, locale)
    if (activeBoost) progress.push(activeBoost)
    output.set(id, {
      id,
      era: 'information',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: typeof count === 'number' || typeof count === 'bigint' ? displayRich(count) : undefined,
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
    let status: SimulationText = count !== undefined
      ? intl.formatMessage(messages.owned, { value: display(count) })
      : ''

    if (id === 'solar' && production) {
      status = formatSimulationMessage(intl, messages.energyOutput, {
        value: displayEnergyRich(
          production.spaceAge.production.energy.solarPerSecond,
          'watts',
        ),
      })
    } else if (id === 'fusion' && production) {
      status = formatSimulationMessage(intl, messages.energyOutput, {
        value: displayEnergyRich(
          production.spaceAge.production.energy.fusionPerSecond,
          'watts',
        ),
      })
    } else if (id === 'space-factories' && production) {
      const factory = production.spaceAge.production.spaceFactory
      const activeThroughput = production.spaceAge.railgun
      const nextVolleyTarget =
        activeThroughput.panelsPerVolley !== undefined &&
        activeThroughput.panelsPerVolley > 0n
          ? activeThroughput.panelsPerVolley
          : BigInt(activeThroughput.shotsPerVolley ?? 10)
      const factoryCycleSeconds = factory.progressPerSecond > 0
        ? factory.durationSeconds / factory.progressPerSecond
        : 0
      progress.push(productionProgress(
        factory,
        cyclePresentation,
        intl,
        displayRich,
        percentRich,
      ), {
        label: intl.formatMessage(messages.storedPanels),
        valueText: formatSimulationMessage(intl, messages.storedPanelsValue, {
          current: displayRich(resources.dysonPanels),
          target: displayRich(nextVolleyTarget),
        }),
        fraction:
          Number(resources.dysonPanels) /
          Math.max(1, Number(nextVolleyTarget)),
        reservoir: {
          sample: Number(resources.dysonPanels),
          idleTimeoutMs: Math.max(
            RESERVOIR_IDLE_TIMEOUT_MS,
            Math.ceil(factoryCycleSeconds * 1_250),
          ),
          formatRate: (ratePerSecond) => formatSimulationMessage(
            intl,
            messages.productionRate,
            { value: signedHighlightedNumber(locale, ratePerSecond) },
          ),
        },
      }, {
        label: intl.formatMessage(messages.factoryOverdrive),
        valueText: activeThroughput.factoryOverdriveActive
          ? formatSimulationMessage(
              intl,
              messages.factoryOverdriveActive,
              {
                multiplier: displayRich(
                  activeThroughput.factoryOverdriveMultiplier,
                ),
                energy: displayEnergyRich(
                  activeThroughput.factoryOverdriveEnergyPerSecond,
                  'watts',
                ),
              },
            )
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
        valueText: formatSimulationMessage(intl, messages.countOfTotal, {
          current: displayEnergyRich(resources.railgunCharge, 'joules'),
          total: displayEnergyRich(railgun.maximumCharge, 'joules'),
        }),
        fraction: resources.railgunCharge / railgun.maximumCharge,
        reservoir: {
          sample: resources.railgunCharge,
          formatRate: (ratePerSecond) => formatSimulationMessage(
            intl,
            messages.energyOutput,
            { value: signedHighlightedEnergy(locale, ratePerSecond) },
          ),
        },
      })
      progress.push({
        label: intl.formatMessage(
          facts.live.railgun.firing
            ? messages.firingProgress
            : messages.nextVolley,
        ),
        valueText: formatSimulationMessage(intl, messages.shotsRemaining, {
          value: displayRich(
            facts.live.railgun.firing
              ? facts.live.railgun.shotsRemaining
              : railgun.shotsPerVolley,
          ),
        }),
        fraction: 0,
        showBar: false,
      })
      progress.push({
        label: intl.formatMessage(messages.railgunPayload),
        valueText: formatSimulationMessage(
          intl,
          messages.railgunPayloadValue,
          {
            railguns: displayRich(railgun.mechanicalPayload),
            perRound: displayRich(railgun.panelsPerShot),
            rounds: displayRich(railgun.shotsPerVolley),
          },
        ),
        fraction: 0,
        showBar: false,
      })
    } else if (id === 'swarm-stats' && production) {
      status = formatSimulationMessage(intl, messages.energyOutput, {
        value: displayEnergyRich(
          production.spaceAge.production.energy.swarmPerSecond,
          'watts',
        ),
      })
    }
    output.set(id, {
      id,
      era: 'space-age',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: count !== undefined ? displayRich(count) : undefined,
      status,
      description: intl.formatMessage(panelDescriptionMessage(id)),
      progress,
      details: [],
      action: spaceAgeAction(id, input, display),
    })
  }

  return output
}

function productionProgress(
  timer: Readonly<Pick<
    DreamTimerProductionFact,
    | 'currentProgress'
    | 'durationSeconds'
    | 'progressPerSecond'
    | 'cyclesPerSecond'
  >>,
  presentation: CyclePresentationMode,
  intl: IntlShape,
  display: (value: number | bigint) => SimulationText,
  percent: (fraction: number) => SimulationText,
): SimulationProgressModel {
  const fraction = timer.durationSeconds > 0
    ? timer.currentProgress / timer.durationSeconds
    : 0
  return {
    label: intl.formatMessage(messages.progress),
    valueText: percent(fraction),
    fraction,
    animation: {
      normalizedRatePerSecond:
        timer.durationSeconds > 0
          ? timer.progressPerSecond / timer.durationSeconds
          : 0,
      active: presentation === 'slow' && timer.progressPerSecond > 0,
      wraps: true,
    },
    cycle: {
      presentation,
      throughputText: formatSimulationMessage(intl, messages.productionRate, {
        value: display(timer.cyclesPerSecond),
      }),
    },
  }
}

function timerDetailRows(
  timer: DreamTimerProductionFact,
  intl: IntlShape,
  display: (value: number | bigint) => string,
): readonly SimulationDetailRowModel[] {
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
    {
      label: intl.formatMessage(messages.detailSpeedMultiplier),
      value: speedMultiplier,
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
  const perBatchQuantity = purchase === 'hunters'
    ? input.progression.huntersPerPurchase
    : purchase === 'gatherers'
      ? input.progression.gatherersPerPurchase
      : 1
  const isBoost = purchase.endsWith('-boost')
  const scalable = purchase === 'hunters' || purchase === 'gatherers'
  const authoredBaseCost = purchase === 'hunters'
    ? Number(input.progression.parameters.hunterCost)
    : purchase === 'gatherers'
      ? Number(input.progression.parameters.gathererCost)
      : Number(preview.cost)
  const baseCost = Number.isFinite(authoredBaseCost) && authoredBaseCost > 0
    ? authoredBaseCost
    : Number(preview.cost)
  const purchasedBatches = scalable
    ? input.progression.purchaseBatches?.[purchase] ?? 0n
    : 0n
  const batches = scalable
    ? resolveSimulationPurchaseQuantity(
        input.spaceAgePurchaseQuantity,
        input.influence,
        baseCost,
        DREAM_PRODUCER_COST_EXPONENT,
        purchasedBatches,
      )
    : 1
  const quantity = typeof perBatchQuantity === 'bigint'
    ? perBatchQuantity * BigInt(batches)
    : perBatchQuantity * batches
  const totalCost = scalable
    ? quoteSimulationPurchaseCost(
        batches,
        baseCost,
        DREAM_PRODUCER_COST_EXPONENT,
        purchasedBatches,
      )
    : preview.cost
  const free = purchase === 'community-boost' && preview.cost === 0
  const label = input.intl.formatMessage(
    free ? messages.freeBoost : isBoost ? messages.boost : messages.purchase,
    {
      quantity: formatWholeQuantity(input.locale, quantity),
      cost: display(totalCost),
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
    influenceCost: free ? undefined : display(totalCost),
    accessibleLabel: label.replace('\n', ', '),
    command: {
      kind: 'dream.purchase-foundational',
      purchase,
      ...(scalable ? { quantity: batches } : {}),
    },
    disabled:
      batches < 1 ||
      totalCost <= 0 ||
      totalCost > input.influence ||
      !preview.eligible ||
      !input.commandAvailability.purchaseFoundational,
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
    const capped = input.facts.resets.blackHole.rewardCapped === true
    const label = capped
      ? input.intl.formatMessage(messages.blackHoleCapped)
      : input.intl.formatMessage(messages.blackHole, {
          reward: display(input.facts.resets.blackHole.requestedReward),
        })
    return {
      primaryLabel: input.intl.formatMessage(messages.blackHoleLabel),
      strangeMatterReward: capped
        ? undefined
        : display(input.facts.resets.blackHole.requestedReward),
      secondaryLabel: capped
        ? input.intl.formatMessage(messages.cappedLabel)
        : undefined,
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
  const purchasedBatches = input.progression.purchaseBatches?.[purchase] ?? 0n
  const authoredBaseCost = Number(
    purchase === 'solar'
      ? input.progression.parameters.solarCost
      : input.progression.parameters.fusionCost,
  )
  const baseCost = Number.isFinite(authoredBaseCost) && authoredBaseCost > 0
    ? authoredBaseCost
    : Number(preview.cost)
  const quantity = resolveSimulationPurchaseQuantity(
    input.spaceAgePurchaseQuantity,
    input.influence,
    baseCost,
    DREAM_SPACE_AGE_COST_EXPONENT,
    purchasedBatches,
  )
  const totalCost = quoteSimulationPurchaseCost(
    quantity,
    baseCost,
    DREAM_SPACE_AGE_COST_EXPONENT,
    purchasedBatches,
  )
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
      totalCost <= 0 ||
      totalCost > input.influence ||
      !preview.eligible ||
      !input.commandAvailability.purchaseSpaceAge,
  }
}

function resolveSimulationPurchaseQuantity(
  selected: SpaceAgePurchaseQuantity,
  influence: number,
  baseCost: number,
  exponent: number,
  purchasedBatches: bigint,
): number {
  if (selected !== 'max') return selected
  if (
    baseCost <= 0 ||
    influence < baseCost ||
    purchasedBatches > BigInt(Number.MAX_SAFE_INTEGER)
  ) return 0
  return Math.min(
    Number.MAX_SAFE_INTEGER,
    Number(maxAffordable(
      influence,
      baseCost,
      exponent,
      Number(purchasedBatches),
    )),
  )
}

function quoteSimulationPurchaseCost(
  batches: number,
  baseCost: number,
  exponent: number,
  purchasedBatches: bigint,
): number {
  if (
    !Number.isSafeInteger(batches) ||
    batches < 1 ||
    purchasedBatches > BigInt(Number.MAX_SAFE_INTEGER)
  ) return 0
  return buyXCost(
    BigInt(batches),
    baseCost,
    exponent,
    Number(purchasedBatches),
  )
}

function formatWholeQuantity(
  locale: EnabledLocale,
  value: number | bigint,
): string {
  return formatNumber(locale, value, { maximumFractionDigits: 0 })
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
    animation: {
      inferRate: 'increasing',
      active: true,
      wraps: true,
    },
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
    animation: {
      inferRate: 'decreasing',
      active: clock > 0,
      wraps: false,
    },
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

function educationEffectMessage(
  id: DreamEducationId,
): MessageDescriptor {
  const map: Record<DreamEducationId, MessageDescriptor> = {
    engineering: messages.engineeringEffect,
    shipping: messages.shippingEffect,
    worldTrade: messages.worldTradeEffect,
    worldPeace: messages.worldPeaceEffect,
    mathematics: messages.mathematicsEffect,
    advancedPhysics: messages.advancedPhysicsEffect,
  }
  return map[id]
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
