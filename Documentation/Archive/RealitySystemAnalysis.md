# Reality System Analysis

**Date:** 2026-01-15
**Purpose:** Deep dive into Reality system to identify improvement opportunities
**Author:** Claude (Opus 4.5)

---

## Overview

Reality is the end-game prestige layer (after Infinity). Players convert 42 Infinity Points into 1 Reality Point, then spend points on multipliers and unlocks. The system generates "workers" that batch-convert into "influence" currency.

---

## File Inventory

| File | Purpose |
|------|---------|
| `Expansion/InceptionController.cs` | Core worker generation & influence conversion |
| `User Interface/RealityPanelManager.cs` | Reality tab visibility and unlock logic |
| `User Interface/ToRealityFillbar.cs` | IP → Reality progress bar |
| `User Interface/PrestigePlusUpdater.cs` | Reality point spending UI |
| `Expansion/Oracle.cs` | Data storage (PrestigePlus, SaveData) |
| `Expansion/ResearchManager.cs` | Reality-specific research upgrades |
| `Systems/Avocado/AvocadoFeeder.cs` | Influence → multiplier system |
| `Data/Conditions/WorkerCountCondition.cs` | Worker-based unlock conditions |
| `Data/Conditions/PrestigeThresholdCondition.cs` | Influence/Reality point conditions |

---

## Data Structures

### PrestigePlus (Reality Currency)
```csharp
public class PrestigePlus
{
    public long points;           // Reality points earned
    public long spentPoints;      // Points spent on upgrades

    // Per-point purchases (cost 1 each)
    public long influence;        // +4 worker gen speed per point
    public long cash;             // +5% cash multiplier per point
    public long science;          // +5% science multiplier per point

    // One-time unlocks
    public bool automation;           // Auto-convert workers
    public bool quantumEntanglement;  // Auto-prestige at 42 IP
    public bool breakTheLoop;         // Cost: 6 points
    public bool avocatoPurchased;     // Cost: 42 points
    public long secrets;              // Up to 27, unlocks Reality panel
    public long divisionsPurchased;   // 10x multiplier, exponential cost
}
```

### SaveData (Persistent Reality State)
```csharp
public class SaveData
{
    public long workersReadyToGo;    // 0-128, batched for conversion
    public long universesConsumed;   // Total worker batches processed
    public long influence;           // Accumulated influence (feeds Avocado)
    public bool workerAutoConvert;   // Auto-gather when full
}
```

---

## Core Mechanics

### Worker Generation Flow
```
Worker Generation Speed = 4 + prestigePlus.influence

Every frame:
  workerGenerationTime += speed * deltaTime

When workerGenerationTime >= 1:
  workersReadyToGo++ (capped at 128)
  universesConsumed++

When workersReadyToGo == 128:
  If autoConvert: influence += 128, reset workers
  Else: Wait for manual "Gather Influence" button
```

### Reality Point Conversion
```
42 Infinity Points → 1 Reality Point

With Quantum Entanglement:
  Auto-converts every 42 IP accumulated

Without:
  Manual prestige required (double wipe)
```

### Point Spending Options
| Purchase | Cost | Effect |
|----------|------|--------|
| Influence | 1 | +4 worker generation speed |
| Cash | 1 | +5% cash multiplier |
| Science | 1 | +5% science multiplier |
| Automation | 1 | Enable worker auto-convert |
| Break The Loop | 6 | Unknown effect |
| Quantum Entanglement | 12 | Auto-prestige at 42 IP |
| Avocato | 42 | Unlock Avocado system |
| Secrets | 1 (up to 27) | Progress toward Reality unlock |
| Division | 2^n | 10x multiplier per purchase |

---

## UI Components

### RealityPanelManager
- **Locked Mode** (< 27 Secrets): Shows secrets progress bar
- **Unlocked Mode**: Shows worker generation bar, universe counter
- Handles first-run logic and panel toggles

### ToRealityFillbar
- Displays `infinityPoints / 42` progress
- "Exit Dyson Verse" button at 42+ IP

### PrestigePlusUpdater
- Shows available points: `points - spentPoints`
- Buttons for each upgrade purchase
- Hardcoded costs and effects

---

## Identified Issues

### 1. Magic Numbers (High Priority)

| Value | Meaning | Locations |
|-------|---------|-----------|
| **128** | Worker batch size | InceptionController (9 places) |
| **42** | IP to Reality conversion | Oracle, PrestigePlusUpdater, ToRealityFillbar |
| **27** | Secrets to unlock Reality | RealityPanelManager, PrestigePlusUpdater |
| **4** | Base worker gen speed | InceptionController |

**Fix:** Extract to `RealityConstants.cs` or ScriptableObject config.

### 2. Dual Influence Storage

Influence exists in two places:
- `PrestigePlus.influence` - Purchased upgrade level (affects gen speed)
- `SaveData.influence` - Accumulated currency (feeds Avocado)

**Issue:** Confusing naming. One is a "level", one is a "currency".

**Fix:** Rename to `influenceLevel` and `influenceAccumulated` or similar.

### 3. Tight Coupling to Oracle

All Reality code directly accesses:
```csharp
oracle.saveSettings.prestigePlus.influence
Oracle.StaticSaveSettings.prestigePlus
```

**Fix:** Create `IRealityService` following existing service pattern.

### 4. Hardcoded Upgrade Costs

PrestigePlusUpdater has:
```csharp
private int avocatoCost = 42;
private int BreakTheLoopCost = 6;
private int quantumEntanglementCost = 12;
```

**Fix:** Move to ScriptableObject or data-driven config.

### 5. Unclear Naming

| Current | Problem | Suggested |
|---------|---------|-----------|
| `SendWorkers()` | Doesn't send anywhere | `ConvertWorkersToInfluence()` |
| `universesConsumed` | Not universes | `workerBatchesProcessed` |
| `workerAutoConvert` | Converts to what? | `autoGatherInfluence` |
| `InceptionController` | What does Inception mean? | `RealityController` or `WorkerController` |

### 6. Logic Duplication

Worker fill bar calculation (`workersReadyToGo / 128f`) appears in:
- InceptionController
- RealityPanelManager

Away-time calculation split between two code paths (auto vs manual mode).

### 7. Missing Service Layer

Reality system doesn't use the service pattern established for Facilities/Research:
- No `IRealityService`
- No `RealityService` implementation
- Can't mock for testing

### 8. Complex Visibility Logic

RealityPanelManager has nested conditions:
```csharp
if (secretsOfTheUniverse >= 27 || prestigePlus.points > 0)
    // Show worker bar
else
    // Show secrets progress
```

**Fix:** Use ScriptableCondition for unlock logic.

---

## Recommended Refactoring

### Phase 1: Extract Constants
Create `Assets/Scripts/Systems/Reality/RealityConstants.cs`:
```csharp
public static class RealityConstants
{
    public const int WorkerBatchSize = 128;
    public const int IPToRealityConversion = 42;
    public const int SecretsToUnlockReality = 27;
    public const int BaseWorkerGenerationSpeed = 4;
    public const int InfluencePerPoint = 4;
    public const float CashBonusPerPoint = 0.05f;
    public const float ScienceBonusPerPoint = 0.05f;
}
```

### Phase 2: Rename for Clarity
- `SendWorkers()` → `GatherInfluence()`
- `universesConsumed` → `totalWorkerBatches`
- `InceptionController` → `WorkerController`
- `PrestigePlus.influence` → `PrestigePlus.influenceLevel`
- `SaveData.influence` → `SaveData.influenceBalance`

### Phase 3: Create Reality Service
```csharp
public interface IRealityService
{
    // State
    long RealityPoints { get; }
    long AvailablePoints { get; }
    long WorkersReady { get; }
    long InfluenceBalance { get; }

    // Calculations
    float GetWorkerGenerationSpeed();
    float GetCashMultiplier();
    float GetScienceMultiplier();

    // Actions
    bool TryGatherInfluence();
    bool TryPurchaseUpgrade(RealityUpgradeType upgrade);
}
```

### Phase 4: Data-Driven Upgrades
Create `RealityUpgradeDefinition` ScriptableObject:
```csharp
[CreateAssetMenu]
public class RealityUpgradeDefinition : ScriptableObject
{
    public string id;
    public string displayName;
    public int baseCost;
    public bool isRepeatable;
    public ScriptableCondition unlockCondition;
}
```

### Phase 5: Consolidate UI Logic
- Single source for worker fill calculation
- ScriptableConditions for panel visibility
- Remove duplicate update code

---

## Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Extract magic numbers | 1 hr | High - readability |
| 2 | Rename confusing terms | 2 hr | High - maintainability |
| 3 | Create IRealityService | 4 hr | Medium - testability |
| 4 | Data-driven upgrades | 6 hr | Medium - flexibility |
| 5 | Consolidate UI logic | 4 hr | Low - cleanup |

---

## Questions for User

1. What does "Break The Loop" actually do? (Not clear from code)
2. Is the dual influence storage intentional or legacy?
3. Should Reality upgrades be ScriptableObjects like facilities?
4. Any planned changes to the 42/128/27 constants?

---

**Document Status:** Complete - Ready for Implementation Planning
