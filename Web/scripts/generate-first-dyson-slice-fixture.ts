import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { generateFirstDysonSliceFixture } from './firstDysonSliceCanonical'

const destination = new URL(
  '../src/parity/first-dyson-slice.fixture.json',
  import.meta.url,
)
const generated = `${JSON.stringify(await generateFirstDysonSliceFixture(), null, 2)}\n`

if (process.argv.includes('--check')) {
  const existing = readFileSync(destination, 'utf8')
  if (JSON.stringify(JSON.parse(existing)) !== JSON.stringify(JSON.parse(generated))) {
    throw new Error(
      'The frozen first-Dyson fixture drifted. Regenerate it through the canonical coordinator before accepting the change.',
    )
  }
} else {
  await writeFile(destination, generated)
}
