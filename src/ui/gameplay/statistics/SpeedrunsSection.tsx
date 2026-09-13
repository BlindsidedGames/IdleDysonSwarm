import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { elapsedSpeedrunSeconds, SPEEDRUN_MILESTONES, speedrunEligible, type RunUsage, type SpeedrunStatistics } from '../../../simulation/speedrunStatistics'
import { formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { statisticsMessages as messages } from './messages'

export function SpeedrunsSection({ run, locale }: { readonly run?: SpeedrunStatistics; readonly locale: EnabledLocale }) {
  const intl = useIntl()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const usage = (value: RunUsage) => intl.formatMessage(value === 'yes' ? messages.speedrunYes : value === 'no' ? messages.speedrunNo : messages.speedrunUnknown)
  const elapsed = run ? elapsedSpeedrunSeconds(run, now) : null
  const labels = { firstInfinity: messages.speedrunFirstInfinity, firstQuantumLeap: messages.speedrunFirstQuantum,
    reality: messages.speedrunReality, doubleSpeed: messages.speedrunDoubleSpeed, debugQualification: messages.speedrunDebugQualification }
  return <section className="statistics-speedruns" aria-label={intl.formatMessage(messages.speedruns)}>
    <h2>{intl.formatMessage(messages.speedruns)}</h2>
    <article className="statistics-card">
      <h3>{intl.formatMessage(messages.speedrunCurrentSave)}</h3>
      <dl className="statistics-speedruns__facts">
        <div><dt>{intl.formatMessage(messages.speedrunElapsed)}</dt><dd>{elapsed === null ? intl.formatMessage(messages.speedrunUnknown) : formatGameDuration(locale, elapsed)}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunStored)}</dt><dd>{usage(run?.storedTime ?? 'unknown')}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunDebug)}</dt><dd>{usage(run?.debug ?? 'unknown')}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunEligibility)}</dt><dd>{intl.formatMessage(run?.debug === 'yes' ? messages.speedrunIneligible : run && speedrunEligible(run) ? messages.speedrunEligible : messages.speedrunUnverified)}</dd></div>
      </dl>
      <details className="statistics-speedruns__details">
        <summary>{intl.formatMessage(messages.speedrunDetails)}</summary>
        <p className="statistics-speedruns__note">{intl.formatMessage(messages.speedrunBasis)}</p>
      <p className="statistics-speedruns__note">{intl.formatMessage(messages.speedrunHistory)}</p>
      </details>
    </article>
    <div className="statistics-speedruns__milestones">
      {SPEEDRUN_MILESTONES.map(id => {
        const milestone = run?.milestones[id]
        return <article className="statistics-card" key={id} data-speedrun-milestone={id}>
          <h3>{intl.formatMessage(labels[id])}</h3>
          <dl className="statistics-speedruns__facts">
            <div><dt>{intl.formatMessage(messages.speedrunTime)}</dt><dd>{!milestone ? intl.formatMessage(messages.speedrunNotRecorded) : milestone.elapsedSeconds === null ? intl.formatMessage(messages.speedrunUnknown) : formatGameDuration(locale, milestone.elapsedSeconds)}</dd></div>
            {milestone && <>
              <div><dt>{intl.formatMessage(messages.speedrunStored)}</dt><dd>{usage(milestone.storedTime)}</dd></div>
              <div><dt>{intl.formatMessage(messages.speedrunDebug)}</dt><dd>{usage(milestone.debug)}</dd></div>
            </>}
          </dl>
        </article>
      })}
    </div>
  </section>
}
