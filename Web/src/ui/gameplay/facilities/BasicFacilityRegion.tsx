import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  useIntl,
  type IntlShape,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendDysonVisibility,
  FrontendGameplayPreviews,
  FrontendGameplaySnapshot,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import {
  Button,
  FacilityCard,
} from '../../components'
import {
  formatGameNumber,
  formatNumber,
  type NumericValue,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { basicFacilityMessages as messages } from './messages'
import { FacilityDetailsDialog } from './FacilityDetailsDialog'
import {
  clampProgress,
  interpolatePublishedFacilityProgress,
} from './progressInterpolation'
import './facilities.css'

export type EarlyBasicFacilityId =
  FrontendDysonVisibility['visibleBasicFacilityIds'][number]

export type BasicFacilityPurchasePreview =
  FrontendGameplayPreviews['dyson']['basicFacilities'][number]

export type BasicFacilityPurchaseCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dyson.purchase-basic-facility' }
>

export type BasicFacilityCanonicalFact =
  Extract<
    FrontendGameplaySnapshot['derived']['dyson'],
    { readonly status: 'ready' }
  >['value']['presentation']['facilities'][EarlyBasicFacilityId]

export interface BasicFacilityPresentationRevision {
  readonly session: number
  readonly state: number
}

export interface BasicFacilityRegionProps {
  readonly locale: EnabledLocale
  readonly visibleBasicFacilityIds:
    FrontendDysonVisibility['visibleBasicFacilityIds']
  readonly showNextTierTeaser:
    FrontendDysonVisibility['showNextTierTeaser']
  readonly facilityFacts: Readonly<
    Record<EarlyBasicFacilityId, BasicFacilityCanonicalFact>
  >
  readonly purchasePreviews:
    FrontendGameplayPreviews['dyson']['basicFacilities']
  readonly purchaseRouteAvailable: boolean
  readonly revision: BasicFacilityPresentationRevision
  readonly dispatchPlayer: (
    command: BasicFacilityPurchaseCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly headingLevel?: 'h2' | 'h3'
}

type PurchaseFeedback = {
  readonly state: 'success' | 'stale' | 'rejected' | 'failed'
  readonly revision: BasicFacilityPresentationRevision
  readonly activationRevision: BasicFacilityPresentationRevision
}

interface FacilityPresentationMessages {
  readonly name: MessageDescriptor
  readonly identity: MessageDescriptor
  readonly description: MessageDescriptor
  readonly purchasePrompt: MessageDescriptor
  readonly purchaseAccessible: MessageDescriptor
  readonly productionPerSecond: MessageDescriptor
  readonly productionSeconds: MessageDescriptor
  readonly productionMinutes: MessageDescriptor
}

const facilityMessages: Readonly<
  Record<EarlyBasicFacilityId, FacilityPresentationMessages>
> = {
  assembly_lines: {
    name: messages.assemblyLinesName,
    identity: messages.assemblyLinesIdentity,
    description: messages.assemblyLinesDescription,
    purchasePrompt: messages.purchaseAssemblyLine,
    purchaseAccessible: messages.purchaseAssemblyLineAccessible,
    productionPerSecond:
      messages.assemblyLinesProductionPerSecond,
    productionSeconds: messages.assemblyLinesProductionSeconds,
    productionMinutes: messages.assemblyLinesProductionMinutes,
  },
  ai_managers: {
    name: messages.aiManagersName,
    identity: messages.aiManagersIdentity,
    description: messages.aiManagersDescription,
    purchasePrompt: messages.purchaseAiManager,
    purchaseAccessible: messages.purchaseAiManagerAccessible,
    productionPerSecond: messages.aiManagersProductionPerSecond,
    productionSeconds: messages.aiManagersProductionSeconds,
    productionMinutes: messages.aiManagersProductionMinutes,
  },
  servers: {
    name: messages.serversName,
    identity: messages.serversIdentity,
    description: messages.serversDescription,
    purchasePrompt: messages.purchaseServer,
    purchaseAccessible: messages.purchaseServerAccessible,
    productionPerSecond: messages.serversProductionPerSecond,
    productionSeconds: messages.serversProductionSeconds,
    productionMinutes: messages.serversProductionMinutes,
  },
  data_centers: {
    name: messages.dataCentersName,
    identity: messages.dataCentersIdentity,
    description: messages.dataCentersDescription,
    purchasePrompt: messages.purchaseDataCenter,
    purchaseAccessible: messages.purchaseDataCenterAccessible,
    productionPerSecond:
      messages.dataCentersProductionPerSecond,
    productionSeconds: messages.dataCentersProductionSeconds,
    productionMinutes: messages.dataCentersProductionMinutes,
  },
  planets: {
    name: messages.planetsName,
    identity: messages.planetsIdentity,
    description: messages.planetsDescription,
    purchasePrompt: messages.purchasePlanet,
    purchaseAccessible: messages.purchasePlanetAccessible,
    productionPerSecond: messages.planetsProductionPerSecond,
    productionSeconds: messages.planetsProductionSeconds,
    productionMinutes: messages.planetsProductionMinutes,
  },
}

export function BasicFacilityRegion({
  locale,
  visibleBasicFacilityIds,
  showNextTierTeaser,
  facilityFacts,
  purchasePreviews,
  purchaseRouteAvailable,
  revision,
  dispatchPlayer,
  headingLevel = 'h2',
}: BasicFacilityRegionProps) {
  const intl = useIntl()
  const headingId = useId()
  const previewById = new Map(
    purchasePreviews.map((preview) => [
      preview.facilityId,
      preview,
    ]),
  )
  const [pendingIds, setPendingIds] = useState<
    ReadonlySet<EarlyBasicFacilityId>
  >(new Set())
  const [feedbackById, setFeedbackById] = useState<
    Readonly<
      Partial<Record<EarlyBasicFacilityId, PurchaseFeedback>>
    >
  >({})
  const [detailsFacilityId, setDetailsFacilityId] =
    useState<EarlyBasicFacilityId | null>(null)
  const pendingIdsRef = useRef(new Set<EarlyBasicFacilityId>())
  const currentRevisionRef =
    useRef<BasicFacilityPresentationRevision>(revision)
  currentRevisionRef.current = revision
  const revisionSession = revision.session
  const revisionState = revision.state

  useEffect(() => {
    const currentRevision = {
      session: revisionSession,
      state: revisionState,
    }
    setFeedbackById((current) => {
      const entries = Object.entries(current)
      const retained = entries.filter(([, feedback]) =>
        feedbackRevisionMatches(feedback, currentRevision),
      )
      return retained.length === entries.length
        ? current
        : Object.fromEntries(retained)
    })
  }, [revisionSession, revisionState])

  const purchase = async (
    facilityId: EarlyBasicFacilityId,
  ): Promise<void> => {
    if (pendingIdsRef.current.has(facilityId)) return
    const activationRevision = { ...revision }
    pendingIdsRef.current.add(facilityId)
    setPendingIds(new Set(pendingIdsRef.current))
    setFeedbackById((current) => {
      const next = { ...current }
      delete next[facilityId]
      return next
    })

    try {
      const result = await dispatchPlayer({
        kind: 'dyson.purchase-basic-facility',
        facilityId,
      })
      const feedback = mapFeedback(result, activationRevision)
      if (sameRevision(activationRevision, currentRevisionRef.current)) {
        setFeedbackById((current) => ({
          ...current,
          [facilityId]: feedback,
        }))
      }
    } catch {
      if (sameRevision(activationRevision, currentRevisionRef.current)) {
        setFeedbackById((current) => ({
          ...current,
          [facilityId]: {
            state: 'failed',
            revision: activationRevision,
            activationRevision,
          },
        }))
      }
    } finally {
      pendingIdsRef.current.delete(facilityId)
      setPendingIds(new Set(pendingIdsRef.current))
    }
  }

  const Heading = headingLevel
  return (
    <section
      className="basic-facility-region"
      aria-labelledby={headingId}
      data-visible-facility-count={visibleBasicFacilityIds.length}
    >
      <Heading
        id={headingId}
        className="basic-facility-region__heading"
      >
        {intl.formatMessage(messages.heading)}
      </Heading>
      <ul className="basic-facility-region__grid">
        {visibleBasicFacilityIds.map((facilityId) => {
          const preview = previewById.get(facilityId)
          if (!preview) {
            throw new Error(
              `Basic facility presentation invariant failed: visible '${facilityId}' has no purchase preview.`,
            )
          }
          return (
            <li
              className="basic-facility-region__item"
              key={facilityId}
            >
              <BasicFacilityPresentationCard
                locale={locale}
                facilityId={facilityId}
                fact={facilityFacts[facilityId]}
                preview={preview}
                routeAvailable={purchaseRouteAvailable}
                pending={pendingIds.has(facilityId)}
                feedback={feedbackById[facilityId]}
                revision={revision}
                onPurchase={() => purchase(facilityId)}
                onOpenDetails={() =>
                  setDetailsFacilityId(facilityId)
                }
              />
            </li>
          )
        })}
        {showNextTierTeaser && (
          <li
            className="
              basic-facility-region__item
              basic-facility-region__teaser
            "
            data-testid="basic-facility-next-tier-teaser"
          >
            <div className="basic-facility-region__teaser-surface">
              <bdi>{intl.formatMessage(messages.teaser)}</bdi>
            </div>
          </li>
        )}
      </ul>
      {detailsFacilityId !== null && (
        <FacilityDetailsDialog
          title={intl.formatMessage(
            facilityMessages[detailsFacilityId].name,
          )}
          closeLabel={intl.formatMessage(messages.closeDetails)}
          onClose={() => setDetailsFacilityId(null)}
        >
          <FacilityDetailsContent
            locale={locale}
            facilityId={detailsFacilityId}
            fact={facilityFacts[detailsFacilityId]}
          />
        </FacilityDetailsDialog>
      )}
    </section>
  )
}

interface BasicFacilityPresentationCardProps {
  readonly locale: EnabledLocale
  readonly facilityId: EarlyBasicFacilityId
  readonly fact: BasicFacilityCanonicalFact
  readonly preview: BasicFacilityPurchasePreview
  readonly routeAvailable: boolean
  readonly pending: boolean
  readonly feedback?: PurchaseFeedback
  readonly revision: BasicFacilityPresentationRevision
  readonly onPurchase: () => void
  readonly onOpenDetails: () => void
}

function BasicFacilityPresentationCard({
  locale,
  facilityId,
  fact,
  preview,
  routeAvailable,
  pending,
  feedback,
  revision,
  onPurchase,
  onOpenDetails,
}: BasicFacilityPresentationCardProps) {
  const intl = useIntl()
  const feedbackId = useId()
  const availabilityId = useId()
  const presentation = facilityMessages[facilityId]
  const selectedQuantity = preciseNumber(
    locale,
    preview.selectedQuantity,
  )
  const cost = preciseNumber(locale, preview.cost)
  const displayFeedback = pending
    ? 'pending'
    : feedbackRevisionMatches(feedback, revision)
      ? feedback?.state
      : undefined
  const disabled = !routeAvailable || !preview.eligible
  const availabilityMessage = disabled
    ? disabledReason(preview, routeAvailable, locale)
    : undefined
  const describedBy = [
    displayFeedback ? feedbackId : undefined,
    availabilityMessage ? availabilityId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <FacilityCard
      className="basic-facility-card"
      title={
        <FacilityIdentity
          locale={locale}
          name={presentation.name}
          identity={presentation.identity}
          fact={fact}
        />
      }
      production={
        <p className="basic-facility-card__production">
          {productionText(
            locale,
            fact.production.perSecond,
            presentation,
            intl,
          )}
        </p>
      }
      description={
        <p className="basic-facility-card__description">
          {intl.formatMessage(presentation.description)}
        </p>
      }
      progress={
        <FacilityProductionProgress
          accessibleName={intl.formatMessage(
            messages.productionProgressAccessible,
            {
              facility: intl.formatMessage(presentation.name),
            },
          )}
          progress={fact.productionProgress}
          productionPerSecond={fact.production.perSecond}
          revisionSession={revision.session}
          revisionState={revision.state}
        />
      }
      feedback={
        displayFeedback || availabilityMessage ? (
          <>
          {displayFeedback && (
          <span
            className="basic-facility-card__feedback"
            role={feedbackRole(displayFeedback)}
            aria-live={
              feedbackRole(displayFeedback) === 'alert'
                ? 'assertive'
                : 'polite'
            }
            aria-atomic="true"
          >
            <span id={feedbackId}>
              {intl.formatMessage(
                feedbackMessage(displayFeedback),
              )}
            </span>
          </span>
          )}
          {availabilityMessage && (
            <span
              id={availabilityId}
              className="basic-facility-card__availability"
            >
              {intl.formatMessage(availabilityMessage.message, {
                quantity: availabilityMessage.quantity,
              })}
            </span>
          )}
          </>
        ) : undefined
      }
      action={
        <div className="basic-facility-card__actions">
          <Button
            variant="primary"
            fullWidth
            state={buttonState(displayFeedback)}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-label={intl.formatMessage(
              presentation.purchaseAccessible,
              { quantity: selectedQuantity, cost },
            )}
            onClick={onPurchase}
          >
            <data
              className="basic-facility-card__purchase-quantity"
              value={String(preview.selectedQuantity)}
              title={selectedQuantity}
            >
              <bdi>
                {intl.formatMessage(messages.purchaseQuantity, {
                  quantity: selectedQuantity,
                })}
              </bdi>
            </data>
            <data
              className="basic-facility-card__purchase-cost"
              value={String(preview.cost)}
              title={cost}
            >
              <bdi>
                {intl.formatMessage(messages.purchaseCost, { cost })}
              </bdi>
            </data>
          </Button>
          <button
            type="button"
            className="basic-facility-card__details-button"
            aria-haspopup="dialog"
            onClick={onOpenDetails}
          >
            {intl.formatMessage(messages.details)}
          </button>
        </div>
      }
    />
  )
}

const upstreamFacilityNameMessages: Readonly<
  Record<string, MessageDescriptor>
> = {
  assembly_lines: messages.assemblyLinesName,
  ai_managers: messages.aiManagersName,
  servers: messages.serversName,
  data_centers: messages.dataCentersName,
  planets: messages.planetsName,
  matrioshka_brains: messages.matrioshkaBrainsName,
  birch_planets: messages.birchPlanetsName,
  galactic_brains: messages.galacticBrainsName,
}

function FacilityProductionProgress({
  accessibleName,
  progress,
  productionPerSecond,
  revisionSession,
  revisionState,
}: {
  readonly accessibleName: string
  readonly progress?: BasicFacilityCanonicalFact['productionProgress']
  readonly productionPerSecond: number
  readonly revisionSession: number
  readonly revisionState: number
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const canonicalNormalized = clampProgress(
    progress?.normalized ?? 0,
  )
  const solid =
    progress?.visible === true && canonicalNormalized === 1
  const [visualNormalized, setVisualNormalized] = useState(
    canonicalNormalized,
  )

  useEffect(() => {
    setVisualNormalized(canonicalNormalized)
    if (
      progress?.visible !== true ||
      solid ||
      prefersReducedMotion ||
      productionPerSecond <= 0
    ) {
      return
    }
    const startedAt = performance.now()
    let frame = 0
    const paint = (now: number) => {
      const elapsedMs = Math.max(0, now - startedAt)
      setVisualNormalized(
        interpolatePublishedFacilityProgress(
          canonicalNormalized,
          productionPerSecond,
          elapsedMs,
        ),
      )
      frame = requestAnimationFrame(paint)
    }
    frame = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(frame)
  }, [
    canonicalNormalized,
    prefersReducedMotion,
    productionPerSecond,
    progress?.visible,
    revisionSession,
    revisionState,
    solid,
  ])

  return (
    <div
      className="basic-facility-card__progress-track"
      data-visible={progress?.visible === true ? 'true' : 'false'}
    >
      {progress?.visible === true && (
        <div
          className="basic-facility-card__progress-fill"
          role="progressbar"
          aria-label={accessibleName}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(visualNormalized * 100)}
          style={{ inlineSize: `${visualNormalized * 100}%` }}
        />
      )}
    </div>
  )
}

function usePrefersReducedMotion(): boolean {
  const [preferred, setPreferred] = useState(() =>
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches,
  )

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }
    const query = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    const update = () => setPreferred(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return preferred
}

function FacilityDetailsContent({
  locale,
  facilityId,
  fact,
}: {
  readonly locale: EnabledLocale
  readonly facilityId: EarlyBasicFacilityId
  readonly fact: BasicFacilityCanonicalFact
}) {
  const intl = useIntl()
  const presentation = facilityMessages[facilityId]
  const details = fact.details
  return (
    <>
      <p className="facility-details-dialog__value">
        {formatGameNumber(locale, fact.production.perSecond)}
      </p>
      <p>{intl.formatMessage(presentation.description)}</p>
      <p>
        {productionText(
          locale,
          fact.production.perSecond,
          presentation,
          intl,
        )}
      </p>
      {details && (
        <>
          {details.contributions && (
            <div className="facility-details-dialog__contributions">
              {details.contributions.map((contribution) => {
                const tuple =
                  contribution.automaticManualTuple?.length === 2
                    ? contribution.automaticManualTuple
                    : undefined
                return (
                  <div
                    className="facility-details-dialog__contribution"
                    key={contribution.sourceId}
                  >
                    <span>
                      {contributionLabel(
                        contribution.displayRole,
                        presentation.name,
                        intl,
                      )}
                      {(contribution.displayRole === 'modifier' ||
                        contribution.displayRole ===
                          'output-adjustments') && (
                        <code className="facility-details-dialog__source-id">
                          {contribution.sourceId}
                        </code>
                      )}
                      {tuple && (
                        <>
                          {' '}
                          <span
                            className="facility-details-dialog__tuple"
                            aria-label={intl.formatMessage(
                              messages.automaticManualTupleAccessible,
                              {
                                automatic: formatGameNumber(
                                  locale,
                                  tuple[0],
                                ),
                                manual: formatGameNumber(
                                  locale,
                                  tuple[1],
                                ),
                              },
                            )}
                          >
                            <span aria-hidden="true">
                              ({formatGameNumber(locale, tuple[0])},{' '}
                              {formatGameNumber(locale, tuple[1])})
                            </span>
                          </span>
                        </>
                      )}
                    </span>
                    <span className="facility-details-dialog__operation">
                      {operationSymbol(contribution.operation)}
                      {formatGameNumber(locale, contribution.value)}
                    </span>
                    <span
                      className="facility-details-dialog__delta"
                      data-sign={
                        contribution.delta > 0
                          ? 'positive'
                          : contribution.delta < 0
                            ? 'negative'
                            : 'neutral'
                      }
                    >
                      {contribution.delta > 0 ? '+' : ''}
                      {formatGameNumber(locale, contribution.delta)}
                    </span>
                    <span className="facility-details-dialog__total">
                      {formatGameNumber(
                        locale,
                        contribution.runningTotal,
                      )}
                    </span>
                    {(contribution.conditionIdentifier ||
                      contribution.condition) && (
                      <span className="facility-details-dialog__condition">
                        {contribution.conditionIdentifier
                          ? intl.formatMessage(
                              messages.conditionIdentifier,
                              {
                                identifier:
                                  contribution.conditionIdentifier,
                              },
                            )
                          : intl.formatMessage(messages.condition, {
                              condition: contribution.condition,
                            })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <section
            className="facility-details-dialog__upstream"
            aria-labelledby={`facility-upstream-${facilityId}`}
          >
            <h3 id={`facility-upstream-${facilityId}`}>
              {intl.formatMessage(messages.upstreamSources)}
            </h3>
            {details.upstreamSources?.map((source) => (
              <p key={source.sourceFacilityId}>
                {intl.formatMessage(messages.producedBy, {
                  facility: intl.formatMessage(
                    upstreamFacilityNameMessages[
                      source.sourceFacilityId
                    ] ?? messages.unknownFacility,
                  ),
                  rate: formatGameNumber(
                    locale,
                    source.contributionPerSecond,
                  ),
                })}
              </p>
            ))}
          </section>
          <p
            className="facility-details-dialog__legend"
            aria-label={intl.formatMessage(
              messages.effectLegendAccessible,
            )}
          >
            <span>{intl.formatMessage(messages.effect)}</span>
            <span>{intl.formatMessage(messages.value)}</span>
            <span className="facility-details-dialog__delta">
              {intl.formatMessage(messages.delta)}
            </span>
            <span className="facility-details-dialog__total">
              {intl.formatMessage(messages.total)}
            </span>
          </p>
        </>
      )}
    </>
  )
}

function contributionLabel(
  role: NonNullable<
    BasicFacilityCanonicalFact['details']['contributions']
  >[number]['displayRole'],
  facilityName: MessageDescriptor,
  intl: IntlShape,
): string {
  switch (role) {
    case 'base':
      return intl.formatMessage(messages.baseProduction)
    case 'producer-count':
      return intl.formatMessage(messages.facilityCount, {
        facility: intl.formatMessage(facilityName),
      })
    case 'modifier':
      return intl.formatMessage(messages.facilityModifier)
    case 'output-adjustments':
      return intl.formatMessage(messages.outputAdjustments)
  }
}

function operationSymbol(
  operation: NonNullable<
    BasicFacilityCanonicalFact['details']['contributions']
  >[number]['operation'],
): string {
  switch (operation) {
    case 'add':
      return '+'
    case 'multiply':
      return '×'
    case 'power':
      return '^'
    case 'override':
      return '='
    case 'clamp-min':
      return '≥'
    case 'clamp-max':
      return '≤'
  }
}

interface FacilityIdentityProps {
  readonly locale: EnabledLocale
  readonly name: MessageDescriptor
  readonly identity: MessageDescriptor
  readonly fact: BasicFacilityCanonicalFact
}

function FacilityIdentity({
  locale,
  name,
  identity,
  fact,
}: FacilityIdentityProps) {
  const intl = useIntl()
  const manualOwned = fact.ownership.manual
  const totalOwned = fact.ownership.total
  const total = formatGameNumber(locale, totalOwned)
  const manual = formatGameNumber(locale, manualOwned)
  const identityText = intl.formatMessage(identity, {
    total,
    manual,
  })
  const facilityName = intl.formatMessage(name)
  const manualCount = intl.formatMessage(messages.manualCount, {
    manual,
  })
  return (
    <span
      className="basic-facility-card__identity"
      title={identityText}
    >
      <span className="ui-visually-hidden">{identityText}</span>
      <span
        className="basic-facility-card__visible-identity"
        aria-hidden="true"
      >
        <bdi className="basic-facility-card__name">
          {facilityName}
        </bdi>
        <data
          className="basic-facility-card__total"
          value={String(totalOwned)}
        >
          <bdi>{total}</bdi>
        </data>
        <data
          className="basic-facility-card__manual"
          value={String(manualOwned)}
        >
          <bdi>{manualCount}</bdi>
        </data>
      </span>
    </span>
  )
}

function productionText(
  locale: EnabledLocale,
  productionPerSecond: number,
  presentation: FacilityPresentationMessages,
  intl: IntlShape,
): string {
  if (productionPerSecond === 0) {
    return intl.formatMessage(presentation.purchasePrompt)
  }
  if (productionPerSecond >= 1) {
    return intl.formatMessage(presentation.productionPerSecond, {
      rate: formatGameNumber(locale, productionPerSecond),
    })
  }
  const seconds = 1 / productionPerSecond
  const inMinutes = seconds >= 60
  return intl.formatMessage(
    inMinutes
      ? presentation.productionMinutes
      : presentation.productionSeconds,
    {
      interval: formatGameNumber(
        locale,
        inMinutes ? seconds / 60 : seconds,
      ),
    },
  )
}

function preciseNumber(
  locale: EnabledLocale,
  value: NumericValue,
): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 20,
    useGrouping: true,
  })
}

function mapFeedback(
  result: UiRuntimePlayerCommandResult,
  activationRevision: BasicFacilityPresentationRevision,
): PurchaseFeedback {
  if (result.status === 'accepted' && result.kind === 'transition') {
    return {
      state: 'success',
      revision: {
        session: result.activationRevision.session,
        state: result.stateRevision,
      },
      activationRevision,
    }
  }
  if (result.status === 'rejected') {
    return {
      state: result.stale ? 'stale' : 'rejected',
      revision: activationRevision,
      activationRevision,
    }
  }
  return {
    state: 'failed',
    revision: activationRevision,
    activationRevision,
  }
}

function disabledReason(
  preview: BasicFacilityPurchasePreview,
  routeAvailable: boolean,
  locale: EnabledLocale,
): {
  readonly message: MessageDescriptor
  readonly quantity?: string
} {
  if (!routeAvailable) return { message: messages.unavailable }
  switch (preview.status) {
    case 'insufficient-funds':
      return {
        message: messages.insufficientFunds,
        quantity: preciseNumber(
          locale,
          preview.affordableQuantity,
        ),
      }
    case 'locked':
      return { message: messages.locked }
    case 'output-maxed':
    case 'maxed':
      return { message: messages.maximumReached }
    default:
      return { message: messages.unavailable }
  }
}

function feedbackRevisionMatches(
  feedback: PurchaseFeedback | undefined,
  revision: BasicFacilityPresentationRevision,
): boolean {
  return (
    feedback !== undefined &&
    (sameRevision(feedback.revision, revision) ||
      sameRevision(feedback.activationRevision, revision))
  )
}

function sameRevision(
  left: BasicFacilityPresentationRevision,
  right: BasicFacilityPresentationRevision,
): boolean {
  return (
    left.session === right.session &&
    left.state === right.state
  )
}

function feedbackMessage(
  feedback: 'pending' | PurchaseFeedback['state'],
): MessageDescriptor {
  switch (feedback) {
    case 'pending':
      return messages.pending
    case 'success':
      return messages.succeeded
    case 'stale':
      return messages.stale
    case 'rejected':
      return messages.rejected
    case 'failed':
      return messages.failed
  }
}

function feedbackRole(
  feedback: 'pending' | PurchaseFeedback['state'],
): 'status' | 'alert' {
  return feedback === 'rejected' || feedback === 'failed'
    ? 'alert'
    : 'status'
}

function buttonState(
  feedback: 'pending' | PurchaseFeedback['state'] | undefined,
): 'idle' | 'pending' | 'success' | 'failure' {
  switch (feedback) {
    case 'pending':
      return 'pending'
    case 'success':
      return 'success'
    case 'stale':
    case 'rejected':
    case 'failed':
      return 'failure'
    default:
      return 'idle'
  }
}
