# StartupRecoveryView

## Purpose

`StartupRecoveryView` is the blocking player interface shown only when startup cannot safely publish a save. It explains the classified recovery outcome and exposes explicit import, export, copy, and two-step reset actions.

The view does not inspect, decode, migrate, delete, publish, or store save data. Those responsibilities remain in `StartupRecoveryInteractionSession`, `StartupSaveRecoveryCoordinator`, and the Stage 2 preparation/storage pipeline.

## Visual contract

The recovery modal follows the existing Idle Dyson Swarm UI:

- Lexend/TextMesh Pro default game font.
- Near-black modal fill, purple-grey information cards, coloured outlines, and the active `UITheme`.
- Large rectangular touch actions with rounded corners and explicit pressed/highlight states.
- A light-purple primary import action, neutral support actions, and a separately styled red destructive action.
- Title-case modal heading, left-aligned explanatory card copy, and short cyan feedback.

Long filesystem paths never appear in the primary layout. Players can copy the full classified recovery report when exact locations are useful for support.

## Responsive behaviour

The view is created under the persistent Load-scene canvas and applies the current `Screen.safeArea`.

- Narrow or portrait safe areas use one action per row and a nearly full-height modal.
- Wide landscape safe areas use two action columns and cap the modal at `1560 x 1080` canvas units.
- Content is vertically scrollable by touch drag, mouse wheel, or scrollbar.
- Rotating a device or resizing a desktop window re-evaluates the safe area and layout without recreating the session.
- Reset confirmation expands inside the same scroll view and scrolls the warning into view.

The responsive thresholds and panel bounds are covered by EditMode tests in `StartupSaveRecoveryStage3Tests`.

## Data and interaction flow

1. `Oracle` receives a blocking `StartupSaveRecoveryResult`.
2. `LoadScreenMethods` hosts `StartupRecoveryView` on the persistent canvas.
3. `Show` renders only the immutable result summary and pauses scaled gameplay.
4. Copy/export actions are read-only.
5. Clipboard import is prepared and committed by `StartupRecoveryInteractionSession`; the view hides only after success.
6. Reset requires `ArmReset` and a distinct `ConfirmReset` action.
7. Gameplay time is restored before a successful import reload, reset, or unexpected view destruction.

## Save and load implications

- The screen must never imply that an artifact was deleted or repaired when the pipeline only preserved it.
- Invalid clipboard text remains classified and cannot be published by this view.
- Import success may trigger a clean startup reload only after verified transactional persistence.
- Destructive reset wording and the two-action gate are part of the save-integrity contract.
- Do not add automatic recovery writes, background retries, or lifecycle/offline-time work to the presentation.

## Performance notes

The hierarchy is built once and reused. Responsive layout runs only when screen size, canvas size, or safe-area values change. Procedural images are limited to modal cards, actions, and the scrollbar; avoid adding per-frame material or object allocation.

## Quick verification

1. Run the targeted `StartupSaveRecoveryStage3Tests` EditMode suite.
2. Run the complete EditMode baseline.
3. In the Load scene, use an isolated invalid canonical save to show recovery.
4. Inspect phone portrait and desktop landscape:
   - no clipped or overlapping copy;
   - panel remains within safe-area margins;
   - phone actions are one column and desktop actions are two columns;
   - touch/mouse scrolling reaches every action;
   - reset confirmation is visibly destructive and requires a second click.
5. Confirm showing/dismissing the interface does not modify tracked files or source save artifacts.
