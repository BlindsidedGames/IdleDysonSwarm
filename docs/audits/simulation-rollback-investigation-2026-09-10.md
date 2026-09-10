# Simulation rollback investigation — 10 September 2026

Status: deferred at the user's request; rollback mechanism reproduced,
unexpected reload trigger unresolved. B01 is restored in the backlog as a
deferred investigation. The earlier research persistence finding is not fixed.

## Evidence and scope

The earlier report's screenshot identifies iOS 4.1.7 (2609.05.03). The user now
reports that the whole simulation appears to roll back. The available local
Discord export contains the earlier research/reload messages and screenshot,
but no affected save, process-termination log, or newer whole-state comparison.
Current local source is main at `4a56278d`. No gameplay source was changed.

## Reproduced cause of full-state rollback

Manual `infinity.request-reset` uses ordinary in-memory dispatch in
`src/application/canonicalGameApplication.ts`; it is not one of the commands
routed through `dispatchCommitFirst`. The lifecycle coordinator returns its
transition without an additional save. `TransactionalGameApplication` marks
this state dirty. `PeriodicCheckpointScheduler` attempts saving every 30 seconds.

Consequently, an abrupt process restart before the next successful checkpoint
loads the last saved state, including a pre-Infinity state. A controlled
application-layer test compared these independent values:

| Value | Saved before Infinity | Live after Infinity | Abrupt restart before checkpoint |
| --- | --- | --- | --- |
| Bots | 4.2e19 | 1 | 4.2e19 |
| Cash | 123456 | 0 | 123456 |
| Science | 654321 | 0 | 654321 |
| IP | 1 | 2 | 1 |
| Cycle seconds | 60 | 0 | 60 |
| Research | 123 / 456 | empty | 123 / 456 |

After a successful checkpoint, restarting preserved the post-Infinity values.
A second test deliberately failed the checkpoint: restarting restored the
pre-Infinity values again. Both characterization tests passed. These tests use
an in-memory SaveRepository and a new application instance to model loss of
volatile state; they do not reproduce a spontaneous device crash or prove a
storage failure occurred for this player.

The 30-second interval is an attempt cadence, not a guaranteed maximum loss:
failed or delayed checkpoints can leave an older save. An entire reset returning
minutes later despite intervening successful checkpoints needs another cause.

## Reload trigger: evidence boundary

The installed Capacitor iOS handler `webViewWebContentProcessDidTerminate`
calls `bridge.reset()` and `webView.reload()`. A WebKit content-process termination
therefore has a concrete automatic page-reload path that bypasses the JavaScript
safe-reload checkpoint. This handler logs termination, but does not identify its
cause. Memory pressure, a WebKit crash, or another process termination cannot be
distinguished from this source alone, and none is established for this player.

Ordinary simulation rejection records an `active-time-failed` warning; the
examined path does not automatically reload the page. Explicit UI reload and
PWA update acceptance use checkpoint preparation. An internal post-commit
publication failure reloads the newly committed candidate, not an arbitrary old
checkpoint. No evidence currently connects these paths to the reported reload.

## Earlier research-only result remains separate

Resetting live research and saving/reloading it are separate operations. The
previous audit reproduced stale legacy research repopulating an empty stable
research map in migration. That can coexist with full-state rollback; removing
B01 from the backlog does not disprove it. The distinction is whether independent
values such as IP, cycle time, cash, and bots also return to the previous state.

## What would establish the remaining cause

An affected pre-failure save and exact device/build are needed for a meaningful
replay. For a process termination, obtain the matching iOS WebKit crash or
Jetsam/termination diagnostic and event time. For an in-process failure, retain
the first rejected-update reason and last successful checkpoint time. There is
no basis yet to label a particular simulation skill, memory leak, or storage
error as the player's reload trigger.

A commit-before-publication Infinity boundary would protect manual resets from
this demonstrated unsaved-reset window. Automatic Infinity needs a deliberate
persistence policy because it can run frequently. Neither change by itself fixes
the unexplained process termination. Implementation has not been undertaken.

## Follow-up: exhaustive reload call-path review

The user cannot supply the affected artifacts; this follow-up investigates
reachable code paths without requiring them.

| Path | Trigger | Result |
| --- | --- | --- |
| Capacitor iOS content-process termination | Native `webViewWebContentProcessDidTerminate` callback | Unconditional page reload; no final JavaScript checkpoint |
| Explicit reload/retry UI | User presses recovery/retry | Verifies checkpoint when ready, then shuts down and reloads; failed checkpoint refuses reload |
| PWA update | User accepts available update | Prepares safe reload and reloads after activation; PWA updates disabled for native hosts |
| Post-commit publication fallback | Save succeeds, staged engine publication rejects | Automatically constructs a new engine from the just-committed save, not an older backup |
| Save import/reset | Explicit import/reset operation | Replaces the session with the imported/reset save |
| Startup recovery | Startup discovers unusable primary and valid backup | Starts from backup; does not itself trigger a running page to reload |
| Writer ownership lost | Browser lease loss | Stops/detaches runtime and displays ownership-lost; no automatic reload |
| Active simulation rejection | Invalid transition or active-time failure | Rejects update/records warning; no automatic reload |
| React render exception | Error boundary catches exception | Displays recovery UI; reload requires a click |
| Ordinary background/resume | Lifecycle event | Uses existing coordinator/application; no page reload |

Additional native dependency reload methods exist for changing WebView server
paths, and navigation-error handlers can load a configured error page. The app
has no calls to those server-path methods and configures no error page.
The controller loads its initial page in `loadView`, not on each `viewDidAppear`.
Android's renderer-gone callback delegates to listeners and does not contain
iOS's unconditional `webView.reload()` behavior.

### Verification

Two targeted application tests and the existing safe-reload and simulation-engine
suites passed: 22 tests total. The first new test attempted a tick and player
command during a pending commit-first write: both were rejected, the write then
completed, and the session revision did not change. The second injected a staged
publication rejection after a successful write: session revision increased, but
the reloaded cash value was the newly committed value (888), proving this fallback
loads the new candidate. Fault injection establishes fallback behavior, not that
this failure occurred naturally.

The reviewed game-application persistence, browser runtime, native composition,
safe-reload helper, PWA update controller, and Capacitor config files have no diff
between the screenshot's 4.1.7 source baseline `56c4f028` and current `main`.

Conclusion: the code contains a confirmed automatic iOS page-reload path on
content-process death and a distinct automatic in-memory recovery path after
post-commit publication failure. No examined gameplay error handler deliberately
reloads an older save instead of continuing. The exact cause of a WebKit process
termination is still not established by static analysis or these controlled tests.
