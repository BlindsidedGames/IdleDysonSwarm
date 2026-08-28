import { useId, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  UiRuntimeDevelopmentAction,
  UiRuntimeDevelopmentControls,
} from '../../runtime'
import { formatGameNumber } from '../../i18n/formatters'
import {
  parseGameNumberInput,
  toContinuousGameNumber,
  toDiscreteGameNumber,
} from '../../i18n/gameNumberInput'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { DISCRETE_MAXIMUM } from '../../../simulation/numeric'
import { debugSurfaceMessages as messages } from './messages'
import './debugSurface.css'

export interface DebugSurfaceProps {
  readonly development: UiRuntimeDevelopmentControls
  readonly locale: EnabledLocale
  readonly initialDraft?: Readonly<DebugSurfaceDraft>
  readonly onDraftChange?: (draft: Readonly<DebugSurfaceDraft>) => void
}

export interface DebugSurfaceDraft {
  readonly amount: string
  readonly preset: string
}

type OperationStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'success'; readonly message: string }
  | { readonly kind: 'failure'; readonly message: string }

const BOT_PRESETS = [
  { id: 'early', bots: 10 },
  { id: 'facilities', bots: 1_000 },
  { id: 'star', bots: 20_000 },
  { id: 'galaxy', bots: 200_000 },
  { id: 'deep-field', bots: 2e47 },
] as const

function clampAmountDraftToContinuousMaximum(value: string): string {
  const parsed = parseGameNumberInput(value)
  return parsed.ok && !toContinuousGameNumber(parsed.value).ok
    ? Number.MAX_VALUE.toString()
    : value
}

/**
 * Ports Unity's live Debug Options panel while delegating every mutation and
 * simulated-time request to the browser runtime's lifecycle-owned boundary.
 */
export function DebugSurface({
  development,
  locale,
  initialDraft,
  onDraftChange,
}: DebugSurfaceProps) {
  const intl = useIntl()
  const amountId = useId()
  const amountFeedbackId = useId()
  const presetId = useId()
  const [amount, setAmount] = useState(() =>
    clampAmountDraftToContinuousMaximum(initialDraft?.amount ?? '1'))
  const [preset, setPreset] = useState(() => initialDraft?.preset ?? 'early')
  const [operation, setOperation] = useState<OperationStatus>({
    kind: 'idle',
  })
  const status = development.status()
  const pending = operation.kind === 'pending'

  const run = async (
    label: string,
    request: () => ReturnType<UiRuntimeDevelopmentControls['apply']>,
  ): Promise<void> => {
    if (pending) return
    setOperation({ kind: 'pending' })
    try {
      const result = await request()
      setOperation(
        result.applied
          ? { kind: 'success', message: label }
          : { kind: 'failure', message: intl.formatMessage(messages.actionFailure) },
      )
    } catch {
      setOperation({
        kind: 'failure',
        message: intl.formatMessage(messages.actionFailure),
      })
    }
  }

  const parsedAmount = parseGameNumberInput(amount)
  const continuousAmount = parsedAmount.ok
    ? toContinuousGameNumber(parsedAmount.value)
    : { ok: false as const, reason: 'above-maximum' as const }
  const discreteAmount = parsedAmount.ok
    ? toDiscreteGameNumber(parsedAmount.value, DISCRETE_MAXIMUM)
    : { ok: false as const, reason: 'above-maximum' as const }
  const validContinuousAmount = continuousAmount.ok
  const validDiscreteAmount = discreteAmount.ok
  const amountFeedback = !parsedAmount.ok
    ? intl.formatMessage(messages.invalidAmount)
    : !continuousAmount.ok
      ? intl.formatMessage(messages.continuousMaximum, {
          maximum: Number.MAX_VALUE.toString(),
        })
      : !discreteAmount.ok && discreteAmount.reason === 'non-integer'
        ? intl.formatMessage(messages.discreteWholeNumber)
        : !discreteAmount.ok
          ? intl.formatMessage(messages.discreteMaximum, {
              maximum: DISCRETE_MAXIMUM.toString(),
            })
          : intl.formatMessage(messages.amountHelp)
  const canPurchase =
    status.entitled ||
    (status.quantumShards >= 100_000n &&
      status.strangeMatter >= 500_000)

  const apply = (
    action: UiRuntimeDevelopmentAction,
    success: string,
  ) => void run(success, () => development.apply(action))

  const updateAmount = (nextAmount: string) => {
    setAmount(nextAmount)
    onDraftChange?.({ amount: nextAmount, preset })
  }

  return (
    <section className="debug-surface" aria-label={intl.formatMessage(messages.title)}>
      <div className="debug-surface__scroll-region">
        {!status.enabled ? (
          <section className="debug-surface__panel debug-surface__access">
            <div>
              <h2>{intl.formatMessage(messages.title)}</h2>
              <p>{intl.formatMessage(messages.accessDescription)}</p>
            </div>
            <dl className="debug-surface__costs">
                <div>
                  <dt>{intl.formatMessage(messages.quantumShards)}</dt>
                  <dd>
                    {formatGameNumber(locale, status.quantumShards)} /{' '}
                    {formatGameNumber(locale, 100_000)}
                  </dd>
                </div>
                <div>
                  <dt>{intl.formatMessage(messages.strangeMatter)}</dt>
                  <dd>
                    {formatGameNumber(locale, status.strangeMatter)} /{' '}
                    {formatGameNumber(locale, 500_000)}
                  </dd>
                </div>
            </dl>
            <button
              type="button"
              className="debug-surface__purchase"
              disabled={pending || !canPurchase}
              onClick={() =>
                apply(
                  { kind: 'purchase-debug-options' },
                  intl.formatMessage(messages.purchaseSuccess),
                )
              }
            >
              {intl.formatMessage(
                status.entitled ? messages.enableFree : messages.purchase,
              )}
            </button>
          </section>
        ) : null}

        {status.enabled ? (
          <>
            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.progression)}</h2>
              <div className="debug-surface__field">
                <label htmlFor={amountId}>{intl.formatMessage(messages.amount)}</label>
                <input
                  id={amountId}
                  inputMode="decimal"
                  value={amount}
                  aria-invalid={!parsedAmount.ok || !continuousAmount.ok}
                  aria-describedby={amountFeedbackId}
                  onChange={(event) => {
                    const nextAmount = clampAmountDraftToContinuousMaximum(
                      event.currentTarget.value,
                    )
                    updateAmount(nextAmount)
                  }}
                />
                <p
                  id={amountFeedbackId}
                  className="debug-surface__amount-feedback"
                  role={!parsedAmount.ok || !continuousAmount.ok ? 'alert' : undefined}
                >
                  {amountFeedback}
                </p>
              </div>
              <div className="debug-surface__cap-buttons">
                <ActionButton
                  label={intl.formatMessage(messages.setDoubleCap)}
                  disabled={pending}
                  onClick={() => updateAmount(Number.MAX_VALUE.toString())}
                />
                <ActionButton
                  label={intl.formatMessage(messages.setWholeCap)}
                  disabled={pending}
                  onClick={() => updateAmount(DISCRETE_MAXIMUM.toString())}
                />
              </div>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.addCash)} disabled={pending || !validContinuousAmount} onClick={() => continuousAmount.ok && apply({ kind: 'add-cash', amount: continuousAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addBots)} disabled={pending || !validContinuousAmount} onClick={() => continuousAmount.ok && apply({ kind: 'add-bots', amount: continuousAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addSkillPoints)} disabled={pending || !validDiscreteAmount} onClick={() => discreteAmount.ok && apply({ kind: 'add-skill-points', amount: discreteAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfinityPoints)} disabled={pending || !validDiscreteAmount} onClick={() => discreteAmount.ok && apply({ kind: 'add-infinity-points', amount: discreteAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addQuantumShards)} disabled={pending || !validDiscreteAmount} onClick={() => discreteAmount.ok && apply({ kind: 'add-quantum-shards', amount: discreteAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfluence)} disabled={pending || !validContinuousAmount} onClick={() => continuousAmount.ok && apply({ kind: 'add-influence', amount: continuousAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addStrangeMatter)} disabled={pending || !validContinuousAmount} onClick={() => continuousAmount.ok && apply({ kind: 'add-strange-matter', amount: continuousAmount.value }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addOfflineTime)} disabled={pending || !validContinuousAmount} onClick={() => continuousAmount.ok && void run(intl.formatMessage(messages.actionSuccess), () => development.simulateOfflineTime(continuousAmount.value))} />
              </div>
            </section>

            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.progressionPresets)}</h2>
              <div className="debug-surface__preset-row">
                <label htmlFor={presetId}>{intl.formatMessage(messages.botState)}</label>
                <select id={presetId} value={preset} onChange={(event) => {
                  const nextPreset = event.currentTarget.value
                  setPreset(nextPreset)
                  onDraftChange?.({ amount, preset: nextPreset })
                }}>
                  {BOT_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatGameNumber(locale, item.bots)} {intl.formatMessage(messages.bots)}
                    </option>
                  ))}
                </select>
                <ActionButton label={intl.formatMessage(messages.applyPreset)} disabled={pending} onClick={() => {
                  const selected = BOT_PRESETS.find((item) => item.id === preset)
                  if (selected !== undefined) void run(intl.formatMessage(messages.actionSuccess), async () => {
                    const result = await development.setDysonBots(selected.bots)
                    return result.applied
                      ? { applied: true, stateRevision: result.stateRevision, durableRevision: result.durableRevision }
                      : result
                  })
                }} />
              </div>
              <ActionButton label={intl.formatMessage(messages.unlockTabs)} disabled={pending} onClick={() => void run(intl.formatMessage(messages.actionSuccess), async () => {
                const result = await development.unlockReality()
                return result.applied
                  ? { applied: true, stateRevision: result.stateRevision, durableRevision: result.durableRevision }
                  : result
              })} />
            </section>

            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.timing)}</h2>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.tinkerOneSecond)} disabled={pending} onClick={() => apply({ kind: 'set-tinker-interval', seconds: 1 }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.tinkerInstant)} disabled={pending} onClick={() => apply({ kind: 'set-tinker-interval', seconds: 0 }, intl.formatMessage(messages.actionSuccess))} />
              </div>
            </section>

            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.maintenance)}</h2>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.recalculateSkillPoints)} disabled={pending} onClick={() => apply({ kind: 'recalculate-skill-points' }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.resetSecretProgress)} disabled={pending} onClick={() => apply({ kind: 'reset-secret-progress' }, intl.formatMessage(messages.resetSecretProgressSuccess))} />
                <ActionButton danger label={intl.formatMessage(messages.disable)} disabled={pending} onClick={() => apply({ kind: 'disable-debug-options' }, intl.formatMessage(messages.disabledSuccess))} />
              </div>
            </section>
          </>
        ) : null}

        {operation.kind === 'success' || operation.kind === 'failure' ? (
          <p className="debug-surface__status" role={operation.kind === 'failure' ? 'alert' : 'status'}>
            {operation.message}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function ActionButton({
  label,
  disabled,
  danger = false,
  onClick,
}: {
  readonly label: string
  readonly disabled: boolean
  readonly danger?: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`debug-surface__button${danger ? ' debug-surface__button--danger' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
