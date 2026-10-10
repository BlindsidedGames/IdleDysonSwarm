# UI design-system audit appendix — 8 October 2026

This is implementation evidence, **not a menu of design choices**. The
[normative style guide](../ui-style-guide.md) decides which pattern new work uses.
Its four references are Bots, Research, Infinity and the Skill tree;
Transcendence has a separate protected standard. This inventory was initially
recorded at `41cecf64`; subsequent read-only history and skill-tree findings
below clarify authority without changing application code.

## Deviation classification and history

| Item | Classification | Consequence |
| --- | --- | --- |
| Bots compact facility density and Research aligned cards/docks | Intentional named variant: Dense gameplay | Default for ordinary new gameplay; reproduce roles, not a nearby font size |
| Infinity bottom summary/settings track | Intentional named variant: Persistent progress dock | Use for always-visible progress/status plus upward configuration |
| Skill canvas, authored coordinates, 76px nodes and zoom | Intentional named variant: Spatial skill tree | Preserve spatial behavior; not ordinary row/icon sizing |
| Transcendence Discovery main/supporting inset bars | Intentional named specialist standard | Preserve on Transcendence; do not normalize to Bots or export to ordinary rows |
| Statistics local heading sizes and varied old route breakpoints | Historical grandfathered usage | Existing content may retain it; not permission to copy into new UI |
| Infinity shop .8rem titles vs Bots/Research .9rem titles | Historical grandfathered usage | Preserve existing screen in a documentation task; new ordinary cards use the Bots role |
| Generic .75rem Progress and original Simulation .36rem fast/medium tracks | Historical/specialized existing usage | Retain callers; not equal alternatives to the ordinary cycle or Infinity status variants |
| Foundation reference colour table and variable Lexend wording | Stale documentation | Current runtime tokens and shipped static faces govern; no product colour/font change |
| Rem targets at 80% root and zoomed canvas targets | Open gap | Measure physical target bounds and resolve within an authorized interaction task; no accessibility pass inferred from tokens |
| Isolated Forager 1.1em icons/.15em gutters, cost-only header timer, paid checkmarks and Waiting | Prototype deviation / open correction | Not approved references; follow the current Simulations specification |
| New touch icon popover or recipe-with-right-timer shared component | Open gap needing a scoped decision | Reuse existing disclosure for learning; record justified missing composition without inventing approval |

The original [August 28 plan](../app-wide-visual-consistency-plan-2026-08-28.md)
names Bots facility panels as the ordinary density/visual-weight reference.
Traced commits: `d5cca2b1` unified gameplay docks; `77751d89` standardized semantic
roles and app density; `e23d3b88` aligned Bots/Research production docks;
`fb92966f` unified currency presentation. Compare main `bdd95551` with prototype
`5c1dfb21`: shared tokens, facilities, Research, shell, amount/icon components,
dock CSS and desktop scale handling are unchanged. Infinity adds upgrade-group
headings/content, without changing its established size rules. Thus this branch
is not evidence that the original screens' core sizing recently drifted.
Palette prose dates to July and differs from July runtime values; static Lexend
was already implemented in July, with unchanged fonts packaged as WOFF2 in
`817336ab`. The older prose is not competing product authority.

## Fourth reference: verified Skill tree source

[SkillsSurface.tsx](../../src/ui/gameplay/skills/SkillsSurface.tsx), lines 214–221:
76px node size, 180-unit graph padding, camera scale .4–2.5 desktop or .4–1.5
mobile, default .8, drag threshold 6px and double activation interval 360ms.
[skillPresentation.ts](../../src/ui/gameplay/skills/skillPresentation.ts), lines
37–60, retains authored coordinates with 180-unit column spacing and explicit
web-owned adjustments. These are graph units, not app-wide spacing tokens.
[skills.css](../../src/ui/gameplay/skills/skills.css), lines 289–313, defines
76px square nodes, 7px padding, 3px border, contained artwork and spatial
translation. Node size is CSS px; camera transform scales the visual node.
It does not follow the ordinary rem/text multiplier in the same way.

SkillsSurface lines 1166–1305 distinguish drag/pinch from activation and suppress
accidental activation after dragging; lines 1474–1559 render labelled native
buttons with ownership/cost/unavailable state, selection and default detail
activation. Optional double-activation assignment is a player preference, not
permission to remove single-selection learning. The selected node opens existing
SkillDetailsDialog; keyboard button activation remains available. Inspect the
actual preference state before claiming a particular activation flow.

DesktopTooltips.tsx lines 12–45 enables hover only for fine mouse pointers on
desktop; mobile node understanding comes from the ordinary detail route.
[desktopTooltips.css](../../src/ui/components/desktopTooltips.css), lines 1–35:
body role with 1.4 line height; 700 title, 400 description, .85em formula footer;
SP and potential augment symbols at 1.05em. Skills currency header's 1.6rem
symbol and mask compensation are specialist optical rules (skills.css
1436–1448), not inline recipe defaults. Some small preset controls and minimum
camera scale leave target-size questions; this source audit does not certify
physical touch accessibility at every camera position. No new skill-tree
screenshots or native tests were taken in this documentation revision.

## Detailed implementation inventory

## Audit status and authority — 8 October 2026

This is the canonical repository guide. The numerical audit below is grounded in
source at `41cecf64`; this documentation pass changes no application code. A
Library copy is a review export, not a second editable source.

Use these labels when making a decision:

- **Verified implementation:** a shared token, component or established screen
  inspected in source. Existing code alone does not establish user approval.
- **Explicit requirement:** the user's stated direction or the product foundation
  contract. An implementation that contradicts it remains a gap.
- **Proposed exception:** a genuinely missing pattern or deliberate deviation,
  with its rationale and approval status recorded before claiming acceptance.

The Forager surface in `41cecf64` is a **prototype, not an accepted visual
reference**. Follow the separate [current Simulations specification](../plans/simulations-current-specification-2026-10-08.md)
for that screen. Historical delivery notes are evidence of earlier work, not
approval of its present appearance. Infinity, Statistics and established
Simulation/Discovery patterns are the references for their respective roles.

## Actual size and scale matrix

The table uses a **16px root as its calculation basis**, with default
`--game-text-scale: 1`. Pixels are illustrative CSS values, not hardcoded design
values. Respect browser font preferences; use the tokens in implementation.

| Semantic role / token | rem coefficient | Desktop Interface size 80% | 100% | 130% | 150% | Text multiplier 130%, root 100% | Text multiplier 200%, root 100% |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Metadata `--ui-text-meta` | .72 | 9.22 | 11.52 | 14.98 | 17.28 | 14.98 | 23.04 |
| Body `--ui-text-body` | .82 | 10.50 | 13.12 | 17.06 | 19.68 | 17.06 | 26.24 |
| Control `--ui-text-control` | .84 | 10.75 | 13.44 | 17.47 | 20.16 | 17.47 | 26.88 |
| Card title `--ui-text-card-title` | .90 | 11.52 | 14.40 | 18.72 | 21.60 | 18.72 | 28.80 |
| Section title `--ui-text-section-title` | 1.05 | 13.44 | 16.80 | 21.84 | 25.20 | 21.84 | 33.60 |
| Page title `--ui-text-page-title` | 1.25 | 16.00 | 20.00 | 26.00 | 30.00 | 26.00 | 40.00 |

Source: [tokens.css](../../src/ui/tokens/tokens.css), lines 100–111 and 127–132.
These are semantic defaults, not a license to substitute a smaller role to make
content fit. Hierarchy comes from size **and weight**: ordinary copy 400;
controls/secondary emphasis 600; headings/primary values 700. `medium` and
`semibold` both map to 600. Lexend supplies actual 400/600/700 faces; digit-only
IDS Lexend derivatives supply stable numeric metrics. Latin text uses Lexend;
script-specific family fallbacks and locale line-height overrides are at lines
83–99 and 180–206. Compact line height is 1.25, body 1.5; Japanese/Arabic/Indic
body overrides use 1.65 and Chinese 1.6. Do not synthesize a new weight.

**Two scaling mechanisms, not one:** [desktopPresentation.ts](../../src/ui/desktopPresentation.ts),
lines 5–38, stores device-local desktop Interface size from .8 to 1.5. Its hook
sets the root font size to that percentage. Settings exposes .05 steps and a
Default reset ([SettingsSurface.tsx](../../src/ui/gameplay/settings/SettingsSurface.tsx),
lines 843–857). It is disabled for detected mobile/Capacitor hosts. Root scaling
changes rem-based typography, spacing, targets and bars; `em` icons follow their
surrounding font. The separate CSS text multiplier scales semantic text and
selected route-specific heights, but does **not** scale ordinary rem spacing or
44px target tokens. Default is 1; this audit found no separate player-facing
mobile text-scale setting. A 130% CSS QA override is not the desktop setting.
Browser zoom is a third, independent accessibility check. When both multipliers
apply, semantic text uses their product. The hook's startup application outside
Settings was not runtime-certified in this audit.

### Spacing, geometry and targets

| Role | Actual token / component value | At 16px root | Scale behavior / source |
| --- | --- | ---: | --- |
| Route inset | `--ui-route-inset` .5rem | 8px | Root scale; tokens 133 |
| Section stack | `--ui-section-stack-gap` .5rem | 8px | Root scale; 134 |
| Panel inset / divider inset | .6rem | 9.6px | Root scale; 135, 138 |
| Controls / related copy | .25rem | 4px | Root scale; 136–137 |
| Card gap | `--ui-card-gap` .4rem | 6.4px | Root scale; 144 |
| Dense card grid / content | .35rem / .45rem | 5.6 / 7.2px | Root scale; 119–120 |
| Inline icon–number gutter | .16em | Relative to text | components.css 146–150 |
| Minimum / preferred touch target tokens | 2.75rem / 3rem | 44 / 48px | Root scale; tokens 156–157; see target conflict below |
| Generic button | minimum width/height 2.75rem, padding .5rem vertical / 1rem horizontal | Minimum 44px | components.css 34–50; content can enlarge |
| Shared disclosure trigger | minimum height 2.75rem; padding .55rem / .7rem | Minimum 44px | collapsibleSection.css 9–26; full row target |
| Ordinary bottom summary | minimum 2.875rem; settings column 2.8rem | 46 / 44.8px | progressControlsPanel.css 9–15 |
| Bottom summary with above-summary content | minimum 4.15rem; content-driven rows | 66.4px minimum | Same file 18–30; not a fixed total height |
| Panel expanded body | max `min(58vh,30rem)`; padding .55rem / .7rem | Viewport-dependent | Same file 123–132; specific approved routes override |
| Borders / radius | panel 1px, shell 2px; control .25rem, panel .35rem | 1 / 2px; 4 / 5.6px | tokens 146–150; px borders do not follow root rem scale |

These values are not one universal fixed row height. Rows grow for content,
translation and enlargement. Keep one intentional separation per relationship;
do not compound margins, gap and padding. Reuse [Button](../../src/ui/components/Button.tsx),
[CollapsibleSection](../../src/ui/components/CollapsibleSection.tsx) and
[ProgressControlsPanel](../../src/ui/components/ProgressControlsPanel.tsx), with
route-specific classes from the closest accepted screen.

**Target conflict:** the foundation requires at least 44×44 CSS pixels, preferably
48×48 on touch. At an 80% root a 2.75rem token computes to **35.2px**. Reusing the
token alone therefore does not prove the contract at every Interface size.
Measure the actual interaction rectangle at each applicable setting; record
this gap and a scoped fix/approved exception when implementation is authorized.
Do not shrink a tap target to fit a readable icon. Decorative icon dimensions
are independent of the enclosing trigger's target.

### Icon, number and meaning standard

**Explicit requirement:** prefer compact iconography over repeated long resource
words, with readable icons at the app's size/scale. Hover must never be the only
way to identify an icon. `title`, `alt` and `aria-label` are useful supplements,
but a native title is not a dependable touch-learning interface and an accessible
name alone does not teach a sighted touch user an unfamiliar symbol.

**Verified reusable pattern:** use a whole-row native `details/summary` disclosure
as in [DiscoverySurface.tsx](../../src/ui/gameplay/discovery/DiscoverySurface.tsx),
lines 34–79, or shared `CollapsibleSection` with its labelled button, `aria-expanded`
and `aria-controls` (lines 64–85). Tap/click or Enter/Space opens ordinary visible
localized names, quantities and mechanics. Keep the names reachable and
associate the compact summary with its details. Avoid separate tiny icon buttons,
long-press-only discovery, nested interactive controls inside a disclosure
trigger, or a new hover bubble. Screen-reader labels preserve resource and
quantity; decorative icons are hidden when accompanying text already carries
meaning. [InlineImageSymbol.tsx](../../src/ui/components/InlineImageSymbol.tsx),
lines 10–59, provides this decorative/labelled distinction.

There is **no audited shared touch popover/individual icon tooltip component**.
If a surface cannot use visible copy or its existing disclosure, a new shared
learning pattern is a proposed exception requiring its own reviewed interaction;
do not silently create tooltips. Desktop skill-node hover is an existing
specialist enhancement ([DesktopTooltips.tsx](../../src/ui/components/DesktopTooltips.tsx),
lines 12–45), not the gameplay icon-learning baseline.

| Icon role | Verified dimensions / optical rule | Source |
| --- | --- | --- |
| Ordinary inline asset | height .92em, natural aspect ratio, baseline -.08em | components.css 152–172 |
| Tinted inline asset | .92em square, contained mask, current text ink | Same source |
| Infinity point artwork | translate down .06em for transparent bounds | Same source 179–182 |
| Settings glyph | 1.3em square; enclosing button retains full target | Same source 184–187 |
| Infinity progress reward symbol | .95em square | infinity.css 339–347 |
| Discovery outside-bar icon | 1.45em square, container font 1.05rem × text multiplier | discovery.css 30–35, 164–168 |

At the default body role .92em is about 12.1px; this calculation alone does not
establish readability for a new dense silhouette. Inspect the actual asset at
minimum/default/enlarged runtime sizes. Do not canonize the prototype's 1.1em
Forager icons as a new standard. Preserve aspect ratio and optical bounds;
follow the existing artwork workflow before changing symbols.

Reuse [InlineResourceAmount](../../src/ui/components/InlineResourceAmount.tsx),
lines 10–28, for inline symbol/value spacing, baseline alignment and LTR-isolated
`bdi` numbers within either reading direction. Reuse shared number/duration
formatters. Related numbers use tabular digits, not invented fixed-width boxes;
allow genuine magnitude transitions. Keep a consistent .16em intra-pair gutter
and a semantic control/card gap between independent pairs.

**Do not confuse the three kinds of quantity:** stock totals are what the player
holds; costs are what a start/purchase requires; outputs/rewards are what completion
produces. Keep stock in the resource summary and costs/outputs in the relevant
activity/action. Show direction or explicit labels in accessible details; avoid
making colour the only distinction. The new input → output recipe layout is a
Simulations-specific requirement, not an existing shared recipe component.

### Progress and timer variants actually in use

| Variant | Geometry and information | Source / appropriate reuse |
| --- | --- | --- |
| Generic native Progress | .75rem (12px) track; label/value above; .5rem gap | components.css 190–211; Progress.tsx 23–43; semantic determinate/indeterminate support |
| Infinity bottom status | .48rem (7.68px), 1px border, .2rem radius, .82rem scaled heading | infinity.css 329–365; persistent reset progress |
| Established Simulation compact cycle | .36rem (5.76px) rounded track; .68rem scaled metadata; .1rem/.4rem gaps | simulations.css 670–738; specialized slow/medium/fast presentation |
| Discovery main / supporting | 2.5rem / 1.8rem × text multiplier; .4rem radius; timer left inside, benefit right inside, icon outside right | discovery.css 46–79, 108–115, 162–168; its approved specialist panel |

Track dimensions in ordinary rem scale with the root, not text multiplier;
Discovery explicitly scales its height with that multiplier too. The Simulation
fast/medium fill treatment is specialized presentation; don't reuse its full
visual track to imply an incomplete exact milestone is complete. Generic
`Progress` does not yet provide the requested recipe-above/bar-with-right-timer
composition; document that as a scoped layout extension before implementation.
Always expose meaningful label and numeric/current/max or text equivalent.
Indeterminate work does not get an invented percentage. Never award gameplay
from an animation; respect reduced motion. A waiting infinity glyph must also
have a localized accessible explanation, not merely an unexplained infinity
currency symbol.

### Panels, selection, locks and colour

Use Infinity's **bottom** `ProgressControlsPanel`: persistent summary left,
settings control right, body opening **above** it. Main content remains scrollable
and its last item clears the dock/navigation. Keep the summary and Settings
reachable when expanded; do not turn the panel into a new nested decorative card.
The base body cap is not universal approval for every screen: Bots/Research
have documented content-driven expansion exceptions. [infinity.css](../../src/ui/gameplay/infinity/infinity.css),
lines 15–57, and [progressControlsPanel.css](../../src/ui/components/progressControlsPanel.css),
lines 9–76 and 123–132, own the reference.

Selected segmented controls reuse the existing Simulation purchase-quantity
pattern ([simulations.css](../../src/ui/gameplay/simulations/simulations.css), lines
162–192): five equal columns, .3rem gap, minimum target token, scaled .78rem text,
selected accent border and accent/track mix. Infinity's Auto toggle likewise
uses `aria-pressed` with selected border/fill (infinity.css 76–95). Preserve all
options, visibly distinct selection and keyboard operation; reflow rather than
clip. The specific bottom focus placement is an explicit Simulations requirement.

Disclosures keep explanatory content out of the comparison view. Locked previews
show a canonical requirement and a noninteractive state; do not give locked
content an active-looking disclosure or fabricate reveal rules. Native details
and shared disclosures support touch/keyboard; collapsed unmounted content must
not remain in tab order. Disabled actions stay flat, not lit as available.

Use route `--theme-page/panel/selected/divider/accent` variables for surfaces,
selection and identity. Global actual palette ([tokens.css](../../src/ui/tokens/tokens.css),
67–81): primary #f7f4f8, secondary #c4bfc8, positive #91dd8f, orange accent/value
#ffa45e, warning **yellow #ffeb3b**, negative #ff6b6b, focus/highlight #00e1ff.
Infinity available/spent values use orange/green (infinity.css 11–12); Statistics
uses cyan values (statistics.css 8, 92–98). These are contextual meanings, not a
universal rule that every available stock is green. For Simulations, the user
explicitly requests missing inputs orange and sufficient inputs green: reuse
orange accent/value and positive tokens, **not** the yellow warning token. Add
text/status in details so colour isn't the only signal. Forced-colour overrides
must retain meaning without the palette.

### Responsive and mobile parity

Tokens describe compact ≤599px, medium ≥600px and wide ≥1024px, navigation rail
≥1080px (tokens 163–166). Actual shell media queries use ≥1080px **or** ≥960px
landscape ([dysonGameplayShell.css](../../src/ui/gameplay/shell/dysonGameplayShell.css),
1748–1752); this differs from the foundation's broad ≥1024px wide description.
Established Simulation uses several 720px route queries; Statistics reflows at
64rem, 44rem and 30rem (statistics.css 389–437), while Discovery purchase grids
use 1000px (discovery.css 160). CSS custom-property breakpoint names do not
replace literal media queries. Reuse the relevant existing route's content
breakpoint and verify the shell; do not invent a new universal cutoff.

Safe-area tokens take the maximum of browser env insets and native Android
insets ([src/index.css](../../src/index.css), 3–23). Use logical properties with
`max(inset, safe-area)` at edges; respect the shell's existing bottom navigation
reservation instead of double-adding it. Infinity top summary and Statistics
content show the pattern (infinity.css 31–36; statistics.css 29–35). Test portrait,
landscape and RTL. Support tap, click, keyboard, scrolling and visible focus
without changing meaning. Keep full target rectangles even for small glyphs.

## Audit gaps and practical exception process

The audit identifies gaps; **it authorizes no code fixes**:

1. The foundation's reference palette lists different panel, border, negative
   and secondary values from current runtime tokens. Its typography prose asks
   for a variable Lexend face, while the source declares static 400/600/700
   assets. Runtime values above are verified; reconcile the older prose in a
   separately scoped update rather than switching product colours/fonts here.
2. Root scaling can shrink rem target tokens below the 44px contract. Some
   route controls also override heights. Measure interaction bounds; copying
   a token is not proof of accessibility.
3. Semantic text roles coexist with route-local values: Statistics section/card
   headings use 1rem and local 1.2 line height (129–149); Simulation metadata
   .68rem; Infinity feedback .8rem unscaled (97–100). Retain verified specialist
   uses, but justify new departures rather than multiplying nearby values.
4. Global `:focus-visible` inset glow with `!important` overrides local outline
   rules (tokens 169–177). Forced colours restores an outline (235–239).
   Component CSS alone therefore does not establish effective focus styling.
5. No shared touch icon popover or recipe-with-right-timer component was found.
   Visible names through established disclosures are available today; a new
   learning/layout component would need a scoped reviewed exception.
6. Previous Forager screenshots passing bounds checks do not establish visual
   acceptance. Their cost-only rows, checkmarks and Waiting text contradict the
   current requested composition. Do not promote them to a visual baseline.

For a genuinely new pattern, record in the change's specification/PR: the user
need, closest existing component, why reuse is insufficient, exact departure in
size/interaction/colour, touch and keyboard behavior, and approval status. An
assistant suggestion is **proposed**, never auto-approved. Existing authorization
may already cover the exception; do not demand repeated permission. This prose
is a review hook, not a claim of automatic lint/test enforcement. A routine
implementation choice that stays within the authorized pattern can proceed.

### Audit evidence and scope

Source files and line spans above were inspected on 8 October 2026 at `41cecf64`.
The existing isolated desktop screenshot evidence was inspected again:
`task-2/screenshots-era-dock-reference/01-infinity-bottom-panel-reference.png`,
`02-infinity-expanded-up-reference.png`, and `03-statistics-tab-reference.png`.
Infinity demonstrates dense cards and upward dock expansion; Statistics
shows weighted headings, stable comparative values and selected tabs. Those
files are task evidence outside the canonical repo, not newly approved pixels.
Discovery and established Simulation were audited in source; no fresh native
or mobile reference captures were taken for this documentation pass. The earlier
Forager screenshots are explicitly excluded as accepted visual references.
The Library skill was read for private review delivery. The executor skill
catalog contained no registered skills; no applicable local responsive-visual
skill file was resolved in the audited project/agent skill locations.
