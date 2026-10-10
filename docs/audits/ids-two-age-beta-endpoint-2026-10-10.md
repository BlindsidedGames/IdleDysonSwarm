# Two-age beta endpoint — 10 October 2026

Matthew approved Forager plus Farming as the beta scope at 07:02 UTC, with a
clear endpoint and More coming soon afterwards. This does not approve a release
before the actual first-two-age rewards and migration are complete.

## Implemented endpoint

The real completed Farming screen now adds: "Forager and Farming are complete.
More coming soon." It appears only after the existing complete-village command
and settlement of already-paid work. English, seven translations and both pseudo
catalogs are compiled through the established workflow. The sentence reuses the
existing era names in each language. No next-age button, consumer, fabricated
reward or later-age progress track is added.

Existing completed Farming behavior is terminal: no active job queue, no further
village production/shipments and no additional simulated-time advancement of
that civilization. Stocks and earned records remain visible. The added copy
uses the current Civilization preview composition, Bots/Research typography
and Infinity dock, without a new layout or artwork. Narrow German completion
copy clipped at 320px/200% text; the local Farming preview now wraps long words.

An isolated actual-domain playthrough advances the first-run fixture through
Forager, explicitly starts Farming, manually buys necessary Granaries, completes
the village and settles paid jobs. Serialization/reload retains `phase: complete`;
another 3,600 simulated seconds leaves civilization identical. It earns exactly
six Forager and six Farming receipts and a 12-Catalyst wallet under current code.
It uses no player save and grants no synthetic reward receipt. Evidence is
`output/farming-endpoint/domain-evidence.json`; the generator is
`/Users/matthewrushworth/Documents/Codex/2026-10-10/task-3/generate-farming-endpoint.mts`.

## Remaining reward decisions — release blockers

The proposed seven Forager plus six Farming total is not complete. The extra
Forager point's placement remains pending: the parent's proposal is two at the
existing trade milestone, one at each other opening milestone. There are six
existing Forager milestone IDs; seven Catalysts need not mean seven artificial
milestone IDs.

Current Forager also has 65 representable continuation awards and a target 66
outside Int64. Restrict new rewards to the approved opening once the finite
reward/migration policy is approved; retain historical receipts, wallets and
owned fractures rather than deleting past earnings. Do not hide that continuing
engine behind completion wording or call the seven-point first age implemented.
Receipt quantities/versioning and any owed one-point delta for an old trade
receipt require a concrete exactly-once migration policy before compensation.

Farming already has six real one-time checks: first Home; Pasture or Kiln;
Waterworks; Hall; three connections; six supported Homes plus six connections.
Each currently pays one Catalyst into the existing wallet. Credit is deferred
when the wallet is full or the existing Skill tree has no eligible unfractured
choice. This is durable and tested; it is not an age-specific reward-node system.
No Farming-specific fracture nodes are authored.

If the beta promise requires all six credits regardless of current Skill tree
availability, choose between keeping this explicit pending-award policy or
crediting earned Catalysts independently while leaving spending eligibility
unchanged. The latter is recommended for a simple guaranteed 13-Catalyst total,
but changes reward behavior and is not implemented here. Do not invent six new
node effects as a substitute without gameplay approval.

## Verification limits

The browser runner `scripts/farming-beta-endpoint-qa.ts` imports the domain-built
synthetic save into disposable sandbox-enabled Chromium with mock Keychain and
non-loopback requests blocked. It checks the completed phase, visible localized
endpoint, absence of next-age actions, text clipping/overflow and an actual 44px
Settings target at desktop/mobile sizes; German and RTL also cover 320px/200% text.
Evidence is under `output/farming-endpoint/`, including the captured before-wrap
failure. The final all-ten-locale pass has 22 check records/22 captures with no
runtime exceptions, text clipping or document overflow. A further German/RTL
pass has 10 records/10 captures, verifying that the notice's beginning and end
can be read and hit-tested through the existing scroll area at 320px/200% text;
its evidence is `output/farming-endpoint-reach/`. Representative desktop,
mobile, Japanese, German enlarged-text and RTL pixels were inspected. The large
existing disabled-focus dock leaves a short scrolling viewport at 200% text;
this wording change preserves its accepted composition rather than claiming a
new compact terminal layout. Native hosts, fluent-speaker review and screen-reader delivery remain
unverified. There is no new low-value copy-only repository test: existing Farming
owner cases cover completion, settlement, reload and frozen subsequent progress.
The full current suite passes 2,287/2,287 with no skipped/pending/todo cases.
TypeScript, oxlint, complete i18n checks and production build/promotion/Store
boundary checks pass; the existing large-chunk warning remains. Catalog diff
evidence confirms one added endpoint message in each translation (2,619 keys)
and no changed existing value.

The [save-safety audit](ids-rework-beta-save-safety-2026-10-10.md) specifies the
one-way migration proposal and the experimentally verified prefix hazard.
Schema, prefix, storage/app/account identity and real saves remain unchanged.
