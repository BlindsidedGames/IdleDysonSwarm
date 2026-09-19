# SRS augment icons

See the [icon artwork workflow](../../../docs/skill-icon-artwork.md) for finding
the original masters, tracing their shapes, and checking style and rendering.

Editable SVG masters on a 256-unit canvas, exported as transparent 256×256 lossless
WebP files in `src/ui/assets/skill-icons/`. Render above target size before downsampling
so curves and rounded corners stay smooth.

The research graph, stopwatch, lightning bolt, and return arrow were traced from
original **2084×2084 PNG masters**, not the runtime WebPs. Sources are in archived
Unity commit `cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`, under
`Assets/Sprites/SkillIcons/`:

- `icons_Science Boost.png`: graph used by both research augments.
- `icons_Staying Power.png`: stopwatch body and clock hands.
- `icons_Supercharged Power.png`: rounded lightning bolt.
- `icons_Repeatable Research.png`: return arrow used by Afterglow.

Focused Beam uses three small particles converging into one large particle, with
rounded connections matching the research graph's visual style.

Keep these shapes consistent with the existing art. New details use rounded ends,
clear negative space, and a single white silhouette; avoid extra decorative layers.

Regenerate from the repository root:

```sh
node --input-type=module - <<'JS'
import { readdir } from 'node:fs/promises'
import sharp from 'sharp'
for (const file of await readdir('source-assets/skill-icons/srs')) {
  if (!file.endsWith('.svg')) continue
  await sharp('source-assets/skill-icons/srs/' + file, { density: 288 }).resize(256, 256).webp({ lossless: true })
    .toFile('src/ui/assets/skill-icons/' + file.replace('.svg', '.webp'))
}
JS
```
