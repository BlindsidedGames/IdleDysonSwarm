# Preserved source assets

These are Web-owned masters and platform reference assets. They are not copied
into the shipped browser bundle unless a build step explicitly consumes them.

- `audio/IDS-master.wav` is the lossless soundtrack master, SHA-256
  `2ab4636ee5970a729ece6106dfbb8b8252ae44a8b1fa89a780f224b4e4296602`.
- `branding/unity-app-icon.png` is the 1024x1024 application icon assigned to
  the archived Unity iOS and Android builds. It is the canonical source for
  current Web, mobile, and desktop launcher icons, SHA-256
  `47064cffd68541f3e75560352ba6333d7cf849279e7213fb8806a155d3eccfcd`.
- `achievements/legacy-unity/` preserves 27 unique achievement PNG masters and
  one copy of the historical achievement notes. The SHA-256 of its sorted
  `shasum`-style PNG manifest is
  `94db716f62d992c4f60e369f80547a62fc302bbbb2148dacb3aa76aa03981b4a`.
- `platform/steam/steam-icon.png` is the preserved Steam platform icon master.
  Its SHA-256 is
  `a391b690a3ab357e609d38b96d1e4eb01ac33f435536acaeb5993ae2809af317`.

Their provenance is the unreleased Unity development snapshot archived at
`archive/unity-development-handoff-2026-08-21` /
`unity-dev-handoff-2026-08-21`, commit
`cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`. They are not evidence that a
platform dashboard is configured or that a feature is live.
