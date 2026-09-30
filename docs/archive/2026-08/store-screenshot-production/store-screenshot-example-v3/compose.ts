import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const sourceRoot = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-example-v2/raw'
const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-example-v3'

const scenes = [
  { raw: '01-late-bots.png', output: '01-from-one-bot-to-galactic-brains.png', lines: ['FROM ONE BOT TO', 'GALACTIC BRAINS'], accent: '#ec7cf0' },
  { raw: '02-skills.png', output: '02-choose-your-path.png', lines: ['CHOOSE YOUR PATH'], accent: '#59d8d5' },
  { raw: '03-infinity.png', output: '03-break-infinity-keep-going.png', lines: ['BREAK INFINITY.', 'KEEP GOING.'], accent: '#ffad61' },
] as const

type Profile = 'iphone' | 'tablet'

const layouts = {
  iphone: {
    canvas: { width: 1320, height: 2868 },
    screenshot: { x: 110, y: 410, width: 1100, height: 2384, radius: 30 },
    headerHeight: 365,
  },
  tablet: {
    canvas: { width: 2732, height: 2048 },
    screenshot: { x: 252, y: 320, width: 2228, height: 1670, radius: 30 },
    headerHeight: 280,
  },
} as const

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function backgroundSvg(profile: Profile, accent: string) {
  const { width, height } = layouts[profile].canvas
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100918"/><stop offset=".58" stop-color="#241230"/><stop offset="1" stop-color="#3b1b46"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.86}" cy="${profile === 'iphone' ? 130 : 40}" r="${profile === 'iphone' ? 620 : 780}" fill="url(#glow)"/>
  </svg>`)
}

function titleSvg(profile: Profile, lines: readonly string[], accent: string) {
  const { width } = layouts[profile].canvas
  if (profile === 'iphone') {
    const ys = lines.length === 1 ? [220] : [158, 252]
    return Buffer.from(`<svg width="${width}" height="365" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="58" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="8" fill="${accent}">IDLE DYSON SWARM</text>
      ${lines.map((line, index) => `<text x="${width / 2}" y="${ys[index]}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${lines.length === 1 ? 78 : 70}" font-weight="900" fill="#fff">${escapeXml(line)}</text>`).join('')}
      <rect x="495" y="310" width="330" height="8" rx="4" fill="${accent}"/>
    </svg>`)
  }
  const ys = lines.length === 1 ? [180] : [132, 216]
  return Buffer.from(`<svg width="${width}" height="280" xmlns="http://www.w3.org/2000/svg">
    <text x="${width / 2}" y="48" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="27" font-weight="700" letter-spacing="9" fill="${accent}">IDLE DYSON SWARM</text>
    ${lines.map((line, index) => `<text x="${width / 2}" y="${ys[index]}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${lines.length === 1 ? 88 : 76}" font-weight="900" fill="#fff">${escapeXml(line)}</text>`).join('')}
    <rect x="${width / 2 - 190}" y="250" width="380" height="7" rx="4" fill="${accent}"/>
  </svg>`)
}

function frameSvg(profile: Profile, accent: string) {
  const { canvas, screenshot } = layouts[profile]
  const border = 7
  return Buffer.from(`<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${screenshot.x - border}" y="${screenshot.y - border}" width="${screenshot.width + border * 2}" height="${screenshot.height + border * 2}" rx="${screenshot.radius + border}" fill="#0b0710" stroke="${accent}" stroke-width="${border}"/>
  </svg>`)
}

async function roundedScreenshot(profile: Profile, sourcePath: string) {
  const { width, height, radius } = layouts[profile].screenshot
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`)
  return sharp(sourcePath)
    .resize(width, height, { fit: 'fill' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function composeSet(profile: Profile) {
  mkdirSync(resolve(root, profile), { recursive: true })
  const layout = layouts[profile]
  for (const scene of scenes) {
    const screenshot = await roundedScreenshot(profile, resolve(sourceRoot, profile, scene.raw))
    await sharp(backgroundSvg(profile, scene.accent))
      .composite([
        { input: titleSvg(profile, scene.lines, scene.accent), left: 0, top: 0 },
        { input: frameSvg(profile, scene.accent), left: 0, top: 0 },
        { input: screenshot, left: layout.screenshot.x, top: layout.screenshot.y },
      ])
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(resolve(root, profile, scene.output))
  }
}

async function contactSheet(profile: Profile) {
  const portrait = profile === 'iphone'
  const cardWidth = portrait ? 880 : 1250
  const sheetWidth = portrait ? 2880 : 4070
  const sheetHeight = portrait ? 2180 : 1150
  const top = portrait ? 220 : 180
  const gap = portrait ? 60 : 80
  const cards = await Promise.all(scenes.map((scene) => sharp(resolve(root, profile, scene.output)).resize({ width: cardWidth }).png().toBuffer()))
  const label = portrait ? 'IPHONE PORTRAIT' : 'TABLET LANDSCAPE'
  const bg = Buffer.from(`<svg width="${sheetWidth}" height="${sheetHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100918"/><stop offset="1" stop-color="#35183f"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <text x="${sheetWidth / 2}" y="82" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="54" font-weight="900" fill="#fff">THE FIRST THREE</text>
    <text x="${sheetWidth / 2}" y="138" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" letter-spacing="6" fill="#d88de2">${label} • V3 REVIEW DRAFT</text>
  </svg>`)
  await sharp(bg)
    .composite(cards.map((input, index) => ({ input, left: gap + index * (cardWidth + gap), top })))
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(resolve(root, `contact-sheet-${profile}.png`))
}

async function main() {
  await composeSet('iphone')
  await composeSet('tablet')
  await contactSheet('iphone')
  await contactSheet('tablet')
  writeFileSync(resolve(root, 'composition.json'), JSON.stringify({
    sourceCaptures: sourceRoot,
    presentation: 'dedicated header above gameplay',
    framing: 'complete continuous border with identical rounded screenshot clip',
    layouts,
  }, null, 2) + '\n')
}

void main()
