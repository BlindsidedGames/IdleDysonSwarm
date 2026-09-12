# Player control and state inventory — 12 September 2026

Source checkpoint: `7bc88cd7c8045e48675e343ed2374a0cfd8706d7`.
This is a source inventory and browser review plan, **not exercised coverage**.
No production files, player saves, purchases or external accounts were changed.

The companion [JSON](player-control-inventory-2026-09-12.json) enumerates 205
static JSX control sites from 57 gameplay, startup-shell and shared-component
files. Each entry includes source path/line, handler, accessible-name and disabled
expressions where present. Mapped controls create many runtime instances; 205 is
neither a count of visible buttons nor a claim that all states were tested.
Custom component reuse and document-level secret gestures are covered below.

## Navigation and disposable fixtures

Use a disposable browser profile and independent preview origin. Import only
checked-in fixtures through Settings. The existing implementation recipe is
`scripts/performance/browserFixtureImport.ts`: Settings → Import → fill
`#settings-import-save-text` → Review Save → wait for
`.settings-surface__import-preview` → Import → verify success status. Keep the
baseline and candidate profiles separate, including presentation preferences.

All route IDs: `bots`, `research`, `skills`, `infinity`, `challenges`, `reality`,
`simulations`, `quantum`, `avocato`, `story`, `wiki`, `offline-time`, `statistics`,
`store`, `debug`, `settings`. Navigation selector:
`[data-navigation-id="ID"] .dyson-navigation__link`. Prefer the visible drawer
instance after More/Menu; hidden/inert copies are not player interactions.
Current items are disabled with `aria-current="page"`. Some unrevealed items are
absent; revealed locked destinations can be disabled and show progress. An invalid
persisted route falls back to Bots. Last route is stored under
`idle-dyson-swarm.gameplay.last-route.v1`.

Fixture files live in `test/fixtures/progression/`, with checksums and certification
in `fixture-manifest.json`. Import itself applies receiving-device policies, so
raw fixture bytes are not an expected post-import export equality oracle.

| Fixture | Main use | Additional states required |
| --- | --- | --- |
| fresh | First-run/start/tutorial, hidden facilities, no funds, basic routes | Purchase first facility/research; actual unlock transitions |
| mid-swarm | Every basic facility, research, Skills, money/science | Infinity threshold; automation remains locked |
| first-infinity | Infinity shop and **Challenges** unlocked | Enter and abandon Blank Slate; no Galvanizers initially |
| mature-infinity | Both Bots/Research automation unlocks, active economy | Rapid on/off, toggle-all, preset routing, break target |
| reality-unlock | Reality and upgrades | Gather/worker capacity, Dream start/era transitions |
| mature-simulations | Populated canonical Dream run, permanent upgrade | Education running/completed, Information and Space Age, black hole |
| quantum-unlock | Quantum threshold, pre-leap confirmation | Cancel then leap, owned/unowned upgrade boundaries |
| late-quantum | All listed Quantum unlocks, Avocato, multitasking | Its Dream is empty; does not cover mature Simulations |
| maximum-skills | Many owned/exclusive/fragment/augment skill states | Refund dependencies, retained/permanent conflict, Galvanization |

**Manifest limitation:** its `reachableRoutes` list omits Challenges, although
loading first-infinity and later fixtures confirms `challenges.unlocked=true`.
Use actual published navigation/state, not the manifest alone. No listed fixture
has earned a Galvanizer. Completing an ordinary Infinity in Blank Slate unlocks
its first reward; replay must not duplicate that one-time reward.

Developer aids are separate from natural progression evidence. Debug supplies
amount input, continuous/discrete maximum buttons, add cash/bots/skill points/
Infinity points/Quantum shards/influence/strange matter, simulated offline time,
progression presets, unlock-all-tabs, tinker 1s/instant, recalculate skill points,
reset secret progress, and disable debug. Unlock-all-tabs exposes destinations but
does not establish purchase/reset eligibility. Debug itself requires the injected
development service; enabling host debug or purchasing its local progression
unlock is not equivalent to importing another installation's entitlement.
Presets: early-swarm (1,000 bots), mid-swarm (100,000), near-star (195,000),
new-galaxy (200,000), young-galaxy (2e15), half-galaxy (1e16), near-galaxy (1.8e16),
one-galaxy (2e16), galaxy-group (2e17), first-infinity (4.2e19), reality-unlocked.

## Control families and required states

For every action below distinguish: hidden, visible locked, unaffordable,
affordable, pending, accepted, rejected/failure, completed/capped, and reloaded
persistence where applicable. Only state families applicable to that action need
coverage. A click alone does not prove that a command committed or saved.

| Route/family | Controls and dialogs | Important conditions and expectations |
| --- | --- | --- |
| Shell | More/Menu, close button, backdrop, navigation, skip link, footer; collapsible sections/settings panels | Narrow/wide layouts, Escape, focus return, keyboard navigation, hidden drawer inertness, newly unlocked badge clears on actual visit; navigation preference survives reload |
| Bots/tinker | Tinker click/hold/pointer release/cancel, facility purchase per visible tier, facility details/close | Tinker cadence, no duplicate click after hold; purchase route and quote eligibility; zero/insufficient funds, pending, failure; owned/generated counts and production after purchase |
| Bots controls | Buy 1/10/50/100/Max, rounded bulk, collapsed run facts, preset automation Off/slots, per-facility automation and Toggle All | Setting pending disables relevant controls; automation remains responsive across pending requests and final state follows latest intent; unlocked-only controls; preserve non-selected facility flags |
| Distribution | Bot allocation range | 0/100%, intermediate keyboard/pointer values, commit on release/blur, rejected route; multitasking changes presentation and disables allocation controls where appropriate |
| Research | Every visible research purchase, buy 1/10/50/100/Max, rounded bulk, maxed visibility, preset automation, per-research automation/Toggle All | One-time vs repeatable/maxed, affordability and exact quote, ordering after purchases, failure indication, latest intent; research and Bots settings remain separate |
| Skills tree | Search/type/clear; skill node; double-click assignment; pan/zoom wheel/pinch; zoom in/out/center; augment enter/back; labels | Search missing/matching/localized text, offscreen centering; locked/exclusive/owned/non-refundable/fragment/queued/galvanized states; image loading; settings disclosure |
| Skill detail | Purchase/refund, dependency/production-impact Confirm/Cancel, preset inclusion checkbox, Back/Close, outside click/Escape | Show affected dependencies/dependants and Purity/Supernova impact; insufficient points/fragments and exclusive conflicts; non-refundable/permanent ownership; no mutation on cancellation; focus restored |
| Skill settings | Auto-assign non-refundable, show labels, double-click assignment, preset notifications, Reset, Presets | Reset review separates refundable and retained ownership; pending buttons; cancelled reset unchanged; committed reset preserves protected skills |
| Skill presets | Quick slot switch; full list/load; conflict confirmation; rename/save; color choices; export/copy; import/paste/review/confirm/cancel; priority drag/up/down/remove | Current vs other slot, empty queue, dependency addition/removal, retained conflicts, exact preview, invalid import, clipboard unavailable; order boundary buttons disabled; persistence after route/reload |
| Galvanization | Currency help, eligible detail Galvanize, Confirm/Cancel | Requires unlock and positive Galvanizers; eligibility and already-galvanized states; permanent retention after reset/refund/import; no duplicate currency spend |
| Infinity | Manual reset, automatic reset toggle, break-target input/apply, hide maxed, every shop item, View Overflow | Eligible threshold and reward; normal vs Break Infinity; numeric locale/invalid/unchanged target; owned/maxed/unaffordable shop entries, pending/rejection, automatic target warning |
| Challenges | Blank Slate Start/Replay, restart confirmation/Cancel, Abandon/confirmation | Unlocked only; overflow blocks action; active/completed/first reward; restart and cancellation save behavior; ordinary Infinity requirement |
| Reality | Gather Influence, every Reality upgrade, permanent Simulation upgrade, Open Avocato | No workers vs gatherable/full-capacity/automatic gathering; costs and cap; missing/unavailable data; upgrade hidden/eligible/owned; canonical progression after gather |
| Simulations | Era/education disclosures; Hunters/Gatherers purchases; Community/Factories boosts; education Start; Solar/Fusion purchases; Black Hole; quantity 1/10/50/100/Max and rounded buying | Foundational/Information/Education/Energy/Space Age visibility; free vs paid boost/running clock; education unavailable/running/complete; insufficient funds; cost scaling/batch rounding; black-hole reward/capped/reset |
| Quantum | Quantity 1/10/50/100/Max, hide maxed, each upgrade, hold-to-buy; leap confirmation/Cancel; Open Avocato | Repeatable vs one-off/maxed, quote/currency changes, affordability; hold ends on global pointerup/cancel/lost focus even if button becomes disabled; entanglement can bypass confirmation; leap eligibility/reward |
| Avocato | Feed Infinity points, influence, strange matter; Overflow reset/Confirm/Cancel | Purchased vs overflow-only route, spendable vs invested resources, capped multipliers, pending and insufficient balance; overflow reward and retained state |
| Avotation | Help, timed Skip, seven secret panel clicks, completion dialog/Continue, replay | Ordered required step and route availability, countdown disabled state, completion persistence; normal panel action still works |
| Stored Time | Capacity upgrade; #offline-time-amount range; duration presets/Max; #offline-time-accuracy; spend/arm/confirm/Cancel; repeat; job Speed Up/Cancel; completion Close | Empty/insufficient bank, cheater guard, capacity/max, processing preset availability; no deduction on arm/cancel; job running/completion/cancel accounting; disable concurrent spending; route drafts and completion focus |
| Quick Stored Time | Drawer duration buttons and active-job Cancel | Available seconds, pending/job-active/cheater disabled; same canonical accounting as main route |
| Story | Chapter disclosures | Only published chapters/passages; newly revealed passage/chapter, retained disclosure preference; no invented future text |
| Wiki | Topic buttons, compact category select, inline category links, lore/patch-note disclosures | All categories; English/French/English; scroll and selected topic; no missing-message fallback regressions |
| Statistics | Disclosures/readouts | Early/late route-specific values; no action buttons unique to statistics; avoid treating display inspection as transaction coverage |
| Settings presentation | Number notation (mixed/standard/scientific/engineering), language/system, processing interval 33–200 and restore default, nav text/shortcuts, swarm visualization, audio music/effects/mute | Locale parser/display equivalence, effective locale fallback; range release/key/blur commit; unavailable route; receiver-local preference behavior on import and reload |
| Settings saves | Import/text/file/review/commit/cancel, Export/text/copy/download/close, full Reset/confirm/cancel | See dedicated save matrix below; file and clipboard host availability; pending, failure and success status; focus trap and return |
| Store | Product cards, support products, owned Double IP enable/disable, Restore, gallery link | Listing unavailable/no price, loading, purchase/restore pending, owned/local-debug entitlement, browser device-only explanatory state; real purchase is external and excluded from blind clicking |
| Debug | Numeric amounts/max, additive commands, presets, tab unlock, tinker options, recalculation, secret reset, disable | Invalid/negative/nonfinite/discrete-range entries, disabled service, purchased vs unavailable, operation pending/failure; only disposable test states |
| Notifications | Dismiss transient notice; first disaster dialog Continue/View Reality; preset conflict notices | Coalesced vs first event, notification preference, correct focus and route, no replayed dismissals after reload |
| Startup/recovery | Start, take over writer, check again, retry, import recovery text, export recovery, copy original, start fresh; error boundary Reload/Export Recovery | No save, valid save, recoverable backup, malformed/current-future schema, commit failure, blocked writer, diagnostic unavailable; preserve rejected original bytes and avoid replacing healthy save on failure |

Specific stable selectors supplement role/name queries:
`[data-skill-id="ID"]`, `.skill-details__point-action`,
`.skill-settings__reset`, `.skill-settings__open-presets`,
`.skill-settings__preset-row`, `.skill-preset-management-dialog`,
`.skill-preset-priority`, `[data-quantum-upgrade-id="ID"]`,
`.infinity-challenge-card__confirmation`, `.settings-surface__dialog`,
`.settings-surface__import-preview`. Accessible labels may contain formatted
prices or quantities: match stable family/containing article, not a stale quote.

Avotation sequence (source: `quantum/AvocatoMeditationSecretTrigger.tsx`):
Quantum `[data-quantum-upgrade-id="Secrets"]` → Infinity
`.infinity-surface__summary` → Bots `.dyson-shell__info` → Skills
`.skill-settings__preset-row:first-child` → Settings
`.settings-surface__panel--more` → Research `.research-surface__settings` →
`.dyson-shell__side-heading > span`. Runtime markers expose
`[data-avotation-target]`. These listeners are not JSX buttons and require explicit
coverage; clicking a panel can also perform its normal action.

## Save-focused acceptance matrix

1. Export a known fixture-derived session before changing anything; verify the
   export is parseable through production import preparation. Capture canonical
   balances, ownership, automation, presets, progression and receiving preferences.
2. Close/cancel Export, Import and Reset; verify durable state remains unchanged
   except legitimate live progression. Opening import/review is not a commit.
3. Review valid text then edit it or select another file: require fresh preview
   for that input. Review whitespace, malformed text, unsupported envelope and
   future schema; failed imports must leave the prior session playable and saved.
4. Import both checked-in Web saves and a repository legacy IDB1 fixture. Verify
   preview → commit → live state → reload. Receiving-device entitlement and local
   presentation policies intentionally mean imported bytes need not round-trip
   unchanged. Do not compare raw exports while time advances as a save-loss test.
5. After each major state-changing family, export/reload and compare protected
   fields: facility/research counts, skill/preset order and permanent ownership,
   currency spent/earned ledgers, challenge/Quantum/Avocato progress, stored bank,
   capacity and automation choices. Export candidate and import into disposable
   baseline only if schema compatibility permits; validate via the shared codec.
6. Run an actual stored-time job, cancel midway, repeat and reload: compare bank
   debit and accepted progress, ensure there is no second offline credit.
7. Full-reset commit is destructive to the disposable fixture session: verify
   promised retained installation-local state and first-run progression; export
   beforehand and recover via import. Do not perform against any real profile.
8. Multi-tab writer takeover and corrupted-primary/backup/failure cases require
   isolated storage fault setups. Unit tests are evidence for these branches,
   not a claim that browser fault cases were manually exercised.

## Existing test pointers

These are scenario locations, not a fresh passing-test claim. The companion JSON
lists relevant files; this table identifies starting points.

| Family | Existing tests/source evidence |
| --- | --- |
| Facilities, controls and allocation | `FacilityRegion.contract.test.tsx`, `FacilityScaling.contract.test.tsx`, `DysonControls.test.tsx`, `BotDistribution.test.tsx`, `FittedProductionLine.test.tsx` |
| Automation and pending settings | `useAutomationToggle.test.tsx`, `usePlayerSettingsCommands.test.tsx` |
| Skills | `SkillsSurface.assignment.test.tsx`, `SkillsSurface.search.test.tsx`, `SkillsSurface.augments.test.tsx`, `SkillDetailsDialog.test.tsx`, `src/application/skillPresetReleaseCertification.test.ts` |
| Infinity/challenges | `InfinitySurface.test.tsx`, `InfinityChallenges.test.tsx`, `src/application/infinityChallengeIntegration.test.ts`, `src/simulation/infinityChallenges.test.ts`, `canonicalInfinityReset.test.ts` |
| Reality/Simulations | `SimulationsSurface.test.tsx`, `src/simulation/realityWorkers.test.ts`, `canonicalDreamReset.test.ts` |
| Quantum/Avocato | `QuantumSurface.test.tsx`, `AvocatoSurface.test.tsx`, `src/application/quantumReleaseCertification.test.ts`, `src/simulation/quantumTransitions.crosscheck.test.ts`, `quantumShardLedger.test.ts` |
| Time | `OfflineTimeSurface.test.tsx`, `QuickStoredTime.test.tsx`, `src/application/storedTimeJobIntegration.test.ts`, `src/workers/storedTime/*.test.ts` |
| Settings/content/notifications | `SettingsSurface.test.tsx`, `WikiSurface.test.tsx`, `content.test.ts`, `GameplayNotificationHost.test.tsx`, `DebugSurface.test.tsx` |
| Save import/migration/atomic persistence | `src/save/import.test.ts`, `importContext.test.ts`, `serialization.test.ts`, `serializationOrdering.test.ts`, `migrate.test.ts`, `repository.test.ts`, `startupResolver.test.ts` |
| Platform recovery/export | `src/platform/browserSaveDatabase.test.ts`, `portableCloud.test.ts`, `steamCloudRecovery.test.ts`, `saveFileExport.test.ts` |

The save tests include receiving-device entitlement rejection, local preference
retention, preserved stored-time banks/capacities, exact serialization ordering,
backup rotation and failed temporary verification preserving the current save.
Browser verification should demonstrate the corresponding player flow where it
can be safely reached, and explicitly leave fault-injection/native-only cases
uncovered when not exercised.

## Boundaries and remaining work

Do not blindly activate real-money purchase/support, account restoration or
external community/store/gallery links during an exhaustive button sweep. Native
achievement overlays, store checkout, host restore and cloud writes need an
isolated/mock host or separately authorized real environment. Local reset, leap,
challenge restart, black hole, feed and Galvanization are legitimate test actions
only in disposable fixture sessions with pre-action evidence.

Browser coverage must record actual route/control/state, baseline and candidate
results, screenshot or exported-state evidence, and explicit failures/skips.
The inventory does not prove all combinatorial states, all languages, keyboard/
touch accessibility, platform overlays, late-Simulation states, first-disaster
branches, or save-failure recovery have been exercised. No gameplay regression
claim follows from this document alone.
