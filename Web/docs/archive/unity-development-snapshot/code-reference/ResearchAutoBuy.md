# ResearchAutoBuy

## Purpose
`ResearchAutoBuy` iterates over all scene `ResearchPresenter` components and performs auto-purchases while infinity auto-research is enabled.

## Contract
- Uses scene presenters only; it does not create hidden fallback presenters.
- Runs repeated purchase passes per frame up to `MaxIterationsPerUpdate`.
- If required mega research presenters are missing, logs a warning once.

## Data Flow
1. `Awake`/`OnEnable`: refresh presenter cache and validate required mega IDs are present.
2. `Update`: if auto-research is enabled, repeatedly call `TryAutoPurchase()` until no purchases occur or max iterations reached.

## Compatibility Risks
- Missing scene presenter wiring for mega IDs breaks auto-buy for those upgrades.
- Changing required ID list must stay aligned with `ResearchIdMap` and Game scene wiring.

## Quick Verification
1. Enable `infinityAutoResearch` and mega research toggles.
2. Confirm `ResearchAutoBuy` makes purchases for all three mega research cards.
3. Confirm there are no hidden `AutoResearch_*` runtime objects created.
