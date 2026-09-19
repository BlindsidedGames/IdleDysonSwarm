import { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { elapsedSpeedrunSeconds, SPEEDRUN_MILESTONES, speedrunEligible, type RunUsage, type SpeedrunStatistics } from '../../../simulation/speedrunStatistics'
import { formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { statisticsMessages as messages } from './messages'
import { boostMessages } from '../store/boostMessages'

export function SpeedrunsSection({ run, locale }: { readonly run?: SpeedrunStatistics; readonly locale: EnabledLocale }) {
  const intl = useIntl()
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const usage = (value: RunUsage) => intl.formatMessage(value === 'yes' ? messages.speedrunYes : value === 'no' ? messages.speedrunNo : messages.speedrunUnknown)
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
        <div><dt>{intl.formatMessage(messages.speedrunStored)}</dt><dd>{usage(run?.storedTime ?? 'unknown')}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunDebug)}</dt><dd>{usage(run?.debug ?? 'unknown')}</dd></div>
        <div><dt>{intl.formatMessage(boostMessages.used)}</dt><dd>{usage(run?.botBoostUsed ? 'yes' : 'no')}</dd></div>
        <div><dt>{intl.formatMessage(messages.speedrunEligibility)}</dt><dd>{intl.formatMessage(run?.debug === 'yes' ? messages.speedrunIneligible : run && speedrunEligible(run) ? messages.speedrunEligible : messages.speedrunUnverified)}</dd></div>
      </dl>
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
              <div><dt>{intl.formatMessage(boostMessages.used)}</dt><dd>{usage(milestone.botBoostUsed ? 'yes' : 'no')}</dd></div>
            </>}
          </dl>
        </article>
      })}
    </div>
  </section>
}
