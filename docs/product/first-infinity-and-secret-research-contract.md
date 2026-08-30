# First Infinity and Secret Research contract

Last reconciled: 2026-08-29.

## Secret Research coefficients

Secrets of the Universe that improve Research replace the affected Research
coefficient everywhere that coefficient is consumed: live production,
Research cards and formulas, purchase previews, manual purchases, automation,
and Repeatable Research pricing. The canonical coefficients retain Unity
single-precision behavior through `Math.fround`; display formatting must not
change simulation or purchase eligibility.

The current Secret progression is:

| Research | Secret levels | Coefficients |
| --- | --- | --- |
| Assembly Lines | 1, 4, 12 | 6%, 9%, 12% |
| Servers | 3, 9 | 6%, 9% |
| AI Managers | 5, 13 | 6%, 9% |
| Planets | 7, 14 | 6%, 9% |

## Three-significant-digit presentation

Game-number presentation rounds to three significant digits and carries into
the next magnitude when required (`999.9` displays as `1.00K`). This is a
presentation-only rule. Balances, costs, purchase previews, and affordability
checks retain their exact canonical values. Nearby exact values can therefore
share the same rounded label, but the enabled or insufficient state remains
authoritative: presentation rounding never becomes purchase authority and no
epsilon is introduced into affordability checks.

`Number.MAX_VALUE` is reserved as the saturated continuous-price sentinel.
Geometric pricing reaches that sentinel only when its reconstructed price is
non-finite or equals the sentinel; a finite reconstructed price below it stays
authoritative and purchasable even when its rounded logarithm equals the
sentinel's logarithm.

## Newly unlocked navigation

Every newly unlocked destination is marked as new until the player opens that
route. A visible bottom-navigation shortcut carries the marker itself. If any
new destination is not visible in the fitted bottom-navigation layout, More
carries the marker so the discovery cannot be hidden by the responsive layout.
Discovery state is scoped to the save, persists across reloads, and has
accessible labels in both locations.

Infinity joins this shared contract when the ordinary Infinity threshold is
first reached. Once Infinity has been unlocked, lowering the current bot count
does not relock it; the route remains available after the first Infinity and
across subsequent cycles.

## Pre-Break bot cap

Before Break the Loop, all bot-producing paths clamp the total at the ordinary
Infinity threshold for the current Division count. This includes continuous
production, active and offline event processing, Tinker, and Skill interval
effects. Break the Loop removes this ordinary cap. The separate
`Number.MAX_VALUE` checkpoint used by the special 1,000-IP Infinity case
remains available after Break the Loop.

## Purchase-button quantities

Facility, Mega-Structure, and Research purchase buttons show the selected
manual quantity as `+N` before their global automation system is unlocked.
When both global automation and the item's automation toggle are active, the
same button shows `Auto (N)`. The visible and accessible labels use the same
canonical selected quantity.

## Facility production formulas

The Production Modifiers stage in Basic Facility details ends with the complete
ordered production expression and its canonical per-game-second result. It
starts with base output and working-facility count, then applies every active
Research, Skill, system, and manual-purchase effect in simulation order. The
result replaces the internal-facing "Effective purchased count" subtotal and
uses the canonical production fact rather than creating a second gameplay
calculation.

Avocados and Avocato are separate sources. The two-point **Avocados** Skill
uses 69 manual purchases only as an eligibility threshold; once eligible, it
contributes a fixed `×2` building-production multiplier. **Avocato** is the cat
prestige system whose multiplier is derived from resources fed to it. An
Avocados contribution must be attributed to the Skill and must never be
labelled or sourced as Avocato.
