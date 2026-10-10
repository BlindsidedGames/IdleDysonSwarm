# Current Simulations specification — 8 October 2026

**Status: approved Forager icon/layout baseline retained; frozen V4 and approved Farming candidate implemented locally for review.**

This is the canonical record of the user's current requested Simulations screen.
It accompanies the [audited UI style guide](../ui-style-guide.md). Source commit
`41cecf64` is a working prototype, **not an accepted visual reference**. The subsequent explicit request authorizes the IDS UI skill and this targeted
presentation revision; it does not authorize an economy redesign or next-era gameplay. Private Library copies are review exports.

## Authority and executive summary

The user requires the mobile game to share the app's established size and scale,
prefer icons over repeated long resource words, and use a defined type/weight,
control and progress hierarchy. Hover alone cannot teach icon meaning. This
specification supersedes the earlier cost-before-timer/checkmark prototype and
historical screen delivery notes where they conflict.

The current requested activity is:

```text
Activity name [person icon] crew count     [inputs + quantities] ▶ [outputs + quantities]
[progress bar................................] [timer or ∞]
```

The title, actual crew and trailing recipe share **one header above** the progress
bar. “Above” does not mean a separate left-aligned recipe line. Recipes align to
the trailing edge; wrap only when the real title/crew/recipe cannot fit, retaining
right alignment and full-size symbols/quantities. Use Research's existing `▶`
(U+25B6) projected-effect glyph, separate from the disclosure chevron. The timer is immediately to
its **right**, on the bar row. When waiting, that slot shows an infinity symbol,
not the word “Waiting”. Missing inputs are orange; sufficient inputs green,
using the existing palette. Do not add paid-input checkmarks or checkboxes.

## Acceptance criteria and implementation status

| Requirement | Acceptance check | Current implementation status |
| --- | --- | --- |
| Name and crew | Every visible activity has its name plus readable person icon and actual assigned count; no purchased-worker count substituted | Implemented with Bots card-title/production roles; user review pending |
| Inline trailing recipe | Title/crew and input ▶ output groups share the header above the bar; recipe stays trailing/right-aligned when wrapping is necessary; outputs match the actual cycle | Corrected after user clarification; pixel review pending |
| Bar-right timer | Finite remaining duration sits immediately right of its own bar; narrow/wrapped recipes retain that association | Implemented: natural-width timer immediately right of track |
| Waiting glyph | Infinity symbol replaces Waiting in the timer slot; accessible localized reason and touch-reachable explanation remain | Implemented: ∞ with localized accessible reason and visible row details |
| Input state colours | Missing orange `--color-accent-value`; sufficient green `--color-positive`; not colour-only semantics | Implemented: orange missing, green sufficient/funded; detail copy explains payment |
| No paid checks | No checkmark/checkbox added to activity recipe or bar metadata to indicate reserved payment | Removed; no added check or checkbox |
| App size and hierarchy | Use the guide's semantic typography, icon geometry, row spacing and full targets; inspect minimum/default/enlarged scales and mobile locales | Source roles applied; actual scales and reference captures checked; user acceptance pending |
| Learn icons on touch | Ordinary visible localized resource names and quantities are reachable by tapping the existing row disclosure; the same disclosure works with Enter/Space | Existing native row details expose all names/quantities; touch and keyboard checked without native titles |
| No hover-only reliance | Removing hover/title UI does not remove the ability to understand resource, quantity, direction or waiting reason | Titles supplemental only; details provide the learning path |
| Free Gathering | No fabricated input debit/cost; show its actual outputs in the output group | Implemented: actual outputs, no fabricated input or arrow/debit |
| Expensive/long recipes | Camp Expansion, Seasonal Expeditions and Exchange Networks show every input/output quantity; wrap recipe metadata before clipping/shrinking | Every recipe covered in focused tests; desktop/mobile layout verified |

The arrow signifies conversion/completion outputs, not an additional purchase
or immediate transfer. Accessible details must explicitly label Inputs and
Outputs and describe the waiting reason. Colour, icon shape and the infinity
symbol alone cannot explain state. A person glyph is not a separate tiny button:
keep the activity disclosure as the full interaction target.

## Other explicit requirements to preserve

**Focus:** all options are single-choice **radio buttons presented as raised/pop-out
tabs** in the **bottom active-era panel**. Every option has a visible bordered
button surface and outward shadow; selection is prominent, never sunken. Preserve
roving keyboard focus, arrows/Home/End and Enter/Space activation. They are
relative to the active era, not a global permanent Forager toolbar. Workforce
distribution stays visible or accessibly discoverable in the associated details;
show actual crew counts per job. Preserve durable focus selection and meaningful
keyboard operation. Prototype places focus at the bottom and distribution in
upward details; visual acceptance remains pending.

**Catalysts:** the collapsed bottom panel shows real next automatic Catalyst
progress, useful percent and the existing Catalyst icon. Do not show milestone-name
copy such as “Camp development 8” or the wallet count in this collapsed area;
the entire duplicate milestone block is absent from upward details too: no
heading, requirement list or automatic-award boilerplate. Actual activity panels
already hold that information, and wallet data stays
owned by the existing game/skill-tree path. Use logarithmic progress and exact completion
checks, including after the first three. Earn Catalysts automatically into the
existing wallet; spend them **only in the existing skill tree** for permanent
boosts. No resource-debit purchase button, claim button, new currency or fake
progress. Preserve exact-once awards, migrations, resets, wallet limits and
permanent skill ownership. The implementation preserves continuation and the
existing skill-tree path; those mechanics are not permission to change this
visual specification or the economy in this documentation task.

**Future era:** when an actual following era exists, the completed prior era's
detailed jobs become **one generator/output source feeding that next era**, not
merely a collapsed old list. No following-era gameplay is requested now. The
prototype has a tested retained-source presentation boundary, but **no next-era
consumer/transfer mechanics**. Do not expose a synthetic following era as real
playable content, and do not claim this boundary implements the whole transition.

**Artwork and scale:** reuse existing symbols where suitable; any authorized new
symbols must follow the artwork workflow and match established optical size and
weight. This document approves no new asset or bespoke icon size. The guide's
runtime values and visual review govern readability on mobile as well as desktop.

## Assistant proposals — not automatically approved

- Keeping already-paid inputs green regardless of current stock was an assistant
  proposal, subsequently resolved within the explicit implementation authorization
  to avoid false shortages: funded active inputs stay green; they never receive
  a second debit. See the recorded decision below.
- A fixed-width timer slot was an assistant proposal. The user approved timer
  placement, not a particular fixed width; the foundation normally preserves
  natural numeric widths. Any stabilization method needs a justified scoped
  choice and review without clipping/localization regressions.
- Highlighting housing/output capacity was an assistant proposal, not approved
  additional UI. Existing waiting reasons still need accessible explanations.
- A new individual icon popover, tooltip, legend, larger bespoke icon token or
  progress component is not implicitly approved. Prefer the established full-row
  disclosure; if insufficient, record the missing shared pattern and proposed
  exception before claiming acceptance.

## Concrete visual review for the eventual implementation

Use the four normative references: Bots density, Research conversion/quantity
controls, Infinity bottom-panel/settings, and Skill tree interactions. Statistics
tabs are supporting evidence only; rejected Forager screenshots are not references.
Apply the guide's review matrix. At a minimum verify:

1. Fresh/early and mature Forager; every activity, free Gathering, multi-input
   and multi-output recipes, running/waiting states and locked requirements.
2. Focus collapsed/expanded, upward workforce distribution, selected state,
   keyboard navigation and persistence after reload; next automatic Catalyst
   after more than three awards and after skill spending.
3. Desktop Interface size 80%, 100%, 130% and 150%; separately 360×800 at 130%
   text multiplier, 320×568 enlarged text, compact landscape and long German
   copy. Include pseudo-expanded LTR/RTL when relevant to the changed composition.
4. Touch icon identification without hover or native titles, Enter/Space
   disclosure activation, screen-reader resource/quantity labels, effective focus
   styling, actual 44px target bounds and safe areas. Colour cannot be the only
   waiting/affordability cue.
5. No horizontal page overflow, obscured timer, clipped quantity, incorrect
   recipe direction, compressed icon or final activity hidden behind the dock.
   Capture and inspect representative pixels at actual sizes; name untested hosts.

The row revision is implemented under the explicit request to proceed, with
user pixel review still pending; implementation does not establish acceptance. Numerical Int64
reward limits and unimplemented following-era consumption remain prototype
limitations, documented in the [continuation evidence](civilization-continuing-catalysts-2026-10-08.md).

## Authorized implementation decisions and verification

The project skill is `.agents/skills/ids-ui/SKILL.md`; its compact body loads the
492-word core and only applicable canonical reference sections. Its narrow IDS
trigger/frontmatter were validated with the skill-creator validator. It was
applied to this actual revision, not only renamed from an oversized manual.

Two targeted departures were necessary within the approved goal:

1. The recipe-above/bar-right-timer layout composes the existing semantic Progress
   primitive in a local grid, hides its redundant visual header accessibly, uses
   Bots' .72rem track and keeps a natural-width timer. Shared callers are unchanged.
2. Active-cycle inputs stay green even after reservation reduced stock, because
   they are already funded; the existing paid explanation remains in touch details.
   This resolves the earlier assistant proposal using the explicit instruction
   to avoid false shortages. Unfunded inputs still compare actual required amounts
   with stock. No checkmark, fresh debit or economy change is added.

For this changed surface only, native row/focus targets and Settings have a 44px
floor at 80% Interface size. The Settings column follows that floor. This implements
its established interaction requirement; unrelated route target gaps are untouched.
Inline amount baseline/gutter, ordinary symbol geometry and selected quantity
control type now use the shared definitions. Original symbols/assets are retained.

The previous iteration's 39 focused tests passed, including every input/output recipe, recruitment,
free Gathering, paid-empty-stock and genuine shortages, migrations/awards and the
future generator fixture. Build and lint pass; no new strings/catalog edits.
The pre-existing build chunk warning remains. Full-suite baseline results belong
to the earlier continuation task and were not rerun for this local UI change.

Actual isolated browser evidence covers desktop root Interface sizes .8/1/1.3/1.5,
360×800 at 130% text, 320×800 at 200%, German, selected bottom focus, upward settings,
next reward beyond three, crew totals, every recipe's timer/track relation, last-row
reachability, and touch/keyboard disclosures. Native hosts and 400% browser zoom
are not certified by this iteration. User pixel acceptance remains pending.


### Header, raised tabs and readable dock correction

The user's clarification supersedes the separate recipe line and flat focus
controls from `ce804139`. The recipe now trails title/crew in the same header,
wrapping to a right-aligned line only when necessary. ResearchSurface's
`effectText` uses the exact `▶` glyph for current/projected effects; its actual
Durability Upgrade pixels and quantity controls were inspected. Disclosure
chevrons remain independent. No new artwork or economy changes.

Focus uses Research's selected/unselected quantity surfaces (.2rem radius,
1px border, selected accent/readable page ink) with the shared Infinity settings
control's outward `0 .12rem .24rem rgb(0 0 0 / 42%)` shadow on every option.
Keyboard focus retains the global neutral white lift in addition to the outward
shadow; it no longer replaces that shadow. This local focus override preserves
the standard focus treatment without turning selection into an inset control.
This locally combines existing treatments because the user explicitly requests
raised radio tabs; it does not introduce purchase lighting or an inset selection.
The group has radio semantics, one selected/tabbable option, arrow/Home/End
navigation and native button Enter/Space activation. After a durable save, focus
is restored to the chosen radio because the retained native pending-disable state
otherwise blurs it. The bottom placement and
canonical durable focus command are preserved.

Dock symbols alone use the existing ResourceValue display role, `--font-size-lg`
(1.25rem × text scale), with .92em symbol geometry and primary white ink. This
makes their boxes 18.4px at default desktop, 14.72px at 80% Interface and 23.92px
at mobile 130% text. The scoped departure is using a resource-display symbol
beside compact meta/body copy; labels, values and the whole dock are not enlarged.
Existing assets, aspect ratios and pair gutters are retained. Catalyst reuses
Skill tree's existing 150% mask-size padding correction: the 1254px source canvas
has visible bounds [252,215]–[1075,1027], so contain alone underfills the box.
A local 58.7% horizontal mask position centers those asymmetric visible bounds
so the 150% mask retains the right sparkle without clipping either side. This is an artwork
optical correction, not a new asset. Era identity/fracture and wrapped wallet
headers retain readable grouping at 200% text instead of squeezing the title.

Current correction: 10 targeted frontend tests pass, including single-choice
radio/roving focus, arrow navigation, every real recipe and exact conversion
glyph, funded and missing inputs, continuation and retained generator behavior.
Build and lint pass; the pre-existing chunk warning remains. The full aggregate
was not rerun for this local correction.

Actual isolated-browser checks cover desktop Interface .8/1/1.3/1.5, mobile
360×800 at 130% text, 320×800 at 200%, German, title/recipe wrapping and baseline,
green/orange funded/unfunded states, bar-right timer/∞, every raised radio surface,
selected state/reload persistence, Space/arrow/Home navigation with focus restored
after native pending disable, touch disclosures without titles, upward details,
last-row reachability, and a synthetic 20px bottom safe area. Reference and changed
pixels were inspected at matching 1440px desktop / 360px mobile scales.
Runtime exceptions: zero. Native hosts, compact landscape, RTL and 400% browser
zoom are not certified by this correction. User pixel acceptance remains pending.

The enlarged-text follow-up changes only focus layout: narrow options wrap as
flex items with min-content widths and normal word wrapping. Normal mobile keeps
two columns plus the full-width final option; at 320px/200% text, whole-word
widths require four rows. Text stays 24.96px and all five targets remain 44px high.
The 10 focused frontend tests and desktop/mobile browser regressions pass. Only
the enlarged-text Library screenshot is replaced; other reviewed image identities
remain unchanged. Full aggregate and native certification are not repeated.

### Default-scale compact-panel review

The user's “a lot closer” is progress feedback, not final acceptance. Default
mobile is the primary review: 360×800, 16px root, CSS text multiplier 1, browser
zoom 100%, no inline text override and no persisted desktop Interface override.
Desktop expanded is 1440×960 with those same defaults. Expanded settings retain
workforce allocation/details above the collapsed controls, without a duplicate
milestone block.

Collapsed progress now has just Catalyst identity/percent and its real track;
milestone-name text in either state, automatic-award boilerplate and wallet-count
presentation are removed without changing
wallet, progress or awards. Mobile focus packs the unchanged .78rem raised radios
by their whole-word minimum widths, with ordinary .25rem spacing: four options
plus the full-width final option at default size. It reflows at enlarged text,
never shrinks labels/44px targets or hides options. Measured default dock falls
from 250.70px to 182.28px; focus controls from 141.59px to 92.80px. Actual final
controls, expanded content and game scrolling are checked at default and 130/200%
text; the 10 focused frontend tests, build and lint pass. Full aggregate and native
certification are not repeated.

Resource art remains provisional. Inspected 2084px Unity masters at
`cc21ca0ee632ac950a69ba14842b3fd7b5f7976c`: Manual Labour, Worker Efficiency,
Workers Boost, Staying Power, Science Boost and Repeatable Research, plus current
handshake/accepted Catalyst assets and editable Manual Labour augments. Worker
masters depict robots/CPUs; they are not suitable human/resource substitutes.
Next art review should show only Materials (derive Manual Labour's rounded blocks,
omit conveyor), Food (one rounded grain/leaf silhouette) and Tools (one rounded
stone-tool silhouette), at actual 16/24px and enlarged 32/64px on the route surface.
Only Materials has direct reusable master shapes; Food/Tools are new-art proposals.
Match the masters' white fills, broad rounded ends and clean transparent cutouts
before extending to hides/clothing/provisions/shelters/camps. No speculative set
is applied in this layout iteration; accepted Catalyst artwork is preserved.

The expanded-text correction removes the entire duplicate milestone block:
heading, requirement sentence/list and automatic-award explanation. The user's
clarification says the actual panels already hold that information; no replacement
rows or duplicated label set is introduced. Next-Catalyst progress/percentage,
workforce distribution and raised focus controls remain. Default mobile/desktop
collapsed and expanded states are verified; only the two expanded Library
screenshots are replaced in place.


### Approved Forager artwork integration

Matthew approved the nine-icon `Forager-Icons-Review-Grid.png` board. Its original
cloud bytes were inspected and faithfully traced into editable SVGs, then moved
through asset-only Git commit `cba8e67661dea1773891aa5ca82878663a01dae7` after
Library materialization on the Mac failed. The nine received SVGs were rendered
and visually inspected locally before integration.

Masters live in `source-assets/skill-icons/forager/`; the accompanying README
records the exact Library identity and regeneration command. The existing
`CivilizationSymbol` resource keys now map to 256×256 transparent lossless WebP
exports, rendered at density 288. Alpha masks preserve transparent cutouts and
the existing resource/state ink. Catalyst retains its original asset and mask.
No layout, scale, economy, strings or interaction code changed.

All exports contain only white visible pixels and transparent backgrounds. The
received artwork was inspected at 12/16/20/24/32/48/64px, including the actual
compact recipe sizes. Supersampling smooths exports without adding source detail.
Default mobile (360×800) and desktop (1440×960), collapsed and expanded, were
captured and inspected in isolated Chrome for Testing. Measurements confirm a
16px root, text scale 1, page scale 1, DPR 1 and no desktop Interface override.
Recipes retain trailing alignment and the exact `▶` glyph; timers remain beside
their own bars. No duplicate milestone heading, wallet or requirements appear
in expanded dock settings. Browser checks cover input state colours, all recipes,
44px targets, raised radio semantics and last-row/control reachability. All nine
256px runtime assets decoded with alpha masks. Enter opens visible recipe
details without hover. Additional browser checks cover desktop root scales
80/130/150%, 360px at 130% text, 320×568 at 200% text, 390×844, 768×1024,
844×390 landscape and German. Bots and Infinity reference captures were inspected
at the same default widths/scales. Four final default screenshots were saved
successfully to Library; local evidence retains their identities.

Build, lint and 39 existing focused civilization/application/era tests pass. No
new asset-inventory or CSS-literal tests were added. The full suite was not rerun
for this artwork integration; native hosts and 400% browser zoom remain unverified.
User review of the integrated icons and existing layout is still pending.


### Resource legend and readability iteration

The user's latest request places icon learning inside the existing top Resources
dropdown. Expanded content now shows eight resource names/balances and Workers
in a compact responsive legend. The collapsed three-resource summary, section
names and bottom workforce controls retain their existing composition. No new
dropdown, art, strings, resource mechanics or global scale is introduced.

The closest pattern is the ordinary `InlineImageSymbol`/`InlineResourceAmount`
contract used by Bots/Research. The approved combined Food/Materials silhouettes
were hard to identify at the inherited 11.77px recipe size. A narrowly scoped
exception enlarges activity-header symbols to 1.1rem × text scale (17.6px by
default), with Food/Materials at 1.12× (19.7px) to balance their separated details
against solid tunic/pelt/sack shapes. Legend symbols use 1.3rem × text scale
(20.8px; Food/Materials 23.3px). Collapsed stock symbols remain approximately
12.1px, and Catalyst/dock symbols retain their established role.

This reuses the exact approved SVG/WebP shapes without changing either asset.
Masks stay contained with natural aspect ratio. The original icon-size iteration
kept the shared baseline and .16em number gutter; the approved typography
iteration below supersedes those activity-header rules. Progress/timer placement, 44px controls and
raised focus tabs are preserved. Rows remain content-sized. At default mobile,
Camp Expansion now wraps its longer recipe to the trailing edge through the
existing flex layout; no forced recipe line is added. The two previously wrapped
Expeditions recipes retain that behaviour. All twelve activities remain scrollable.

Actual 360×800 / 1440×960 captures compared the previous size and 14.4, 16, 17.6
and 19.2px candidates, with optical normalization applied to each candidate.
17.6px is the largest reviewed size that keeps Shelter Building's full recipe
beside its title on default mobile. At 19.2px that row wraps too, increasing
crowding and total vertical use. At the selected size, the sum of the four mobile
activity panels is 759.6px versus 643.8px previously; the visible improvement
therefore has an explicit 115.8px total height cost across twelve activities.
The drawer, app root and text multiplier do not grow. Pixel acceptance of this
local exception remains pending user review.


Build, lint and the same 39 focused tests pass. Isolated Chrome for Testing
review confirms true 16px root / text scale 1 / zoom 100% / DPR 1 screenshots
at 360×800 and 1440×960, without a desktop override. Top Resources expansion
and bottom workforce expansion are captured separately, along with collapsed
views and the previous-size comparison. Eight reviewed screenshots were saved
to Library. Browser review records zero runtime exceptions and verifies all
recipes, input colours, timer placement, raised tabs, 44px controls, enlarged
desktop/mobile scales, 320×568 at 200% text, compact landscape and German.

Native touch events open the resource legend and Gathering details after all
`title` attributes are removed; names and balances identify all nine symbols,
and visible recipe text identifies Food/Materials. Enter closes the native
resource disclosure. A fresh disposable state exposes the same legend with
three Workers and only the initial Gathering activity. No real player save or
account was used. The full suite, native hosts and 400% browser zoom remain
unverified for this local readability revision.


### Recipe quantity typography iteration

Following the user’s explicit “try it” approval, recipe quantities use the
existing body role at medium weight: 13.12px / 600 at default scale, replacing
12.8px / 400. Header, title/crew and recipe groups centre their items; every
icon/quantity pair shares a vertical centre. The scoped .12em pair gutter is
1.57px instead of 2.05px, while the existing section-gap token separates
resources by 8px instead of 6.4px. Input/output direction and trailing alignment
remain unchanged.

The icon size is independent of recipe font size: 1.1rem × text scale retains
17.6px ordinary symbols and 19.7px Food/Materials. Approved SVG/WebP artwork,
top resource legend, collapsed balances and Catalyst stay unchanged. Title
14.4px / 700, crew 12.8px / 600 and timer 11.52px / 400 retain their roles.
The app root remains 16px, text multiplier 1 and browser zoom 100%, without
a desktop Interface override.

At 360×800, the same three recipes wrap: Camp Expansion, Seasonal Expeditions
and Exchange Networks. Shelter Building remains beside its title. At 1440×960,
all twelve recipes remain inline. Centre alignment reduces the combined
activity-panel heights from 759.6px to 749.8px mobile and from 687.1px to
685.1px desktop; no fixed row height or forced recipe line is introduced.
Four default-scale views show the existing top Resources dropdown closed/open
on mobile and desktop. Pixel acceptance remains pending user review.

Build, lint and 39 existing focused civilization/application/era tests pass for
this typography revision. Isolated browser inspection verifies centred pairs,
all recipes, state colours, timers, raised radio tabs, 44px targets, asset alpha
masks, legend/recipe learning, enlarged scales, compact landscape and German.
No runtime exception or horizontal overflow was recorded. The browser
inspection’s wrapping heuristic now uses measured gap/padding rather than
fixed default pixels when the root scale changes. Full-suite testing, native
hosts, RTL and 400% browser zoom were not rerun or verified.


### Compact focus trial

The user accepted the icon/quantity baseline at `45c13564` as a good foundation,
then approved trying a compact five-choice group aligned left on wider screens.
Following the semantic review, the final trial labels are Balanced, Supplies,
Growth, Craft and Trade. Supplies replaces the narrower Food label; Growth
replaces Housing because Settlement also recruits and builds camps; Craft
replaces Tools because the path also makes clothing. The allocation IDs and
weights are unchanged. Trade remains shorthand for preservation, expeditions
and exchange, not solely Exchange Networks. Full section names remain visible
in activity headings and expanded worker distribution.

The raised radio buttons retain existing text/weights, selection surfaces,
shadows and keyboard interaction. Buttons have natural content widths, minimum
44×44px hit targets, the shared .25rem group gap and whole-word wrapping. The
group is left-aligned and content-sized on wide screens, never stretched
across the viewport. Worker distribution remains in the existing expansion.
Existing Balanced/Craft translations are reused; dedicated Supplies/Growth/Trade
labels are extracted, translated into all seven supported languages and compiled
with both pseudo-locales. No economy, recipe, reward or era-handoff code changes.

At genuine default scale (16px root, text multiplier 1, zoom 100%, DPR 1, no
desktop Interface override), the final group is 293.1px wide on 360×800 mobile
and 1440×960 desktop. With Craft selected, button widths are 68.3 / 62.8 / 56.1 /
44 / 45.8px; all are 44px high. Text stays 12.48px at 600, selected 700. Mobile
dock height falls from 182.3px to 133.5px, exposing 48.8px more activity content.
German and enlarged text wrap naturally without overflow or split words.

Build, lint, localization extraction/validation and all ten compiled catalogs
pass. The 39 focused tests pass, with only the existing interaction test's
Trade accessible-name lookup updated. Isolated browser evidence records 105
checks and zero runtime exceptions across fresh/mature states, native touch
selection of every choice, arrow/Home/End navigation, default/enlarged desktop
and mobile, compact landscape, German and existing upward details. Four actual
default-scale collapsed/expanded screenshots were inspected and saved to
Library. Full-suite testing, native hosts, RTL and 400% zoom remain unverified.
This compact focus trial awaits user pixel review; the accepted icon/quantity
baseline is preserved.


### Responsive focus correction

The user explicitly superseded the preceding left-aligned natural-width trial:
mobile choices must be equal-width and span the available width beneath the
heading; desktop choices must remain compact at the right of the same row as
Workforce focus. Only focus CSS changes. The existing single header worker
count remains beside the heading on desktop and at its trailing edge on mobile;
expanded distribution retains its existing total and full section names.

Default 360×800 mobile has a 337.6px group with five equal 64.3×44px buttons,
4px gaps and unchanged 12.48px / 600 text (selected 700). Horizontal button
padding is removed inside these equal-width mobile cells to fit the longest
selected label without reducing type or touch targets. Actual glyph bounds
were checked in all five selected states. Default 1440×960 desktop retains a
293.1×44px natural-width group, aligned to the right on the same horizontal row
as the heading/count. Desktop dock height falls from 139.7px to 111.5px.
Mobile dock height remains 133.5px.

When text/locale cannot fit five choices, mobile rows wrap at whole labels and
distribute available width evenly within each row; widths may differ between
wrapped rows. At 360px / 130% text and default German the layout is 4+1; at
320px / 200% text it is 2+3. No label clips, word splits or target below 44px
were recorded. Wider focus rows also wrap naturally when their actual content
cannot fit. The Catalyst row, approved artwork/quantity hierarchy and all
allocation/economy code remain unchanged.

Build, lint, diff check and the existing 39 focused tests pass. Isolated browser
review covers fresh/mature states, native touch selection of all five choices,
arrow/Home/End navigation, actual glyph bounds, expanded distribution,
default/enlarged scales, landscape and German with zero runtime exceptions.
Four default collapsed/expanded screenshots were inspected and saved to Library.
Full-suite testing, native hosts, RTL and 400% zoom remain unverified. The
attached Library reference could not be downloaded (HTTP 403); implementation
and inspection follow the explicit textual layout instructions. User pixel
review of this correction remains pending.


### Bots-height focus correction

The user's next correction explicitly chooses the Bots quick-preset height for
focus buttons and tighter vertical spacing on desktop. Measured at root 16px,
text scale 1 and browser scale 1, the real Bots presets are 32px high on both
360×800 mobile and 1440×960 desktop, with 4px padding and 12px text. Expanded
and collapsed preset views share that height. Their actual button hit area is
also 32px: no pseudo-element or hidden 44px target extends it.

Forager focus now uses the same 2rem minimum height: 32px at default scale.
Raised radio appearance, 12.48px / 600 labels (selected 700), 4px gaps and all
five choices remain. Mobile retains five equal 64.3px-wide cells spanning
337.6px beneath the heading; desktop retains its compact 293.1px-wide group
at the right of the heading/count row. Desktop removes focus outer margins,
above-summary and summary vertical padding, and spare collapsed-grid height.

| Default-scale measurement | Before | Current |
| --- | ---: | ---: |
| Focus visual and button height, both surfaces | 44px | 32px |
| Mobile collapsed dock | 133.484375px | 121.484375px |
| Mobile expanded dock | 219.859375px | 207.859375px |
| Desktop collapsed dock | 111.546875px | 77px |
| Desktop expanded dock | 183.53125px | 148.984375px |

This is an explicitly requested scoped exception to shared 44px touch-height
guidance. Focus hit areas are genuinely 32px high at default scale, with widths
at least 44px; no claim of a 44px height is made. The 2rem minimum follows root
scaling (25.6px at 80% root), and enlarged labels grow controls as needed.
Activity, resource and distribution disclosures and Settings retain their 44px
minimum targets. The earlier focus target measurements above describe prior
iterations, not this correction.

Settings behavior is unchanged: focus remains visible in collapsed and expanded
states; distribution/details open upward. Hiding focus with Settings would
reduce the closed dock further but add a tap before switching. The collapse
question remains for user clarification; this correction does not implement it.
The accepted icon/quantity baseline, assets and all economy/allocation code are
unchanged.

Build, lint, diff check and 39 existing focused tests pass. Disposable Chromium
browser QA records zero runtime exceptions and verifies default mobile/desktop,
expanded distribution, all five touch selections and keyboard navigation,
fresh/mature states, glyph bounds, root 80/130/150%, text 130/200%, 320×568,
390×844, 768×1024, compact landscape and German. Default-scale collapsed and
expanded screenshots for both surfaces were visually inspected and saved to
Library. Full-suite testing, native hosts, RTL and 400% zoom remain unverified;
the pre-existing build chunk-size warning remains. This correction awaits user
pixel review.


## V4 balance implementation — 8 October 2026

The user's subsequent approval explicitly authorizes applying the frozen,
demand-limited V4 balance to the current prototype. This supersedes the earlier
presentation-only scope for this implementation. It does not approve whole-arc
or next-era timing proposals. Approved nine-resource artwork and icon/quantity
typography remain unchanged.

The visible roster is Gathering, Toolmaking, Hunting, Shelter Building,
Hideworking, Food Preservation, Camp Expansion, Seasonal Expeditions and
Exchange Networks. Focus has four choices: Balanced, Supplies, Growth and
Trade. Craft remains a production section; it is no longer an independent focus.
Three real founders receive one starter shelter kit once. Gathering needs its
actual crew, with no phantom labor. Completed shelters add two residents; a
paid Camp reserves three shelters and their six residents until completion,
then replaces them with a nine-resident Camp for a net gain of three.
Construction bills scale with lifetime completion counts, never current stock.

Crews favor the selected path and its supports, release unfunded or
unneeded jobs, and finish paid recipes. Exploration serves the next earned
Catalyst goal and Trade's unlock demand. Toolmaking, clothing and provisions
use stock targets with hysteresis; new provisions protect the next housing
Food bill. Every simulation minute, available Tools and Clothing equip up to
one quarter of the population. Useful equipped field crews gain half a worker
of labor per kit. Real permanent skill-tree fractures contribute additive
5% bonuses; earning or holding a Catalyst does not buy a boost.

Six opening Catalyst goals are automatically credited to the existing wallet.
Further goals double Camp/exploration/Trade completions. The native prototype
preserves the previous numeric continuation architecture: up to 65 awards fit
Int64; the next genuine goal 66 cannot complete. The frozen study explored 15
checkpoints. Already-awarded IDs remain paid. Offline absence still banks
Stored Time, which advances production only when spent through its existing
worker/application path.

Schema 4 stores population grants, the gear calendar, stock hold state and
paid recipe receipts with absolute deadlines. Existing prototype population,
gear and award ownership are grandfathered. Completed legacy housing does not
retroactively recruit; previously paid legacy cycles finish their old work and
output once. Paid retired recruitment/fishing/specialization rows remain visible
only until that receipt settles. Fresh simulations have nine current jobs.
The old Craft focus migrates to Balanced. Work pacing is adjustable centrally
in `src/simulation/civilizationTuning.ts`; the current multiplier is 1.

The retained previous-era presentation remains ONE generator/output source in
a real following-era context. No actual following-era owner or consumer exists
in this prototype, so no synthetic era, transfer behavior or copied population
is exposed as playable content. Opening completion continues ordinary Forager
play. The illustrative study source-export buffers are not live mechanics.

Verification: 103 focused tests pass across civilization, durable frontend
commands, retained-era presentation, Stored Time worker/application and save
mapping. Native two-hour population, equipment, Camp, exploration and Trade
ledgers match all four frozen V4 focus results; opening gates match within
0.01 seconds (Balanced 19:40, Supplies 19:36, Growth 19:23, Trade 16:49).
Four hourly serialized checkpoints match continuous four-hour integer output,
crew, population, gear, award and paid-cycle state, with progress tolerance
1e-6. Localization extraction/validation, all ten compiled catalogs, lint,
production build and diff check pass. The build retains its chunk-size warning.

Isolated Chrome for Testing review uses a fresh disposable profile,
`--use-mock-keychain`, checked-in first-run synthetic saves and blocked external
traffic. 110 browser checks record zero runtime exceptions. Actual default
captures are 360×800 and 1440×960, root 16px, text scale 1, zoom 100%, DPR 1
and no desktop override. Mobile focus has four equal 81.4×32px cells; desktop
has natural-width 32px buttons to the right of the heading. Activity recipes
retain 13.12px/600 quantities, 17.6px icons (Food/Materials 19.7px), .12em pair
gutters and the existing trailing triangle and bar-right timer. The longer
new shelter recipe wraps naturally on mobile. Expanded bottom details contain
no duplicate milestone heading, wallet or milestone requirements. Touch,
keyboard, icon-learning disclosures, last-row reach, German, root 80/130/150%,
text 130/200%, compact landscape and narrow/wide layouts pass inspection.

The required aggregate suite on pinned Node 24.11.1 reports 2,163 passes
and 93 failures. An untouched archive of baseline ab7b8436 reports 2,170 passes
and the same 93 failures in 16 files; failing test identities and normalized
diagnostics match, with no V4-introduced failures. Seven fewer tests reflect
the replacement of obsolete civilization assertions. Required PR checks for
data, localization, browser/native asset builds and Electron syntax pass.
No native app/device runtime, RTL, 400% zoom or native 24-hour/large-boost
performance was rerun. Four-hour native continuity and
two-hour no-spend balance are the focused execution evidence. No production
push, merge, release, real player saves/accounts or game cloud-save writes occurred.

Reviewed V4 screenshots were saved successfully to Library at version 0:

| Capture | Confirmed Library ID |
| --- | --- |
| 360×800 collapsed | `libfile_58c8e1c671188191ba6454d2fb166399` |
| 360×800 expanded | `libfile_ed2b7b85f62081918c79cb0ee2cddf7a` |
| 1440×960 collapsed | `libfile_ffc56bb4c06481918f7d5562a6e5f5b0` |
| 1440×960 expanded | `libfile_ccc2a8907c04819195a2922e598a4382` |

The prepared local save route failed at app discovery with DNS before any
upload reservation or write. The supported local-file Library create route
then saved all four images; each original path received its returned identity
and version metadata. No uncertain write was repeated. Matthew approved the V4 presentation and requested the final focus spacing
and recipe wrapping refinements recorded below.


## Approved focus spacing and wrapped recipe alignment

Matthew approved removing the visible Workforce Focus heading, adding space
above the focus controls, and matching their right edge to Settings. The radio
group retains its localized accessible name and keyboard/touch behavior. The
existing worker total remains visible. At default scale the dock uses 6.4px top
and 4px bottom spacing, with the focus edge within 0.02px of the visible Settings
surface. Mobile has four equal approximately 83.2×32px cells; desktop keeps
compact natural widths. The previously approved 32px focus target exception is
unchanged; Settings and disclosures retain their 44px minimum.

Matthew also approved left alignment when a whole cost→reward group wraps
below the title. Title flex growth preserves the trailing right alignment when
both fit on one line; a wrapped recipe begins at the row's left content edge.
No icons, quantities, recipe meaning, timer placement or simulation mechanics
change. The referenced Library image could not be inspected: materialization
returned HTTP 403 with no readable local bytes, and the image reader supplied
only a pointer. The explicit alignment rule was reproduced and checked locally.

Final isolated-browser review passes 128 checks with zero runtime exceptions,
including actual 360×800 and 1440×960 default captures, collapsed/expanded,
mobile 130/200% text, desktop 80/130/150% Interface sizes, narrow/landscape/wide
layouts, German, touch radio selection, keyboard navigation, icon learning,
last-row reach, and conditional inline-right/wrapped-left recipe alignment.
The final four captures supersede the earlier V4 review images for these UI
refinements. Library identities are recorded in the delivery receipt rather
than duplicating a second maintained image catalog here.


## Superseded mobile symmetric dock implementation

The implementation at e7740979 was superseded after Matthew corrected its
reference: Settings had been pulled inward rather than the left content moved
outward to match Bots. The measurements below are historical evidence of that
incorrect direction, not a current spacing convention.

Matthew requested left alignment of the mobile workforce count and equal
left/right content insets in the bottom dock. This is scoped to widths up to
720px; desktop layout and settings behavior are unchanged. The mobile dock uses
one outer gutter equal to the largest of the dense content inset and either
safe-area inset, plus one symmetric Settings-surface offset inside the dock.
The workforce count, focus row, progression label and expanded allocation
content share the same left edge. Settings' visible right edge stays aligned
with the focus row; its full interaction target is preserved.

Measured before: 11.1875px left versus 3.90625px right for the focus row.
Measured after at 320/360/390px: 11.09375px on both sides, collapsed and expanded.
A simulated left safe area of 20px produces 23.90625px on each side; a right
safe area of 24px produces 27.90625px on each side at 360/390px. Ancestor bounds,
borders, safe-area tokens and nested padding were recorded, rather than
inferring these totals from authored CSS. Default focus buttons remain one
row, equal width and 32px tall. Desktop workforce/focus/summary/Settings/body
rectangles match the pre-change measurements exactly in both expansion states.

The final isolated-browser pass records 146 checks and zero runtime exceptions,
including narrow/mobile safe-area geometry, expanded detail insets, touch and
keyboard radio behavior, German, enlarged text, Interface sizes and preserved
inline-right/wrapped-left recipe alignment. Default mobile collapsed/expanded
pixels were inspected at 360×800, root 16px, text scale 1 and zoom 100%.
Lint, browser build and diff checks pass; the existing chunk warning remains.
This CSS-only refinement uses rendered geometry checks; the aggregate suite
was last run at 1299c2cd with 93 baseline failures and no introduced failures.
No native device/runtime checks were added. The new user reference image's
supported Library materialization returned HTTP 403 with no readable bytes,
so the explicit request was reproduced against local captures.


## Mobile dock corrected to the actual Bots reference

Matthew explicitly requires the same spacing as Bots, moving the left content
outward and retaining the Settings edge. Civilization now opts into the existing
`ui-progress-controls-panel--production-summary` variant used by Bots and
Research, rather than the older Simulations summary-padding class. The shared
variant owns the mobile left content gutter and right safe-area reservation.
The extra outer dense gutter and symmetric Settings-surface offset introduced
at e7740979 are removed. Mobile expanded content uses the same dense inset as
Bots' settings content. Existing desktop padding/composition is preserved.

Shared values: `--game-card-content-inset` .45rem, left
`max(--game-card-content-inset, --safe-area-left)`, summary trailing gap .35rem,
and one `--safe-area-right` reservation in the collapsed row. Expanded content
uses `.45rem` versus each corresponding safe-area inset, once per side.
Settings retains its 44px interaction box in a 2.8rem grid cell and .22rem
visible-surface inset. Focus's existing right edge is derived from that surface;
its visible-border offset is not added again as a content gutter. The workforce
count stays left-aligned; equal-width focus buttons stay 32px tall.

Actual paired measurements at root 16px, text scale 1, zoom 100%, DPR 1 and zero
horizontal safe areas are identical in Bots and Civilization:

| Viewport | Left content x | Settings visible right x | Expanded content left / right x |
| --- | ---: | ---: | ---: |
| 320px | 7.1875 | 316.07375 | 7.1875 / 312.8125 |
| 360px | 7.1875 | 356.07375 | 7.1875 / 352.8125 |
| 390px | 7.1875 | 386.07375 | 7.1875 / 382.8125 |

All nine viewport/safe-area cases were compared in both expansion states (18
paired comparisons): widths 320/360/390, no horizontal inset, simulated left
20px, and simulated right 24px. Left inset 20px moves both routes' content to
x=20 without moving Settings; right inset 24px moves both Settings surfaces
left by exactly 24px. Expanded content tracks only its corresponding safe-area
inset. Actual hit boxes, surface bounds, ancestor padding, border widths and
safe-area tokens were recorded. Before this repair, 360px Civilization content
was x=11.09375 and Settings right x=348.88625, versus Bots x=7.1875 and right
x=356.07375. The previous symmetry check accepted those wrong reference values.

The isolated browser pass has 131 check records, including the 18 paired
reference comparisons, and zero runtime exceptions. Twelve screenshots show
both routes collapsed/expanded at all three default widths; all were inspected.
Desktop focus, workforce, summary, Settings and expanded content rectangles
match the pre-change captures exactly. German, enlarged text, Interface sizes,
touch/keyboard radio selection, icon learning, last-row reach and preserved
inline-right/wrapped-left recipes pass. Fifteen focused Bots controls,
civilization frontend and retained-era tests pass, as do lint, browser build
and diff checks. The existing chunk-size warning remains. The aggregate suite
was not rerun for this layout-only repair; its last verified run at 1299c2cd
has the previously documented 93 baseline failures and no introduced failures.
Native app/device runtime, RTL and 400% zoom remain unverified.


## Farming Villages approval and playable prototype — 9 October

Matthew subsequently explicitly approved the numerical Farming candidate and requested implementation, matching vector artwork, testing and repository documentation. This extends the earlier presentation-only scope. The [Farming prototype specification](farming-villages-prototype-2026-10-09.md) records its economy, conservative Forager handoff, one-time ownership, manual Granary stops, actual completion measurements and the unauthored Farming-specific fracture limit. Existing Forager balance, approved nine designs and Bots-matched mobile dock remain intact. Shared Farming Page maintenance is handled separately by the parent task; this implementation does not edit it.


## Farming era shop — 9 October follow-up

Matthew explicitly requested purchases separate from progress bars because Granaries were hidden outside required-storage stops. Farming now has an always-visible main-scroll Era shop with Granary ownership, next price, +160 storage, total capacity and authoritative disabled reasons. Completed automatically constructed upgrades have a separate group; finished Pasture and Waterworks leave the activity list. Kiln production and Hall shipments remain real cycles. This follows Bots density and Research purchase roles, preserving all existing balance and the accepted mobile dock. Expanded Settings contains no duplicate purchase card.

The final shop result has 42 browser check groups, zero runtime exceptions, a separate mobile last-row/expanded-detail reach check, and thirteen inspected Library-backed PNGs. Root16/text1/zoom100 default mobile and desktop collapsed/expanded states, narrow/enlarged text, Interface sizes and German were verified. Final aggregate: 2,177 passes / 93 unchanged baseline failures / no introduced failed names. An overlapping earlier run had two five-second frontend timeouts, resolved in isolated and final quiet runs without source/configuration changes. Native runtime, RTL, 400% zoom and fluent translation review remain unverified. The supplied screenshot reference could not be read as pixels: fresh supported transfer ultimately returned HTTP403. The reported state was reproduced locally; see the Farming prototype specification for evidence, opening steps and limits.


## Compact Farming shop and secondary bar — follow-up

Matthew requested a shop item only slightly taller than production bars. The Granary row now retains existing text sizes and 44px controls while showing icon/name, ownership, +160 storage, next cost and Buy/status in 60.375px, versus 52.46875px production rows at default root16/text1/zoom100. The desktop row uses a single production column; enlarged text wraps the action without overlap. Full ownership/capacity/admission explanation remains a native disclosure. Housing weathering's actual 0–100 bar is visible in the header even with Settings collapsed, with the existing risk threshold and repair explanation. Fractional assignments have an approximate-average label and visible explanation; whole worker totals and all numerical mechanics remain unchanged. Accepted artwork, constructed-upgrade separation, inline recipes, timers, input states and dock are preserved.

Final evidence: 54 main browser check groups, separate scale/reach checks, zero runtime exceptions, interrupted durable-write recovery, repeated-click single purchase and reload persistence in disposable state. Default mobile/desktop collapsed/expanded and affordable/unavailable screenshots, narrow/enlarged text, Interface sizes, landscape and German were inspected. Local child-overlap checks caught and verified the 320px/200% repair. All 25 final PNGs have confirmed Library receipts. Final aggregate: 2,177 passes / 93 unchanged baseline failures / no introduced failing names; all 79 relevant cases pass. Browser/native builds, lint, locale integrity/compilation and generated-data checks pass. Existing bundle warning and previously documented timeout sensitivity remain; native runtime, RTL, 400% zoom and human translation review are unverified. The parent/user still needs to review the new composition's pixels. See the [Farming prototype specification](farming-villages-prototype-2026-10-09.md) for details.


## Homes-local weathering and compact Village group — review correction

The weathering bar's preceding top-header placement is superseded. The actual 0–100 state now stays exposed below the Homes construction/repair bar within its ordinary row, at .48rem versus .72rem for construction. Homes' existing full-row disclosure contains the weathering/repair explanation; Settings need not be expanded. Orange risk label/fill and explicit Housing at risk text preserve warning clarity. The global header has no weathering panel. This row scrolls normally, and expanded mobile review captures keep the complete row in view. Constructed upgrades now stays within the Village column with its unchanged automatic-construction explanation and membership. The accepted compact Granary footprint, economy, artwork, labor display, input recipes, timers and dock remain intact.

Final correction evidence: 55 main browser checks, 9 scale checks, 8 reach checks, zero runtime exceptions and 28 confirmed Library-backed captures. Actual default mobile/desktop collapsed/expanded and purchase states, risk, touch/keyboard Homes learning, narrow/enlarged text, Interface sizes, German, construction bounds and durable-purchase recovery were verified. All 79 relevant tests pass against the correction, as do browser/native builds, lint and whitespace checks. The aggregate was not rerun for this presentation-only change; its prior 1387249b result remains 2,177 passes / 93 baseline failures. New pixels await parent/user review. Native runtime, RTL, 400% zoom and fluent translation review remain unverified. See the [Farming prototype specification](farming-villages-prototype-2026-10-09.md) for measured placement and verification limits.


## Purchase action and weather track — draft polish

Farming now reuses the actual Infinity purchase Button gradient and states via a shared variant, preserving Infinity's original palette, computed styles and bounds in default mobile/desktop comparisons. Farming keeps 13.44px action text, a minimum 44px target, and local top alignment when Granary details open. The beside-Buy arrow and vague Needs inputs presentation are removed. Required costs remain visible, while an input-blocked purchase shows exact current-stock shortages with named details through the existing full-row native touch/keyboard disclosure. Purchases above production is a working review direction, not a settled user convention. Its default card remains 60.375px tall against a 52.46875px activity row.

Weathering remains a .48rem secondary track below Homes' .72rem construction bar, and now inherits the ordinary track border, background, radius and lighting. Real state, risk, repair, economy, icons, recipes, labor, focus and dock behavior remain unchanged. Final evidence: 57 main, 9 scale and 11 reach checks, zero runtime errors; reference/repeated Infinity comparisons each record 5 check groups and match original styles/bounds. All 102 relevant tests pass against final code, including 23 Infinity cases; browser/native builds, lint, data, locale catalogs, Electron syntax and whitespace pass. No repository tests were changed. The full suite was not rerun for this presentation revision; the prior 1387249b result remains 2,177 passes / 93 baseline failures. New pixels await parent/user review. Native runtime/device, RTL, 400% zoom and fluent translation review remain unverified. See the [Farming prototype specification](farming-villages-prototype-2026-10-09.md) for the exact shortfall, visual and verification evidence.


## Farming purchase recipe order — approved narrow follow-up

Matthew liked the latest styling and requested removal of the separate Need
shortage summary beside Buy. Granary now shows Materials cost, Tools cost, the
existing Research conversion triangle, and the Food-storage icon with 160,
using the shared inline quantity primitive and canonical granary-capacity value.
For the third purchase this reads 140 Materials + 13 Tools ▶ 160 storage.
Required costs keep their orange/green state colours; exact named shortages and
storage meaning remain available through the existing full-row disclosure.
Purchases stays above production, the shared Infinity gradient Button and its
states are unchanged, the default row remains 60.375px with a 44px Buy target,
and Homes weathering retains its accepted ordinary-track styling. No economy,
asset artwork, locale catalog, or repository test changes were made.

Final verification for this follow-up: browser/TypeScript build, production-store
boundary, lint, whitespace checks and all 23 focused Farming/frontend/era tests
pass. Thirty isolated Chromium check groups record zero runtime exceptions and
cover desktop/mobile sufficient and insufficient resources, native keyboard
purchase disclosure, required-cost/output order, gradient/disabled state,
minimum targets, Homes-local weathering, 80/100/130/150% desktop Interface sizes,
360px/130% and 320px/200% text, compact landscape and German. All seventeen final
screenshots and the dark icon contact sheet were personally inspected; nineteen
Library exports have confirmed receipts. Nine original Farming SVG/WebP pairs
and the five reused runtime assets are exported with byte hashes in an archive;
no replacement artwork was generated. Native hosts, RTL, 400% browser zoom,
reduced-motion/forced-colour modes, fresh/repair-risk states and touch dispatch
were not rerun in this narrow follow-up. Full-suite evidence remains historical,
not a current aggregate. The existing >500kB bundle warning remains. Parent/user
pixel acceptance of the newly ordered recipe remains pending.


## Farming storage wording — explicit correction

Matthew found the Food icon beside 160 misleading because a Granary increases
capacity rather than granting Food. This supersedes the preceding icon-only
purchase output: the compact recipe now reads costs ▶ 160 storage, with no Food
icon in that output. The existing localized storage label is reused with its
redundant plus removed in English and the seven translations; ten compiled
catalogs were regenerated. Costs, conversion glyph, layout, colours, shared
Infinity action styling, Homes weathering and gameplay remain unchanged.

Both supplied Library screenshots were materialized and inspected. Eight final
captures were personally inspected and saved to Library. Default desktop/mobile
sufficient/insufficient resource states retain a 60.375px row and 44px Buy target.
Sixteen isolated Chromium check groups pass with zero runtime errors, including
360px/130% text, 320px/200% text, compact landscape and German. Browser/TypeScript
build, production-store boundary, lint, locale integrity/compilation, whitespace
and all 23 existing focused Farming/frontend/era tests pass. No art or repository
tests were changed. The existing bundle warning and previously reported native,
RTL, full-suite and 400% zoom verification limits remain. Parent/user pixel review
of this wording correction is pending.


## Approved Forager focus-rate trial — 10 October 2026

Matthew approved implementing the measured candidate for local playtesting at
04:31 UTC. Forager now uses six times its previous base work. Selected jobs
receive 12× Balanced work rates and their existing supports 6×; allocation,
recipes, costs, population gains, gear and gates remain unchanged. Growth
supports Gathering, Hunting and Toolmaking; Travel supports Hunting and
Hideworking. Travel is the focus name; Exchange Networks remains the Trade job.
Focus effects appear in the existing upward Infinity-style Settings body;
raised 32px focus tabs and the compact collapsed footprint remain unchanged.

A per-era balance marker preserves V4 paid receipts, progress, quoted inputs
and original rates until they finish once; subsequent Forager cycles use the
new work/rates. Existing Farming states retain their previous Forager transfer
receipts and rates. Farming production, recipes and compact storage purchase
presentation are unchanged. Reward quantities and the optional continuation
architecture are unchanged by this balance-only approval; seven-point placement
and finite-history reward migration remain separate pending work.

Independent candidate measurements without spending: Balanced 117:23,
Supplies 81:59, Growth 43:15 and Travel 53:06. Growth until four Camps, then
Travel completes at 19:34. Verification and pixel review are recorded in the
implementation handoff; this approval authorizes local playtesting, not release.

Final local checks: 87 focused Forager/Farming/Stored Time/era tests and 42
canonical mapping tests passed on Node 24.11.1; production build, lint,
translation completeness and whitespace checks passed. The seven real locales
retain all 2,578 messages; native-language review remains pending. Production
code reproduced all four independent fixed-focus ledgers and the switching
policy. Legacy V5 Farming transfer and active states were deeply identical after
hydration and 500 seconds of advancement against the previous model.

An existing Forager allocation-name overlap at 200% text was corrected through
scoped intrinsic wrapping. Desktop 80/130/150% interface scales, 360px mobile,
320px/568px at 200% text, 130% text, landscape and German were checked in an
isolated mock-keychain Chromium profile; the expanded body remains scrollable
at small heights. Farming affordable/unaffordable states were rechecked at
both widths, including the food-icon storage output and ordinary Homes
weathering track. Screenshots and geometry evidence live in the local
`forager-implementation` handoff, pending Matthew's visual/playtest feedback.
Detached Stored Time boundary settlement tolerates only bounded floating-point
roundoff (256 machine-epsilon units of the clock), scoped to new Forager states;
Farming's clock is unchanged. Native hosts, full-suite, RTL and 400% zoom remain
unverified. The existing >500kB bundle warning remains. No cloud saves, releases,
real-account writes or native launch occurred.

The combined final test run passed all 129 tests. A separate production-application
probe compared active advancement with one, two and ten successful Stored Time
spends at 60, 120, 600, 640 and 1,000 seconds. All 15 cases had exactly equal
resources, rewards, population, gear and completion counts, with sub-microsecond
progress differences. The roundoff boundary includes the existing automatic
gear calendar. Independent study comparisons retained exactly equal discrete
ledgers; the largest observed numeric difference was 2.33 nanoseconds.
