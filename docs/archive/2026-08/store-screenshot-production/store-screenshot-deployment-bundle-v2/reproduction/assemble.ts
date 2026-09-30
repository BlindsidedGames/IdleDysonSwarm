import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-deployment-bundle-v2'
const approved = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const reviewed = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const profiles = ['iphone', 'ipad', 'android-phone', 'android-tablet'] as const
const mobile = [
  ['01-from-one-bot-to-galactic-brains.png', 'approved'],
  ['02-choose-your-path.png', 'approved'],
  ['03-break-infinity-keep-going.png', 'approved'],
  ['04-leap-into-the-quantum.png', 'approved'],
  ['05-rebuild-civilization.png', 'simulations-rebuild-civilization.png'],
  ['06-decode-the-anomaly.png', 'reality-decode-the-anomaly.png'],
  ['07-automate-the-impossible.png', 'approved'],
  ['08-unlock-a-strange-story.png', 'approved'],
] as const
const steam = [
  ['01-late-game-bots.png', resolve(approved, 'steam/05-late-game-bots.png')],
  ['02-skill-tree.png', resolve(approved, 'steam/01-skill-tree.png')],
  ['03-infinity-shop.png', resolve(approved, 'steam/06-infinity-shop.png')],
  ['04-quantum-upgrades.png', resolve(approved, 'steam/02-quantum-upgrades.png')],
  ['05-simulations.png', resolve(root, 'reproduction/raw-steam/simulations.png')],
  ['06-reality.png', resolve(root, 'reproduction/raw-steam/reality.png')],
  ['07-research-automation.png', resolve(approved, 'steam/03-research-automation.png')],
  ['08-story.png', resolve(approved, 'steam/08-story.png')],
] as const

async function main() {
for (const profile of profiles) {
  mkdirSync(resolve(root, profile), { recursive: true })
  for (const [output, source] of mobile) {
    const sourcePath = source === 'approved' ? resolve(approved, profile, output) : resolve(reviewed, profile, source)
    copyFileSync(sourcePath, resolve(root, profile, output))
  }
}
mkdirSync(resolve(root, 'steam'), { recursive: true })
for (const [output, source] of steam) copyFileSync(source, resolve(root, 'steam', output))

const sheets = {
  iphone: { width: 2320, height: 2580, cardWidth: 520, left: 60, top: 180, gapX: 40, gapY: 50, ratio: 2868 / 1320, label: 'IPHONE PORTRAIT' },
  ipad: { width: 3400, height: 1500, cardWidth: 800, left: 40, top: 180, gapX: 40, gapY: 50, ratio: 2048 / 2732, label: 'IPAD LANDSCAPE' },
  'android-phone': { width: 2320, height: 2160, cardWidth: 520, left: 60, top: 180, gapX: 40, gapY: 50, ratio: 1920 / 1080, label: 'ANDROID PHONE PORTRAIT' },
  'android-tablet': { width: 3400, height: 1180, cardWidth: 800, left: 40, top: 180, gapX: 40, gapY: 50, ratio: 1080 / 1920, label: 'ANDROID TABLET LANDSCAPE' },
  steam: { width: 3400, height: 1180, cardWidth: 800, left: 40, top: 180, gapX: 40, gapY: 50, ratio: 1080 / 1920, label: 'STEAM 16:9 RAW GAMEPLAY' },
} as const

for (const profile of [...profiles, 'steam'] as const) {
  const layout = sheets[profile]
  const files = profile === 'steam' ? steam.map(([name]) => name) : mobile.map(([name]) => name)
  const cards = await Promise.all(files.map((name) => sharp(resolve(root, profile, name)).resize({ width: layout.cardWidth }).png().toBuffer()))
  const bg = Buffer.from(`<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="#100918"/><stop offset="1" stop-color="#35183f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="72" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="48" font-weight="900" fill="white">THE COMPLETE STORY</text><text x="50%" y="125" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" letter-spacing="6" fill="#d88de2">${layout.label} • DEPLOYMENT V2</text></svg>`)
  await sharp(bg).composite(cards.map((input, i) => ({ input, left: layout.left + (i % 4) * (layout.cardWidth + layout.gapX), top: layout.top + Math.floor(i / 4) * (Math.round(layout.cardWidth * layout.ratio) + layout.gapY) }))).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, `contact-sheet-${profile}.png`))
}

writeFileSync(resolve(root, 'reproduction/composition.json'), JSON.stringify({ mobile, steam, sheets }, null, 2) + '\n')
}

void main()
