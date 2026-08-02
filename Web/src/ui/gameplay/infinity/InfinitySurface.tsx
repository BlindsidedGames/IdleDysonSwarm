import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  FormattedMessage,
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalProgression,
  FrontendCanonicalResources,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type {
  CanonicalInfinityShopItemId,
} from '../../../simulation/canonicalInfinityShop'
import {
  breakInfinityTargetFromPresentationPosition,
  type InfinityProgressFacts,
} from '../../../simulation/infinityCycle'
import infinitySymbol from '../../assets/nav-infinity.png'
import { Button, InlineImageSymbol } from '../../components'
import {
  formatGameNumber,
  formatNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import type {
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import { infinityMessages as messages } from './messages'
import './infinity.css'

type InfinityCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'infinity.purchase-shop-item'
      | 'infinity.set-break-target'
  }
>

export interface InfinityCommandAvailability {
  readonly purchaseShopItem: boolean
  readonly setBreakTarget: boolean
}

export interface InfinitySurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['infinity']
  readonly progression: Pick<FrontendCanonicalProgression, 'infinity'>
  readonly derived: InfinityProgressFacts
  readonly previews: FrontendGameplayPreviews['infinity']
  readonly commandAvailability: InfinityCommandAvailability
  readonly dispatchPlayer: (
    command: InfinityCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

/**
 * Presents the Unity Infinity shop from canonical resources, projections and
 * purchase previews. The surface dispatches intent only; reset progress,
 * prices, prerequisites and rewards remain backend-owned facts.
 */
export function InfinitySurface({
  locale,
  resources,
  progression,
  derived,
  previews,
  commandAvailability,
  dispatchPlayer,
}: InfinitySurfaceProps) {
  const intl = useIntl()
  const progress = Math.max(
    0,
    Math.min(
      1,
      derived.mode === 'break'
        ? derived.breakTargetProgress.fraction
        : derived.progressFraction,
    ),
  )
  const phrase = revealSecretPhrase(
    intl.formatMessage(messages.secretPhraseFull),
    resources.secretsOfTheUniverse,
  )

  return (
    <section
      className="infinity-surface"
      aria-label={intl.formatMessage(messages.region)}
    >
      <header className="infinity-surface__summary">
        <p className="infinity-surface__points">
          <FormattedMessage {...messages.pointsLabel} />
          <span className="infinity-surface__available">
            {formatGameNumber(locale, resources.availablePoints)}
          </span>
          <span className="infinity-surface__spent">
            <FormattedMessage
              {...messages.spentParenthetical}
              values={{
                value: formatGameNumber(
                  locale,
                  resources.spentPoints,
                ),
              }}
            />
          </span>
        </p>

        <p className="infinity-surface__secret">
          <FormattedMessage
            {...messages.secretPhrase}
            values={{ phrase }}
          />
        </p>

        <div className="infinity-surface__progress">
          <div className="infinity-surface__progress-heading">
            <strong>
              {derived.mode === 'break'
                ? intl.formatMessage(messages.botsUntilNextPoint, {
                    value: formatGameNumber(
                      locale,
                      derived.botsRemainingToNextReward,
                    ),
                  })
                : intl.formatMessage(messages.ordinaryProgress)}
            </strong>
            <span>
              {derived.mode === 'break'
                ? `${formatGameNumber(locale, derived.breakTargetProgress.currentReward)}/${formatGameNumber(locale, derived.breakTargetProgress.targetReward)}`
                : intl.formatMessage(messages.progressPercent, {
                    value: formatNumber(locale, progress * 100, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }),
                  })}
            </span>
          </div>
          <div
            className="infinity-surface__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label={intl.formatMessage(
              derived.mode === 'break'
                ? messages.breakProgressAccessible
                : messages.ordinaryProgress,
              {
                target: formatGameNumber(
                  locale,
                  progression.infinity.breakTarget,
                ),
              },
            )}
          >
            <span style={{ inlineSize: `${progress * 100}%` }} />
          </div>
        </div>

        {derived.showRealityWarning ? (
          <p
            className="infinity-surface__warning"
            role="status"
          >
            {intl.formatMessage(messages.realityWarning)}
          </p>
        ) : null}

        {derived.mode === 'break' ? (
          <BreakTargetControl
            locale={locale}
            target={progression.infinity.breakTarget}
            control={previews.breakTarget}
            routeAvailable={
              commandAvailability.setBreakTarget
            }
            dispatchPlayer={dispatchPlayer}
          />
        ) : null}
      </header>

      <div className="infinity-surface__shop">
        {previews.shop.length > 0 ? (
          <ol className="infinity-surface__grid">
            {previews.shop.map((preview) => (
              <li key={preview.itemId}>
                <InfinityShopCard
                  locale={locale}
                  preview={preview}
                  resources={resources}
                  routeAvailable={
                    commandAvailability.purchaseShopItem
                  }
                  dispatchPlayer={dispatchPlayer}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="infinity-surface__empty">
            {intl.formatMessage(messages.empty)}
          </p>
        )}
      </div>
    </section>
  )
}

interface InfinityShopCardProps {
  readonly locale: EnabledLocale
  readonly preview: FrontendGameplayPreviews['infinity']['shop'][number]
  readonly resources: FrontendCanonicalResources['infinity']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: InfinitySurfaceProps['dispatchPlayer']
}

function InfinityShopCard({
  locale,
  preview,
  resources,
  routeAvailable,
  dispatchPlayer,
}: InfinityShopCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const name = itemName(preview.itemId, intl)
  const completed =
    preview.code === 'already-purchased' ||
    preview.code === 'maximum-reached'
  const disabled =
    pending ||
    completed ||
    !preview.eligible ||
    !routeAvailable
  const prerequisite = prerequisiteName(preview.itemId)
  const ownedCount = purchasedCount(preview.itemId, resources)

  const purchase = async (): Promise<void> => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'infinity.purchase-shop-item',
        itemId: preview.itemId,
      })
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <article className="infinity-shop-card">
      <div className="infinity-shop-card__copy">
        <h2>{name}</h2>
        {ownedCount > 0n ? (
          <p className="infinity-shop-card__purchased-count">
            {intl.formatMessage(messages.purchasedCount, {
              value: formatGameNumber(locale, ownedCount),
            })}
          </p>
        ) : null}
        {preview.code === 'prerequisite-not-met' &&
        prerequisite !== null ? (
          <p className="infinity-shop-card__requirement">
            {intl.formatMessage(messages.requires, {
              name: intl.formatMessage(
                itemTitleMessage(prerequisite),
              ),
            })}
          </p>
        ) : null}
        <p>{intl.formatMessage(itemDescriptionMessage(preview.itemId))}</p>
      </div>
      <Button
        className="infinity-shop-card__purchase"
        variant="primary"
        state={pending ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={disabled}
        aria-label={
          completed
            ? `${name}: ${intl.formatMessage(
                preview.code === 'maximum-reached'
                  ? messages.maximumReached
                  : messages.purchased,
              )}`
            : intl.formatMessage(messages.purchaseAccessible, {
                name,
                cost: formatGameNumber(locale, preview.cost),
              })
        }
        onClick={() => void purchase()}
      >
        <span>
          {completed
            ? intl.formatMessage(
                preview.code === 'maximum-reached'
                  ? messages.maximumReached
                  : messages.purchased,
              )
            : intl.formatMessage(messages.purchase)}
        </span>
        {completed ? null : (
          <strong className="infinity-shop-card__cost">
            <InlineImageSymbol
              src={infinitySymbol}
              symbol="infinity-point"
              tint
            />
            <span>{formatGameNumber(locale, preview.cost)}</span>
          </strong>
        )}
      </Button>
      {pending || failed ? (
        <span
          className="infinity-shop-card__feedback"
          role={failed ? 'alert' : 'status'}
        >
          {intl.formatMessage(
            failed
              ? messages.purchaseFailed
              : messages.purchasePending,
            { name },
          )}
        </span>
      ) : null}
    </article>
  )
}

interface BreakTargetControlProps {
  readonly locale: EnabledLocale
  readonly target: bigint
  readonly control: FrontendGameplayPreviews['infinity']['breakTarget']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: InfinitySurfaceProps['dispatchPlayer']
}

function BreakTargetControl({
  locale,
  target,
  control,
  routeAvailable,
  dispatchPlayer,
}: BreakTargetControlProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [draft, setDraft] = useState(control.currentPosition)
  const [failed, setFailed] = useState(false)
  const lastSubmitted = useRef<number | null>(null)

  useEffect(() => {
    setDraft(control.currentPosition)
    lastSubmitted.current = null
  }, [control.currentPosition])

  const parsed = breakInfinityTargetFromPresentationPosition(draft)
  const changed = parsed !== target

  const submit = async (): Promise<void> => {
    if (
      pendingRef.current ||
      !routeAvailable ||
      !changed ||
      !Number.isFinite(draft) ||
      lastSubmitted.current === draft
    ) {
      return
    }
    pendingRef.current = true
    lastSubmitted.current = draft
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'infinity.set-break-target',
        target: parsed,
      })
      const rejected = result.status !== 'accepted'
      setFailed(rejected)
      if (rejected) lastSubmitted.current = null
    } catch {
      lastSubmitted.current = null
      setFailed(true)
    } finally {
      pendingRef.current = false
    }
  }

  return (
    <div className="infinity-break-target">
      <label htmlFor="infinity-break-target-input">
        {intl.formatMessage(messages.breakTarget)}
      </label>
      <input
        id="infinity-break-target-input"
        type="range"
        min={control.minimumPosition}
        max={control.maximumPosition}
        step="any"
        value={draft}
        disabled={!routeAvailable}
        aria-valuetext={intl.formatMessage(messages.breakTargetValue, {
          value: formatGameNumber(locale, parsed),
        })}
        onChange={(event) => {
          setFailed(false)
          setDraft(event.currentTarget.valueAsNumber)
        }}
        onPointerUp={() => void submit()}
        onKeyUp={() => void submit()}
        onBlur={() => void submit()}
      />
      <span className="infinity-break-target__range">
        {intl.formatMessage(messages.breakTargetValue, {
          value: formatGameNumber(locale, parsed),
        })}
      </span>
      {failed ? (
        <span
          className="infinity-break-target__feedback"
          role="alert"
        >
          {intl.formatMessage(messages.breakTargetFailed)}
        </span>
      ) : null}
    </div>
  )
}

function itemName(
  itemId: CanonicalInfinityShopItemId,
  intl: ReturnType<typeof useIntl>,
): string {
  return intl.formatMessage(itemTitleMessage(itemId))
}

function purchasedCount(
  itemId: CanonicalInfinityShopItemId,
  resources: FrontendCanonicalResources['infinity'],
): bigint {
  if (itemId === 'secret') return resources.secretsOfTheUniverse
  if (itemId === 'permanent-skill-point') {
    return resources.permanentSkillPoints
  }
  return 0n
}

function itemTitleMessage(
  itemId: CanonicalInfinityShopItemId,
): MessageDescriptor {
  switch (itemId) {
    case 'secret':
      return messages.secretTitle
    case 'permanent-skill-point':
      return messages.permanentSkillPointTitle
    case 'unlock-research-automation':
      return messages.researchAutomationTitle
    case 'unlock-bot-automation':
      return messages.botAutomationTitle
    case 'retain-assembly-lines':
      return messages.assemblyLinesTitle
    case 'retain-ai-managers':
      return messages.aiManagersTitle
    case 'retain-servers':
      return messages.serversTitle
    case 'retain-data-centers':
      return messages.dataCentersTitle
    case 'retain-planets':
      return messages.planetsTitle
  }
}

function itemDescriptionMessage(
  itemId: CanonicalInfinityShopItemId,
): MessageDescriptor {
  switch (itemId) {
    case 'secret':
      return messages.secretDescription
    case 'permanent-skill-point':
      return messages.permanentSkillPointDescription
    case 'unlock-research-automation':
      return messages.researchAutomationDescription
    case 'unlock-bot-automation':
      return messages.botAutomationDescription
    case 'retain-assembly-lines':
      return messages.assemblyLinesDescription
    case 'retain-ai-managers':
      return messages.aiManagersDescription
    case 'retain-servers':
      return messages.serversDescription
    case 'retain-data-centers':
      return messages.dataCentersDescription
    case 'retain-planets':
      return messages.planetsDescription
  }
}

function prerequisiteName(
  itemId: CanonicalInfinityShopItemId,
): CanonicalInfinityShopItemId | null {
  switch (itemId) {
    case 'retain-ai-managers':
      return 'retain-assembly-lines'
    case 'retain-servers':
      return 'retain-ai-managers'
    case 'retain-data-centers':
      return 'retain-servers'
    case 'retain-planets':
      return 'retain-data-centers'
    default:
      return null
  }
}

const SECRET_REVEAL_ORDER = Object.freeze([
  0, 1, 2, 3, 4,
  6, 7, 8, 9, 10, 11, 12,
  14, 15, 16,
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18,
] as const)

/**
 * Reproduces Unity's presentation-only letter reveal while the canonical
 * secret count remains the sole progression authority.
 */
function revealSecretPhrase(
  localizedPhrase: string,
  secrets: bigint,
): string {
  const separator = localizedPhrase.indexOf(':')
  if (separator < 0) return localizedPhrase
  const prefix = localizedPhrase.slice(0, separator + 1)
  const answer = localizedPhrase.slice(separator + 1).trimStart()
  const visibleCount = Number(
    secrets < 0n ? 0n : secrets > 27n ? 27n : secrets,
  )
  const visible = new Set<number>(
    SECRET_REVEAL_ORDER.slice(0, visibleCount),
  )
  const masked = Array.from(answer, (character, index) =>
    character !== ' ' && !visible.has(index) ? '-' : character,
  ).join('')
  return `${prefix} ${masked}`
}
