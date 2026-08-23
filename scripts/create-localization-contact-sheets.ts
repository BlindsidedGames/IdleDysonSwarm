import { mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const input = resolve(root, 'output', 'localization-audit', 'screenshots')
const output = resolve(root, 'output', 'localization-audit', 'contact-sheets')
mkdirSync(output, { recursive: true })

const groups = new Map<string, { readonly route: string; readonly path: string }[]>()
for (const file of readdirSync(input).filter((entry) => entry.endsWith('.png'))) {
  const parts = file.slice(0, -4).split('--')
  if (parts.length < 4) continue
  const [profile, fixture, locale, ...routeParts] = parts
  const key = `${locale}--${profile}--${fixture}`
  const entries = groups.get(key) ?? []
  entries.push({ route: routeParts.join('--'), path: resolve(input, file) })
  groups.set(key, entries)
}

const cellWidth = 320
const cellHeight = 240
const labelHeight = 30
const columns = 4
for (const [group, entries] of groups) {
  entries.sort((left, right) => left.route.localeCompare(right.route))
  const rows = Math.ceil(entries.length / columns)
  const composites: sharp.OverlayOptions[] = []
  for (const [index, entry] of entries.entries()) {
    const left = (index % columns) * cellWidth
    const top = Math.floor(index / columns) * cellHeight
    const thumbnail = await sharp(entry.path)
      .resize(cellWidth, cellHeight - labelHeight, {
        fit: 'contain',
        background: '#130f22',
      })
      .png()
      .toBuffer()
    composites.push({ input: thumbnail, left, top: top + labelHeight })
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#2f1738"/><text x="10" y="21" fill="white" font-family="sans-serif" font-size="16">${escapeXml(entry.route)}</text></svg>`),
      left,
      top,
    })
  }
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 4,
      background: '#0b0910',
    },
  })
    .composite(composites)
    .png()
    .toFile(resolve(output, `${group}.png`))
}

console.log(`${groups.size} localization contact sheets written to ${output}`)

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
