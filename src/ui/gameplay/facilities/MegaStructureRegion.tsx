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
  readonly gameSpeed?: number
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

export function MegaStructureRegion({
  locale,
  visibleMegaStructureIds,
  showNextTierTeaser,
  facts,
  purchasePreviews,
  purchaseRouteAvailable,
  gameSpeed = 1,
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
          subtitle={intl.formatMessage(
            presentationById[detailsFacilityId].description,
          )}
          closeLabel={intl.formatMessage(messages.closeDetails)}
          onClose={() => setDetailsFacilityId(null)}
        >
          <MegaStructureDetails
            locale={locale}
            facilityId={detailsFacilityId}
            fact={facts[detailsFacilityId]}
            gameSpeed={gameSpeed}
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
        <FittedProductionLine
          display={productionDisplay(
            locale,
            fact.perSecond,
            presentation,
            prompt,
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
  gameSpeed,
}: {
  readonly locale: EnabledLocale
  readonly facilityId: MegaStructureId
  readonly fact: ReadyDyson['megaStructureFacts'][MegaStructureId]
  readonly gameSpeed: number
}) {
  const intl = useIntl()
  const presentation = presentationById[facilityId]
  const contributions = fact.details?.modifierContributions ?? []
  const researchEffects = contributions.filter(
    (contribution) => contribution.source?.kind === 'research',
  )
  const skillEffects = contributions.filter(
    (contribution) => contribution.source?.kind === 'skill',
  )
  const otherEffects = contributions.filter(
    (contribution) =>
      contribution.source?.kind !== 'research' &&
      contribution.source?.kind !== 'skill',
  )
  const facilityName = intl.formatMessage(presentation.name)
  const realRate = fact.perSecond * gameSpeed
  const upstreamFacilityId = megaAcquisitionSource[facilityId]
  return (
    <div className="facility-details-redesign">
      <section className="facility-details-hero">
        <img
          className="facility-details-hero__icon"
          src={navigationAssets.quantum}
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
              rate: formatGameNumber(locale, fact.perSecond),
            })}
          </p>
        </div>
      </section>

      <section className="facility-details-pipeline">
        <h3>{intl.formatMessage(messages.calculationHeading)}</h3>
        <MegaCalculationStage
          number={1}
          title={intl.formatMessage(messages.baseStage)}
        >
          <MegaSimpleRow
            icon={navigationAssets.quantum}
            name={intl.formatMessage(messages.baseProduction)}
            description={intl.formatMessage(messages.megaOutputDescription, {
              facility: intl.formatMessage(outputById[facilityId]),
            })}
            value={formatGameNumber(locale, fact.baseProductionPerSecond)}
          />
          <MegaSimpleRow
            icon={navigationAssets.quantum}
            name={intl.formatMessage(messages.countStage)}
            description={
              <span className="facility-effect-row__breakdown">
                <span>{formatGameNumber(locale, fact.ownership.automatic)} {intl.formatMessage(messages.automaticFacilities)}</span>
                <span>{formatGameNumber(locale, fact.ownership.manual)} {intl.formatMessage(messages.manuallyPurchased)}</span>
              </span>
            }
            value={`×${formatGameNumber(locale, fact.ownership.total)}`}
          />
          <p className="facility-details-stage__result">
            {formatGameNumber(locale, fact.baseProductionPerSecond)} × {formatGameNumber(locale, fact.ownership.total)} = {formatGameNumber(locale, fact.baseProductionPerSecond * fact.ownership.total)}
          </p>
        </MegaCalculationStage>

        <MegaCalculationStage
          number={2}
          title={intl.formatMessage(messages.productionModifiersStage)}
        >
          {researchEffects.length > 0 && (
            <MegaEffectGroup title={intl.formatMessage(messages.researchGroup)}>
              <MegaEffectList locale={locale} contributions={researchEffects} />
            </MegaEffectGroup>
          )}
          {skillEffects.length > 0 && (
            <MegaEffectGroup title={intl.formatMessage(messages.skillTreeGroup)}>
              <MegaEffectList locale={locale} contributions={skillEffects} />
            </MegaEffectGroup>
          )}
          {otherEffects.length > 0 && (
            <MegaEffectGroup title={intl.formatMessage(messages.otherBonusesGroup)}>
              <MegaEffectList locale={locale} contributions={otherEffects} />
            </MegaEffectGroup>
          )}
          {contributions.length === 0 && (
            <p className="facility-details-empty">
              {intl.formatMessage(messages.noActiveEffects)}
            </p>
          )}
        </MegaCalculationStage>

        <MegaCalculationStage
          number={3}
          title={intl.formatMessage(messages.timeStage)}
        >
          <MegaSimpleRow
            icon={navigationAssets.offlineTime}
            name={intl.formatMessage(messages.gameSpeed)}
            description={intl.formatMessage(messages.gameSpeedDescription, {
              speed: formatGameNumber(locale, gameSpeed),
            })}
            value={`×${formatGameNumber(locale, gameSpeed)}`}
          />
        </MegaCalculationStage>
      </section>

      <section className="facility-details-dialog__upstream">
        <h3>{intl.formatMessage(messages.howYouGain, {
          facility: facilityName,
        })}</h3>
        {upstreamFacilityId && fact.ownership.automatic > 0 && (
          <MegaSimpleRow
            icon={navigationAssets.quantum}
            name={intl.formatMessage(
              presentationById[upstreamFacilityId].name,
            )}
            description={intl.formatMessage(messages.megaProducedCountBy, {
              count: formatGameNumber(locale, fact.ownership.automatic),
              facility: intl.formatMessage(
                presentationById[upstreamFacilityId].name,
              ),
            })}
            value={`+${formatGameNumber(locale, fact.ownership.automatic)}`}
          />
        )}
        <MegaSimpleRow
          icon={navigationAssets.quantum}
          name={intl.formatMessage(messages.manualPurchases)}
          description={intl.formatMessage(messages.manualAcquisitionDescription, {
            count: formatGameNumber(locale, fact.ownership.manual),
            facility: facilityName,
          })}
          value={`+${formatGameNumber(locale, fact.ownership.manual)}`}
        />
        <MegaSimpleRow
          icon={navigationAssets.quantum}
          name={intl.formatMessage(messages.unlockCondition)}
          description={intl.formatMessage(messages.megaUnlockRequirement, {
            structure: facilityName,
            prerequisite: intl.formatMessage(prerequisiteById[facilityId]),
          })}
        />
      </section>
    </div>
  )
}

const megaAcquisitionSource: Readonly<
  Record<MegaStructureId, MegaStructureId | undefined>
> = {
  matrioshka_brains: 'birch_planets',
  birch_planets: 'galactic_brains',
  galactic_brains: undefined,
}

type MegaFact = ReadyDyson['megaStructureFacts'][MegaStructureId]
type MegaContribution = MegaFact['details']['modifierContributions'][number]

function MegaCalculationStage({
  number,
  title,
  children,
}: {
  readonly number: number
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section className="facility-details-stage">
      <header>
        <span className="facility-details-stage__number">{number}</span>
        <h4>{title}</h4>
      </header>
      <div className="facility-details-stage__body">{children}</div>
    </section>
  )
}

function MegaEffectGroup({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section className="facility-details-effect-group">
      <h5>{title}</h5>
      <div>{children}</div>
    </section>
  )
}

function MegaEffectList({
  locale,
  contributions,
}: {
  readonly locale: EnabledLocale
  readonly contributions: readonly MegaContribution[]
}) {
  const intl = useIntl()
  return <>{contributions.map((contribution) => {
    const source = contribution.source
    const name = source?.kind === 'research'
      ? intl.formatMessage(researchNameMessage(source.id))
      : source?.kind === 'skill'
        ? formatCatalogMessage(
            intl,
            `skills.node.${source.id}.name`,
            humanizeIdentifier(source.id),
          )
        : megaOtherEffectName(contribution, intl)
    const description = source?.kind === 'research'
      ? intl.formatMessage(researchDescriptionMessage(source.id))
      : source?.kind === 'skill'
        ? formatCatalogMessage(
            intl,
            `skills.node.${source.id}.technical`,
            humanizeIdentifier(source.id),
          )
        : ''
    const icon = source?.kind === 'research'
      ? navigationAssets.research
      : source?.kind === 'skill'
        ? skillIcons[source.id] ?? navigationAssets.skills
        : source?.kind === 'infinity'
          ? navigationAssets.infinity
          : source?.kind === 'avocato'
            ? skillIcons.avocados ?? navigationAssets.infinity
          : navigationAssets.quantum
    const formula = source?.kind === 'research' &&
      source.level !== undefined && source.perLevelValue !== undefined
      ? `${formatGameNumber(locale, source.level)} × ${formatGameNumber(locale, source.perLevelValue * 100)}% = +${formatGameNumber(locale, contribution.value * 100)}%`
      : undefined
    return (
      <div className="facility-effect-row" key={`${contribution.sourceId}-${contribution.order ?? 0}`}>
        <img className="facility-effect-row__icon" src={icon} alt="" />
        <span className="facility-effect-row__copy">
          <strong>{name}</strong>
          {description && <small>{description}</small>}
        </span>
        <span className="facility-effect-row__value">
          {megaOperationSymbol(contribution.operation)}{formatGameNumber(locale, contribution.value)}
        </span>
        {formula && (
          <details className="facility-effect-row__technical">
            <summary>{intl.formatMessage(messages.sourceTechnicalDetails)}</summary>
            <span>{formula}</span>
          </details>
        )}
      </div>
    )
  })}</>
}

function MegaSimpleRow({
  icon,
  name,
  description,
  value,
}: {
  readonly icon: string
  readonly name: string
  readonly description: ReactNode
  readonly value?: string
}) {
  return (
    <div className="facility-effect-row">
      <img className="facility-effect-row__icon" src={icon} alt="" />
      <span className="facility-effect-row__copy">
        <strong>{name}</strong>
        <small>{description}</small>
      </span>
      {value && <span className="facility-effect-row__value">{value}</span>}
    </div>
  )
}

function megaOtherEffectName(
  contribution: MegaContribution,
  intl: IntlShape,
): string {
  switch (contribution.source?.kind) {
    case 'infinity': return intl.formatMessage(messages.infinityPower)
    case 'secret': return intl.formatMessage(messages.secretsPower)
    case 'avocato': return intl.formatMessage(messages.avocatoPower)
    default: return intl.formatMessage(messages.facilityModifier)
  }
}

function megaOperationSymbol(operation: MegaContribution['operation']): string {
  switch (operation) {
    case 'add': return '+'
    case 'multiply': return '×'
    case 'power': return '^'
    case 'override': return '='
    case 'clamp-min': return '≥'
    case 'clamp-max': return '≤'
  }
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
  return identifier
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
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

function productionDisplay(
  locale: EnabledLocale,
  rate: number,
  presentation: Presentation,
  prompt: string,
  intl: IntlShape,
): ProductionDisplay {
  const text = productionText(locale, rate, presentation, prompt, intl)
  if (rate === 0) return splitProductionDisplay(text)
  const highlightedValue = rate >= 1
    ? formatGameNumber(locale, rate)
    : formatGameDuration(locale, 1 / rate)
  return splitProductionDisplay(text, highlightedValue)
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
