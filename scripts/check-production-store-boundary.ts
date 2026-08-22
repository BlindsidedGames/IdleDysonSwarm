import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const assetsDirectory = resolve(process.cwd(), 'dist/assets')
const javascript = readdirSync(assetsDirectory)
  .filter((fileName) => fileName.endsWith('.js'))
  .map((fileName) => readFileSync(resolve(assetsDirectory, fileName), 'utf8'))
  .join('\n')

const forbiddenDevelopmentMarkers = [
  'Test: succeeds',
  'Test: cancels',
  'Test: fails',
  'Test $0',
  'development-stripe',
]
const leakedMarker = forbiddenDevelopmentMarkers.find(
  (marker) => javascript.includes(marker),
)
if (leakedMarker !== undefined) {
  throw new Error(
    `Production bundle contains development Store marker: ${leakedMarker}`,
  )
}
if (!javascript.includes('/api/ids/stripe')) {
  throw new Error('Production bundle does not contain the Stripe API adapter.')
}

console.log('Production Store boundary: Stripe present; development adapter absent.')
