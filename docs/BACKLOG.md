# Product and parity backlog
This is the root-level action list for work that remains after the Web port.
Detailed evidence belongs in the linked audits and release documents rather
than being duplicated here.

Status conventions:

- `[ ]` accepted work not yet verified complete.
- **In progress** means another isolated task currently owns implementation.
- **Deferred** means the work is intentionally outside the current release.
- **Decision required** means implementation should not begin until the product
  behavior is chosen.

## Current cross-platform work

- [x] Keep the Stored/Offline Time progress indicator visible and preserve the
  original job when an additional spend is requested while a run is active.
- [ ] Reproduce and prevent repeated offline-time credit from an immediate
  desktop export/import cycle.
- [ ] Investigate the historical report that active Stored Time incorrectly
  behaved as though Break the Loop and Quantum Entanglement were owned. Treat
  it as progression integrity work; the original reporter save remains only in
  the archived development context unless a sanitized fixture is supplied.
- [ ] Improve Reality onboarding so Gather Influence is obvious at unlock and
  the initial Wiki presentation supports rather than obscures that action.
- [ ] Verify first-completion achievement timing, the reported false Division
  Master unlock, and Point Blank progress-notification cadence before Steam
  achievements are enabled.

- [ ] **Review and certify native cross-platform audio.** The shared audio
  implementation is integrated on `main`; before release, complete macOS/iOS
  compilation, the physical Android/iOS acceptance matrix, and a subjective
  headphone/speaker A/B and whole-track loop-transition check. Confirm volume
  and mute persistence, lifecycle/focus recovery, output-route changes, long
  playback, and the absence of duplicate music or excessive cue overlap.
  Record results in [audio implementation evidence](audio-implementation-evidence.md).
  Source: [parity P-03](audits/unity-web-parity-audit-2026-08-20.md#p-03--unity-audiomusic-behavior-and-volume-controls-are-absent-on-web).
- [ ] Implement device-local number notation with functional Standard,
  Scientific, and Engineering modes, and apply the selected formatter
  consistently across every player-facing resource, rate, cost, statistic,
  tooltip, and accessible value. Source: [parity P-04](audits/unity-web-parity-audit-2026-08-20.md#p-04--several-unity-presentation-preferences-are-preserved-as-data-but-have-no-web-behavior).
- [ ] Implement the hide-purchased-research preference, including consistent
  filtering, empty-state behavior, keyboard/focus safety, and persistence
  across reloads. Source: parity P-04.
- [ ] Implement a device-local inactivity-screensaver toggle and define its
  idle threshold, lifecycle behavior, reduced-motion behavior, dismissal, and
  interaction with background/offline processing. Source: parity P-04.
- [ ] Implement device-local presentation frame-rate choices matching Unity's
  10, 30, 60, and Maximum options. Limit only rendering/animation delivery;
  canonical 10 Hz simulation, commands, saves, imports, lifecycle events, and
  offline accounting must remain unchanged. Source: parity P-04.
- [ ] Implement a device-local Skill interaction preference for direct
  purchase on click/tap versus opening Skill details first. Preserve drag/pan,
  pinch, keyboard activation, purchase eligibility, confirmation, and
  accessibility behavior in both modes. Source: parity P-04 and the Unity
  `skillsBuyOnTap` behavior.
- [ ] Persist the last selected top-level game destination as a device-local
  preference and restore it after reload, PWA restart, Electron restart, or
  native host recreation. Restore only a currently unlocked and reachable
  destination; fall back safely to Bots if the saved route is unknown, locked,
  or no longer available. Keep dialogs, drafts, and nested/transient panels
  out of the persisted route. Source: [parity P-05](audits/unity-web-parity-audit-2026-08-20.md#p-05--web-always-starts-on-bots-instead-of-restoring-the-last-top-level-screen).
- [ ] Restore the maintained live message-of-the-day, allowlisted official
  website and community links, Patreon entry, and supporter credits. Keep
  external navigation behind the host boundary; render fetched content as
  text only with bounded timeout, validation, and a non-blocking fallback;
  preserve supporter attribution when offline; and test Web, Electron, and
  native-host behavior without allowing remote content to affect gameplay or
  startup. Source: [parity P-06](audits/unity-web-parity-audit-2026-08-20.md#p-06--live-motd-community-links-and-supporter-credits-are-missing-from-web).

## Skill-tree correctness

- [x] Recheck current line unlocks during imported-preset Infinity-reset
  assignment and define how blocked queued skills remain queued. Source:
  [skill F-01](audits/skill-tree-audit-2026-08-20.md#cross-cutting-and-high-priority-findings).
- [x] Advance Androids, Pocket Androids, and Super-Radiant timers in canonical
  active time with their intended caps and reset behavior. Source: skill F-03.
- [x] Implement Idle Electric Sheep in admitted offline-time ordering. Source:
  skill F-04.
- [x] Port the shared manual-building modifier layer covering Swarm scaling,
  Terra count substitution, and the Supernova downside. Sources: skill F-05,
  F-06, and F-09.
- [x] Commit Shoulders science/cash auxiliary accrual into canonical events,
  including fractional research progress and offline behavior. Source: skill
  F-07.
- [x] Debit Stellar Sacrifices bots atomically with planet credit and resolve
  its exact-threshold behavior. Active ticks and adaptive Stored Time groups
  each use interval-start Bot funding; long grouped spends are deterministic
  for the same grouping and intentionally approximate rather than raw-100-ms
  equivalent. Source: skill F-08.
- [x] Resolve and test the formula/copy discrepancies tracked as skill F-10
  through F-20, starting with Panel Warranty and Regulated Academia.

Completion evidence and the requirement-by-requirement reconciliation are in
the [skill-tree audit implementation verification](audits/skill-tree-audit-2026-08-20.md#implementation-verification-2026-08-20).

## Current Web release acceptance

- [ ] Complete the remaining manual Web checks: visible focus paint, complete
  contrast review, 200 percent visual appearance, browser-native 400 percent
  zoom, 320/390-pixel visual reflow, real-touch slider behavior, and screen
  reader behavior. Source: [accessibility review](release/web-accessibility-review-2026-08-19.md).
- [ ] With explicit payment authority only, create and cancel an unpaid real
  Stripe Checkout session.
- [ ] When the release candidate changes materially, rerun the clean-candidate
  release evidence and archive the superseded evidence set. Source:
  [release readiness plan](release/web-release-readiness-plan-2026-08-19.md).

## Deferred platform release work

- [ ] **Deferred to a future release — full-game localization.** Keep the game
  intentionally English-only for the current release, consistent with its
  historical releases; this does not block current skill-tree fixes. A future
  localization release must cover all player-facing copy, including every
  generated skill-tree message and the authored locale catalogs, plus
  locale-aware formatting, layout expansion, fallback behavior, and
  per-locale rendering and interaction testing.
- [ ] **Deferred until Steam release — achievements, statistics, and rich
  presence.** Implement and certify publication through the Electron/Steam
  host. Source: [parity P-01](audits/unity-web-parity-audit-2026-08-20.md#p-01--steam-achievements-stats-and-rich-presence-have-no-web-implementation).
- [ ] **Deferred until Steam commerce work — Steam Store authority.** Replace
  the explicitly disabled Electron main-process Inventory binding, configure
  authoritative Steam ItemDef IDs for all five products, and keep renderer
  access behind the shared Store contract. Certify localized listings;
  durable Developer Options and Double Infinity Points ownership; consumable
  tip delivery and consumption; purchase success, cancellation, pending, and
  failure outcomes; restore; offline verified-cache behavior; Steam-account
  switching; renderer restart; and interrupted-consumption recovery. Treat
  this as a blocker for a monetized Steam release unless the Steam SKU
  intentionally excludes the Store. Source: [parity P-02](audits/unity-web-parity-audit-2026-08-20.md#p-02--the-electron-steam-store-is-explicitly-disabled).
- [ ] **Deferred until Android/iOS release work — native Store and device
  certification.** On physical devices and platform sandboxes, certify
  purchase success, cancellation, pending/interrupted transactions, durable
  ownership restore, account switching, reinstall, offline verified-cache
  behavior, and entitlement reapplication after import. Also certify in-place
  Unity-save migration, lifecycle/offline replay, update survival, and native
  accessibility before either Store submission. Sources: parity runtime gates
  R-01 through R-03.
