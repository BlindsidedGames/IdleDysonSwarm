import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { deserializeWebSave, serializeWebSave } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/save/serialization.ts'

const repo = '/Users/matthewrushworth/Projects/Idle Dyson Swarm'
const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const sourcePath = resolve(repo, 'test/fixtures/progression/maximum-skills.idsweb1.txt')
const outputPath = resolve(root, 'fixtures/maximum-skills-4-points.idsweb1.txt')
const evidencePath = resolve(root, 'fixtures/maximum-skills-4-points.json')

mkdirSync(resolve(root, 'fixtures'), { recursive: true })

const sourceText = readFileSync(sourcePath, 'utf8')
const state = deserializeWebSave(sourceText)
const dysonVerse = state.dysonVerseSaveData as Record<string, unknown>
const skills = dysonVerse.dysonVerseSkillTreeData as Record<string, unknown>
if (!skills || typeof skills !== 'object' || Array.isArray(skills)) throw new Error('Source fixture has no skill-tree state')
const sourcePoints = skills.skillPointsTree
skills.skillPointsTree = 4n
const outputText = serializeWebSave(state)
const sha256 = createHash('sha256').update(outputText).digest('hex')

writeFileSync(outputPath, outputText)
writeFileSync(evidencePath, JSON.stringify({
  id: 'maximum-skills-4-points',
  sourceFixture: 'maximum-skills',
  sourceFixtureSha256: createHash('sha256').update(sourceText).digest('hex'),
  derivation: 'Changed only canonical state.skills.points from 73 to 4 before canonical reserialization; ownership and route state are unchanged.',
  sourcePoints: String(sourcePoints),
  derivedPoints: '4',
  saveSha256: sha256,
  file: outputPath,
}, null, 2) + '\n')

process.stdout.write(`${sha256}\n`)
