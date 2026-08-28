import {
  useRef,
  useState,
} from 'react'
import {
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import type {
  FrontendGameplayPreviews,
  FrontendSimulationsDerivedFacts,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { DreamUpgradeFlag } from '../../../game-state/types'
import strangeMatterSymbol from '../../assets/symbol-strange-matter.png'
import {
  Button,
  CollapsibleSection,
  InlineImageSymbol,
} from '../../components'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  realityMessages,
  simulationUpgradeMessages,
} from '../reality/messages'
import './simulationUpgradeRegion.css'

type SimulationUpgradeCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'dream.purchase-upgrade' }
>

export interface SimulationUpgradeRegionProps {
  readonly locale: EnabledLocale
  readonly sections:
    FrontendSimulationsDerivedFacts['permanentUpgrades']['simulation']
  readonly previews: FrontendGameplayPreviews['dream']['upgrades']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: (
    command: SimulationUpgradeCommand,
  ) => Promise<UiRuntimePlayerCommandResult>
}

/**
 * Presents Unity's permanent Simulation upgrade categories from the canonical
 * snapshot. Visibility and eligibility remain application-owned; this region
 * only formats the published groups and dispatches purchase intent.
 */
export function SimulationUpgradeRegion({
  locale,
  sections,
  previews,
  routeAvailable,
  dispatchPlayer,
}: SimulationUpgradeRegionProps) {
  const intl = useIntl()
  const previewById = new Map(
    previews.map((preview) => [preview.upgradeId, preview]),
  )
  const categories = ([
    ['countermeasures', simulationUpgradeMessages.countermeasures],
    ['foundational', simulationUpgradeMessages.foundational],
    ['education', simulationUpgradeMessages.education],
    ['information', simulationUpgradeMessages.information],
    ['spaceAge', simulationUpgradeMessages.spaceAge],
  ] as const).map(([id, title]) => ({
    id,
    title,
    previews: sections[id].flatMap((upgradeId) => {
      const preview = previewById.get(upgradeId)
      return preview ? [preview] : []
    }),
  }))

  if (!categories.some((category) => category.previews.length > 0)) {
    return null
  }

  return (
    <CollapsibleSection
      className="simulation-permanent-upgrades"
      contentClassName="simulation-permanent-upgrades__content"
      ariaLabel={intl.formatMessage(simulationUpgradeMessages.heading)}
      defaultExpanded={false}
      storageKey="reality.simulation-upgrades"
      title={intl.formatMessage(simulationUpgradeMessages.heading)}
    >
      {categories.map((category) =>
        category.previews.length > 0 ? (
          <CollapsibleSection
            className={`simulation-permanent-upgrade-category simulation-permanent-upgrade-category--${category.id}`}
            contentClassName="simulation-permanent-upgrade-category__content"
            defaultExpanded={false}
            headingLevel="h3"
            key={category.id}
            storageKey={`reality.simulation-upgrades.${category.id}`}
            title={intl.formatMessage(category.title)}
          >
            <ol>
              {category.previews.map((preview) => (
                <li key={preview.upgradeId}>
                  <SimulationUpgradeCard
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
  )
}

function SimulationUpgradeCard({
  locale,
  preview,
  routeAvailable,
  dispatchPlayer,
}: {
  readonly locale: EnabledLocale
  readonly preview: FrontendGameplayPreviews['dream']['upgrades'][number]
  readonly routeAvailable: boolean
  readonly dispatchPlayer: SimulationUpgradeRegionProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const copy = simulationUpgradeCopy(preview.upgradeId)
  const name = intl.formatMessage(copy.title)
  const disabled = pending || !preview.eligible || !routeAvailable

  const purchase = async (): Promise<void> => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({
        kind: 'dream.purchase-upgrade',
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
    <article className="simulation-permanent-upgrade-card" aria-label={name}>
      <div className="simulation-permanent-upgrade-card__copy">
        <h4>{name}</h4>
        <p>{intl.formatMessage(copy.description)}</p>
      </div>
      <Button
        variant="primary"
        state={pending ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={disabled}
        aria-label={intl.formatMessage(realityMessages.purchaseAccessible, {
          name,
          value: formatGameNumber(locale, preview.cost),
        })}
        onClick={() => void purchase()}
      >
        <strong className="simulation-permanent-upgrade-card__cost">
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
          className="simulation-permanent-upgrade-card__feedback"
          role={failed ? 'alert' : 'status'}
        >
          {intl.formatMessage(
            failed
              ? realityMessages.purchaseFailed
              : realityMessages.purchasePending,
            { name },
          )}
        </span>
      ) : null}
    </article>
  )
}

const SIMULATION_UPGRADE_TITLES: Readonly<
  Partial<Record<DreamUpgradeFlag, MessageDescriptor>>
> = {
  counterMeteor: simulationUpgradeMessages.counterMeteorTitle,
  counterAi: simulationUpgradeMessages.counterAiTitle,
  counterGw: simulationUpgradeMessages.counterGwTitle,
  engineering1: simulationUpgradeMessages.engineering1Title,
  engineering2: simulationUpgradeMessages.engineering2Title,
  engineering3: simulationUpgradeMessages.engineering3Title,
  shipping1: simulationUpgradeMessages.shipping1Title,
  shipping2: simulationUpgradeMessages.shipping2Title,
  worldTrade1: simulationUpgradeMessages.worldTrade1Title,
  worldTrade2: simulationUpgradeMessages.worldTrade2Title,
  worldTrade3: simulationUpgradeMessages.worldTrade3Title,
  worldPeace1: simulationUpgradeMessages.worldPeace1Title,
  worldPeace2: simulationUpgradeMessages.worldPeace2Title,
  worldPeace3: simulationUpgradeMessages.worldPeace3Title,
  worldPeace4: simulationUpgradeMessages.worldPeace4Title,
  mathematics1: simulationUpgradeMessages.mathematics1Title,
  mathematics2: simulationUpgradeMessages.mathematics2Title,
  mathematics3: simulationUpgradeMessages.mathematics3Title,
  advancedPhysics1: simulationUpgradeMessages.advancedPhysics1Title,
  advancedPhysics2: simulationUpgradeMessages.advancedPhysics2Title,
  advancedPhysics3: simulationUpgradeMessages.advancedPhysics3Title,
  advancedPhysics4: simulationUpgradeMessages.advancedPhysics4Title,
  hunter1: simulationUpgradeMessages.hunter1Title,
  hunter2: simulationUpgradeMessages.hunter2Title,
  hunter3: simulationUpgradeMessages.hunter3Title,
  hunter4: simulationUpgradeMessages.hunter4Title,
  gatherer1: simulationUpgradeMessages.gatherer1Title,
  gatherer2: simulationUpgradeMessages.gatherer2Title,
  gatherer3: simulationUpgradeMessages.gatherer3Title,
  gatherer4: simulationUpgradeMessages.gatherer4Title,
  workerBoost: simulationUpgradeMessages.workerBoostTitle,
  citiesBoost: simulationUpgradeMessages.citiesBoostTitle,
  factoriesBoost: simulationUpgradeMessages.factoriesBoostTitle,
  bots1: simulationUpgradeMessages.bots1Title,
  bots2: simulationUpgradeMessages.bots2Title,
  rockets1: simulationUpgradeMessages.rockets1Title,
  rockets2: simulationUpgradeMessages.rockets2Title,
  rockets3: simulationUpgradeMessages.rockets3Title,
  sfacs1: simulationUpgradeMessages.sfacs1Title,
  sfacs2: simulationUpgradeMessages.sfacs2Title,
  sfacs3: simulationUpgradeMessages.sfacs3Title,
  railguns1: simulationUpgradeMessages.railguns1Title,
  railguns2: simulationUpgradeMessages.railguns2Title,
}

const SIMULATION_UPGRADE_DESCRIPTIONS: Readonly<
  Partial<Record<DreamUpgradeFlag, MessageDescriptor>>
> = {
  counterMeteor: simulationUpgradeMessages.counterMeteorDescription,
  counterAi: simulationUpgradeMessages.counterAiDescription,
  counterGw: simulationUpgradeMessages.counterGwDescription,
  engineering1: simulationUpgradeMessages.engineering1Description,
  engineering2: simulationUpgradeMessages.engineering2Description,
  engineering3: simulationUpgradeMessages.engineering3Description,
  shipping1: simulationUpgradeMessages.shipping1Description,
  shipping2: simulationUpgradeMessages.shipping2Description,
  worldTrade1: simulationUpgradeMessages.worldTrade1Description,
  worldTrade2: simulationUpgradeMessages.worldTrade2Description,
  worldTrade3: simulationUpgradeMessages.worldTrade3Description,
  worldPeace1: simulationUpgradeMessages.worldPeace1Description,
  worldPeace2: simulationUpgradeMessages.worldPeace2Description,
  worldPeace3: simulationUpgradeMessages.worldPeace3Description,
  worldPeace4: simulationUpgradeMessages.worldPeace4Description,
  mathematics1: simulationUpgradeMessages.mathematics1Description,
  mathematics2: simulationUpgradeMessages.mathematics2Description,
  mathematics3: simulationUpgradeMessages.mathematics3Description,
  advancedPhysics1: simulationUpgradeMessages.advancedPhysics1Description,
  advancedPhysics2: simulationUpgradeMessages.advancedPhysics2Description,
  advancedPhysics3: simulationUpgradeMessages.advancedPhysics3Description,
  advancedPhysics4: simulationUpgradeMessages.advancedPhysics4Description,
}

function simulationUpgradeCopy(
  upgradeId: DreamUpgradeFlag,
): {
  readonly title: MessageDescriptor
  readonly description: MessageDescriptor
} {
  const title = SIMULATION_UPGRADE_TITLES[upgradeId]
    ?? simulationUpgradeMessages.heading
  const description = SIMULATION_UPGRADE_DESCRIPTIONS[upgradeId]
    ?? (upgradeId.startsWith('hunter') ||
        upgradeId.startsWith('gatherer') ||
        upgradeId.startsWith('worker') ||
        upgradeId.startsWith('cities')
      ? simulationUpgradeMessages.foundationalDescription
      : upgradeId.startsWith('sf') || upgradeId.startsWith('railgun')
        ? simulationUpgradeMessages.spaceAgeDescription
        : simulationUpgradeMessages.informationDescription)
  return { title, description }
}
