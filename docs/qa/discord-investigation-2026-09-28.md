# Discord investigation — 28 September 2026

Initial scope: investigate Stellar Swarm, Steady Supply and Hands Off before changing
mechanics. Orientation belongs to the subsequent agreed implementation batch.
Only the two approved UI changes and backlog entries were implemented.

## Implemented UI

- New device preferences show the cosmic visualization by default. Explicit
  hidden/visible choices retain their meaning and survive restart.
- Facility progress tracks are 0.6rem, twice their former 0.3rem height. No
  changes to progress calculations, other bars, card composition or text.
- Balance tooling is deferred; Manual Labour Science production is backlogged.

Live UI QA used an isolated 5298 origin and disposable save. Fresh Settings
showed visualization checked; unchecking and reloading preserved off. Re-enabling,
importing and navigating showed the visualization. Desktop 1280×900 and 360×780
with 130% game text were inspected. Tracks measured 9.59 CSS pixels at 16px root
size; no horizontal overflow, visible scrollbars or overlapping card content.
Keyboard opened/closed facility Details; scrolling reached Galactic Brains above
the fixed controls. Temporary responsive/text overrides were restored.
Screenshots: `/tmp/ids-20260928-qa/`. Native device interaction was not repeated.

## Original investigation: Stellar Swarm — runaway reproduced

Current boost is `P ^ log12.5(Bots)`, where P includes ordinary and Compound
Fragments purchase scaling. This is also `Bots ^ log12.5(P)`: above P=12.5 it
grows faster than Bots. Brains feed the facility chain, that chain produces more
Bots, and Bots raise this exponent again. Manual Labour is not required.

A constructed late-game fixture used 1e100 Bots, 1,000 purchased Galactic Brains,
Fractured Stellar Sacrifices and the Swarm/Fragment bases. With Compound Fragments,
P=65.7819447591797 and the boost was 5.5979e165. Running the actual advanceGame
path with no Tinker and automation suppressed reached the finite numeric ceiling
(Number.MAX_VALUE) for Brains by 24 simulated seconds and the 4e242 Bot boundary
by 28 seconds. Without Compound Fragments, P=46.5 and the same fixture also hit
the Bot boundary at 28 seconds, with 8.25e288 Brains. This is a reproduction of
the mechanism, not Wia's exact save or a normal-play balance benchmark. The
fixture starts with a correspondingly large panel-rate snapshot (1e100).

No literal Infinity was persisted in this reproduction; numeric guards saturate
the balance. Those guards prevent invalid numbers but do not balance the loop.

Proposal, NOT implemented: replace exponentiation with diminishing logarithmic
scaling of both inputs, e.g. `1 + log12.5(max(1, Bots)) * log12.5(max(1, P))`.
The example above becomes 152.10× rather than 5.60e165×. Agree tuning and test
full builds, Stored Time and held Tinker before accepting a replacement.

## Original investigation: Steady Supply — general auto-assignment failure not reproduced

- Immediate Infinity auto-assignment retained all 125 paid Lines and 12 paid
  Galactic Brains. The post-Quantum starter Line remained separate.
- 800 generated Lines / 900 generated Brains did not transfer, as intended.
- Reload retained the restored counts and ledger.
- With insufficient initial SP, the captured purchases remained banked;
  subsequent auto-assignment with 3 SP restored all 125 paid Lines.
- Later manual assignment also restored 125 Lines.
- No Science allowed restoration. Hands Off and Built by Hand kept the augment
  assigned and its bank populated but blocked facility restoration through the
  shared challenge purchase predicate.

The normal reset and later assignment paths both call initializeSwarmGrants.
Existing tests also cover repeated Infinity, Head Start/Infinity free units,
refund/reassignment, and Quantum/restart clearing. Need Hypnofox's save and exact
challenge/reset/assignment state to establish the reported cause; do not change
the normal retention formula based on the report alone.

## Hands Off — purchased-only goal is a confirmed blocker

- The 5 Assembly Lines goal checks the purchased component only. A fixture with
  100 generated Lines and zero purchased Lines stayed at stage 1 with no reward.
- Facility purchases, Infinity starter-facility purchases, Head Start and Steady
  Supply restoration are blocked. Quantum challenge entry resets Infinity
  upgrades; ordinary Infinity subsequently retains the current challenge.
- Scientific Planets can seed Planets from zero; a Hands Off fixture with that
  skill, 100 Bots and 50 scientists produced 3.699 Planets after one game second
  under the fixture's existing modifiers. Generated Planets feed the
  lower production chain without purchasing the target facility first.
- Stellar Sacrifices produces the highest already-owned facility, so it cannot
  advance from Lines to an entirely unowned higher tier by itself.

Proposed batch, NOT implemented: disable all Tinker/Manual Labour actions in
Hands Off; make this challenge's 5-Line goal count generated plus purchased
ownership; retain passive generation and the starter Line. Recommend continuing
to prohibit Infinity facility grants while permitting unrelated Infinity
upgrades. Verify a full challenge progression without Reality SP or new seeding
augments before deciding whether more generation sources are needed.

## Verification

Investigation harness: `/tmp/ids-sept28-investigate.ts`, results
`/tmp/ids-sept28-investigate.log`. Production code was exercised without modifying
the three mechanics. Lint, TypeScript and 28 existing focused Swarm/manual-facility
tests passed. No deployment, merge or Discord posting.


## Approved implementation — September 28

This section supersedes the unimplemented proposals above. No deployment or merge.

- Stellar Swarm now uses `1 + log12.5(max(1, Bots)) × log12.5(max(1, P))`.
  P remains the combined normal/Compound Fragments scaling of the highest owned
  facility. Compound Fragments itself and Stellar Sacrifices' Bot costs are unchanged.
  The same shared function feeds simulation, assignment previews and facility details.
- Steady Supply snapshots paid purchases only when assigned at the ending Infinity.
  The resulting ledger authorizes automatic restoration without reassignment.
  Its existing restored counters prevent refunds, later assignment and reload from
  duplicating grants. Head Start still requires assignment. Challenge restrictions,
  Quantum clearing, restart clearing and exclusion of free/generated units remain.
- Hands Off permits normal passive production and the post-Quantum starter Line.
  Facility purchase paths (including automation and Infinity facility grants) stay
  blocked. Tinker commands, stale held actions, facility grants and reward previews
  are disabled. The entire Tinker region is hidden. Generated Lines now count toward
  this challenge's five-Line goal; ordinary goals retain their existing rules.
- Added native Auto / Portrait / Landscape preference in Settings alongside the
  existing select controls. It uses device-local presentation persistence and the
  existing native plugin; no new dependency, save field or Cloud setting. Startup
  restores the preference. Auto releases the app restriction to the OS.
- Prior approved changes remain: visualization defaults on when no preference exists;
  explicit hidden preference survives; facility progress tracks are 0.6rem, doubled.

### Final English descriptions

- **Stellar Swarm:** Multiplies Stellar Sacrifices output by 1 + log12.5(Bots) × log12.5(P), where P is the purchase-scaling multiplier of your highest owned facility. Bot costs are unchanged.
- **Steady Supply:** Keep paid facility purchases through Infinity. Assign before resetting; purchases return automatically. Free starter units do not accumulate. Quantum clears the supply.
- **Hands Off:** Complete a Quantum run without facility purchases or Tinkering. Start with one Assembly Line; passive facility generation works normally.

Updated all seven translated catalogs and both pseudo-locales. Flavour unchanged.

### Verification of implementation

- Focused regression tests cover ending-only ownership, immediate restoration,
  reload, repeated assignment, free-unit exclusion, Quantum/restart clearing,
  logarithmic bounds, actual Stellar generation details and unchanged Bot debit,
  stale/repeated Tinker commands, hidden UI, passive production, generated-Line
  goals and native preference validation/persistence.
- Full suite: 196 files, 2,064 tests passed. TypeScript, lint, data validation,
  localization extraction/translation/compilation, production build and native bundle
  passed. Full tests, production build and lint passed again after final review edits.
- A repeat of the original 1,000-paid-Brain/1e100-Bot fixture gives 152.104489×
  with Compound Fragments, versus approximately 5.6e165× previously. After one
  simulated active hour it has 3.80857e9 generated Brains and 1e100 Bots. Repeating
  that hour through the Stored Time simulation path produced identical results, with no
  numeric saturation or runtime issue. This is a controlled reproduction, not a
  promise that every late-game build is balanced.
- Live disposable browser import reached Infinity and restored 125 purchased Lines
  plus 12 purchased Brains with no Steady Supply reassignment. Reload preserved both.
- Live Hands Off fixture generated Planets and their downstream chain while purchase
  controls were disabled and Tinker absent. Abandon and re-entry confirmations were
  exercised; actual re-entry showed one starter Line producing Bots with no Tinker.
  Evidence: `/tmp/ids-20260928-qa/hands-off-starter.png`.
  This was not a timed full 42-Infinity challenge completion.
- Desktop and 360×780/130% text inspected: facilities, both changed augment dialogs,
  challenge rules/confirmation and scrolling. No visible scrollbar or clipped copy.
  Evidence: `/tmp/ids-20260928-qa/hands-off-narrow.png`,
  `stellar-description.png`, `steady-description.png`.
- iOS 18 Simulator: built/installed; changed Auto to Landscape using the native
  selector, observed landscape game layout, terminated/relaunched and observed the
  lock restored. Portrait selection/return to Auto still need a native interaction
  pass; simulator scrolling automation was unreliable. No physical-device claim.
- Android debug build installed and launched on the isolated emulator. The computer
  tool could not bind its window; interactive orientation validation is unverified.
  Windows/Linux, Steam packaged interaction and cross-device Cloud were not retested.
- Self-review checked reset and grant consumers, Tinker command/derivation/UI consumers,
  preview consistency, translations, native startup, and preference failure handling.
  Final review removed a duplicate Capacitor plugin registration: orientation now
  reuses the existing native bridge. Its 20 affected tests, TypeScript and lint
  passed after that correction. Native interaction evidence above precedes this
  JavaScript bridge deduplication; it was not repeated afterward.

### Deferred

- The original general Steady Supply auto-assignment report remains unreproduced;
  the ending-only rule removes its reassignment dependency. No speculative second fix.
- Production/balance tooling and Manual Labour Science remain deferred in BACKLOG.
- Orientation needs the remaining native checks above before calling it fully QA'd.

### Facility bar follow-up

- The initial doubled track increased minimum-content card height by 4.8px at
  360px/130% text. Removed its extra top margin and reused the preceding grid gap;
  the same narrow cards now measure 119.41px versus the original thin-bar 119.72px.
- Replaced pill rounding with the Details button's 0.2rem radius. A transparent
  bottom border aligns the painted track/fill with the button's inner face.
- Live inspection at 1280×900 and 360×780/130% text confirmed alignment for all
  eight facilities, no text overlap and compact card heights. Representative
  screenshots: `/tmp/ids-20260928-qa/facility-bars-desktop.png` and
  `facility-bars-narrow.png`. Temporary viewport/text overrides were removed.
- CSS-only follow-up; no gameplay change or new automated test. Native layouts
  were not rechecked for this cosmetic adjustment.

### Bar sizing iteration

- Matthew requested matching full black borders, followed by another 20% height
  increase. Final track height is 0.72rem, with the Details button's 1px black
  border and 0.2rem radius. All eight bottom edges remain aligned.
- Rechecked desktop and 360px/130% text. Compact cards with spare space retain
  their height; tightly wrapped enlarged-text cards need about 1.92px extra to
  avoid overlapping description text. No fixed-height clipping was introduced.
- Final screenshot: `/tmp/ids-20260928-qa/facility-bars-taller.png`.

### Early-game bar preview and effect

- Exported the prior 5193 preview to
  `/tmp/ids-before-early-bar-preview-20260928.txt`, then imported a disposable
  pre-Infinity setup with Lines, Managers and Servers through the normal save UI.
  The server bar takes 30 seconds; upstream bars fill faster and naturally speed
  up as generated facilities accumulate. Left Bots open for Matthew.
- Added a faint six-second sheen clipped to each filled section. It uses the
  existing text/accent palette and a compositor transform; gameplay progress and
  reward timing are unchanged. Reduced-motion removes the decorative effect.
- Inspected desktop and 360px/130% text, observed changing fill/sheens, and verified
  reduced-motion gives no pseudo-element/animation. Restored viewport, text and
  media overrides. Screenshot: `/tmp/ids-20260928-qa/facility-bars-early-sheen.png`.
