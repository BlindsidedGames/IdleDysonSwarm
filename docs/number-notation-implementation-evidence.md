# Device-local number notation implementation evidence

## Decision and boundaries

Idle Dyson Swarm exposes one Settings select with Standard, Scientific, and
Engineering modes. `src/ui/i18n/formatters.ts` remains the only game-number
formatter family; notation selects an output policy without changing canonical
values, commands, saves, active-time delivery, or the 10 Hz simulation.

The preference is validated version-1 state under
`idle-dyson-swarm.number-notation.v1`. It is read once when the presentation
root is created and written only after an explicit selection. Missing, corrupt,
future-version, and unknown values fall back to Standard. The React context is
stable between explicit preference changes, so ordinary snapshot publication
does not churn it.

Portable `IDSWEB1` exports remove the legacy `numberFormatting` graph field.
Manual/shared imports cannot write the device preference. After—and only
after—a successful automatic same-device Unity migration commit, a device with
no established preference may adopt Unity values 0, 1, or 2 once. Existing
device state wins, invalid legacy values are ignored, and failed migrations do
not write presentation state.

## Formatting contract

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
files do not substitute tabular figures: for example Regular shaped `1` at 500
font units and `8` at 579 even with `tnum`. The narrowly scoped
`IDS Tabular Digits` face therefore selects Helvetica Neue on Apple/Chromium
and Roboto on Android WebView through `unicode-range: U+0030-0039`. Only digits
use that face. Decimal separators, signs, suffixes, units, and all prose fall
through to Lexend. Local Helvetica Neue shaped every digit at 556 units while
the decimal remained 278 units, so `111.11` and `888.88` have equal width
without making punctuation monospaced.

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

Automated coverage includes all three notation modes, zero, negatives, exact
1000 and suffix boundaries, values beyond the suffix table, huge positive and
negative `bigint`, non-finite fallbacks, W/J semantics, storage corruption and
version fallback, reload, automatic migration success/failure, portable-export
isolation, Settings accessible naming and keyboard selection, full-precision
resource text, shared style/no-fixed-width assertions, and the existing test
coverage for every top-level route and shared numeric component.

The implementation checkpoint passed 188 Vitest files / 1,798 tests, ESLint,
the TypeScript project build, localization catalog verification, production
Web and native Vite builds, Electron syntax checks, Android and iOS Capacitor
syncs, and `git diff --check`. A Chromium mobile-width pass at 390 by 844 CSS
pixels found no horizontal overflow in the resource header, facility cards, or
the eight visible research cards. The Settings select changed existing labels
immediately and retained its selection after reload at the isolated test
origin.

Manual release review still required on physical iOS and Android devices:

- confirm the installed native WebViews resolve the expected digit-only local
  fallback and preserve equal-width digits at every shipped font weight;
- inspect mobile resource headers and dense facility/research rows in all three
  modes, including legitimate suffix transitions and large exponents;
- exercise the native select with touch and external/switch keyboard input.
