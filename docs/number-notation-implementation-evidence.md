# Device-local number notation implementation evidence

## Decision and boundaries

Idle Dyson Swarm exposes one Settings select with Mixed, Standard, Scientific,
and Engineering modes. `src/ui/i18n/formatters.ts` remains the only game-number
formatter family; notation selects an output policy without changing canonical
values, commands, saves, active-time delivery, or the configured gameplay
update cadence.

The preference is validated version-1 state under
`idle-dyson-swarm.number-notation.v1`. It is read once when the presentation
root is created and written only after an explicit selection. Missing, corrupt,
future-version, and unknown values fall back to Mixed. Existing valid stored
choices remain unchanged; changing the fallback does not rewrite them. The
React context is stable between explicit preference changes, so ordinary
snapshot publication does not churn it.

Portable `IDSWEB1` exports remove the legacy `numberFormatting` graph field.
Manual/shared imports cannot write the device preference. After—and only
after—a successful verified automatic same-device Unity migration commit, a
device with no established preference may adopt Unity values 0, 1, or 2 once.
Adoption reads only an explicitly present numeric field from the raw decoded
Unity graph before schema normalization; migration-generated defaults cannot
establish device intent.
The candidate must carry `automatic-same-device-unity` provenance and its
opaque native identity must match both the repository candidate ID and the
`unity-readonly:<identity>` bridge path. Browser-retained, manual/recovery,
unprovenanced, or identity/path-mismatched candidates cannot adopt notation.
Existing device state wins, invalid legacy values are ignored, and failed
migrations do not write presentation state. Notation adoption and purchase
evidence promotion share the same trust predicate.

## Formatting contract

- Mixed is the default. It retains Standard suffix presentation below `1e21`,
  covering `1.00Qi` through `999Qi`, then uses normalized Scientific notation
  at `1.00e21` and above. The boundary is sign-symmetric and applies equally to
  `number`, `bigint`, and energy presentation.
- Standard retains the existing suffix table and three-significant-digit
  truncation, including fallback exponent output after the suffix table.
- Scientific and Engineering retain Standard presentation at absolute values
  up to and including 1000, matching Unity's strict `absX > 1000` threshold.
- Scientific uses a normalized exponent; Engineering uses an exponent
  divisible by three. Both use the Web formatter's truncation rather than
  Unity/C# format-string rounding. This is the deliberate Web correction: a
  preference switch must not change the established no-round-up affordability
  presentation contract.
- `bigint` exponent and mantissa extraction is string-based and never coerces
  arbitrarily large values through `number`. Non-finite `number` values retain
  the stable em-dash fallback.
- Energy follows the selected magnitude notation while preserving semantics:
  Standard uses the existing SI/game W or J prefixes; Scientific and
  Engineering show the exponent magnitude followed by base `W` or `J`. Exactly
  1000 retains `1.00 KW`/`1.00 KJ` under every mode.

## Shared numeric presentation and font evidence

`game-number-presentation` is the single gameplay-shell numeric style. It sets
`font-variant-numeric: tabular-nums` plus the `"tnum"` feature fallback and
does not set a width or minimum width. Suffix transitions such as `999` to
`1.00K` therefore remain free to change width.

Local HarfBuzz shaping showed the bundled Lexend Regular, SemiBold, and Bold
files do not substitute tabular figures: Regular digit advances ranged from
500 to 620 font units even with `tnum`. Three deterministic digit-only derived
faces now retain the corresponding Lexend outlines and weights while centring
each outline within a compact reviewed digit cell for that weight. Their
Regular/SemiBold/Bold digit advances are 568/606/626 units respectively. Each
cell remains wider than the face's widest digit outline, preserving visible
side-bearing clearance without the excessive gaps produced by using the widest
original proportional advance.

`unicode-range: U+0030-0039` limits those faces to digits. Decimal separators,
signs, suffixes, units, and all prose therefore continue through the original
proportional Lexend faces. HarfBuzz shapes `111.11` and `888.88` with identical
digit advances while the decimal point remains a separate proportional Lexend
glyph in the browser. The derived files bundle the same result on Web,
Android WebView, iOS WebKit, Electron, and Windows rather than depending on
platform-installed Helvetica Neue, Roboto, or Noto Sans.

### Deterministic font reproduction

The generator is `scripts/generate_lexend_tabular_digits.py`. It requires
FontTools 4.59.1, verifies SHA-256 hashes for all three source faces, preserves
hinting and exact glyph-outline bytes, removes every non-digit codepoint, and
fails if an outline changes. It uses the source font timestamp and deterministic
table serialization. Reproduce and byte-check the committed assets with:

```sh
python3 -m pip install --target /tmp/ids-font-tools fonttools==4.59.1
PYTHONPATH=/tmp/ids-font-tools python3 scripts/generate_lexend_tabular_digits.py
PYTHONPATH=/tmp/ids-font-tools python3 scripts/generate_lexend_tabular_digits.py --check
```

The derived SHA-256 values are:

- Regular: `191779a2b443a63036bd9a3115726392a4ab34ca879373f98bda5d6df6d581ba`
- SemiBold: `10f268a658bcf9d2853e7a11bf5f29f54bdb0e5f934966bce5f89f7d0421ac3f`
- Bold: `b3a5c58deae99cfddb48bf526f269a9a69c5540329cdb237bc5874587821cc85`

The source and derivatives remain under the included Lexend SIL Open Font
License 1.1 (`src/ui/assets/OFL-Lexend.txt`).

### Live browser loading correction

The first derived-face integration used a `?no-inline` CSS URL suffix. Although
that emitted font files in the production build, Vite did not rewrite those
URLs while serving the game at the development `/play/` base path. Chromium
requested `/assets/IDS-LexendTabularDigits-*.ttf`, received 404 responses, and
silently painted every glyph with proportional Lexend. A computed family stack
and `document.fonts.check()` alone did not expose that fallback.

The CSS now uses ordinary relative asset URLs so Vite rewrites development
requests beneath `/play/src/ui/assets/`. The production `assetsInlineLimit`
callback independently keeps all three tiny derived faces as emitted files.
`npm run verify:number-typography:browser` starts an isolated development
server and Chromium at 390 by 844 CSS pixels, inherits the actual resource
header font stack, and compares real DOM bounding boxes for different
equal-length digit strings at weights 400, 600, and 700. It also rejects font
face load errors. Production packaging coverage asserts that exactly three
derived TTF assets are emitted.

## Player-facing surface audit

The selected shared formatter is used by the reusable resource header and
facility cards/details, then by Bots/Tinker, Research, Skills, Infinity,
Reality, Simulations, Quantum, Avocato, Statistics, Offline Time, Settings
import previews, and Debug. Story, Wiki, and Store do not expose scalable game
economy magnitudes except for the fixed progress/currency cases below.

The repository audit command is:

```sh
rg -n "formatNumber\(|toFixed\(|toLocaleString\(|toExponential\(|String\(" src/ui/gameplay src/ui/components
```

Intentional exceptions:

| Presentation | Reason |
| --- | --- |
| Percentages and normalized progress copy | These are bounded semantic ratios, not economy magnitudes. They retain locale-aware percent precision. Native progress elements keep canonical min/max/current values. |
| Durations and interval labels | Time uses `formatGameDuration` or explicit unit precision so notation cannot turn a duration into an ambiguous economy value. |
| Universe designations | These are ordinal identity labels, not quantities. |
| Fixed purchase/control choices, fragment deltas, and secret/research step counts | Values such as +1, 1/10/50/100, slider positions, reveal counts, and sequence indices are control vocabulary; abbreviation would reduce clarity. |
| Store prices | Host/store currency formatting remains authoritative and is not a game-economy notation. |
| Input drafts, `data` machine values, and progress semantics | Canonical raw values are required for editing, command parsing, HTML machine values, and accessibility APIs. They are not visible abbreviated copy. |
| Full-precision accessibility/title text | Existing resource, facility, skill, and purchase contracts deliberately retain unabridged localized values alongside the selected visual abbreviation. |

Raw `String(...)` occurrences in the audited components are confined to the
machine/accessibility cases above. Direct `toFixed`, `toLocaleString`, and
player-surface `toExponential` formatting are absent; exponent creation remains
inside the shared formatter.

## Validation record

Automated coverage includes all four notation modes, the Mixed `1e21` boundary,
zero, negatives, exact 1000 and suffix boundaries, values beyond the suffix
table, huge positive and
negative `bigint`, non-finite fallbacks, W/J semantics, storage corruption and
version fallback, reload, trusted automatic migration success/failure,
browser-retained and identity/path mismatch rejection, portable-export
isolation, Settings accessible naming and keyboard selection, full-precision
resource text, shared style/no-fixed-width assertions, and the existing test
coverage for every top-level route and shared numeric component. The
browser-level typography regression additionally covers `111.11` versus
`888.88`, `853T` versus `854T`, and `$90.0T` versus `$90.1T` at every bundled
weight; it intentionally does not compare suffix transitions.

Before the live loading correction, the 5199 development build measured
`111`/`888` at 65.046875/71.046875 px, `853T`/`854T` at
95.203125/98.28125 px, and `$90.0T`/`$90.1T` at
135.328125/130.890625 px. After the correction, controlled DOM spans
inheriting the actual live resource-header style measure `111` and `888` at
78.375 px, `853T` and `854T` at 103.5625 px, and `$90.0T` and `$90.1T` at
138.6875 px. Chromium painted-font inspection attributes digit glyphs to
`IDSLexendTabularDigits-SemiBold` while suffixes and punctuation remain on
proportional Lexend, with no font-request 404s.

The implementation checkpoint now passes 188 Vitest files / 1,805 tests, ESLint,
the TypeScript project build, localization catalog verification, production
Web and native Vite builds, Electron syntax checks, Android and iOS Capacitor
syncs, and `git diff --check`. A Chromium mobile-width pass at 390 by 844 CSS
pixels found no horizontal overflow in the resource header, facility cards, or
the eight visible research cards. The Settings select changed existing labels
immediately and retained its selection after reload at the isolated test
origin. A follow-up pass against the running game at 390 by 844 compared the
bundled derived faces in Standard, Scientific, and Engineering: the three-item
resource header, five dense facility cards, action columns, footer facts, and
bottom navigation remained within the viewport in every mode. The original
Standard selection was restored after the comparison.

Manual release review still required on physical iOS and Android devices:

- confirm the installed native WebViews load the bundled derived faces and
  preserve equal-width digits at every shipped font weight;
- inspect mobile resource headers and dense facility/research rows in all three
  modes, including legitimate suffix transitions and large exponents;
- exercise the native select with touch and external/switch keyboard input.
