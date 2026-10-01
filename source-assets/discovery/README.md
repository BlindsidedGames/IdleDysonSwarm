# Discovery tier icons

White silhouettes on transparent 256-unit SVG canvases, tinted by the interface.
Runtime exports trim transparent margins and preserve aspect ratio. Bar icons
align to the right of their shared column so the three silhouettes finish evenly.
See `docs/skill-icon-artwork.md` for the artwork rules.

Original 2084px masters from archived Unity commit
`cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`, `Assets/Sprites/SkillIcons/`:

- **Discovery:** conveyor traced from `icons_Assembly Megalines.png`, with a
  simplified rising arrangement of rounded production blocks.
- **Elevation:** Bot and dollar shapes from `icons_Economic Revolution.png`,
  separated into a compact pair for Cash and Bot output.
- **Enlightenment:** panel from `icons_20s Panel Lifetime.png` (sun removed),
  paired with the timer from `icons_Staying Power.png` for panel lifetime.

Traces use original alpha-channel geometry. No embedded bitmaps or hardcoded
interface colours. Compositions were inspected at 180px, 48px and 24px, then in
bars, detail headings and purchase cards.

Regenerate from the repository root:

```sh
node --input-type=module - <<'JS'
import sharp from 'sharp'
for (const name of ['discovery', 'elevation', 'enlightenment']) {
  await sharp(`source-assets/discovery/${name}.svg`, { density: 288 })
    .trim().resize({ width: 256, height: 256, fit: 'inside' })
    .webp({ lossless: true })
    .toFile(`src/ui/assets/discovery/${name}.webp`)
}
JS
```
