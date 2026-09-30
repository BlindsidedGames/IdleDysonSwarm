import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const packageV1 = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
type Profile = 'iphone' | 'ipad' | 'android-phone' | 'android-tablet'
const profiles: readonly Profile[] = ['iphone', 'ipad', 'android-phone', 'android-tablet']
const layouts = {
  iphone: { canvas: [1320, 2868], shot: [110, 410, 1100, 2384, 30], header: 365 },
  ipad: { canvas: [2732, 2048], shot: [252, 320, 2228, 1670, 30], header: 280 },
  'android-phone': { canvas: [1080, 1920], shot: [70, 260, 940, 1624, 26], header: 225 },
  'android-tablet': { canvas: [1920, 1080], shot: [90, 170, 1740, 870, 22], header: 145 },
} as const
const candidates = [
  { id: 'reality', output: 'reality-decode-the-anomaly.png', lines: ['DECODE THE', 'ANOMALY'], accent: '#c982d4' },
  { id: 'simulations', output: 'simulations-rebuild-civilization.png', lines: ['REBUILD', 'CIVILIZATION'], accent: '#7ac7ee' },
] as const

function svg(profile: Profile, lines: readonly string[], accent: string) {
  const [width, height] = layouts[profile].canvas
  const portrait = profile === 'iphone' || profile === 'android-phone'
  const font = profile === 'iphone' ? 70 : profile === 'android-phone' ? 52 : profile === 'ipad' ? 76 : 42
  const brand = profile === 'iphone' ? 30 : profile === 'android-phone' ? 22 : profile === 'ipad' ? 27 : 15
  const brandY = profile === 'iphone' ? 58 : profile === 'android-phone' ? 38 : profile === 'ipad' ? 48 : 25
  const ys = profile === 'iphone' ? [158, 252] : profile === 'android-phone' ? [108, 174] : profile === 'ipad' ? [132, 216] : [78, 127]
  const lineY = profile === 'iphone' ? 310 : profile === 'android-phone' ? 205 : profile === 'ipad' ? 250 : 137
  const lineWidth = profile === 'ipad' ? 380 : profile === 'android-tablet' ? 220 : 300
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#100918"/><stop offset=".58" stop-color="#241230"/><stop offset="1" stop-color="#3b1b46"/></linearGradient><radialGradient id="g"><stop stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><circle cx="${width * .86}" cy="${portrait ? 100 : 20}" r="${portrait ? width * .5 : width * .3}" fill="url(#g)"/><text x="${width / 2}" y="${brandY}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${brand}" font-weight="700" letter-spacing="${profile === 'ipad' ? 9 : 6}" fill="${accent}">IDLE DYSON SWARM</text>${lines.map((line, i) => `<text x="${width / 2}" y="${ys[i]}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${font}" font-weight="900" fill="#fff">${line}</text>`).join('')}<rect x="${(width-lineWidth)/2}" y="${lineY}" width="${lineWidth}" height="${profile === 'android-tablet' ? 4 : 7}" rx="4" fill="${accent}"/></svg>`)
}

async function compose(profile: Profile, candidate: (typeof candidates)[number]) {
  const layout = layouts[profile]
  const [cw, ch] = layout.canvas
  const [x, y, width, height, radius] = layout.shot
  const border = profile === 'android-tablet' ? 5 : 7
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${radius}" fill="#fff"/></svg>`)
  const shot = await sharp(resolve(root, 'raw', profile, `${candidate.id}.png`)).resize(width, height, { fit: 'cover' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const frame = Buffer.from(`<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><rect x="${x-border}" y="${y-border}" width="${width+border*2}" height="${height+border*2}" rx="${radius+border}" fill="#0b0710" stroke="${candidate.accent}" stroke-width="${border}"/></svg>`)
  await sharp(svg(profile, candidate.lines, candidate.accent)).composite([{ input: frame }, { input: shot, left: x, top: y }]).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, profile, candidate.output))
}

async function contactSheet(profile: Profile) {
  const files = ['statistics-current.png', ...candidates.map(({ output }) => output)]
  const cardWidth = profile === 'iphone' || profile === 'android-phone' ? 500 : 850
  const cards = await Promise.all(files.map((file) => sharp(resolve(root, profile, file)).resize({ width: cardWidth }).png().toBuffer()))
  const metadata = await sharp(cards[0]).metadata()
  const width = cardWidth * 3 + 160
  const height = (metadata.height ?? 1000) + 260
  const bg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#100918"/><stop offset="1" stop-color="#35183f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#b)"/><text x="${width/2}" y="70" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="48" font-weight="900" fill="#fff">STATISTICS REPLACEMENT REVIEW</text><text x="${width/2}" y="122" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" letter-spacing="5" fill="#d88de2">CURRENT • REALITY • SIMULATIONS</text></svg>`)
  await sharp(bg).composite(cards.map((input, index) => ({ input, left: 40 + index * (cardWidth + 40), top: 180 }))).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(root, `comparison-${profile}.png`))
}

async function main() {
  for (const profile of profiles) {
    mkdirSync(resolve(root, profile), { recursive: true })
    copyFileSync(resolve(packageV1, profile, '05-watch-the-numbers-explode.png'), resolve(root, profile, 'statistics-current.png'))
    for (const candidate of candidates) await compose(profile, candidate)
    await contactSheet(profile)
  }
}

void main()
