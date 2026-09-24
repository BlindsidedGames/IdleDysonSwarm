# Discovery prototype — implementation coverage

Branch: `discovery-prototype`. Unmerged and unreleased. Agreed prototype tuning
must not be silently changed. This document separates implementation, automated
verification and hands-on evidence; an unchecked item is not verified.

## Contract

Discovery replaces Research only after a permanent one-point purchase in Avocato.
The existing Overflow wallet and 4e242-Bot reset threshold remain; player-facing
names become Transcendence. Discovery starts at level 1, 10× production and a
10-second base panel lifetime. Each fixed 3,600-progress completion adds 0.1.
Starting Power adds 5 per purchase; Discovery Speed adds 25% per purchase.
Both purchases cost 1, 2, 3… independently. All speed bonuses are additive.
Live production enhancement applies above 1×, never to base lifetime.

Infinity, Quantum and challenges preserve Discovery; Transcendence resets its
completions/progress only. Reset Save clears ownership and upgrades. Existing
entitlement, personal-best and Cloud conflict rules remain unchanged.

## Coverage ledger

Implementation is complete. Verification below distinguishes automated checks,
primary-agent interaction observations and independent code/numerical review.
The branch remains a prototype for Matthew's inspection, not a release candidate
with full native acceptance.

| Area | Implementation | Automated/review verification | Interaction QA |
|---|---|---|---|
| Domain math, bounded counters, atomic purchases | Done | Domain, integration and commit-first purchase tests; pending-save retry/Stored Time exclusion | Unlock and both purchases retained through immediate browser reload |
| Schema 19, migration, checkpoints, exports/imports, recovery | Done | Migration, checkpoint and application regression suites | Browser normal export/import retained level 2; browser/macOS/iOS restart observations below |
| Complete skill/augment/Secret/Quantum disposition inventory | Done | Independent reconciliation of all 104 skills, 10 augments, 27 Secrets and 20 Quantum upgrades, including dynamic resolvers | 28 converted skill dialogs inspected; Quantum phase descriptions checked |
| Cash, Bots, facilities, lifetime and production breakdowns | Done | Final Cash/facility factor, pricing isolation, generator inputs and live enhancement reviewed; effect tests | Discovery values and assignment/refund comparisons observed |
| Science/research retirement and stale command rejection | Done | Stale command, zero Science production and generated-research regression coverage | Research replaced by Transcendence; allocation removed |
| All-worker allocation, presets and Quantum prerequisites | Done | Allocation/preset application and existing Secrets/Division access reviewed | Presets 1→2 retained phase with no allocation controls |
| SRS, Shoulders, Precursors and live enhancements | Done | Conversion tests and independent authored/dynamic inventory audit | Converted descriptions inspected; Discovery Speed assignment/refund preview 1.82→1.57 observed |
| Active clock, Stored Time, acceleration and performance | Done | Fractional completion-boundary regression, actual StoredTimeSimulation measurements and derivation benchmark | Active completion and one-hour Stored Time spend observed |
| Infinity, Quantum, challenges, Transcendence and Reset Save | Done | Reset-retention tests plus reset-path review | Browser Infinity, Quantum Entanglement conversion, Trial & Error entry/abandonment and Transcendence; full native reset matrix remains incomplete |
| Navigation, shared resources, Avocato and Discovery card | Done | Phase projection/command integration and review | Browser transition and Avocato purchases; browser zero-wallet navigation/reload; macOS reset flow |
| Skill names/descriptions/previews, Statistics and Debug | Done | Shared conversion/projection review; localized source catalogs | 28 skill dialogs; live Quantum wiring defect corrected and descriptions rechecked |
| Goals, speedruns, Simulations, Reality and entitlements | Done; existing contracts retained | Repository regressions and scoped review; no new assistance flag | Full unrelated-system interaction matrix not repeated |
| Localization and current Wiki (historical notes untouched) | Done | Repository localization/data checks recorded by primary | German Discovery and purchase cards inspected at 360 CSS px / 130% text |
| Editable artwork and runtime icon comparisons | Done | Editable masters/export pipeline retained | Actual desktop/narrow game screenshots; native app observations |
| Desktop, 360px, enlarged text, keyboard/accessibility | Done | 360px DOM overflow check passed | Desktop, 360px and German 130% text inspected; keyboard disclosure and help focus/labels verified; full screen-reader pass unavailable |
| iOS Simulator, Android emulator, packaged macOS | Done | Native build/install evidence is separate from interactions | macOS essential loop complete; iOS partial; Android launch only — see limitations |
| Independent review and affected-scenario rechecks | Done | Latest full run: 1,822 tests in 177 files; independent reviewer: 220 targeted tests; no known unresolved code blocker | Live reload defect fixed with application tests; Quantum description wiring fixed and rechecked |

### Interaction evidence

Primary-agent observations, using disposable saves:

- **Browser:** Transcended before unlocking; bought Discovery and both permanent
  upgrades; immediate reload retained purchases. Active play took `C=0, P≈3580`
  to `C=1`. A one-hour Stored Time spend reached `C=1, P≈900` at speed 1.25.
  Assigned/refunded Discovery Speed with the expected preview; switched presets
  without allocation controls. Infinity and Trial & Error entry/abandonment
  retained level 2. Quantum Entanglement conversion retained level 2. Normal export/import retained level 2. Spending the final nine points left Avocato accessible after navigating away/back and reloading, with Speed level 3 and Power level 2.
- **Packaged macOS/Electron, isolated data:** imported pre-unlock save, unlocked,
  purchased Speed and Power, Transcended, force-terminated the isolated process and relaunched. Retained
  level 1, base strength 15, speed 1.25 and eight points.
- **iOS Simulator, disposable app:** actual unlock and Starting Power purchase;
  kill/relaunch retained ownership and purchase. The reset loop was **not**
  completed because the UI scroll tool failed.
- **Android emulator:** APK built, installed and launched. The UI tool could not
  expose the emulator surface; unlock/reset/restart interactions are **not** verified.

Local review artifacts (under `output/discovery-prototype/`, not necessarily
tracked with source):

- `pre-unlock.idsweb1.txt`: disposable transition fixture.
- `discovery-review.idsweb1.txt`: representative unlocked review fixture.
- `live-export.idsweb1.txt`: exported live QA state.
- `skill-description-ui.txt`: actual UI text from 28 converted skill dialogs.
- `desktop-discovery.png`, `narrow-discovery.png`,
  `narrow-german-text130.png`, `narrow-avocato-german-text130.png`:
  runtime screenshots; narrow check used 360 CSS pixels without DOM overflow.
- `macos-after-transcend.png`: packaged macOS post-reset evidence.
- `ios-upgrades-restart.png`: rebuilt iOS app retained its purchase after restart.
- Committed import fixtures: `test/fixtures/discovery/`; these carry normal manual-import provenance.

Final checks: production build/typecheck, lint, data export parity, first-Dyson
parity, all seven translation catalogs (2,159 keys each), Electron syntax, iOS
Simulator build and Android debug build. Existing bundle-size and translation
glossary notices remain informational. A fixture README basename collided with
an existing packaged README in the packaging guard; renamed the fixture guide
and reran that guard successfully before the final full suite.

### Remaining verification limitations

- iOS has purchase/restart evidence, **not** the complete reset loop.
- Android has build/install/launch evidence, **not** gameplay interaction acceptance.
- Windows, Linux and cross-device Cloud interactions were not performed.
  Local checkpoint/Cloud-compatible serialization tests do not establish a
  cross-device Cloud synchronization result.
- German Discovery and purchase cards were inspected at 360 CSS pixels with the
  existing text-scale variable set temporarily to 1.3: wrapped text, no horizontal
  overflow. Keyboard Enter opened the speed breakdown and Tab reached the reset
  help with its accessible label/title. Full VoiceOver/TalkBack testing was not
  performed. Temporary QA styling/emulation was removed.
- Actual Quantum reset was also exercised without Entanglement: level 18 and
  partial progress survived while Bots and Cash reset to zero. The complete
  challenge/native matrix remains broader than the interactions listed here.
- Full-run rebuilding times to subsequent Infinity, Quantum and Transcendence
  were not measured. The production snapshots below are not substitutes.

### Final presentation refinement

Matthew's final visual direction supersedes the original Research palette and
info-button proposal. The default view shows **Discovery** opposite **×M**, with
a prominent 48px progress bar and the time remaining centered inside it. The
title, multiplier and bar sit directly on the page without an icon or outer panel,
using Avocato's purple palette.
The whole header/bar is the native disclosure control. No standalone info button
or reset-explanation paragraph remains. Opening it reveals compact label/value
rows for level, base lifetime, next multiplier and the actual speed breakdown.
The shared Progress component and localized messages are retained.

Visual follow-up: inspected collapsed/expanded browser views at desktop and
360px, plus German at 130% text (no horizontal overflow). Clicked the bar to open,
the heading to close, and verified Enter/Space operation and visible keyboard
focus. The accessible disclosure name includes production benefit and remaining
time. Rebuilt and tapped both states in the isolated iOS Simulator app, and checked
the same presentation and bar interaction in the packaged macOS app after a
cold process restart. Full
screen-reader testing and Android interaction remain unavailable as noted above.

## Balance and performance evidence

Measured with the existing deterministic fixtures; agreed tuning is unchanged.
Completion times below are **gameplay seconds**, before the active clock's
Double Time conversion. One Starting Power purchase changes unenhanced strength
and base lifetime from 10×/10 seconds to 15×/15 seconds immediately.

| Fixture/build | First completion | Speed |
|---|---:|---:|
| Fresh, no bonuses | 3,600s | 1× |
| Fresh, one Speed purchase | 2,880s | 1.25× |
| Checked-in mature Infinity, no assigned skills | 3,000s | 1.2× |
| Checked-in late Quantum | 2,626.95s | 1.370412× |
| Checked-in maximum-skills | 347.06s | 10.372759× |
| Controlled Science-heavy deterministic late-game fixture | 266.41s | 13.512787× |

The mature Infinity fixture changed from approximately `5.0425e80` to
`4.81068e81` Cash/s (9.54×), and `961,192.52` to `8,212,542.03` Bots/s (8.54×).
Its old 20-second lifetime became the specified 10-second base.

**Known balance limitation, not an implementation defect:** retiring a developed
Research economy can substantially reduce production. The deterministic
late-game fixture with selected Science skills gained approximately 19.9× Cash
and 37× Bots when replacing its original low Research levels. Raising its
repeatable Research levels to one million before the same unlock instead reduced
Cash by approximately 10,533×, Bots by 2,385× and Server production by 596×.
This is a controlled sensitivity experiment, not a claim that the synthetic
assignment represents a naturally acquired player build. Unlocking immediately
after Transcendence avoids discarding a developed Research economy. Any change
to initial strength or the transition contract needs a separate tuning decision;
no automatic carryover or unapproved compensation was introduced.

### Runtime measurements

| Check | Measured result |
|---|---|
| Actual fresh unlocked 24-hour Stored Time, fast (5,000 ticks) | 1.45–3.77s wall time; 24 discoveries |
| Same, balanced (100,000 ticks) | 23.85–24.57s wall time; 24 discoveries after boundary fix |
| 4,000 deterministic production derivations before unlock | 1.565s |
| Same after unlock | 1.448s |
| 1,000,000 pure Discovery advancement calls | 144–178ms |

These are local process measurements, not frame-rate guarantees or native-device
benchmarks. The fresh Stored Time fixture is intentionally simple; it does not
establish worst-case late-game replay cost.

Isolating only Discovery's tick-start production approximation over 24 hours,
with constant panel production and no facility/skill feedback, Cash was below
exact completion-boundary integration by 0.03595% at 500 steps, 0.00285% at
5,000 steps and 0.000143% at 100,000 steps. Existing tick-start semantics remain;
there is no per-completion render/dispatch loop.

The audit reproduced a fractional-boundary error: balanced replay initially
returned 23 completions plus `3599.999999866` progress for exactly one day.
Normalization within one microsecond of progress fixes it. The focused
`discoveryTiming.test.ts` verifies 500/5,000/100,000-step completion accounting
and ensures a genuinely unfinished bar is not prematurely completed. Actual
StoredTimeSimulation was rerun after the fix and returned 24 completions.

Temporary measurement scripts used `/tmp/discovery-audit.ts` and
`/tmp/discovery-balance.ts`. Their conclusions are recorded here because temporary
scripts are not durable repository artifacts.

## Review and handoff

Independent review reconciled the complete inventory below with authored effect
assets and dynamic resolvers. Findings fixed during implementation included
legacy checkpoint defaults, scientist-dependent Pocket calculations, high-count
Fallen logarithms, Discovery placement after additive facility effects and Cash
exponentiation, Planet-pricing isolation, phase-aware source attribution and
fractional completion boundaries. Live QA additionally caught purchase persistence
and missing Quantum phase-prop wiring; both were fixed and affected paths rechecked.
No known unresolved code blocker was reported by the independent review.

Exact current player-facing descriptions are maintained in
[`src/ui/gameplay/discovery/skillMessages.ts`](../../src/ui/gameplay/discovery/skillMessages.ts)
and [`src/ui/gameplay/discovery/messages.ts`](../../src/ui/gameplay/discovery/messages.ts),
with phase-specific Quantum text in
[`src/ui/gameplay/quantum/messages.ts`](../../src/ui/gameplay/quantum/messages.ts).
The inventory below records every final mechanic; `skill-description-ui.txt`
records the inspected runtime wording. Additive descriptions use
**“Bonuses are additive.”**

Handoff leaves `discovery-prototype` unmerged and unreleased, with a draft PR,
running Transcendence preview at `http://127.0.0.1:5192/play/` and the committed
pre-unlock fixture under `test/fixtures/discovery/`. Draft PR: [#216](https://github.com/BlindsidedGames/IdleDysonSwarm/pull/216). No deployment or store-submission changes were made.

## Effect disposition inventory

This inventory defines the post-unlock contract. Before the unlock every entry
retains its existing behaviour. It covers 104 authored skills, 10 augments, all
27 Secrets and all 20 Quantum upgrades. Independent review has reconciled every classification against authored effects
and dynamic resolvers. This does not claim exhaustive interaction QA; platform
and scenario limitations remain explicit in the ledger above.

`G(x) = min(2, 0.1 × log10(1 + max(0, x)))` is a fractional additive
Discovery-speed bonus. All positive Discovery-speed sources add to base speed 1.
Negative Science effects have no Discovery replacement. Names and internal IDs
are listed together so dynamic resolvers can be checked against authored data.

### Skills

32 converted; 72 unchanged. No skill node is hidden or automatically assigned,
refunded or Fractured. Unchanged formulas may consume the new panel lifetime or
all-worker counts naturally; that does not restore a retired Science dependency.

| Skill (internal ID) | Disposition | Post-unlock contract |
|---|---|---|
| Addiction to Power (`addictionToPower`) | Converted | Science penalty retired; other effects and conditions preserved. |
| Aggressive Algorithms (`agressiveAlgorithms`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| AI Managers (`aiManagerTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Androids (`androids`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Artificially Enhanced Panels (`artificiallyEnhancedPanels`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Assembly Lines (`assemblyLineTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Assembly Megalines (`assemblyMegaLines`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Avocados (`avocados`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Banking (`banking`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Burnout (`burnOut`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Citadel Council (`citadelCouncil`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Cluster Networking (`clusterNetworking`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Cold Fusion (`coldFusion`) | Converted | +75% Discovery speed; Cash penalty and Fractured rules preserved. |
| Data Centers (`dataCenterTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Dimensional CAT cables (`dimensionalCatCables`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Science *2 (`doubleScienceTree`) | Converted | Discovery Speed: +25% Discovery speed. |
| Dyson Subsidies (`dysonSubsidies`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Economic Dominance (`economicDominance`) | Converted | Science penalty retired; other effects and conditions preserved. |
| Economic Revolution (`economicRevolution`) | Converted | Worker-allocation condition satisfied; existing Cash benefit. |
| End of the Line (`endOfTheLine`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Fragment Assembly (`fragmentAssembly`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Fusion Reactors (`fusionReactors`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Galactic Paradigm Shift (`galacticPradigmShift`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Higgs Boson (`higgsBoson`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Hubble Telescope (`hubbleTelescope`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Hypercube Networks (`hypercubeNetworks`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Idle Electric Sheep (`idleElectricSheep`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Idle Spaceflight (`idleSpaceFlight`) | Converted | G(active panels / 100,000,000) Discovery speed. |
| Indulging in Power (`indulgingInPower`) | Converted | Science penalty retired; other effects and conditions preserved. |
| Investment (`investmentPortfolio`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| James Webb Telescope (`jamesWebbTelescope`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Manual Labour (`manualLabour`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Mega Swarm (`megaSwarm`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Monetary Policy (`monetaryPolicy`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| One Minute Plan (`oneMinutePlan`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| 20s Lifetime (`panelLifetime20Tree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Panel Maintenance (`panelMaintenance`) | Converted | Existing full-worker lifetime addition; all Bots are workers. |
| Panel Warranty (`panelWarranty`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Paragon (`paragon`) | Converted | +150% Discovery speed; exclusivity preserved. |
| Parallel Computation (`parallelComputation`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Parallel Processing (`parallelProcessing`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Planet Assembly (`planetAssembly`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Planets (`planetsTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Pocket Androids (`pocketAndroids`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Pocket Dimensions (`pocketDimensions`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Pocket Multiverse (`pocketMultiverse`) | Converted | Existing logarithmic formula uses total Bots instead of scientists. |
| Pocket Protectors (`pocketProtectors`) | Converted | Existing logarithmic formula uses total Bots instead of scientists. |
| Power Overwhelming (`powerOverwhelming`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Power Underwhelming (`powerUnderwhelming`) | Converted | +25% Discovery speed replaces Science exponent. |
| Science Boost (`producedAsScienceTree`) | Converted | Discovery Boost: +100% Discovery speed; allocation condition retired. |
| Production Scaling (`productionScaling`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Progressive Assembly (`progressiveAssembly`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Purity of Body (`purityOfBody`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Purity of Mind (`purityOfMind`) | Converted | +5% Discovery speed per unspent SP, capped at +200%; Cash effect preserved. |
| Purity of Essence (`purityOfSEssence`) | Converted | +2% Discovery speed per unspent SP, capped at +100%; other effects preserved. |
| Quantum Computing (`quantumComputing`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Reapers (`reapers`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Regulated Academia (`regulatedAcademia`) | Converted | Existing fragment enhancement applies live to Discovery production above 1×; no lifetime/progress change. |
| Renegade (`renegade`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Renewable Energy (`renewableEnergy`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Repeatable Research (`repeatableResearch`) | Converted | +50% Discovery speed; research-cost effect retired. |
| Rocket Mania (`rocketMania`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Rudimentary Singularity (`rudimentarySingularity`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Saren (`saren`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Scientific Dominance (`scientificDominance`) | Converted | +100% Discovery speed; Cash penalty and Fractured rules preserved. |
| Scientific Planets (`scientificPlanets`) | Converted | Existing logarithmic formula uses total Bots instead of scientists. |
| Scientific Revolution (`scientificRevolution`) | Converted | +50% Discovery speed; allocation condition retired. |
| Servers (`serverTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Shell Worlds (`shellWorlds`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Shepherd (`shepherd`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Shoulder Surgery (`shoulderSurgery`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Shoulders of Giants (`shouldersOfGiants`) | Converted | G(existing generated Science-level rate) Discovery speed, computed directly; no research levels accrue. |
| Shoulders of Precursors (`shouldersOfPrecursors`) | Converted | Total Discovery speed replaces Cash conversion normally and multiplies it when Fractured; exclusivity preserved. |
| Shoulders of the Enlightened (`shouldersOfTheEnlightened`) | Converted | +10% Cash per completed Discovery while prerequisites are met; no hidden Cash research. |
| Shoulders of the Fallen (`shouldersOfTheFallen`) | Converted | log2(1 + completed Discoveries) extra Planets/s; Scientific Planets and related requirements preserved. |
| Shoulders of the Revolution (`shouldersOfTheRevolution`) | Converted | +1% Cash per completed Discovery. |
| Solar Bubbles (`solarBubbles`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Cash & Science (`startHereTree`) | Converted | Cash & Discovery: retain +20% Cash; +20% Discovery speed. |
| Staying Power (`stayingPower`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Stellar Dominance (`stellarDominance`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Stellar Improvements (`stellarImprovements`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Stellar Obliteration (`stellarObliteration`) | Converted | Science penalty retired; other effects and conditions preserved. |
| Stellar Sacrifices (`stellarSacrifices`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Super-Radiant Scattering (`superRadiantScattering`) | Converted | G(SRS charge seconds / 100) Discovery speed; Cash, Bots and facility benefits preserved. |
| Super Swarm (`superSwarm`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Supercharged Power (`superchargedPower`) | Converted | +25% Discovery speed; other effects preserved. |
| Supernova (`supernova`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Taste of Power (`tasteOfPower`) | Converted | Science penalty retired; other effects and conditions preserved. |
| Terra Eculeo (`terraEculeo`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Firma (`terraFirma`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Gloriae (`terraGloriae`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Infirma (`terraInfirma`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Irradient (`terraIrradiant`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Nova (`terraNova`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terra Nullius (`terraNullius`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Terraforming Protocols (`terraformingProtocols`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Ultimate Swarm (`ultimateSwarm`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Unsuspicious Algorithms (`unsuspiciousAlgorithms`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Versatile Production Tactics (`versatileProductionTactics`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| What could’ve been (`whatCouldHaveBeen`) | Converted | G(existing generated Science-level rate) Discovery speed, computed directly; prerequisites and related skills preserved. |
| What Will Come to Pass (`whatWillComeToPass`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Worker Boost (`workerBoost`) | Converted | Existing full-worker benefit; all Bots are workers. |
| Worker Efficiency (`workerEfficiencyTree`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |
| Worthy Sacrifice (`worthySacrifice`) | Unchanged | Existing effects, ownership, prerequisites and refund rules preserved. |

### Augments

| Internal ID | Disposition | Post-unlock contract |
|---|---|---|
| `subskill.cashScience.production` | Converted | +25% Discovery speed; Cash benefit preserved. |
| `subskill.cashScience.lifetime` | Unchanged | Existing lifetime modifier applies to the new base. |
| `subskill.cashScience.decay` | Unchanged | Existing decay benefit. |
| `subskill.srs.hotStart` | Unchanged | Existing grant/top-up, persistence and non-refundable rules. |
| `subskill.srs.afterglow` | Unchanged | Existing retention, cap and reset rules. |
| `subskill.srs.deepExposure` | Unchanged | Existing charging ramp and Stellar Memory scaling. |
| `subskill.srs.focusedBeam` | Converted | Enhance both SRS Cash and Discovery-speed bonuses by +50%, scaled by Stellar Memory; no allocation comparison or halving. |
| `subskill.srs.researchConversion` | Converted | Existing charging benefit; Science penalty retired without replacement. |
| `subskill.srs.researchActivity` | Converted | Continuous +150% SRS charging while assigned, scaled by Stellar Memory; pre-unlock 30-second trigger preserved. |
| `subskill.srs.stellarMemory` | Unchanged | Existing earned-charge banking, multiplier and reset rules. |

### Secrets

Only currently revealed Secrets contribute. Normal permanent-Secret restoration
continues through resets. Enhancement adds to Regulated Academia before applying
`M = 1 + (D − 1) × (1 + E)`; it never changes base panel lifetime.

| Secret | Disposition | Post-unlock benefit |
|---|---|---|
| 1 | Converted | +2% live Discovery production enhancement above 1×. |
| 2 | Unchanged | Existing non-Research benefit preserved. |
| 3 | Converted | +2% live Discovery production enhancement above 1×. |
| 4 | Converted | +2% live Discovery production enhancement above 1×. |
| 5 | Converted | +2% live Discovery production enhancement above 1×. |
| 6 | Converted | +5% Discovery speed. |
| 7 | Converted | +2% live Discovery production enhancement above 1×. |
| 8 | Unchanged | Existing non-Research benefit preserved. |
| 9 | Converted | +2% live Discovery production enhancement above 1×. |
| 10 | Converted | +5% Discovery speed. |
| 11 | Converted | +5% Discovery speed. |
| 12 | Converted | +2% live Discovery production enhancement above 1×. |
| 13 | Converted | +2% live Discovery production enhancement above 1×. |
| 14 | Converted | +2% live Discovery production enhancement above 1×. |
| 15 | Converted | +5% Discovery speed. |
| 16 | Unchanged | Existing non-Research benefit preserved. |
| 17 | Unchanged | Existing non-Research benefit preserved. |
| 18 | Unchanged | Existing non-Research benefit preserved. |
| 19 | Unchanged | Existing non-Research benefit preserved. |
| 20 | Unchanged | Existing non-Research benefit preserved. |
| 21 | Unchanged | Existing non-Research benefit preserved. |
| 22 | Converted | +5% Discovery speed. |
| 23 | Unchanged | Existing non-Research benefit preserved. |
| 24 | Unchanged | Existing non-Research benefit preserved. |
| 25 | Unchanged | Existing non-Research benefit preserved. |
| 26 | Unchanged | Existing non-Research benefit preserved. |
| 27 | Unchanged | Existing non-Research benefit preserved. |

### Quantum upgrades

| Internal ID | Disposition | Post-unlock contract |
|---|---|---|
| `BotMultitasking` | Obsolete and hidden; prerequisite treated as satisfied | No purchase; historic ownership retained. Secrets and Division remain accessible without granting either upgrade. Current purchase resolver does not require Multitasking ownership, so no synthetic ownership is added. |
| `ScienceBonus` | Converted | Discovery Booster: G(purchased levels) Discovery speed; existing count and price progression. |
| `Automation` | Converted | Retain Auto Bots; retire Research automation and its description. |
| `DoubleIP` | Unchanged | Existing effect, cost and ownership preserved. |
| `BreakTheLoop` | Unchanged | Existing effect, cost and ownership preserved. |
| `QuantumEntanglement` | Unchanged | Existing effect, cost and ownership preserved. |
| `Secrets` | Unchanged | Existing effect, cost and ownership preserved. |
| `Division` | Unchanged | Existing effect, cost and ownership preserved. |
| `Avocado` | Unchanged | Existing effect, cost and ownership preserved. |
| `Fragments` | Unchanged | Existing effect, cost and ownership preserved. |
| `Purity` | Unchanged | Existing effect, cost and ownership preserved. |
| `Terra` | Unchanged | Existing effect, cost and ownership preserved. |
| `Power` | Unchanged | Existing effect, cost and ownership preserved. |
| `Paragade` | Unchanged | Existing effect, cost and ownership preserved. |
| `Stellar` | Unchanged | Existing effect, cost and ownership preserved. |
| `InfluenceSpeed` | Unchanged | Existing effect, cost and ownership preserved. |
| `CashBonus` | Unchanged | Existing effect, cost and ownership preserved. |
| `MatrioshkaBrains` | Unchanged | Existing effect, cost and ownership preserved. |
| `BirchPlanets` | Unchanged | Existing effect, cost and ownership preserved. |
| `GalacticBrains` | Unchanged | Existing effect, cost and ownership preserved. |

### Cross-system dependency checklist

The following cross-system dependencies were included in implementation and
independent source review; interaction evidence remains limited to the ledger:

- Dynamic resolvers: Money/Science, Planet generation, Shoulders accrual,
  Pocket production, Precursors, worker allocation and lifetime effects.
- SRS charging, Focused Beam and all preview/Stored Time paths.
- Research-strength Secrets and Regulated Academia: suppress old research
  effects and use a single live Discovery enhancement.
- Avocato: G(current production multiplier − 1) for Discovery speed; Cash and
  facility effects remain unchanged. Feeding and the point wallet stay separate.
- Infinity Auto Research: obsolete and hidden; stale purchase rejected. Quantum
  Permanent Automation keeps Auto Bots. Automation target iteration skips Research.
- Scientist allocation and research commands: reject at the command boundary;
  presets cannot recreate scientists. Preserve historical Science statistics.
- Breakdowns, phase descriptions, assignment previews and Wiki Secret rows must
  use the same conversion values. No research-level simulation may continue.

Inventory source: `src/game-data/generated/skill-tree-presentation.json`,
`src/simulation/skillSubskills.ts`, `src/simulation/quantumUpgrades.ts`, Secret
entries and dynamic-resolver review. Numerical conversions are authored in
`src/simulation/discovery.ts` and resolved in `discoveryEffects.ts`.

Final UI evidence: [360px](../qa/discovery-prototype/narrow.png),
[German at 130% text](../qa/discovery-prototype/german-text130.png),
[actual skill dialogs](../qa/discovery-prototype/skill-descriptions.txt).

Final native card screenshots: [iOS](../qa/discovery-prototype/ios.png),
[iOS expanded](../qa/discovery-prototype/ios-expanded.png),
[packaged macOS](../qa/discovery-prototype/macos.png),
[macOS expanded](../qa/discovery-prototype/macos-expanded.png).
Expanded narrow browser evidence: [360px details](../qa/discovery-prototype/narrow-expanded.png).
Independent follow-up review found no theme-scope or maintainability issues;
its accessible-name finding was addressed without adding visible copy.

### Unboxed Discovery and Avocato follow-up

Removed the Discovery title icon and outer panel; retained the full-width bar,
whole-header disclosure and accessible name. Avocato's total-production panel
is now two aligned label/value rows above feeding. Discovery purchases follow
the Transcendence balance/reset card. Reset consequences appear during confirmation,
with the threshold/status retained in the collapsed card. Avocato's greeting
scrolls with its page so enlarged text does not pin a large introduction above
all controls.

Browser visual QA: desktop and 360px collapsed/expanded Discovery, keyboard
collapse, Avocato desktop/mobile, 130% text with no horizontal overflow, and
scrolling the greeting away to reach both upgrades. Existing Avocato confirmation,
cancellation, pending/save-failure and eligibility tests pass (3 tests); typecheck
and lint pass. Native screenshots above show the preceding iteration; this small
follow-up was verified in the browser, not rebuilt for native hosts.

Evidence: [Avocato desktop](../qa/discovery-prototype/avocato-desktop.png),
[360px](../qa/discovery-prototype/avocato-narrow.png),
[130% text while scrolled](../qa/discovery-prototype/avocato-text130.png).

### Approved presentation and internal candidate — 22 September

Discovery uses a purple panel with a thick recessed track, a raised fill, and a centered timer. Its heading and shared resource slot show the original Research magnifying glass beside the multiplier without an × prefix. The Transcendence figure-and-halo symbol is shared by navigation, the Avocato balance and reset reward. Avocato shows the balance as icon plus amount and the reset action as “Transcend for [icon] 1”. Concise Discovery notes were added to 4.1.11 in every supported locale.

Matthew authorized internal distribution to Google Play, Internal TestFlight and Steam beta. Candidate 2026092202 retains the current 4.1.10 testing marketing version. The feature branch remains unmerged.

### 23 September — internal 4.1.10 consolidation and persistence review

The unreleased 4.1.11 notes are folded into 4.1.10, including the Permanent 2× Bots fix and a concise research/preset persistence fix. Marketing version remains 4.1.10; internal candidate 2026092301.

Save review: schema 12+ canonical records now take precedence over legacy mirrors, including empty research/presets, ownership, timers, Avocato, facility arrays and historical parity repairs. Ordinary checkpoints publish validated current state without rerunning migration. Pre-12 Unity migration and supported later version upgrades remain covered. Migration-origin metadata is preserved on reload.

Regression evidence: the full suite passed before the notes-only change (1,827 tests); the added exact-checkpoint regression and Wiki consolidation checks pass. Typecheck, lint and localization pass. Live disposable-browser QA used skill reset and Infinity controls, exported state, reloaded, and confirmed the empty preset and zero research stayed cleared. The Research screen was inspected after reload. The separate reported native web-content restart remains unconfirmed; this fix does not claim to resolve its trigger. Native gameplay interactions are not re-certified by this release build.

### 24 September follow-up

Implemented the approved bug-hunt fixes, iOS 16 minimum and facility/megastructure balance. See [QA evidence and exact final values](../qa/2026-09-24-bughunt-fixes.md). Work remains unmerged and undeployed; native interaction and full progression balance validation are explicitly outstanding.
