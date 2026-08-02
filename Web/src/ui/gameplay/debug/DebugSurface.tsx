import { useId, useState } from 'react'
import { useIntl } from 'react-intl'
import type {
  UiRuntimeDevelopmentAction,
  UiRuntimeDevelopmentControls,
} from '../../runtime'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
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
  const [amount, setAmount] = useState('1')
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

  const parsedAmount = Number(amount)
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0
  const discreteAmount = validAmount
    ? BigInt(Math.trunc(parsedAmount))
    : 0n
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
                  value={amount}
                  aria-invalid={!validAmount}
                  onChange={(event) => setAmount(event.currentTarget.value)}
                />
              </div>
              <div className="debug-surface__button-grid">
                <ActionButton label={intl.formatMessage(messages.addBots)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-bots', amount: parsedAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addSkillPoints)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-skill-points', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfinityPoints)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-infinity-points', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addQuantumShards)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-quantum-shards', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addInfluence)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-influence', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addStrangeMatter)} disabled={pending || !validAmount} onClick={() => apply({ kind: 'add-strange-matter', amount: discreteAmount }, intl.formatMessage(messages.actionSuccess))} />
                <ActionButton label={intl.formatMessage(messages.addOfflineTime)} disabled={pending || !validAmount} onClick={() => void run(intl.formatMessage(messages.actionSuccess), () => development.simulateOfflineTime(parsedAmount))} />
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
                <ActionButton label={intl.formatMessage(messages.tinkerInstant)} disabled={pending} onClick={() => apply({ kind: 'set-tinker-interval', seconds: 0 }, intl.formatMessage(messages.actionSuccess))} />
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
