# Infinity challenges

Blank Slate unlocks after the first completed Infinity. Entry and abandonment
start a fresh Infinity run without awarding IP, banking skill points, or
recording a completed Infinity. Infinity upgrades and later progression stay
intact. Entry clears all skill ownership and suppresses skill commands and
preset assignment until the challenge ends. Bots, facilities and Research
remain available. Abandonment resumes normal preset assignment.

During Blank Slate, the ordinary Infinity boundary applies even with Break
the Loop unlocked. The upgrade and configured Break target are preserved.
The existing automatic Infinity preference applies; manual, automatic and
Stored Time completion share the canonical reset reward transition. Quantum
Leap cannot bypass the challenge. A pending Overflow must be resolved before
challenge entry or abandonment.

The first completion awards exactly one Galvanizer and marks Blank Slate
completed in the same canonical state. Replays award no further Galvanizers.
Completion, unlock, currency and the ever-earned visibility flag survive
Overflow. Currency appears beside Skill Points after the first reward and
stays visible at zero. No spending or galvanized skill effects are included.

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
and the existing skill details dialog. The Galvanizer wallet uses an unboxed
rounded three-layer coating icon and count beside Skill Points. Restart confirmation is required for both
entry and abandonment. An active challenge notice links back to the Challenges tab.
