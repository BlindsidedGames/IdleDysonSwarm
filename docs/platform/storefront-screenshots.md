# Storefront screenshot production

This is the repository entry point for recreating Matthew's approved storefront
screenshot suite. The approved campaign was produced in August 2026. Refresh
captures against the intended release before publishing; historical screenshots
do not establish the appearance of today's build.

## Approved story and presentation

Use eight scenes, in this order, for each platform:

| Order | Route | Mobile headline |
|---|---|---|
| 01 | Bots, late-game mega-structures | FROM ONE BOT TO / GALACTIC BRAINS |
| 02 | Skills | CHOOSE YOUR PATH |
| 03 | Infinity | BREAK INFINITY. / KEEP GOING. |
| 04 | Quantum | LEAP INTO / THE QUANTUM |
| 05 | Simulations | REBUILD / CIVILIZATION |
| 06 | Reality | DECODE THE / ANOMALY |
| 07 | Research | AUTOMATE THE / IMPOSSIBLE |
| 08 | Story | UNLOCK A / STRANGE STORY |

Matthew approved replacing Statistics and Avocato with Simulations and Reality.
The first card uses one late-game Bots scene; the early/late split was rejected.
Skills should display **4 available points** in the captured app.

Mobile cards have a dedicated full-width header above the gameplay image, a dark
purple background with a restrained accent glow, and one continuous rounded
frame. Clip the screenshot to the matching inner radius. The header and gradient
must not overlap or darken gameplay. Loose side strokes, exposed square image
corners and decorative corner dots were rejected. Preserve these decisions when
adapting the layout. Steam uses ordinary gameplay screenshots without a headline,
gradient, frame or device mockup. Contact sheets are review material, not uploads.

## Platform targets and the Apple slot issue

| Folder | Final PNG dimensions | Intended slot |
|---|---|---|
| iphone | 1320 × 2868 | Apple iPhone **6.9-inch** display |
| ipad | 2732 × 2048 | Apple iPad 13-inch landscape |
| android-phone | 1080 × 1920 | Google Play phone |
| android-tablet | 1920 × 1080 | Google Play tablet |
| steam | 1920 × 1080 | Steam screenshots, 16:9 |

All final images are opaque sRGB PNGs. Upload individual numbered images from
the matching folder, never a contact sheet. These are English headline sets.

The existing iPhone files were rejected when dropped into Apple's **6.5-inch**
well. That well accepts 1242 × 2688 or 1284 × 2778 portrait images, not 1320 × 2868.
Matthew chose to keep the 6.9-inch set instead of resizing. In App Store Connect,
use **View All Sizes in Media Manager → iPhone → 6.9-inch Display** (or **Keep
using 6.9-inch Display** when shown), replace that section's screenshots, order
them, and save. Confirm the active language and editable app version first.

Verify current accepted slots and requirements before any new production run:

- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple media upload instructions](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/)
- [Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Steam store assets](https://partner.steamgames.com/doc/store/assets)

## Repository evidence and scripts

The [production archive](../archive/2026-08/store-screenshot-production/README.md)
retains historical capture/composition scripts, save derivations, three imported
review saves, manifests and QA evidence. Its scripts preserve their original
absolute paths and original imports: they are implementation references, not a
portable one-command tool. Some early script scene lists still contain Statistics
and Avocato; the final order above and the deployment-v2 assembly map supersede
them. Do not run archived scripts against the shared checkout without adapting
their paths, scene lists and current application APIs.

No PNGs or ZIPs were added to Git. The existing final assets remain locally at:

```text
/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-deployment-bundle-v2
```

The deployment ZIP SHA-256 is:

```text
06d8c5a32b8089f4b79c4d2ba85fb9dd23622cf0509a8e45d79e9ae7f1e42938
```

Keep that asset directory if exact reproduction of the approved pixels matters.
Git contains the process and save evidence needed to implement a fresh capture
run; it does not contain the historical raw or final images.

## Repeatable capture procedure

1. Read the current `AGENTS.md` and UI style guide. Record the release commit,
   branch and dirty diff hash. Prefer an isolated checkout or frozen external
   build so another agent's edits cannot change the capture mid-run. Do not
   discard shared-checkout changes.
2. Start the app on a loopback origin with a fresh disposable browser profile.
   On macOS the launcher must include `--use-mock-keychain`. The current
   `scripts/performance/chromiumHarness.ts` includes this flag; verify any custom
   launcher too. Set `IDS_CHROMIUM_PATH` to the browser executable as needed.
3. Adapt the archive's `capture.ts` and `capture-steam.ts` into the new output
   directory. Point imports at the current repository and URL at the running
   build. Confirm selectors and routes against the running app. Use the original
   composition geometry and the reviewed candidate capture positioning as
   references rather than assuming all historical selectors remain valid.
4. Import the relevant save through the production Settings UI. Record its
   SHA-256 and successful import. Capture separate responsive phone, tablet and
   desktop viewports; do not stretch a phone image into landscape. Record CSS
   viewport, device scale factor and resulting raw dimensions separately from
   the final composed card dimensions.
5. Position the real scroll containers and expanded sections. Bots should show
   Matrioshka Brains, Birch Planets and Galactic Brains. Expand Simulations'
   Foundational Era to show its production ladder. Reality's historical artifact
   header displayed `Undefined`; the approved capture scrolls to populated
   upgrades. Recheck current behavior and reject broken visible states.
6. Compose mobile cards using the archived layout functions and final scene map.
   Copy raw captures directly for Steam. Preserve image proportions and use the
   correct viewport for each layout. Generate a contact sheet for each platform.
7. Inspect every final at original resolution and at listing thumbnail size.
   Verify text, all four frame corners, no overlay on gameplay, correct route,
   populated state and four Skills points. Validate eight files per platform,
   exact dimensions, opaque output and colorspace; compute SHA-256 values.
8. Write a new manifest with capture provenance, fixture hashes, derivations,
   dimensions, order and output hashes. Package the deployable images, README,
   manifest and QA report in a ZIP, excluding reproduction scripts/raw evidence.
   Check archive integrity and record its checksum. Upload only when authorized,
   and record listing language, version and upload date separately.

## Save states

- Bots, Infinity and Research: original `mature-infinity` fixture. Quantum and
  Story: original `late-quantum` fixture. Verify current fixture hashes instead
  of assuming historical IDs still describe identical saves.
- Skills: the retained `maximum-skills-4-points` save was derived from the old
  `maximum-skills` fixture by changing available points from 73 to 4, serializing
  with the app codec and importing through Settings. Its derivation is explicit;
  it was not earned through a recorded playthrough or edited into the PNG.
- Reality: derived from `mature-simulations` through canonical Translation I–III,
  Double Time and Worker Auto Convert purchases.
- Simulations: derived from `mature-simulations` through canonical Hunter/Gatherer
  purchases, 24 one-hour production advances and canonical conversions.

The archive includes derivation scripts, full source/derived hashes and serialized
saves. Validate them with today's codec before capture. Never regenerate a
certification fixture to conceal drift or paint values into captured gameplay.
Historical capture scripts held the active scheduler/time to position the scene;
record any equivalent capture-time control explicitly in the new manifest.

## Replacing one screenshot

Select one route and profile using the archived environment filters (such as
`IDS_STORE_CAPTURE_PROFILES` and `IDS_STORE_CAPTURE_SCENES`) after adapting the
script. Re-import and recapture that scene, then run the corresponding composition
filter. Update its numbered destination and source mapping, regenerate that
platform's contact sheet and all affected manifest hashes, inspect the changed
card, and rebuild the deployment ZIP. Preserve older packages as immutable
approval evidence. Full re-capture is needed when the released UI or layout has
changed; reusing old pixels then would misrepresent the release.

The original suite used responsive browser renders, not native device captures.
Native safe areas, host-specific UI and live storefront acceptance require their
own verification. The recorded August QA result is historical evidence only.
