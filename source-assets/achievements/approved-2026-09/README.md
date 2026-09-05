# Approved achievement artwork

Matthew approved these 27 designs on 5 September 2026. All 54 Steam earned and
unearned images were uploaded and published successfully that day. Publication
evidence is summarized in `steam/publication.json`.

`masters/` contains self-contained SVG sources on a 512-unit canvas. Some reuse
embedded raster silhouettes from the game's existing artwork; these are not all
pure vector illustrations. `manifest.json` describes each design's provenance.
File names retain the Steam achievement IDs for traceability, not as mobile
provider IDs. Preserve existing Apple and Google IDs when mapping these designs.

Foreground: `#C9A5F5` earned, `#777777` unearned. Background: `#10101A`.
`steam/` contains the exact opaque 256px PNG files submitted to Steamworks.
`sha256.json` records hashes of the preserved masters, PNGs and metadata.

These are authoring assets, outside runtime bundles. Mobile exports and their
platform-specific crop checks will be added during the mobile achievement work.
The original Unity artwork remains separately preserved in `../legacy-unity/`.
