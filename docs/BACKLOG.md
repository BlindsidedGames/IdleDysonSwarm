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

### Deferred achievements

- [ ] Implement and certify achievements, statistics, and rich presence through
  the Electron/Steam host. Source: [parity P-01](audits/unity-web-parity-audit-2026-08-20.md#p-01--steam-achievements-stats-and-rich-presence-have-no-web-implementation).
- [ ] Before enabling Steam achievements, verify first-completion achievement
  timing, the reported false Division Master unlock, and Point Blank
  progress-notification cadence.
