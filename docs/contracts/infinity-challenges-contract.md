# Infinity and Quantum challenges

Blank Slate unlocks after the first completed Infinity. Entry and abandonment
start a fresh Infinity run without awarding IP, banking skill points, or
recording a completed Infinity. Infinity upgrades and later progression stay
intact. Entry clears ordinary skill ownership and suppresses ordinary assignment and
presets until the challenge ends. Fractured skills remain active, and Fracturing
remains available during challenges. Bots, facilities and Research
remain available. Abandonment resumes normal preset assignment.

During Blank Slate, the ordinary Infinity boundary applies even with Break
the Loop unlocked. The upgrade and configured Break target are preserved.
The existing automatic Infinity preference applies; manual, automatic and
Stored Time completion share the canonical reset reward transition. Quantum
Leap cannot bypass the challenge. A pending Transcendence must be resolved before
challenge entry or abandonment.

The first completion awards exactly one Catalyst and marks Blank Slate
completed in the same canonical state. Replays award no further Catalysts.
Completion, unlock, currency and the ever-earned visibility flag survive
Transcendence. Currency appears beside Skill Points after the first reward and
stays visible at zero. Spending one Catalyst permanently fractures a revealed
base skill, returns its invested ordinary Skill Points, and removes that skill’s
penalties and exclusions. Internal `galvanizers` and `galvanizedSkillIds` save
fields retain their names for compatibility.

Schema 16 saves the challenge state and validates the currency as a
nonnegative Int64. Older saves derive unlock from completed Infinity history;
transitional V2 imports default challenge progress and currency instead of
inheriting the receiving save's balance. Entry and abandonment persist their
full candidate before publication; failed persistence leaves the run intact.
Cleared skill ownership is explicitly written over preserved raw save data.

Challenges have a dedicated navigation tab, unlocked after the first Infinity,
with the generated monochrome target-and-arrow icon and the existing new-route
highlight and shortcut preferences. Settings exposes both Challenges and Avocato
shortcuts when their corresponding destinations are available; choices persist
across reloads. Avocato uses the generated avocado-cat icon with a circular pip. UI uses the shared collapsible section, buttons, status feedback
and the existing skill details dialog. The Catalyst wallet uses an unboxed
rounded three-layer coating icon and count beside Skill Points. Restart confirmation is required for both
entry and abandonment. An active challenge notice links back to the Challenges tab.


## Quantum challenges

No Science, Short Circuit, Grounded, Built by Hand, Hands Off, Commitment Issues
and Supply Shortage use the existing Quantum reset boundary. Each first
completion awards two Catalysts; subsequent completions only improve its best
time. Entry/abandonment restart Quantum without awarding Shards or challenge
completion. Infinity does not end a Quantum challenge.

All seven suppress Division, Quantum Double IP and Quantum Entanglement while
preserving ownership. Purchased boosts and Discovery remain effective. The
shared helpers in `infinityChallenges.ts` govern rewards, thresholds and facility
availability for simulation, commands, automation and previews. New completion
IDs are stored in the existing challenge object; legacy completion flags remain
readable. Transcendence preserves completion progress as before.

Built by Hand requires Fractured Manual Labour. All facilities are disabled;
the ten-Bot goal provides the first SP for Hand Assembly. Hands Off instead
starts each run with one Assembly Line, permits generated facilities, and blocks
manual/automatic facility purchases, including Infinity retention upgrades that
grant facilities immediately. Grounded and Built by Hand apply the same rule to
forbidden retention purchases. Commitment Issues blocks refunds and
replacement presets until Infinity, but permits additional assignments and
editing the next-run assignment queue.

Full rules, Manual Labour tuning and verification are recorded in
[the implementation notes](../plans/quantum-challenges-manual-labour.md).
