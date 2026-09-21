import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { elapsedSpeedrunSeconds, SPEEDRUN_MILESTONES, speedrunEligible, type SpeedrunStatistics } from '../../../simulation/speedrunStatistics'
import { formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { statisticsMessages as messages } from './messages'
import { SpeedrunUsage } from './SpeedrunUsage'

export function SpeedrunsSection({ run, locale }: { readonly run?: SpeedrunStatistics; readonly locale: EnabledLocale }) {
  const intl = useIntl()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const elapsed = run ? elapsedSpeedrunSeconds(run, now) : null
  const labels = { firstInfinity: messages.speedrunFirstInfinity, firstQuantumLeap: messages.speedrunFirstQuantum,
    reality: messages.speedrunReality, doubleSpeed: messages.speedrunDoubleSpeed, debugQualification: messages.speedrunDebugQualification }
  return <section className="statistics-speedruns" aria-label={intl.formatMessage(messages.speedruns)}>
    <article className="statistics-card">
      <h3>{intl.formatMessage(messages.speedrunCurrentSave)}</h3>
      <dl className="statistics-speedruns__facts">
        <div><dt>{intl.formatMessage(messages.saveCreated)}</dt><dd>{run?.startedAtMilliseconds == null ? intl.formatMessage(messages.speedrunUnknown) : intl.formatDate(run.startedAtMilliseconds, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}</dd></div>
        <div><dt>{intl.formatMessage(messages.saveCreatedWith)}</dt><dd>{run?.createdWithVersion ?? intl.formatMessage(messages.speedrunUnknown)}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunElapsed)}</dt><dd>{elapsed === null ? intl.formatMessage(messages.speedrunUnknown) : formatGameDuration(locale, elapsed)}</dd></div>
        <div><dt>{intl.formatMessage(messages.activeElapsed)}</dt><dd>{run?.activeSeconds === undefined ? intl.formatMessage(messages.speedrunUnknown) : formatGameDuration(locale, run.activeSeconds)}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunEligibility)}</dt><dd>{intl.formatMessage(run?.imported ? messages.importedRun : run?.debug === 'yes' ? messages.speedrunIneligible : run && speedrunEligible(run) ? messages.speedrunEligible : messages.speedrunUnverified)}</dd></div>
      </dl>
      <SpeedrunUsage usage={run} />
    </article>
    <div className="statistics-speedruns__milestones">
      {SPEEDRUN_MILESTONES.map(id => {
        const milestone = run?.milestones[id]
        return <article className="statistics-card" key={id} data-speedrun-milestone={id}>
          <h3>{intl.formatMessage(labels[id])}</h3>
          {[{ label: messages.currentRun, result: milestone, current: true }, { label: messages.personalBest, result: run?.personalBests?.[id], current: false }].map(({ label, result, current }) => {
            const seconds = result ? result.elapsedSeconds : current ? elapsed : null
            return <section className="speedrun-result" key={label.id} aria-label={intl.formatMessage(label)}>
              <div className="speedrun-result__heading">
                <h4>{intl.formatMessage(label)}</h4>
                <p className="speedrun-result__time">{!current && !result ? intl.formatMessage(messages.speedrunNotRecorded) : seconds === null ? intl.formatMessage(messages.speedrunUnknown) : formatGameDuration(locale, seconds)}</p>
              </div>
              {(current || result) && <SpeedrunUsage usage={result ?? run} />}
            </section>
          })}
        </article>
      })}
    </div>
    <footer className="speedrun-legend"><h3>{intl.formatMessage(messages.usageLegend)}</h3><SpeedrunUsage legend /></footer>
  </section>
}
