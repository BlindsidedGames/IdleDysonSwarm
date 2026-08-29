import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createProgressionMatrixFixtures } from './support/progressionMatrixFixtures'

const output = resolve(import.meta.dirname, '..', 'test', 'fixtures', 'progression')
mkdirSync(output, { recursive: true })
const fixtures = createProgressionMatrixFixtures()
for (const fixture of fixtures) {
  writeFileSync(resolve(output, `${fixture.id}.idsweb1.txt`), `${fixture.saveText.trim()}\n`)
}
writeFileSync(resolve(output, 'fixture-manifest.json'), `${JSON.stringify({
  schemaVersion: 1,
  generatedFrom: 'canonical progression builders',
  fixtures: fixtures.map(({ id, description, fingerprint, saveSha256, reachableRoutes, certification }) => ({
    id, description, fingerprint, saveSha256, reachableRoutes, certification,
    file: `${id}.idsweb1.txt`,
  })),
}, null, 2)}\n`)
