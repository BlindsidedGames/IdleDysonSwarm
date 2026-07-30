import {
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
  FrontendResearchCardPreview,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import researchCostSymbolSrc from '../../assets/symbol-research-cost.png'
import scienceSymbolSrc from '../../assets/symbol-science.png'
import {
  Button,
  FacilityCard,
  InlineImageSymbol,
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
  }
>

type ResearchBuyMode = Extract<
  ResearchCommand,
  { readonly kind: 'research.set-buy-mode' }
>['buyMode']

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
  readonly purchaseRouteAvailable: boolean
  readonly buyModeRouteAvailable: boolean
  readonly roundedBulkRouteAvailable: boolean
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
  purchaseRouteAvailable,
  buyModeRouteAvailable,
  roundedBulkRouteAvailable,
  dispatchPlayer,
}: ResearchSurfaceProps) {
  const intl = useIntl()
  const settingsId = useId()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)
  const visibleCards = cards.filter((card) => card.visible)

  const applySetting = async (
    command: Extract<
      ResearchCommand,
      {
        readonly kind:
          | 'research.set-buy-mode'
          | 'research.set-rounded-bulk-buy'
      }
    >,
  ): Promise<void> => {
    if (settingPending) return
    setSettingPending(true)
    setSettingFailed(false)
    try {
      const result = await dispatchPlayer(command)
      setSettingFailed(result.status !== 'accepted')
    } catch {
      setSettingFailed(true)
    } finally {
      setSettingPending(false)
    }
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
          {effectText(card, locale)}
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
    return (
      <FormattedMessage
        {...messages.boostingProjected}
        values={{
          current,
          projected: formatPercentPoints(
            locale,
            card.projectedEffect,
          ),
          value: researchValue,
        }}
      />
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
