# Reality System Refactor Plan

**Date:** 2026-01-15
**Branch:** `refactor/reality-system-cleanup`
**Status:** Planning Phase
**Author:** Claude (Opus 4.5)

---

## Executive Summary

The Reality system is the end-game prestige layer that converts Infinity Points into Reality Points. While functional, the codebase has accumulated technical debt including magic numbers, dual storage patterns, tight coupling, and naming inconsistencies. This plan outlines a phased approach to clean up the system while maintaining save compatibility and feature parity.

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Identified Issues](#identified-issues)
3. [Refactoring Phases](#refactoring-phases)
4. [Phase 1: Extract Constants](#phase-1-extract-constants)
5. [Phase 2: Rename for Clarity](#phase-2-rename-for-clarity)
6. [Phase 3: Create Reality Service](#phase-3-create-reality-service)
7. [Phase 4: Data-Driven Upgrades](#phase-4-data-driven-upgrades)
8. [Phase 5: Consolidate UI Logic](#phase-5-consolidate-ui-logic)
9. [Bug Fixes](#bug-fixes)
10. [Testing Strategy](#testing-strategy)
11. [Risk Assessment](#risk-assessment)

---

## Current Architecture

### File Inventory

| File | Path | Purpose |
|------|------|---------|
| InceptionController.cs | `Assets/Scripts/Expansion/` | Core worker generation & influence conversion |
| RealityPanelManager.cs | `Assets/Scripts/User Interface/` | Reality tab visibility and unlock logic |
| ToRealityFillbar.cs | `Assets/Scripts/User Interface/` | IP → Reality progress bar |
| PrestigePlusUpdater.cs | `Assets/Scripts/User Interface/` | Reality point spending UI |
| AvocadoFeeder.cs | `Assets/Scripts/Systems/Avocado/` | Influence → multiplier system |
| WorkerCountCondition.cs | `Assets/Scripts/Data/Conditions/` | Worker-based unlock conditions |
| PrestigeThresholdCondition.cs | `Assets/Scripts/Data/Conditions/` | Influence/Reality point conditions |
| Oracle.cs | `Assets/Scripts/Expansion/` | Data storage (PrestigePlus, SaveData) |

### Data Flow

```
Infinity Points (42) → Reality Points → Upgrades
                                      ↓
                              Worker Gen Speed
                                      ↓
                              Workers (128 batch)
                                      ↓
                              Influence Currency
                                      ↓
                              Avocado System
```

---

## Identified Issues

### Issue Summary

| Category | Count | Severity | Impact |
|----------|-------|----------|--------|
| Magic Numbers | 19+ | HIGH | Readability, Maintainability |
| Dual Storage | 2 | HIGH | Confusion, Bug Risk |
| Oracle Coupling | 6 files | MEDIUM | Testability |
| Hardcoded Costs | 10+ | MEDIUM | Flexibility |
| Unclear Naming | 5+ | MEDIUM | Readability |
| Logic Duplication | 4+ | LOW | Maintainability |
| Bugs | 1 critical | HIGH | Correctness |

---

### Magic Numbers Detail

#### 128 - Worker Batch Size (9 occurrences)

| File | Line | Code |
|------|------|------|
| InceptionController.cs | 27 | `workersReadyToGo >= 128` |
| InceptionController.cs | 29 | `workersReadyToGo >= 128` |
| InceptionController.cs | 67 | `if (total >= 128)` |
| InceptionController.cs | 69 | `workersReadyToGo = 128` |
| InceptionController.cs | 71 | `128 - workersReadyToGo` |
| InceptionController.cs | 91, 95 | `case >= 128 when` |
| InceptionController.cs | 118-120 | Fill calculations `/128` |
| InceptionController.cs | 127 | `influence += 128` |

#### 42 - IP to Reality Conversion (5 occurrences)

| File | Line | Code |
|------|------|------|
| ToRealityFillbar.cs | 19 | `infinityPoints / 42f` |
| ToRealityFillbar.cs | 21-24 | `infinityPoints < 42`, `>= 42` |
| PrestigePlusUpdater.cs | 46 | `avocatoCost = 42` |
| PrestigePlusUpdater.cs | 104-105 | `/42f`, `"42 IP"` |

#### 27 - Secrets Unlock Threshold (4 occurrences)

| File | Line | Code |
|------|------|------|
| RealityPanelManager.cs | 70 | `secretsOfTheUniverse >= 27` |
| RealityPanelManager.cs | 102 | `/ 27` |
| PrestigePlusUpdater.cs | 69, 129 | `secrets >= 27` |
| PrestigePlusUpdater.cs | 167-171 | `secrets >= 27` |

#### 4 - Base Worker Generation Speed

| File | Line | Code |
|------|------|------|
| InceptionController.cs | 26 | `workerGenerationSpeed = 4 + influence` |

---

### Dual Influence Storage

**Critical Issue:** The name "influence" is used for two completely different things:

| Storage Location | Type | Purpose | Used In |
|------------------|------|---------|---------|
| `SaveData.influence` | Currency | Accumulated value fed to Avocado | InceptionController, AvocadoFeeder |
| `PrestigePlus.influence` | Upgrade Level | Purchased upgrades (+4 speed each) | InceptionController, PrestigePlusUpdater |

**Risk:** Developers may confuse these, leading to bugs where currency is treated as level or vice versa.

**Evidence of confusion:**
- InceptionController.cs:26 uses `prestigePlus.influence` (level)
- InceptionController.cs:30 displays `saveData.influence` (currency)
- AvocadoFeeder.cs:50 transfers `saveData.influence` to `avocatoInfluence`

---

### Tight Oracle Coupling

All 6 Reality-related files import Oracle directly:

```csharp
// Found in every file
using static Expansion.Oracle;
```

Direct access patterns scattered throughout:
- `oracle.saveSettings.saveData.workersReadyToGo`
- `oracle.saveSettings.prestigePlus.influence`
- `Oracle.StaticPrestigeData`
- `Oracle.StaticSaveSettings.prestigePlus`

**Impact:**
- Cannot unit test without Oracle initialization
- Changes to Oracle structure affect all files
- No abstraction layer for future changes

---

### Hardcoded Upgrade Costs

**PrestigePlusUpdater.cs (Lines 44-53):**

```csharp
private const int BreakTheLoopCost = 6;
private const int QuantumEntanglementCost = 12;
private const int avocatoCost = 42;
private const int FragmentCost = 2;
private const int PurityCost = 3;
private const int TerraCost = 2;
private const int PowerCost = 2;
private const int ParagadeCost = 1;
private const int StellarCost = 4;
```

**Issues:**
- Costs defined in UI code, not data
- Cannot modify without code change
- Division cost uses formula: `Math.Pow(2, divisionsPurchased) * 2`

---

### Unclear Naming

| Current | Problem | Suggested |
|---------|---------|-----------|
| `SendWorkers()` | Doesn't send anywhere | `GatherInfluence()` |
| `universesConsumed` | Not universes | `workerBatchesProcessed` |
| `workerAutoConvert` | Convert to what? | `autoGatherInfluence` |
| `InceptionController` | Unclear meaning | `WorkerController` |
| `applyReturnValues` | Vague | `ApplyOfflineProgress()` |

---

### Logic Duplication

**Worker fill calculation repeated:**
```csharp
// InceptionController.cs:118
workersReadyToGofill.fillAmount = (float)workersReadyToGo / 128;
// InceptionController.cs:119
workersReadyToGofillSideMenu.fillAmount = (float)workersReadyToGo / 128;
```

**Secrets >= 27 check repeated 5 times** across RealityPanelManager and PrestigePlusUpdater.

**Dual secrets storage update:**
```csharp
// PrestigePlusUpdater.cs:167-168 - BOTH updated independently
prestigePlus.secrets += prestigePlus.secrets >= 27 ? 0 : 3;
prestigeData.secretsOfTheUniverse += prestigeData.secretsOfTheUniverse >= 27 ? 0 : 3;
```

---

## Bug Fixes

### Critical: Off-by-One in UniversesConsumed Calculation

**Location:** InceptionController.cs:69-71

**Current Code:**
```csharp
oracle.saveSettings.saveData.workersReadyToGo = 128;  // Line 69: Clamp to 128
oracle.saveSettings.saveData.universesConsumed +=
    128 - oracle.saveSettings.saveData.workersReadyToGo;  // Line 71: Always 0!
```

**Problem:** After line 69 sets `workersReadyToGo = 128`, the calculation `128 - 128 = 0`, so universesConsumed never increases properly.

**Fix:**
```csharp
var overflow = total - 128;  // Calculate overflow first
oracle.saveSettings.saveData.workersReadyToGo = 128;
oracle.saveSettings.saveData.universesConsumed += (overflow / 128) + 1;  // Or appropriate logic
```

### Minor: Typo in SaveDataPrestige

**Location:** Oracle.cs:3523

**Current:** `workerBoostAcivator` (missing 't')
**Fix:** `workerBoostActivator`

---

## Refactoring Phases

### Overview

| Phase | Focus | Effort | Risk | Saves Breaking? |
|-------|-------|--------|------|-----------------|
| 1 | Extract Constants | Low | Low | No |
| 2 | Rename for Clarity | Medium | Low | **Yes** (migration needed) |
| 3 | Create Reality Service | Medium | Medium | No |
| 4 | Data-Driven Upgrades | High | Medium | No |
| 5 | Consolidate UI Logic | Low | Low | No |

---

## Phase 1: Extract Constants

**Goal:** Replace all magic numbers with named constants.

### New File: `Assets/Scripts/Systems/Reality/RealityConstants.cs`

```csharp
namespace IdleDysonSwarm.Systems.Reality
{
    /// <summary>
    /// Constants for the Reality prestige system.
    /// Centralizes magic numbers for maintainability.
    /// </summary>
    public static class RealityConstants
    {
        // Worker System
        public const int WorkerBatchSize = 128;
        public const int BaseWorkerGenerationSpeed = 4;
        public const int InfluenceSpeedPerPoint = 4;

        // Prestige Conversion
        public const int IPToRealityConversion = 42;

        // Unlock Thresholds
        public const int SecretsToUnlockReality = 27;

        // Upgrade Costs
        public const int AvocatoCost = 42;
        public const int BreakTheLoopCost = 6;
        public const int QuantumEntanglementCost = 12;
        public const int FragmentCost = 2;
        public const int PurityCost = 3;
        public const int TerraCost = 2;
        public const int PowerCost = 2;
        public const int ParagadeCost = 1;
        public const int StellarCost = 4;

        // Multipliers
        public const float CashBonusPerPoint = 0.05f;
        public const float ScienceBonusPerPoint = 0.05f;
    }
}
```

### Files to Update

| File | Changes |
|------|---------|
| InceptionController.cs | Replace 128, 4 with constants |
| RealityPanelManager.cs | Replace 27 with constant |
| ToRealityFillbar.cs | Replace 42 with constant |
| PrestigePlusUpdater.cs | Replace all cost constants |

### Verification

- [ ] All 128 occurrences replaced
- [ ] All 42 occurrences replaced
- [ ] All 27 occurrences replaced
- [ ] All 4 occurrences replaced
- [ ] Compilation succeeds
- [ ] Game behavior unchanged

---

## Phase 2: Rename for Clarity

**Goal:** Improve code readability through consistent, descriptive naming.

### Renames Required

#### Data Fields (Requires Save Migration)

| Class | Current | New | Migration |
|-------|---------|-----|-----------|
| SaveData | `influence` | `influenceBalance` | JSON alias |
| SaveData | `universesConsumed` | `workerBatchesProcessed` | JSON alias |
| SaveData | `workerAutoConvert` | `autoGatherInfluence` | JSON alias |
| PrestigePlus | `influence` | `influenceLevel` | JSON alias |

#### Methods (No Migration)

| Class | Current | New |
|-------|---------|-----|
| InceptionController | `SendWorkers()` | `GatherInfluence()` |
| InceptionController | `applyReturnValues()` | `ApplyOfflineProgress()` |

#### Files (No Migration)

| Current | New | Reason |
|---------|-----|--------|
| InceptionController.cs | WorkerController.cs | Clarity |

### Save Migration Strategy

Use `[JsonProperty]` attributes to maintain backward compatibility:

```csharp
public class SaveData
{
    [JsonProperty("influence")]
    public long influenceBalance;

    [JsonProperty("universesConsumed")]
    public long workerBatchesProcessed;

    [JsonProperty("workerAutoConvert")]
    public bool autoGatherInfluence;
}
```

### Verification

- [ ] All renames applied consistently
- [ ] JSON aliases added for save compat
- [ ] Existing saves load correctly
- [ ] New saves use new field names internally

---

## Phase 3: Create Reality Service

**Goal:** Decouple Reality logic from Oracle singleton.

### New Interface: `IRealityService`

```csharp
namespace IdleDysonSwarm.Services
{
    public interface IRealityService
    {
        // State Properties
        long RealityPoints { get; }
        long AvailablePoints { get; }
        long SpentPoints { get; }
        long WorkersReady { get; }
        long InfluenceBalance { get; }
        long InfluenceLevel { get; }
        long WorkerBatchesProcessed { get; }
        long Secrets { get; }
        bool AutoGatherEnabled { get; set; }

        // Calculated Properties
        float WorkerGenerationSpeed { get; }
        float WorkerFillPercent { get; }
        float CashMultiplier { get; }
        float ScienceMultiplier { get; }
        bool IsRealityUnlocked { get; }

        // Actions
        bool TryGatherInfluence();
        bool TryPurchaseUpgrade(RealityUpgradeType upgrade);
        bool CanAfford(RealityUpgradeType upgrade);
        int GetUpgradeCost(RealityUpgradeType upgrade);

        // Events
        event Action<long> OnInfluenceGathered;
        event Action<RealityUpgradeType> OnUpgradePurchased;
    }
}
```

### New Enum: `RealityUpgradeType`

```csharp
namespace IdleDysonSwarm.Services
{
    public enum RealityUpgradeType
    {
        Influence,
        Cash,
        Science,
        Automation,
        BreakTheLoop,
        QuantumEntanglement,
        Avocato,
        Secrets,
        Division,
        // ... additional upgrades
    }
}
```

### Implementation: `RealityService`

```csharp
namespace IdleDysonSwarm.Services
{
    public class RealityService : IRealityService
    {
        private readonly Oracle _oracle;

        public RealityService(Oracle oracle)
        {
            _oracle = oracle;
        }

        public long RealityPoints =>
            _oracle.saveSettings.prestigePlus.points;

        public long AvailablePoints =>
            RealityPoints - SpentPoints;

        public float WorkerGenerationSpeed =>
            RealityConstants.BaseWorkerGenerationSpeed +
            (InfluenceLevel * RealityConstants.InfluenceSpeedPerPoint);

        public float WorkerFillPercent =>
            (float)WorkersReady / RealityConstants.WorkerBatchSize;

        public bool TryGatherInfluence()
        {
            if (WorkersReady < RealityConstants.WorkerBatchSize)
                return false;

            var saveData = _oracle.saveSettings.saveData;
            saveData.influenceBalance += RealityConstants.WorkerBatchSize;
            saveData.workersReadyToGo = 0;
            saveData.workerBatchesProcessed++;

            OnInfluenceGathered?.Invoke(RealityConstants.WorkerBatchSize);
            return true;
        }

        // ... remaining implementation
    }
}
```

### Service Registration

Add to `ServiceProvider.cs`:

```csharp
private void RegisterServices()
{
    // Existing services...

    var realityService = new RealityService(oracle);
    ServiceLocator.Register<IRealityService>(realityService);
}
```

### Migration Pattern

```csharp
// Before (tight coupling)
public class InceptionController : MonoBehaviour
{
    public Oracle oracle;

    void Update()
    {
        float speed = 4 + oracle.saveSettings.prestigePlus.influence;
        // ...
    }
}

// After (service injection)
public class WorkerController : MonoBehaviour
{
    private IRealityService _realityService;

    void Awake()
    {
        _realityService = ServiceLocator.Get<IRealityService>();
    }

    void Update()
    {
        float speed = _realityService.WorkerGenerationSpeed;
        // ...
    }
}
```

### Verification

- [ ] IRealityService covers all current Oracle access
- [ ] RealityService implementation complete
- [ ] Service registered in ServiceProvider
- [ ] All Reality files migrated to use service
- [ ] Unit tests pass with mock service

---

## Phase 4: Data-Driven Upgrades

**Goal:** Move upgrade definitions to ScriptableObjects.

### New ScriptableObject: `RealityUpgradeDefinition`

```csharp
namespace IdleDysonSwarm.Data
{
    [CreateAssetMenu(
        fileName = "NewRealityUpgrade",
        menuName = "Idle Dyson Swarm/Reality/Upgrade Definition"
    )]
    public class RealityUpgradeDefinition : ScriptableObject
    {
        [Header("Identity")]
        public string id;
        public string displayName;
        [TextArea] public string description;

        [Header("Cost")]
        public int baseCost;
        public bool isRepeatable;
        public CostScalingType scalingType;
        public float scalingFactor = 2f;

        [Header("Effect")]
        public RealityUpgradeType upgradeType;
        public float effectValue;

        [Header("Requirements")]
        public ScriptableCondition unlockCondition;
        public RealityUpgradeDefinition[] prerequisites;

        [Header("UI")]
        public Sprite icon;
        public string purchasedText = "Purchased";
    }

    public enum CostScalingType
    {
        Fixed,
        Linear,
        Exponential
    }
}
```

### Upgrade Registry

```csharp
namespace IdleDysonSwarm.Data
{
    [CreateAssetMenu(
        fileName = "RealityUpgradeRegistry",
        menuName = "Idle Dyson Swarm/Reality/Upgrade Registry"
    )]
    public class RealityUpgradeRegistry : ScriptableObject
    {
        [SerializeField] private List<RealityUpgradeDefinition> _upgrades;

        private Dictionary<string, RealityUpgradeDefinition> _byId;

        public bool TryGetUpgrade(string id, out RealityUpgradeDefinition def)
        {
            EnsureInitialized();
            return _byId.TryGetValue(id, out def);
        }

        public IEnumerable<RealityUpgradeDefinition> GetAllUpgrades() => _upgrades;

        private void EnsureInitialized()
        {
            if (_byId != null) return;
            _byId = _upgrades.ToDictionary(u => u.id);
        }
    }
}
```

### Benefits

- Balance changes without code modifications
- Visual editing in Unity Inspector
- Easy to add new upgrades
- Unlock conditions use existing ScriptableCondition system

### Verification

- [ ] All upgrades defined as ScriptableObjects
- [ ] Registry created and populated
- [ ] PrestigePlusUpdater migrated to use registry
- [ ] Cost calculations match original behavior
- [ ] All upgrades purchasable in game

---

## Phase 5: Consolidate UI Logic

**Goal:** Remove duplication and simplify visibility logic.

### Worker Fill Calculation

**Create shared property:**

```csharp
// In IRealityService (already defined in Phase 3)
float WorkerFillPercent { get; }  // Returns WorkersReady / WorkerBatchSize
```

**Update UI:**
```csharp
// Before (duplicated)
workersReadyToGofill.fillAmount = (float)workersReadyToGo / 128;
workersReadyToGofillSideMenu.fillAmount = (float)workersReadyToGo / 128;

// After (single source)
var fillPercent = _realityService.WorkerFillPercent;
workersReadyToGofill.fillAmount = fillPercent;
workersReadyToGofillSideMenu.fillAmount = fillPercent;
```

### Secrets Check Consolidation

**Create shared property:**

```csharp
// In IRealityService
bool IsRealityUnlocked { get; }  // Returns Secrets >= SecretsToUnlockReality
bool IsSecretsMaxed { get; }     // Same check, different name for clarity
```

### Panel Visibility with ScriptableConditions

**Create conditions:**

| Condition | Logic |
|-----------|-------|
| `RealityTabVisible` | `RealityPoints >= 1 OR InfinityPoints >= 1 OR UnlockAllTabs` |
| `RealityUnlocked` | `RealityPoints >= 1 OR Secrets >= 27 OR UnlockAllTabs` |

**Update RealityPanelManager:**
```csharp
[SerializeField] private ScriptableCondition _tabVisibleCondition;
[SerializeField] private ScriptableCondition _unlockedCondition;

void Update()
{
    bool showTab = _tabVisibleCondition.IsMet();
    bool showWorkers = _unlockedCondition.IsMet();
    // ...
}
```

### Verification

- [ ] No duplicate fill calculations
- [ ] No duplicate secrets checks
- [ ] Visibility conditions are ScriptableObjects
- [ ] UI behavior unchanged

---

## Testing Strategy

### Unit Tests

| Test | Coverage |
|------|----------|
| RealityServiceTests | Service calculations, state changes |
| RealityConstantsTests | Constant values are sane |
| UpgradeDefinitionTests | Cost calculations, scaling |

### Integration Tests

| Test | Coverage |
|------|----------|
| Save/Load | Old saves load with new field names |
| Upgrade Purchase | All upgrades purchasable |
| Worker Generation | Offline progress correct |

### Manual Testing Checklist

- [ ] Fresh game: Reality tab hidden until unlock
- [ ] Purchase each upgrade type
- [ ] Verify worker generation speed increases
- [ ] Verify influence gathering works
- [ ] Verify Avocado system receives influence
- [ ] Load old save file
- [ ] Verify all progress preserved

---

## Risk Assessment

### Low Risk

- **Phase 1 (Constants):** Pure refactor, no behavior change
- **Phase 5 (UI Consolidation):** Cosmetic changes only

### Medium Risk

- **Phase 3 (Service):** Significant restructure, but uses established pattern
- **Phase 4 (Data-Driven):** Complex, but isolated to upgrade system

### High Risk

- **Phase 2 (Renames):** Requires save migration, potential for data loss

### Mitigation Strategies

1. **Feature branch per phase** - Easy rollback
2. **Save backup before testing** - User protection
3. **JSON aliases for compatibility** - Bidirectional save support
4. **Comprehensive manual testing** - Catch edge cases

---

## Implementation Schedule

### Recommended Order

1. **Phase 1** - Foundation, no risk
2. **Bug Fixes** - Critical correctness
3. **Phase 3** - Service layer enables testing
4. **Phase 5** - Quick wins, low risk
5. **Phase 2** - Renames (with save migration)
6. **Phase 4** - Data-driven (optional, high effort)

### Dependencies

```
Phase 1 (Constants)
    ↓
Bug Fixes ──→ Phase 3 (Service)
                  ↓
             Phase 5 (UI)
                  ↓
             Phase 2 (Renames) ──→ Phase 4 (Data-Driven)
```

---

## Questions for User

Before proceeding with implementation:

1. **Priority confirmation:** Should we implement all phases, or focus on specific ones?
2. **Break The Loop:** What does this upgrade actually do? (Needed for service implementation)
3. **Dual secrets storage:** Is maintaining both `PrestigePlus.secrets` and `PrestigeData.secretsOfTheUniverse` intentional?
4. **Constants flexibility:** Should constants be ScriptableObject-based for in-editor tuning, or static class is acceptable?
5. **File rename:** Is renaming `InceptionController.cs` → `WorkerController.cs` acceptable?

---

## Appendix A: Complete Magic Number Locations

<details>
<summary>Click to expand full list</summary>

### 128 Occurrences

| File | Line | Context |
|------|------|---------|
| InceptionController.cs | 27 | `workersReadyToGo >= 128` |
| InceptionController.cs | 29 | `workersReadyToGo >= 128` |
| InceptionController.cs | 67 | `if (total >= 128)` |
| InceptionController.cs | 69 | `workersReadyToGo = 128` |
| InceptionController.cs | 71 | `128 - workersReadyToGo` |
| InceptionController.cs | 91 | `case >= 128 when` |
| InceptionController.cs | 95 | `case >= 128 when` |
| InceptionController.cs | 118 | `/ 128` |
| InceptionController.cs | 119 | `/ 128` |
| InceptionController.cs | 120 | `"/128"` |
| InceptionController.cs | 127 | `+= 128` |

### 42 Occurrences

| File | Line | Context |
|------|------|---------|
| ToRealityFillbar.cs | 19 | `/ 42f` |
| ToRealityFillbar.cs | 21 | `< 42` |
| ToRealityFillbar.cs | 24 | `>= 42` |
| PrestigePlusUpdater.cs | 46 | `= 42` |
| PrestigePlusUpdater.cs | 104 | `/ 42f` |
| PrestigePlusUpdater.cs | 105 | `"42 IP"` |

### 27 Occurrences

| File | Line | Context |
|------|------|---------|
| RealityPanelManager.cs | 70 | `>= 27` |
| RealityPanelManager.cs | 102 | `/ 27` |
| PrestigePlusUpdater.cs | 69 | `>= 27` |
| PrestigePlusUpdater.cs | 129 | `< 27` |
| PrestigePlusUpdater.cs | 167 | `>= 27` |
| PrestigePlusUpdater.cs | 168 | `>= 27` |
| PrestigePlusUpdater.cs | 171 | `>= 27` |

### 4 Occurrences

| File | Line | Context |
|------|------|---------|
| InceptionController.cs | 26 | `= 4 +` |

</details>

---

## Appendix B: File Dependency Graph

```
Oracle.cs
    ├── PrestigePlus (data class)
    │   └── Used by: PrestigePlusUpdater, InceptionController, RealityPanelManager
    └── SaveData (data class)
        └── Used by: InceptionController, AvocadoFeeder

InceptionController.cs
    ├── Uses: Oracle (direct)
    ├── Updates: Workers, Influence
    └── Feeds: AvocadoFeeder (via SaveData.influence)

PrestigePlusUpdater.cs
    ├── Uses: Oracle (direct)
    ├── Displays: All upgrade buttons
    └── Purchases: All upgrades

RealityPanelManager.cs
    ├── Uses: Oracle (direct)
    └── Controls: Panel visibility

ToRealityFillbar.cs
    ├── Uses: Oracle (direct)
    └── Displays: IP → Reality progress

AvocadoFeeder.cs
    ├── Uses: Oracle (direct)
    ├── Consumes: SaveData.influence
    └── Feeds: Avocado multiplier system
```

---

**Document Status:** Ready for Review
**Next Step:** User approval → Begin Phase 1 implementation
