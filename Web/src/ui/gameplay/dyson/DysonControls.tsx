import { useEffect, useId, useRef, useState } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type {
  FrontendDysonPresentationFacts,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import {
  formatNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import type {
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import { readyDysonMessages as messages } from './messages'
import './dysonControls.css'

export interface DysonInfoProps {
  readonly locale: EnabledLocale
  readonly metric:
    FrontendDysonPresentationFacts['activePanelMetric']
  readonly currentGoal:
    FrontendDysonPresentationFacts['currentGoal']
  readonly panelLifetimeSeconds: number
  readonly totalPanelsDecayed: number
  readonly buyMode: DysonBuyMode
  readonly roundedBulkBuy: boolean
  readonly buyModeRouteAvailable: boolean
  readonly roundedBulkRouteAvailable: boolean
  readonly dispatchPlayer: (
    command: DysonSettingsCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

type DysonSettingsCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'dyson.set-buy-mode'
      | 'dyson.set-rounded-bulk-buy'
  }
>

type DysonBuyMode = Extract<
  DysonSettingsCommand,
  { readonly kind: 'dyson.set-buy-mode' }
>['buyMode']

const BUY_MODE_OPTIONS = Object.freeze([
  ['buy-1', 'buyOne'],
  ['buy-10', 'buyTen'],
  ['buy-50', 'buyFifty'],
  ['buy-100', 'buyOneHundred'],
  ['buy-max', 'buyMax'],
] as const)

export function DysonInfo({
  locale,
  metric,
  currentGoal,
  panelLifetimeSeconds,
  totalPanelsDecayed,
  buyMode,
  roundedBulkBuy,
  buyModeRouteAvailable,
  roundedBulkRouteAvailable,
  dispatchPlayer,
}: DysonInfoProps) {
  const intl = useIntl()
  const [expanded, setExpanded] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)
  const detailsId = useId()
  const settingsId = useId()
  const metricMessage =
    metric.kind === 'active-panels'
      ? messages.activePanels
      : metric.kind === 'stars-surrounded'
        ? messages.starsSurrounded
        : messages.galaxiesEngulfed
  const goalMessage =
    currentGoal.kind === 'create-bots'
      ? messages.goalCreateBots
      : currentGoal.kind === 'build-assembly-lines'
        ? messages.goalBuildAssemblyLines
        : currentGoal.kind === 'have-active-panels'
          ? messages.goalHaveActivePanels
          : currentGoal.kind === 'own-planets'
            ? messages.goalOwnPlanets
            : currentGoal.kind === 'decay-panels'
              ? messages.goalDecayPanels
              : currentGoal.kind === 'surround-stars'
                ? messages.goalSurroundStars
                : currentGoal.kind === 'engulf-galaxies'
                  ? messages.goalEngulfGalaxies
                  : messages.goalReachBots
  const applySetting = async (
    command: DysonSettingsCommand,
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
    <div className="dyson-info">
      <div className="dyson-info__header">
        <button
          type="button"
          className="dyson-info__toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((current) => !current)}
        >
          <span>{intl.formatMessage(messages.info)}</span>
          <span className="dyson-info__chevron" aria-hidden="true">
            {expanded ? '\u2212' : '\u002b'}
          </span>
        </button>
        <button
          type="button"
          className="dyson-info__settings-toggle"
          aria-label={intl.formatMessage(messages.purchaseSettings)}
          aria-expanded={settingsOpen}
          aria-controls={settingsId}
          onClick={() => setSettingsOpen((current) => !current)}
        >
          <span aria-hidden="true">{'\u2699'}</span>
        </button>
      </div>
      <div className="dyson-info__summary">
        <span className="dyson-info__goal">
          {intl.formatMessage(goalMessage, {
            target: currentGoal.target,
          })}
        </span>
      </div>
      {expanded && (
        <div id={detailsId} className="dyson-info__details">
          <span className="dyson-info__active">
            <FormattedMessage
              {...metricMessage}
              values={{
                value: formatFact(locale, metric.value),
                emphasis: (chunks) => (
                  <span className="dyson-info__value">{chunks}</span>
                ),
              }}
            />
          </span>
          <span>
            <FormattedMessage
              {...messages.panelLifetimeDetail}
              values={{
                value: formatFact(locale, panelLifetimeSeconds),
                emphasis: (chunks) => (
                  <span className="dyson-info__value">{chunks}</span>
                ),
              }}
            />
          </span>
          <span>
            <FormattedMessage
              {...messages.totalPanelsDecayed}
              values={{
                value: formatFact(locale, totalPanelsDecayed),
                emphasis: (chunks) => (
                  <span className="dyson-info__value">{chunks}</span>
                ),
              }}
            />
          </span>
        </div>
      )}
      {settingsOpen && (
        <div id={settingsId} className="dyson-info__settings">
          <span className="dyson-info__settings-title">
            {intl.formatMessage(messages.purchaseAmount)}
          </span>
          <div
            className="dyson-info__buy-modes"
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
                    kind: 'dyson.set-buy-mode',
                    buyMode: mode,
                  })
                }
              >
                {intl.formatMessage(messages[messageKey])}
              </button>
            ))}
          </div>
          <label className="dyson-info__rounded-bulk">
            <input
              type="checkbox"
              checked={roundedBulkBuy}
              disabled={
                settingPending || !roundedBulkRouteAvailable
              }
              onChange={(event) =>
                void applySetting({
                  kind: 'dyson.set-rounded-bulk-buy',
                  enabled: event.currentTarget.checked,
                })
              }
            />
            <span>{intl.formatMessage(messages.roundedBulkBuy)}</span>
          </label>
          {settingFailed && (
            <span className="dyson-info__settings-failure" role="alert">
              {intl.formatMessage(messages.purchaseSettingsFailed)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

type DistributionCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dyson.set-bot-distribution' }
>

export interface BotDistributionProps {
  readonly locale: EnabledLocale
  readonly distribution: number
  readonly workersFraction: number
  readonly scientistsFraction: number
  readonly multitasking: boolean
  readonly routeAvailable: boolean
  readonly dispatchPlayer: (
    command: DistributionCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

export function BotDistribution({
  locale,
  distribution,
  workersFraction,
  scientistsFraction,
  multitasking,
  routeAvailable,
  dispatchPlayer,
}: BotDistributionProps) {
  const intl = useIntl()
  const [draft, setDraft] = useState(distribution)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const lastSubmitted = useRef<number | null>(null)

  useEffect(() => {
    setDraft(distribution)
    lastSubmitted.current = null
  }, [distribution])

  const commit = async (): Promise<void> => {
    if (
      multitasking ||
      !routeAvailable ||
      draft === distribution ||
      pending.current ||
      lastSubmitted.current === draft
    ) {
      return
    }
    pending.current = true
    lastSubmitted.current = draft
    try {
      const result = await dispatchPlayer({
        kind: 'dyson.set-bot-distribution',
        distribution: draft,
      })
      const rejected = result.status !== 'accepted'
      setFailed(rejected)
      if (rejected) lastSubmitted.current = null
    } catch {
      lastSubmitted.current = null
      setFailed(true)
    } finally {
      pending.current = false
    }
  }

  const sliderPercent = Math.round(
    (multitasking ? 0.5 : draft) * 100,
  )
  const displayedWorkersFraction =
    multitasking ? workersFraction : 1 - draft
  const displayedScientistsFraction =
    multitasking ? scientistsFraction : draft
  return (
    <div className="bot-distribution">
      <div className="bot-distribution__heading">
        {intl.formatMessage(messages.botDistribution)}
      </div>
      <div
        className="bot-distribution__allocation bot-distribution__allocation--workers"
        aria-hidden="true"
      >
        <span className="bot-distribution__group-name">
          {intl.formatMessage(messages.workerBots)}
        </span>
        <span className="bot-distribution__percent">
          {formatPercent(locale, displayedWorkersFraction)}
        </span>
      </div>
      <div
        className="bot-distribution__allocation bot-distribution__allocation--scientists"
        aria-hidden="true"
      >
        <span className="bot-distribution__group-name">
          {intl.formatMessage(messages.scienceBots)}
        </span>
        <span className="bot-distribution__percent">
          {formatPercent(locale, displayedScientistsFraction)}
        </span>
      </div>
      <input
        className="bot-distribution__slider"
        type="range"
        min="0"
        max="100"
        step="1"
        value={sliderPercent}
        disabled={multitasking || !routeAvailable}
        aria-label={intl.formatMessage(messages.botDistribution)}
        aria-valuetext={intl.formatMessage(
          messages.botDistributionAccessible,
          {
            workers: formatPercent(locale, displayedWorkersFraction),
            scientists: formatPercent(
              locale,
              displayedScientistsFraction,
            ),
          },
        )}
        onChange={(event) => {
          setFailed(false)
          setDraft(Number(event.currentTarget.value) / 100)
        }}
        onPointerUp={() => void commit()}
        onKeyUp={() => void commit()}
        onBlur={() => void commit()}
      />
      {failed && (
        <span className="bot-distribution__failure" role="alert">
          {intl.formatMessage(messages.distributionFailed)}
        </span>
      )}
    </div>
  )
}

function formatFact(locale: EnabledLocale, value: number): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 3,
    useGrouping: true,
  })
}

function formatPercent(locale: EnabledLocale, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}
