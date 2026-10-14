# Approved Forager resource icons

These editable SVGs preserve the nine designs Matthew approved in
`Forager-Icons-Review-Grid.png` (Library `libfile_5496ce53ddf88191ba6f57d92f6b3c55`,
version 0). The board was inspected and traced from its original readable cloud
bytes, removing labels and the purple background while retaining white silhouettes
and transparent cutouts. Asset transfer commit:
`cba8e67661dea1773891aa5ca82878663a01dae7`.

The approved designs are grain plus fish, sticks plus rocks, wooden mallet, pelt,
sleeveless tunic, sack, tent, campfire and person. `foragerWorker` maps to runtime
key `worker`. Catalyst continues to use the existing currency asset.

See [the artwork workflow](../../../docs/skill-icon-artwork.md). Runtime assets
are 256×256 transparent lossless WebP. Supersampling smooths exported curves;
it adds no source detail.

Regenerate from the repository root:

```sh
node --input-type=module - <<'JS'
import { readdir } from 'node:fs/promises'
import sharp from 'sharp'
for (const file of await readdir('source-assets/skill-icons/forager')) {
  if (!file.endsWith('.svg')) continue
  await sharp('source-assets/skill-icons/forager/' + file, { density: 288 })
    .resize(256, 256).webp({ lossless: true })
    .toFile('src/ui/assets/skill-icons/' + file.replace('.svg', '.webp'))
}
JS
```

## Game / Leather selection — 14 October 2026

Matthew selected the left-facing full-body deer (concept E) for Game after reviewing it in the running game.
`foragerGame.svg` traces the selected 1280px generated master, smoothing alpha
noise and removing small disconnected artifacts while retaining its silhouette.
Game uses the historical `hides` save key; Leather uses `clothing` and the existing
`foragerHides` stretched-hide artwork. The tunic is no longer used for Leather.

## Leadership — 14 October 2026

Selected user-provided option 2: a person with a star badge. Preserved as
`foragerChieftain.png` (original 512px transparent black silhouette).
`foragerChieftain.svg` traces the original alpha with potrace (threshold 128,
optTolerance 0.2, turdSize 2) using white fill. Export follows the command above.
The historical Chieftain asset name remains; the visible upgrade is Leadership.
