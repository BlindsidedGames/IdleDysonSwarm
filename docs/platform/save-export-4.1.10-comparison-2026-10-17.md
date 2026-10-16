# Export comparison with 4.1.10

Compared the immutable source at `0dde63fbaad175362df49feeb981f85dc6af4a5e`
with the current working tree. Its `hosts/native-release.json` identifies
4.1.10, and `classic/baseline.json` identifies it as the Classic source baseline.
This is a historical source comparison; the old release was not launched against
player storage.

## Findings

| Area | 4.1.10 | Current result |
| --- | --- | --- |
| Settings action | `Export`, 3.25rem minimum height | Label is `Export Save`. Restored the 3.25rem desktop height (52px at 100%), with a 44px minimum at reduced scale. |
| Dialog actions | Close, Copy String, Save File; 3rem minimum height | Same labels and actions. Restored 3rem desktop height (48px at 100%). Retained the later responsive wrapping and minimum touch targets. |
| Export capture | Runtime `readCurrentSaveExport()`; shareable serialization; no game teardown | Each mode captures its owning application's validated transfer snapshot and uses its own shareable serializer. Export stays read-only, including when the browser writer lease has expired. The game document remains alive. |
| Payload | One Classic save, `IDSWEB1:` | One current-mode save: Classic `IDSWEB1:` or Modern `IDLEDS:`. No paired-export wrapper. |
| Export dialog | Save string, select-on-focus, pending/copy/download/error feedback, Escape and focus return | These behaviors are retained through the mode host. Import/export act only on the current mode. |
| Stored Time | An active job can export its immutable pre-simulation snapshot and show its basis notice | The owning application's same snapshot and basis are forwarded. A live worker export was not exercised during this comparison. |
| Fixed filename | `idle-dyson-swarm-save.idsw` | Unchanged when timestamping is off. |
| Timestamp option | Not present | Introduced in 4.1.11 by `7fe0d4b5` on 4 October 2026, initially in Settings. `aa29c11d` later that day moved it into Export Save and added native iOS Files export. The existing UTC formatter remains in use. |
| File availability | Native Android/desktop file export; iOS copy workflow | Retains the later native iOS Files support, native picker cancellation handling, and browser capability check. |
| Checkbox appearance | Settings uses a custom themed square and SVG tick, scoped to the shell | The timestamp control was outside that scope and rendered a native checkbox. Fixed by sharing the existing appearance rules with the parent dialog. |

The exported title is still the parent dialog's section heading, and the Settings
description names the current-mode transfer behavior. These are wording/heading
differences from the older single-game Settings panel; they do not change the
captured data or transfer format. This comparison does not revert unrelated
4.1.11 accessibility, responsive-layout, or native-file improvements.

## Checkbox correction and visual evidence

The original checkbox appearance rules were moved from the Modern shell into
`src/ui/components/checkbox.css` and imported by both the shell and the parent
save dialog. The extracted base rules are text-identical to 4.1.10 apart from the
additional dialog scope. Classic's frozen stylesheet was not changed.

Measured in a disposable in-memory browser game at the same 100% scale:

- Both Classic and Modern timestamp checkboxes matched their Settings reference
  for appearance, display, width, height, margin, border, radius, background color
  and checked SVG background. Checked and unchecked states were compared.
- Desktop squares measured 21.5938px in both the reference and export dialog.
- The whole row also inherited the wrong type size and ink from the parent
  dialog: 13.12px instead of the Settings reference's 16px on desktop. Its shared
  row class now owns the Settings font size and color. A direct comparison of
  font family, size, weight, line height, color, background, border, radius,
  padding and gap matched the actual Modern Settings row on desktop and at 360px
  (12.8px text), with no differences in those properties.
- At 360x800, Classic's reference and export squares both measured 17.5938px;
  Modern's both measured 21.5938px. The parent dialog preserves each mode's
  existing responsive sizing.
- The Settings Export Save button measured 52px high, and dialog Save File
  measured 48px on desktop, matching the old source dimensions at 100% scale.
  The narrow Settings action measured 44px, preserving its responsive size.
- Space toggled the timestamp checkbox; its complete label remained the hit
  target and showed keyboard focus. Desktop and 360px screenshots were inspected.

The earlier verification record in `classic-modern-save-storage.md` covers
clipboard contents, filenames, standalone imports, migration and session/focus
behavior. This follow-up specifically closes the previously missed checkbox
appearance and button-size comparison. Native rendering and a historical
4.1.10 device run are not claimed here.

## Failed-export correction

The open browser later returned no export because its host writer lease had
expired. Diagnostics showed `checkpoint-failed` with `WriterLeaseLostError`.
The older runtime export path tried to publish a dirty save before returning
the string, making a read-only backup depend on a successful storage write.
Both mode factories now capture `captureSaveTransferSnapshot()` directly and
serialize with their own `serializeSharedWebSave`. This retains validation,
shareable-data filtering and the immutable Stored Time snapshot without
publishing, closing the graph or changing writer authority.

In the disposable browser host, automatic lease renewal was temporarily disabled.
A checkpoint was confirmed to return false with the same lease error; reopening
Export Save still produced a Modern save, copied it and downloaded fixed and
timestamped filenames successfully. The temporary failure setup and diagnostics
were removed. Classic also produced its standalone `IDSWEB1:` export. The user's
expired tab was reopened with the fix and its Save File action displayed
`Save exported successfully.` after an actual download. This fixes backup export;
it does not let an expired writer overwrite another session.
