# Current Simulations specification — 8 October 2026

**Status: 22 October automatic village allocation, season-end food collection and compact worker/capacity counts implemented locally. Disasters remain the central Farming mechanic; the latest section supersedes manual staffing controls. Player review and native-device validation remain. Forager remains the visual reference.**

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

## Approved two-age beta scope — 10 October, 07:02 UTC

Matthew requires the beta to contain Forager and Farming with their actual
Catalyst rewards, then a clear endpoint saying More coming soon. Later ages
must not be presented as playable placeholders. The completed Farming screen
now names both finished ages and includes that notice, using the existing
preview composition and all ten compiled catalogs. Existing paid-work settlement
and frozen completed-village behavior are retained. Narrow completion copy wraps
without clipping; no new age, action, reward or artwork is fabricated.

The seven Forager plus six Farming total remains a release blocker. Current
opening/completion domain progression produces six plus six. The extra Forager
point's placement, finite continuation-reward retirement and historical receipt
quantity/compensation policy are pending. Farming's six real checks currently
credit one each through the existing wallet, subject to its existing eligibility
and capacity deferral; Farming-specific fracture effects remain unauthored.
Do not claim that endpoint copy resolves these reward decisions. Exact terminal
state, localization/browser evidence and remaining limits are recorded in the
[two-age endpoint audit](../audits/ids-two-age-beta-endpoint-2026-10-10.md).

Migration must be one-way. A prefix rename is exploratory: no production storage
key, codec or app/account identity has been renamed. The [save-safety audit](../audits/ids-rework-beta-save-safety-2026-10-10.md)
records the concrete migration proposal and why changing the prefix alone causes
public startup to recover older gameplay instead of refusing a future schema.
No native launch, release, remote push or real-save/cloud write is authorized by
this status update.

## Approved Farming city readiness and narrow-text correction — 10 October

Matthew approved Intensive Cultivation, Guild Workshop and Town Market, with the sixth Farming Catalyst moved to the extended readiness endpoint and the first five placements unchanged. These projects are now implemented locally using the existing paid-job/automatic-plan system. No grandfathering or compatibility migration for undeployed Farming villages was added. First Cities remains unavailable; explicit completion ends at “More coming soon.” Seventh Forager placement and Farming award banking remain separate unanswered decisions. See [the approved implementation and evidence](../audits/ids-farming-city-readiness-2026-10-10.md).

The corresponding accessibility correction preserves the raised focus styling, dense Research/Bots recipe roles, persistent dock and requested body scale. Focus targets are physically at least 44px; narrow Farming scrolls its era heading with content so enlarged recipes and endpoint actions remain readable. Browser evidence covers actual bounds/reachability and pixels; the earlier screenshot/check count alone was not complete visual acceptance. Native and fluent/screen-reader review remain unverified.

## Requested shared short-number formatting — 10 October

Matthew requested the established short numerical formatter for civilization amounts during local playtesting. Farming now uses `formatGameNumber` for resource balances/capacity, recipe inputs/outputs, Granary prices and shortages, crews/allocation, work amounts, export rates, and numeric status totals. Fractional crew values remain fractional; locale and the existing Number notation setting remain authoritative. Forager already uses the shared formatter through `formatWholeGameNumber` and needs no change. Countdown durations, bar calculations, layout and gameplay remain unchanged; no countdown-width fix is bundled.

Local verification: 31 existing formatter, notation-preference, civilization frontend/era and Farming tests pass; application TypeScript, focused lint and whitespace checks pass. Browser localhost access remains blocked and was not retried. Reference-pixel comparison, scale/mobile/long-locale, touch/keyboard and native acceptance for this text-formatting change remain unverified.

## Authorized progress smoothing and rapid-cycle protection

Matthew reported substantial jumping during the local Growth playtest and requested a proper correction, then explicitly requested the old solid-bar flicker protection with a lower reduced-motion threshold. The civilization rewrite had replaced the old Simulations compositor fill with raw native progress updates and omitted its rapid-cycle presentation. Farming's whole-game-second publications and variable-width countdowns amplified the visible steps. Source comparison used the pre-rework `SimulationsSurface` (parent of `ad67db15`) and the original interpolation change `7bcf58dd`.

Forager and Farming now share `CivilizationCycleProgress`: native `Progress` retains canonical values and wait/time semantics; an aria-hidden fill uses the old compositor-only transform composition with Bots' existing .72rem track, border, lighting and theme. Unlike the old predictive animation, this fill interpolates only between observed work samples. That intentional adaptation avoids getting ahead of Farming's funded work when tick-boundary labor changes, and prevents correction backward after worker reallocation. Unchanged samples/ordinary rerenders, including clock-only publications, retain the existing bounded animation rather than extending its lag; pause/block, invalid or missing work/rate/clock/speed, a new completion receipt, a new recipe or an authoritative reset cancel it and show actual progress. Invalid work/progress displays an empty determinate bar and cannot imply completion or solid activity. Time/speed determines interpolation cadence, capped at one real second; no React frame loop, gameplay tick or saved-progress change is introduced.

The old implementation chose medium/fast display at global game-speed multipliers 2/9, which can make a genuinely slow activity solid or miss a fast worker-heavy activity. The corrected local comfort policy uses actual cycles per real second, including crew, focus, equipment, permanent boosts and game-speed modifiers: solid activity begins at 2/s normally or 1/s under OS/browser Reduced Motion; cycling resumes below 1.8/s or .9/s respectively. Entry is immediate, with hysteresis to prevent mode chatter. Solid activity has static lighting and the existing localized cycles/s text instead of a rapidly resetting countdown. Native progress and its remaining-time accessibility text still report actual work; solid presentation never forces the semantic value to 100%. Paused/unfunded/blocked rows show canonical stationary work and infinity rather than solid activity. Slow progress still animates with Reduced Motion.

This is a conservative product policy, not an industry-mandated progress-bar cutoff or a photosensitivity certification. [WCAG's flash criterion](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) concerns actual luminance/red transitions and combined flashing area, not cycle frequency alone. [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [Xbox XAG 117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117) inform the motion/flash distinction. Existing Reduced Motion and boost controls are retained; no unrelated settings or motion-control redesign is added. Whole-screen flash analysis remains unverified.

The justified local countdown-geometry correction reserves 7ch, then retains the widest measured timer/rate text in font-relative units via resize observation. Losing decimals, changing to infinity or scaling text cannot repeatedly contract the adjacent track; longer/localized text can grow the reservation rather than clip. This correction is authorized by the requested bar fix and introduces no shared sizing convention.

Verification: the real Forager renderer regression failed on the original native-bar implementation for missing animation, then passed after correction. The final full Vitest suite passes: 2,345 tests across 216 files, including formatter/notation, Forager/Farming engine, frontend/era and presentation regressions. Coverage includes coarse samples, worker/rate changes, clock-only publications with bounded catch-up, ordinary rerenders, speed modifiers, cycle/recipe/reset boundaries, invalid/missing/zero inputs, blockers, threshold/hysteresis transitions, live Reduced Motion changes, accurate semantic values in solid mode, nearly finished jobs using full-cycle frequency, mounted Forager-to-Farming cleanup, scaled timer observation and compositor failure/cleanup. An earlier full-suite run alongside the production build hit the existing Stored Time test's five-second timeout (2,344 passes); the full rerun without concurrent build passed without code or timeout changes. Application/node TypeScript, full lint, production build, bundled-promotion validation, production Store boundary and whitespace checks pass. The build's temporary tsx IPC pipe initially encountered sandbox EPERM; the standard permission-reviewed build retry succeeded. No browser localhost retry, native launch, deployment, push, install or real-save access occurred. Reference pixels, 80/100/130/150% app scales, mobile/enlarged/long-locale/RTL, forced-colour pixels, touch/keyboard and native acceptance remain unverified because supported browser access is blocked. The existing development server remains running and received HMR updates; these are compile evidence, not proof of current browser pixels.


## Continuous Farming carry-over correction — isolated candidate, 11 October 2026

Matthew explicitly selected continuous inherited income and housing weathering.
The candidate keeps the approved per-minute rates, bills, outputs, upkeep and
focus weights. Farming now advances one shared elapsed-time interval to paid
completion, funding, storage or weather boundaries, then settles ownership and
recomputes admissions/labor before consuming the remaining time. Paid receipts
retain their original bill/output; blocked inputs never accrue free work.

The candidate retains paid work and applies the old `tickRemainder` once.
Optional saved linear anchors/deadlines preserve partition/reload arithmetic;
manual-gate previews subtract already-owned old time from newly chargeable time.
Earned Catalyst entitlement survives later housing loss through a private award
predicate. Public dock readiness and Finish still require current supported
Homes and the original current-state criteria. Exact
repeated idle weather states can batch whole periods; they require identical
stocks, targets and ownership, with partial periods handled by the same engine.

A differential audit exposed an admission-order defect: a paid Tools/Goods
batch could spend Materials after that row had been checked. A later externally
partitioned update admitted Materials earlier than the large update, changing
shared labor allocation. Admission now repeats the same established row priority
until no additional receipt can be funded at that instant; no elapsed time passes
between those admissions. The minimal paid-Goods regression fails on the prior
candidate and passes after correction. The supplied 957.875-second replay equals
all 156 irregular partitions exactly for the reported stocks/work/clock/cycles.
The broader differential audit passes 96 cases, 864 comparisons, 1,728 reloads and
576 commands, including 166 successful Granary purchases, at its unchanged
absolute 1e-8 plus relative 1e-12 tolerance (maximum difference about 3.3e-12).
The existing full-age pacing probe retains all four values reported below.

Bars retain Bots' ordinary cycle composition and Infinity's existing dock. Their
new paid-cycle identities reset observed-work interpolation even when several
cycles finish between publications. Existing solid/high-frequency presentation,
hysteresis, reduced-motion handling and native progress semantics remain in use.
Current manual gates show ordinary/Double-Time speed because bank-funded boost
is paused there. No geometry, controls, artwork or new visual exception is added.

The earlier display-only tick-rounded rate/countdown candidate is superseded.
Pacing is measured evidence, not a correctness target; recipes are not retuned.
Final local proof: 2,381 tests across 216 files passed, including earned-Catalyst
versus current-readiness housing loss, representable/unrepresentable clock
requests, safe cycle-counter exhaustion and real Stored Time workers with both
Double-Time states. Six canonical Stored Time cases cover preview/worker rejection
through synchronous and worker-backed execution, including scaled-time overflow;
they consume zero time and preserve the checkpoint. Temporarily restoring the
prior silent-return guard makes both preview cases commit and debit .25 seconds;
the verified source was then restored byte-for-byte and all six cases passed. Lint, generated data, localization extraction/check/
compilation, TypeScript, web/native-relative builds, production Store boundary,
12 bundled promotions and Electron syntax checks pass. Generation/builds leave
the reviewed tracked diff unchanged. Proof used available Node 22.20.0; the CI
pin is 24.11.1. The isolated test config deduplicates React and inlines react-intl
because the copied dependency tree otherwise loads two React instances.

With required Granaries bought at one-second polling, unchanged 1.89/min exports
and no Fractures, full-age pacing (old → continuous, simulated minutes) is:
Balanced 149.62 → 146.38; Supplies 145.72 → 140.18; Growth 153.53 → 149.54;
Travel 147.12 → 142.24. All retain three purchases and their expected housing
loss/repair behavior. A 30-day Travel replay matches daily serialized partitions;
an exact-period trillion-second Travel probe completes in about 20ms with valid
state and 32,977,777,632 job admissions accounted for. It uses a synthetic mature
Farming village held at the unclicked Finish gate, not a full-game campaign.
A half-second paid-work update at elapsed `1e12` remains representable. Positive
intervals or required boundaries that cannot increase the finite number clock
throw a precision-exhaustion error; both ordinary admissions and period batches
reject unsafe cycle identities. These errors leave caller-owned state unchanged.
A batch-exhaustion probe near `Number.MAX_SAFE_INTEGER` rejects within the same
three-second subprocess limit. These local timing samples do not establish
arbitrary clock precision, exact extreme decimal partitions or hardware-independent
latency guarantees.

Matthew subsequently requested one migration for the 4.1.x → 4.2.x release.
The source-bound mobile internal release is 4.1.11 (Android 2026100501 / iOS
2610.5.1), writing IDSWEB1/root 20. The later Steam beta 25764326 / 2026100601
also writes root 20. Available release records show no schema-21 distribution;
21 was introduced on 10 October under a distribution hold. The earlier local
continuous-clock candidate used 22. The consolidated release now writes only
**IDLEDS/root 21, Farming version 2**. Root 22 is a reserved development-input
alias, not an intermediate write or the next published contract.

The migration validates a version-1 integer-clock carrier before numeric repair,
then copies it with only `version: 2`: paid receipts, stocks, targets, housing,
rewards, founders, elapsed time and owned remainder stay unchanged. Subsystem
version, rather than root inequality, identifies this conversion. It never
advances or rewards at load. Later advances consume the old remainder once.
Development root-22 graphs are fully validated before normalization to 21;
malformed graphs, v1 Farming under 22, mismatched transports and unknown future
Civilization/Farming versions fail. Unknown root 23 remains an authoritative
future error before backup selection. Historical released readers/refund guards
stay intact. No older-development-binary compatibility or public downgrade is
claimed.

When retired progress requires Keep/Fresh, startup, supported recovery and
manual import stage a validated session in `rework-choice-pending`. The existing
modal owns the decision; ordinary commands, Stored Time, exports, checkpoints,
active sampling, departure writes and lifecycle replay cannot publish this
candidate while pending. Startup away-time credit/acknowledgement is staged from
the admitted startup clock and joins the chosen outcome in the same atomic
publication. A manual shared import preserves its transferred bank and suppresses
sender-clock replay. The Settings import flow hands off to the decision without
claiming a completed import. No new dialog composition, copy, controls or sizing
convention is introduced.

The final candidate includes the one-time choice marker and paid-work/time state.
Exact source/receipt verification precedes temporary write/readback and atomic
replacement. Failure keeps the original checkpoint and staged choice retryable;
reopen after replacement observes the marker and cannot refund or choose again.
Inputs with no decision use the normal direct publication. A dirty receiving game
still receives its own protective checkpoint before an incoming import is staged;
that protects a separate game rather than creating an intermediate incoming
migration. Closing a staged manual import reopens that protected receiving game;
the runtime has retained the exact supplied input for intentional reimport.

The two fixed schema-21/v1 transports remain unchanged (opening and damaged paid
repair/production). Development 21/v1 and 22/v2 inputs receive exact-source archives;
verified historical destination-21/22 receipts remain immutable. New receipts and
current rework fixtures use final 21. Profiling gameplay fingerprints are unchanged;
public/legacy fixtures remain historical inputs. Beta isolation, disabled cloud and
disabled automatic public discovery are preserved.

Node owner tests exercise actual repository/application/runtime routing with
synthetic inputs and filesystem primitives, including archive/receipt/write/read/
backup/replace interruptions, repeated choices, receipt cleanup, manual import,
positive one-time compensation, paid Farming carryover and unsupported future
carriers. These are not packaged native filesystem or visual acceptance. The
full required verification and final patch are reported in the review handoff.
Integration remains held; no commit, distribution, native game launch or real-save
access is part of this candidate preparation.

The review correction treats recognized newer transport/provenance and value-codec
failures as authoritative: a schema-22 input cannot silently fall back to an older
checkpoint even when it uses a forbidden envelope. Pending imports retain their
requested publication target through the final permission check. Deferred recovery
purchase/preference effects belong to the exact staged save; failed installation
or replacement cancels that ownership, while the same owner's failed commit stays
retryable. Optional preference failures cannot reject an already committed choice.

Rendered browser/mobile/locale/scale,
keyboard/touch target comparisons and native host acceptance remain unverified:
localhost browser access is blocked and was not retried; native playtesting is
outside this task. DOM/animation tests do not establish visual acceptance.

### Approved live countdown display (2026-10-11)

Farming and Forager share the [live countdown precision and numeric spacing
standard](../ui-style-reference.md#live-countdown-precision-and-numeric-spacing):
`0.40s`, `1.00s`, `12.0s`, then whole seconds once a minute is displayed. Keep
Bots' existing tabular digit font and decimal fallback. Paid work, rate presentation, animation and accessible progress semantics are
unchanged. Timer geometry follows the subsequent natural-width correction below. Formatter and surface wiring checks cover the display contract;
pixel acceptance at app scales/mobile/long locales/native hosts is unverified
because browser preview access was denied, and no retry was authorized.

### Requested timer gap and Farming handoff styling (2026-10-11)

Matthew reviewed the current preview and found countdowns much better and stable.
He requested removal of the remaining space between track and timer: the current
text now determines the grid's trailing column, with no 7ch minimum, remembered
maximum, resize observer or measurement effect. The existing control gap and
Bots numeric font/trailing zeros remain. Unit-format changes may adjust the bar.
This supersedes the earlier countdown reservation recorded above.

“Begin Farming Villages” now uses shared `Button` purchase styling and control
text sizing, matching the restored Discovery start/purchase action and shared
Granary/Infinity treatment. The existing full-width target, pending disable,
keyboard activation and canonical handoff command remain. Two obsolete tests
requiring remembered widths/resize observation were removed; behavioral animation,
mode, accessibility and handoff coverage remains. Corrected pixel acceptance is
unverified: browser access was not retried. The recorded isolated loopback server
was restored under existing preview authorization after its default sandbox bind
was denied. Its verified source root and test-save namespace are unchanged; no
reset/import or persistent permission change was performed.


### Immediate Forager→Farming paid-work completion (2026-10-11)

Matthew explicitly chose immediate completion of already-started Forager jobs
when entering Farming, replacing the earlier wait for paid work to drain. The
transition marks only existing paid receipts complete and reuses normal output,
population and one-time Catalyst settlement. It admits no new Forager cycles,
charges no Stored Time and advances no camp/village clock, exports, equipment
timer or weather. Existing numeric-range guards retain receipts whose output
cannot be represented; these are not silently discarded or overflowed.

Previously saved `settling-forager` states use the same settlement on their next
Civilization update, including a zero-time normalization. Founder transfer is
not repeated. Fractional weighted worker allocation, upkeep, village balance,
manual gates and the isolated preview's save namespace remain unchanged.

The separate Farming Finish action still drains its own paid village jobs via
`settling-village`. That endpoint was inspected but is outside this age-entry
correction; no First Cities consumer or broader transition rule is introduced.

Verification and review patch are recorded in the task handoff. No denied
browser access was retried; current browser/native visual acceptance remains
unverified.


### Post-merge Cloud transaction correction — 11 October 2026

PR 228's green validation covered local startup/recovery and manual import. It
omitted the optional Cloud resolver: that path still committed converted remote
progress and acknowledged the download before Keep/Fresh. The beta's disabled
Cloud limits exposure, but does not make the single-publication contract complete.

The follow-up candidate passes the same choice predicate to Cloud resolution.
Selected primary or backup progress stays pending with the local receiving
checkpoint untouched. The final choice verifies the remote primary and selected
backup, archives their exact bytes, rotates the receiving checkpoint, and writes
conversion plus outcome once. Acknowledgement follows the verified local write;
failed writes retain the pending transaction. Completion callbacks belong to that
staged session and cannot acknowledge a cancelled session after a rescue import.
Selecting local progress also waits for its pending Keep/Fresh choice before
acknowledging the resolved download.

Device-local hashes of both the exact primary download and selected incoming
source are included in the final save. If the local write succeeds but
acknowledgement fails or the process stops, reopening recognizes that completed
local game before preparing remote recovery. It retains the chosen outcome and
later progress even if acknowledgement repeatedly fails or the backup vanishes.
Acknowledgement/publication remains disabled if the selected backup changes,
becomes unreadable, or a newer valid/future backup precedes the preserved source;
the primary hash alone cannot authorize resolving a different recovery input.
It does not offer compensation again. Cloud/shared exports and manual imports
strip both completion hashes. Future primary/backup/local inputs block fallback.
Changed primary/backup inputs reject a pending commit; changes after local commit
or acknowledgement failure keep Cloud reporting disabled. The provider checks
stale acknowledgement and unacknowledged remote changes before marker/publication
writes. After rotation and temporary-file fsync it checks the exact primary again,
immediately before renaming the prepared current or acknowledgement marker. A
failed guard preserves current/marker bytes and attempts to remove the abandoned
temporary.
This detects changes through those asynchronous boundaries, including after
portable preflight. Ordinary filesystem operations offer no cross-process
compare-and-swap: an external writer racing the final read-to-rename interval
remains a limitation. Cloud stays disabled; these checks do not authorize enabling
it or claim universal concurrent-writer safety.

Proof uses the actual production application and portable repository with a
synthetic Cloud adapter, and the existing Steam provider with disposable temporary
files. No Cloud accounts, real saves, release, browser, native game launch or
Cloud enablement is involved. Rendered and actual host acceptance remains
unverified. This follow-up is a local review candidate, not a pushed or merged fix.


### Current-source PC handoff — 13 October 2026

Matthew authorized committing and pushing all current intended source to main.
The final notification preview, timer v2/natural-width/button corrections, instant
Forager handoff and corrected Cloud transaction candidate are integrated together.
Earlier local/held status paragraphs above record historical preparation state;
this handoff supersedes their source-publication hold without authorizing release
or Cloud/achievement enablement. Current gameplay/balance and the separate Farming
Finish settlement remain unchanged. Full pinned-Node verification passes 2,473
tests in 219 files and all required checks; corrected rendered/native acceptance
remains unverified. See [the checkpoint inventory](../qa/pc-handoff-2026-10-13.md).


## Forager simplification and compact purchases — 14 October 2026

The user's latest request supersedes the older automatic housing, expedition,
trade and bottom workforce-focus designs. Forager has four automatic activities:
Gathering, Hunting, Toolmaking and Hideworking. Gathering/Hunting priority is a
single-choice radio control inside those activity rows, with arrow/Home/End
keyboard selection. Selected priority increases that activity's allocation weight
fourfold. The separate bottom workforce distribution and focus controls are removed.

Tents and Camps are immediate manual purchases. Their existing escalating bills
remain; a Tent adds two residents, while a Camp consumes three Tents and adds three
residents. The presentation reuses Farming's compact Granary purchase classes:
owned quantity, inline costs and population output, and a small trailing Buy button.
Explanations and missing resources appear only in the expandable purchase details.
Automatic Toolmaking and Hideworking consume available inputs without the old
housing stock reservations.

Seasons run for ten simulated minutes each, starting Spring, then Summer, Autumn
(or Fall in US English) and Winter. Gathering produces four Food in Spring/Summer
and one otherwise; Hunting produces twelve Food in Autumn/Winter and three
otherwise. Gathering Materials increase from three to six in Autumn/Winter;
Hunting always produces two Hides. A paid/in-progress cycle retains the output
recipe admitted when it started. The calendar handles season boundaries during
bulk advancement.

Catalysts now use population targets displayed as current/required population.
The implementation uses 5, 10, 20, 40, 80, 160, then doubling targets; these numeric
thresholds are the implementation's tuning choice. Farming opens at population
160 or an existing sixth Catalyst award. Save migration preserves stocks,
population and awards and refunds committed inputs from removed activity queues
once. Existing retained production cycles keep their receipts.

Offline boost is capped at 8x in simulation validation and its slider.

Local verification: 130 focused tests pass across simulation, Farming, durable
frontend commands, offline boost and activity presentation. TypeScript and the
production build pass. Browser inspection covers the compact desktop and 360px
purchase layouts, German at enlarged interface size, row priority keyboard
selection and expanded housing details. Native platforms, fluent translation
review, screen-reader use and the full aggregate test suite remain unverified.
These pixels await user review.


### Forager completion dock correction — 14 October 2026

The separate opening-complete heading, handoff paragraph and button section are
removed. Until the sixth Forager Catalyst is earned, the existing bottom dock
shows Next Catalyst with the population icon and current/required count (the
localized population label remains available to assistive technology). Once
earned, a single “Begin Farming era” button replaces that progress in the dock.
The canonical handoff gate now requires the earned sixth Catalyst; reaching a
population threshold without its award does not independently open Farming.


### Restored settings and season status — 14 October 2026

The shared upward-expanding settings gear is restored. Immediately to its left,
a flat white seasonal symbol and shared formatted countdown show the current
season and time until the next. The earlier season row above production is
removed. Settings show the season name/effects and the existing Gathering/Hunting
priority choice; the activity-row priority controls remain available. Editable
season masters are in source-assets/skill-icons/seasons; Spring/Autumn reuse
existing Forager leaf geometry. The dock retains its Catalyst/Begin Farming switch.

The navigation sidebar no longer reserves an empty scrollbar gutter when it does
not overflow, so the visible left and right button insets match.


### Farming presentation alignment — 14 October 2026

Farming now uses the visible resource legend with population in the header,
the same compact progress/action dock, seasonal symbol/countdown and upward
settings panel as Forager. The workforce balance/focus choices and expanded
allocation breakdown are removed. Existing stored allocation and facility
mechanics are preserved. The season calendar continues from Forager elapsed time
plus Farming elapsed time; this display adds no seasonal production modifiers.
The existing Establish the village action replaces dock progress when ready;
the completed endpoint stays concise. No next era is invented.

Local verification: 44 existing Farming/application tests, TypeScript and lint
pass; desktop and narrow enlarged German collapsed/expanded settings inspected.
Native platforms and completed-state visual review remain unverified.


### Forager input tuning — 14 October 2026

Toolmaking now costs 5 Materials per cycle; Hunting costs 1 Tool; Hideworking
adds a 10-Tool cost alongside its existing 2 Hides and 1 Material. Already paid
cycles retain their original bills; new cycles use these costs.


### Forager production chain revision — 14 October 2026

Supersedes the food-priority and equipment rules above. New camps begin with one tent, three workers, and no material stockpile. Gathering unlocks Toolmaking; its first completed cycle unlocks Hunting; the first hunt unlocks Hideworking; the first processed Leather unlocks manual housing. Materials make Tools (5 Materials -> 2 Tools); Hunting consumes 1 Tool; Hideworking consumes 10 Tools and 2 Hides -> 1 Leather. The historical `clothing` save key now represents Leather.

A Tent starts at 6 Food, 2 Leather and 1 Tool, adds one tent and two workers. A Camp starts at three tents, 12 Food, 4 Leather and 2 Tools, adds one camp and three workers while retaining existing residents. Existing lifetime purchase price scaling remains. Purchases are manual.

Workers choose the highest available job in this order: Hideworking, Hunting, Toolmaking, Gathering. Eligible jobs each receive one worker where population allows; remaining workers are shared with weights 8:4:2:1 in that priority order. Small populations use priority order when there are fewer workers than eligible jobs. Paid receipts remain intact when a crew changes. Hunting reserves ten Tools when at least two Hides await processing. Both consumers reserve the Tools for housing whose Leather (and tents for a Camp) is already available. This allows the chain to produce Leather and leave housing affordable. Automatic equipment purchases and their labor bonus are removed from the new rules. Previous stocks, population, earned Catalysts and paid production receipts survive migration. Old auto-construction/expedition receipts are refunded once. The ten-minute seasonal rules remain.


Approved artwork: Game uses the left-facing full-body deer (concept E), selected after the in-game preview. The existing stretched-hide symbol represents Leather. The player-facing Hides resource is renamed Game; its `hides` save key, quantities, production costs and receipts remain unchanged.


Provisioning preference restored: Gathering/Hunting selection is available in activity rows and Forager settings. It persists in the existing priority field. Eligible jobs retain baseline crews; remaining-worker weights are Hideworking 8, preferred food job 4, Toolmaking 2, other food job 1. Tool reservations are unchanged.


Hunting now spends 1 Tool once, automatically when its first hunt starts. Completed Hunting history retains the unlock across saves; all later hunts have no inputs. Existing paid hunts retain their receipts. Hunting no longer needs a Tool reservation against Hideworking or housing because it has no recurring Tool cost. Hideworking and housing costs are unchanged.


Hunting unlock is now manual: a compact purchase row in Provisioning costs 1 Tool after Toolmaking completes. It becomes the Hunting production row after purchase. Preference controls in both production rows and settings remain hidden until Hunting is owned. Existing paid/completed hunts retain ownership. Selector circles use the dark bar-track background. The Catalyst footer shows only its icon, an inline production-style bar, and current/required workers; Next Catalyst remains an accessible label only.


### Four-season balance — 14 October 2026

Approved replacement for the two-profile calendar above. Each season still lasts 600 simulated seconds. Gathering yields Food/Materials: Spring 4/3, Summer 3/5, Autumn 2/6, Winter 1/4. Hunting yields Food/Game: Spring 6/2, Summer 3/1, Autumn 12/4, Winter 9/1. Annual totals for equal cycle counts remain unchanged. Cycle-start yields remain funded through a season change and reload; historical receipts remain valid.

Hideworking now costs 4 Tools and 2 Game per Leather. Base Tent Food cost is 40; Camp Food cost is 100. Existing Leather, Tool, tent-conversion, population rewards and price scaling remain unchanged. No upkeep, decay or starvation is added.

Provisioning pools its allocated workers and shares their time two-to-one toward the selected job. Both jobs advance even with one pooled worker. Craft allocation retains its priority and reserves 4 Tools plus an affordable housing Tool bill before admitting Hideworking. The displayed provisioning crew is its effective fractional labour share, not an extra population grant. Switching preference conserves total labour and preserves paid cycle progress. Seasonal settings show actual current-season recipe amounts; in-flight rows retain their paid output.

Verification: 70 focused simulation, Farming and frontend tests pass; TypeScript, lint, translation checks and production build pass. Desktop and 360px German at 130% Interface size inspected, including preference switching and expanded season details. Fixed-priority synthetic runs buying housing whenever affordable reached 160 population in 44,610 simulated seconds (Gathering) and 40,580 (Hunting), without fractures. These establish progression viability, not an optimal seasonal policy. Native platforms and other Interface sizes were not checked for this change.


### Chieftain and seasonal settings — 14 October 2026

The Chieftain purchase appears after the first Camp and requires two currently owned Camps. Camps are not consumed. The one-time cost is 3 population, deducted from workers and populationGranted; earned Catalysts are retained. Hiring enables automation, and a persistent On/Off button allows returning to the existing Gathering/Hunting radios. The radios show the current automatic choice and are disabled while the Chieftain is on.

The Chieftain targets a Camp when at least three Tents are held, otherwise a Tent; its purchase row shows this growth target. Every 30 simulated seconds it compares the provisioning time required for that housing bill under each two-to-one allocation, including Food, Materials for Tools, and Game for missing Leather. Already-funded outputs count toward stock. A switch requires at least a 10% improvement. When the immediate bill is supplied, it prepares a Game buffer in autumn or a Materials buffer in other seasons. Automation never buys housing or consumes Camps. Decision deadlines are saved and included in offline advancement so tick partitioning cannot change decisions.

The bottom settings expansion contains only seasonal information. Its duplicate food-priority label/dropdown and explanatory worker-sharing paragraph are removed. Existing seasonal spacing is unchanged.

Verification: 74 focused domain/application/UI tests pass, including failed-save purchase rollback, one-time population debit, retained Camps and Catalysts, on/off persistence, scarcity/season choices, and serialized split-tick equivalence. TypeScript, lint, all locale catalogs and production build pass. Desktop and 360px German at 130% Interface size checked, with purchase disclosure, on/off, reload, scrolling to the Chieftain and season-only footer. Native platforms and other scale settings remain unverified.


### Leadership and independent priorities — 14 October 2026

Supersedes the previous single-priority and population-price designs. Provisioning and Craft each have a separate row-radio selection: Gathering/Hunting and Toolmaking/Hideworking. Within each pair the preferred available job receives twice its counterpart’s worker time. Switching a pair preserves the other pair’s labour share. Unavailable jobs release labour, and paid work is retained through changes. Craft defaults to Hideworking; Provisioning keeps its saved preference. An interim saved craft choice in the original priority field migrates to craftPriority.

Chieftain is renamed Leadership. It requires two Camps (retained), costs 12 Tools and 6 Game, and its compact purchase recipe reads those inputs -> Auto-Priority. It automates both independent choices when On. Each decision compares the appropriate pair’s housing-input deficits, including Tools and Leather for Craft and seasonal yields for Provisioning. The saved 30-second decision interval and 10% switching margin remain. Existing ownership is retained; old population-priced ownership refunds the three residents once without charging the new recipe. Once two Camps exist, Hideworking reserves the hiring resources until Leadership is acquired, so automatic crafting cannot consume the unlock’s stockpile.

Leadership uses the user-supplied second icon (person with star badge), chosen for small-size clarity. The original transparent 512px PNG and its alpha-traced editable SVG are preserved in source-assets/skill-icons/forager. Runtime is a supersampled transparent 256px lossless WebP.
Resource totals now follow Provisioning/Craft and precede Settlement. The seasonal footer removes its extra bottom body padding while retaining the gear button's touch target.

Verification: 76 focused simulation, Farming and frontend tests pass, including independent priorities, purchase conservation, migration refunds, save-failure rollback and offline decision boundaries. TypeScript, lint, locale checks and production build pass. Desktop and 360px German at 130% Interface size inspected for resource order, wrapped craft rows, expanded Leadership help, scrolling and seasonal footer. Native platforms remain unverified.

Header spacing correction: removed the zero top-padding override from civilization-scroll, restoring the shared game-card-content-inset below the era divider. Verified the running English Forager screen at its current scale and 360px width; measured 7.2px matching the shared inset. Other scales, locales, Farming and native hosts were not rechecked for this one-line correction.

Locked Forager purchase presentation: buttons retain Buy while disabled. Unmet unlock prerequisites replace the compact price; Leadership displays localized Requires 2 plus the Camp icon, with Camps named accessibly and in the disclosure. Hunting and housing show their cycle prerequisite until unlocked. Real prices return once the prerequisite is met; affordability alone retains the price. Checked Leadership at desktop and 360px in English; other locked rows, locales, scale settings and native hosts were not visually rechecked.

Resource reveal/order revision: Population always leads; Food/Materials, Game/Tools/Leather, then Tents/Camps form three stock groups. Resources appear after stock or completed production establishes acquisition and remain visible at zero after production. Camp purchase reveals at two held Tents or a recorded Tent purchase, retaining visibility after conversion; previously built Camps also retain access. Three columns on wide screens reflow within each group on mobile for readable long locales. Verified early English and mature German (130% Interface size), desktop and 360px. TypeScript and 11 existing frontend tests pass. Other interface sizes/native hosts remain unverified.

Resource layout clarification: the approved sequence is ordering only, not fixed row groups. Restored the original single auto-fit resource grid with Population, Food, Materials, Game, Tools, Leather, Tents, Camps. Acquisition visibility and Camp reveal rules remain. Verified desktop and two-column 360px English; TypeScript passes. No new layout exception; other locales/scales/native hosts were not rechecked for this restoration.

Icon-only stock revision (explicitly approved): move the existing responsive stock grid above Provisioning/Craft, preserve ordering/reveal rules, and remove visible stock names while retaining accessible names. Expanded Infinity-style settings now contains a localized Resources icon/name key for every Forager stock plus Population. Seasonal Gathering/Hunting yields use existing icon/quantity components and wrap naturally inline. Checked English expanded settings and stock at 360px and 1280px; TypeScript passes. Other scales/locales/native hosts not rechecked for this revision.

Compact stock clarification: icon-only totals now use a content-sized wrapping flex row rather than stretched grid cells. Each icon stays beside its number using the standard .16em symbol gutter; existing section spacing separates pairs. Verified desktop and 360px English with expanded settings. Other scales/locales/native hosts not rechecked.

Seasonal yield alignment correction: explicitly centre icon/number pairs and their surrounding activity line, matching the top stock alignment rather than the shared inline baseline default. Verified pixels and measured matching vertical centres in the running English preview. Other locales/scales/native hosts not rechecked for this CSS-only correction.

Craft priority reveal: Craft radios and radiogroup semantics now wait for Hideworking to unlock. Provisioning retains its Hunting unlock gate. Verified running early-game desktop preview has Provisioning choices but no lone Toolmaking radio; TypeScript passes. Other viewports and the mature state were not rechecked for this visibility-only change.


Opening challenge and Convergence (Matthew, 14 October 2026): Beginnings is automatically active from a new game and completes after all ten Bots goals. It awards Simulations access only; each goal retains its ordinary SP reward. The persisted completion survives Infinity and Transcendence. Existing unlocked civilizations retain access. Challenges remains available from the start and ends with Convergence progress out of ten (Beginnings plus the nine replacement challenges). All ten completions enable continuous Galactic Brain growth at ln(2)/1800 per game second, doubling the current total in 30 game minutes. Growth is credited to generated ownership, never creates the first Brain, respects facility prohibitions in challenges and uses the canonical active/Stored Time arrival path. Resets still clear Brain ownership normally; the earned entitlement remains.

Verification: 119 focused simulation, snapshot and challenge interaction tests pass; TypeScript, lint and translation structure checks pass. Existing flat Infinity challenge cards are reused for opening/reward progress. German at 130% Interface size inspected on desktop and at 360 CSS pixels with no horizontal overflow; the footer remains reachable. Other Interface scales, separate enlarged text, unlocked Convergence visual state and native hosts remain unverified.


Correction (Matthew, 14 October 2026): hide Simulations from both drawer and bottom navigation until Beginnings is complete, and redirect stale locked route requests to Bots. Remove the locked Beginnings panel entirely. Previously started civilization data remains saved but does not bypass this gate. Convergence retains its completion count; its Galactic Brain effect description is revealed only at six completed challenges, while activation still requires all ten. This supersedes the earlier existing-civilization access exception.

Simulations reveal refinement (Matthew, 14 October 2026): hidden before 4/10 Bots goals; at 4 through 9 goals show the disabled Simulations destination with the existing Infinity-style navigation progress bar in drawer and bottom bar. Fill is completed goals / 10, with localized accessible progress. At 10 goals remove the bar and enable access permanently. Keep the locked content panel removed and stale-route guard intact.

Reveal verification: 16 snapshot tests pass, including 3/4/9/10-goal boundaries; TypeScript and locale compilation/structure checks pass. A separate synthetic 4-goal save shows disabled Simulations with 40% fill in both drawer and bottom navigation, visually inspected in German at 130% Interface size. Other scales and native hosts remain unverified.

Reveal threshold update (Matthew, 14 October 2026): Simulations now appears after the first completed Bots goal (1/10), superseding the four-goal reveal threshold. Both navigation progress bars and the ten-goal permanent unlock remain unchanged.

Navigation order correction (Matthew, 14 October 2026): Simulations precedes Challenges in both the drawer and bottom navigation, including the navigation-shortcut settings list. Reveal at 1/10 and unlock at 10/10 remain unchanged.


## Internal release endpoint — 15 October 2026

Matthew requested the current main changes with progression capped at Forager
until Farming Villages is ready. The sixth-Catalyst dock retains its existing
Infinity-style composition and shared purchase button, now disabled. Normal
Farming entry is rejected without changing or committing the save; Debug's
Farming option and direct era-jump action are unavailable too. Forager production,
housing, Leadership, Catalyst awards and saved progress continue normally.
Existing Farming saves remain readable; this cap introduces no destructive
rollback or schema change. No new shared UI convention is introduced.

The application regression failed on the uncapped source because Farming entry
was accepted, then passed with the release cap. Focused checks pass 109 tests
across frontend, canonical application/commands and Farming simulation.
Rendered verification and final release identities are recorded in the release
ledger after the candidate and all three internal destinations are verified.

Rendered cap verification: isolated Chromium with mock Keychain exercised
80/100/130/150% Interface sizes, 360px and 320px German at 130% text, and compact
landscape, with collapsed/expanded settings and disabled keyboard semantics.
The existing Infinity dock was captured for reference. The 320px German label
needed a scoped word-wrap correction; its final pixels and desktop 100% were
rechecked. No new layout pattern or smaller text was introduced. Mobile native
hosts, screen-reader delivery and fluent translation review remain unverified.

## Local Farming preview — 21 October 2026

Matthew requested Farming Villages re-enabled in the local preview. The normal
Forager handoff and Debug era jump are restored to their pre-cap behavior.
The existing prerequisites, three-person handoff, and Farming simulation remain
in place. This local change has not been released.

Verified in a disposable browser installation: Debug can select Farming Villages,
the jump saves successfully, and the Farming screen advances Fields and Woodlot
production. TypeScript and lint pass. The ordinary sixth-Catalyst handoff, mobile,
long locales and native hosts were not rechecked for this local restoration.

### Locked Hideworking placeholder — 21 October 2026

Before the first completed Hunting cycle, the current Forager rules now show a
Hideworking placeholder in Craft with “Complete one Hunting cycle to unlock.”
The row reuses the Settlement prerequisite text roles and activity panel inset.
It has no purchase or priority control; the existing activity and Craft radios
appear when the normal unlock condition is met. Legacy rules retain their
existing unlock presentation. No gameplay requirement is changed.

The locked state was inspected on desktop and at 360px. Locale catalogs,
TypeScript and lint pass. Other scales, long-locale rendering and native hosts
remain unverified.
Unlock transition verified in the same disposable session: the placeholder stayed
visible during the first hunt, then became the ordinary Hideworking activity and
Craft priority control immediately after one Hunting completion.

### Sequential Forager reveals — 21 October 2026

Correction: only the next production step is previewed. Toolmaking first shows
“Complete one Gathering cycle to unlock.” Once Toolmaking is unlocked, Hunting
can appear with its existing purchase/prerequisite row. Hideworking remains
hidden until Hunting is actually unlocked; it then shows the one-Hunting-cycle
prerequisite until the first hunt completes. This supersedes the earlier
immediate Hideworking placeholder. The simulation unlock rules are unchanged.
Verified sequential reveal in a disposable running game: initially only the
Toolmaking placeholder is shown; after Gathering, Toolmaking and locked Hunting
are visible with Hideworking absent; unlocking Hunting reveals the Hideworking
prerequisite. TypeScript, lint and locale checks pass.

## Independent era replacement — 21 October 2026

Matthew approved replacing the previous era outright. Starting Farming discards
Forager population, resources, equipment and unfinished jobs immediately. Every
new village begins in Farming with three founders, no housing/upgrades and zero
Food, Materials, Tools or Goods. There is no settlement phase, retained-camp
panel, inherited income or previous-era simulation. The Farming seasonal clock
starts at zero. Existing global rewards and the Forager award history are kept.
Completing Farming also stops it immediately and discards unfinished village
jobs; First Cities is still not implemented.

Farming subsystem version 3 removes the former transfer/income fields. Valid v1
and v2 villages migrate without changing their earned stocks, housing, upgrades,
paid village jobs, elapsed time or awards. Their old Forager state is cleared and
its income is removed. Old pending Forager handoffs enter Farming immediately;
old pending village finishes become complete immediately. Invalid legacy input
is rejected before any source state can be discarded. The root save schema stays
21; older readers reject the newer Farming subsystem.

Rewards remain six normal Forager milestones to reach Farming, with the existing
optional later population milestones still available while staying in Forager,
and six Farming milestones. No Catalyst/Fracture balance change is included.

Verification: actual browser import of a ready Forager save with running work,
normal Begin Farming activation, immediate three-person village with empty
stores and no retained-camp UI. Desktop English and 360px German at 130% Interface
size inspected using the existing Research activity/Infinity dock patterns.
A disposable full-arc probe completed standalone Farming in 9,450 simulated
seconds (four manual Granary purchases, zero Fractures), awarded all six Farming
Catalysts and preserved the completed village through serialization. The same
probe verified identical starts from 160 and 10,000 Forager people. All 34 approved
save-safety cases pass, including three old-village migration cases; TypeScript,
lint, locale validation/compilation and production web build pass. Native hosts
and other Interface scales were not rechecked. These are local uncommitted changes.


## 21 October 2026 - Farming matched to Forager presentation

Matthew requested that Farming match Forager's progress and upgrade styling and
reduce clutter. Farming now uses Forager's inline Catalyst track, count, season
clock and upward-opening settings composition. The header, compact icon-only
stock row, title/crew/recipe activity rows and purchase grid share the Forager
patterns. Purchases follow activities; the locked Granary shows its prerequisite
and the shared Buy control. An empty Village column is omitted.

Repeated activity icons, the extra housing/trade header, the visible weathering
bar on Homes, and the main-list completed-upgrade catalogue are removed. Housing,
trade, completed upgrades and resource names remain in settings; weathering
remains in Homes' disclosure. Integer values use the same compact formatting as
Forager, while fractional worker allocations remain explicit. Economy, unlocks,
input receipts and rewards are unchanged by this presentation correction.

Checked against the running Forager reference in the isolated browser: fresh
Farming, a developed village with a paid repair, running/waiting rows, locked
purchase, keyboard-opened settings and Granary details, and the final completed
upgrade detail. Desktop default and German at 130% Interface size were inspected,
including a measured 360 CSS-pixel game viewport with no horizontal overflow.
Native hosts, separate text enlargement, RTL and other Interface sizes are not
verified for this correction. TypeScript, lint and the production build pass.


## 21 October 2026 - Farming rebuilt around land, food and population

Matthew authorized a complete replacement of Farming, keeping Forager's clean
presentation and gradual introduction of concepts. Nothing in the previous
Farming economy was protected. The requested direction is permanent land
expansion, assigned workers, housing capacity, seasonal food support, food
reserves, passive burials and roughly twice Forager's duration.

### Playable rules

- Each independent run starts with three residents in one House, one fisher and
  two workers clearing woodland. No old Forager jobs or income remain.
- Woodland clears one permanent plot and supplies Materials. Its crew continues
  to the next plot. Further clearing takes longer and yields more Materials.
- Manual purchases spend Materials, Tools and (for buildings) a free plot.
  Houses provide three places; food production determines actual population.
- Food sources are Fishing, Barley, Wheat and Herding. Fields and pastures are
  permanent purchases with four worker spaces each. Fishing starts with three
  spaces; Nets adds three. Sheep provide steadier food; Cattle improves Herding.
- Workers stay assigned. Full-row disclosures contain direct count entry,
  single-worker controls, Assign available, and an atomic transfer from another
  job. Moving between food jobs does not introduce a temporary unassigned dip.
  The last food producer cannot be removed without another food job taking over.
- Each resident uses one Food per simulation minute. Food production supports
  growth immediately, limited by housing. No birth or arrival queue exists.
- Seasons last 30 simulation minutes. Barley Food per worker/minute is 5/6/7/2;
  Wheat 4/9/12/1; Fishing 4/3.5/4/3; Herding 3.5/4/4/3.5. Cattle boosts Herding
  25%; Irrigation boosts both crops 25%. Fractures retain the existing 5% bonus.
- Without a Granary, surplus food is not stored. Each Granary adds 3,000 reserve
  capacity. Surplus fills it; a production shortfall drains it. Reserves support
  existing residents only, so a tiny reserve cannot create a population spike.
- When no reserve remains, a food-driven population drop is recorded once as
  starvation deaths. Work assignments reduce from non-food jobs first. Every
  eight seasons a generation is recorded as natural deaths and immediately
  replaced, without changing population or worker assignments. Both feed one
  passive Burials statistic; deaths do not grant production or reward bonuses.
- The six population milestones are 6/12/24/48/96/192. Rewards retain the existing
  Catalyst eligibility checks, and earned milestones persist through shortages.
  At 192 the player can finish the village. First Cities remains unavailable.
- Stored Time preserves the remaining bank when a new resident is available to
  assign or the completion action is ready. Active game time otherwise continues.
- Stored Time's selectable cap is 8× initially, 12× after completing Forager,
  and 16× after reaching Farming's final population milestone. These caps come
  from saved era progress, including migrated villages. Finishing Farming ends
  its decision pause so Stored Time can still accelerate the rest of the game.

### Presentation and persistence

The current Forager header, compact icon/quantity stock row, two-column activity
layout, purchase cards, full-row disclosures and inline Catalyst/season dock are
reused. Food is a continuous rate and has no fabricated harvest bar. Woodland and
Workshop show their owned cycle, payment/output and adjacent timer. Work controls,
seasonal yield details, reserve explanation and burial breakdown are disclosed
on demand. Only unlocked activities and the next relevant purchases appear.
There are no priority radios, automatic building plan, weathering meter, shipment
chain, detached upgrade catalogue or extra food inventories in this replacement.
Purchase benefits distinguish housing/work spaces from actual recruited workers.

Farming schema 4 retains every old version 1-3 village as an immutable recovery
receipt. Houses, fields, pasture, stores and applicable upgrades are translated;
unused Goods return their base Materials, paid inputs are refunded, and invested
work is credited once against new jobs. Existing Catalyst history and completion
remain owned. New paid jobs retain their quoted costs, duration and outputs after
later tuning. The old scheduler is retained only as migration validation rules.

### Pacing evidence and verification

A disposable real-engine benchmark with zero Fractures, prompt housing purchases
and Leadership reached the current Forager gate in 700.33 simulation minutes.
Two provisional Farming policies reached 192 in 1,315.67 minutes (Barley-led) and
1,623.67 minutes (mixed crops), or 1.88 and 2.32 times that baseline. These are
optimistic scripted tuning comparisons, not promised wall times or proof of fun.
The policies make frequent workforce adjustments; actual player cadence needs
playtesting. No timers were added solely to force a two-hour legacy target.

The approved save-safety suite currently passes 35 cases, including version 1-3
conversion, the full legacy receipt, refunded inputs, invested work, and a new
paid checkpoint's save/reload. A disposable engine probe also exercised reserve
exhaustion, starvation once, natural turnover, equivalent partitioned work and
reloads. TypeScript, lint, translation structure checks, all locale compilation
and a production build pass.

Rendered-game checks used isolated development saves. They covered the opening
clearing, Workshop and first field, moving workers directly between jobs,
housing-driven growth, Granary/Nets/Cattle/Irrigation purchases, Herding output,
winter reserve exhaustion and one-time starvation accounting, and natural
turnover without workforce loss. At spring growth, Stored Time stopped spending
with unassigned residents and resumed after assigning them. The 192-resident
completion action reached the completed-era screen.

The Forager reference and Farming were compared at the same desktop width and
150% Interface size; default 100% and minimum 80% were also inspected. German at
130% was checked at measured 360px and 320px game widths and in 800px by 360px
landscape. There was no horizontal overflow; ordinary targets measured at least
44px within browser subpixel rounding. Native Enter/Space opened and closed job
details. The final mobile purchase and the resource key at the end of the
scrollable settings panel were reachable. Screenshots are retained in the local
ignored output directory.

These checks do not establish native iOS/Android/Steam acceptance, separate OS
text enlargement or browser zoom, screen-reader quality, RTL or reduced-motion
behavior. Longer ordinary playtesting remains necessary to judge pacing and
workforce-management effort. No native build or deployment was performed.

The subsequent era-speed correction was checked in the running game: a fresh
save exposes an 8× cap, a Farming save accepts and spends Stored Time at 12×,
and reaching/finishing Farming exposes 16×. After the finish action, 16× spends
Stored Time normally instead of remaining caught in the village decision pause.
The approved 35-case save-safety suite, lint and production build passed.

## 21 October 2026 - Automatic crews and minimal presentation

Matthew approved automatic stable crews, one crop and livestock, removing
Fishing and the separate Cattle choice, and retaining seasons/storage as the
food-planning decisions. He explicitly rejected paragraph-length explanations
in ordinary disclosures. This preference is also in the mandatory UI core.

- Start with three residents, one planted Field and two workers clearing land.
  Further fields and pastures are purchased. No assignment controls remain.
- Fields and pastures each supply four job spaces. Food jobs fill automatically,
  reserving up to two residents for construction. When population cannot fill
  every food job, the split follows the number of crop/pasture spaces. This
  allocation changes with population or buildings, never to chase a season's
  highest yield. It therefore leaves a real value in winter preparation.
- Remaining residents clear woodland, except one Workshop worker per 32
  residents (rounded up). Workshops make enough Tools for the largest unlocked
  purchase, with a minimum four-Tool buffer, then wait. Already-paid work finishes
  and preserves its quote. This avoids consuming building Materials to create
  thousands of unused Tools.
- Crops produce 4/9/12/1 Food per worker/minute across spring/summer/autumn/winter.
  Livestock produces 3.5/4/4/3.5. Irrigation retains its 25% crop bonus. Additional
  Pastures expand livestock directly; there is no Cattle purchase or Fishing.
- Houses, food reserves, starvation, passive natural turnover, milestones and
  8×/12×/16× Stored Time caps retain their roles. Automatic recruitment/staffing
  no longer pauses Stored Time. Only the final completion decision does.
- Clearing starts at 570 worker-seconds, retaining the increasing plot-cost
  curve. Two simple purchase policies reach 192 in 1,320.67 and 1,508 simulation
  minutes, versus the measured 700.33-minute Forager baseline: 1.89× and 2.15×.
  They make 78 and 82 purchases and zero worker assignments. These are tuning
  comparisons, not a promise of elapsed play time or optimal strategies.

Rows show name, automatic crew/current capacity, and output. Food disclosures
contain only a full-crew quantity and four seasonal yields. Work disclosures
contain named recipe quantities and a short waiting state. Purchases show costs
and capacity/production effects; their details show yields or one named benefit.
The header shows the signed food balance and reserve duration during a shortage.
Settings contain numerical facts and the compact resource key, with no repeated
assignment, growth, transfer or reserve paragraphs.

Schema 5 archives the full previous schema-4 village. Both crops combine into
Fields, paid Woodland/Workshop receipts survive, and retired Nets/Cattle return
their Materials and Tools. Versions 1-3 still retain their original archival
receipt during direct conversion. No global rewards are reset.

Verification: the running game was checked from the opening through Field,
Pasture, House and Granary purchases, automatic crew growth, surplus storage,
the signed winter deficit/reserve countdown, schema-4 import and era completion.
Food disclosures contain only the full-crew quantity and seasonal comparison;
Enter/Space activation and the compact settings/resource key were exercised.
German at 130% Interface size was inspected at 360px, 320px and 800×360 landscape;
desktop 80%, 100% and 150% were also checked. No horizontal overflow was observed,
and mobile disclosure/purchase targets measured at least 44px within subpixel
rounding. The same native-device, separate text-enlargement, RTL and reduced-motion
limits noted above remain unverified. The approved save-safety suite now has
36 passing cases, including lossless schema-4 conversion and continued paid work
after save/reload. Lint, translation checks and production build pass.

## 21 October 2026 - Logging camps and automatic Stored Time return

Matthew approved purchasable Logging camps with one free starter camp and
automatic staffing. Each camp provides eight clearing jobs. They cost Materials
and Tools, with increasing prices, and sit on the forest frontier rather than
using a cleared building plot. Clearing still awards Materials and one new plot
per completed cycle. Its paid receipt survives buying another camp; additional
workers shorten the remaining time without restarting or paying twice.

Food jobs retain their existing allocation. The Workshop retains its small crew;
the remaining workforce fills clearing jobs up to camp capacity. Unfilled labour
is shown as Idle, so insufficient camps are visible without an explanatory panel.
Schema 6 gives old villages enough camps for their existing clearing workforce,
preserves paid work and stock, and archives the original schema-5 village.
The illustrative purchase policy finishes in 1,578.33 simulation minutes
(2.25 times the earlier Forager reference), buying 15 total camps and making
96 purchases overall. This is a tuning sample, not a promised play time.

Offline Time now has an On return selector: Off, Last speed, Max speed. Off is
the default. The choice and last manually selected rate are stored in the save.
Last speed resumes that rate up to the currently unlocked cap; Max speed uses
the current 8/12/16× cap. Selecting an enabled mode applies it immediately when
the bank is usable. Pausing/backgrounding still stops consumption, then an
eligible return applies the preference after away time is credited. Empty or
flagged banks do not resume. Manual reset pauses the current boost without
discarding the preference. The final Farming decision still protects the bank.

The autumn crop peak is unchanged. It represents harvest availability, not
faster autumn growth, and is a simplified fictional seasonal model rather than
a universal real-world crop calendar. No additional explanatory UI was added.

Verification: the running game showed 8/8 becoming 16/16 clearing workers after
one camp purchase, with Idle falling by eight and the same paid cycle continuing.
Max speed resumed at 12× after importing the exported preference with its active
slider paused. Last speed retained a manually selected 5×. German at 130% in a
360px viewport showed the camp purchase and return selector without horizontal
overflow and with 44px targets. The approved suite has 39 passing cases covering
schema-5 conversion and the existing once-only away-credit case with all three
resume modes. Native background/return and separate OS text enlargement remain
unverified.


## 21 October 2026 - Preferred jobs, recovery and village disasters

Matthew approved job limits rather than direct worker assignments: in a 7/8
crew display the controls change the eight. He also approved gradual recovery,
limited occasional disasters, and shamans as a workforce tradeoff.

- Each activity has a persistent desired-job limit from zero to its building
  capacity. Its row displays actual crew / desired jobs; minus, numeric entry
  and plus edit only the limit. Building capacity is a short disclosure fact.
  Additional Fields, Pastures and Logging camps add their new job spaces to the
  limit; a new Shrine opens four spaces and requests one Shaman by default.
- Available people fill food jobs first, sharing an undersupplied workforce
  proportionally between requested crop/herding jobs. The allocator never
  increases the player's limits to prevent hunger. Shamans, the Workshop and
  Woodland then fill in that order. A stocked/input-blocked Workshop releases
  its people; funded work remains intact. Shamans fill only useful prevention
  places, so jobs beyond the prevention cap remain unfilled. Other surplus
  residents remain Idle. No fixed low/normal/high priority controls were added.
- Population no longer jumps to production's support level. Sustained production
  sufficient for one more resident allows one arrival per 120 simulation seconds,
  within housing capacity. Losing that surplus resets incomplete growth. There
  is no arrival queue. The header shows the next arrival's remaining time.
- Reserves cover negative food balance first. Once empty, each 30 unmet Food
  causes one starvation death; ongoing smaller populations consume less. Surplus Food
  repays accumulated hunger before storage or recovery. Switching job limits
  alone cannot clear hunger. At least one resident remains so the
  village can recover. Every resident still consumes one Food per minute.
- Crops produce 5/11/9/1 per worker/minute over spring/summer/autumn/winter;
  livestock produces 3.5/4/3.5/3. Irrigation retains its 25% crop bonus. Seasons
  remain predictable; there are no random weather production multipliers.
- At each season end, make one disaster roll for the season that just finished:
  spring 10%, summer 5%, autumn 15%, winter 25%. A triggered flood, fire or
  sickness kills 15% of current residents, rounded up while retaining one
  resident. These population disasters replace the old stock losses and
  temporary livestock health effect. Growth resumes at the existing gradual
  rate when housing and food permit; job limits and buildings remain intact.
- A Shrine unlocks at four Houses, costs 90 Materials / 8 Tools initially, takes
  one plot, and offers four Shaman places. Each active Shaman provides prevention
  equal to six divided by population, capped at 75% overall (one per 24 residents
  gives 25%). Prevention fully averts an event. A short event line appears for
  half a season and the latest event remains in village settings. The event RNG,
  season clock, disaster deaths and event receipt persist across saves and
  offline/Stored Time advancement, with no reroll on reload.
- Schema 7 preserves complete schema-6 villages in an archival receipt, as with
  older migration receipts. Existing stock, owned buildings, paid cycles, past
  deaths and earned rewards survive. Initial limits retain old food crews and
  full camp capacity; a later purchase is the player's explicit expansion.
- Clearing starts at 500 worker-seconds. An illustrative purchase/preference
  policy reached 192 residents in 1,332 simulation minutes, versus the earlier
  current-Forager measurement of 700.33: 1.90 times. It used 95 purchases and
  73 job-limit edits. This is a pacing sample, not an optimal strategy, ordinary
  play-time promise, or proof across every random event sequence.

Presentation uses the existing Forager activity and purchase compositions,
Bots/Research density, and the Infinity-style settings dock. The requested
numeric job controls are the local addition: the desired number is editable
in the crew count, with a quiet pair of inline minus/plus controls. Targets stay
44px; no assignment dialog or explanatory paragraph is added.
The Shrine reuses the existing Hall artwork without drawing a new symbol.

Verification so far: the approved save-safety suite passes 40 cases, including
schema-6 migration, unchanged paid work, partial recovery and persistent event
state through the real publication/reload boundary. A disposable long-duration
probe checked 20,000-second partition equivalence across seasons, hunger,
recovery and disasters, and was used for the pacing sample. Running-game checks
covered job buttons and numeric entry, food-to-Woodland reallocation, a Shrine's
plot/payment/crew, one-at-a-time recovery, starvation, a fire with exact stock
loss, averted disaster, sickness output, and actual export/import retaining the
event and limits. Final responsive checks are recorded below.


Final running-game checks also covered entering from Forager, the completed
192-resident action, empty/filled job limits, and new housing showing a fresh
arrival countdown rather than retroactive growth. The Forager reference was
compared at the same default desktop width. Desktop Interface sizes 80%, 100%
and 150% were inspected; German at 130% was inspected at actual 360px and 320px
widths and at 800x360 landscape. There was no horizontal overflow. Job controls
measured 44px within browser subpixel rounding; lower job controls, the final
purchase and the settings resource key were reachable. Native Enter/Space
opened disclosures and numeric entry committed on Enter. The new symbols reuse
existing artwork. The approved 40-case save-safety suite, lint, translation
checks and production build pass. Native devices, separate OS text enlargement,
RTL and reduced-motion behavior remain unverified. Longer player-driven balance
review remains; no build was deployed.


### Job-control visual correction (21 October)

Matthew rejected the generic filled adjustment buttons. They used the default
secondary-button palette and added a redundant Jobs row, making routine controls
visually louder and activities taller. The correction keeps the crew count's
editable denominator and places minus/plus in one compact, dark segmented
surface at the trailing edge, using the existing Research quantity-control
colours. The desired number itself is edited in the crew count; no duplicate
numeric field or Jobs label remains. Native buttons and
number input retain 44px targets, visible focus and existing command semantics.

Verified actual minus adjustment, numeric entry without toggling the disclosure,
and Enter/Space disclosure operation. Desktop 80/100/150% and German at 130% in
360px and 320px browser layouts were inspected; the latter had no horizontal
overflow and 44px targets within rounding. Lint and production build pass.
This is a local visual correction awaiting player review, not a newly approved
shared style. Native hosts and other accessibility modes remain unverified.


### Existing buttons on the left (21 October, supersedes the custom controls above)

Matthew rejected introducing another button style and then requested the controls
on the left. Minus/plus now use the existing Button variant="purchase", with the
same shared font role and touch bounds as the village Buy buttons. The custom
segmented frame, fills, colours, borders, hover/pressed/disabled/focus overrides
have been removed. Only positioning and spacing remain local. Buttons precede
the activity in both the visual layout and keyboard order. Their stacking keeps
pointer activation separate from the activity disclosure.

The rendered adjustment and Buy buttons matched in background colour/image,
foreground, border, radius, font family/size/weight, padding and shadow. Actual
plus/minus changed desired jobs without toggling the disclosure. Desktop and
320px German 130% layouts retained readable rows and 44px targets. Lint/build
pass; native hosts remain unverified.

### Village control feedback and progress alignment - 21 October 2026

Village commands track pending work by job or purchase, rather than disabling the entire panel. The affected control guards duplicate submission while the runtime serializes independent commands. Failure styling applies only to the affected purchase. Work progress bars and timers occupy the content column to the right of the shared left-hand buttons. Verified job changes in the running game and progress alignment at desktop and 320 CSS-pixel width without horizontal overflow; lint and production build pass. Native hosts were not checked for this adjustment.

The final alignment uses two real columns in each job summary: fixed square shared buttons are centred in the left column, while title, crew, recipe and progress stay in the right column. Buttons do not stretch with row height. Their measured default size is 44 by 44 CSS pixels on desktop and at 320 CSS pixels. Clicking the embedded buttons preserves disclosure state; Enter and Space on the summary still toggle its details.

The final compact-row correction removes the header's extra 44px minimum and sizes recipe icons to their text role. The editable count retains a full-sized hit target without inflating the visible line. For ordinary rows, text starts at the square buttons' top edge and the progress track ends at their bottom edge; verified with matching DOM coordinates at desktop 100%, desktop 150%, and mobile 320px at 100%. German at 130% remains readable without horizontal overflow and allows additional lines where required. Numeric edits and job buttons were exercised in the game.

Matthew approved the compact work-row alignment and requested consistent top alignment across the remaining village panels. Food and Shaman text now begins at the controls' top edge; purchase summaries explicitly pack their content from the top. Controls remain square and top anchored when translated content wraps. Verified all five job heading positions against button tops on desktop and at 320 CSS pixels, and exercised a crop decrement.

### Separate housing and workforce indicators - 21 October 2026

Following Matthew's approval, the village header uses the existing house icon for current residents / housing capacity, then the worker icon with an explicit working count. Idle residents are a separate orange indicator, hidden at zero. Working comes from current assignments rather than desired job limits; working plus idle equals population. Reused existing house/worker artwork and the orange accent token. Verified the live 24/36 example changing between 24 working with no idle indicator and 21 working with 3 idle, plus 320px mobile wrapping. The working label is translated for every supported locale. No simulation or save format changes.

Matthew then simplified workforce presentation to worker icon + working / idle counts, with no visible Working or Idle labels. Only the idle number is orange; the zero-idle suffix remains hidden. Localized labels remain for accessibility. Housing remains separately displayed under the house icon. Verified the live header as house 24/36 and worker 21/3.

The burial total now uses a small skull instead of the visible Burials heading, as requested by Matthew. Its name remains in the resource key and accessible label. The original editable SVG is `source-assets/skill-icons/farming/farmingBurials.svg`; checked the runtime silhouette at desktop and 320px mobile size. Facility count explanation remains a design proposal: current workers / enabled jobs, with separate concise named facts in the disclosure and building capacity kept distinct. No facility changes were made for that proposal.

### Visible facility capacity - 21 October 2026

At Matthew's request, every built facility now shows its staffing and building cap below its name. The worker icon retains actual workers / editable enabled jobs; the house icon immediately to its right shows the maximum jobs supported by that facility. Capacity is visible without expanding details and uses the existing canonical workplace capacity. The recipe shares the second line when space permits; translated/enlarged content wraps naturally. Square shared buttons and top alignment remain, with ordinary work tracks ending at their bottom edge. Verified all five facility caps on desktop and 320px mobile, direct count entry and +/- changes without altering capacity, a Field purchase changing capacity 24 to 28, desktop 150% alignment, German 130% at 360px without horizontal overflow, and disclosure Enter/Space. Native hosts were not checked.

## 21 October 2026 - Season-end population disasters and restored worker placement

Matthew requested that disasters kill a population percentage, with a different roll chance at each season end. He approved Spring 10%, Summer 5%, Autumn 15% and Winter 25%, with 15% population loss on a hit. One seeded roll occurs at the end of the season that just finished. Flood, fire and sickness now share the population-loss effect, replacing stock losses and temporary livestock penalties. Deaths round up, with one resident retained so the village can recover. Shamans still make a separate prevention roll using their current staffing; prevention avoids the entire loss. A casualty resets partial growth, after which the normal two-minute-per-resident recovery applies when food and housing permit. Buildings, desired jobs and paid work are preserved. The skull total includes a distinct disaster-deaths counter alongside natural and starvation deaths.

The season clock and persisted RNG position prevent repeat rolls at a restored season boundary. Schema 8 archives the entire schema-7 village, preserves existing residents, job preferences, stocks, funded cycles, hunger, growth and reward history, and retires its old timed disaster schedule/health effect. Active stock-loss receipts are no longer presented as new population-loss events. Older schemas still migrate directly to the current rules. Village settings show all four seasonal chances and the 15% loss. The existing approved migration/publication case covers V7 migration and the saved random stream after an actual casualty.

Workers and the always-visible building cap have returned beside each facility name. The spacing issue was a three-character visual field reserved even for one-digit job limits; it now fits the actual digit count, uses tabular numerals, and retains its full-sized edit target. One card gap separates worker/job and building-capacity groups. This restores a single compact heading, with the recipe trailing and the progress/timer below; fixed square buttons, top alignment and bottom-aligned work tracks remain. The temporary second-line staffing layout is superseded.

Validation in this revision includes live casualties at an Autumn boundary (24 to 20 residents, burials +4), an actual export/import retaining that result, shaman prevention with no casualties, the same seeded threshold missing Summer but hitting Spring, and gradual recovery. A disposable numerical investigation verified all four seasonal thresholds, no mid-season casualties, one-resident retention, exact 20,000-second whole/chunked/save-reloaded outcomes, and non-consuming Stored Time forecasting. The canonical job signature now uses fixed workplace order so save serialization cannot change its clock anchor merely by sorting object keys. Native devices and OS text enlargement remain unverified.

Final browser layout checks also covered Interface 80/100/150%, English 320px mobile, German 130% at 360px, 800x360 landscape, editable one/two-digit job targets, Enter/Space disclosures, the final purchase and the final expanded-settings resource key. No horizontal overflow was observed. The approved save-safety suite passes all 41 cases; final lint, production build/boundary and all locale compilation checks pass. The disposable numerical helper was removed. Native hosts, OS text enlargement and reduced-motion behavior were not revalidated in this revision.


### Facility workers and enabled jobs - 21 October 2026

Matthew requested a simpler split in each facility heading: the worker icon now shows only the actual crew; the building icon shows editable enabled jobs / maximum building capacity. The existing minus/plus buttons and numeric entry still change enabled jobs. Current staffing remains independently calculated. This replaces the earlier worker actual/desired plus separate building-cap display without changing the simulation or save format. Reuses the existing Forager row and shared inline resource amounts. Verified all five facility rows in the running isolated preview at desktop and a narrow 450-CSS-pixel mobile layout, including a Woodland example with 10 actual workers and 15/32 enabled jobs, direct numeric entry with Enter, and decrement. TypeScript and project lint pass. 360px and smaller widths, other Interface/text scales, long locales and native hosts were not rechecked for this narrow change.


### Food stock in the header - 21 October 2026

Matthew requested stored Food in place of the signed net Food/minute header value. The Food icon now shows the canonical Food stock using the same whole-number formatter as Materials and Tools. Production and consumption remain in Village settings, and facility production rates and reserve duration remain unchanged. Verified the live opening village shows Food 0 while settings retain production 27/min and consumption 3/min. TypeScript and project lint pass. This is a value/accessible-name change with no new layout or simulation rules; further sizes/locales/native hosts were not rechecked. The crossed-tools jobs icon remains a proposal; a short Jobs label beside enabled jobs/capacity is only a new presentation suggestion, not an implemented or approved replacement.


### Jobs label trial - 21 October 2026

Matthew agreed to try a short localized Jobs label in place of the crossed-tools symbol. Facility headings now read name, worker icon/current crew, separator, Jobs enabled/maximum. The enabled count retains direct entry and the existing minus/plus controls. Shared inline quantity formatting and control-gap spacing are retained. Verified the live opening village as Crops: 1 worker, Jobs 1/4 and Woodland: 2 workers, Jobs 8/8. TypeScript and project lint pass. Mobile, other Interface/text scales, long locales and native hosts were not rechecked for this narrow label trial. This authorizes the local trial, not a shared icon convention.


### Stable growth countdown typography - 21 October 2026

Matthew reported that the growth timer was missing the established equally spaced digits and moving the header as it counted down. Farming header values now use the existing --font-family-numeric token as well as tabular-nums. The growth countdown has a localized content-sized grid slot covering its minute/second formats, with hidden sizing samples excluded from accessibility. The adjacent Food total therefore stays in place at digit and format changes; cycle timers retain their approved natural current-text width. No new font or countdown formatter was introduced. In a separate disposable village, actual readings 1m 52s, 1m 27s and 48.6s kept the timer at 46.758px and the Food group at x=492.461px, including the minute-to-seconds transition. TypeScript and project lint pass. The persistent player save was not changed for verification. Other Interface/text scales, long locales, mobile and native hosts were not rechecked for this narrow correction.


## 21 October 2026 - Earned Shaman protection and guaranteed seasonal disasters

Matthew explicitly requested guaranteed disasters at every season end from the start, including before a Shrine exists. There is no grace period or Shrine-unlock exemption. This supersedes the different seasonal base chances and the instantaneous Shaman prevention roll.

Actual Shaman staffing earns protection over simulation time: rate = min(1, actual Shamans / (population * 0.10)) / season duration. Ten percent staffing throughout a full season earns 100%; five percent earns 50%. Earning rate is capped at ten percent staffing. Staffing/population changes affect only future work, and already-earned protection remains when Shamans leave their jobs. At season end the one disaster check has chance 1 minus earned protection, then protection resets for the new season. Flood, fire and sickness retain the same 15% rounded-up population loss, preserving at least one resident. Paid jobs, buildings, job preferences, reward history and gradual recovery remain intact. Useful automatic Shaman staffing is now capped at ceil(population * 0.10).

The Shaman row shows localized Disaster reduction below its heading. Village settings show current earned reduction and remaining season-end risk, replacing the obsolete four-season odds table. Existing compact row controls, numeric typography and square targets remain.

Schema 9 stores earned protection and its continuous clock anchor. Schema-8 villages are archived in full, retain their existing resources, population, jobs, preferences, event/RNG position and clocks, and start with zero newly earned protection for their current partial season. Older migration paths still preserve their own archives. The existing approved save-safety migration table now includes a schema-8 fixture and verifies earned protection through publication/reload and continued advancement, without adding gameplay balance tests. All 42 save-safety cases, TypeScript, project lint, locale extraction/translation/compilation and production build/Store boundary pass. The build retains its existing chunk-size warning.

Actual isolated-browser checks: no-Shaman and no-Shrine seasons caused a 60-to-51 population loss; a fully protected season was averted with no deaths; 75% earned reduction showed 25% risk and retained that protection after Shamans stopped working; 5% staffing across the season showed 50% reduction/50% risk; the 50% in-progress state survived the actual UI export/import flow. The 75% seeded check also produced its possible casualty and reset protection for the next season. Desktop English and German 130% at a measured 360-CSS-pixel viewport were inspected with no horizontal overflow; the Shaman label wraps within its row. Ordinary native hosts, other scales, OS text enlargement and long-run pacing remain unverified. The player's main preview remains the normal persistent host at 127.0.0.1:5173; QA used a separate disposable server.


### Averted-disaster message in the Shaman box - 21 October 2026

Matthew clarified that the averted-disaster status belongs to the right of the square job buttons, beneath Disaster reduction, without increasing the row height. It now occupies the existing content column using the dense supporting text role, with its bottom aligned to the buttons. Narrow layouts keep one line with an ellipsis; the full localized receipt remains in Village settings and accessible status text. This supersedes the full-width footer placement. The half-season display duration and casualty-banner placement remain unchanged. An actual prevented season in the isolated game kept the row at 59.206 CSS pixels before and after the message appeared; the status and buttons share the same bottom coordinate. Desktop and measured 360-CSS-pixel mobile were visually checked, with no horizontal overflow or extra row height, and Enter disclosure activation preserved the status. TypeScript and project lint pass. Other scales/locales/native hosts were not rechecked for this narrow correction.


### Full-width Disasters section - 21 October 2026

Matthew requested a full-width Disasters section visible from the start because season-end disasters are a core mechanic. It appears above Food/Work and shows a season-progress bar with time remaining until the next disaster check. Shamans move out of Work into this section once a Shrine exists. Matthew clarified that earned disaster reduction belongs on the Shaman row: its green progress bar now sits to the right of the square job buttons, bottom-aligned with them, rather than as an independent section bar. Current staffing and editable Jobs remain in the row header. Recent casualty and averted-event receipts share the Disasters section. No simulation or save changes. Reuses Bots/Research compact row typography, shared Progress semantics and existing civilization tracks; the full-width grouping is the requested local composition.
Verified in the isolated running game before a Shrine exists (0% reduction absent from standalone bars, season boundary caused population 60 to 51), and with a staffed Shrine at roughly 50% earned protection. At desktop 100% and measured 360px English, the Shaman row remains 59.206px high and the defense track shares the buttons bottom coordinate. German 130% at 360px wraps the Shaman heading while keeping controls top anchored and has no horizontal overflow. Enter disclosure activation was checked. TypeScript, project lint, all locale compilation and translation completeness checks pass. Other Interface sizes, native hosts, OS text enlargement and reduced motion were not rechecked. The player save was not used for fixture imports.


### Automatic village allocation and priorities - 22 October 2026

Matthew requested automatic distribution again, using Forager-like priorities and building purchases as the main way to expand job capacity. Manual job limits and plus/minus controls are removed. Each built facility shows its actual workers and available jobs. The existing Forager radio-row control selects Crops or Livestock as the food priority, and Woodland, Workshop or Shamans as the work priority. The work choice is shared across the full-width Disasters section and Work section; changing one deselects the other.

The allocator first finds the smallest food crew that supports current residents plus the next resident when housing permits. Crops/Livestock use a 2:1 preference, spilling into the other facility at capacity. Remaining workers are shared among eligible Woodland, Workshop and Shaman jobs, with double weight for the selected work priority. Building caps are hard limits and unused shares redistribute. Workshops retain paid cycles and work only while tools are needed; Woodland stops when there is no land left. Shamans stop at the useful ten-percent staffing target. Idle workers remain visible when all useful jobs are full. No new currency, buildings, upgrade family or purchases were added.

Matthew clarified that a small population may still reach full defense; there is no fixed protection ceiling per Shrine. Existing ten-percent staffing over a full season earns 100% protection, and growing populations need more Shaman jobs. Disaster timing, population loss and earned protection remain unchanged. Shrine construction costs and staffing capacity retain their current tuning for later rebalance. The alternative of filling every food job first was rejected because it can consume the entire workforce and starve the new disaster mechanic of workers.

Schema 10 archives the complete schema-9 village, retains resources, buildings, population, paid work, earned protection, RNG, event history and clocks, and initializes Crops/Woodland priorities. Retired manual job limits survive in the archive. The old continuous anchor is discarded so changed crews cannot retroactively earn work or defense. Older migrations continue preserving their existing archives. Staffing and paid-job starts now settle at the same event boundary, including when cleared Materials enable a Workshop, avoiding tick-size-dependent startup delays.

Validation: the existing save-safety migration table now includes a schema-9 fixture, preserving its full archive, earned defense, event RNG and paid work through publication/reload; all 43 approved cases pass. The disposable engine investigation found identical 20,000-second whole, chunked and save-reloaded progression for both the protected village and a winter village with initially unavailable Workshop inputs. Its helpers were removed. TypeScript, project lint and production build/Store boundary pass, with the existing chunk-size warning. Actual-game checks covered migrated priorities, a winter allocation changing from one to two Shamans when prioritized, food-priority changes, keyboard radio/disclosure operation, actual export/import, a no-Shrine casualty and a fully defended averted disaster. Desktop 80/100/150%, English narrow/enlarged and German 130% at 360px, and 800px landscape were inspected without horizontal overflow; radio targets remain at least 44px wide. The player's persistent preview was restored with its existing 30-resident village; QA imports used only the separate disposable server. Native platforms, OS text enlargement and long-run balance remain unverified.


### Seasonal food collection and base storage - 22 October 2026

Matthew requested worker icon plus workers/jobs without the Jobs word, and seasonal progress for food production. He clarified that both Crops and Livestock accumulate their actual production through the season and pay out together at season end. Neither adds edible Food each tick. Their existing activity progress tracks now follow the season, with accrued food at the trailing edge and the shared countdown beside the track. The Harvest label was removed at his request. Quantities use formatGameNumber and the shared tabular-digit face; food values reserve a stable formatter-sized slot with the icon immediately adjacent, and seasonal countdowns reserve their localized width across minute/second transitions.

Every house supplies exactly one season of storage for its housing capacity: 90 Food per three residents, plus existing Granary capacity. A fresh three-resident town starts with 90 Food. House purchases expand capacity without granting Food. Food drains from storage as residents eat, and season-end production first settles hunger debt, then fills available storage; excess does not exceed capacity. Population growth waits until stored Food can cover one more resident through the next collection and resumes from retained partial progress when affordable. This eligibility crossing is an explicit simulation event, preserving chunk/reload equivalence. The final village completion collects any remaining earned food once. Disaster timing, workforce priorities and the ten-percent Shaman rule remain unchanged.

Schema 12 retains separate crop and livestock accrual, including their continuous integration anchors. Migration preserves prior state and starts new accrual at zero rather than paying old work twice; it adds only missing provisions for the remaining season. The short-lived crops-only schema 11 is also preserved and migrated, retaining its earned crop food while starting livestock accrual at zero. The existing approved save-safety table covers both prior versions.

Validation: all 45 approved save-safety cases pass, including the automatic-priority and crops-only preview migrations. TypeScript, lint, locale compilation/completeness and production build pass. The temporary engine investigation verified the opening pantry at 90 Food, approximately 45 remaining halfway through a season, pending production paid once at the boundary, and identical 20,000-second whole/chunk/save-reloaded progression including the new growth-affordability crossing. Actual UI checks observed both food totals resetting after collection and storage refilling, along with desktop, 360px English, 150% desktop and 360px German at 130% layouts. Food icon/number/timer coordinates remained unchanged while the visible food value moved from 7.80 to 10.4. The existing 0.16em icon gap is retained. Formatting now follows the live selected locale, including decimal commas after an in-session language switch. Native hosts and long-run balance remain unverified.

### Farming food-row spacing correction - 22 October 2026

Matthew clarified that only Crops and Livestock needed spacing changes. The attempted shared compact layout was rejected and reverted: Woodland, Workshop and Shamans retain their earlier height, header placement and progress composition. Food rows use that existing top-heading/bottom-track spacing, keeping the shared number formatter and stable seasonal quantity/countdown slots. Work recipes use their original natural widths; Shaman reduction again sits directly above its full-width green track.

Verified the restored composition in the running persistent preview without changing the player save. The previous broad layout acceptance entry is superseded by this narrower correction. TypeScript and lint pass. Native hosts and additional locale/scale checks were not repeated for the rollback.

The subsequent annotated review identified the precise remaining defect: the food number's hidden sizing samples left a visible blank area before the disclosure arrow. Food quantities now reserve the whole icon/value group while right-aligning its visible contents. Spare width lies before the group, preserving the normal icon-to-number gutter and keeping the number's right edge anchored beside the arrow. Only Crops and Livestock use this adjustment. Both measured 3.457px between the visible group's right edge and the arrow in the current preview; the other three facility layouts are unchanged.

### Ordinary purchases use normal autosave - 27 October 2026

Matthew rejected saving the entire game before displaying every building purchase. Routine Forager/Farming purchases, staffing priorities and ordinary controls now use the existing in-memory command path and dirty-state checkpoints, matching ordinary gameplay. They no longer stage and synchronously commit a complete save per click. Entering Farming and completing its era retain commit-first handling. The existing 30-second periodic checkpoint, lifecycle saves, command serialization and resource validation remain in place.

Validated in an isolated persistent browser save: two consecutive House purchases updated the visible count from four to six, then the count remained six after waiting through the normal autosave interval and reloading. All 45 approved save-safety tests, TypeScript and lint pass. The player save was not used for these purchases. Native hosts were not rechecked.

### Catalyst notices, resident loss and burial details - 27 October 2026

Matthew requested the existing top notification queue for Catalyst rewards. Canonical reward-ID changes now emit presentation events for actual awarded Catalysts, including purchases and active population growth. The first-ever Catalyst uses the existing modal notice composition with a concise explanation, Continue and View Skills; later rewards use the existing six-second timed notice. Existing reward history and hasEarnedGalvanizer distinguish first-time players from returning players, without a new save schema. Loading/importing an already-earned milestone does not fabricate a new reward.

Farming shows the rounded resident loss alongside the base 15% percentage, retaining one resident at minimum. The success receipt is simply "Disaster averted". The skull total is now a 44px click/tap/keyboard control which expands Starvation, Natural deaths and Disasters below the header, with no hover dependency or overlay over the game.

Text audit at 100% Interface/text scale: both era headings use 1.05rem (16.8px), 16% below the shared 1.25rem page-title role; Food/Work group headings use .9rem (14.4px), 14.3% below the shared 1.05rem section role. Row/purchase titles use the normal .9rem role, body/purchase quantities the normal .82rem role. Farming production/worker values use .8rem and Shaman supporting text .67rem, matching the existing dense Research production/support pattern; .67rem is 6.9% smaller than the ordinary .72rem metadata role. No typography resizing was requested or applied during this audit.

Validation: actual Forager purchase earned the first-Catalyst popup; View Skills navigation and Escape dismissal worked. Later Forager purchase and Farming growth both produced the timed banner, and expiry was observed. Desktop English and 360px German at 130% were inspected, including the first popup, loss row, and keyboard/click burial breakdown. All 45 approved save-safety cases, TypeScript, lint, translation completeness/compilation and production build passed. Native hosts and all other combinations of scales/locales were not rechecked.

Balance proposal only, not implemented: cap earned protection at 50% initially, 65% after a 24-population upgrade, 80% after a 48-population upgrade, and 100% only after a 96-population upgrade. Full-season staffing at 10% population would still be needed to reach the current cap; new upgrades affect future work only. This would put full protection at least halfway to the 192-population endpoint. The current Shaman balance remains unchanged pending Matthew's decision.

### Shaman training trial and standard text roles - 27 October 2026

Matthew approved trying the protection progression and requested the smaller text use the app standard. Forager/Farming era titles now use the 1.25rem page role, group headings the 1.05rem section role, and Shaman supporting text the .72rem metadata role. Other text already matching ordinary or dense reference roles retains its size. The first-Catalyst popup now also explains that fractured skills have their downsides disabled.

A new Shaman training purchase raises the full-season protection ceiling from 50% to 65%, then 80%, then 100%. Purchases require peak populations 24, 48 and 96, cost 120/240/480 Materials and 10/20/40 Tools, and consume no land. Ten-percent Shaman staffing for a full season earns the current ceiling; partial staffing/time earns proportionally less. Buying training starts a new integration anchor but does not grant past work. The training level is an optional V12 field (absent means zero) and survives the normal save path. Existing earned protection in a loaded save is retained for its current season; later seasons start at zero under the new limit.

Validation: the UI rejected training before the 24-population milestone and displayed 65%, 80%, then 100% ceilings after actual purchases in an isolated eligible village. A disposable numerical investigation compared one 1,799-second advance against repeated 37.125-second advances at all four limits; earned protection matched exactly. All 45 approved save-safety tests, TypeScript, lint, translations and build checks passed. The normal player's save was not imported or reset for checks.

The three training purchases were also verified to persist after the normal autosave interval and reload. The enlarged Farming headings and protection label were inspected at 360 CSS pixels with no horizontal overflow. Existing accrued protection is grandfathered only for its current season; no training purchase retroactively grants protection.

### Building-owned population, growth and storage - 27 October 2026

Matthew moved population and housing, worker totals, growth and Granary status out of the top resource strip. The House purchase card now shows a worker icon with population / housing capacity, the icon-only +3 resident benefit, and a growth bar with a stable countdown. Its status distinguishes active growth from paused growth. Granary is the next card, to the right of House on desktop and immediately below it on narrow layouts, and shows stored Food / capacity, time the reserve lasts, and a storage fill bar. Both cards remain visible while purchases are locked so the village's current capacity and reserves are still available at the start. The top strip retains Food, Materials, Tools, free Land and Burials.

The collapsed Shaman row now uses the ordinary full-width track with the percentage beside it, matching the other activity rows. The maximum protection label is confined to its expanded details. No staffing, growth, storage or protection mechanics changed.

Validation: running and paused growth, storage fill, House purchase updating capacity, desktop pairing, and 360px English/German at 130% were checked in the actual game. Both cards remained within their available widths; the German Granary wraps its longer heading and recipe. Existing countdown and number formatting are retained. TypeScript, lint, translation compilation/completeness and the production build pass. Native hosts and other scale/language combinations were not rechecked.

Matthew's follow-up removes the visible Growing/Growth paused line from House and the Food lasts line from Granary. Population/storage values, bars and the growth countdown remain. Accessible progress labels are retained.

Matthew also removed the visible Disasters heading and Next disaster label. The season/disaster track now uses the shared cycle row with a stable countdown to its right; its accessible name remains Next disaster.
