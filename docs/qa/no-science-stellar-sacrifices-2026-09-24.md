# No Science and Stellar Sacrifices

- No Science starts a fresh Quantum run, disables Science and Research, and awards two Catalysts on first completion. Replays only improve the best time. Quantum upgrades and later layers persist; Discovery remains usable.
- Quantum Entanglement uses a full reset while this challenge is active. Entry and abandonment award no Quantum Shards or SRS banked charge.
- Stellar Sacrifices targets the highest tier with a positive purchased or generated count. All eight facility tiers qualify. No owned facility means no output or Bot debit. The existing formula, sacrifice cost and Fractured exemption remain unchanged.
- Updated normal/Fractured descriptions, translations and the existing 4.1.10 patch notes.

## Verification

- Full suite: 181 files / 1,865 tests passed. After the final wallet-cap edge-case fix, the focused suite passed 61 tests, including its new regression. TypeScript, lint, data, localization, web build, first-Dyson parity and diff whitespace checks passed.
- Disposable browser origin on port 5194: entered the challenge, confirmed 1,000 Researchers produced zero Science and Research purchases were disabled; completed via the real Quantum action, observed two Catalysts and a recorded time, reloaded and verified persistence. Debug controls supplied the test resources; this was not a naturally played full progression run.
- Replayed and abandoned through confirmation controls; previous completion/time persisted. Spent one of the earned Catalysts to fracture Stellar Sacrifices and verified its updated description.
- Observed Stellar Sacrifices generating Data Centers with zero Planets; bought a Galactic Brain and observed generation switch to Galactic Brains. All eight targets and no-facility debit protection also have regression coverage.
- Inspected the challenge at desktop and 360-pixel width, and both Stellar descriptions in the running game. Live QA found and fixed the Quantum Entanglement description/confirmation using a missing challenge projection.
- Code review checked challenge/reset boundaries, once-only rewards, persistence validation, generated Research suppression, Stored Time integration and facility settlement. No known unresolved defects.
- Native iOS, Android and Steam interaction tests were not repeated for this change. No release or store submission was performed.

## Follow-up: facility detail attribution

Matthew found that Stellar Sacrifices still appeared under Planets despite producing Galactic Brains. The detail projection retained the old stat grouping. It now shares the production target selector and exposes the source only under the highest owned facility, including megastructures. The displayed rate includes Discovery; the expandable formula shows that multiplier.

Validation: focused coverage of every facility tier and no owned facility, preserving Scientific Planets attribution. Live browser inspection of the existing Galactic Brains run confirmed the source and formula under Galactic Brains, and its absence from Planets. This follow-up changes presentation only, not production or saves. Native interaction scenarios were not repeated for this display-only fix; all internal packages are rebuilt from the corrected source.
