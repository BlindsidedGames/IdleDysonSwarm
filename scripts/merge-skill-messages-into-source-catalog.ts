/**
 * Adds the generated Skill-tree presentation copy to the FormatJS source
 * catalog. FormatJS cannot statically extract these descriptors because their
 * stable IDs and English fallbacks come from generated game data at runtime.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface SourceMessage {
  readonly defaultMessage: string
  readonly description: string
}

interface SkillPresentationNode {
  readonly skillId: string
  readonly displayName: string
  readonly description: string
  readonly technicalDescription: string
  readonly messageIds: {
    readonly displayName: string
    readonly description: string
    readonly technicalDescription: string
  }
}

interface SkillPresentationCatalog {
  readonly nodeCount: number
  readonly nodes: readonly SkillPresentationNode[]
}

const EXPECTED_SKILL_COUNT = 104
// The Unity handoff capsule is intentionally byte-frozen. Keep player-facing
// Web copy corrections here when the inherited wording no longer describes
// the live Web mechanic, rather than mutating the historical handoff data.
const WEB_SKILL_COPY_OVERRIDES: Readonly<Record<string, string>> = {
  'skills.node.androids.technical':
    'While the Androids Skill is assigned, its bonus scales from 0 to 200 seconds of Panel Lifetime over a 10 minute span.\nThis resets on Infinity/Quantum Leap.',
  'skills.node.fragmentAssembly.technical':
    'If you have at least 4 other Fragment Skills assigned, triple the production of all Buildings.',
  'skills.node.monetaryPolicy.technical':
    'Increase Cash gain by 1.75x. Increase this bonus by 0.75x for every other assigned Fragment Skill.',
  'skills.node.panelWarranty.technical':
    '+5s of Panel Lifetime. Double this bonus for every other assigned Fragment Skill. (5s for 1, 20s for 3)',
  'skills.node.productionScaling.technical':
    'Start the 1% bonus with the first purchased building after 90. Reduce that threshold by another 5 for every other assigned Fragment Skill.',
  'skills.node.progressiveAssembly.technical':
    'Assembly Lines produce 1.5x as much. Increase this bonus by 0.5x for every other assigned Fragment Skill.',
  'skills.node.regulatedAcademia.technical':
    'Science and Cash Boost base is increased by 20%. Increase the base by 10% for every other assigned Fragment Skill.',
  'skills.node.repeatableResearch.technical':
    'Percentage-based research becomes cheaper as you upgrade it. Its cost is divided by its current total production multiplier. For example, a +300% bonus means 4× production, so that research costs one quarter as much. Does not affect Durability.',
  'skills.node.supernova.technical':
    'Stellar Sacrifices Galaxies are 1000x better. While Supernova is assigned, manually purchased buildings lose every production bonus including Avocados, the 50/100 milestones, Production Scaling, and all Swarm rates. Unassigning Supernova restores the complete manual-purchase layer.',
  'skills.node.terraformingProtocols.technical':
    'Assemble an additional Planet per second. Get an additional Planet for every other assigned Fragment Skill.',
}
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceCatalogPath = resolve(
  webRoot,
  'src/ui/i18n/catalogs/source/en.json',
)
const skillPresentationPath = resolve(
  webRoot,
  'src/game-data/generated/skill-tree-presentation.json',
)
const checkOnly = process.argv.includes('--check')

const sourceCatalog = JSON.parse(
  readFileSync(sourceCatalogPath, 'utf8'),
) as Record<string, SourceMessage>
const presentation = JSON.parse(
  readFileSync(skillPresentationPath, 'utf8'),
) as SkillPresentationCatalog
const skillMessages = buildSkillMessages(presentation)

const mergedEntries = Object.entries(sourceCatalog)
  .filter(([id]) => !id.startsWith('skills.node.'))
  .concat(Object.entries(skillMessages))
  .sort(([left], [right]) => compareText(left, right))
const output = `${JSON.stringify(Object.fromEntries(mergedEntries), null, 2)}\n`

if (checkOnly) {
  if (readFileSync(sourceCatalogPath, 'utf8') !== output) {
    throw new Error(
      'Generated Skill messages are missing or stale; run npm run i18n:extract.',
    )
  }
  console.log('The English source catalog contains every generated Skill message.')
} else {
  writeFileSync(sourceCatalogPath, output, 'utf8')
  console.log(
    `Added ${Object.keys(skillMessages).length} generated Skill messages to the English source catalog.`,
  )
}

export function buildSkillMessages(
  catalog: SkillPresentationCatalog,
): Readonly<Record<string, SourceMessage>> {
  if (
    catalog.nodeCount !== EXPECTED_SKILL_COUNT ||
    catalog.nodes.length !== EXPECTED_SKILL_COUNT
  ) {
    throw new Error(
      `Skill presentation must contain exactly ${EXPECTED_SKILL_COUNT} nodes.`,
    )
  }

  const messages: Record<string, SourceMessage> = {}
  for (const node of catalog.nodes) {
    requireText(node.skillId, 'skillId')
    requireText(node.displayName, `${node.skillId}.displayName`)
    requireText(node.description, `${node.skillId}.description`)
    requireText(
      node.technicalDescription,
      `${node.skillId}.technicalDescription`,
    )

    addMessage(
      messages,
      node.messageIds.displayName,
      `skills.node.${node.skillId}.name`,
      node.displayName,
      `Display name for the ${node.displayName} Skill node.`,
    )
    addMessage(
      messages,
      node.messageIds.description,
      `skills.node.${node.skillId}.description`,
      node.description,
      `Flavour description for the ${node.displayName} Skill node.`,
    )
    addMessage(
      messages,
      node.messageIds.technicalDescription,
      `skills.node.${node.skillId}.technical`,
      WEB_SKILL_COPY_OVERRIDES[node.messageIds.technicalDescription] ??
        node.technicalDescription,
      `Technical gameplay-effect description for the ${node.displayName} Skill node.`,
    )
  }

  const expectedMessageCount = EXPECTED_SKILL_COUNT * 3
  if (Object.keys(messages).length !== expectedMessageCount) {
    throw new Error(
      `Skill presentation must define exactly ${expectedMessageCount} unique messages.`,
    )
  }
  return messages
}

function addMessage(
  messages: Record<string, SourceMessage>,
  actualId: string,
  expectedId: string,
  defaultMessage: string,
  description: string,
): void {
  if (actualId !== expectedId) {
    throw new Error(
      `Generated Skill message ID '${actualId}' must be '${expectedId}'.`,
    )
  }
  if (Object.hasOwn(messages, actualId)) {
    throw new Error(`Duplicate generated Skill message ID '${actualId}'.`)
  }
  messages[actualId] = { defaultMessage, description }
}

function requireText(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Generated Skill field '${field}' must not be empty.`)
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
