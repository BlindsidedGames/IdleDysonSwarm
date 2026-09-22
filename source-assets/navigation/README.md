# Discovery prototype navigation artwork

Follow [the artwork workflow](../../docs/skill-icon-artwork.md). These are flat,
white, transparent masters; the app applies the route/theme tint.

- `discovery.svg` reuses the connected-node research path preserved in
  `source-assets/skill-icons/srs/srsResearchActivity.svg`, traced from the original
  2084px Science Boost master. It does not trace a runtime thumbnail.
- `transcendence.svg` uses a compact core and four outward, rounded arms. Its
  negative space and stroke weight were compared with the existing Research and
  Quantum navigation masters and inspected in the running game.

Export from the repository root using the existing Sharp dependency:

```sh
node --input-type=module <<'JS'
import sharp from 'sharp'
for (const name of ['discovery', 'transcendence']) {
  await sharp(`source-assets/navigation/${name}.svg`, { density: 600 })
    .resize(2084, 2084).png()
    .toFile(`src/ui/assets/nav-${name}.png`)
}
JS
```

Keep the SVGs editable. Runtime assets retain the existing 2084px navigation
pipeline and use `InlineImageSymbol` theme tinting. Do not flatten a background or
add icon-specific colours. Actual desktop/narrow and packaged-app evidence is
recorded in `docs/plans/discovery-prototype.md`.
