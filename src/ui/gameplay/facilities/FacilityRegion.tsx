import type {
  FrontendDysonVisibility,
  FrontendGameplayPreviews,
  FrontendGameplaySnapshot,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { CanonicalFacilityId } from '../../../game-state/types'
import {
  isBasicFacility,
  isMegaStructureFacility,
} from '../../../simulation/dysonFacilityCatalog'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { useEffect, useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  FacilityDetailsContent,
  FacilityPresentationCard,
  type FacilityPurchaseFeedback,
} from './FacilityPresentation'
import { FacilityDetailsDialog } from './FacilityDetailsDialog'
import { facilityPresentation } from './facilityPresentationCatalog'
import { basicFacilityMessages as messages } from './messages'

type ReadyDyson = Extract<
  FrontendGameplaySnapshot['derived']['dyson'],
  { readonly status: 'ready' }
>['value']

type FacilityPurchaseCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dyson.purchase-facility' }
>

export interface FacilityRegionProps {
  readonly locale: EnabledLocale
  readonly visibility: FrontendDysonVisibility
  readonly facts: ReadyDyson['presentation']['facilities']
  readonly purchasePreviews: FrontendGameplayPreviews['dyson']['facilities']
  readonly purchaseRouteAvailable: boolean
  readonly automationEnabledFacilities?: Readonly<Record<string, boolean>>
  readonly automationUnlocked?: boolean
  readonly gameSpeed?: number
  readonly revision: { readonly session: number; readonly state: number }
  readonly dispatchPlayer: (
    command: FacilityPurchaseCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
  readonly headingLevel?: 'h2' | 'h3'
}

/**
 * The single presentation entry point for all eight Dyson facilities.
 * Megastructures remain visually grouped, but visibility, facts, previews,
 * commands, automation state, and revisions arrive through one contract.
 */
export function FacilityRegion({
  locale,
  visibility,
  facts,
  purchasePreviews,
  purchaseRouteAvailable,
  automationEnabledFacilities,
  automationUnlocked = false,
  gameSpeed = 1,
  revision,
  dispatchPlayer,
  headingLevel = 'h2',
}: FacilityRegionProps) {
  const intl = useIntl()
  const reducedMotion = usePrefersReducedMotion()
  const basicHeadingId = useId()
  const megaHeadingId = useId()
  const visibleBasicFacilityIds = visibility.visibleFacilityIds.filter(
    isBasicFacility,
  )
  const visibleMegaStructureIds = visibility.visibleFacilityIds.filter(
    isMegaStructureFacility,
  )
  const previewById = new Map(
    purchasePreviews.map((preview) => [preview.facilityId, preview]),
  )
  const [pendingIds, setPendingIds] = useState<
    ReadonlySet<CanonicalFacilityId>
  >(new Set())
  const [feedbackById, setFeedbackById] = useState<
    Readonly<Partial<Record<CanonicalFacilityId, FacilityPurchaseFeedback>>>
  >({})
  const [detailsFacilityId, setDetailsFacilityId] =
    useState<CanonicalFacilityId | null>(null)
  const pendingIdsRef = useRef(new Set<CanonicalFacilityId>())
  const currentRevisionRef = useRef(revision)
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

  const purchase = async (facilityId: CanonicalFacilityId) => {
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
        kind: 'dyson.purchase-facility',
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
  const groups = [
    {
      id: 'facility' as const,
      headingId: basicHeadingId,
      heading: messages.heading,
      ids: visibleBasicFacilityIds,
      className: 'basic-facility-region',
    },
    {
      id: 'megastructure' as const,
      headingId: megaHeadingId,
      heading: messages.megaStructuresHeading,
      ids: visibleMegaStructureIds,
      className: 'basic-facility-region mega-structure-region',
    },
  ]

  return (
    <>
      {groups.map((group) => (
        group.ids.length > 0 ||
        (group.id === 'facility' && visibility.showNextFacilityTeaser)
      ) && (
        <section
          key={group.id}
          className={group.className}
          aria-labelledby={group.headingId}
          data-visible-facility-count={group.ids.length}
        >
          <Heading
            id={group.headingId}
            className="basic-facility-region__heading"
          >
            {intl.formatMessage(group.heading)}
          </Heading>
          <ul className="basic-facility-region__grid">
            {group.ids.map((facilityId) => {
              const preview = previewById.get(facilityId)
              if (!preview) {
                throw new Error(
                  `Facility presentation invariant failed: visible '${facilityId}' has no purchase preview.`,
                )
              }
              const sharedCard = {
                locale,
                preview,
                routeAvailable: purchaseRouteAvailable,
                automationActive:
                  automationUnlocked &&
                  automationEnabledFacilities?.[facilityId] === true,
                pending: pendingIds.has(facilityId),
                feedback: feedbackById[facilityId],
                revision,
                onPurchase: () => purchase(facilityId),
                onOpenDetails: () => setDetailsFacilityId(facilityId),
              }
              return (
                <li className="basic-facility-region__item" key={facilityId}>
                  <FacilityPresentationCard
                    {...sharedCard}
                    facilityId={facilityId}
                    fact={facts[facilityId]}
                    reducedMotion={reducedMotion}
                  />
                </li>
              )
            })}
            {group.id === 'facility' && visibility.showNextFacilityTeaser && (
              <li
                className="basic-facility-region__item basic-facility-region__teaser"
                data-testid="basic-facility-next-tier-teaser"
              >
                <div className="basic-facility-region__teaser-surface">
                  <bdi>{intl.formatMessage(messages.teaser)}</bdi>
                </div>
              </li>
            )}
          </ul>
        </section>
      ))}
      {detailsFacilityId !== null && (
        <FacilityDetailsDialog
          title={intl.formatMessage(
            facilityPresentation[detailsFacilityId].name,
          )}
          subtitle={intl.formatMessage(
            facilityPresentation[detailsFacilityId].description,
          )}
          closeLabel={intl.formatMessage(messages.closeDetails)}
          onClose={() => setDetailsFacilityId(null)}
        >
          <FacilityDetailsContent
            locale={locale}
            facilityId={detailsFacilityId}
            fact={facts[detailsFacilityId]}
            gameSpeed={gameSpeed}
          />
        </FacilityDetailsDialog>
      )}
    </>
  )
}

function mapFeedback(
  result: UiRuntimePlayerCommandResult,
  activationRevision: FacilityRegionProps['revision'],
): FacilityPurchaseFeedback {
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

function feedbackMatches(
  feedback: FacilityPurchaseFeedback | undefined,
  revision: FacilityRegionProps['revision'],
) {
  return feedback !== undefined && (
    sameRevision(feedback.revision, revision) ||
    sameRevision(feedback.activationRevision, revision)
  )
}

function sameRevision(
  left: FacilityRegionProps['revision'],
  right: FacilityRegionProps['revision'],
) {
  return left.session === right.session && left.state === right.state
}
