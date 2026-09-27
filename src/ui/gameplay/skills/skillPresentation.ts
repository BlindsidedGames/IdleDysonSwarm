import { manualFacilityMessages, manualFacilityPresentation } from './manualFacilityMessages'
import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import skillTreePresentationJson from '../../../game-data/generated/skill-tree-presentation.json'
import { localizeSkillPresentation } from '../../../game-data/skillPresentationLocalization'
import { discoverySkillNames, discoverySkillEffects, discoverySkillFlavour } from '../discovery/skillMessages'
import { swarmAugmentPresentation } from './swarmMessages'
import { CASH_SCIENCE_SUBSKILLS, SRS_AUGMENTS, MANUAL_LABOUR_AUGMENTS, SKILL_AUGMENTS } from '../../../simulation/skillSubskills'
import { skillMessages as messages } from './messages'
export interface SkillPresentationNode {
  readonly skillId: string
  readonly legacySkillKey: number
  readonly x: number
  readonly y: number
  readonly displayName: string
  readonly description: string
  readonly discoveryTechnical?: boolean
  readonly technicalDescription: string
  readonly cost: number
  readonly messageIds: {
    readonly displayName: string
    readonly description: string
    readonly technicalDescription: string
  }
  readonly icon: {
    readonly fileName: string
  }
}

interface SkillTreePresentation {
  readonly formatVersion: number
  readonly nodeCount: number
  readonly nodes: readonly SkillPresentationNode[]
}
const SKILL_GRID_SPACING = 180
const legacyPresentation =
  skillTreePresentationJson as SkillTreePresentation
const srsColumnX = legacyPresentation.nodes.find(node => node.skillId === 'superRadiantScattering')!.x
const leftOfSrsColumns: Readonly<Record<string, number>> = {
  quantumComputing: -0.5,
  parallelComputation: -0.5,
  hypercubeNetworks: -1,
  clusterNetworking: 0,
  pocketAndroids: -2,
  solarBubbles: -2,
  shoulderSurgery: -2,
  shouldersOfTheRevolution: -2,
  shouldersOfTheFallen: -2,
  whatWillComeToPass: -1,
  whatCouldHaveBeen: -1,
  shouldersOfTheEnlightened: -1,
  shouldersOfPrecursors: -1,
}
// Web-owned layout adjustments leave the frozen Unity compatibility data intact.
export const presentation: SkillTreePresentation = {
  ...legacyPresentation,
  nodes: legacyPresentation.nodes.map(node => leftOfSrsColumns[node.skillId] === undefined
    ? node
    : { ...node, x: srsColumnX + leftOfSrsColumns[node.skillId] * SKILL_GRID_SPACING }),
}
const iconModules = import.meta.glob('../../assets/skill-icons/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
export const iconByFileName = new Map(
  Object.entries(iconModules).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1),
    url,
  ]),
)

export function useSkillPresentationNodes(discoveryUnlocked: boolean) {
  const intl = useIntl()
  const localizedNodes = useMemo(
    () =>
      presentation.nodes.map((node) =>
        (() => {
          const localized = localizeSkillPresentation(intl, node)
          if (!discoveryUnlocked) return localized
          const name = discoverySkillNames[node.skillId as keyof typeof discoverySkillNames]
          const effect = discoverySkillEffects[node.skillId as keyof typeof discoverySkillEffects]
          const flavour = discoverySkillFlavour[node.skillId as keyof typeof discoverySkillFlavour]
          return { ...localized, ...(flavour ? { description: intl.formatMessage(flavour) } : {}), ...(name ? { displayName: intl.formatMessage(name) } : {}), ...(effect ? { technicalDescription: intl.formatMessage(effect), discoveryTechnical: true } : {}) }
        })(),
      ),
    [intl, discoveryUnlocked],
  )
  const nodeById = useMemo(
    () => {
      const nodes = new Map(localizedNodes.map((node) => [node.skillId, node]))
      const augmentPresentation = new Map<string, { message: Pick<typeof messages.subskillLifetime, 'id' | 'defaultMessage'>; description?: Pick<typeof messages.subskillLifetime, 'id' | 'defaultMessage'>; effect?: Pick<typeof messages.subskillLifetime, 'id' | 'defaultMessage'>; iconFileName: string; column: number; row: number }>([
        [MANUAL_LABOUR_AUGMENTS.handAssembly, { message: messages.manualHandAssemblyName, description: messages.manualHandAssemblyDescription, effect: messages.manualHandAssemblyEffect, iconFileName: 'manualHandAssembly.webp', column: 1, row: 0 }],
        [MANUAL_LABOUR_AUGMENTS.practice, { message: messages.manualPracticeName, description: messages.manualPracticeDescription, effect: messages.manualPracticeEffect, iconFileName: 'manualPractice.webp', column: 2, row: 0 }],
        [MANUAL_LABOUR_AUGMENTS.workingSmarter, { message: messages.manualWorkingSmarterName, description: messages.manualWorkingSmarterDescription, effect: messages.manualWorkingSmarterEffect, iconFileName: 'manualWorkingSmarter.webp', column: 1, row: 1 }],
        [MANUAL_LABOUR_AUGMENTS.patientHands, { message: messages.manualPatientHandsName, description: messages.manualPatientHandsDescription, effect: messages.manualPatientHandsEffect, iconFileName: 'manualPatientHands.webp', column: 2, row: 1 }],
        [SRS_AUGMENTS.stellarMemory, { message: messages.srsStellarMemoryName, description: messages.srsStellarMemoryDescription, effect: messages.srsStellarMemoryEffect, iconFileName: 'srsStellarMemory.webp', column: 2, row: 1 }],
        [SRS_AUGMENTS.hotStart, { message: messages.srsHotStartName, description: messages.srsHotStartDescription, effect: messages.srsHotStartEffect, iconFileName: 'srsHotStart.webp', column: -1, row: 0 }],
        [SRS_AUGMENTS.afterglow, { message: messages.srsAfterglowName, description: messages.srsAfterglowDescription, effect: messages.srsAfterglowEffect, iconFileName: 'srsAfterglow.webp', column: -2, row: 0 }],
        [SRS_AUGMENTS.deepExposure, { message: messages.srsDeepExposureName, description: messages.srsDeepExposureDescription, effect: messages.srsDeepExposureEffect, iconFileName: 'srsDeepExposure.webp', column: 0, row: 1 }],
        [SRS_AUGMENTS.focusedBeam, { message: messages.srsFocusedBeamName, description: messages.srsFocusedBeamDescription, effect: messages.srsFocusedBeamEffect, iconFileName: 'srsFocusedBeam.webp', column: 1, row: 0 }],
        [SRS_AUGMENTS.researchConversion, { message: messages.srsResearchConversionName, description: messages.srsResearchConversionDescription, effect: messages.srsResearchConversionEffect, iconFileName: 'srsResearchConversion.webp', column: 2, row: 0 }],
        [SRS_AUGMENTS.researchActivity, { message: messages.srsResearchActivityName, description: messages.srsResearchActivityDescription, effect: messages.srsResearchActivityEffect, iconFileName: 'srsResearchActivity.webp', column: 1, row: 1 }],
        [CASH_SCIENCE_SUBSKILLS.lifetime, { message: messages.subskillLifetimeName, description: messages.subskillLifetimeDescription, effect: messages.subskillLifetime, iconFileName: 'panelWarranty.webp', column: 0, row: -1 }],
        [CASH_SCIENCE_SUBSKILLS.decay, { message: messages.subskillDecayName, description: messages.subskillDecayDescription, effect: messages.subskillDecay, iconFileName: 'supermassivePanels.webp', column: 1, row: 0 }],
        [CASH_SCIENCE_SUBSKILLS.production, { message: messages.subskillProductionName, description: messages.subskillProductionDescription, effect: messages.subskillProduction, iconFileName: 'startHereTree.webp', column: 0, row: 1 }],
      ])
      for (const [id, presentation] of swarmAugmentPresentation) augmentPresentation.set(id, presentation)
      for (const augment of SKILL_AUGMENTS) {
        const parent = nodes.get(augment.parentSkillId)
        const authored = augmentPresentation.get(augment.id)
        if (!parent || !authored) continue
        const label = intl.formatMessage(authored.message)
        nodes.set(augment.id, {
          ...parent, skillId: augment.id, displayName: label,
          icon: { fileName: authored.iconFileName },
          description: authored.description ? intl.formatMessage(authored.description) : '',
          technicalDescription: authored.effect ? intl.formatMessage(authored.effect) : label, cost: augment.cost,
          x: parent.x + authored.column * SKILL_GRID_SPACING,
          y: parent.y - authored.row * SKILL_GRID_SPACING,
        })
      }
      const manualRoot = nodes.get('manualLabour')
      if (manualRoot) for (const [index, augment] of manualFacilityPresentation.entries()) {
        const facility = intl.formatMessage(augment.name)
        nodes.set(augment.id, { ...manualRoot, skillId: augment.id,
          displayName: intl.formatMessage(manualFacilityMessages.name, { facility }),
          description: '', technicalDescription: intl.formatMessage(
            augment.facilityId === 'galactic_brains' ? manualFacilityMessages.brainEffect : manualFacilityMessages.effect,
            { facility }), cost: 1, icon: { fileName: augment.icon },
          x: manualRoot.x - (index + 1) * SKILL_GRID_SPACING, y: manualRoot.y,
        })
      }
      if (discoveryUnlocked) {
        for (const [id, node] of nodes) {
          const effect = discoverySkillEffects[id as keyof typeof discoverySkillEffects]
          if (effect) nodes.set(id, { ...node, technicalDescription: intl.formatMessage(effect), discoveryTechnical: true })
        }
      }
      return nodes
    },
    [intl, localizedNodes, discoveryUnlocked],
  )
  return { localizedNodes, nodeById }
}
