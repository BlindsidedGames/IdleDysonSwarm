import {
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  FormattedMessage,
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendResearchCardPreview,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type {
  CanonicalSkillPresetAutomationSlot,
  SkillPresetState,
} from '../../../game-state/types'
import researchCostSymbolSrc from '../../assets/symbol-research-cost.png'
import scienceSymbolSrc from '../../assets/symbol-science.png'
import {
  Button,
  FacilityCard,
  InlineImageSymbol,
  PresetAutomationSelect,
} from '../../components'
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
import { researchMessages as messages } from './messages'
import './research.css'

type ResearchCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'research.purchase'
      | 'research.set-buy-mode'
      | 'research.set-rounded-bulk-buy'
      | 'research.set-automation'
      | 'skill.set-tab-preset-automation'
  }
>

type ResearchBuyMode = Extract<
  ResearchCommand,
  { readonly kind: 'research.set-buy-mode' }
>['buyMode']

type ResearchSettingCommand = Extract<
  ResearchCommand,
  {
    readonly kind:
      | 'research.set-buy-mode'
      | 'research.set-rounded-bulk-buy'
      | 'research.set-automation'
      | 'skill.set-tab-preset-automation'
  }
>

const BUY_MODE_OPTIONS = Object.freeze([
  ['buy-1', 'buyOne'],
  ['buy-10', 'buyTen'],
  ['buy-50', 'buyFifty'],
  ['buy-100', 'buyOneHundred'],
  ['buy-max', 'buyMax'],
] as const)

export interface ResearchSurfaceProps {
  readonly locale: EnabledLocale
  readonly cards: readonly FrontendResearchCardPreview[]
  readonly researchers: number
  readonly sciencePerSecond: number
  readonly buyMode: ResearchBuyMode
  readonly roundedBulkBuy: boolean
  readonly presets: readonly SkillPresetState[]
  readonly presetAutomationSlot: CanonicalSkillPresetAutomationSlot
  readonly automationUnlocked: boolean
  readonly automationEnabledById: Readonly<Record<string, boolean>>
  readonly purchaseRouteAvailable: boolean
  readonly buyModeRouteAvailable: boolean
  readonly roundedBulkRouteAvailable: boolean
  readonly presetAutomationRouteAvailable: boolean
  readonly automationRouteAvailable: boolean
  readonly dispatchPlayer: (
    command: ResearchCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

/**
 * Presents Unity-ordered Research cards while leaving visibility, prices,
 * effects, automation and command execution to canonical application facts.
 */
export function ResearchSurface({
  locale,
  cards,
  researchers,
  sciencePerSecond,
  buyMode,
  roundedBulkBuy,
  presets,
  presetAutomationSlot,
  automationUnlocked,
  automationEnabledById,
  purchaseRouteAvailable,
  buyModeRouteAvailable,
  roundedBulkRouteAvailable,
  presetAutomationRouteAvailable,
  automationRouteAvailable,
  dispatchPlayer,
}: ResearchSurfaceProps) {
  const intl = useIntl()
  const settingsId = useId()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)
  const [automationOverrides, setAutomationOverrides] = useState<
    Readonly<Record<string, boolean>>
  >({})
  const [automationFailures, setAutomationFailures] = useState<
    ReadonlySet<string>
  >(new Set())
  const automationVersions = useRef(new Map<string, number>())
  const visibleCards = cards.filter((card) => card.visible)
  const automatableVisibleCards = visibleCards.filter((card) =>
    AUTOMATABLE_RESEARCH_IDS.has(card.researchId),
  )

  const applySetting = async (
    command: ResearchSettingCommand,
  ): Promise<void> => applySettings([command])

  const applySettings = async (
    commands: readonly ResearchSettingCommand[],
  ): Promise<void> => {
    if (settingPending) return
    setSettingPending(true)
    setSettingFailed(false)
    try {
      const results = await Promise.all(
        commands.map((command) => dispatchPlayer(command)),
      )
      setSettingFailed(
        results.some((result) => result.status !== 'accepted'),
      )
    } catch {
      setSettingFailed(true)
    } finally {
      setSettingPending(false)
    }
  }

  const automationEnabled = (researchId: string) =>
    automationOverrides[researchId] ??
    automationEnabledById[researchId] ??
    false

  const setResearchAutomation = (
    researchId: string,
    enabled: boolean,
  ): void => {
    const version = (automationVersions.current.get(researchId) ?? 0) + 1
    automationVersions.current.set(researchId, version)
    setAutomationOverrides((current) => ({
      ...current,
      [researchId]: enabled,
    }))
    setAutomationFailures((current) => {
      if (!current.has(researchId)) return current
      const next = new Set(current)
      next.delete(researchId)
      return next
    })

    void dispatchPlayer({
      kind: 'research.set-automation',
      researchId,
      enabled,
    })
      .then((result) => {
        if (automationVersions.current.get(researchId) !== version) return
        setAutomationOverrides((current) => {
          const next = { ...current }
          delete next[researchId]
          return next
        })
        if (result.status !== 'accepted') {
          setAutomationFailures((current) =>
            new Set(current).add(researchId),
          )
        }
      })
      .catch(() => {
        if (automationVersions.current.get(researchId) !== version) return
        setAutomationOverrides((current) => {
          const next = { ...current }
          delete next[researchId]
          return next
        })
        setAutomationFailures((current) =>
          new Set(current).add(researchId),
        )
      })
  }

  return (
    <div className="research-surface">
      <div className="research-surface__scroll-region">
        {visibleCards.length > 0 ? (
          <ol className="research-surface__grid">
            {visibleCards.map((card) => (
              <li
                className="research-surface__item"
                key={card.researchId}
              >
                <ResearchCard
                  card={card}
                  locale={locale}
                  routeAvailable={purchaseRouteAvailable}
                  dispatchPlayer={dispatchPlayer}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="research-surface__empty">
            {intl.formatMessage(messages.empty)}
          </p>
        )}
      </div>

      <footer className="research-surface__footer">
        {settingsOpen ? (
          <div
            id={settingsId}
            className="research-surface__settings"
          >
            <span className="research-surface__settings-title">
              {intl.formatMessage(messages.purchaseAmount)}
            </span>
            <div
              className="research-surface__buy-modes"
              role="group"
              aria-label={intl.formatMessage(messages.purchaseAmount)}
            >
              {BUY_MODE_OPTIONS.map(([mode, messageKey]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={buyMode === mode}
                  disabled={
                    settingPending || !buyModeRouteAvailable
                  }
                  onClick={() =>
                    void applySetting({
                      kind: 'research.set-buy-mode',
                      buyMode: mode,
                    })
                  }
                >
                  {intl.formatMessage(messages[messageKey])}
                </button>
              ))}
            </div>
            <label className="research-surface__rounded-bulk">
              <input
                type="checkbox"
                checked={roundedBulkBuy}
                disabled={
                  settingPending || !roundedBulkRouteAvailable
                }
                onChange={(event) =>
                  void applySetting({
                    kind: 'research.set-rounded-bulk-buy',
                    enabled: event.currentTarget.checked,
                  })
                }
              />
              <span>
                {intl.formatMessage(messages.roundedBulkBuy)}
              </span>
            </label>
            <PresetAutomationSelect
              label={intl.formatMessage(messages.presetAutomation)}
              offLabel={intl.formatMessage(messages.presetAutomationOff)}
              value={presetAutomationSlot}
              presets={presets}
              disabled={
                settingPending || !presetAutomationRouteAvailable
              }
              onChange={(slot) =>
                void applySetting({
                  kind: 'skill.set-tab-preset-automation',
                  tab: 'research',
                  slot,
                })
              }
            />
            {automationUnlocked && automatableVisibleCards.length > 0 ? (
              <fieldset className="research-surface__automation">
                <legend>{intl.formatMessage(messages.autoPurchase)}</legend>
                <button
                  type="button"
                  className="research-surface__automation-toggle-all"
                  disabled={!automationRouteAvailable}
                  onClick={() => {
                    const enabled = automatableVisibleCards.some(
                      (card) => !automationEnabled(card.researchId),
                    )
                    automatableVisibleCards.forEach((card) =>
                      setResearchAutomation(card.researchId, enabled),
                    )
                  }}
                >
                  {intl.formatMessage(messages.toggleAll)}
                </button>
                <div className="research-surface__automation-grid">
                  {automatableVisibleCards.map((card) => {
                      const name = intl.formatMessage(nameMessage(card.researchId))
                      return (
                        <label
                          key={card.researchId}
                          data-save-error={
                            automationFailures.has(card.researchId) || undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={automationEnabled(card.researchId)}
                            disabled={!automationRouteAvailable}
                            aria-invalid={
                              automationFailures.has(card.researchId) || undefined
                            }
                            onChange={(event) =>
                              setResearchAutomation(
                                card.researchId,
                                event.currentTarget.checked,
                              )
                            }
                          />
                          <span>{name}</span>
                        </label>
                      )
                    })}
                </div>
              </fieldset>
            ) : null}
            {settingFailed ? (
              <span
                className="research-surface__settings-failure"
                role="alert"
              >
                {intl.formatMessage(messages.settingsFailed)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="research-surface__summary">
          <p>
            <FormattedMessage
              {...messages.productionSummary}
              values={{
                researchers: formatGameNumber(locale, researchers),
                science: formatGameNumber(locale, sciencePerSecond),
                scienceIcon: <ScienceSymbol />,
                researcherValue: (chunks: ReactNode) => (
                  <span className="research-surface__researchers">
                    {chunks}
                  </span>
                ),
                scienceValue: (chunks: ReactNode) => (
                  <span className="research-surface__science">
                    {chunks}
                  </span>
                ),
              }}
            />
          </p>
          <button
            type="button"
            className="research-surface__settings-toggle"
            aria-label={intl.formatMessage(messages.purchaseSettings)}
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <span aria-hidden="true">{'\u2699'}</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

const AUTOMATABLE_RESEARCH_IDS = new Set([
  'research.science_boost',
  'research.money_multiplier',
  'research.assembly_line_upgrade',
  'research.ai_manager_upgrade',
  'research.server_upgrade',
  'research.data_center_upgrade',
  'research.planet_upgrade',
  'research.matrioshka_brains_upgrade',
  'research.birch_planets_upgrade',
  'research.galactic_brains_upgrade',
])

interface ResearchCardProps {
  readonly card: FrontendResearchCardPreview
  readonly locale: EnabledLocale
  readonly routeAvailable: boolean
  readonly dispatchPlayer: ResearchSurfaceProps['dispatchPlayer']
}

function ResearchCard({
  card,
  locale,
  routeAvailable,
  dispatchPlayer,
}: ResearchCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const name = intl.formatMessage(nameMessage(card.researchId))
  const panelLifetime =
    card.effectKind === 'panel-lifetime-seconds'
  const formattedLevel = formatGameNumber(locale, card.currentLevel)
  const titleLabel = panelLifetime
    ? intl.formatMessage(messages.durabilityUpgrade)
    : intl.formatMessage(messages.boostTitleAccessible, {
        name,
        level: formattedLevel,
      })
  const title = panelLifetime ? (
    titleLabel
  ) : (
    <FormattedMessage
      {...messages.boostTitle}
      values={{
        name,
        level: formattedLevel,
        value: researchValue,
      }}
    />
  )
  const quantity = formatGameNumber(locale, card.selectedQuantity)
  const cost = formatGameNumber(locale, card.cost)
  const disabled =
    pending ||
    card.maxed ||
    card.automationActive ||
    !routeAvailable ||
    !card.eligible

  const purchase = async (): Promise<void> => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'research.purchase',
        researchId: card.researchId,
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
    <FacilityCard
      className="research-card"
      title={title}
      production={
        <span className="research-card__effect">
          {effectText(card, locale, intl)}
        </span>
      }
      description={intl.formatMessage(
        descriptionMessage(card.researchId),
      )}
      progress={null}
      action={
        <Button
          variant="primary"
          fullWidth
          state={pending ? 'pending' : failed ? 'failure' : 'idle'}
          disabled={disabled}
          aria-label={intl.formatMessage(
            card.maxed
              ? messages.purchasedAccessible
              : card.automationActive
                ? messages.automaticAccessible
                : messages.purchaseAccessible,
            {
              title: titleLabel,
              quantity,
              cost,
            },
          )}
          onClick={() => void purchase()}
        >
          <span className="research-card__purchase-quantity">
            {card.maxed
              ? intl.formatMessage(messages.purchased)
              : card.automationActive
              ? intl.formatMessage(messages.automatic)
              : intl.formatMessage(messages.purchaseQuantity, {
                  quantity,
                })}
          </span>
          {card.maxed ? null : (
            <span className="research-card__purchase-cost">
              <ResearchCostSymbol />
              <bdi>{cost}</bdi>
            </span>
          )}
        </Button>
      }
      feedback={
        pending || failed ? (
          <span role={failed ? 'alert' : 'status'}>
            {intl.formatMessage(
              failed
                ? messages.purchaseFailed
                : messages.purchasePending,
            )}
          </span>
        ) : undefined
      }
    />
  )
}

function effectText(
  card: FrontendResearchCardPreview,
  locale: EnabledLocale,
  intl: IntlShape,
): ReactNode {
  if (card.effectKind === 'panel-lifetime-seconds') {
    return (
      <FormattedMessage
        {...messages.lifetimeEffect}
        values={{
          seconds: formatNumber(locale, card.perLevelEffect, {
            maximumFractionDigits: 2,
          }),
          value: researchValue,
        }}
      />
    )
  }
  if (card.currentLevel === 0) {
    return (
      <FormattedMessage
        {...messages.purchaseBoost}
        values={{
          perLevel: formatPercentPoints(
            locale,
            card.perLevelEffect,
          ),
          value: researchValue,
        }}
      />
    )
  }
  const current = formatPercentPoints(locale, card.currentEffect)
  if (card.projectedEffect !== card.currentEffect) {
    const projected = formatPercentPoints(
      locale,
      card.projectedEffect,
    )
    return (
      <span
        aria-label={intl.formatMessage(
          messages.boostingProjectedAccessible,
          { current, projected },
        )}
      >
        <FormattedMessage
          {...messages.boostingProjected}
          values={{
            current,
            projected,
            value: researchValue,
            arrowMark: '\u25b6',
            arrow: (chunks: ReactNode) => (
              <span
                className="research-card__effect-arrow"
                aria-hidden="true"
              >
                {chunks}
              </span>
            ),
          }}
        />
      </span>
    )
  }
  return (
    <FormattedMessage
      {...messages.boosting}
      values={{ current, value: researchValue }}
    />
  )
}

function researchValue(chunks: ReactNode): ReactNode {
  return <span className="research-card__value">{chunks}</span>
}

function formatPercentPoints(
  locale: EnabledLocale,
  value: number,
): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 2,
  })
}

function nameMessage(researchId: string): MessageDescriptor {
  switch (researchId) {
    case 'research.assembly_line_upgrade':
      return messages.assemblyLine
    case 'research.ai_manager_upgrade':
      return messages.aiManager
    case 'research.server_upgrade':
      return messages.server
    case 'research.data_center_upgrade':
      return messages.dataCenter
    case 'research.planet_upgrade':
      return messages.planet
    case 'research.matrioshka_brains_upgrade':
      return messages.matrioshkaBrains
    case 'research.birch_planets_upgrade':
      return messages.birchPlanets
    case 'research.galactic_brains_upgrade':
      return messages.galacticBrains
    case 'research.science_boost':
      return messages.science
    case 'research.money_multiplier':
      return messages.cash
    default:
      return messages.durabilityUpgrade
  }
}

function descriptionMessage(
  researchId: string,
): MessageDescriptor {
  switch (researchId) {
    case 'research.assembly_line_upgrade':
      return messages.assemblyDescription
    case 'research.ai_manager_upgrade':
      return messages.aiDescription
    case 'research.server_upgrade':
      return messages.serverDescription
    case 'research.data_center_upgrade':
      return messages.dataCenterDescription
    case 'research.planet_upgrade':
    case 'research.matrioshka_brains_upgrade':
    case 'research.birch_planets_upgrade':
    case 'research.galactic_brains_upgrade':
      return messages.machineWorldDescription
    case 'research.panel_lifetime_1':
      return messages.lifetimeOneDescription
    case 'research.science_boost':
      return messages.scienceDescription
    case 'research.money_multiplier':
      return messages.cashDescription
    default:
      return messages.lifetimeLaterDescription
  }
}

function ScienceSymbol() {
  return (
    <InlineImageSymbol
      src={scienceSymbolSrc}
      symbol="science"
    />
  )
}

function ResearchCostSymbol() {
  return (
    <InlineImageSymbol
      src={researchCostSymbolSrc}
      symbol="research-cost"
    />
  )
}
