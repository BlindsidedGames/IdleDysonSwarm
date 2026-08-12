import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendCanonicalResources,
  FrontendGameplayDerivedFacts,
  FrontendGameplayPreviews,
  FrontendSimulationsDerivedFacts,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import type {
  RealityUpgradeId,
} from '../../../simulation/realityUpgrades'
import influenceSymbol from '../../assets/symbol-influence.png'
import strangeMatterSymbol from '../../assets/symbol-strange-matter.png'
import {
  Button,
  CollapsibleSection,
  InlineImageSymbol,
} from '../../components'
import {
  formatGameNumber,
  formatNumber,
  type NumericValue,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import {
  realityMessages as messages,
  realityUpgradeMessages as upgradeMessages,
} from './messages'
import { SimulationUpgradeRegion } from '../simulations/SimulationUpgradeRegion'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import './reality.css'

type RealityCommand = Extract<
  CanonicalPlayerCommand,
  {
    readonly kind:
      | 'reality.gather-influence'
      | 'reality.purchase-upgrade'
      | 'dream.purchase-upgrade'
  }
>

export interface RealitySurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['reality']
  readonly derived: FrontendGameplayDerivedFacts['reality']
  readonly gatherPreview:
    FrontendGameplayPreviews['reality']['gatherInfluence']
  readonly upgrades: FrontendGameplayPreviews['reality']['upgrades']
  readonly upgradeSections:
    FrontendSimulationsDerivedFacts['permanentUpgrades']['reality']
  readonly simulationUpgrades: FrontendGameplayPreviews['dream']['upgrades']
  readonly simulationUpgradeSections:
    FrontendSimulationsDerivedFacts['permanentUpgrades']['simulation']
  readonly strangeMatter: NumericValue
  readonly gatherRouteAvailable: boolean
  readonly purchaseRouteAvailable: boolean
  readonly simulationPurchaseRouteAvailable: boolean
  readonly avocatoUnlocked: boolean
  readonly onOpenAvocato: () => void
  readonly dispatchPlayer: (
    command: RealityCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

/**
 * Presents Unity's WorkerController surface from published canonical facts.
 * Worker generation, capacity, automatic gathering and Influence awards remain
 * lifecycle-owned; this component only displays them and dispatches intent.
 */
export function RealitySurface({
  locale,
  resources,
  derived,
  gatherPreview,
  upgrades,
  upgradeSections,
  simulationUpgrades,
  simulationUpgradeSections,
  strangeMatter,
  gatherRouteAvailable,
  purchaseRouteAvailable,
  simulationPurchaseRouteAvailable,
  avocatoUnlocked,
  onOpenAvocato,
  dispatchPlayer,
}: RealitySurfaceProps) {
  const intl = useIntl()
  const reducedMotion = usePrefersReducedMotion()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const artifactSource = derived.status === 'success'
    ? applyArtifactReplacements(
        intl.formatMessage(messages.artifact),
        derived.artifact.replacements,
      )
    : ''
  const artifactFrame = useArtifactAnimation(
    artifactSource,
    derived.status === 'success'
      ? derived.artifact.scrambleIntervalSeconds
      : null,
  )

  if (derived.status !== 'success') {
    return (
      <section
        className="reality-surface reality-surface--unavailable"
        aria-label={intl.formatMessage(messages.region)}
        role="alert"
      >
        {intl.formatMessage(messages.unavailable)}
      </section>
    )
  }

  const batchProgress = derived.workerBatchFillFraction
  const visualBatchProgress = Math.min(
    1,
    Math.max(
      0,
      batchProgress +
        Math.max(0, resources.workerGenerationProgress) /
          Math.max(1, Number(derived.workerBatchSize)),
    ),
  )
  const waitingForGather =
    derived.consumptionStatus === 'halted'
  const gatherDisabled =
    pending ||
    derived.autoGatherEnabled ||
    !gatherPreview.eligible ||
    !gatherRouteAvailable
  const designation = derived.nextUniverseDesignation

  const gather = async (): Promise<void> => {
    if (gatherDisabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'reality.gather-influence',
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
    <section
      className="reality-surface"
      aria-label={intl.formatMessage(messages.region)}
      data-auto-gather={derived.autoGatherEnabled}
    >
      <header className="reality-surface__summary">
        <strong>
          {intl.formatMessage(messages.universeDesignation, {
            value: formatNumber(locale, designation, {
              maximumFractionDigits: 0,
            }),
          })}
        </strong>
        <div className="reality-surface__balances">
          <strong
            className="reality-surface__balance"
            aria-label={intl.formatMessage(messages.strangeMatter, {
              value: formatGameNumber(locale, strangeMatter),
            })}
          >
            <InlineImageSymbol
              src={strangeMatterSymbol}
              symbol="strange-matter"
              tint
            />
            <span>{formatGameNumber(locale, strangeMatter)}</span>
          </strong>
          <strong
            className="reality-surface__balance"
            aria-label={intl.formatMessage(messages.influence, {
              value: formatGameNumber(locale, resources.influence),
            })}
          >
            <InlineImageSymbol
              src={influenceSymbol}
              symbol="influence"
              tint
            />
            <span>{formatGameNumber(locale, resources.influence)}</span>
          </strong>
        </div>
      </header>

      <div className="reality-surface__content">
        <div className="reality-surface__worker-stage">
          <section
            className="reality-artifact"
            aria-labelledby="reality-artifact-title"
            data-scramble-stopped={
              derived.artifact.scrambleIntervalSeconds === null
            }
            style={{
              '--reality-artifact-progress': artifactFrame.progress,
            } as CSSProperties}
          >
            <strong
              className="reality-artifact__title"
              id="reality-artifact-title"
            >
              {artifactFrame.display}
            </strong>
            <span className="reality-artifact__progress-label">
              {intl.formatMessage(
                derived.artifact.progressLabel === 'cpu-time'
                  ? messages.artifactCpuTime
                  : messages.artifactUndefined,
              )}
            </span>
            <span
              className="reality-artifact__track"
              aria-hidden="true"
            />
          </section>

          <section className="reality-worker-panel">
            <div className="reality-worker-panel__status">
              <strong>
                {intl.formatMessage(
                  waitingForGather
                    ? messages.consumptionHalted
                    : messages.consuming,
                )}
              </strong>
            </div>

            <div className="reality-worker-panel__batch">
              <RealityProgress
                label={intl.formatMessage(messages.workersReady)}
                value={batchProgress}
                visualValue={visualBatchProgress}
                normalizedRatePerSecond={
                  derived.generationPerSecond /
                  Math.max(1, Number(derived.workerBatchSize))
                }
                active={!waitingForGather && batchProgress < 1}
                wraps={derived.autoGatherEnabled}
                reducedMotion={reducedMotion}
                valueText={intl.formatMessage(
                  messages.workersReadyValue,
                  {
                    current: formatNumber(
                      locale,
                      resources.workersReady,
                      { maximumFractionDigits: 0 },
                    ),
                    total: formatNumber(
                      locale,
                      derived.workerBatchSize,
                      { maximumFractionDigits: 0 },
                    ),
                  },
                )}
              />
              <strong
                aria-label={intl.formatMessage(
                  messages.workersReadyValue,
                  {
                    current: formatNumber(
                      locale,
                      resources.workersReady,
                      { maximumFractionDigits: 0 },
                    ),
                    total: formatNumber(
                      locale,
                      derived.workerBatchSize,
                      { maximumFractionDigits: 0 },
                    ),
                  },
                )}
              >
                <InlineImageSymbol
                  src={influenceSymbol}
                  symbol="influence"
                  tint
                />
                {intl.formatMessage(
                  messages.workersReadyCompact,
                  {
                    current: formatNumber(
                      locale,
                      resources.workersReady,
                      { maximumFractionDigits: 0 },
                    ),
                    total: formatNumber(
                      locale,
                      derived.workerBatchSize,
                      { maximumFractionDigits: 0 },
                    ),
                  },
                )}
              </strong>
            </div>

            {!derived.autoGatherEnabled ? (
              <Button
                className="reality-worker-panel__gather"
                variant="primary"
                state={pending ? 'pending' : failed ? 'failure' : 'idle'}
                disabled={gatherDisabled}
                aria-label={intl.formatMessage(
                  messages.gatherAccessible,
                  {
                    value: formatGameNumber(
                      locale,
                      gatherPreview.amount,
                    ),
                  },
                )}
                onClick={() => void gather()}
              >
                {intl.formatMessage(messages.gatherInfluence)}
              </Button>
            ) : null}

            {!derived.autoGatherEnabled && (pending || failed) ? (
              <span
                className="reality-worker-panel__feedback"
                role={failed ? 'alert' : 'status'}
              >
                {intl.formatMessage(
                  failed
                    ? messages.gatherFailed
                    : messages.gatherPending,
                )}
              </span>
            ) : null}
          </section>
        </div>

        <SimulationUpgradeRegion
          locale={locale}
          sections={simulationUpgradeSections}
          previews={simulationUpgrades}
          routeAvailable={simulationPurchaseRouteAvailable}
          dispatchPlayer={dispatchPlayer}
        />

        <RealityUpgradeRegion
          locale={locale}
          sections={upgradeSections}
          previews={upgrades}
          routeAvailable={purchaseRouteAvailable}
          dispatchPlayer={dispatchPlayer}
        />

        {avocatoUnlocked ? (
          <section className="reality-avocato-entry">
            <div>
              <h2>{intl.formatMessage(messages.avocatoTitle)}</h2>
              <p>{intl.formatMessage(messages.avocatoDescription)}</p>
            </div>
            <Button variant="primary" onClick={onOpenAvocato}>
              {intl.formatMessage(messages.avocatoOpen)}
            </Button>
          </section>
        ) : null}
      </div>
    </section>
  )
}

const ARTIFACT_UPDATES_PER_SECOND = 10
const ARTIFACT_UPDATE_INTERVAL_MS =
  1_000 / ARTIFACT_UPDATES_PER_SECOND

interface ArtifactAnimationFrame {
  readonly display: string
  readonly progress: number
}

function useArtifactAnimation(
  source: string,
  intervalSeconds: number | null,
): ArtifactAnimationFrame {
  const [frame, setFrame] = useState<ArtifactAnimationFrame>(() =>
    createInitialArtifactFrame(source, intervalSeconds),
  )

  useEffect(() => {
    if (intervalSeconds === null || source.length === 0) {
      setFrame({ display: source, progress: 0 })
      return
    }

    const effectiveIntervalSeconds = Math.max(
      intervalSeconds,
      1 / ARTIFACT_UPDATES_PER_SECOND,
    )
    const stepSeconds = 1 / ARTIFACT_UPDATES_PER_SECOND
    let cycleSeconds = Math.min(stepSeconds, effectiveIntervalSeconds)
    setFrame({
      display: scrambleText(source),
      progress: cycleSeconds / effectiveIntervalSeconds,
    })
    if (cycleSeconds >= effectiveIntervalSeconds) {
      cycleSeconds = 0
    }

    const update = () => {
        cycleSeconds += stepSeconds
        const completed = cycleSeconds >= effectiveIntervalSeconds
        const progress = Math.min(
          cycleSeconds / effectiveIntervalSeconds,
          1,
        )

        setFrame((current) => ({
          display: completed
            ? scrambleText(source)
            : current.display,
          progress,
        }))

        if (completed) cycleSeconds = 0
    }
    let interval: number | undefined
    const stop = () => {
      if (interval === undefined) return
      window.clearInterval(interval)
      interval = undefined
    }
    const start = () => {
      if (
        interval !== undefined ||
        (typeof document !== 'undefined' &&
          document.visibilityState === 'hidden')
      ) {
        return
      }
      interval = window.setInterval(
        update,
        ARTIFACT_UPDATE_INTERVAL_MS,
      )
    }
    const handleVisibility = () => {
      stop()
      start()
    }
    start()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalSeconds, source])

  return frame
}

function createInitialArtifactFrame(
  source: string,
  intervalSeconds: number | null,
): ArtifactAnimationFrame {
  if (intervalSeconds === null || source.length === 0) {
    return { display: source, progress: 0 }
  }

  const effectiveIntervalSeconds = Math.max(
    intervalSeconds,
    1 / ARTIFACT_UPDATES_PER_SECOND,
  )
  return {
    display: scrambleText(source),
    progress: Math.min(
      (1 / ARTIFACT_UPDATES_PER_SECOND) /
        effectiveIntervalSeconds,
      1,
    ),
  }
}

function scrambleText(source: string): string {
  const characters = [...source]
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const value = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = value
  }
  return characters.join('')
}

interface RealityUpgradeRegionProps {
  readonly locale: EnabledLocale
  readonly sections:
    FrontendSimulationsDerivedFacts['permanentUpgrades']['reality']
  readonly previews: FrontendGameplayPreviews['reality']['upgrades']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: RealitySurfaceProps['dispatchPlayer']
}

function RealityUpgradeRegion({
  locale,
  sections,
  previews,
  routeAvailable,
  dispatchPlayer,
}: RealityUpgradeRegionProps) {
  const intl = useIntl()
  const previewById = new Map(
    previews.map((preview) => [preview.upgradeId, preview]),
  )
  const anomalyCategories = [
    {
      id: 'translation',
      title: messages.translationCategory,
      previews: sections.translation.flatMap((upgradeId) => {
        const preview = previewById.get(upgradeId)
        return preview ? [preview] : []
      }),
    },
    {
      id: 'speed',
      title: messages.speedCategory,
      previews: sections.speed.flatMap((upgradeId) => {
        const preview = previewById.get(upgradeId)
        return preview ? [preview] : []
      }),
    },
  ] as const
  const qualityPreviews = sections.qualityOfLife.flatMap((upgradeId) => {
    const preview = previewById.get(upgradeId)
    return preview ? [preview] : []
  })
  const hasAnomalyUpgrades = anomalyCategories.some(
    (category) => category.previews.length > 0,
  )

  if (!hasAnomalyUpgrades && qualityPreviews.length === 0) {
    return null
  }

  return (
    <CollapsibleSection
      className="reality-upgrades"
      contentClassName="reality-upgrades__content"
      ariaLabel={intl.formatMessage(messages.upgrades)}
      defaultExpanded={false}
      storageKey="reality.permanent-upgrades"
      title={intl.formatMessage(messages.upgrades)}
    >
      {hasAnomalyUpgrades ? (
        <CollapsibleSection
          className="reality-upgrade-category reality-upgrade-category--anomaly"
          contentClassName="reality-upgrade-category__content"
          defaultExpanded={false}
          headingLevel="h3"
          storageKey="reality.permanent-upgrades.anomaly"
          title={intl.formatMessage(messages.anomalyCategory)}
        >
          {anomalyCategories.map((category) =>
            category.previews.length > 0 ? (
              <CollapsibleSection
                className="reality-upgrade-subcategory"
                contentClassName="reality-upgrade-subcategory__content"
                defaultExpanded={false}
                headingLevel="h4"
                key={category.id}
                storageKey={`reality.permanent-upgrades.anomaly.${category.id}`}
                title={intl.formatMessage(category.title)}
              >
                <ol>
                  {category.previews.map((preview) => (
                    <li key={preview.upgradeId}>
                      <RealityUpgradeCard
                        locale={locale}
                        preview={preview}
                        routeAvailable={routeAvailable}
                        dispatchPlayer={dispatchPlayer}
                      />
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
            ) : null,
          )}
        </CollapsibleSection>
      ) : null}

      {qualityPreviews.length > 0 ? (
        <CollapsibleSection
          className="reality-upgrade-category reality-upgrade-category--quality"
          contentClassName="reality-upgrade-category__content"
          defaultExpanded={false}
          headingLevel="h3"
          storageKey="reality.permanent-upgrades.quality"
          title={intl.formatMessage(messages.qualityCategory)}
        >
          <ol>
            {qualityPreviews.map((preview) => (
              <li key={preview.upgradeId}>
                <RealityUpgradeCard
                  locale={locale}
                  preview={preview}
                  routeAvailable={routeAvailable}
                  dispatchPlayer={dispatchPlayer}
                />
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      ) : null}
    </CollapsibleSection>
  )
}

interface RealityUpgradeCardProps {
  readonly locale: EnabledLocale
  readonly preview:
    FrontendGameplayPreviews['reality']['upgrades'][number]
  readonly routeAvailable: boolean
  readonly dispatchPlayer: RealitySurfaceProps['dispatchPlayer']
}

function RealityUpgradeCard({
  locale,
  preview,
  routeAvailable,
  dispatchPlayer,
}: RealityUpgradeCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const copy = UPGRADE_COPY[preview.upgradeId]
  const name = intl.formatMessage(copy.title)
  const disabled =
    pending || !preview.eligible || !routeAvailable

  const purchase = async (): Promise<void> => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'reality.purchase-upgrade',
        upgradeId: preview.upgradeId,
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
    <article
      className="reality-upgrade-card"
      aria-label={name}
    >
      <div className="reality-upgrade-card__copy">
        <h4>{name}</h4>
        <p>{intl.formatMessage(copy.description)}</p>
      </div>
      <Button
        variant="primary"
        state={pending ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={disabled}
        aria-label={intl.formatMessage(
          messages.purchaseAccessible,
          {
            name,
            value: formatGameNumber(locale, preview.cost),
          },
        )}
        onClick={() => void purchase()}
      >
        <span>{intl.formatMessage(messages.purchase)}</span>
        <strong className="reality-upgrade-card__cost">
          <InlineImageSymbol
            src={strangeMatterSymbol}
            symbol="strange-matter"
            tint
          />
          <span>{formatGameNumber(locale, preview.cost)}</span>
        </strong>
      </Button>
      {pending || failed ? (
        <span
          className="reality-upgrade-card__feedback"
          role={failed ? 'alert' : 'status'}
        >
          {intl.formatMessage(
            failed
              ? messages.purchaseFailed
              : messages.purchasePending,
            { name },
          )}
        </span>
      ) : null}
    </article>
  )
}

interface RealityProgressProps {
  readonly label: string
  readonly value: number
  readonly visualValue?: number
  readonly valueText?: string
  readonly normalizedRatePerSecond: number
  readonly active: boolean
  readonly wraps: boolean
  readonly reducedMotion: boolean
}

function RealityProgress({
  label,
  value,
  visualValue = value,
  valueText,
  normalizedRatePerSecond,
  active,
  wraps,
  reducedMotion,
}: RealityProgressProps) {
  const normalized = Math.min(1, Math.max(0, value))
  const visualNormalized = Math.min(1, Math.max(0, visualValue))
  const fillRef = useRef<HTMLSpanElement>(null)
  useForwardProgressAnimation(fillRef, {
    canonicalProgress: visualNormalized,
    normalizedRatePerSecond,
    active,
    wraps,
    reducedMotion,
  })

  return (
    <div
      className="reality-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized * 100)}
      aria-valuetext={valueText}
    >
      <span
        ref={fillRef}
        aria-hidden="true"
        style={{ transform: `scaleX(${visualNormalized})` }}
      />
    </div>
  )
}

function applyArtifactReplacements(
  localizedArtifactName: string,
  replacements: FrontendGameplayDerivedFacts['reality']['artifact']['replacements'],
): string {
  let text = localizedArtifactName
  for (const replacement of replacements) {
    text = text.replaceAll(replacement.source, replacement.replacement)
  }
  return text
}

const UPGRADE_COPY: Readonly<
  Record<
    RealityUpgradeId,
    {
      readonly title: MessageDescriptor
      readonly description: MessageDescriptor
    }
  >
> = {
  translation1: {
    title: upgradeMessages.translation1Title,
    description: upgradeMessages.translation1Description,
  },
  translation2: {
    title: upgradeMessages.translation2Title,
    description: upgradeMessages.translation2Description,
  },
  translation3: {
    title: upgradeMessages.translation3Title,
    description: upgradeMessages.translation3Description,
  },
  translation4: {
    title: upgradeMessages.translation4Title,
    description: upgradeMessages.translation4Description,
  },
  translation5: {
    title: upgradeMessages.translation5Title,
    description: upgradeMessages.translation5Description,
  },
  translation6: {
    title: upgradeMessages.translation6Title,
    description: upgradeMessages.translation6Description,
  },
  translation7: {
    title: upgradeMessages.translation7Title,
    description: upgradeMessages.translation7Description,
  },
  translation8: {
    title: upgradeMessages.translation8Title,
    description: upgradeMessages.translation8Description,
  },
  speed1: {
    title: upgradeMessages.speed1Title,
    description: upgradeMessages.speed1Description,
  },
  speed2: {
    title: upgradeMessages.speed2Title,
    description: upgradeMessages.speed2Description,
  },
  speed3: {
    title: upgradeMessages.speed3Title,
    description: upgradeMessages.speed3Description,
  },
  speed4: {
    title: upgradeMessages.speed4Title,
    description: upgradeMessages.speed4Description,
  },
  speed5: {
    title: upgradeMessages.speed5Title,
    description: upgradeMessages.speed5Description,
  },
  speed6: {
    title: upgradeMessages.speed6Title,
    description: upgradeMessages.speed6Description,
  },
  speed7: {
    title: upgradeMessages.speed7Title,
    description: upgradeMessages.speed7Description,
  },
  speed8: {
    title: upgradeMessages.speed8Title,
    description: upgradeMessages.speed8Description,
  },
  doubleTimeOwned: {
    title: upgradeMessages.doubleTimeOwnedTitle,
    description: upgradeMessages.doubleTimeOwnedDescription,
  },
  workerAutoConvert: {
    title: upgradeMessages.workerAutoConvertTitle,
    description: upgradeMessages.workerAutoConvertDescription,
  },
}
