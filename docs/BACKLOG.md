# Product backlog

This is the root-level action list for remaining release-certification and
Steam work. Detailed evidence belongs in the linked audits
and release documents rather than being duplicated here.

Status conventions:

- `[ ]` accepted work not yet verified complete.
- **In progress** means another isolated task currently owns implementation.
- **Deferred** means the work is intentionally outside the current release.

## Current release certification

1. [ ] Complete the remaining manual Web checks: visible focus paint, complete
   contrast review, 200 percent visual appearance, browser-native 400 percent
   zoom, 320/390-pixel visual reflow, real-touch slider behavior, and screen
   reader behavior. Source: [accessibility review](release/web-accessibility-review-2026-08-19.md).
   The compact navigation subset has current 320/390 portrait, compact
   landscape, enlarged-text, reload-persistence, and drawer-reachability
   evidence in
   [the original 2026-08-23 validation note](release/compact-bottom-navigation-validation-2026-08-23.md)
   and its
   [adaptive-navigation follow-up](release/adaptive-bottom-navigation-validation-2026-08-23.md);
   this does not close the broader physical-device and assistive-technology gate.
2. [ ] Complete native Store and device certification. On physical devices and
   platform sandboxes, certify purchase success, cancellation,
   pending/interrupted transactions, durable ownership restore, account
   switching, reinstall, offline verified-cache behavior, and entitlement
   reapplication after import. Also certify in-place legacy-save migration,
   lifecycle/offline replay, update survival, and native accessibility before
   either Store submission. Sources: the native host, Store, legacy-save, and
   release workflow contracts.

## Deferred Steam release work

- [ ] **Deferred until Steam commerce work — Steam Store authority.** Replace
  the explicitly disabled Electron main-process Inventory binding, configure
  authoritative Steam ItemDef IDs for all five products, and keep renderer
  access behind the shared Store contract. Certify localized listings;
  durable Developer Options and Double Infinity Points ownership; consumable
  tip delivery and consumption; purchase success, cancellation, pending, and
  failure outcomes; restore; offline verified-cache behavior; Steam-account
  switching; renderer restart; and interrupted-consumption recovery. Treat
  this as a blocker for a monetized Steam release unless the Steam SKU
  intentionally excludes the Store. Source:
  [Steam Inventory foundation](platform/steam-inventory-electron-foundation.md).
- [ ] Implement and certify achievements, statistics, and rich presence through
  the Electron/Steam host. Source:
  [achievement architecture audit](audits/achievement-platform-architecture-audit-2026-08-20.md).
- [ ] Before enabling Steam achievements, verify first-completion achievement
  timing, the reported false Division Master unlock, and Point Blank
  progress-notification cadence.
