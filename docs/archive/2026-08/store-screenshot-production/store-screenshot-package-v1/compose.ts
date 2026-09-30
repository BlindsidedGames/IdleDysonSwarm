import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const approvedV3 = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-example-v3'

const scenes = [
  { raw: '01-late-bots.png', output: '01-from-one-bot-to-galactic-brains.png', lines: ['FROM ONE BOT TO', 'GALACTIC BRAINS'], accent: '#ec7cf0' },
  { raw: '02-skills.png', output: '02-choose-your-path.png', lines: ['CHOOSE YOUR PATH'], accent: '#59d8d5' },
  { raw: '03-infinity.png', output: '03-break-infinity-keep-going.png', lines: ['BREAK INFINITY.', 'KEEP GOING.'], accent: '#ffad61' },
  { raw: '04-quantum.png', output: '04-leap-into-the-quantum.png', lines: ['LEAP INTO', 'THE QUANTUM'], accent: '#ffad61' },
  { raw: '05-statistics.png', output: '05-watch-the-numbers-explode.png', lines: ['WATCH THE NUMBERS', 'EXPLODE'], accent: '#5ee887' },
  { raw: '06-avocato.png', output: '06-meet-avocato.png', lines: ['MEET AVOCATO'], accent: '#6de7dd' },
  { raw: '07-research.png', output: '07-automate-the-impossible.png', lines: ['AUTOMATE THE', 'IMPOSSIBLE'], accent: '#5adce8' },
  { raw: '08-story.png', output: '08-unlock-a-strange-story.png', lines: ['UNLOCK A', 'STRANGE STORY'], accent: '#e681ed' },
] as const

const steamScenes = [
  { raw: '02-skills.png', output: '01-skill-tree.png' },
  { raw: '04-quantum.png', output: '02-quantum-upgrades.png' },
  { raw: '07-research.png', output: '03-research-automation.png' },
  { raw: '05-statistics.png', output: '04-lifetime-statistics.png' },
  { raw: '01-late-bots.png', output: '05-late-game-bots.png' },
  { raw: '03-infinity.png', output: '06-infinity-shop.png' },
  { raw: '06-avocato.png', output: '07-avocato.png' },
  { raw: '08-story.png', output: '08-story.png' },
] as const

const requestedProfiles = new Set((process.env.IDS_STORE_COMPOSE_PROFILES ?? '').split(',').map((value) => value.trim()).filter(Boolean))
const requestedScenes = new Set((process.env.IDS_STORE_COMPOSE_SCENES ?? '').split(',').map((value) => value.trim()).filter(Boolean))

function sceneSelected(output: string) {
  return requestedScenes.size === 0 || [...requestedScenes].some((value) => output.startsWith(value))
}

type Profile = 'iphone' | 'ipad' | 'android-phone' | 'android-tablet'

const layouts = {
  iphone: {
    canvas: { width: 1320, height: 2868 },
    screenshot: { x: 110, y: 410, width: 1100, height: 2384, radius: 30 },
    headerHeight: 365,
  },
  ipad: {
    canvas: { width: 2732, height: 2048 },
    screenshot: { x: 252, y: 320, width: 2228, height: 1670, radius: 30 },
    headerHeight: 280,
  },
  'android-phone': {
    canvas: { width: 1080, height: 1920 },
    screenshot: { x: 70, y: 260, width: 940, height: 1624, radius: 26 },
    headerHeight: 225,
  },
  'android-tablet': {
    canvas: { width: 1920, height: 1080 },
    screenshot: { x: 90, y: 170, width: 1740, height: 870, radius: 22 },
    headerHeight: 145,
  },
} as const

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function backgroundSvg(profile: Profile, accent: string) {
  const { width, height } = layouts[profile].canvas
  const portrait = profile === 'iphone' || profile === 'android-phone'
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100918"/><stop offset=".58" stop-color="#241230"/><stop offset="1" stop-color="#3b1b46"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${width * 0.86}" cy="${portrait ? 100 : 20}" r="${portrait ? width * 0.5 : width * 0.3}" fill="url(#glow)"/>
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
  if (profile === 'android-phone') {
    const ys = lines.length === 1 ? [145] : [108, 174]
    return Buffer.from(`<svg width="${width}" height="225" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="38" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="6" fill="${accent}">IDLE DYSON SWARM</text>
      ${lines.map((line, index) => `<text x="${width / 2}" y="${ys[index]}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${lines.length === 1 ? 58 : 52}" font-weight="900" fill="#fff">${escapeXml(line)}</text>`).join('')}
      <rect x="390" y="205" width="300" height="6" rx="3" fill="${accent}"/>
    </svg>`)
  }
  if (profile === 'android-tablet') {
    const ys = lines.length === 1 ? [103] : [78, 127]
    return Buffer.from(`<svg width="${width}" height="145" xmlns="http://www.w3.org/2000/svg">
      <text x="${width / 2}" y="25" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="6" fill="${accent}">IDLE DYSON SWARM</text>
      ${lines.map((line, index) => `<text x="${width / 2}" y="${ys[index]}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${lines.length === 1 ? 49 : 42}" font-weight="900" fill="#fff">${escapeXml(line)}</text>`).join('')}
      <rect x="850" y="137" width="220" height="4" rx="2" fill="${accent}"/>
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
  const border = profile === 'android-tablet' ? 5 : 7
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

function rawPath(profile: Profile, raw: string) {
  return resolve(root, 'raw', profile, raw)
}

async function composeSet(profile: Profile) {
  const outputDir = resolve(root, profile)
  mkdirSync(outputDir, { recursive: true })
  const layout = layouts[profile]
  for (const scene of scenes) {
    if (!sceneSelected(scene.output)) continue
    if ((profile === 'iphone' || profile === 'ipad') && (scene.raw.startsWith('01-') || scene.raw.startsWith('03-'))) {
      const approvedProfile = profile === 'ipad' ? 'tablet' : 'iphone'
      copyFileSync(resolve(approvedV3, approvedProfile, scene.output), resolve(outputDir, scene.output))
      continue
    }
    const screenshot = await roundedScreenshot(profile, rawPath(profile, scene.raw))
    await sharp(backgroundSvg(profile, scene.accent))
      .composite([
        { input: titleSvg(profile, scene.lines, scene.accent), left: 0, top: 0 },
        { input: frameSvg(profile, scene.accent), left: 0, top: 0 },
        { input: screenshot, left: layout.screenshot.x, top: layout.screenshot.y },
      ])
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(resolve(outputDir, scene.output))
  }
}

const contactLayouts = {
  iphone: { width: 2320, height: 2580, cardWidth: 520, top: 180, left: 60, gapX: 40, gapY: 50 },
  ipad: { width: 3400, height: 1500, cardWidth: 800, top: 180, left: 40, gapX: 40, gapY: 50 },
  'android-phone': { width: 2320, height: 2160, cardWidth: 520, top: 180, left: 60, gapX: 40, gapY: 50 },
  'android-tablet': { width: 3400, height: 1180, cardWidth: 800, top: 180, left: 40, gapX: 40, gapY: 50 },
  steam: { width: 3400, height: 1180, cardWidth: 800, top: 180, left: 40, gapX: 40, gapY: 50 },
} as const

async function contactSheet(profile: Profile | 'steam', label: string) {
  const layout = contactLayouts[profile]
  const sourceDir = resolve(root, profile)
  const contactScenes = profile === 'steam' ? steamScenes : scenes
  const cards = await Promise.all(contactScenes.map((scene) => sharp(resolve(sourceDir, scene.output)).resize({ width: layout.cardWidth }).png().toBuffer()))
  const background = Buffer.from(`<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#100918"/><stop offset="1" stop-color="#35183f"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <text x="${layout.width / 2}" y="72" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="48" font-weight="900" fill="#fff">THE COMPLETE STORY</text>
    <text x="${layout.width / 2}" y="125" text-anchor="middle" font-family="Arial,sans-serif" font-size="23" letter-spacing="6" fill="#d88de2">${escapeXml(label)} • REVIEW PACKAGE V1</text>
  </svg>`)
  await sharp(background)
    .composite(cards.map((input, index) => ({
      input,
      left: layout.left + (index % 4) * (layout.cardWidth + layout.gapX),
      top: layout.top + Math.floor(index / 4) * (Math.round(layout.cardWidth * (profile === 'iphone' ? 2868 / 1320 : profile === 'android-phone' ? 1920 / 1080 : profile === 'ipad' ? 2048 / 2732 : 1080 / 1920)) + layout.gapY),
    })))
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(resolve(root, `contact-sheet-${profile}.png`))
}

async function composeSteam() {
  const outputDir = resolve(root, 'steam')
  mkdirSync(outputDir, { recursive: true })
  for (const scene of steamScenes) {
    if (!sceneSelected(scene.output)) continue
    await sharp(resolve(root, 'raw', 'steam', scene.raw))
      .resize(1920, 1080, { fit: 'fill' })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toFile(resolve(outputDir, scene.output))
  }
}

async function main() {
  if (requestedProfiles.size === 0 || requestedProfiles.has('iphone')) {
    await composeSet('iphone')
    await contactSheet('iphone', 'IPHONE PORTRAIT')
  }
  if (requestedProfiles.size === 0 || requestedProfiles.has('ipad')) {
    await composeSet('ipad')
    await contactSheet('ipad', 'IPAD LANDSCAPE')
  }
  if (requestedProfiles.size === 0 || requestedProfiles.has('android-phone')) {
    await composeSet('android-phone')
    await contactSheet('android-phone', 'ANDROID PHONE PORTRAIT')
  }
  if (requestedProfiles.size === 0 || requestedProfiles.has('android-tablet')) {
    await composeSet('android-tablet')
    await contactSheet('android-tablet', 'ANDROID TABLET LANDSCAPE')
  }
  if (requestedProfiles.size === 0 || requestedProfiles.has('steam')) {
    await composeSteam()
    await contactSheet('steam', 'STEAM 16:9 RAW GAMEPLAY')
  }
  writeFileSync(resolve(root, 'composition.json'), JSON.stringify({ layouts, scenes, steamScenes }, null, 2) + '\n')
}

void main()
