# Transcendence tiers and Discord follow-ups

Branch: `transcendence-tiers`. Unmerged preview; no deployment authorised.

## Agreed behaviour

- Discovery: 1 TP, 3600 progress/completion, 10× facilities + 0.1/completion.
  Unlock also supplies 7× Cash/Bots and 20-second base lifetime. Facility and
  Bot factors combine on Assembly Lines: initially 10× × 7× = 70×.
- Elevation: 3 TP after Discovery, 1800 progress/completion, raises Cash/Bots
  to 10× + 0.1/completion; transfers 1800 progress to Discovery.
- Enlightenment: 5 TP after Elevation, 600 progress/completion, raises base
  lifetime to 30 seconds + 0.1/completion; transfers 600 progress to Elevation.
- Transfers can complete receiving bars, carry remainder, and never multiply
  transferred progress by recipient speed. Process highest tier first.
- Skill-tree bonuses receive 100% / 50% / 25% weights. Purchased speed,
  Quantum, Avocato and Secrets remain shared. All are additive.
- Separate power purchases (+5 to the relevant benefit) with independent
  1, 2, 3… TP costs. Shared speed remains +25%, costs 1, 2, 3… TP.
- Existing Discovery completions/progress/power stay in Discovery. New tiers
  are locked. Infinity/Quantum/challenges preserve progress; Transcendence
  resets completions/progress, retaining all purchases. Reset Save clears all.
- One panel, named Discovery, smaller unnamed supporting bars; expanded
  details show each tier's completions, values and speed. Hide header Discovery
  slot. Timers sit left inside each bar, benefits right inside, with no
  intervening multiplier rows. Main bar is 2.5rem, supporting bars 1.8rem,
  scaled with text. Collapsible store upgrades and a modal first-unlock confirmation.
- Allow Fracturing during challenges; preview the resulting description in a
  spaced confirmation. Quantum achievement permanently grants a minimum one
  generated Assembly Line on all future run resets, including Transcendence.
- Fix galaxy/header stacking. Backlog railgun stall; no IP balance changes.

## Implementation and verification — 26 September 2026

- [x] Shared calculations, fixed transfers, independent purchases, production
      factors, previews and accurate countdowns including incoming transfers.
- [x] Existing-save compatibility, tier validation, all reset paths, and the
      permanent first-Quantum milestone. Explicit false is respected; old saves
      can infer prior Quantum from current progression and lifetime achievements,
      never from personal bests retained across Reset Save.
- [x] Panel, resource header, collapsible store, unlock modal, Fracture result
      preview/spacing and galaxy/header stacking.
- [x] All changed interface text translated in the seven supported translations;
      compiled catalogs, current Wiki, 4.1.10 notes and railgun backlog updated.
- [x] Focused regressions and full repository checks.
- [x] Hands-on browser interactions and independent code review; confirmed
      findings fixed and reviewed again.
- [x] iOS Simulator unlock/reset/restart interaction loop.
- [ ] Android and packaged Electron interaction loops were not repeated in this
      pass. No Android device/emulator was connected during the checks. Windows,
      Linux and cross-device Cloud were not tested. These remain release-QA limits.

### Automated evidence

Full Vitest run: **183 files / 1,900 tests passed**. TypeScript, lint, data check,
translation validation/compilation, web build, first-Dyson parity, Electron host
syntax check and `git diff --check` passed. Native renderer and isolated iOS
Simulator Debug builds passed. The web build retains its existing chunk-size
warning.

Regressions cover transfer cascades and remainders; partitioned versus bulk
advancement; 0/100/1000% tree bonuses; large finite spends; exact next-completion
boundaries; all seven purchase kinds including interrupted commits and retry;
save/reload/reset retention; combined Assembly Line factors; legacy Quantum
inference; and Fracturing through the actual command boundary in all challenges.

At baseline, the three tiers produce 3/4/6 completions per hour. With +100% tree
speed, long-run rates are 4.75/5.5/7.5; with +1000%, 20.5/19/21. Tests use four
hours to avoid mistaking fractional average rates for partial completions.
A local pure-calculation probe took 24.8ms for 10,000 countdown evaluations and
0.23ms to advance one billion seconds (+1000% tree speed). This measures the
Discovery calculations only, not the entire Stored Time simulation.

### Hands-on evidence

Disposable browser saves at `http://127.0.0.1:5193/play/`:

- Imported the existing pre-unlock fixture; cancelled the first-unlock modal
  with Escape and checked focus return, then confirmed the purchase. Verified
  1 TP spending, Research removal, all-worker state and the resource transition.
- Bought Elevation, Enlightenment and Starting Power; exercised active progress
  and a one-hour Stored Time spend. Checked completion counts and remainders.
- Transcended and reloaded: all tiers and power purchases remained, earned
  completions reset, and the starter Assembly Line immediately produced Bots.
  Avocato remained reachable with zero points.
- Imported a three-tier Blank Slate fixture; checked the resulting Cold Fusion
  effect and confirmation spacing, then Fractured it through the real button.
  Normal assignment stayed blocked. Abandoned the challenge and checked tier
  retention and the starter facility.
- Inspected Assembly Line details: Discovery facility and Cash/Bot factors are
  listed separately and both contribute to output.
- Reproduced galaxy art covering the header and verified the corrected stacking.
- Checked 1280×800, 360×780 with 130% text, German long labels, disclosure controls,
  modal cancellation/focus and responsive purchase cards. Restored English and
  cleared temporary viewport/text overrides for handoff.

iOS 26.4 Simulator (`IDS-Speedruns-QA`), isolated bundle
`com.blindsidedgames.idstiersqa`: seeded the pre-unlock disposable fixture, then
used actual controls to buy Discovery, Elevation and Enlightenment; confirmed
Transcendence; observed all three retained bars and the starter's Bot production;
terminated/relaunched and verified retained tiers and progress. This was an
unsigned local Debug build, not a store upload. Native skill/preset and every
reset variation were not separately retested.

Screenshots: [desktop](../qa/transcendence-tiers/desktop.png),
[narrow enlarged text](../qa/transcendence-tiers/bars-360-text130.png),
[German expanded details](../qa/transcendence-tiers/german-360-text130.png),
[iOS restart](../qa/transcendence-tiers/ios-restart.png).

### Review findings resolved

Independent review found that countdowns ignored incoming progress and that old
saves with spent Quantum/Transcendence wallets could miss the starter milestone.
Both were fixed with regressions. Hands-on QA also found an overly broad rates
validation rejecting the full effects object, and an application-level Blank
Slate guard still rejecting Fracturing despite domain eligibility. Both were
fixed and retested through their real paths. Final independent re-review reported
no actionable findings; its final focused run passed 139 tests.

### Handoff

Keep the branch unmerged and undeployed. The running preview contains disposable
three-tier progress. The pre-unlock fixture remains at
`test/fixtures/discovery/pre-unlock.idsweb1.txt` for inspecting the transition.
No IP balance changes or railgun gameplay changes are included.

## Presentation follow-up

The expanded dropdown now contains one named section per unlocked tier, using
plain dividers rather than nested cards. Each section shows its own completions,
current/next benefit, speed and correctly weighted sources, plus incoming-target
progress per completion where applicable. Cash/Bot and lifetime unlock benefits
remain visible under Discovery until their respective tier is unlocked.

Avocato's upgrade category is an unboxed disclosure heading above standalone
purchase cards. There is no enclosing panel. Three related SVG icons reuse the
original high-resolution conveyor, Bot/currency and panel/stopwatch vocabulary;
editable masters and export instructions are in `source-assets/discovery/`.

Follow-up checks: full suite 184 files / 1,903 tests passed; one/two/three-tier UI coverage and source percentages (24 focused
tests); type/lint/localization/build checks; live 360px/130% text and normal-width
inspection of bars, named sections, the upgrade list and scrolling to the final
section. The latter caught and fixed a missing height constraint on the Discovery
scroll surface. Native interaction QA above predates this presentation follow-up.
Evidence: `tier-details-narrow.png`, `tier-details-bottom.png`, and
`upgrades-unboxed.png` under `docs/qa/transcendence-tiers/`.

Final icon placement is outside the right edge of each bar. Runtime exports now
trim transparent margins and preserve aspect ratio; the icon column aligns the
silhouettes right. Discovery's blocks and conveyor use a squarer composition.
The final artwork was checked at large and small sizes and all three disclosure
UI tests passed. An automatic browser URL-policy rejection prevented reconnecting
to localhost for another in-game check of this last artwork adjustment; prior
outside-right placement was visually checked in the game.
