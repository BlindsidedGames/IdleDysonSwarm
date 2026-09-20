import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { parseCatalog } from '../src/promotions/catalog'
const catalog = parseCatalog(JSON.parse(readFileSync('src/promotions/bundled.json', 'utf8')))
for (const game of catalog.games) {
  const filename = basename(game.banner)
  const bytes = readFileSync(`src/promotions/assets/${filename}`)
  const metadata = await sharp(bytes).metadata()
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
  if (metadata.width !== 960 || metadata.height !== 540 || metadata.format !== 'webp' ||
      bytes.length > 250 * 1024 || !filename.endsWith(`.${hash}.webp`)) throw new Error(`Invalid banner: ${filename}`)
}
console.log(`Validated ${catalog.games.length} bundled promotions and images.`)
