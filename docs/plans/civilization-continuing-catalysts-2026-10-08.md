# Continuing Catalyst progression and bottom-era controls

Supersedes the earlier three-goal terminal UI and header focus placement in the focus/milestone and era-dock notes. This iteration continues the authorized Forager work; it does not implement Cultivation gameplay.

## Result and rules

The first three automatic rewards retain their original gates. Reward four requires six Camp Expansions, twelve Seasonal Expeditions, twelve Craft Specializations and six Exchange Networks. Each subsequent reward doubles those four completed-cycle requirements. Every ordinal credits one existing Catalyst directly into the existing wallet, without consuming resources, replaying prior awards or requiring a purchase. The panel always displays the next goal, including after the first three. Its progress is the minimum logarithmic per-requirement progress, including fractional active work; exact BigInt comparisons award completion. Wallet saturation retains uncredited qualifying goals until room exists. Existing save version three remains valid; no new save fields or currencies.

The existing Int64 completion counters support earned goals through ordinal 63. Goal 64 exceeds the supported counter range and remains incomplete. Award processing is bounded and cannot spin or overflow. This is a numerical boundary, not an endless-progression claim.

Fresh one-second stepping without equipment or fractures gives these award times in simulation seconds:

| Focus | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| Balanced |110|920|2645|3260|4286|5931|
| Provisioning |110|920|2848|3568|4730|6347|
| Settlement |110|920|2465|3193|4344|6324|
| Craft |90|900|2760|3480|4888|—|
| Expeditions & Trade |110|920|2405|2945|3749|5169|

Craft earns five and the other focuses six by two hours; Balanced earns seven in a 9,000-second advance. The first reward remains 90–110 seconds. Permanent fractured skills still provide additive +5% each; ordinary wallet balance provides no speed bonus.

## Presentation

All five focus choices persist in the bottom active-era panel. Distribution and workforce details expand upward. Collapsed jobs show their name, a person symbol and actual crew count, then icon-based numeric input costs immediately before the timer/status. Gathering has no input costs. A check and accent ink mark already-reserved inputs; unaffordable inputs have muted ink and a dotted underline. Accessible names and native titles preserve resource names and detailed waiting reasons. Longer recipes wrap on mobile.

The existing Catalyst asset is reused with its established luminance mask. Inspected archived worker masters were CPU/robot symbols, unsuitable for person counts. The new person and resource symbols are editable monochrome SVG paths in CivilizationSymbol.tsx, with consistent 24-unit optical boxes and inherited theme ink. No new raster artwork or emoji.

An explicit following-era presentation context projects completed Forager into one retained canonical economy/output source rather than another job list. The source retains its resources, workers and completed economy; the projection does not alter simulation or grant rewards. Both projection and rendered synthetic-fixture tests prove this boundary. The default live app remains Forager; a following-era consumer/transfer mechanic is not implemented or exposed.

## Verification and review images

39 focused tests pass, covering migration, exact-once rewards, counter/wallet limits, resets, all recipe metadata, free Gathering, shortages, focus persistence and the rendered generator boundary. The complete suite before the final additional row-metadata test ran 2,262 tests: 2,169 passed and 93 failed. Failure names exactly match the established baseline; there are no new failures. Localization extraction/validation and all ten compiled catalogs pass. Build and lint pass, with the pre-existing large-chunk warning.

The isolated loopback browser used a fresh disposable profile and mock Keychain, checked before navigation. Desktop, 360×800 at 130%, 320×800 at 200%, German, collapsed/expanded upward details, keyboard focus selection, reload persistence, exact allocation totals, last-row access and panel bounds passed. Four final screenshots were visually inspected; no runtime exceptions. External requests were blocked. Native hosts and long-duration performance were not certified in this iteration.

Private Library image IDs (version zero, metadata applied to original PNGs):

- Early desktop: libfile_967a0d715be881918aed6652210898ee
- Mature desktop, next goal beyond seven and +5% fracture: libfile_fa4af4cca9a481919d7a5f9c3a320c4a
- Mobile 130%, expensive Trade recipes and persistent bottom focus: libfile_aef531082a748191853989d3cadc5229
- German mobile, upward allocation/goal details: libfile_20ce184e1cec8191be5306cfac3dd4f6

Browser evidence and Library receipts live in the parent task's screenshots-continuing-civilization directory. Source-grounded graph specifications there were updated with continuing-reward rules and timings. Parent pixel review remains outstanding. No push, merge, release or native launch; the primary checkout and six original stashes remain untouched.
