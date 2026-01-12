# Debug/Telemetry and Parity Harness Overhaul Plan

## Goals
- Make debug outputs easy to run, capture, and export.
- Provide a lightweight stat timing tracker around the stat pipeline.
- Centralize parity/breakdown reporting so it is reusable during the skill tree overhaul.

## Non-Goals
- Visual redesign of debug UI.
- Automated test suites beyond the existing parity checks.
- Shipping debug UI to non-debug builds (keep dev focused).

## Current Pain Points (Summary)
- Debug outputs live in multiple context menu actions without a shared export path.
- Parity/breakdown output is hard to compare or share without manual copy.
- No quick summary of stat pipeline cost when tuning performance.

## Proposed Architecture
- **Debug report recorder**
  - Capture the last debug report (breakdowns/parity/timing) in memory.
  - Export last report to a temp/persistent file for sharing.
- **Stat timing tracker**
  - Lightweight timing capture in `StatCalculator`.
  - Aggregated per-stat totals and averages.
- **Debug menu entry points**
  - Editor menu items to run parity/breakdowns and export reports.
  - Optional runtime wiring for UI buttons later.

## Implementation Phases

### Phase A: Inventory + Requirements
- Review existing parity and breakdown methods in `Oracle`.
- Decide on report categories and export format.

### Phase B: Report Recorder
- Add a shared recorder for last report + export to file.
- Wire parity/breakdown methods to record their output.

### Phase C: Stat Timing Tracker
- Add `StatTimingTracker` with per-label aggregates.
- Instrument `StatCalculator` to report timing when enabled.

### Phase D: Debug Entry Points
- Add editor menu commands for parity/breakdown and export.
- Add menu commands to toggle timing, clear timing, and log summary.

### Phase E: Documentation
- Update progress tracker and notes.

## Validation Checklist
- Run parity suite and confirm the last report can be exported.
- Run stat timing summary and confirm output is populated.
- Confirm no timing overhead when capture is disabled.

## Estimated Touch Points
- `Assets/Scripts/Expansion/Oracle.cs`
- `Assets/Scripts/Systems/Stats/StatCalculator.cs`
- `Assets/Scripts/Systems/Stats/StatTimingTracker.cs`
- `Assets/Scripts/Systems/Debugging/DebugReportRecorder.cs`
- `Assets/Editor/DebugTelemetryMenu.cs`
- `Documentation/DebugRefactorProgress.md`

## Acceptance Criteria
- Debug outputs can be exported to a file without manual copy.
- Stat timing summary is available via a debug command.
- Parity/breakdown logs are recorded in the shared report recorder.
