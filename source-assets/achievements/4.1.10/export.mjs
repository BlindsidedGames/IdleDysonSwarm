import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const root = path.dirname(fileURLToPath(import.meta.url))
for (const file of await fs.readdir(path.join(root, 'masters'))) {
  if (!file.endsWith('.svg')) continue
  const source = await fs.readFile(path.join(root, 'masters', file), 'utf8')
  for (const [folder, size, gray] of [['mobile', 512, false], ['steam/earned', 256, false], ['steam/unearned', 256, true]]) {
    const svg = gray ? source.replaceAll('#C9A5F5', '#777777') : source
    await fs.mkdir(path.join(root, folder), { recursive: true })
    await sharp(Buffer.from(svg), { density: 288 }).resize(size, size).png()
      .toFile(path.join(root, folder, file.replace('.svg', '.png')))
  }
}
