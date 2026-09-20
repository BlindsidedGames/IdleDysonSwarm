import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, unlinkSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { parseCatalog } from '../src/promotions/catalog'

// Explicit source path keeps local checkout names out of the reusable catalog contract.
const source = process.argv[2]
if (!source) throw new Error('Usage: npm run promotions:sync -- /path/to/website/public/promotions')
const catalog = parseCatalog(JSON.parse(readFileSync(resolve(source, 'v1/catalog.json'), 'utf8')))
const destination = resolve('src/promotions/assets')
const images = catalog.games.map(game => {
  const name = basename(game.banner)
  const bytes = readFileSync(resolve(source, 'images', name))
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
  if (!name.endsWith(`.${hash}.webp`) || bytes.length > 250 * 1024) throw new Error(`Invalid banner: ${name}`)
  return name
})
mkdirSync(destination, { recursive: true })
for (const name of images) copyFileSync(resolve(source, 'images', name), resolve(destination, name))
for (const name of readdirSync(destination)) if (name.endsWith('.webp') && !images.includes(name)) unlinkSync(resolve(destination, name))
writeFileSync('src/promotions/bundled.json', JSON.stringify(catalog, null, 2) + '\n')
console.log(`Bundled ${catalog.games.length} promotions and their verified images.`)
