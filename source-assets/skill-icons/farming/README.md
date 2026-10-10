# Farming Villages symbols

Original editable vector artwork for the approved playable Farming candidate: Fields, Woodlot, Homes, Granary, Pasture, Kiln, Waterworks, Hall and Goods. Flat white substantial silhouettes use transparent cutouts and separated forms. These are new symbols, not replacements for the exact approved Forager designs. Food, Materials, Tools and Worker reuse the Forager runtime assets; Catalyst remains unchanged. Workshop uses Tools. Hall's established shipment recipe returns Materials plus a trade connection, explained in its full-row details.

See [the artwork workflow](../../../docs/skill-icon-artwork.md) and [the prototype](../../../docs/plans/farming-villages-prototype-2026-10-09.md). Runtime exports are transparent 256px lossless WebP. Supersampling smooths curves without adding source detail. Review includes 16–24px and 32–64px silhouettes plus actual default-scale game UI.

Regenerate from the repository root:

```sh
node --input-type=module - <<'JS'
import { readdir } from 'node:fs/promises'
import sharp from 'sharp'
for (const file of await readdir('source-assets/skill-icons/farming')) {
  if (!file.endsWith('.svg')) continue
  await sharp(`source-assets/skill-icons/farming/${file}`, { density: 288 })
    .resize(256, 256).webp({ lossless: true })
    .toFile(`src/ui/assets/skill-icons/${file.replace('.svg', '.webp')}`)
}
JS
```
