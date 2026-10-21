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

## Burials - 21 October 2026

Matthew requested a small skull for the burial counter. `farmingBurials.svg` is an original flat white skull with transparent eye, nose and tooth cutouts, following the existing Forager/Farming silhouette vocabulary. No existing skull master was present in the repository or archived sprite names. Runtime export uses the command above. Candidate artwork awaits visual review in the running village.


## Jobs proposal - 21 October 2026

`farmingJobs.svg` combines a hoe with the exact approved mallet path from `../forager/foragerTools.svg`. The mallet geometry is reused rather than redrawn; a transparent cutout separates the crossed handles at small sizes. It is a candidate for the enabled jobs / capacity indicator, shown in the live preview for Matthew to review. Housing continues using Homes, and the Tools resource keeps the single mallet. This composition is not yet an approved shared icon convention. Export uses the command above.

Matthew subsequently requested a localized Jobs label trial in place of this candidate icon. The active facility count uses the label; the vector remains available as the earlier proposal.
