# Skill and augment artwork

Use this workflow when creating or changing skill icons, augment icons, or related
game symbols. The SRS augment revision was accepted after reusing the original
artwork, simplifying the compositions, and preserving rounded corners.

## Find and inspect the masters first

Runtime icons in `src/ui/assets/skill-icons/` are 256×256 WebP exports. They are useful
for checking the game, but should not be the source for a redraw or trace.

The original **2084×2084 transparent PNGs** are preserved in the Unity archive at
commit `cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`, under
`Assets/Sprites/SkillIcons/`. Recover specific files without changing the checkout:

```sh
mkdir -p /tmp/ids-icon-masters
git show 'cc21ca0ee632ac950a69ba14842b3fd7b5f7976c:Assets/Sprites/SkillIcons/icons_Science Boost.png' > '/tmp/ids-icon-masters/Science Boost.png'
```

Use `git ls-tree -r --name-only` on that commit to find other masters. Check current
`source-assets/` too: an existing editable SVG is preferable to retracing a PNG.
Inspect several relevant originals against a dark background before drawing.

## Reuse the visual vocabulary

- Research skills use the connected-dot graph from `icons_Science Boost.png`.
  Preserve its node proportions and connecting line; do not replace it with a flask.
- Timers use the rounded stopwatch from `icons_Staying Power.png`.
- The bolt in `icons_Supercharged Power.png` and arrows in
  `icons_Repeatable Research.png` already have the intended rounded corners.
- SRS uses the simple, varied-size circles in `icons_Super Radiant Scattering.png`.

Keep one clear idea per icon. Use flat white shapes, transparent cutouts, rounded
corners and ends, and generous separation between details. Existing icons combine
symbols, but their spacing is deliberate. Avoid overlapping decorative layers,
extra sparkles, thin outline glyphs, hard polygon corners, and invented pixel art.
Match the originals' optical size and weight as well as their subject matter.

## Make an editable vector

For SRS, shapes were traced from the original PNG **alpha channel**, then composed
in a 256-unit SVG canvas. This preserves the original curves rather than guessing
their proportions. No tracing package is needed in the game's dependencies.

If a new trace is needed, the one-off process used `potrace@2.1.8` in a temporary
directory, alongside the repository's existing `sharp` dependency:

```sh
npm install --prefix /tmp/ids-art-tracing --no-audit --no-fund --ignore-scripts potrace@2.1.8
node --input-type=module - <<'JS'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const require = createRequire(import.meta.url)
const { trace } = require('/tmp/ids-art-tracing/node_modules/potrace')
const bitmap = await sharp('/tmp/ids-icon-masters/Science Boost.png')
  // This crop isolates the graph and excludes the three arrows below it.
  .extract({ left: 0, top: 0, width: 2084, height: 1200 })
  .extractChannel('alpha').negate().png().toBuffer()
const svg = await new Promise((resolve, reject) => trace(bitmap, {
  color: 'white', threshold: 128, optTolerance: 0.4, turdSize: 8,
}, (error, result) => error ? reject(error) : resolve(result)))
await writeFile('/tmp/ids-icon-masters/research-graph.svg', svg)
JS
```

Inspect the trace before using it. Keep its real path geometry and scale it into
the new canvas; approximately `256 / 2084` maps the original canvas to 256 units.
Isolate only the desired components. For example, the stopwatch's outer silhouette
was retained while its hands were replaced with a bolt or infinity cutout. Masks
or even-odd paths keep cutouts transparent. Do not embed a thumbnail in an SVG.

Store final editable SVGs under `source-assets/skill-icons/`. The SRS masters and
their exact source references are in [the SRS directory](../source-assets/skill-icons/srs/README.md).
Keep experiments, contact sheets, tracing tools, and rejected drafts outside the repo.

## Export and inspect the result

Render SVGs with `sharp` at density **288**, resize to **256×256**, then export
lossless WebP with alpha. This supersamples the curves before downsampling.
The SRS README contains the regeneration command. Keep the existing runtime asset
names so the game uses the new exports without extra presentation code.

Compare the new set with the originals on a dark background, both enlarged and
at roughly 32–64 pixels. Check clean separation, consistent weight, and readable
cutouts. Then inspect the actual tree and skill details in the local game; reload
if asset caching still shows an earlier export. Automated tests cannot establish
that the artwork matches the intended style.

For an artwork-only revision, verifying the SVG exports, transparency, dimensions,
and in-game rendering is sufficient; do not add tests that only mirror asset names.
