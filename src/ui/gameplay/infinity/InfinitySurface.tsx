import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
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
  type InfinityProgressFacts,
} from '../../../simulation/infinityCycle'
import {
  Button,
  BotsSymbol,
  InlineResourceAmount,
  ProgressControlsPanel,
  StableSingleLineText,
} from '../../components'
import {
  InfinityPointAmount,
  InfinityPointSymbol,
} from '../../components/InfinityPointAmount'
import { formatInfinityPointAmount } from '../../components/infinityPointFormatting'
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
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { infinityMessages as messages } from './messages'
import {
  formatAutoInfinityTargetInput,
  parseInfinityTargetInput,
} from './parseInfinityTarget'
import './infinity.css'

type InfinityCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'infinity.purchase-shop-item'
      | 'infinity.set-break-target'
      | 'infinity.set-automatic-reset'
      | 'infinity.request-reset'
  }
>

const INFINITY_GUIDANCE_PRESENTATION_INTERVAL_MILLISECONDS = 250
const INFINITY_VISIBILITY_STORAGE_KEY =
  'idle-dyson-swarm.infinity-visibility.v1'
const INFINITY_AMOUNT_MARKER_PREFIX = '__INFINITY_AMOUNT_'
const BOTS_AMOUNT_MARKER = '__BOTS_AMOUNT__'

export interface InfinityCommandAvailability {
  readonly purchaseShopItem: boolean
  readonly setBreakTarget: boolean
  readonly setAutomaticReset: boolean
  readonly requestReset: boolean
}

export interface InfinitySurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['infinity']
  readonly progression: Pick<FrontendCanonicalProgression, 'infinity'>
  readonly derived: InfinityProgressFacts & Partial<{
    readonly currentIpPerMinute: number
    readonly peakIpPerMinute: number
    readonly peakReward: bigint
  }>
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
  const reducedMotion = usePrefersReducedMotion()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hideMaxed, setHideMaxed] = useState(() => {
    try {
      return localStorage.getItem(INFINITY_VISIBILITY_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const presentedGuidance = useInfinityRateGuidancePresentation({
    currentIpPerMinute: derived.currentIpPerMinute ?? 0,
    peakIpPerMinute: derived.peakIpPerMinute ?? 0,
    peakReward: derived.peakReward ?? 0n,
  })
  const settingsId = useId()
  const progressFillRef = useRef<HTMLSpanElement>(null)
  const progress = Math.max(
    0,
    Math.min(
      1,
      derived.mode === 'break'
        ? derived.breakTargetProgress.fraction
        : derived.progressFraction,
    ),
  )
  const manualResetReady =
    !progression.infinity.automaticResetEnabled &&
    (derived.mode === 'break' ? derived.currentReward >= 1n : progress >= 1)
  const inefficientAutomaticTarget =
    derived.mode === 'break' &&
    progression.infinity.automaticResetEnabled &&
    (derived.peakReward ?? 0n) > 0n &&
    progression.infinity.breakTarget >=
      (derived.peakReward ?? 0n) * 3n
  useForwardProgressAnimation(progressFillRef, {
    canonicalProgress: progress,
    inferRate: 'increasing',
    active: progress < 1,
    wraps: true,
    reducedMotion,
  })
  const phrase = revealSecretPhrase(
    intl.formatMessage(messages.secretPhraseFull),
    resources.secretsOfTheUniverse,
  )
  const visibleShop = previews.shop.filter((preview) =>
    !hideMaxed || !(
      preview.code === 'already-purchased' ||
      preview.code === 'maximum-reached'
    ),
  )

  const updateHideMaxed = (next: boolean): void => {
    setHideMaxed(next)
    try {
      localStorage.setItem(INFINITY_VISIBILITY_STORAGE_KEY, String(next))
    } catch {
      // Device-local presentation persistence must never block gameplay.
    }
  }

  return (
    <section
      className="infinity-surface"
      aria-label={intl.formatMessage(messages.region)}
    >
      <header className="infinity-surface__summary">
        <p className="infinity-surface__points">
          <span className="ui-visually-hidden">
            <FormattedMessage {...messages.pointsLabel} />
          </span>
          <InfinityPointAmount
            className="infinity-surface__available"
            locale={locale}
            value={resources.availablePoints}
          />
          <span className="infinity-surface__spent"><FormattedMessage {...messages.spentParenthetical} values={{ value: formatInfinityPointAmount(locale, resources.spentPoints) }} /></span>
        </p>
        <p className="infinity-surface__secret">
          <FormattedMessage
            {...messages.secretPhrase}
            values={{ phrase }}
          />
        </p>
      </header>

      <div className="infinity-surface__shop">
        {visibleShop.length > 0 ? (
          <ol className="infinity-surface__grid">
            {visibleShop.map((preview) => (
              <li key={preview.itemId}>
                <InfinityShopCard
                  locale={locale}
                  preview={preview}
                  resources={resources}
                  routeAvailable={commandAvailability.purchaseShopItem}
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

      <div className="infinity-surface__control-dock">
        {derived.showRealityWarning ? (
          <p className="infinity-surface__warning" role="status">
            {intl.formatMessage(messages.realityWarning)}
          </p>
        ) : null}
        <ProgressControlsPanel
          ariaLabel={intl.formatMessage(messages.ordinaryProgress)}
          className="infinity-surface__control-panel"
          expanded={settingsOpen}
          controlsId={settingsId}
          settingsLabel={intl.formatMessage(messages.settings)}
          onExpandedChange={setSettingsOpen}
          summary={(
            <div
              className="infinity-surface__progress infinity-surface__progress--manual-action"
            >
              <div className="infinity-surface__progress-heading">
                <strong>
                  {derived.mode === 'break'
                    ? (
                        <span
                          className="infinity-surface__next-point"
                        >
                          <span className="ui-visually-hidden">
                            {intl.formatMessage(
                              messages.botsUntilNextPoint,
                              {
                                value: formatGameNumber(
                                  locale,
                                  derived.botsRemainingToNextReward,
                                ),
                              },
                            )}
                          </span>
                          <span aria-hidden="true">
                            <BotsThresholdSentence
                              locale={locale}
                              value={derived.botsRemainingToNextReward}
                            />
                          </span>
                        </span>
                      )
                    : intl.formatMessage(messages.ordinaryProgress)}
                </strong>
                <span className="infinity-surface__reward-progress">
                  {derived.mode === 'break'
                    ? (
                        <InlineResourceAmount
                          leadingSymbol={<InfinityPointSymbol />}
                          value={`${formatInfinityPointAmount(locale, derived.breakTargetProgress.currentReward)}/${formatInfinityPointAmount(locale, derived.breakTargetProgress.targetReward)}`}
                        />
                      )
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
                    target: formatInfinityPointAmount(
                      locale,
                      progression.infinity.breakTarget,
                    ),
                  },
                )}
              >
                <span
                  ref={progressFillRef}
                  aria-hidden="true"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <ManualInfinityButton
                ready={manualResetReady}
                reward={derived.mode === 'break' ? derived.currentReward : null}
                locale={locale}
                routeAvailable={commandAvailability.requestReset}
                dispatchPlayer={dispatchPlayer}
              />
            </div>
          )}
        >
          <label className="infinity-surface__hide-maxed">
            <input
              type="checkbox"
              checked={hideMaxed}
              onChange={(event) =>
                updateHideMaxed(event.currentTarget.checked)
              }
            />
            <span>{intl.formatMessage(messages.hideMaxed)}</span>
          </label>
          {derived.mode === 'break' && inefficientAutomaticTarget ? (
            <p className="infinity-surface__warning" role="status">
              {intl.formatMessage(messages.automaticTargetWarning)}
            </p>
          ) : null}
          <AutomaticInfinityControl
            enabled={progression.infinity.automaticResetEnabled}
            routeAvailable={commandAvailability.setAutomaticReset}
            dispatchPlayer={dispatchPlayer}
            guidance={
              derived.mode === 'break' ? (
              <div className="infinity-surface__rate-guidance" aria-live="off">
                <span>
                  <InfinityCurrencySentence
                    accessible={intl.formatMessage(messages.currentRate, {
                      value: formatInfinityPointAmount(
                        locale,
                        presentedGuidance.currentIpPerMinute,
                      ),
                    })}
                    amounts={[
                      formatInfinityPointAmount(
                        locale,
                        presentedGuidance.currentIpPerMinute,
                      ),
                    ]}
                    template={intl.formatMessage(messages.currentRate, {
                      value: infinityAmountMarker(0),
                    })}
                  />
                </span>
                <span>
                  <InfinityCurrencySentence
                    accessible={intl.formatMessage(messages.peakRate, {
                      rate: formatInfinityPointAmount(
                        locale,
                        presentedGuidance.peakIpPerMinute,
                      ),
                      reward: formatInfinityPointAmount(
                        locale,
                        presentedGuidance.peakReward,
                      ),
                    })}
                    amounts={[
                      formatInfinityPointAmount(
                        locale,
                        presentedGuidance.peakIpPerMinute,
                      ),
                      formatInfinityPointAmount(
                        locale,
                        presentedGuidance.peakReward,
                      ),
                    ]}
                    template={intl.formatMessage(messages.peakRate, {
                      rate: infinityAmountMarker(0),
                      reward: infinityAmountMarker(1),
                    })}
                  />
                </span>
              </div>
              ) : null
            }
          />
          {derived.mode === 'break' ? (
            <>
              <AutoInfinityTargetControl
                locale={locale}
                target={progression.infinity.breakTarget}
                routeAvailable={
                  commandAvailability.setBreakTarget
                }
                dispatchPlayer={dispatchPlayer}
              />
            </>
          ) : null}
        </ProgressControlsPanel>
      </div>
    </section>
  )
}

function ManualInfinityButton({
  ready,
  reward,
  locale,
  routeAvailable,
  dispatchPlayer,
}: {
  readonly ready: boolean
  readonly reward: bigint | null
  readonly locale: EnabledLocale
  readonly routeAvailable: boolean
  readonly dispatchPlayer: InfinitySurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const requestReset = async (): Promise<void> => {
    if (pending || !ready || !routeAvailable) return
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'infinity.request-reset' })
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="infinity-manual-reset">
      <button
        type="button"
        aria-label={
          reward === null
            ? intl.formatMessage(messages.manualReset)
            : intl.formatMessage(messages.manualResetForReward, {
                value: formatInfinityPointAmount(locale, reward),
              })
        }
        disabled={!routeAvailable || !ready || pending}
        onClick={() => void requestReset()}
      >
        {reward === null ? (
          <StableSingleLineText
            measurement={intl.formatMessage(messages.manualReset)}
            minimumScale={0.58}
          >
            {intl.formatMessage(messages.manualReset)}
          </StableSingleLineText>
        ) : (
          <span>
            <InlineResourceAmount
              className="infinity-manual-reset__reward"
              leadingSymbol={<InfinityPointSymbol />}
              value={formatInfinityPointAmount(locale, reward)}
            />
          </span>
        )}
      </button>
      {failed ? (
        <span role="alert" className="infinity-manual-reset__feedback">
          {intl.formatMessage(messages.manualResetFailed)}
        </span>
      ) : null}
    </span>
  )
}

interface AutomaticInfinityControlProps {
  readonly enabled: boolean
  readonly guidance?: ReactNode
  readonly routeAvailable: boolean
  readonly dispatchPlayer: InfinitySurfaceProps['dispatchPlayer']
}

function AutomaticInfinityControl({
  enabled,
  guidance,
  routeAvailable,
  dispatchPlayer,
}: AutomaticInfinityControlProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [failed, setFailed] = useState(false)

  const toggle = async (): Promise<void> => {
    if (pendingRef.current || !routeAvailable) return
    pendingRef.current = true
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'infinity.set-automatic-reset',
        enabled: !enabled,
      })
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
    }
  }

  return (
    <div className="infinity-automatic-reset">
      <div className="infinity-automatic-reset__copy">
        <span>{intl.formatMessage(messages.automaticReset)}</span>
        {guidance}
      </div>
      <button
        type="button"
        aria-label={`${intl.formatMessage(messages.automaticReset)}: ${intl.formatMessage(
          enabled
            ? messages.automaticResetOn
            : messages.automaticResetOff,
        )}`}
        aria-pressed={enabled}
        disabled={!routeAvailable}
        onClick={() => void toggle()}
      >
        {intl.formatMessage(
          enabled
            ? messages.automaticResetOn
            : messages.automaticResetOff,
        )}
      </button>
      {failed ? (
        <span className="infinity-automatic-reset__feedback" role="alert">
          {intl.formatMessage(messages.automaticResetFailed)}
        </span>
      ) : null}
    </div>
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
              value: formatInfinityPointAmount(locale, ownedCount),
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
                cost: formatInfinityPointAmount(locale, preview.cost),
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
          <InfinityPointAmount
            className="infinity-shop-card__cost"
            locale={locale}
            value={preview.cost}
          />
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

interface AutoInfinityTargetControlProps {
  readonly locale: EnabledLocale
  readonly target: bigint
  readonly routeAvailable: boolean
  readonly dispatchPlayer: InfinitySurfaceProps['dispatchPlayer']
}

function AutoInfinityTargetControl({
  locale,
  target,
  routeAvailable,
  dispatchPlayer,
}: AutoInfinityTargetControlProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  // Editable state stays exact; abbreviated display values are intentionally
  // lossy and must never become the submitted Auto Infinity target.
  const [draft, setDraft] = useState(() =>
    formatAutoInfinityTargetInput(target),
  )
  const [failed, setFailed] = useState(false)
  const [validationReason, setValidationReason] = useState<string | null>(null)
  const lastSubmitted = useRef<string | null>(null)

  useEffect(() => {
    setDraft(formatAutoInfinityTargetInput(target))
    lastSubmitted.current = null
  }, [target])

  const parsed = parseInfinityTargetInput(draft)
  const changed = parsed.ok && parsed.value !== target

  const submit = async (): Promise<void> => {
    if (
      pendingRef.current ||
      !routeAvailable ||
      !changed ||
      lastSubmitted.current === draft
    ) {
      if (!parsed.ok) setValidationReason(parsed.reason)
      return
    }
    pendingRef.current = true
    lastSubmitted.current = draft
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'infinity.set-break-target',
        target: parsed.value,
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
        <span className="ui-visually-hidden">
          {intl.formatMessage(messages.breakTarget)}
        </span>
      </label>
      <span className="infinity-break-target__input-wrap">
        <InfinityPointSymbol />
        <input
          id="infinity-break-target-input"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={draft}
          disabled={!routeAvailable}
          aria-invalid={validationReason !== null}
          aria-describedby="infinity-break-target-help"
          onChange={(event) => {
            setFailed(false)
            setValidationReason(null)
            setDraft(event.currentTarget.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
              event.currentTarget.blur()
            }
          }}
          onBlur={() => void submit()}
        />
      </span>
      <Button
        className="infinity-break-target__submit"
        disabled={!routeAvailable || !changed || pendingRef.current}
        onClick={() => void submit()}
      >
        {intl.formatMessage(messages.setBreakTarget)}
      </Button>
      <span id="infinity-break-target-help" className="infinity-break-target__range">
        <InfinityCurrencySentence
          accessible={intl.formatMessage(messages.breakTargetValue, {
            value: formatInfinityPointAmount(locale, target),
          })}
          amounts={[formatInfinityPointAmount(locale, target)]}
          template={intl.formatMessage(messages.breakTargetValue, {
            value: infinityAmountMarker(0),
          })}
        />
      </span>
      {validationReason !== null ? (
        <span className="infinity-break-target__feedback" role="alert">
          {intl.formatMessage(messages.breakTargetInvalid)}
        </span>
      ) : null}
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

function infinityAmountMarker(index: number): string {
  return `${INFINITY_AMOUNT_MARKER_PREFIX}${index}__`
}

function InfinityCurrencySentence({
  accessible,
  amounts,
  template,
}: {
  readonly accessible: string
  readonly amounts: readonly string[]
  readonly template: string
}) {
  const markerPattern = /(__INFINITY_AMOUNT_\d+__)/gu
  const visibleTemplate = template.replace(
    /\s+(?:IP|PI)(?=\/|\b)/gu,
    '',
  )
  return (
    <>
      <span className="ui-visually-hidden">{accessible}</span>
      <span aria-hidden="true">
        {visibleTemplate.split(markerPattern).map((part) => {
          const match = /^__INFINITY_AMOUNT_(\d+)__$/.exec(part)
          if (match === null) return part
          const index = Number(match[1])
          return (
            <InlineResourceAmount
              className="infinity-point-amount"
              key={part}
              leadingSymbol={<InfinityPointSymbol />}
              value={amounts[index]}
            />
          )
        })}
      </span>
    </>
  )
}

function BotsThresholdSentence({
  locale,
  value,
}: {
  readonly locale: EnabledLocale
  readonly value: number
}) {
  const intl = useIntl()
  const template = intl.formatMessage(messages.nextPointIn, {
    value: BOTS_AMOUNT_MARKER,
  })
  const [before = '', after = ''] = template.split(BOTS_AMOUNT_MARKER)
  return (
    <>
      {before}
      <InlineResourceAmount
        className="infinity-bots-amount"
        leadingSymbol={<BotsSymbol />}
        value={formatGameNumber(locale, value)}
      />
      {after}
    </>
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

interface InfinityRateGuidancePresentation {
  readonly currentIpPerMinute: number
  readonly peakIpPerMinute: number
  readonly peakReward: bigint
}

function useInfinityRateGuidancePresentation(
  guidance: Readonly<InfinityRateGuidancePresentation>,
): InfinityRateGuidancePresentation {
  const latestRef = useRef(guidance)
  latestRef.current = guidance
  const [presented, setPresented] = useState(guidance)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const latest = latestRef.current
      setPresented((current) =>
        current.currentIpPerMinute === latest.currentIpPerMinute &&
        current.peakIpPerMinute === latest.peakIpPerMinute &&
        current.peakReward === latest.peakReward
          ? current
          : latest,
      )
    }, INFINITY_GUIDANCE_PRESENTATION_INTERVAL_MILLISECONDS)
    return () => window.clearInterval(interval)
  }, [])

  return presented
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
