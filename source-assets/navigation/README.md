# Discovery prototype navigation artwork

Follow [the artwork workflow](../../docs/skill-icon-artwork.md). These are flat,
white, transparent masters; the app applies the route/theme tint.

- Discovery now reuses `src/ui/assets/nav-research.png`, the existing high-resolution
  magnifying-glass navigation master. `navigationAssets.discovery` aliases Research;
  there is no duplicated bitmap or redraw. The earlier `discovery.svg` and exported
  node-graph asset remain as prototype drafts pending final artwork selection.
- `transcendence.svg` is the current figure-and-halo concept based on Matthew's
  supplied references: a simple ascending figure, open halo and two curved layers.
  Flat white shapes and rounded endpoints match the existing navigation vocabulary.
  The same artwork is used for the tab and the Transcendence Points balance.
  It was compared with Research, Infinity and Quantum at 128px, 40px and 20px,
  then inspected in the running game. This concept is awaiting Matthew's review.

Export from the repository root using the existing Sharp dependency:

```sh
node --input-type=module <<'JS'
import sharp from 'sharp'
for (const name of ['transcendence']) {
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
