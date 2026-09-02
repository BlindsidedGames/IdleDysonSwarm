import type { ReactNode } from 'react'
import { SettingsIcon } from './SettingsIcon'
import './progressControlsPanel.css'

export interface ProgressControlsPanelProps {
  readonly ariaLabel: string
  readonly className?: string
  readonly aboveSummary?: ReactNode
  readonly summary: ReactNode
  readonly expanded: boolean
  readonly controlsId: string
  readonly settingsLabel: string
  readonly settingsTrigger?: ReactNode
  readonly settingsAvailable?: boolean
  readonly settingsEnabled?: boolean
  readonly onExpandedChange: (expanded: boolean) => void
  readonly children?: ReactNode
}

/** Shared compact status dock with one stable settings cell. */
export function ProgressControlsPanel({
  ariaLabel,
  className,
  aboveSummary,
  summary,
  expanded,
  controlsId,
  settingsLabel,
  settingsTrigger,
  settingsAvailable = true,
  settingsEnabled = true,
  onExpandedChange,
  children,
}: ProgressControlsPanelProps) {
  const controlsExpanded = settingsAvailable && settingsEnabled && expanded

  return (
    <section
      className={`ui-progress-controls-panel${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      data-expanded={controlsExpanded || undefined}
      data-settings-available={settingsAvailable || undefined}
    >
      <div
        className={
          `ui-progress-controls-panel__collapsed${
            aboveSummary !== undefined
              ? ' ui-progress-controls-panel__collapsed--with-above-summary'
              : ''
          }`
        }
      >
        {aboveSummary !== undefined ? (
          <div className="ui-progress-controls-panel__above-summary">
            {aboveSummary}
          </div>
        ) : null}
        <div className="ui-progress-controls-panel__summary">{summary}</div>
        {settingsAvailable ? (
          <button
            type="button"
            className="ui-progress-controls-panel__settings"
            aria-label={settingsLabel}
            aria-expanded={controlsExpanded}
            aria-controls={controlsId}
            disabled={!settingsEnabled}
            onClick={() => onExpandedChange(!controlsExpanded)}
          >
            {settingsTrigger ?? <SettingsIcon />}
          </button>
        ) : null}
      </div>
      {controlsExpanded ? (
        <div id={controlsId} className="ui-progress-controls-panel__body">
          {children}
        </div>
      ) : null}
    </section>
  )
}
