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

- [ ] **In progress — native cross-platform audio.** Restore bundled music and
  button effects with native iOS/Android playback, Web/Electron fallbacks,
  device-local volume controls, lifecycle handling, and compressed assets.
  Source: [parity P-03](audits/unity-web-parity-audit-2026-08-20.md#p-03--unity-audiomusic-behavior-and-volume-controls-are-absent-on-web).
- [ ] Decide and implement the supported Unity presentation preferences:
  notation, hide-purchased research, screensaver behavior, and whether frame
  rate remains host-owned. Source: [parity P-04](audits/unity-web-parity-audit-2026-08-20.md#p-04--several-unity-presentation-preferences-are-preserved-as-data-but-have-no-web-behavior).
- [ ] Restore the last valid unlocked top-level route after reload, falling back
  safely to Bots. Source: [parity P-05](audits/unity-web-parity-audit-2026-08-20.md#p-05--web-always-starts-on-bots-instead-of-restoring-the-last-top-level-screen).
- [ ] **Decision required — community and live content.** Decide whether to
  restore MOTD, official links, Patreon/supporter credits, or replace them with
  a smaller maintained surface. Source: [parity P-06](audits/unity-web-parity-audit-2026-08-20.md#p-06--live-motd-community-links-and-supporter-credits-are-missing-from-web).

## Skill-tree correctness

- [ ] Recheck current line unlocks during imported-preset Infinity-reset
  assignment and define how blocked queued skills remain queued. Source:
  [skill F-01](audits/skill-tree-audit-2026-08-20.md#cross-cutting-and-high-priority-findings).
- [ ] Advance Androids, Pocket Androids, and Super-Radiant timers in canonical
  active time with their intended caps and reset behavior. Source: skill F-03.
- [ ] Implement Idle Electric Sheep in admitted offline-time ordering. Source:
  skill F-04.
- [ ] Port the shared manual-building modifier layer covering Swarm scaling,
  Terra count substitution, and the Supernova downside. Sources: skill F-05,
  F-06, and F-09.
- [ ] Commit Shoulders science/cash auxiliary accrual into canonical events,
  including fractional research progress and offline behavior. Source: skill
  F-07.
- [ ] Debit Stellar Sacrifices bots atomically with planet credit and resolve
  its exact-threshold behavior. Source: skill F-08.
- [ ] Resolve and test the formula/copy discrepancies tracked as skill F-10
  through F-20, starting with Panel Warranty and Regulated Academia.

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

- [ ] **Deferred until Steam release — achievements, statistics, and rich
  presence.** Implement and certify publication through the Electron/Steam
  host. Source: [parity P-01](audits/unity-web-parity-audit-2026-08-20.md#p-01--steam-achievements-stats-and-rich-presence-have-no-web-implementation).
- [ ] **Deferred until Steam commerce work — Steam Store authority.** Replace
  the explicitly disabled Electron Store binding and certify purchases,
  cancellation, restore, and ownership. Source: [parity P-02](audits/unity-web-parity-audit-2026-08-20.md#p-02--the-electron-steam-store-is-explicitly-disabled).
- [ ] Before Android/iOS rollout, certify in-place Unity-save migration, paid
  ownership, lifecycle/offline replay, native purchases/restores, and physical
  device accessibility. Sources: parity runtime gates R-01 through R-03.
