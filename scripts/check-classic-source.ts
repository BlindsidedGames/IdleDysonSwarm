import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const root = resolve('classic')
const baseline = JSON.parse(readFileSync(resolve(root, 'baseline.json'), 'utf8')) as {
  sourceCommit: string
  files: Record<string, string>
  localPatches: Record<string, { sha256: string; reason: string }>
}
for (const [name, originalHash] of Object.entries(baseline.files)) {
  if (name.includes('..') || name.startsWith('/')) throw Error('Invalid baseline path')
  const hash = createHash('sha256').update(readFileSync(resolve(root, name))).digest('hex')
  const patch = baseline.localPatches[name]
  if (hash !== (patch?.sha256 ?? originalHash)) throw Error('Unrecorded Classic source change: ' + name)
  if (patch && !patch.reason.trim()) throw Error('Missing Classic patch reason: ' + name)
}
for (const name of Object.keys(baseline.localPatches)) if (!(name in baseline.files)) throw Error('Patch has no baseline: ' + name)
console.log(`${Object.keys(baseline.files).length} Classic baseline files verified at ${baseline.sourceCommit}; ${Object.keys(baseline.localPatches).length} documented infrastructure patches.`)
