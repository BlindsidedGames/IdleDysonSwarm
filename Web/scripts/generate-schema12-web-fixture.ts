import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { PreparedSave } from '../src/save/prepare'
import { serializeWebSave } from '../src/save/serialization'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(scriptDirectory, '..')
const repositoryRoot = resolve(webRoot, '..')
const fixtureRelativePath =
  'Web/test/fixtures/schema-12-canonical-idsweb1-first-run.txt'
const provenanceRelativePath =
  'Web/test/fixtures/schema-12-canonical-idsweb1-first-run.provenance.json'
const sourceRelativePath =
  'Web/src/application/firstRun/generated/first-run-schema-12.idb1.txt'
const sourceProvenanceRelativePath =
  'Web/src/application/firstRun/generated/first-run-schema-12.provenance.json'
const generatorRelativePath =
  'Web/scripts/generate-schema12-web-fixture.ts'
const serializerRelativePath = 'Web/src/save/serialization.ts'

const args = process.argv.slice(2)
const generate = args.includes('--generate')
const check = args.length === 0 || args.includes('--check')
if (
  (generate && check) ||
  args.some((arg) => arg !== '--generate' && arg !== '--check')
) {
  throw new Error(
    'Use --generate to rewrite the fixture or --check (the default) to verify it.',
  )
}

const sourceText = readRepositoryText(sourceRelativePath)
const sourceProvenanceText = readRepositoryText(
  sourceProvenanceRelativePath,
)
const sourceProvenance = JSON.parse(sourceProvenanceText) as {
  readonly artifactPath: string
  readonly artifactSha256: string
  readonly saveSchema: number
}
const sourceSha256 = hashCanonicalText(sourceText)
if (
  sourceProvenance.artifactPath !== sourceRelativePath ||
  sourceProvenance.artifactSha256 !== sourceSha256 ||
  sourceProvenance.saveSchema !== 12
) {
  throw new Error(
    'The checked-in Unity first-run source does not match its schema-12 provenance.',
  )
}

const prepared = await loadDeterministicFirstRunPreparedSave()
const fixture = serializeWebSave(prepared.copyValidatedState())
const fixtureSha256 = hashExactText(fixture)
const provenance = `${JSON.stringify(
  {
    formatVersion: 1,
    classification: 'development-only-non-private',
    artifactPath: fixtureRelativePath,
    artifactSha256: fixtureSha256,
    artifactBytes: Buffer.byteLength(fixture, 'utf8'),
    saveSchema: 12,
    source: {
      kind: 'checked-in-unity-first-run-development-artifact',
      artifactPath: sourceRelativePath,
      artifactSha256: sourceSha256,
      provenancePath: sourceProvenanceRelativePath,
      provenanceSha256: hashCanonicalText(sourceProvenanceText),
    },
    generator: {
      path: generatorRelativePath,
      command:
        'npm run fixture:schema12-web:generate',
      checkCommand:
        'npm run fixture:schema12-web:check',
      contract:
        'createDeterministicUnityFirstRunPreparedSave -> copyValidatedState -> serializeWebSave',
    },
    serializer: {
      path: serializerRelativePath,
      contract:
        'IDSWEB1 sorted-key JSON, gzip level 9 with mtime 0, and path-independent bigint/byte encoding',
    },
    privacy: {
      localProductionSaveUsed: false,
      browserProfileUsed: false,
      indexedDbExportUsed: false,
      playerOrSupportSaveUsed: false,
    },
  },
  null,
  2,
)}\n`

const fixturePath = resolve(repositoryRoot, fixtureRelativePath)
const provenancePath = resolve(repositoryRoot, provenanceRelativePath)
if (generate) {
  writeFileSync(fixturePath, fixture, 'utf8')
  writeFileSync(provenancePath, provenance, 'utf8')
  console.log(
    `Generated deterministic schema-12 IDSWEB1 fixture ${fixtureSha256}.`,
  )
} else {
  assertExactFile(fixturePath, fixture)
  assertCanonicalTextFile(provenancePath, provenance)
  console.log(
    `Verified deterministic schema-12 IDSWEB1 fixture ${fixtureSha256}.`,
  )
}

async function loadDeterministicFirstRunPreparedSave(): Promise<PreparedSave> {
  const server = await createServer({
    root: webRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  try {
    const loaded = (await server.ssrLoadModule(
      '/src/application/firstRun/unityFirstRunSave.ts',
    )) as {
      readonly createDeterministicUnityFirstRunPreparedSave: () => PreparedSave
    }
    return loaded.createDeterministicUnityFirstRunPreparedSave()
  } finally {
    await server.close()
  }
}

function readRepositoryText(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), 'utf8')
}

function hashExactText(text: string): string {
  return createHash('sha256')
    .update(text, 'utf8')
    .digest('hex')
    .toUpperCase()
}

function hashCanonicalText(text: string): string {
  return hashExactText(text.replace(/\r\n?/g, '\n'))
}

function assertExactFile(path: string, expected: string): void {
  if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) {
    throw new Error(
      'The schema-12 IDSWEB1 fixture drifted. Run npm run fixture:schema12-web:generate only after reviewing the serializer or source change.',
    )
  }
}

function assertCanonicalTextFile(path: string, expected: string): void {
  const actual = existsSync(path)
    ? readFileSync(path, 'utf8').replace(/\r\n?/g, '\n')
    : null
  if (actual !== expected) {
    throw new Error(
      'The schema-12 IDSWEB1 provenance drifted. Regenerate it with the fixture after reviewing the source change.',
    )
  }
}
