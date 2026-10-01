# Manual Labour augments

Follow [the artwork workflow](../../../docs/skill-icon-artwork.md).
The conveyor and rounded blocks reuse the proportions of the original Manual
Labour master. Hand Assembly uses the original Bots navigation silhouette;
Working Smarter uses the Science Boost graph; Patient Hands uses the Staying
Power stopwatch. The latter three were traced from the alpha channels of the
2084×2084 Unity masters at `cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`.
The graph excludes the arrows. Even-odd fills preserve transparent cutouts.

Editable SVGs use a 256-unit canvas. Export with the repository's Sharp:

```js
await sharp(sourceSvg, { density: 288 }).resize(256, 256)
  .webp({ lossless: true }).toFile(runtimeWebp)
```

Runtime files are in `src/ui/assets/skill-icons/`, with matching names.
