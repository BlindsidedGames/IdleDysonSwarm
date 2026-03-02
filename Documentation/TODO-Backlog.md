# TODO Backlog (Community + Internal)

Source: Consolidated from the shared screenshots and direct requests.

## Bugs
### Manual Labor / Skill Tree
| Priority | Item |
| --- | --- |
| P1 | Prevent unwanted auto-allocation when skill points are available. |
| P0 | Fix: "Fix skill points" button removes skill points from banking. |

### Offline Time / UI
| Priority | Item |
| --- | --- |
| P1 | Fix: using offline time while offline time is already running removes the green bar. |

### Economy / Progression
| Priority | Item |
| --- | --- |
| P0 | Fix: reaching infinite (e308) cash/science can make purchases impossible. |
| P0 | Fix: Supernova causes Stellar Sacrifices to break. |

### Text / UX / Changelog
| Priority | Item |
| --- | --- |
| P2 | Fix: patch notes currently show updates from years ago. |
| P3 | Fix meteor-hit guidance text to point to the Reality page Countermeasures tab (not Research tab). |
| P1 | Investigate achievement trigger timing (Bobogoobo, 2026-02-26): "get your first" achievements appear to unlock on the second completion instead of the first. |
| P1 | Investigate incorrect achievement unlock (Bobogoobo, 2026-02-26): `Division Master` reportedly unlocked without purchasing any `Division` upgrade in Quantum (possibly delayed/misattributed to the 4th `Secrets` purchase). |

### Save / Platform
| Priority | Item |
| --- | --- |
| P0 | Fix save-export casing mismatch: iOS exports `idb1` (lowercase) while Steam import expects `IDB1` (uppercase). |
| P0 | Investigate Steam bug report (larunia, 2026-02-21): when clicking `Export Save` and then immediately `Import Save` + confirm, extra offline-time minutes are added to the counter every time. |
| P0 | Investigate offline-time state bug from forwarded invariel report: while offline time is running, IDS appears to behave as if `Break the Loop` (multiple IP) and `Quantum Entanglement` (don't reset) are active; repro save file is available in `dev-todo` from invariel. |

## Features / Improvements
### Manual Labor / Skill Tree
| Priority | Item |
| --- | --- |
| P2 | Add a Manual Labor skill-path branch that buffs manual labor (active-play oriented buff). |
| P2 | Consider/implement chance-based manual labor output to produce the highest unlocked tier while held. |
| P3 | Increase visibility/contrast of black skill-tree connector lines. |

### Text / UX / Changelog
| Priority | Item |
| --- | --- |
| P2 | Update in-game changelog content. |
| P1 | Improve Reality onboarding/discoverability (Bobogoobo, 2026-02-24): make `Gather Influence` obvious at unlock time and review default Wiki tab ordering/collapse behavior to reduce early confusion. |
| P2 | Tune `Point Blank` achievement progress popup frequency (Bobogoobo, 2026-02-24): progress notifications currently feel too frequent (every 1); evaluate less frequent cadence (for example, every 10). |

## Completed
### Completed Bug Fixes
- [x] Rework manual labor progress behavior so tile progress bars represent their own tile activity.
- [x] Fix: mega-structure prices scaling with total structures instead of bought structures.
- [x] Fix capitalization/styling in Automation bots tab: "Ai Manager" -> "AI Manager".
- [x] Fix skill preset paste/import ordering issue (Galletas + Vathreon, 2026-02-24): normalize dependency-safe queue ordering and prevent blocked-head queue stalls.
- [x] Retire legacy `listOfSkillsNotToAutoBuy` queue blocking so non-refundable auto-assign behavior is controlled only by the Skill Tree Settings toggle.

### Completed Features / Improvements
- [x] Consider moving the Tinker item to the bottom or making it occupy two spaces to align with related research tiles.
- [x] Add a toggle for whether non-refundable skill points are auto-assigned.

### Completed Tooling / Process
- [x] Create an editor window for balance tuning/testing.
- [x] Create automators for mega-structures.
- [x] Audit mega-structure cash-purchase implementation to confirm whether data asset changes alone (for example, `Assets/Data/Facilities/matrioshka_brains.asset`) are sufficient before keeping code-path changes.
- [x] Update `AGENTS.md`.
- [x] Remove legacy assistant-related project content/references (completed 2026-02-26).
