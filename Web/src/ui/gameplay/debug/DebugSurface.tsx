import { useId, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  UiRuntimeDevelopmentAction,
  UiRuntimeDevelopmentControls,
} from '../../runtime'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import {
  floorGameDecimal,
  gameDecimalFromInputString,
  gameDecimalToBigIntChecked,
  gameDecimalToNumberChecked,
  type GameDecimal,
} from '../../../math/gameDecimal'
import { MINIMUM_TINKER_COOLDOWN_SECONDS } from '../../../simulation/canonicalTinkerV2'
import { debugSurfaceMessages as messages } from './messages'
import './debugSurface.css'

export interface DebugSurfaceProps {
  readonly development: UiRuntimeDevelopmentControls
  readonly locale: EnabledLocale
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

/**
 * Ports Unity's live Debug Options panel while delegating every mutation and
 * simulated-time request to the browser runtime's lifecycle-owned boundary.
 */
export function DebugSurface({
  development,
  locale,
}: DebugSurfaceProps) {
  const intl = useIntl()
  const amountId = useId()
  const presetId = useId()
  const [amountDraft, setAmountDraft] = useState('1')
  const [preset, setPreset] = useState('early')
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
          : { kind: 'failure', message: result.reason },
      )
    } catch (error) {
      setOperation({
        kind: 'failure',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const decimalAmount = parseDecimalAmount(amountDraft)
  const validDecimalAmount = decimalAmount !== null
  const wholeDecimalAmount = decimalAmount === null
    ? null
    : floorGameDecimal(decimalAmount)
  const discreteAmount = parseDiscreteAmount(decimalAmount)
  const secondsAmount = parseSecondsAmount(decimalAmount)
  const canPurchase =
    status.entitled ||
    (status.quantumShards >= 100_000n &&
      status.strangeMatter >= 500_000n)

  const apply = (
    action: UiRuntimeDevelopmentAction,
    success: string,
  ) => void run(success, () => development.apply(action))

  return (
    <section className="debug-surface" aria-label={intl.formatMessage(messages.title)}>
      <div className="debug-surface__scroll-region">
        <section className="debug-surface__panel debug-surface__access">
          <div>
            <h2>{intl.formatMessage(messages.title)}</h2>
            <p>{intl.formatMessage(messages.accessDescription)}</p>
          </div>
          {status.enabled ? (
            <strong className="debug-surface__enabled">
              {intl.formatMessage(messages.enabled)}
            </strong>
          ) : (
            <>
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
            </>
          )}
        </section>

        {status.enabled ? (
          <>
            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.progression)}</h2>
              <div className="debug-surface__field">
                <label htmlFor={amountId}>{intl.formatMessage(messages.amount)}</label>
                <input
                  id={amountId}
                  inputMode="decimal"
                  defaultValue="1"
                  aria-invalid={!validDecimalAmount}
                  onChange={(event) => setAmountDraft(event.currentTarget.value)}
                />
              </div>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.addCash)} disabled={pending || decimalAmount === null} onClick={() => decimalAmount !== null && apply({ kind: 'add-cash', amount: decimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addBots)} disabled={pending || decimalAmount === null} onClick={() => decimalAmount !== null && apply({ kind: 'add-bots', amount: decimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addSkillPoints)} disabled={pending || discreteAmount === null} onClick={() => discreteAmount !== null && apply({ kind: 'add-skill-points', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfinityPoints)} disabled={pending || wholeDecimalAmount === null} onClick={() => wholeDecimalAmount !== null && apply({ kind: 'add-infinity-points', amount: wholeDecimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addQuantumShards)} disabled={pending || wholeDecimalAmount === null} onClick={() => wholeDecimalAmount !== null && apply({ kind: 'add-quantum-shards', amount: wholeDecimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfluence)} disabled={pending || wholeDecimalAmount === null} onClick={() => wholeDecimalAmount !== null && apply({ kind: 'add-influence', amount: wholeDecimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addStrangeMatter)} disabled={pending || wholeDecimalAmount === null} onClick={() => wholeDecimalAmount !== null && apply({ kind: 'add-strange-matter', amount: wholeDecimalAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addOfflineTime)} disabled={pending || secondsAmount === null} onClick={() => secondsAmount !== null && void run(intl.formatMessage(messages.actionSuccess), () => development.simulateOfflineTime(secondsAmount))} />
              </div>
            </section>

            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.progressionPresets)}</h2>
              <div className="debug-surface__preset-row">
                <label htmlFor={presetId}>{intl.formatMessage(messages.botState)}</label>
                <select id={presetId} value={preset} onChange={(event) => setPreset(event.currentTarget.value)}>
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
                <ActionButton label={intl.formatMessage(messages.tinkerInstant)} disabled={pending} onClick={() => apply({ kind: 'set-tinker-interval', seconds: MINIMUM_TINKER_COOLDOWN_SECONDS }, intl.formatMessage(messages.actionSuccess))} />
              </div>
            </section>

            <section className="debug-surface__panel">
              <h2>{intl.formatMessage(messages.maintenance)}</h2>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.recalculateSkillPoints)} disabled={pending} onClick={() => apply({ kind: 'recalculate-skill-points' }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.resetSecretProgress)} disabled={pending} onClick={() => apply({ kind: 'reset-secret-progress' }, intl.formatMessage(messages.resetSecretProgressSuccess))} />
                <a className="debug-surface__button" href="https://www.icloud.com/sharedalbum/#B0vG6XBub6hSR6" target="_blank" rel="noreferrer">
                  {intl.formatMessage(messages.debugCats)}
                </a>
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

function parseDecimalAmount(value: string): GameDecimal | null {
  try {
    return gameDecimalFromInputString(value)
  } catch {
    return null
  }
}

function parseDiscreteAmount(value: GameDecimal | null): bigint | null {
  if (value === null) return null
  try {
    return gameDecimalToBigIntChecked(floorGameDecimal(value))
  } catch {
    return null
  }
}

function parseSecondsAmount(value: GameDecimal | null): number | null {
  if (value === null) return null
  try {
    return gameDecimalToNumberChecked(value)
  } catch {
    return null
  }
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
