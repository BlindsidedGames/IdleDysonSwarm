import {
  Fragment,
  useCallback,
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
import type { CanonicalDreamDerivedFacts } from '../../../simulation/canonicalDreamDerivedFacts'
import type { DreamV2TimerPresentationFact } from '../../../simulation/dreamV2'
import type { DreamSpaceAgePurchase } from '../../../simulation/dreamSpaceAge'
import {
  Button,
  CollapsibleSection,
  FacilityCard,
  InlineImageSymbol,
  SettingsIcon,
} from '../../components'
import influenceSymbol from '../../assets/symbol-influence.png'
import strangeMatterSymbol from '../../assets/symbol-strange-matter.png'
import {
  formatGameDuration,
  formatGameEnergyParts,
  formatGameNumber,
  formatGameNumberParts,
  formatNumber,
  type NumericValue,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  comparePresentationNumeric,
  presentationDecimal,
} from '../../presentationNumeric'
import { divideGameDecimals, floorGameDecimal, gameDecimalToNumberChecked, multiplyGameDecimals, subtractGameDecimals } from '../../../math/gameDecimal'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
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

const RESERVOIR_RATE_SMOOTHING = 0.25
const RESERVOIR_IDLE_TIMEOUT_MS = 500

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
  readonly influence: NumericValue
  readonly activeDoubleTimeRate: number
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
  activeDoubleTimeRate,
  spaceAgePurchaseQuantity,
  commandAvailability,
  dispatchPlayer,
}: SimulationsSurfaceProps) {
  const intl = useIntl()
  const reducedMotion = usePrefersReducedMotion()

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
          <span>{renderSimulationText(highlightedNumber(locale, influence))}</span>
        </strong>
      </header>

      <div className="simulations-surface__scroll-region">
        {categoryGroups.map((group) => (
          <SimulationCategoryGroup
            key={group.id}
            group={group}
            reducedMotion={reducedMotion}
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
    <div className="simulation-time-control__header"><strong>{intl.formatMessage(messages.timeMultiplier)}</strong><span>{enabled ? intl.formatMessage(messages.boostRemaining) : intl.formatMessage(messages.offlineTime)}: {formatGameDuration(locale, bankSeconds)}</span>{spaceAgeAvailable && <button type="button" className="simulation-time-control__settings-toggle" aria-label={intl.formatMessage(messages.purchaseSettings)} aria-expanded={purchaseSettingsOpen} onClick={() => onPurchaseSettingsOpenChange(!purchaseSettingsOpen)}><SettingsIcon /></button>}</div>
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
  value: NumericValue,
): SimulationTextModel {
  const parts = formatGameNumberParts(locale, value)
  return {
    parts: [
      { text: parts.value, highlight: true },
      ...(parts.suffix ? [{ text: parts.suffix }] : []),
    ],
  }
}

function numericPositive(value: NumericValue): boolean {
  return comparePresentationNumeric(value, 0) > 0
}

function boundedRatio(numerator: NumericValue, denominator: NumericValue): number {
  if (!numericPositive(denominator)) return 0
  const ratio = divideGameDecimals(
    presentationDecimal(numerator),
    presentationDecimal(denominator),
  )
  if (comparePresentationNumeric(ratio, 1) >= 0) return 1
  return gameDecimalToNumberChecked(ratio, { minimum: 0, maximum: 1 })
}

function boundedPresentationNumber(value: NumericValue, maximum = Number.MAX_VALUE): number {
  if (typeof value === 'number') return Math.min(maximum, Math.max(0, value))
  const decimal = presentationDecimal(value)
  if (comparePresentationNumeric(decimal, maximum) >= 0) return maximum
  return gameDecimalToNumberChecked(decimal, { minimum: 0, maximum })
}

function highlightedEnergy(
  locale: EnabledLocale,
  value: NumericValue,
  unit: 'joules' | 'watts',
): SimulationTextModel {
  const parts = typeof value === 'number'
    ? formatGameEnergyParts(locale, value, unit)
    : { ...formatGameNumberParts(locale, value), unit }
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
  dispatchPlayer,
}: {
  readonly group: SimulationCategoryGroupModel
  readonly reducedMotion: boolean
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
                  reducedMotion={reducedMotion}
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
  reducedMotion,
  headingLevel,
  dispatchPlayer,
}: {
  readonly panel: SimulationPanelModel
  readonly reducedMotion: boolean
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
        <SimulationProgress
          key={item.label}
          progress={item}
          reducedMotion={reducedMotion}
        />
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
                  <dd>{renderSimulationText(detail.value)}</dd>
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
  readonly influence: NumericValue
  readonly cyclePresentation: CyclePresentationMode
  readonly spaceAgePurchaseQuantity: SpaceAgePurchaseQuantity
}): ReadonlyMap<PanelId, SimulationPanelModel> {
  const { intl, locale, facts, progression, cyclePresentation } = input
  const output = new Map<PanelId, SimulationPanelModel>()
  const resources = facts.live.resources
  const production = facts.live.production.ok
    ? facts.live.production.value
    : null
  const display = (value: NumericValue) => formatGameNumber(locale, value)
  const displayRich = (value: NumericValue) => highlightedNumber(locale, value)
  const displayEnergyRich = (
    value: NumericValue,
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
        'inputCostPerConversion' in conversion.housingToVillages ? conversion.housingToVillages.inputCostPerConversion : 10,
      ))
    }
    if (id === 'villages' && conversion) {
      progress.push(conversionProgress(
        intl,
        locale,
        resources.villages,
        'inputCostPerConversion' in conversion.villagesToCities ? conversion.villagesToCities.inputCostPerConversion : 25,
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
      const fraction = education.researchTime > 0
        ? boundedRatio(education.progress, education.researchTime)
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
                      Math.max(0, education.researchTime - boundedPresentationNumber(education.progress, education.researchTime)),
                    ),
                    fraction,
                    showBar: false,
                  }]
                : []),
              {
                label: intl.formatMessage(messages.researchProgress),
                valueText: percentRich(fraction),
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
              Math.max(0, education.researchTime - boundedPresentationNumber(education.progress, education.researchTime)),
            ),
          },
          {
            label: intl.formatMessage(messages.detailCurrentProgress),
            value: percentRich(fraction),
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
              progression.parameters.rocketsPerSpaceFactory,
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
    let recordStoredPanels: NumericValue | undefined
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
        numericPositive(activeThroughput.panelsPerVolley)
          ? activeThroughput.panelsPerVolley
          : BigInt(activeThroughput.shotsPerVolley ?? 10)
      const storedRecord = facts.live.railgun.highestStoredPanels ??
        resources.dysonPanels
      const factoryCycleSeconds = numericPositive(factory.progressPerSecond)
        ? factory.durationSeconds / boundedPresentationNumber(factory.progressPerSecond)
        : 0
      recordStoredPanels = storedRecord
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
          boundedRatio(resources.dysonPanels, nextVolleyTarget),
        reservoir: {
          sample: boundedPresentationNumber(resources.dysonPanels),
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
          numericPositive(activeThroughput.factoryOverdriveMultiplier) ? 1 : 0,
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
        fraction: boundedRatio(resources.railgunCharge, railgun.maximumCharge),
        reservoir: {
          sample: boundedPresentationNumber(resources.railgunCharge),
          formatRate: (ratePerSecond) => formatSimulationMessage(
            intl,
            messages.energyOutput,
            { value: signedHighlightedEnergy(locale, ratePerSecond) },
          ),
        },
      })
      progress.push({
        label: intl.formatMessage(messages.railgunPayload),
        valueText: formatSimulationMessage(intl, messages.railgunPayloadValue, {
          railguns: displayRich(railgun.mechanicalPayload),
          perRound: displayRich(railgun.panelsPerShot),
          rounds: displayRich(railgun.shotsPerVolley),
        }),
        fraction:
          boundedRatio(railgun.mechanicalPayload, railgun.payloadCapacity),
        showBar: false,
      })
      progress.push({
        label: intl.formatMessage(messages.firingProgress),
        valueText: formatSimulationMessage(intl, messages.shotsRemaining, {
          value: displayRich(facts.live.railgun.shotsRemaining),
        }),
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
    const details = spaceAgeDetailRows(id, status, progress, intl)
    output.set(id, {
      id,
      era: 'space-age',
      title: intl.formatMessage(panelTitleMessage(id)),
      count: count !== undefined ? displayRich(count) : undefined,
      status,
      description: intl.formatMessage(panelDescriptionMessage(id)),
      progress,
      details: recordStoredPanels === undefined
        ? details
        : [
            ...details,
            {
              label: intl.formatMessage(messages.recordStoredPanels),
              value: displayRich(recordStoredPanels),
            },
          ],
      action: spaceAgeAction(id, input, display),
    })
  }

  return output
}

function productionProgress(
  timer: Readonly<{currentProgress:number;durationSeconds:number;progressPerSecond:NumericValue;cyclesPerSecond:NumericValue}>,
  presentation: CyclePresentationMode,
  intl: IntlShape,
  display: (value: NumericValue) => SimulationText,
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
          ? boundedRatio(timer.progressPerSecond, timer.durationSeconds)
          : 0,
      active: presentation === 'slow' && numericPositive(timer.progressPerSecond),
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
  timer: DreamTimerProductionFact | DreamV2TimerPresentationFact,
  intl: IntlShape,
  display: (value: NumericValue) => string,
): readonly SimulationDetailRowModel[] {
  const outputs = Object.entries(timer.outputPerCycle)
    .filter(([, amount]) => numericPositive(amount))
  const output = outputs.map(([resource, amount]) =>
    intl.formatMessage(messages.detailOutputPerCycle, {
      value: display(amount),
      resource: intl.formatMessage(panelTitleMessage(resource as PanelId)),
    }),
  ).join(' + ')
  const currentRate = Object.entries(timer.outputPerSecond)
    .filter(([, amount]) => numericPositive(amount))
    .map(([resource, amount]) =>
    intl.formatMessage(messages.detailRatePerSecond, {
      value: display(amount),
      resource: intl.formatMessage(panelTitleMessage(resource as PanelId)),
    }),
  ).join(' + ')
  const speedMultiplier = 'sourceCount' in timer
    ? timer.advanceEnabled
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
    : null

  return [
    { label: intl.formatMessage(messages.detailOutput), value: output },
    {
      label: intl.formatMessage(messages.detailBaseDuration),
      value: intl.formatMessage(messages.detailSeconds, {
        value: display(timer.durationSeconds),
      }),
    },
    ...(speedMultiplier === null ? [] : [{
      label: intl.formatMessage(messages.detailSpeedMultiplier),
      value: speedMultiplier,
    }]),
    {
      label: intl.formatMessage(messages.detailCurrentRate),
      value: currentRate,
    },
  ]
}

function rocketConversionDetailRows(
  conversion: CanonicalDreamDerivedFacts['foundationalInformation']['conversions']['rocketsToSpaceFactories'] | NumericValue,
  intl: IntlShape,
  display: (value: NumericValue) => string,
  v2RocketsPerFactory: NumericValue,
): readonly SimulationDetailRowModel[] {
  const rocketsPerSpaceFactory = typeof conversion === 'object' && 'rocketsPerSpaceFactory' in conversion
    ? conversion.rocketsPerSpaceFactory
    : v2RocketsPerFactory
  const conversions = typeof conversion === 'object' && 'conversions' in conversion
    ? conversion.conversions
    : conversion
  return [
    {
      label: intl.formatMessage(messages.detailConversionRequirement),
      value: intl.formatMessage(messages.detailRocketConversionRequirement, {
        rockets: display(rocketsPerSpaceFactory),
      }),
    },
    {
      label: intl.formatMessage(messages.detailAvailableConversions),
      value: display(conversions),
    },
  ]
}

function spaceAgeDetailRows(
  id: PanelId,
  status: SimulationText,
  progress: readonly SimulationProgressModel[],
  intl: IntlShape,
): readonly SimulationDetailRowModel[] {
  const rows: SimulationDetailRowModel[] = status
    ? [{
        label: intl.formatMessage(
          id === 'swarm-stats'
            ? messages.detailCurrentRate
            : messages.detailCurrentOutput,
        ),
        value: status,
      }]
    : []
  for (const item of progress) {
    rows.push({ label: item.label, value: item.valueText })
  }
  return rows
}

function foundationalAction(
  id: PanelId,
  input: Parameters<typeof createPanelModels>[0],
  display: (value: NumericValue) => string,
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
  const isBoost = purchase.endsWith('-boost')
  const influenceQuote = !isBoost ? preview.selectedInfluenceQuote : undefined
  if (!isBoost && influenceQuote === undefined) return undefined
  const quantity = influenceQuote?.unitsGranted ?? 1
  const cost = influenceQuote?.totalCost ?? preview.cost
  const free = purchase === 'community-boost' &&
    comparePresentationNumeric(cost, 0) === 0
  const label = input.intl.formatMessage(
    free ? messages.freeBoost : isBoost ? messages.boost : messages.purchase,
    {
      quantity: formatWholeQuantity(input.locale, quantity),
      cost: display(cost),
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
    influenceCost: free ? undefined : display(cost),
    accessibleLabel: label.replace('\n', ', '),
    command: { kind: 'dream.purchase-foundational', purchase },
    disabled: !(influenceQuote?.eligible ?? preview.eligible) || !input.commandAvailability.purchaseFoundational,
  }
}

function educationAction(
  educationId: DreamEducationId,
  input: Parameters<typeof createPanelModels>[0],
  display: (value: NumericValue) => string,
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
  display: (value: NumericValue) => string,
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
  const selectedMode = input.spaceAgePurchaseQuantity === 'max'
    ? 'buy-max'
    : input.spaceAgePurchaseQuantity === 1
      ? 'buy-1'
      : input.spaceAgePurchaseQuantity === 10
        ? 'buy-10'
        : input.spaceAgePurchaseQuantity === 50
          ? 'buy-50'
          : 'buy-100'
  const quote = preview.influenceQuotes?.find(
    (candidate) => candidate.requestedMode === selectedMode,
  )
  if (quote === undefined) return undefined
  const label = input.intl.formatMessage(messages.purchase, {
    quantity: formatWholeQuantity(input.locale, quote.unitsGranted),
    cost: display(quote.totalCost),
  })
  return {
    primaryLabel: input.intl.formatMessage(messages.purchaseQuantity, {
      quantity: formatWholeQuantity(input.locale, quote.unitsGranted),
    }),
    influenceCost: display(quote.totalCost),
    accessibleLabel: label.replace('\n', ', '),
    command: {
      kind: 'dream.purchase-space-age',
      purchase,
      quantity: input.spaceAgePurchaseQuantity === 'max'
        ? Number.MAX_SAFE_INTEGER
        : input.spaceAgePurchaseQuantity,
    },
    disabled:
      !quote.eligible ||
      !input.commandAvailability.purchaseSpaceAge,
  }
}

function formatWholeQuantity(
  locale: EnabledLocale,
  value: NumericValue,
): string {
  return typeof value === 'number' || typeof value === 'bigint'
    ? formatNumber(locale, Number(value), { maximumFractionDigits: 0 })
    : formatGameNumber(locale, value)
}

function conversionProgress(
  intl: IntlShape,
  locale: EnabledLocale,
  current: NumericValue,
  required: NumericValue,
): SimulationProgressModel {
  const currentDecimal = presentationDecimal(current)
  const requiredDecimal = presentationDecimal(required)
  const quotient = numericPositive(required)
    ? floorGameDecimal(divideGameDecimals(currentDecimal, requiredDecimal))
    : presentationDecimal(0)
  const remainder = numericPositive(required)
    ? subtractGameDecimals(currentDecimal, multiplyGameDecimals(quotient, requiredDecimal))
    : currentDecimal
  const ratio = boundedRatio(remainder, required)
  return {
    label: intl.formatMessage(messages.conversionProgress),
    valueText: intl.formatMessage(messages.countOfTotal, {
      current: formatGameNumber(locale, remainder),
      total: formatGameNumber(locale, required),
    }),
    fraction: ratio,
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
  timer: DreamTimerProductionFact | DreamV2TimerPresentationFact,
  intl: IntlShape,
  display: (value: NumericValue) => string,
): string {
  const outputs = Object.entries(timer.outputPerSecond)
    .filter(([, amount]) => numericPositive(amount))
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
