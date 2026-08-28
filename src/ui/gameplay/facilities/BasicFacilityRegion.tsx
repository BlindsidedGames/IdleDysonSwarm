import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
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
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useForwardProgressAnimation } from '../progress/useForwardProgressAnimation'
import { basicFacilityMessages as messages } from './messages'
import { FacilityDetailsDialog } from './FacilityDetailsDialog'
import {
  FittedProductionLine,
} from './FittedProductionLine'
import {
  splitProductionDisplay,
  type ProductionDisplay,
} from './productionDisplay'
import { navigationAssets } from '../shell/navigationAssets'
import {
  researchDescriptionMessage,
  researchNameMessage,
} from '../research/researchMessageSelectors'
import { clampProgress } from './progressInterpolation'
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
    FrontendDysonVisibility['showNextBasicFacilityTeaser']
  readonly facilityFacts: Readonly<
    Record<EarlyBasicFacilityId, BasicFacilityCanonicalFact>
  >
  readonly purchasePreviews:
    FrontendGameplayPreviews['dyson']['basicFacilities']
  readonly purchaseRouteAvailable: boolean
  readonly automationEnabledFacilities?: Readonly<
    Record<string, boolean>
  >
  readonly gameSpeed?: number
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

const skillIconModules = import.meta.glob<string>(
  '../../assets/skill-icons/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

const skillIcons = Object.freeze(
  Object.fromEntries(
    Object.entries(skillIconModules).map(([path, url]) => [
      path.split('/').pop()?.replace(/\.webp$/, '') ?? path,
      url,
    ]),
  ) as Readonly<Record<string, string>>,
)

const facilityRootSkill: Readonly<Record<EarlyBasicFacilityId, string>> = {
  assembly_lines: 'assemblyLineTree',
  ai_managers: 'aiManagerTree',
  servers: 'serverTree',
  data_centers: 'dataCenterTree',
  planets: 'planetsTree',
}

export function BasicFacilityRegion({
  locale,
  visibleBasicFacilityIds,
  showNextTierTeaser,
  facilityFacts,
  purchasePreviews,
  purchaseRouteAvailable,
  automationEnabledFacilities = {},
  gameSpeed = 1,
  revision,
  dispatchPlayer,
  headingLevel = 'h2',
}: BasicFacilityRegionProps) {
  const reducedMotion = usePrefersReducedMotion()
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
                reducedMotion={reducedMotion}
                automationActive={
                  automationEnabledFacilities[facilityId] === true
                }
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
          subtitle={intl.formatMessage(
            facilityMessages[detailsFacilityId].description,
          )}
          closeLabel={intl.formatMessage(messages.closeDetails)}
          onClose={() => setDetailsFacilityId(null)}
        >
          <FacilityDetailsContent
            locale={locale}
            facilityId={detailsFacilityId}
            fact={facilityFacts[detailsFacilityId]}
            gameSpeed={gameSpeed}
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
  readonly reducedMotion: boolean
  readonly automationActive: boolean
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
  reducedMotion,
  automationActive,
  onPurchase,
  onOpenDetails,
}: BasicFacilityPresentationCardProps) {
  const intl = useIntl()
  const feedbackId = useId()
  const availabilityId = useId()
  const presentation = facilityMessages[facilityId]
  const selectedQuantity = formatGameNumber(
    locale,
    preview.selectedQuantity,
  )
  const selectedQuantityPrecise = preciseNumber(
    locale,
    preview.selectedQuantity,
  )
  const cost = formatGameNumber(locale, preview.cost)
  const costPrecise = preciseNumber(locale, preview.cost)
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
        <FittedProductionLine
          display={productionDisplay(
            locale,
            fact.production.perSecond,
            presentation,
            intl,
          )}
        />
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
          productionRatePerSecond={fact.production.perSecond}
          reducedMotion={reducedMotion}
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
              {
                quantity: selectedQuantityPrecise,
                cost: costPrecise,
              },
            )}
            onClick={onPurchase}
          >
            <data
              className="basic-facility-card__purchase-quantity"
              value={String(preview.selectedQuantity)}
              title={selectedQuantityPrecise}
            >
              <bdi>
                {automationActive
                  ? intl.formatMessage(messages.automaticPurchase)
                  : intl.formatMessage(messages.purchaseQuantity, {
                      quantity: selectedQuantity,
                    })}
              </bdi>
            </data>
            <data
              className="basic-facility-card__purchase-cost"
              value={String(preview.cost)}
              title={costPrecise}
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

export function FacilityProductionProgress({
  accessibleName,
  progress,
  productionRatePerSecond,
  reducedMotion,
}: {
  readonly accessibleName: string
  readonly progress?: {
    readonly visible: boolean
    readonly normalized: number
  }
  readonly productionRatePerSecond: number
  readonly reducedMotion: boolean
}) {
  const canonicalNormalized = clampProgress(
    progress?.normalized ?? 0,
  )
  const fillRef = useRef<HTMLSpanElement>(null)
  useForwardProgressAnimation(fillRef, {
    canonicalProgress: canonicalNormalized,
    normalizedRatePerSecond: productionRatePerSecond,
    active:
      progress?.visible === true && canonicalNormalized < 1,
    wraps: true,
    reducedMotion,
  })

  return (
    <div
      className="basic-facility-card__progress-track"
      data-visible={progress?.visible === true ? 'true' : 'false'}
    >
      {progress?.visible === true && (
        <>
          <progress
            className="basic-facility-card__progress"
            aria-label={accessibleName}
            max={1}
            value={canonicalNormalized}
          />
          <span
            ref={fillRef}
            aria-hidden="true"
            className="basic-facility-card__progress-fill"
            style={{ transform: `scaleX(${canonicalNormalized})` }}
          />
        </>
      )}
    </div>
  )
}

function FacilityDetailsContent({
  locale,
  facilityId,
  fact,
  gameSpeed,
}: {
  readonly locale: EnabledLocale
  readonly facilityId: EarlyBasicFacilityId
  readonly fact: BasicFacilityCanonicalFact
  readonly gameSpeed: number
}) {
  const intl = useIntl()
  const presentation = facilityMessages[facilityId]
  const details = fact.details
  const contributions = details?.contributions ?? []
  const base = contributions.find(
    (contribution) => contribution.displayRole === 'base',
  )
  const count = contributions.find(
    (contribution) => contribution.displayRole === 'producer-count',
  )
  const outputEffects = contributions.filter(
    (contribution) =>
      contribution.displayRole === 'output-adjustments',
  )
  const purchaseEffects = outputEffects.filter((contribution) =>
    contribution.sourceId.startsWith('manual-purchase.'),
  )
  const productionModifierEffects = [
    ...(details?.modifierContributions?.length
      ? details.modifierContributions
      : contributions.filter(
          (contribution) => contribution.displayRole === 'modifier',
        )),
    ...outputEffects.filter(
      (contribution) =>
        !contribution.sourceId.startsWith('manual-purchase.'),
    ),
  ]
  const researchModifierEffects = productionModifierEffects.filter(
    (contribution) => contribution.source?.kind === 'research',
  )
  const skillModifierEffects = productionModifierEffects.filter(
    (contribution) => contribution.source?.kind === 'skill',
  )
  const otherModifierEffects = productionModifierEffects.filter(
    (contribution) =>
      contribution.source?.kind !== 'research' &&
      contribution.source?.kind !== 'skill',
  )
  const generationContributions = details?.generationContributions ?? []
  const facilityName = intl.formatMessage(presentation.name)
  const realRate = fact.production.perSecond * gameSpeed
  const hasTerraPurchaseEffects = Boolean(
    details?.manualPurchaseLayer &&
      (details.manualPurchaseLayer.transferredPlanetCount > 0 ||
        (facilityId === 'planets' &&
          details.manualPurchaseLayer.terraIrradiantOwned)),
  )
  return (
    <div className="facility-details-redesign">
      <section className="facility-details-hero">
        <img
          className="facility-details-hero__icon"
          src={skillIcons[facilityRootSkill[facilityId]]}
          alt=""
        />
        <div>
          <p className="facility-details-hero__eyebrow">
            {intl.formatMessage(messages.currentProduction)}
          </p>
          <p className="facility-details-dialog__value">
            {intl.formatMessage(messages.perRealSecond, {
              rate: formatGameNumber(locale, realRate),
            })}
          </p>
          <p className="facility-details-hero__game-rate">
            {intl.formatMessage(messages.perGameSecond, {
              rate: formatGameNumber(locale, fact.production.perSecond),
            })}
          </p>
        </div>
      </section>

      <section className="facility-details-pipeline">
        <h3>{intl.formatMessage(messages.calculationHeading)}</h3>
        <CalculationStage number={1} title={intl.formatMessage(messages.baseStage)}>
          {base && (
            <EffectRow
              locale={locale}
              contribution={base}
              icon={skillIcons[facilityRootSkill[facilityId]]}
              name={intl.formatMessage(messages.baseProduction)}
              description={productionText(locale, base.value, presentation, intl)}
            />
          )}
          {count && (
            <div className="facility-effect-row">
              <img className="facility-effect-row__icon" src={facilityIcon(facilityId)} alt="" />
              <span className="facility-effect-row__copy">
                <strong>{intl.formatMessage(messages.countStage)}</strong>
                <small className="facility-effect-row__breakdown">
                  <span>{formatGameNumber(locale, fact.ownership.automatic)} {intl.formatMessage(messages.automaticFacilities)}</span>
                  <span>{formatGameNumber(locale, fact.ownership.manual)} {intl.formatMessage(messages.manuallyPurchased)}</span>
                </small>
              </span>
              <span className="facility-effect-row__value">×{formatGameNumber(locale, count.value)}</span>
            </div>
          )}
          {base && count && (
            <p className="facility-details-stage__result">
              {formatGameNumber(locale, base.value)} × {formatGameNumber(locale, count.value)} = {formatGameNumber(locale, base.value * count.value)}
            </p>
          )}
        </CalculationStage>
        <CalculationStage number={2} title={intl.formatMessage(messages.productionModifiersStage)}>
          {researchModifierEffects.length > 0 && (
            <EffectGroup title={intl.formatMessage(messages.researchGroup)}>
              <EffectList locale={locale} contributions={researchModifierEffects} facilityId={facilityId} />
            </EffectGroup>
          )}
          {skillModifierEffects.length > 0 && (
            <EffectGroup title={intl.formatMessage(messages.skillTreeGroup)}>
              <EffectList locale={locale} contributions={skillModifierEffects} facilityId={facilityId} />
            </EffectGroup>
          )}
          {otherModifierEffects.length > 0 && (
            <EffectGroup title={intl.formatMessage(messages.otherBonusesGroup)}>
              <EffectList locale={locale} contributions={otherModifierEffects} facilityId={facilityId} />
            </EffectGroup>
          )}
          {(hasTerraPurchaseEffects || purchaseEffects.length > 0) && (
            <EffectGroup title={intl.formatMessage(messages.purchaseStage)}>
              {hasTerraPurchaseEffects && details?.manualPurchaseLayer ? (
                <TerraRows locale={locale} layer={details.manualPurchaseLayer} />
              ) : null}
              {purchaseEffects.length > 0 && (
                <EffectList locale={locale} contributions={purchaseEffects} facilityId={facilityId} />
              )}
              {details?.manualPurchaseLayer && (
                <p className="facility-details-stage__result">
                  {intl.formatMessage(messages.effectiveManualCount)}: {formatGameNumber(locale, details.manualPurchaseLayer.effectiveManualCount)}
                </p>
              )}
            </EffectGroup>
          )}
          {researchModifierEffects.length === 0 &&
            skillModifierEffects.length === 0 &&
            otherModifierEffects.length === 0 &&
            !hasTerraPurchaseEffects &&
            purchaseEffects.length === 0 && (
              <p className="facility-details-empty">{intl.formatMessage(messages.noActiveEffects)}</p>
            )}
        </CalculationStage>
        <CalculationStage number={3} title={intl.formatMessage(messages.timeStage)}>
          <div className="facility-effect-row">
            <img className="facility-effect-row__icon" src={navigationAssets.offlineTime} alt="" />
            <span className="facility-effect-row__copy">
              <strong>{intl.formatMessage(messages.gameSpeed)}</strong>
              <small>{intl.formatMessage(messages.gameSpeedDescription, { speed: formatGameNumber(locale, gameSpeed) })}</small>
            </span>
            <span className="facility-effect-row__value">×{formatGameNumber(locale, gameSpeed)}</span>
          </div>
        </CalculationStage>
      </section>

      <section className="facility-details-dialog__upstream" aria-labelledby={`facility-upstream-${facilityId}`}>
        <h3 id={`facility-upstream-${facilityId}`}>
          {intl.formatMessage(messages.howYouGain, { facility: facilityName })}
        </h3>
        {details?.upstreamSources?.map((source) => (
          <div className="facility-effect-row" key={source.sourceFacilityId}>
            <img className="facility-effect-row__icon" src={facilityIcon(source.sourceFacilityId)} alt="" />
            <span className="facility-effect-row__copy">
              <strong>{intl.formatMessage(upstreamFacilityNameMessages[source.sourceFacilityId] ?? messages.unknownFacility)}</strong>
              <small>{intl.formatMessage(messages.producedBy, {
                facility: intl.formatMessage(upstreamFacilityNameMessages[source.sourceFacilityId] ?? messages.unknownFacility),
                rate: formatGameNumber(locale, source.contributionPerSecond),
              })}</small>
            </span>
          </div>
        ))}
        {generationContributions.length > 0 && (
          <EffectList locale={locale} contributions={generationContributions} facilityId={facilityId} />
        )}
        <div className="facility-effect-row">
          <img className="facility-effect-row__icon" src={facilityIcon(facilityId)} alt="" />
          <span className="facility-effect-row__copy">
            <strong>{intl.formatMessage(messages.manualPurchases)}</strong>
            <small>{intl.formatMessage(messages.manualAcquisitionDescription, {
              count: formatGameNumber(locale, fact.ownership.manual),
              facility: facilityName,
            })}</small>
          </span>
        </div>
      </section>
    </div>
  )
}

type FacilityContribution = NonNullable<
  BasicFacilityCanonicalFact['details']['contributions']
>[number]

function CalculationStage({ number, title, children }: { readonly number: number; readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="facility-details-stage">
      <header><span className="facility-details-stage__number">{number}</span><h4>{title}</h4></header>
      <div className="facility-details-stage__body">{children}</div>
    </section>
  )
}

function EffectGroup({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="facility-details-effect-group">
      <h5>{title}</h5>
      <div>{children}</div>
    </section>
  )
}

function EffectList({ locale, contributions, facilityId }: { readonly locale: EnabledLocale; readonly contributions: readonly FacilityContribution[]; readonly facilityId: EarlyBasicFacilityId }) {
  const intl = useIntl()
  if (contributions.length === 0) return <p className="facility-details-empty">{intl.formatMessage(messages.noActiveEffects)}</p>
  return <>{contributions.map((contribution) => {
    const presentation = effectPresentation(contribution, facilityId, intl)
    return <EffectRow key={`${contribution.sourceId}-${contribution.order ?? 0}`} locale={locale} contribution={contribution} {...presentation} />
  })}</>
}

function EffectRow({ locale, contribution, icon, name, description }: { readonly locale: EnabledLocale; readonly contribution: FacilityContribution; readonly icon: string; readonly name: string; readonly description: string }) {
  const intl = useIntl()
  const showFormula = contribution.operation === 'power' ||
    contribution.operation === 'clamp-min' ||
    contribution.operation === 'clamp-max' ||
    contribution.source?.kind === 'research' ||
    contribution.calculation !== undefined
  const formulaInput = contribution.runningTotal - contribution.delta
  return (
    <div className="facility-effect-row">
      <img className="facility-effect-row__icon" src={icon} alt="" />
      <span className="facility-effect-row__copy">
        <strong>{name}</strong>
        {description && <small>{description}</small>}
        {contribution.condition && <small>{intl.formatMessage(messages.condition, { condition: contribution.condition })}</small>}
      </span>
      <span className="facility-effect-row__value">{operationSymbol(contribution.operation)}{formatGameNumber(locale, contribution.value)}</span>
      {showFormula && (
        <details className="facility-effect-row__technical">
          <summary>{intl.formatMessage(messages.sourceTechnicalDetails)}</summary>
          {contribution.calculation !== undefined ? (
            <DynamicSourceFormula
              locale={locale}
              calculation={contribution.calculation}
              result={contribution.value}
            />
          ) : (
            <span>{contribution.source?.kind === 'research' &&
              contribution.source.level !== undefined &&
              contribution.source.perLevelValue !== undefined
              ? researchFormula(locale, contribution)
              : effectFormula(locale, contribution, formulaInput)}</span>
          )}
        </details>
      )}
    </div>
  )
}

type SourceCalculation = NonNullable<FacilityContribution['calculation']>

function DynamicSourceFormula({
  locale,
  calculation,
  result,
}: {
  readonly locale: EnabledLocale
  readonly calculation: SourceCalculation
  readonly result: number
}) {
  const intl = useIntl()
  const number = (value: number) => formatGameNumber(locale, value)
  const skillLine = (
    id: string,
    active: boolean,
    expression: string,
    inactiveValue?: string,
  ) => (
    <FormulaLine
      key={id}
      label={skillName(id, intl)}
      value={active
        ? expression
        : inactiveValue ?? intl.formatMessage(messages.notAssigned)}
      active={active}
    />
  )
  let lines: ReactNode[]
  switch (calculation.kind) {
    case 'scientific-planets': {
      let current = calculation.researchers > 1
        ? Math.log10(calculation.researchers)
        : 0
      lines = [
        <FormulaLine key="researchers" label={intl.formatMessage(messages.scienceBots)} value={number(calculation.researchers)} />,
        <FormulaLine key="base" label={`log10(${number(calculation.researchers)})`} value={number(current)} />,
      ]
      if (calculation.hubbleTelescope) current *= 2
      lines.push(skillLine('hubbleTelescope', calculation.hubbleTelescope, `×2 = ${number(current)}`))
      if (calculation.jamesWebbTelescope) current *= 4
      lines.push(skillLine('jamesWebbTelescope', calculation.jamesWebbTelescope, `×4 = ${number(current)}`))
      if (calculation.terraformingProtocols) current += calculation.fragments
      lines.push(skillLine('terraformingProtocols', calculation.terraformingProtocols, `+${number(calculation.fragments)} = ${number(current)}`))
      break
    }
    case 'planet-assembly':
      lines = [
        <FormulaLine key="assembly-lines" label={intl.formatMessage(messages.assemblyLinesName)} value={number(calculation.assemblyLines)} />,
        <FormulaLine key="base" label={`log10(${number(calculation.assemblyLines)})`} value={number(calculation.assemblyLines >= 10 ? Math.log10(calculation.assemblyLines) : 0)} />,
      ]
      break
    case 'shell-worlds':
      lines = [
        <FormulaLine key="planets" label={intl.formatMessage(messages.planetsName)} value={number(calculation.planets)} />,
        skillLine('planetAssembly', calculation.planetAssembly, intl.formatMessage(messages.requirementMet)),
        <FormulaLine key="base" label={`log2(${number(calculation.planets)})`} value={number(calculation.planetAssembly && calculation.planets >= 2 ? Math.log2(calculation.planets) : 0)} />,
      ]
      break
    case 'stellar-sacrifices': {
      const galaxies = calculation.panelsPerSecond *
        calculation.panelLifetimeSeconds / 20_000 / 100_000_000_000
      let adjusted = galaxies
      lines = [
        <FormulaLine key="panels" label={intl.formatMessage(messages.panelsPerSecond)} value={number(calculation.panelsPerSecond)} />,
        <FormulaLine key="lifetime" label={intl.formatMessage(messages.panelLifetime)} value={`${number(calculation.panelLifetimeSeconds)}s`} />,
        <FormulaLine key="galaxies" label={intl.formatMessage(messages.galaxiesEngulfed)} value={number(galaxies)} />,
      ]
      if (calculation.stellarObliteration) adjusted *= 1_000
      lines.push(skillLine('stellarObliteration', calculation.stellarObliteration, `×1,000 = ${number(adjusted)}`))
      if (calculation.supernova) adjusted *= 1_000
      lines.push(skillLine('supernova', calculation.supernova, `×1,000 = ${number(adjusted)}`))
      lines.push(<FormulaLine key="base" label={`log10(${number(adjusted)})²`} value={number(Math.pow(Math.max(0, Math.log10(adjusted)), 2))} />)
      break
    }
    case 'shoulders-of-the-fallen':
      lines = [
        <FormulaLine key="level" label={intl.formatMessage(messages.scienceBoostLevel)} value={number(calculation.scienceBoostLevel)} />,
        skillLine('scientificPlanets', calculation.scientificPlanets, intl.formatMessage(messages.requirementMet)),
        <FormulaLine key="base" label={`log2(${number(calculation.scienceBoostLevel)})`} value={number(calculation.scientificPlanets && calculation.scienceBoostLevel > 0 ? Math.log2(calculation.scienceBoostLevel) : 0)} />,
      ]
      break
    case 'pocket-dimensions': {
      let current = calculation.workers > 1
        ? Math.log10(calculation.workers)
        : 0
      lines = [
        <FormulaLine key="workers" label={intl.formatMessage(messages.workerBots)} value={number(calculation.workers)} />,
        <FormulaLine key="base" label={`log10(${number(calculation.workers)})`} value={number(current)} />,
      ]
      const researcherLog = calculation.researchers > 1
        ? Math.log10(calculation.researchers)
        : 0
      if (calculation.pocketMultiverse && researcherLog > 0) current *= researcherLog
      lines.push(skillLine('pocketMultiverse', calculation.pocketMultiverse, `×log10(${number(calculation.researchers)}) = ${number(current)}`))
      const protectorsApplied = !calculation.pocketMultiverse && calculation.pocketProtectors
      if (protectorsApplied) current += researcherLog
      lines.push(skillLine(
        'pocketProtectors',
        protectorsApplied,
        `+log10(${number(calculation.researchers)}) = ${number(current)}`,
        calculation.pocketMultiverse && calculation.pocketProtectors
          ? intl.formatMessage(messages.replacedBy, {
              skill: skillName('pocketMultiverse', intl),
            })
          : undefined,
      ))
      if (calculation.dimensionalCatCables) current *= 5
      lines.push(skillLine('dimensionalCatCables', calculation.dimensionalCatCables, `×5 = ${number(current)}`))
      const solarMultiplier = 1 + 0.01 * calculation.panelLifetimeSeconds
      if (calculation.solarBubbles) current *= solarMultiplier
      lines.push(skillLine('solarBubbles', calculation.solarBubbles, `×${number(solarMultiplier)} = ${number(current)}`))
      const androidMultiplier = 1 + 99 * Math.min(calculation.pocketAndroidsTimerSeconds, 3_600) / 3_600
      if (calculation.pocketAndroids) current *= androidMultiplier
      lines.push(skillLine('pocketAndroids', calculation.pocketAndroids, `×${number(androidMultiplier)} = ${number(current)}`))
      const quantumMultiplier = 1 + (calculation.rudimentarySingularityProduction >= 1 ? Math.log2(calculation.rudimentarySingularityProduction) : 0)
      if (calculation.quantumComputing) current *= quantumMultiplier
      lines.push(skillLine('quantumComputing', calculation.quantumComputing, `×${number(quantumMultiplier)} = ${number(current)}`))
      break
    }
    case 'rudimentary-singularity': {
      const rate = calculation.managerAssemblyLineProduction
      let current = rate > 1
        ? Math.pow(Math.log2(rate), 1 + Math.log10(rate) / 10)
        : 0
      lines = [
        <FormulaLine key="rate" label={intl.formatMessage(messages.managerAssemblyProduction)} value={number(rate)} />,
        <FormulaLine key="base" label={`log2(${number(rate)}) ^ (1 + log10(${number(rate)}) / 10)`} value={number(current)} />,
      ]
      if (calculation.unsuspiciousAlgorithms) current *= 10
      lines.push(skillLine('unsuspiciousAlgorithms', calculation.unsuspiciousAlgorithms, `×10 = ${number(current)}`))
      const networkMultiplier = 1 + (calculation.servers > 1 ? Math.fround(0.05) * Math.log10(calculation.servers) : 0)
      if (calculation.clusterNetworking) current *= networkMultiplier
      lines.push(skillLine('clusterNetworking', calculation.clusterNetworking, `×${number(networkMultiplier)} = ${number(current)}`))
      break
    }
    case 'dynamic-facility-effect': {
      const effectId = calculation.effectId
      const oneInput = (
        label: string,
        input: number,
        formula: string,
      ) => [
        <FormulaLine key="input" label={label} value={number(input)} />,
        <FormulaLine key="formula" label={formula} value={number(result)} />,
      ]
      if (effectId === 'effect.staying_power.assembly_lines') {
        lines = oneInput(intl.formatMessage(messages.panelLifetime), calculation.panelLifetimeSeconds, `1 + 1% × ${number(calculation.panelLifetimeSeconds)}`)
      } else if (effectId === 'effect.parallel_computation.data_centers') {
        lines = oneInput(intl.formatMessage(messages.serversName), calculation.servers, `1 + 10% × log2(${number(calculation.servers)})`)
      } else if (effectId.startsWith('effect.fragmentAssembly.')) {
        lines = oneInput(intl.formatMessage(messages.fragments), calculation.fragments, `${number(calculation.fragments)} > 4`)
      } else if (effectId.startsWith('effect.progressiveAssembly.')) {
        lines = oneInput(intl.formatMessage(messages.fragments), calculation.fragments, `1 + 0.5 × ${number(calculation.fragments)}`)
      } else if (effectId.startsWith('effect.versatileProductionTactics.')) {
        lines = effectId.endsWith('.planets_modifier')
          ? oneInput(intl.formatMessage(messages.effectivePlanets), calculation.effectivePlanets, `${number(calculation.effectivePlanets)} ≥ 100`)
          : [<FormulaLine key="formula" label={`×${number(1.5)}`} value={number(result)} />]
      } else if (effectId.startsWith('effect.oneMinutePlan.')) {
        lines = oneInput(intl.formatMessage(messages.panelLifetime), calculation.panelLifetimeSeconds, `${number(calculation.panelLifetimeSeconds)}s ≥ 60s`)
      } else if (effectId.startsWith('effect.dysonSubsidies.')) {
        lines = oneInput(intl.formatMessage(messages.starsSurrounded), calculation.starsSurrounded, `${number(calculation.starsSurrounded)} ≥ 1`)
      } else if (effectId.startsWith('effect.purityOfBody.')) {
        lines = oneInput(intl.formatMessage(messages.assignedSkillPoints), calculation.assignedSkillPoints, `1.25 ^ ${number(calculation.assignedSkillPoints)}`)
      } else if (effectId.startsWith('effect.clusterNetworking.')) {
        lines = oneInput(intl.formatMessage(messages.serversName), calculation.servers, `1 + 5% × log10(${number(calculation.servers)})`)
      } else if (effectId.startsWith('effect.parallelProcessing.')) {
        lines = oneInput(intl.formatMessage(messages.serversName), calculation.servers, `1 + 5% × log2(${number(calculation.servers)})`)
      } else if (effectId.startsWith('effect.whatWillComeToPass.')) {
        lines = oneInput(intl.formatMessage(messages.manualDataCenters), calculation.manualDataCenters, `1 + 1% × ${number(calculation.manualDataCenters)}`)
      } else if (effectId.startsWith('effect.hypercubeNetworks.')) {
        lines = oneInput(intl.formatMessage(messages.serversName), calculation.servers, `1 + 10% × log10(${number(calculation.servers)})`)
      } else if (effectId.startsWith('effect.galacticPradigmShift.')) {
        lines = oneInput(intl.formatMessage(messages.galaxiesEngulfed), calculation.galaxiesEngulfed, `${number(calculation.galaxiesEngulfed)} ≥ 1`)
      } else if (effectId.startsWith('effect.purityOfSEssence.')) {
        lines = oneInput(intl.formatMessage(messages.assignedSkillPoints), calculation.assignedSkillPoints, `1.42 ^ ${number(calculation.assignedSkillPoints)}`)
      } else {
        lines = oneInput(intl.formatMessage(messages.elapsedSkillTime), calculation.timerSeconds, `1 + 1% × ${number(calculation.timerSeconds)}s`)
      }
      break
    }
  }
  return (
    <span className="facility-effect-formula">
      {lines}
      <FormulaLine
        label={intl.formatMessage(messages.formulaResult)}
        value={`${calculation.kind === 'dynamic-facility-effect' ? '×' : '+'}${number(result)}`}
        result
      />
    </span>
  )
}

function FormulaLine({
  label,
  value,
  active = true,
  result = false,
}: {
  readonly label: string
  readonly value: string
  readonly active?: boolean
  readonly result?: boolean
}) {
  return (
    <span
      className="facility-effect-formula__line"
      data-active={active ? 'true' : 'false'}
      data-result={result ? 'true' : 'false'}
    >
      <span>{label}</span>
      <bdi>{value}</bdi>
    </span>
  )
}

function TerraRows({ locale, layer }: { readonly locale: EnabledLocale; readonly layer: NonNullable<BasicFacilityCanonicalFact['details']['manualPurchaseLayer']> }) {
  const intl = useIntl()
  const rows = [
    ...(layer.terraIrradiantOwned
      ? [{ id: 'terraIrradiant', value: '×12', description: skillTechnical('terraIrradiant', intl) }]
      : []),
    ...(layer.transferSkillId
      ? [{
          id: layer.transferSkillId,
          value: `+${formatGameNumber(locale, layer.transferredPlanetCount)}`,
          description: intl.formatMessage(messages.terraTransferDescription, { count: formatGameNumber(locale, layer.transferredPlanetCount) }),
        }]
      : []),
  ]
  return <>{rows.map(({ id, value, description }) => (
    <div className="facility-effect-row" key={id}>
      <img className="facility-effect-row__icon" src={skillIcons[id]} alt="" />
      <span className="facility-effect-row__copy">
        <strong>{skillName(id, intl)}</strong>
        <small>{description}</small>
      </span>
      <span className="facility-effect-row__value">{value}</span>
    </div>
  ))}</>
}

function effectPresentation(contribution: FacilityContribution, facilityId: EarlyBasicFacilityId, intl: IntlShape): { icon: string; name: string; description: string } {
  const source = contribution.source
  if (source?.kind === 'skill') return { icon: skillIcons[source.id] ?? navigationAssets.skills, name: skillName(source.id, intl), description: skillTechnical(source.id, intl) }
  if (source?.kind === 'research') return { icon: navigationAssets.research, name: intl.formatMessage(researchNameMessage(source.id)), description: intl.formatMessage(researchDescriptionMessage(source.id)) }
  if (source?.kind === 'infinity') return { icon: navigationAssets.infinity, name: intl.formatMessage(messages.infinityPower), description: intl.formatMessage(messages.infinityPower) }
  if (source?.kind === 'secret') return { icon: navigationAssets.infinity, name: intl.formatMessage(messages.secretsPower), description: intl.formatMessage(messages.secretsPower) }
  if (source?.kind === 'avocato') return { icon: skillIcons.avocados ?? navigationAssets.infinity, name: intl.formatMessage(messages.avocatoPower), description: intl.formatMessage(messages.avocatoPower) }
  if (source?.id === 'milestone-50') return { icon: skillIcons[facilityRootSkill[facilityId]], name: intl.formatMessage(messages.milestone50), description: intl.formatMessage(messages.milestone50) }
  if (source?.id === 'milestone-100') return { icon: skillIcons[facilityRootSkill[facilityId]], name: intl.formatMessage(messages.milestone100), description: intl.formatMessage(messages.milestone100) }
  if (contribution.sourceId === 'canonical.numeric-clamp') return { icon: navigationAssets.settings, name: intl.formatMessage(messages.numericSafety), description: intl.formatMessage(messages.numericSafety) }
  return { icon: skillIcons[facilityRootSkill[facilityId]], name: contributionLabel(contribution.displayRole, facilityMessages[facilityId].name, intl), description: '' }
}

function skillName(skillId: string, intl: IntlShape): string {
  return formatCatalogMessage(
    intl,
    `skills.node.${skillId}.name`,
    humanizeIdentifier(skillId),
  )
}

function skillTechnical(skillId: string, intl: IntlShape): string {
  const id = `skills.node.${skillId}.technical`
  if (!Object.prototype.hasOwnProperty.call(intl.messages, id)) return ''
  return formatCatalogMessage(
    intl,
    id,
    '',
  )
}

function formatCatalogMessage(
  intl: IntlShape,
  id: string,
  defaultMessage: string,
): string {
  const format = intl.formatMessage
  return format({ id, defaultMessage })
}

function humanizeIdentifier(identifier: string): string {
  return identifier.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function facilityIcon(facilityId: string): string {
  return skillIcons[facilityRootSkill[facilityId as EarlyBasicFacilityId]] ?? navigationAssets.bots
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

function effectFormula(
  locale: EnabledLocale,
  contribution: FacilityContribution,
  input: number,
): string {
  const formattedInput = formatGameNumber(locale, input)
  const formattedValue = formatGameNumber(locale, contribution.value)
  const formattedResult = formatGameNumber(locale, contribution.runningTotal)
  switch (contribution.operation) {
    case 'power':
      return `${formattedInput} ^ ${formattedValue} = ${formattedResult}`
    case 'clamp-min':
      return `max(${formattedInput}, ${formattedValue}) = ${formattedResult}`
    case 'clamp-max':
      return `min(${formattedInput}, ${formattedValue}) = ${formattedResult}`
    default:
      return ''
  }
}

function researchFormula(
  locale: EnabledLocale,
  contribution: FacilityContribution,
): string {
  const source = contribution.source
  if (
    source?.kind !== 'research' ||
    source.level === undefined ||
    source.perLevelValue === undefined
  ) return ''
  return `${formatGameNumber(locale, source.level)} × ${formatGameNumber(locale, source.perLevelValue * 100)}% = +${formatGameNumber(locale, contribution.value * 100)}%`
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

function productionDisplay(
  locale: EnabledLocale,
  productionPerSecond: number,
  presentation: FacilityPresentationMessages,
  intl: IntlShape,
): ProductionDisplay {
  const text = productionText(
    locale,
    productionPerSecond,
    presentation,
    intl,
  )
  if (productionPerSecond === 0) {
    return splitProductionDisplay(text)
  }
  const highlightedValue = productionPerSecond >= 1
    ? formatGameNumber(locale, productionPerSecond)
    : formatGameNumber(
        locale,
        1 / productionPerSecond >= 60
          ? 1 / productionPerSecond / 60
          : 1 / productionPerSecond,
      )
  return splitProductionDisplay(text, highlightedValue)
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
