import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import type {
  FrontendDysonPresentationFacts,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type {
  CanonicalFacilityId,
  CanonicalSkillPresetAutomationSlot,
  SkillPresetState,
} from '../../../game-state/types'
import {
  PresetAutomationSelect,
  ProgressControlsPanel,
} from '../../components'
import {
  formatGameNumber,
} from '../../i18n/formatters'
import type {
  EnabledLocale,
} from '../../i18n/localeRegistry'
import {
  readPresentationPreference,
  writeBooleanPresentationPreference,
} from '../../presentationPreferences'
import type {
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import { BUY_MODE_OPTIONS } from '../buyModeOptions'
import { basicFacilityMessages as facilityMessages } from '../facilities/messages'
import { readyDysonMessages as messages } from './messages'
import './dysonControls.css'

export interface DysonInfoProps {
  readonly summary: ReactNode
  readonly statusSummary?: ReactNode
  readonly buyMode: DysonBuyMode
  readonly roundedBulkBuy: boolean
  readonly presets: readonly SkillPresetState[]
  readonly presetAutomationSlot: CanonicalSkillPresetAutomationSlot
  readonly automationUnlocked: boolean
  readonly automationFacilityIds: readonly CanonicalFacilityId[]
  readonly automationEnabledFacilities: Readonly<Record<CanonicalFacilityId, boolean>>
  readonly buyModeRouteAvailable: boolean
  readonly roundedBulkRouteAvailable: boolean
  readonly presetAutomationRouteAvailable: boolean
  readonly automationRouteAvailable: boolean
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
      | 'dyson.set-facility-automation'
      | 'skill.set-tab-preset-automation'
  }
>

type DysonBuyMode = Extract<
  DysonSettingsCommand,
  { readonly kind: 'dyson.set-buy-mode' }
>['buyMode']

const SHOW_RUN_FACTS_WHEN_COLLAPSED_KEY =
  'idle-dyson-swarm.bots.show-run-facts-when-collapsed.v1'

export function DysonInfo({
  summary,
  statusSummary,
  buyMode,
  roundedBulkBuy,
  presets,
  presetAutomationSlot,
  automationUnlocked,
  automationFacilityIds,
  automationEnabledFacilities,
  buyModeRouteAvailable,
  roundedBulkRouteAvailable,
  presetAutomationRouteAvailable,
  automationRouteAvailable,
  dispatchPlayer,
}: DysonInfoProps) {
  const intl = useIntl()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showRunFactsWhenCollapsed, setShowRunFactsWhenCollapsed] =
    useState(
      () => readPresentationPreference(
        SHOW_RUN_FACTS_WHEN_COLLAPSED_KEY,
      ) !== 'false',
    )
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)
  const [automationOverrides, setAutomationOverrides] = useState<
    Partial<Record<CanonicalFacilityId, boolean>>
  >({})
  const [automationFailures, setAutomationFailures] = useState<
    ReadonlySet<CanonicalFacilityId>
  >(new Set())
  const automationVersions = useRef(
    new Map<CanonicalFacilityId, number>(),
  )
  const settingsId = useId()
  const applySetting = async (
    command: DysonSettingsCommand,
  ): Promise<void> => applySettings([command])

  const applySettings = async (
    commands: readonly DysonSettingsCommand[],
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

  const automationEnabled = (facilityId: CanonicalFacilityId) =>
    automationOverrides[facilityId] ??
    automationEnabledFacilities[facilityId]

  const setFacilityAutomation = (
    facilityId: CanonicalFacilityId,
    enabled: boolean,
  ): void => {
    const version = (automationVersions.current.get(facilityId) ?? 0) + 1
    automationVersions.current.set(facilityId, version)
    setAutomationOverrides((current) => ({
      ...current,
      [facilityId]: enabled,
    }))
    setAutomationFailures((current) => {
      if (!current.has(facilityId)) return current
      const next = new Set(current)
      next.delete(facilityId)
      return next
    })

    void dispatchPlayer({
      kind: 'dyson.set-facility-automation',
      facilityId,
      enabled,
    })
      .then((result) => {
        if (automationVersions.current.get(facilityId) !== version) return
        setAutomationOverrides((current) => {
          const next = { ...current }
          delete next[facilityId]
          return next
        })
        if (result.status !== 'accepted') {
          setAutomationFailures((current) =>
            new Set(current).add(facilityId),
          )
        }
      })
      .catch(() => {
        if (automationVersions.current.get(facilityId) !== version) return
        setAutomationOverrides((current) => {
          const next = { ...current }
          delete next[facilityId]
          return next
        })
        setAutomationFailures((current) =>
          new Set(current).add(facilityId),
        )
      })
  }

  return (
    <ProgressControlsPanel
      ariaLabel={intl.formatMessage(messages.purchaseSettings)}
      className="dyson-info ui-progress-controls-panel--production-summary"
      expanded={settingsOpen}
      controlsId={settingsId}
      settingsLabel={intl.formatMessage(messages.purchaseSettings)}
      onExpandedChange={setSettingsOpen}
      aboveSummary={
        !settingsOpen && showRunFactsWhenCollapsed
          ? statusSummary
          : undefined
      }
      summary={summary}
    >
        <div className="dyson-info__settings">
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
          <label className="dyson-info__collapsed-facts-toggle">
            <input
              type="checkbox"
              checked={showRunFactsWhenCollapsed}
              onChange={(event) => {
                const enabled = event.currentTarget.checked
                setShowRunFactsWhenCollapsed(enabled)
                writeBooleanPresentationPreference(
                  SHOW_RUN_FACTS_WHEN_COLLAPSED_KEY,
                  enabled,
                )
              }}
            />
            <span>
              {intl.formatMessage(messages.showRunFactsWhenCollapsed)}
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
                tab: 'bots',
                slot,
              })
            }
          />
          {automationUnlocked && automationFacilityIds.length > 0 ? (
            <fieldset className="dyson-info__automation">
              <legend>{intl.formatMessage(messages.autoPurchase)}</legend>
              <button
                type="button"
                className="dyson-info__automation-toggle-all"
                disabled={!automationRouteAvailable}
                onClick={() => {
                  const enabled = automationFacilityIds.some(
                    (facilityId) => !automationEnabled(facilityId),
                  )
                  automationFacilityIds.forEach((facilityId) =>
                    setFacilityAutomation(facilityId, enabled),
                  )
                }}
              >
                {intl.formatMessage(messages.toggleAll)}
              </button>
              <div className="dyson-info__automation-grid">
                {automationFacilityIds.map((facilityId) => (
                  <label
                    key={facilityId}
                    data-save-error={
                      automationFailures.has(facilityId) || undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={automationEnabled(facilityId)}
                      disabled={!automationRouteAvailable}
                      aria-invalid={
                        automationFailures.has(facilityId) || undefined
                      }
                      onChange={(event) =>
                        setFacilityAutomation(
                          facilityId,
                          event.currentTarget.checked,
                        )
                      }
                    />
                    <span>{intl.formatMessage(facilityAutomationMessage(facilityId))}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {settingFailed && (
            <span className="dyson-info__settings-failure" role="alert">
              {intl.formatMessage(messages.purchaseSettingsFailed)}
            </span>
          )}
          {statusSummary !== undefined && (
            <div className="dyson-info__run-status">
              {statusSummary}
            </div>
          )}
        </div>
    </ProgressControlsPanel>
  )
}

export interface DysonRunFactsProps {
  readonly locale: EnabledLocale
  readonly metric: FrontendDysonPresentationFacts['activePanelMetric']
  readonly panelLifetimeSeconds: number
  readonly totalPanelsDecayed: number
}

export function DysonRunFacts({
  locale,
  metric,
  panelLifetimeSeconds,
  totalPanelsDecayed,
}: DysonRunFactsProps) {
  const compactMetricMessage =
    metric.kind === 'active-panels'
      ? messages.compactActivePanels
      : metric.kind === 'stars-surrounded'
        ? messages.compactStarsSurrounded
        : messages.compactGalaxiesEngulfed

  return (
    <div className="dyson-info__run-facts">
      <span className="dyson-info__fact">
        <FormattedMessage
          {...compactMetricMessage}
          values={{
            value: formatGameNumber(locale, metric.value),
            emphasis: (chunks) => (
              <span className="dyson-info__value">{chunks}</span>
            ),
          }}
        />
      </span>
      <span className="dyson-info__fact">
        <FormattedMessage
          {...messages.compactPanelLifetime}
          values={{
            value: formatGameNumber(locale, panelLifetimeSeconds),
            emphasis: (chunks) => (
              <span className="dyson-info__value">{chunks}</span>
            ),
          }}
        />
      </span>
      <span className="dyson-info__fact">
        <FormattedMessage
          {...messages.compactTotalPanelsDecayed}
          values={{
            value: formatGameNumber(locale, totalPanelsDecayed),
            emphasis: (chunks) => (
              <span className="dyson-info__value">{chunks}</span>
            ),
          }}
        />
      </span>
    </div>
  )
}

export interface DysonGoalSummaryProps {
  readonly locale: EnabledLocale
  readonly currentGoal: FrontendDysonPresentationFacts['currentGoal']
}

export function DysonGoalSummary({
  locale,
  currentGoal,
}: DysonGoalSummaryProps) {
  const intl = useIntl()
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
  const compactGoalMessage =
    currentGoal.kind === 'create-bots' ||
    currentGoal.kind === 'reach-bots'
      ? messages.compactGoalBots
      : currentGoal.kind === 'build-assembly-lines'
        ? messages.compactGoalAssemblyLines
        : currentGoal.kind === 'have-active-panels'
          ? messages.compactGoalPanels
          : currentGoal.kind === 'own-planets'
            ? messages.compactGoalPlanets
            : currentGoal.kind === 'decay-panels'
              ? messages.compactGoalDecayed
              : currentGoal.kind === 'surround-stars'
                ? messages.compactGoalStars
                : messages.compactGoalGalaxies
  return (
    <span
      title={intl.formatMessage(goalMessage, {
        target: currentGoal.target,
        targetDisplay: formatGameNumber(locale, currentGoal.target),
      })}
    >
      <FormattedMessage
        {...compactGoalMessage}
        values={{
          targetDisplay: formatGameNumber(locale, currentGoal.target),
          emphasis: (chunks) => <>{chunks}</>,
        }}
      />
    </span>
  )
}

function facilityAutomationMessage(facilityId: CanonicalFacilityId) {
  switch (facilityId) {
    case 'assembly_lines': return facilityMessages.assemblyLinesName
    case 'ai_managers': return facilityMessages.aiManagersName
    case 'servers': return facilityMessages.serversName
    case 'data_centers': return facilityMessages.dataCentersName
    case 'planets': return facilityMessages.planetsName
    case 'matrioshka_brains': return facilityMessages.matrioshkaBrainsName
    case 'birch_planets': return facilityMessages.birchPlanetsName
    case 'galactic_brains': return facilityMessages.galacticBrainsName
  }
}

type DistributionCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dyson.set-bot-distribution' }
>

export interface BotDistributionProps {
  readonly locale: EnabledLocale
  readonly distribution: number
  readonly multitasking: boolean
  readonly routeAvailable: boolean
  readonly dispatchPlayer: (
    command: DistributionCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

export function BotDistribution({
  locale,
  distribution,
  multitasking,
  routeAvailable,
  dispatchPlayer,
}: BotDistributionProps) {
  const intl = useIntl()
  const [draft, setDraft] = useState(distribution)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const latestDraft = useRef(distribution)
  const confirmed = useRef(distribution)
  const pointerActive = useRef(false)
  const queued = useRef<number | null>(null)
  const available = useRef(routeAvailable && !multitasking)

  useEffect(() => {
    available.current = routeAvailable && !multitasking
    if (!available.current) {
      pointerActive.current = false
      queued.current = null
    }
    return () => {
      available.current = false
      pointerActive.current = false
      queued.current = null
    }
  }, [routeAvailable, multitasking])

  useEffect(() => {
    confirmed.current = distribution
    // A completed command can publish while a newer gesture is still pending.
    if (!pending.current && !pointerActive.current && queued.current === null) {
      latestDraft.current = distribution
      setDraft(distribution)
    }
  }, [distribution])

  if (multitasking) {
    return (
      <div className="bot-distribution bot-distribution--multitasking">
        <FormattedMessage
          {...messages.botMultitaskingEfficiency}
          values={{
            workers: (chunks) => (
              <span className="bot-distribution__multitasking-workers">
                {chunks}
              </span>
            ),
            science: (chunks) => (
              <span className="bot-distribution__multitasking-science">
                {chunks}
              </span>
            ),
          }}
        />
      </div>
    )
  }

  const commit = async (value = latestDraft.current): Promise<void> => {
    if (!available.current) return
    queued.current = value
    if (pending.current) return

    pending.current = true
    try {
      while (available.current && queued.current !== null) {
        const next = queued.current
        queued.current = null
        if (next === confirmed.current) continue
        try {
          const result = await dispatchPlayer({
            kind: 'dyson.set-bot-distribution',
            distribution: next,
          })
          const rejected = result.status !== 'accepted'
          if (!rejected) confirmed.current = next
          setFailed(rejected)
        } catch {
          setFailed(true)
        }
      }
    } finally {
      pending.current = false
    }
  }

  const finishPointer = (): void => {
    pointerActive.current = false
    void commit()
  }

  const sliderPercent = Math.round(
    draft * 100,
  )
  const displayedWorkersFraction = 1 - draft
  const displayedScientistsFraction = draft
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
        disabled={!routeAvailable}
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
          const next = Number(event.currentTarget.value) / 100
          latestDraft.current = next
          setDraft(next)
          // Track taps can emit their value change after pointerup on iOS.
          if (!pointerActive.current) void commit(next)
        }}
        onPointerDown={() => { pointerActive.current = true }}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onKeyUp={() => void commit()}
        onBlur={finishPointer}
      />
      {failed && (
        <span className="bot-distribution__failure" role="alert">
          {intl.formatMessage(messages.distributionFailed)}
        </span>
      )}
    </div>
  )
}

function formatPercent(locale: EnabledLocale, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}
