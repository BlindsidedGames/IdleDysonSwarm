# Complete skill augments: review and Mac handoff

Status: discussion paused; proposal remains unimplemented. Reviewed on 30 September 2026.

Branch: `skill-augment-proposal`. Reviewed proposal/runtime snapshot:
[`8f072ae12e0f4513c362106eaff98e6dac4c9106`](https://github.com/BlindsidedGames/IdleDysonSwarm/commit/8f072ae12e0f4513c362106eaff98e6dac4c9106).
This handoff adds documentation and analytical artifacts only. It preserves the original proposal and gameplay source.

The proposal covers all 97 previously empty parents with 485 augments. Its dependency metadata and several safety contracts are useful, but reachability, practical choices and runtime interactions need further evidence before implementation. The reported gameplay simulations **were not independently reproduced**. Findings below distinguish reproducible analytical errors from concerns requiring gameplay evidence.

Requested review execution was Sol 6.1 with high reasoning. Active deployment/effective effort was not exposed to the reviewer, so this document does not certify that metadata.

## Timing target and latest design direction

Matthew's clarification was: “24 hourts of simulated game time, probably 48 hours when factoring in 2x speed so 24 hours real+offline time”. The supplied working interpretation is **roughly 24 elapsed hours including offline, corresponding to about 48 simulated game hours at 2×**. The initial phrase says 24 simulated hours; retain that discrepancy in the record rather than silently equating all clocks.

Runtime mapping at the reviewed snapshot:

- Permanent Double Time applies 2× to both active base seconds and Stored Time replay base seconds: [gameStep.ts:104–117](../../src/simulation/gameStep.ts#L104).
- Genuine absence grants bank credit, without running production. Normally each elapsed away second credits one base bank second; owned Idle Electric Sheep (IES) makes it two, subject to capacity: [lifecycleAwayTime.ts:198–227](../../src/simulation/lifecycleAwayTime.ts#L198), [timeResources.ts:177–188](../../src/simulation/timeResources.ts#L177).
- Replay passes base seconds to `advanceGame` and then debits those consumed base seconds: [canonicalGameApplication.ts:1572–1599,1620–1627](../../src/application/canonicalGameApplication.ts#L1572).
- Default capacity is 86,400 base seconds; existing bank occupies capacity. Unspent/clipped credit gives no completed production, and replay takes additional device time: [timeResources.ts:7](../../src/simulation/timeResources.ts#L7).

With Double Time throughout, no IES, and all accepted credit spent:
`game hours = 2 × (active elapsed hours + spent bank base hours)`.
Sixteen active hours plus eight away hours supplies 48 game hours after replay. With IES and enough capacity, that schedule supplies 64: 32 active plus 32 replayed. IES's offline contribution is four game hours per elapsed away hour because credit and replay have separate multipliers. If Double Time unlocks partway through, calculate each interval at its actual speed.

**Direction to evaluate, not a finalized balance rule:** Matthew accepts that IES can halve elapsed completion time with significant investment, and leans against adding direct production benefits to skills whose baseline time effect is already strong. The halving is a potential outcome of sufficiently offline-heavy play, not a guarantee for every schedule. Evaluate marginal choice value and investment before altering IES or other time skills. No such balance change is implemented here.

## Ranked findings

### 1. High: documented samples omit a mandatory Catalyst allocation

All nine challenges award **16 total Catalysts**: one each from Blank Slate and Trial and Error, plus two each from seven Quantum challenges. Repeats do not add more; Convergence grants none. This agrees with the proposal's intended budget: [proposal:45,57](complete-skill-augments.md#L45), [canonicalInfinityReset.ts:180](../../src/simulation/canonicalInfinityReset.ts#L180), [quantumTransitions.ts:269–274](../../src/simulation/quantumTransitions.ts#L269), [infinityChallenges.ts:10,66](../../src/simulation/infinityChallenges.ts#L66).

Built by Hand requires an already Fractured Manual Labour. Fracturing permanently spends one Catalyst, and the ID survives Transcendence: [challenge entry:22](../../src/simulation/canonicalInfinityChallengeRestart.ts#L22), [transaction:188–205](../../src/simulation/canonicalSkillTransactions.ts#L188), [reset:29,75–80](../../src/simulation/canonicalOverflowReset.ts#L75).

Consequently at most **15 of the 97 new parents** can be Fractured on a normally reachable all-challenges account. The documented new-only sampler selects 16 new parents; Manual Labour is absent from that catalog. Those samples **as documented** require 17 total Catalysts. Neither the sampler description nor the at-most-16-Fractures statement accounts for Manual Labour outside that budget: [proposal:92–94](complete-skill-augments.md#L92), [math:263–265](complete-skill-augment-math.md#L263).

The current-skill sampler also does not document reserving Manual Labour. Only 16/104 unrestricted sixteen-parent sets include it. Without raw configurations/harnesses, the actual executed allocation and number of affected current-skill runs cannot be established.

This invalidates the claimed reachable-loadout interpretation of the documented samples, **not the overall design**. Fifteen new parents remain available; relaxed sixteen-parent maxima remain conservative upper bounds. Correcting the new-parent limit changes maximum new nodes from 34 to 33 and education's relaxed new allowance from 15.55 to 15.05 (native-source ceiling 16.55× to 16.05×). These are annotation-based ceilings, not fully reachable builds.

Next evidence: audit actual configurations, fix Manual Labour into the reachable account, and sample at most fifteen additional parents. Do not infer that Convergence fails from this sample defect alone.

### 2. High: timing evidence calibrates Convergence, not the full augment design

Convergence is a separate proposed challenge-completion reward, `lambda = ln(2)/300 game seconds`. It needs a legitimate first Galactic Brain. All 384 reported broad runs add Convergence; the 128 new-branch runs spend SP while withholding all new augment effects: [proposal:49–94](complete-skill-augments.md#L49).

Preparation includes 19 Divisions, 27 Secrets, 100 Quantum Cash and Science levels, permanent SP systems, late unlocks and Double Time. Completing challenges alone does not establish this readiness. Automatic Infinity is disabled during the push; first-Brain acquisition and preceding-Infinity Banking/Investment matter: [proposal:34–43,94](complete-skill-augments.md#L34), [canonicalInfinityReset.ts:189–207](../../src/simulation/canonicalInfinityReset.ts#L189).

The reported 18–28 processed-base-hour band corresponds to 36–56 game hours at fixed Double Time and brackets the interpreted 48-game-hour target. Reported 222/384 within 24 base hours and all within 31 do not establish most reachable builds finishing within 24 elapsed hours. Preparation, seed delay, offline schedule, IES, clipping and processing must be included. The proposal itself reports 13.515 elapsed versus 21.515 processed base hours with IES: [proposal:98–106](complete-skill-augments.md#L98).

The isolated eight-link prefactor `0.0649618987` and 33.7438 Double Time base hours after the first Brain reproduce analytically. This is not a whole-game proof. Effect-withheld runs cannot establish meaningful choices or safety of 485 interacting effects.

### 3. Medium: Universal Toolkit is double-counted in the frontier annotations

Universal Toolkit replaces Flexible Shift's coefficient 1 with 2; its closure already includes Flexible Shift. The additive annotations contribute both 1 and 2, incorrectly totaling 3. The branch specification says replacement nodes should contribute only the increment: [catalog JSON:10256,10287–10306](complete-skill-augment-catalog.json#L10256), [branches:107](complete-skill-augment-branches.md#L107).

All thirteen published pre-Discovery channel maxima reproduce from the uncorrected annotations. Correcting the replaced coefficient gives:

| Channel | New allowance, declared → corrected | Including native 1× |
| --- | --- | --- |
| AI Managers → Lines | 16.523333 → 15.623333 | 17.523333× → 16.623333× |
| Planets → Data Centers | 14.990000 → 14.623333 | 15.990000× → 15.623333× |

This overstates the frontier rather than concealing runaway power. Correct annotations, tables, figures and witnesses together. Per-channel optima are independent, not a simultaneously achievable loadout.

### 4. Medium: retention capstones can offer zero marginal value

- Frozen Charge: 4 additional SP, 15 with prerequisites, retains at most 60 SRS seconds. Webb Archive: 2 additional SP, 4 with prerequisites, retains at most 120. Existing Hot Start costs 3 SP and grants at least 1,800 seconds. Proposed retention combines by maximum with complete native restoration, so either new choice adds zero when Hot Start applies: [catalog:2000,2051–2056,4020,4043](complete-skill-augment-catalog.md#L2051), [skillSubskills.ts:80–88](../../src/simulation/skillSubskills.ts#L80), [srsAugments.ts:71–80](../../src/simulation/srsAugments.ts#L71).
- Infinite Altar: 5 additional SP, 18 with prerequisites, retains one generated Brain. If Super Swarm is already Fractured, existing 1-SP Head Start supplies thirty of every unlocked facility, including Brains, as a legitimate Convergence seed: [catalog:5453–5458](complete-skill-augment-catalog.md#L5453), [skillSubskills.ts:53–54](../../src/simulation/skillSubskills.ts#L53), [swarmAugments.ts:33–50](../../src/simulation/swarmAugments.ts#L33).

These are conditional redundancies, not proof of global domination: choosing Hot Start or Head Start can require another Catalyst. Define each capstone's intended audience and marginal role before changing prices.

### 5. Medium: Common Curriculum's condition is absent from its formula

Its technical text requires at least half the Bots as Scientists; the pre-Discovery formula omits that predicate: [catalog JSON:3550–3552](complete-skill-augment-catalog.json#L3550), [catalog:905–906,937–940](complete-skill-augment-catalog.md#L937). Resolve intended behavior including Bot Multitasking and Discovery's retired allocation.

Smaller wording issues: Liquid Assets' “every 20 tenfold increases” sounds discrete while `.001*log10(1+Cash)` is continuous ([catalog:2621,2633](complete-skill-augment-catalog.md#L2621)). Cold Storage's exclusion of “cost discounts” is ambiguous about genuinely paid discounted research versus free/gifted levels ([catalog:371](complete-skill-augment-catalog.md#L371)).

### 6. Evaluation: Purity paths need complete marginal-outcome comparisons

Native Essence is 256 at 42 unspent SP versus 142.210941 at 31. Spending the full 11-SP Inner Universe closure leaves 5.2901% of the former five-basic-link fixed-state prefactor from that loss alone. Clear Horizon's three-point path leaves Essence(39) and adds three 2× mega links, giving roughly 3.893× the original fixed-state chain prefactor.

These are analytical illustrations, not completion times or proof of a dead path. Research, education, Factory, cash/science and other Purity interactions can compensate. Compare complete Inner Universe, Clear Horizon alone, native Purity and useful non-Purity spending at both 32 and 42 SP: [branches:143–155](complete-skill-augment-branches.md#L143).

### 7. Evaluation: safety contracts require new canonical state and substantial scope

Useful proposal boundaries include no new Fragment tags, shared discount caps, reward provenance, Convergence excluded from Galactic Tinker's funded-Stellar cap, and no refund/refill or Discovery reward recursion. Finite SP alone does not prevent accumulated gift/refund loops.

Current Tinker already uses funded Stellar creation; lawful fractured Stellar zero-Bot costs must remain eligible: [manualFacilityAugments.ts:43–50](../../src/simulation/manualFacilityAugments.ts#L43), [stellarArithmetic.ts:53](../../src/simulation/stellarArithmetic.ts#L53). Education currently emits completions without the proposed transferred/natural provenance: [dreamEducationUpgrades.ts:233–258](../../src/simulation/dreamEducationUpgrades.ts#L233). Away-time handling consumes timestamps and credits a bank; it does not supply the catalog's proposed durable accepted-absence event-ID ledger: [lifecycleAwayTime.ts:185–248](../../src/simulation/lifecycleAwayTime.ts#L185).

485 effects, 121 Discovery variants, six later-tier variants, new actions, provenance ledgers, persistence/migrations, artwork and localization are substantial scope. Unique names and bounded coefficients do not prove unique practical choices. Consider a staged batch with a clear active/idle/reset/cross-system purpose per choice; complete coverage remains the user's goal.

## Reproducible analysis and evidence limits

Run from any working directory with Python 3.10+; standard library only:

```sh
python docs/plans/complete-skill-augment-review/verify_proposal.py
# Optional explicit output (default is JSON on stdout):
python docs/plans/complete-skill-augment-review/verify_proposal.py --output /tmp/ids-augment-audit.json
```

[Verifier](complete-skill-augment-review/verify_proposal.py) and [recorded output](complete-skill-augment-review/analytical-audit.json) accompany this handoff. The verifier reads the proposal/runtime catalogs, checks coverage, closures/costs and finite annotation-based knapsack bounds, then computes the isolated formulas. Default execution writes no files. It hashes both input catalogs after normalizing CRLF to LF for Windows/Mac consistency; its reviewed-commit field identifies the original snapshot, not future changed inputs.

Verified inventory: 104 base skills, seven existing augmented parents, all 97 empty parents covered, 485 unique proposed IDs/names, 1,162 total node SP, 1,060 local closed subsets, maximum closure 19 SP, and no stored closure/entry-cost discrepancies. The report includes relaxed and Manual-Labour-reserved bounds and coefficient witnesses. They omit native donor/existing augment costs and runtime eligibility; they are **not fully legal gameplay loadout witnesses or an interaction safety proof**.

No canonical gameplay simulation, benchmark, browser acceptance or native UI verification was performed in this review. The author's experiment bundle is referenced only at `/Users/matthewrushworth/Builds/ids-augment-design-20260930` ([proposal:190](complete-skill-augments.md#L190), [math:318](complete-skill-augment-math.md#L318)); harnesses, raw configurations/traces and source hashes are not among the proposal additions. Published timing outcomes remain author-reported.

## Resume on the Mac

1. Fetch and fast-forward `skill-augment-proposal`; check `git status` before touching any existing Mac work. Inspect this handoff and its adjacent audit artifacts.
2. Locate the author's local experiment bundle. Check exact code hashes, units, preparation, first-Brain source, Manual Labour allocation and the actual 16-total-Catalyst invariant. Preserve raw configurations and traces for reproduction.
3. Rerun reachable-account controls with Manual Labour fixed, at most fifteen new parents and actual 32→42 SP acquisition. Separate all-challenges preparation from the subsequent push, and report elapsed, processed base, and game time explicitly.
4. Compare active/idle schedules with and without IES, real bank capacity/spending and processing time. Evaluate the user's direction against direct production additions on already strong time skills.
5. Correct the documented coefficient/predicate inconsistencies, then compare complete effects and existing alternatives. Verify provenance/refund/reset loops through canonical owners before implementation approval.

Open decisions: whether to adopt Convergence separately; legitimate seed sources including Head Start; minimum preparation and offline policy for the elapsed-day target; distinct roles for redundant capstones; practical choice count and staged scope; and later-Transcendence behavior. Discussion is paused, and no augment, reward or balance rule has been approved for implementation by this handoff.

The Windows review used a separate isolated clone. The screenshot checkout and server were not changed. This documentation/analysis commit is the authorized transfer path; no Library upload is needed. No review process needs to remain running after the push.
