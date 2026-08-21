# Phase 2: Scriptable Condition System - Implementation Summary

**Branch:** `feature/phase-2-scriptable-conditions`
**Status:** IN PROGRESS
**Date:** 2026-01-13
**Depends On:** Phase 1 (Typed IDs)

## Overview

Implemented a data-driven condition system to replace hardcoded switch statements in `EffectConditionEvaluator`. Conditions are now composable ScriptableObject assets that can be configured in the Unity inspector without code changes.

## What Was Implemented

### Core System (Phase 2.1)
- **EffectCondition Base Class** - Abstract ScriptableObject base for all conditions
- **ComparisonOperator** - Enum and helper extensions for comparison operations
- **FacilityCountType** - Enum for specifying which facility count to check

### Condition Types (Phase 2.2)

| Condition | Purpose | Replaces |
|-----------|---------|----------|
| `FacilityCountCondition` | Check facility counts (auto/manual/total) | `assembly_lines_69`, `servers_total_gt_1`, etc. |
| `SkillOwnedCondition` | Check if skill is owned | N/A (new capability) |
| `ResearchLevelCondition` | Check research level thresholds | N/A (new capability) |
| `PrestigeThresholdCondition` | Check prestige resources | N/A (new capability) |
| `WorkerCountCondition` | Check worker/bot/researcher counts | `workers_gt_1`, `researchers_gt_1` |
| `PanelLifetimeCondition` | Check panel lifetime value | `panel_lifetime` |
| `FacilityStateCondition` | Check current facility's state | `manual_owned_gte_69`, `effective_owned_gte_69` |

### Composite Conditions (Phase 2.3)
- **AndCondition** - All child conditions must be true
- **OrCondition** - At least one child condition must be true
- **NotCondition** - Inverts child condition result

### Integration (Phase 2.4)
- **Updated EffectDefinition** - Added `_condition` field alongside legacy `conditionId`
- **Updated EffectConditionEvaluator** - New overload evaluates scriptable conditions first
- **Updated SkillEffectProvider** - Uses new evaluator overload
- **Updated ResearchEffectProvider** - Uses new evaluator overload

### Tooling (Phase 2.5)
- **ConditionMigrationTool** - Generates condition assets from existing conditionIds
- **EffectConditionDrawer** - Custom property drawer showing condition description

## File Structure

```
Assets/
├── Scripts/
│   └── Data/
│       └── Conditions/                    # NEW: Condition System
│           ├── EffectCondition.cs         # Abstract base class
│           ├── ComparisonOperator.cs      # Comparison enum + helpers
│           ├── FacilityCountType.cs       # Count type enum
│           ├── FacilityCountCondition.cs  # Facility count checks
│           ├── SkillOwnedCondition.cs     # Skill ownership checks
│           ├── ResearchLevelCondition.cs  # Research level checks
│           ├── PrestigeThresholdCondition.cs # Prestige resource checks
│           ├── WorkerCountCondition.cs    # Worker/bot checks
│           ├── PanelLifetimeCondition.cs  # Panel lifetime checks
│           ├── FacilityStateCondition.cs  # Context-dependent state
│           ├── AndCondition.cs            # Composite: ALL
│           ├── OrCondition.cs             # Composite: ANY
│           └── NotCondition.cs            # Composite: INVERT
└── Editor/
    ├── ConditionMigrationTool.cs          # NEW: Migration helper
    └── EffectConditionDrawer.cs           # NEW: Inspector drawer
```

## Benefits Achieved

### 1. Designer-Friendly
- Create conditions in inspector (no code changes)
- Drag-drop assignment to effects
- Visual feedback via descriptions

### 2. Composable Logic
- Combine conditions with AND/OR/NOT
- Build complex logic from simple pieces
- Reuse conditions across multiple effects

### 3. Self-Documenting
- Each condition generates human-readable description
- Inspector shows condition details inline
- Play mode preview shows current values

### 4. Full Backward Compatibility
- Legacy `conditionId` strings still work
- Scriptable conditions take precedence if set
- No changes required to existing data

### 5. Extensible
- Easy to add new condition types
- Follow existing pattern for new behaviors
- Type-safe integration with typed IDs

## Usage Example

### Creating a Condition
1. Right-click in Project: Create > Game Data > Conditions > Facility Count
2. Configure threshold and comparison
3. Drag FacilityId asset to condition
4. Assign condition to EffectDefinition

### Using Composite Conditions
```
AND Condition
├── FacilityCountCondition (assembly_lines >= 69)
├── SkillOwnedCondition (hasSkill: superchargedPower)
└── OR Condition
    ├── ResearchLevelCondition (money_multiplier >= 5)
    └── PrestigeThresholdCondition (IP >= 100)
```

## Migration Path

### Scan Existing Conditions
```
Tools > Idle Dyson Swarm > Migrate Conditions > Scan ConditionIds
```

### Generate Condition Assets
```
Tools > Idle Dyson Swarm > Migrate Conditions > Generate Condition Assets
```

### Manual Migration Steps
1. Open EffectDefinition asset
2. Drag appropriate condition asset to `_condition` field
3. Clear `conditionId` field (optional, for cleanliness)

## Known Limitations

### bots_required_met Condition
- Complex multi-step calculation
- Requires custom condition class
- Not auto-migrated (needs manual implementation)

### FacilityStateCondition
- Only works with facility context
- Returns false if evaluated globally
- Used for relative thresholds on current facility

## Testing Checklist

- [ ] FacilityCountCondition evaluates correctly
- [ ] SkillOwnedCondition checks ownership
- [ ] ResearchLevelCondition checks levels
- [ ] Composite conditions compose properly
- [ ] Legacy conditionId strings still work
- [ ] New effects can use scriptable conditions
- [ ] Migration tool generates correct assets
- [ ] Inspector drawer shows descriptions

## Next Steps

### Phase 3 (Future)
1. Create condition assets for all existing conditionIds
2. Update effect assets to use scriptable conditions
3. Add `bots_required_met` custom condition
4. Add play mode debugging UI

## Commit History

1. `feat(conditions): Create EffectCondition base class and supporting enums`
2. `feat(conditions): Implement basic condition types`
3. `feat(conditions): Implement composite conditions (AND, OR, NOT)`
4. `feat(conditions): Update EffectDefinition and evaluator for scriptable conditions`
5. `feat(conditions): Create condition migration tool`
6. `feat(conditions): Create custom inspector drawer`

## Conclusion

Phase 2 implementation provides:
- Data-driven condition system
- Full backward compatibility
- Designer-friendly workflow
- Extensible architecture

The system enables creating complex condition logic without code changes while maintaining compatibility with existing string-based conditions.
