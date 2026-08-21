import { useEffect, useId, useRef, useState } from 'react'
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
import { Button, FacilityCard } from '../../components'
import {
  formatGameDuration,
  formatGameNumber,
  formatNumber,
  type NumericValue,
} from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { basicFacilityMessages as messages } from './messages'
import { FacilityDetailsDialog } from './FacilityDetailsDialog'
import './facilities.css'

type MegaStructureId =
  FrontendDysonVisibility['visibleMegaStructureIds'][number]
type MegaStructurePreview =
  FrontendGameplayPreviews['dyson']['megaStructures'][number]
type MegaStructureCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dyson.purchase-mega-structure' }
>
type ReadyDyson = Extract<
  FrontendGameplaySnapshot['derived']['dyson'],
  { readonly status: 'ready' }
>['value']

export interface MegaStructureRegionProps {
  readonly locale: EnabledLocale
  readonly visibleMegaStructureIds:
    FrontendDysonVisibility['visibleMegaStructureIds']
  readonly showNextTierTeaser: boolean
  readonly facts: ReadyDyson['megaStructureFacts']
  readonly purchasePreviews:
    FrontendGameplayPreviews['dyson']['megaStructures']
  readonly purchaseRouteAvailable: boolean
  readonly revision: { readonly session: number; readonly state: number }
  readonly dispatchPlayer: (
    command: MegaStructureCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly headingLevel?: 'h2' | 'h3'
}

type Revision = MegaStructureRegionProps['revision']
type PurchaseFeedback = {
  readonly state: 'success' | 'stale' | 'rejected' | 'failed'
  readonly revision: Revision
  readonly activationRevision: Revision
}

interface Presentation {
  readonly name: MessageDescriptor
  readonly identity: MessageDescriptor
  readonly description: MessageDescriptor
  readonly purchasePrompt: MessageDescriptor
  readonly productionPerSecond: MessageDescriptor
  readonly productionInterval: MessageDescriptor
}

const prerequisiteById: Readonly<Record<MegaStructureId, MessageDescriptor>> = {
  matrioshka_brains: messages.planetsName,
  birch_planets: messages.matrioshkaBrainsName,
  galactic_brains: messages.birchPlanetsName,
}

const outputById: Readonly<Record<MegaStructureId, MessageDescriptor>> = {
  matrioshka_brains: messages.planetsName,
  birch_planets: messages.matrioshkaBrainsName,
  galactic_brains: messages.birchPlanetsName,
}

const presentationById: Readonly<Record<MegaStructureId, Presentation>> = {
  matrioshka_brains: {
    name: messages.matrioshkaBrainsName,
    identity: messages.matrioshkaBrainsIdentity,
    description: messages.matrioshkaBrainsDescription,
    purchasePrompt: messages.constructMatrioshkaBrain,
    productionPerSecond:
      messages.matrioshkaBrainsProductionPerSecond,
    productionInterval:
      messages.matrioshkaBrainsProductionInterval,
  },
  birch_planets: {
    name: messages.birchPlanetsName,
    identity: messages.birchPlanetsIdentity,
    description: messages.birchPlanetsDescription,
    purchasePrompt: messages.constructBirchPlanet,
    productionPerSecond: messages.birchPlanetsProductionPerSecond,
    productionInterval: messages.birchPlanetsProductionInterval,
  },
  galactic_brains: {
    name: messages.galacticBrainsName,
    identity: messages.galacticBrainsIdentity,
    description: messages.galacticBrainsDescription,
    purchasePrompt: messages.constructGalacticBrain,
    productionPerSecond:
      messages.galacticBrainsProductionPerSecond,
    productionInterval: messages.galacticBrainsProductionInterval,
  },
}

export function MegaStructureRegion({
  locale,
  visibleMegaStructureIds,
  showNextTierTeaser,
  facts,
  purchasePreviews,
  purchaseRouteAvailable,
  revision,
  dispatchPlayer,
  headingLevel = 'h2',
}: MegaStructureRegionProps) {
  const intl = useIntl()
  const headingId = useId()
  const previewById = new Map(
    purchasePreviews.map((preview) => [preview.facilityId, preview]),
  )
  const [pendingIds, setPendingIds] = useState<ReadonlySet<MegaStructureId>>(
    new Set(),
  )
  const [feedbackById, setFeedbackById] = useState<
    Readonly<Partial<Record<MegaStructureId, PurchaseFeedback>>>
  >({})
  const [detailsFacilityId, setDetailsFacilityId] =
    useState<MegaStructureId | null>(null)
  const pendingIdsRef = useRef(new Set<MegaStructureId>())
  const currentRevisionRef = useRef<Revision>(revision)
  currentRevisionRef.current = revision
  const revisionSession = revision.session
  const revisionState = revision.state

  useEffect(() => {
    const currentRevision = {
      session: revisionSession,
      state: revisionState,
    }
    setFeedbackById((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, feedback]) =>
          feedbackMatches(feedback, currentRevision),
        ),
      ),
    )
  }, [revisionSession, revisionState])

  const purchase = async (facilityId: MegaStructureId) => {
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
        kind: 'dyson.purchase-mega-structure',
        facilityId,
      })
      if (sameRevision(activationRevision, currentRevisionRef.current)) {
        setFeedbackById((current) => ({
          ...current,
          [facilityId]: mapFeedback(result, activationRevision),
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
      className="basic-facility-region mega-structure-region"
      aria-labelledby={headingId}
      data-visible-facility-count={visibleMegaStructureIds.length}
    >
      <Heading id={headingId} className="basic-facility-region__heading">
        {intl.formatMessage(messages.megaStructuresHeading)}
      </Heading>
      <ul className="basic-facility-region__grid">
        {visibleMegaStructureIds.map((facilityId) => {
          const preview = previewById.get(facilityId)
          if (!preview) {
            throw new Error(
              `Mega-structure presentation invariant failed: visible '${facilityId}' has no purchase preview.`,
            )
          }
          return (
            <li className="basic-facility-region__item" key={facilityId}>
              <MegaStructureCard
                locale={locale}
                facilityId={facilityId}
                fact={facts[facilityId]}
                preview={preview}
                routeAvailable={purchaseRouteAvailable}
                pending={pendingIds.has(facilityId)}
                feedback={feedbackById[facilityId]}
                revision={revision}
                onPurchase={() => purchase(facilityId)}
                onOpenDetails={() => setDetailsFacilityId(facilityId)}
              />
            </li>
          )
        })}
        {showNextTierTeaser && (
          <li
            className="basic-facility-region__item basic-facility-region__teaser"
            data-testid="mega-structure-next-tier-teaser"
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
            presentationById[detailsFacilityId].name,
          )}
          closeLabel={intl.formatMessage(messages.closeDetails)}
          onClose={() => setDetailsFacilityId(null)}
        >
          <MegaStructureDetails
            locale={locale}
            facilityId={detailsFacilityId}
            fact={facts[detailsFacilityId]}
          />
        </FacilityDetailsDialog>
      )}
    </section>
  )
}

function MegaStructureCard({
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
}: {
  readonly locale: EnabledLocale
  readonly facilityId: MegaStructureId
  readonly fact: ReadyDyson['megaStructureFacts'][MegaStructureId]
  readonly preview: MegaStructurePreview
  readonly routeAvailable: boolean
  readonly pending: boolean
  readonly feedback?: PurchaseFeedback
  readonly revision: Revision
  readonly onPurchase: () => void
  readonly onOpenDetails: () => void
}) {
  const intl = useIntl()
  const feedbackId = useId()
  const availabilityId = useId()
  const presentation = presentationById[facilityId]
  const manual = fact.ownership.manual
  const total = fact.ownership.total
  const totalDisplay = formatGameNumber(locale, total)
  const manualDisplay = formatGameNumber(locale, manual)
  const identity = intl.formatMessage(presentation.identity, {
    total: totalDisplay,
    manual: manualDisplay,
  })
  const quantity = formatGameNumber(locale, preview.selectedQuantity)
  const preciseQuantity = preciseNumber(locale, preview.selectedQuantity)
  const cost = formatGameNumber(locale, preview.cost)
  const preciseCost = preciseNumber(locale, preview.cost)
  const displayFeedback = pending
    ? 'pending'
    : feedbackMatches(feedback, revision)
      ? feedback?.state
      : undefined
  const disabled = !routeAvailable || !preview.eligible
  const availability = disabled
    ? disabledReason(preview, routeAvailable)
    : undefined
  const describedBy = [
    displayFeedback ? feedbackId : undefined,
    availability ? availabilityId : undefined,
  ].filter(Boolean).join(' ') || undefined
  const prompt = intl.formatMessage(presentation.purchasePrompt)

  return (
    <FacilityCard
      className="basic-facility-card mega-structure-card"
      title={
        <span className="basic-facility-card__identity" title={identity}>
          <span className="ui-visually-hidden">{identity}</span>
          <span className="basic-facility-card__visible-identity" aria-hidden="true">
            <bdi className="basic-facility-card__name">
              {intl.formatMessage(presentation.name)}
            </bdi>
            <data className="basic-facility-card__total" value={String(total)}>
              <bdi>{totalDisplay}</bdi>
            </data>
            <data className="basic-facility-card__manual" value={String(manual)}>
              <bdi>{intl.formatMessage(messages.manualCount, { manual: manualDisplay })}</bdi>
            </data>
          </span>
        </span>
      }
      production={
        <p className="basic-facility-card__production">
          {productionText(locale, fact.perSecond, presentation, prompt, intl)}
        </p>
      }
      description={
        <p className="basic-facility-card__description">
          {intl.formatMessage(presentation.description)}
        </p>
      }
      progress={
        <div className="basic-facility-card__progress-track" data-visible="false" />
      }
      feedback={displayFeedback || availability ? (
        <>
          {displayFeedback && (
            <span
              id={feedbackId}
              className="basic-facility-card__feedback"
              role={feedbackRole(displayFeedback)}
              aria-live={feedbackRole(displayFeedback) === 'alert' ? 'assertive' : 'polite'}
            >
              {intl.formatMessage(feedbackMessage(displayFeedback))}
            </span>
          )}
          {availability && (
            <span id={availabilityId} className="basic-facility-card__availability">
              {intl.formatMessage(availability)}
            </span>
          )}
        </>
      ) : undefined}
      action={
        <div className="basic-facility-card__actions mega-structure-card__actions">
          <Button
            variant="primary"
            fullWidth
            state={buttonState(displayFeedback)}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-label={intl.formatMessage(messages.constructMegaStructureAccessible, {
              prompt,
              quantity: preciseQuantity,
              cost: preciseCost,
            })}
            onClick={onPurchase}
          >
            <data className="basic-facility-card__purchase-quantity" value={String(preview.selectedQuantity)} title={preciseQuantity}>
              <bdi>{intl.formatMessage(messages.purchaseQuantity, { quantity })}</bdi>
            </data>
            <data className="basic-facility-card__purchase-cost" value={String(preview.cost)} title={preciseCost}>
              <bdi>{intl.formatMessage(messages.purchaseCost, { cost })}</bdi>
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

function MegaStructureDetails({
  locale,
  facilityId,
  fact,
}: {
  readonly locale: EnabledLocale
  readonly facilityId: MegaStructureId
  readonly fact: ReadyDyson['megaStructureFacts'][MegaStructureId]
}) {
  const intl = useIntl()
  const presentation = presentationById[facilityId]
  const automatic = formatGameNumber(locale, fact.ownership.automatic)
  const manual = formatGameNumber(locale, fact.ownership.manual)
  return (
    <>
      <p>{intl.formatMessage(presentation.description)}</p>
      <dl className="mega-structure-details__list">
        <div>
          <dt>{intl.formatMessage(messages.baseProduction)}</dt>
          <dd>{intl.formatMessage(messages.productionRateValue, {
            value: formatGameNumber(locale, fact.baseProductionPerSecond),
          })}</dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.facilityCount, {
            facility: intl.formatMessage(presentation.name),
          })}</dt>
          <dd title={intl.formatMessage(messages.automaticManualTupleAccessible, {
            automatic,
            manual,
          })}>
            {formatGameNumber(locale, fact.ownership.total)}
            {' '}({automatic} + {manual})
          </dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.facilityModifier)}</dt>
          <dd>×{formatGameNumber(locale, fact.modifier)}</dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.megaOutput)}</dt>
          <dd>{intl.formatMessage(outputById[facilityId])}</dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.finalProduction)}</dt>
          <dd>{intl.formatMessage(messages.productionRateValue, {
            value: formatGameNumber(locale, fact.perSecond),
          })}</dd>
        </div>
        <div>
          <dt>{intl.formatMessage(messages.unlockCondition)}</dt>
          <dd>{intl.formatMessage(messages.megaUnlockRequirement, {
            structure: intl.formatMessage(presentation.name),
            prerequisite: intl.formatMessage(prerequisiteById[facilityId]),
          })}</dd>
        </div>
      </dl>
    </>
  )
}

function productionText(
  locale: EnabledLocale,
  rate: number,
  presentation: Presentation,
  prompt: string,
  intl: IntlShape,
): string {
  if (rate === 0) return prompt
  if (rate >= 1) {
    return intl.formatMessage(presentation.productionPerSecond, {
      rate: formatGameNumber(locale, rate),
    })
  }
  return intl.formatMessage(presentation.productionInterval, {
    interval: formatGameDuration(locale, 1 / rate),
  })
}

function preciseNumber(locale: EnabledLocale, value: NumericValue): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 20,
    useGrouping: true,
  })
}

function disabledReason(
  preview: MegaStructurePreview,
  routeAvailable: boolean,
): MessageDescriptor {
  if (!routeAvailable) return messages.unavailable
  switch (preview.code) {
    case 'insufficient-funds': return messages.insufficientCash
    case 'locked': return messages.locked
    case 'prerequisite-not-met': return messages.prerequisiteNotMet
    case 'maxed':
    case 'output-maxed': return messages.maximumReached
    default: return messages.unavailable
  }
}

function mapFeedback(
  result: UiRuntimePlayerCommandResult,
  activationRevision: Revision,
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

function feedbackMatches(feedback: PurchaseFeedback | undefined, revision: Revision) {
  return feedback !== undefined && (
    sameRevision(feedback.revision, revision) ||
    sameRevision(feedback.activationRevision, revision)
  )
}

function sameRevision(left: Revision, right: Revision) {
  return left.session === right.session && left.state === right.state
}

function feedbackMessage(state: 'pending' | PurchaseFeedback['state']): MessageDescriptor {
  switch (state) {
    case 'pending': return messages.pending
    case 'success': return messages.succeeded
    case 'stale': return messages.stale
    case 'rejected': return messages.rejected
    case 'failed': return messages.failed
  }
}

function feedbackRole(state: 'pending' | PurchaseFeedback['state']): 'status' | 'alert' {
  return state === 'rejected' || state === 'failed' ? 'alert' : 'status'
}

function buttonState(
  state: 'pending' | PurchaseFeedback['state'] | undefined,
): 'idle' | 'pending' | 'success' | 'failure' {
  switch (state) {
    case 'pending': return 'pending'
    case 'success': return 'success'
    case 'stale':
    case 'rejected':
    case 'failed': return 'failure'
    default: return 'idle'
  }
}
