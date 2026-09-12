# Skills and Quantum player review — 12 September 2026

No introduced regression was found in the exercised flows. A pre-existing save
issue restores the cleared skill assignment queue in checkpoint data in both builds; owned
skills remain correctly reset. This is bounded browser
and save evidence, not a claim that every Skills/Quantum state or game control has
been exercised. The [control inventory](player-control-inventory-2026-09-12.md)
remains a separate source-based checklist.

The baseline was `output/visual-qa-4.1.8/baseline-web`; the candidate was
`output/performance/candidate-v6-dist`. Runs used separate disposable Chromium
profiles, sequential previews on port 4313, and explicit synthetic funding over
checked-in mid-swarm / late-quantum fixtures. No real player save, purchase or
external account was used. Synthetic funds establish action eligibility, not
natural progression reachability.

The [machine summary](player-skills-quantum-browser-2026-09-12.json) records
**78 passed observation assertions**, plus the separately reported pre-existing
queue restoration failure. Overall acceptance is false for that failed invariant. These are browser-evidence
assertions, not additions to the unit-test suite. Raw scripts, states and screenshots
are under `output/player-review/skills-quantum/` and
`output/player-review/skills-quantum-mobile/`.

## Skills

At both 1440×1000 and 390×1000, baseline and candidate matched exactly across
**37 recorded checkpoints per build and width**. Each run completed without
harness, page or console errors. The actual action controls were operated using
CDP pointer events and keyboard Enter/Escape. Text fills used input events;
fixture imports and route setup used the existing UI helpers.

Exercised flows:

- Search with no matches; clear; search Assembly Lines and open its detail with
  Enter; dependency confirmation cancel, then confirm; assignment and refund.
- Cold Fusion dependency review, cancellation and confirmed purchase; correct
  owned-state changes with prerequisites.
- Zoom in, zoom out and center buttons; settings disclosure.
- Reset review and cancel without changing owned state.
- Preset list and management modal; rename; native color disclosure and selection;
  export; invalid-import error; valid import preview, cancel and commit.
- Priority down/up with restored ordering, removal, Escape back to preset list,
  modal close, quick selection of preset 2 then preset 1.
- Confirmed reset, checkpoint through Export, reload, and full canonical skills
  and presets comparison. Rename/color and empty reset queues persisted.

Preset export strings were identical between builds. The compared canonical save
section included the full `skills` structure, not just its rendered point total.

The detail, reset-review and preset-management screenshots were byte-identical
between builds at both widths. Desktop priority screenshots also matched exactly.
The reviewed mobile priority screenshot remained readable and within the viewport;
its full image was not byte-identical, so no exact-image claim is made for it.
Desktop/mobile detail, reset, preset-management and priority layouts were visually
inspected. Tree initial/final screenshots were not claimed pixel-identical.

## Quantum

The desktop Quantum flow recorded **19 checkpoints per build**. Quantity controls
were selected at 1/10/50/100/Max. Cash Booster's single purchase increased level
15→16. A 1.15-second hold repeatedly purchased; releasing outside the button stopped
further purchases through the subsequent 750ms observation. Final runs reached
level 24 in both builds. An earlier run accepted one fewer repeat on the candidate;
wall-clock repeat count is scheduler-sensitive and is not an exact throughput gate.

Hide maxed reduced the visible upgrade cards from 17 to 4, and showing maxed
restored all 17. Bulk purchases then began from a fresh identical fixture so their
state comparison did not depend on timed hold counts. Actual Science Booster
purchases at 1/10/50/100 reached levels 16/26/76/176. Max consumed exactly the
remaining Quantum Shard ledger and disabled the unaffordable action. Bulk
observations and the final full canonical Quantum state matched between builds.
Export/checkpoint followed by reload retained the complete Quantum state in each.
No page/console errors occurred in the final Quantum runs. Initial/after-hold
screenshots were visually inspected; final corresponding image pairs were equal.

## Save timing distinction

An exploratory immediate forced reload roughly 100ms after Reset Skills recovered
an older checkpoint in both versions and restored previously assigned skills.
That run did not first checkpoint the reset. The regular dirty-save checkpoint
interval is 30 seconds; Export explicitly fences and checkpoints dirty state.
This is a pre-existing abrupt-reload window observed on both builds, not evidence
that a committed candidate save was lost. The exploratory raw record is
`report-abrupt-reload.json`.

Two owned-skill durability paths were verified:

1. Reset → Export/checkpoint → actual browser reload: the full canonical Skills
   and preset structures remained equal before/after in both builds and widths.
2. Assign Cold Fusion and dependencies → Export/checkpoint the **nonempty**
   owned sentinel → reload and verify that sentinel → Reset → **wait 31.5 seconds
   without Export** → actual browser reload → inspect/export. Both builds retain
   empty ownership. Direct save decoding records the raw assignment queue separately
   from preparation/import normalization.
   Read-only IndexedDB snapshots directly establish a nonempty durable state
   before waiting and empty ownership after waiting, before the final reload or
   Export. See `autosave-report.json` and the machine summary.

The first automatic-checkpoint attempt started from durable empty ownership, so
it could not distinguish a successful reset save from restoration of the initial
save. That superseded record is excluded from acceptance. A subsequent harness
assertion exposed a separate queue issue: reset ownership survives, but the active
assignment queue is already back in the durable checkpoint before reload in both
builds. Reset clears that queue in
canonical state; stale legacy queue data can repopulate it during save migration.
The report keeps ownership durability success and queue durability failure
separate, and records raw data alongside prepared/import-normalized queues.

The runtime starts `PeriodicCheckpointScheduler` after startup/import. Its
30-second interval requests a checkpoint when the ready application is dirty,
serializing the write through the runtime router; it is separate from active-time
simulation delivery. The final probe records document visibility/focus alongside
direct durable-state observations.

An initial same-URL CDP navigation encountered the writer-ownership screen on both
builds. Final checks used `Page.reload({ignoreCache:true})`; no takeover was needed
in those final runs. These setup iterations are kept separate from passed evidence.

## Explicitly uncovered in this lane

Galvanization and mobile Challenges/navigation are covered by the
[follow-up review](player-mobile-navigation-challenges-2026-09-12.md). Remaining
uncovered flows in this lane include retained non-refundable conflicts; augment navigation; tree
pinch/drag and priority drag handles; clipboard permission/copy/paste flows;
Quantum leap and individual one-off purchases; touch-native input, physical
phones and native overlays. The 390px run used Chromium mobile emulation with
mouse/keyboard actions. Other routes, original-fixture inventory and the broader
save-recovery matrix are recorded by their respective review lanes.

No production change was made during this review.
