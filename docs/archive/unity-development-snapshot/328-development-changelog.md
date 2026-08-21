# Post-3.0.328 Unity development notes

These notes describe the unreleased Unity development snapshot, not the public
3.0.328 release. The exact tree is preserved by the archive branch/tag named in
this directory's README.

Avocato now spans all columns on the reality tab
tinker now anchores to the bottom and spans all columns
Changed the black skill tree lines to be grey.
Fixed mega research manual purchase wiring by adding real scene `ResearchPresenter` bindings for:
- `research.matrioshka_brains_upgrade`
- `research.birch_planets_upgrade`
- `research.galactic_brains_upgrade`
Removed hidden runtime mega presenter injection from `ResearchAutoBuy`; missing wiring now logs explicit warnings.
Normalized legacy mega research percents on load (`matrioshka/birch/galactic`) to `0.03` when values are `<= 0`.
Added balance window validation checks for mega research presenter/card wiring in `Game.unity`.
Fixed startup null crash path by making Oracle static state access preload-safe and deferring ResearchPresenter state checks until save data is ready.
Removed the ability to manually add and remove from autoassign to simplify the backend when creating presets (too many users were confused by this system and I don't wanna deal with the UX of recreating it.)
Retired legacy `listOfSkillsNotToAutoBuy` queue blocking; non-refundable auto-assign behavior is now controlled solely by the Skill Tree Settings toggle (`autoAssignNonRefundableSkills`).
Moved from hardcoded data to data objects.
