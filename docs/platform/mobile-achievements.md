# Mobile achievements

Android uses Play Games Services v2 (`play-services-games-v2:22.0.0`) and
project `459986324498`. iOS uses GameKit with the Game Center entitlement.
Both publish the shared evaluator's 27 neutral achievements; the web host
does not initialize either provider. Settings exposes the provider's achievement
list and an explicit sign-in retry. Authentication failure does not block play.

## Provider records

`hosts/capacitor/achievement-map.json` records the console IDs verified on
2026-09-05. The native Kotlin and Swift allowlists mirror this file, checked by
`scripts/mobile-achievement-mapping.test.ts`. Never substitute the seven deleted
Google draft duplicates: the seven published IDs were deliberately repurposed
with user approval, preserving existing unlock history and their original points.
The remaining 20 Google records are drafts. Apple's 27 new records are separate
from the seven archived legacy achievements. Console configuration is still
unpublished; implementation does not publish it.

## Evidence and retry

The existing game evaluator captures milestones before prestige resets.
Mobile additionally persists the bounded, provider-neutral `idsAchievementEvidence`
array in the game's own save. Older saves without it continue to load; current
progress is evaluated on opening. Past milestones which an old save no longer
proves cannot be reconstructed. Unknown optional evidence is ignored. Evidence
travels with save export/import, and a different imported or reset save does not
inherit an unrelated publication queue. It contains no account or platform IDs.

Reporting is serialized and retried at most every 30 seconds during play, with
an additional attempt on resume. Native hosts cache successful reports only for
the currently authenticated player in memory. Account changes clear that cache;
failed reports remain retryable. Google's `unlockImmediate` task and Apple's
report completion are the success boundaries. No achievement can grant a store
entitlement or change gameplay. Steam retains its existing transient-evidence
behavior; mobile persistence is explicitly opted in by its publication adapter.

## Validation and release gates

Local validation covers shared rules, mapping completeness and retained IDs,
serialized retries, optional-provider failures, durable save round-trips, and
save import isolation. Both native Debug builds compile. Android debug retains
its `.debug` application ID and existing production-save isolation.

The local Android emulator lacks working Play Games services; its debug package
is also distinct from the production OAuth package. End-to-end reporting requires
a Play-enabled device, an authorized tester, and a signing certificate/package
matching a configured Play Games Android credential. Do not remove the debug
suffix merely to make authentication succeed. Use an internal signed production
build or an explicitly configured test credential.

iOS simulator gameplay and unavailable-Game-Center retry are exercised locally.
Authenticated sandbox reporting still needs a signed, Game-Center-enabled build
and a signed-in tester. Check one new unlock, an already-unlocked achievement,
offline/reconnect, relaunch, and switching accounts on each provider before
claiming live parity. Store upload and achievement publication remain separate
release steps. No production save or provider achievement history is reset by
this integration.

References: [Play Games setup](https://developer.android.com/games/pgs/android/android-start),
[Android achievements](https://developer.android.com/games/pgs/android/achievements),
[GameKit authentication](https://developer.apple.com/documentation/gamekit/gklocalplayer),
[GameKit achievement reporting](https://developer.apple.com/documentation/gamekit/gkachievement).
