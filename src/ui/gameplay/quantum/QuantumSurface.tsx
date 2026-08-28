import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalProgression,
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import {
  QUANTUM_BULK_UPGRADE_IDS,
  QUANTUM_CONSTANTS,
  type QuantumUpgradeId,
} from '../../../simulation/quantumUpgrades'
import { Button, ProgressControlsPanel } from '../../components'
import quantumShardsIcon from '../../assets/quantum-shards.png'
import { formatGameNumber, formatNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { AvotationProgress } from './AvotationProgress'
import {
  quantumMessages as messages,
  quantumUpgradeMessages as upgradeMessages,
} from './messages'
import {
  QUANTUM_PURCHASE_QUANTITIES,
  type QuantumPurchaseQuantity,
} from './quantumPurchaseQuantities'
import './quantum.css'

type QuantumCommand = Extract<CanonicalPlayerCommand, { readonly kind: 'quantum.purchase-upgrade' | 'quantum.request-leap' | 'avocado.complete-meditation-step' }>

export interface QuantumCommandAvailability {
  readonly purchaseUpgrade: boolean
  readonly requestLeap: boolean
  readonly completeMeditationStep: boolean
}

export interface QuantumSurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['quantum']
  /** Retained for compatibility; leap progress is rendered by QuantumControlPanel. */
  readonly infinityPoints?: bigint
  /** Quantum Entanglement converts only unspent IP. */
  readonly availableInfinityPoints: bigint
  readonly progression: Pick<FrontendCanonicalProgression, 'quantum' | 'avocado' | 'secretProgress'>
  readonly previews: FrontendGameplayPreviews['quantum']
  readonly meditationPreview: FrontendGameplayPreviews['avocado']['meditation']
  readonly commandAvailability: QuantumCommandAvailability
  readonly dispatchPlayer: (command: QuantumCommand) => Promise<UiRuntimePlayerCommandResult>
  readonly onOpenAvocato?: () => void
  readonly purchaseQuantity?: QuantumPurchaseQuantity
  readonly hideMaxed?: boolean
}

const HOLD_TO_PURCHASE_IDS = new Set<QuantumUpgradeId>(
  QUANTUM_BULK_UPGRADE_IDS,
)
const HOLD_REPEAT_DELAY_MS = 400
const HOLD_REPEAT_INTERVAL_MS = 100
const QUANTUM_AMOUNT_MARKER = '__QUANTUM_SHARD_AMOUNT__'

export function QuantumSurface({
  locale,
  resources,
  availableInfinityPoints,
  progression,
  previews,
  meditationPreview,
  commandAvailability,
  dispatchPlayer,
  onOpenAvocato,
  purchaseQuantity = 1,
  hideMaxed = false,
}: QuantumSurfaceProps) {
  const intl = useIntl()

  return (
    <div className="quantum-surface">
      <header className="quantum-surface__summary">
        <div className="quantum-surface__balance">
          <img className="quantum-surface__shard-icon" src={quantumShardsIcon} alt="" aria-hidden="true" />
          <strong>{intl.formatMessage(messages.shards)}</strong>
          <span>{formatGameNumber(locale, resources.availablePoints)}</span>
          <small>{intl.formatMessage(messages.spent, { value: formatGameNumber(locale, resources.pointsSpent) })}</small>
        </div>
      </header>

      <div className="quantum-surface__content">
        <AvotationProgress
          preview={meditationPreview}
          routeAvailable={commandAvailability.completeMeditationStep}
          dispatchPlayer={dispatchPlayer}
        />

        <QuantumLeapCard
          locale={locale}
          availableInfinityPoints={availableInfinityPoints}
          preview={previews.leap}
          entangled={progression.quantum.unlocks.quantumEntanglement}
          routeAvailable={commandAvailability.requestLeap}
          dispatchPlayer={dispatchPlayer}
        />

        <section className="quantum-surface__catalog" aria-labelledby="quantum-upgrades-heading">
          <h2 id="quantum-upgrades-heading">{intl.formatMessage(messages.upgrades)}</h2>
          <div className="quantum-surface__sections">
            {previews.sections.map((section) => (
              <QuantumUpgradeSection
                key={section.sectionId}
                locale={locale}
                section={section}
                previews={previews.upgrades}
                resources={resources}
                progression={progression}
                routeAvailable={commandAvailability.purchaseUpgrade}
                dispatchPlayer={dispatchPlayer}
                onOpenAvocato={onOpenAvocato}
                purchaseQuantity={purchaseQuantity}
                hideMaxed={hideMaxed}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

interface QuantumUpgradeSectionProps {
  readonly locale: EnabledLocale
  readonly section: FrontendGameplayPreviews['quantum']['sections'][number]
  readonly previews: FrontendGameplayPreviews['quantum']['upgrades']
  readonly resources: FrontendCanonicalResources['quantum']
  readonly progression: Pick<FrontendCanonicalProgression, 'quantum' | 'avocado'>
  readonly routeAvailable: boolean
  readonly dispatchPlayer: QuantumSurfaceProps['dispatchPlayer']
  readonly onOpenAvocato?: () => void
  readonly purchaseQuantity: QuantumPurchaseQuantity
  readonly hideMaxed: boolean
}

function QuantumUpgradeSection({
  locale,
  section,
  previews,
  resources,
  progression,
  routeAvailable,
  dispatchPlayer,
  onOpenAvocato,
  purchaseQuantity,
  hideMaxed,
}: QuantumUpgradeSectionProps) {
  const intl = useIntl()
  const headingId = `quantum-section-${section.sectionId}`
  const heading = section.revealed
    ? intl.formatMessage(sectionMessage(section.sectionId))
    : intl.formatMessage(messages.mystery)

  if (!section.revealed) {
    return (
      <section className="quantum-upgrade-section" aria-labelledby={headingId}>
        <h3 id={headingId}>{heading}</h3>
        <ul className="quantum-surface__grid">
          <li>
            <article
              className="quantum-upgrade-card quantum-upgrade-card--mystery"
              aria-labelledby={headingId}
            >
              <div>
                <p>{revealRequirementMessage(intl, locale, section.revealRequirement)}</p>
              </div>
            </article>
          </li>
        </ul>
      </section>
    )
  }

  const sectionPreviews = section.upgradeIds.flatMap((upgradeId) => {
    const preview = previews.find((item) => item.upgradeId === upgradeId)
    return preview === undefined ? [] : [preview]
  })
  const isCosmic = section.sectionId === 'cosmic-structures'
  const nextMega = isCosmic ? nextMegaPreview(sectionPreviews) : null
  const visiblePreviews = isCosmic
    ? nextMega === null ? [] : [nextMega]
    : sectionPreviews.filter((preview) =>
        !hideMaxed || preview.code !== 'already-maxed',
      )

  if (hideMaxed && isCosmic && nextMega === null) return null
  if (hideMaxed && !isCosmic && visiblePreviews.length === 0) return null

  return (
    <section className="quantum-upgrade-section" aria-labelledby={headingId}>
      <h3 id={headingId}>{heading}</h3>
      <ul className="quantum-surface__grid">
        {isCosmic && visiblePreviews.length === 0 ? (
          <li>
            <article className="quantum-upgrade-card quantum-upgrade-card--complete">
              <div>
                <h4>{intl.formatMessage(messages.allMegaStructures)}</h4>
                <p>{intl.formatMessage(messages.allMegaStructuresDescription)}</p>
              </div>
              <Button disabled>{intl.formatMessage(messages.maxed)}</Button>
            </article>
          </li>
        ) : (
          visiblePreviews.map((preview) => (
            <li key={preview.upgradeId}>
              <QuantumUpgradeCard
                locale={locale}
                preview={preview}
                resources={resources}
                progression={progression}
                routeAvailable={routeAvailable}
                dispatchPlayer={dispatchPlayer}
                onOpenAvocato={onOpenAvocato}
                purchaseQuantity={purchaseQuantity}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

interface QuantumUpgradeCardProps {
  readonly locale: EnabledLocale
  readonly preview: FrontendGameplayPreviews['quantum']['upgrades'][number]
  readonly resources: FrontendCanonicalResources['quantum']
  readonly progression: Pick<FrontendCanonicalProgression, 'quantum' | 'avocado'>
  readonly routeAvailable: boolean
  readonly dispatchPlayer: QuantumSurfaceProps['dispatchPlayer']
  readonly onOpenAvocato?: () => void
  readonly purchaseQuantity: QuantumPurchaseQuantity
}

function QuantumUpgradeCard({ locale, preview, resources, progression, routeAvailable, dispatchPlayer, onOpenAvocato, purchaseQuantity }: QuantumUpgradeCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const name = intl.formatMessage(upgradeMessage(preview.upgradeId, 'Title'))
  const completed = preview.code === 'already-maxed'
  const isAvocato = preview.upgradeId === 'Avocado'
  const isFreeClaim = preview.upgradeId === 'DoubleIP' && preview.cost === 0n
  const repeatable = HOLD_TO_PURCHASE_IDS.has(preview.upgradeId)
  const resolvedQuantity = repeatable
    ? purchaseQuantity === 'max'
      ? preview.cost > 0n ? resources.availablePoints / preview.cost : 0n
      : BigInt(purchaseQuantity)
    : 1n
  const totalCost = preview.cost * resolvedQuantity
  const bulkAffordable = !repeatable || (
    resolvedQuantity > 0n && totalCost <= resources.availablePoints
  )
  const unavailable = completed || !preview.eligible || !routeAvailable || !bulkAffordable
  const disabled = pending || unavailable
  const level = upgradeLevel(locale, preview.upgradeId, resources, progression)

  const purchase = async () => {
    if (unavailable || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'quantum.purchase-upgrade',
        upgradeId: preview.upgradeId,
        ...(repeatable && purchaseQuantity !== 1 ? {
          quantity: purchaseQuantity === 'max'
            ? 'max' as const
            : BigInt(purchaseQuantity),
        } : {}),
      })
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }
  const holdHandlers = usePressAndHoldRepeat(
    repeatable && purchaseQuantity === 1 && !unavailable,
    purchase,
  )

  return (
    <article
      className={`quantum-upgrade-card${completed ? ' quantum-upgrade-card--complete' : ''}`}
      data-quantum-upgrade-id={preview.upgradeId}
    >
      <div>
        <h4>{name}</h4>
        {level !== null && <p className="quantum-upgrade-card__level">{intl.formatMessage(messages.level, { value: level })}</p>}
        <p>{intl.formatMessage(upgradeMessage(preview.upgradeId, 'Description'))}</p>
      </div>
      {isAvocato && completed && onOpenAvocato ? (
        <Button variant="primary" onClick={onOpenAvocato}>{intl.formatMessage(messages.openAvocato)}</Button>
      ) : (
        <Button
          variant="primary"
          state={pending ? 'pending' : failed ? 'failure' : 'idle'}
          disabled={disabled}
          aria-label={completed
            ? intl.formatMessage(messages.maxedUpgrade, { name })
            : isFreeClaim
              ? intl.formatMessage(messages.claimUpgrade, { name })
            : intl.formatMessage(
                repeatable && resolvedQuantity !== 1n
                  ? messages.purchaseBulk
                  : messages.purchase,
                {
                  name,
                  quantity: formatGameNumber(locale, resolvedQuantity),
                  cost: formatGameNumber(locale, totalCost),
                },
              )}
          onClick={holdHandlers.onClick}
          onPointerDown={holdHandlers.onPointerDown}
          onPointerUp={holdHandlers.onPointerUp}
          onPointerCancel={holdHandlers.onPointerCancel}
          onPointerLeave={holdHandlers.onPointerLeave}
          onKeyDown={holdHandlers.onKeyDown}
          onKeyUp={holdHandlers.onKeyUp}
        >
          <span>{completed
            ? intl.formatMessage(messages.maxed)
            : isFreeClaim
              ? intl.formatMessage(messages.claim)
            : repeatable
              ? intl.formatMessage(messages.purchaseQuantity, { quantity: formatGameNumber(locale, resolvedQuantity) })
              : preview.eligible || preview.code === 'insufficient-points'
                ? null
                : intl.formatMessage(messages.unavailable)}</span>
          {!completed && !isFreeClaim && (
            <small>
              <QuantumShardAmount locale={locale} value={totalCost} />
            </small>
          )}
        </Button>
      )}
      {failed && <p className="quantum-upgrade-card__feedback" role="alert">{intl.formatMessage(messages.failed)}</p>}
    </article>
  )
}

export interface QuantumControlPanelProps {
  readonly locale: EnabledLocale
  readonly infinityPoints: bigint
  readonly purchaseSettingsOpen: boolean
  readonly purchaseQuantity: QuantumPurchaseQuantity
  readonly hideMaxed: boolean
  readonly onPurchaseSettingsOpenChange: (open: boolean) => void
  readonly onPurchaseQuantityChange: (quantity: QuantumPurchaseQuantity) => void
  readonly onHideMaxedChange: (hideMaxed: boolean) => void
}

export function QuantumControlPanel({
  locale,
  infinityPoints,
  purchaseSettingsOpen,
  purchaseQuantity,
  hideMaxed,
  onPurchaseSettingsOpenChange,
  onPurchaseQuantityChange,
  onHideMaxedChange,
}: QuantumControlPanelProps) {
  const intl = useIntl()
  const required = QUANTUM_CONSTANTS.infinityPointsPerQuantumPoint
  const current = infinityPoints < required ? infinityPoints : required
  const progress = Number(current) / Number(required)
  const available = infinityPoints >= required

  return (
    <ProgressControlsPanel
      ariaLabel={intl.formatMessage(messages.progress)}
      className="quantum-control-panel"
      expanded={purchaseSettingsOpen}
      controlsId="quantum-purchase-settings"
      settingsLabel={intl.formatMessage(messages.purchaseSettings)}
      onExpandedChange={onPurchaseSettingsOpenChange}
      summary={(
        <div className="quantum-control-panel__progress-copy">
          <div className="quantum-control-panel__progress-heading">
            <strong>{intl.formatMessage(messages.progress)}</strong>
            {!available ? (
              <span>
                {intl.formatMessage(messages.progressValue, {
                  current: formatGameNumber(locale, infinityPoints),
                  required: formatGameNumber(locale, required),
                })}
              </span>
            ) : null}
          </div>
          <span className="quantum-surface__track" role="progressbar" aria-label={intl.formatMessage(messages.progress)} aria-valuemin={0} aria-valuemax={42} aria-valuenow={Number(current)}>
            <span style={{ inlineSize: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
          </span>
        </div>
      )}
    >
        <label className="quantum-control-panel__hide-maxed">
          <input
            type="checkbox"
            checked={hideMaxed}
            onChange={(event) => onHideMaxedChange(event.currentTarget.checked)}
          />
          <span>{intl.formatMessage(messages.hideMaxed)}</span>
        </label>
        <div className="quantum-control-panel__purchase-settings" role="group" aria-label={intl.formatMessage(messages.purchaseAmount)}>
          {QUANTUM_PURCHASE_QUANTITIES.map((quantity) => (
            <button
              key={quantity}
              type="button"
              aria-pressed={purchaseQuantity === quantity}
              onClick={() => onPurchaseQuantityChange(quantity)}
            >{quantity === 'max'
              ? intl.formatMessage(messages.buyMax)
              : intl.formatMessage(messages.buyQuantity, { quantity })}</button>
          ))}
        </div>
    </ProgressControlsPanel>
  )
}

function usePressAndHoldRepeat(
  enabled: boolean,
  action: () => Promise<void>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdingRef = useRef(false)
  const repeatedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const enabledRef = useRef(enabled)
  const actionRef = useRef(action)
  enabledRef.current = enabled
  actionRef.current = action

  const clearTimer = () => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const schedule = (delay: number) => {
    clearTimer()
    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      if (!holdingRef.current || !enabledRef.current) return
      repeatedRef.current = true
      await actionRef.current()
      if (holdingRef.current && enabledRef.current) {
        schedule(HOLD_REPEAT_INTERVAL_MS)
      }
    }, delay)
  }

  const begin = () => {
    if (!enabledRef.current || holdingRef.current) return
    holdingRef.current = true
    repeatedRef.current = false
    suppressClickRef.current = false
    schedule(HOLD_REPEAT_DELAY_MS)
  }

  const end = () => {
    if (!holdingRef.current) return
    holdingRef.current = false
    clearTimer()
    if (repeatedRef.current) suppressClickRef.current = true
  }

  useEffect(() => {
    // A pending purchase disables the button. Browsers are not required to
    // deliver the matching pointerup to a disabled control, so also observe
    // release outside the control to prevent a completed dispatch from
    // restarting a hold the player has already ended.
    const endGlobalHold = () => {
      if (!holdingRef.current) return
      holdingRef.current = false
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (repeatedRef.current) suppressClickRef.current = true
    }
    window.addEventListener('pointerup', endGlobalHold)
    window.addEventListener('pointercancel', endGlobalHold)
    window.addEventListener('blur', endGlobalHold)
    return () => {
      window.removeEventListener('pointerup', endGlobalHold)
      window.removeEventListener('pointercancel', endGlobalHold)
      window.removeEventListener('blur', endGlobalHold)
      holdingRef.current = false
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    onClick: () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      void actionRef.current()
    },
    onPointerDown: begin,
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) begin()
    },
    onKeyUp: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') end()
    },
  }
}

interface QuantumLeapCardProps {
  readonly locale: EnabledLocale
  readonly availableInfinityPoints: bigint
  readonly preview: FrontendGameplayPreviews['quantum']['leap']
  readonly entangled: boolean
  readonly routeAvailable: boolean
  readonly dispatchPlayer: QuantumSurfaceProps['dispatchPlayer']
}

function QuantumLeapCard({ locale, availableInfinityPoints, preview, entangled, routeAvailable, dispatchPlayer }: QuantumLeapCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const reward = availableInfinityPoints / QUANTUM_CONSTANTS.infinityPointsPerQuantumPoint
  const disabled = pending || !preview.eligible || !routeAvailable

  const leap = async () => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'quantum.request-leap' })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <article className="quantum-leap-card">
      <div>
        <h2>{intl.formatMessage(messages.leap)}</h2>
        <p>{intl.formatMessage(entangled ? messages.leapEntanglementDescription : messages.leapResetDescription)}</p>
      </div>
      {confirming && !entangled ? (
        <div className="quantum-leap-card__confirm">
          <Button variant="primary" state={pending ? 'pending' : failed ? 'failure' : 'idle'} disabled={disabled} onClick={() => void leap()}>{intl.formatMessage(messages.confirmLeap)}</Button>
          <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</Button>
        </div>
      ) : (
        <Button
          variant="primary"
          disabled={disabled}
          aria-label={entangled
            ? intl.formatMessage(messages.leapFor, { value: formatGameNumber(locale, reward) })
            : undefined}
          onClick={() => entangled ? void leap() : setConfirming(true)}
        >
          {entangled ? (
            <QuantumShardSentence
              locale={locale}
              value={reward}
              template={intl.formatMessage(messages.leapFor, { value: QUANTUM_AMOUNT_MARKER })}
            />
          ) : intl.formatMessage(messages.engageLeap)}
        </Button>
      )}
      {failed && <p className="quantum-leap-card__feedback" role="alert">{intl.formatMessage(messages.failed)}</p>}
    </article>
  )
}

function QuantumShardAmount({ locale, value }: { readonly locale: EnabledLocale; readonly value: bigint }) {
  return (
    <span className="quantum-shard-amount">
      <span
        className="quantum-shard-amount__icon"
        style={{ maskImage: `url(${quantumShardsIcon})` }}
        aria-hidden="true"
      />
      <span>{formatGameNumber(locale, value)}</span>
    </span>
  )
}

function QuantumShardSentence({ locale, value, template }: {
  readonly locale: EnabledLocale
  readonly value: bigint
  readonly template: string
}) {
  const [before = '', rawAfter = ''] = template.split(QUANTUM_AMOUNT_MARKER)
  const after = rawAfter.replace(/^\s*QS\b/, '')

  return (
    <span className="quantum-shard-sentence">
      {before}
      <QuantumShardAmount locale={locale} value={value} />
      {after}
    </span>
  )
}

function nextMegaPreview(upgrades: FrontendGameplayPreviews['quantum']['upgrades']) {
  for (const id of ['MatrioshkaBrains', 'BirchPlanets', 'GalacticBrains'] as const) {
    const preview = upgrades.find((item) => item.upgradeId === id)
    if (preview && preview.code !== 'already-maxed') return preview
  }
  return null
}

function sectionMessage(
  sectionId: FrontendGameplayPreviews['quantum']['sections'][number]['sectionId'],
): MessageDescriptor {
  switch (sectionId) {
    case 'core':
      return messages.coreSection
    case 'skill-paths':
      return messages.skillPathsSection
    case 'boosters':
      return messages.boostersSection
    case 'cosmic-structures':
      return messages.cosmicStructuresSection
    case 'avocato':
      return messages.avocatoSection
  }
}

function revealRequirementMessage(
  intl: IntlShape,
  locale: EnabledLocale,
  requirement: FrontendGameplayPreviews['quantum']['sections'][number]['revealRequirement'],
): string {
  if (requirement === null) return ''
  if (requirement.kind === 'points-earned') {
    return intl.formatMessage(messages.revealPoints, {
      value: formatGameNumber(locale, requirement.value),
    })
  }
  return intl.formatMessage(messages.revealUpgrade, {
    name: intl.formatMessage(upgradeMessage(requirement.upgradeId, 'Title')),
  })
}

function upgradeMessage(id: QuantumUpgradeId, suffix: 'Title' | 'Description'): MessageDescriptor {
  return upgradeMessages[`${id}${suffix}` as keyof typeof upgradeMessages]
}

function upgradeLevel(locale: EnabledLocale, id: QuantumUpgradeId, resources: FrontendCanonicalResources['quantum'], progression: Pick<FrontendCanonicalProgression, 'quantum' | 'avocado'>): string | null {
  let value: bigint | null = null
  if (id === 'Secrets') value = resources.permanentSecrets / QUANTUM_CONSTANTS.secretsPerPurchase
  else if (id === 'Division') value = progression.quantum.divisionsPurchased
  else if (id === 'InfluenceSpeed') value = resources.influenceSpeedBonus / QUANTUM_CONSTANTS.influenceSpeedPerPurchase
  else if (id === 'CashBonus') value = resources.cashBonusLevels
  else if (id === 'ScienceBonus') value = resources.scienceBonusLevels
  return value === null ? null : formatNumber(locale, value, { maximumFractionDigits: 0 })
}
