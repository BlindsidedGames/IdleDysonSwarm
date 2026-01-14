# Quantum Leap & Reality Systems Refactor Plan

**Date:** 2026-01-15
**Branch:** `refactor/reality-system-cleanup`
**Status:** Planning Phase
**Author:** Claude (Opus 4.5)

---

## Guiding Principles

1. **Feature Parity First** - All existing functionality must work identically after refactor
2. **Save Compatibility** - Old saves must load correctly; use JSON aliases for renamed fields
3. **Minimize Manual Editor Work** - Create editor scripts to automate scene/prefab updates
4. **Clear System Boundaries** - Quantum Leap and Reality should be distinct, well-named systems
5. **Do It Right, Not Fast** - Take time to understand before changing

---

## Executive Summary

This refactor addresses **two distinct but interconnected systems** that have been conflated in the codebase:

### 1. Quantum Leap System (Currently: "PrestigePlus")
- Converts 42 Infinity Points → 1 Quantum Point
- Quantum Points purchase upgrades affecting Infinity mechanics
- Includes: Automation, Double IP, Secrets (permanent), Avocado unlock, etc.

### 2. Reality System (Currently: "Reality" tabs)
- **Tab 1 - Universe/Influence:** Worker generation → Influence currency → Dream1 economy
- **Tab 2 - AI/Community:** Hunters, Gatherers, Housing, Workers, Cities → Factories → Space

The systems are connected: Quantum Points → Influence Speed → Influence Currency → Dream1 Resources

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Quantum Leap System](#quantum-leap-system)
3. [Reality System - Universe/Influence](#reality-system---universeinfluence)
4. [Reality System - Dream1 Simulation](#reality-system---dream1-simulation)
5. [Cross-System Dependencies](#cross-system-dependencies)
6. [Identified Issues](#identified-issues)
7. [Refactoring Phases](#refactoring-phases)
8. [Editor Scripts Required](#editor-scripts-required)
9. [Testing Strategy](#testing-strategy)
10. [Risk Assessment](#risk-assessment)

---

## System Architecture Overview

### Current Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            INFINITY SYSTEM                                   │
│  (DysonVerseInfinityData, DysonVersePrestigeData, DysonVerseSkillTreeData)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   42 Infinity Points    │
                        │   Quantum Leap Trigger  │
                        └─────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QUANTUM LEAP SYSTEM                                  │
│                      (PrestigePlus → QuantumData)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Quantum Points → Purchase Upgrades:                                         │
│    • Influence Level (+4 worker speed)                                       │
│    • Cash/Science % bonuses                                                  │
│    • Secrets (permanent, +3 per purchase)                                   │
│    • Automation, Double IP, Bot Multitasking                                │
│    • Division (10x multiplier)                                               │
│    • Quantum Entanglement (auto-prestige)                                   │
│    • Avocado unlock (42 points)                                             │
│    • Break The Loop, Fragments, Purity, Terra, Power, Paragade, Stellar    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  Worker Generation Speed =    │
                      │  4 + (InfluenceLevel × 4)     │
                      └───────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REALITY SYSTEM - UNIVERSE/INFLUENCE                       │
│              (SaveData → WorkerData, InceptionController)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Workers accumulate → 128 batch → Convert to Influence Currency             │
│  Universe Designation counter increments                                     │
│  Influence feeds into Dream1 and Avocado                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
┌─────────────────────────────┐       ┌─────────────────────────────────────┐
│      AVOCADO SYSTEM         │       │    REALITY SYSTEM - DREAM1          │
│   (Global Multiplier)       │       │    (SaveDataDream1, SaveDataPrestige)│
├─────────────────────────────┤       ├─────────────────────────────────────┤
│  Consumes:                  │       │  Foundational Era:                   │
│  • Infinity Points          │       │    Hunters/Gatherers → Community    │
│  • Influence Currency       │       │    → Housing → Workers → Cities     │
│  • Strange Matter           │       │                                      │
│                             │       │  Information Era:                    │
│  Produces:                  │       │    Factories → Bots → Rockets       │
│  • Log10(x) multiplier      │       │                                      │
│  • Applied to all facilities│       │  Space Age:                          │
│                             │       │    Solar → Space Factories → Railgun│
└─────────────────────────────┘       │                                      │
                                      │  Prestige: Disasters → Strange Matter│
                                      └─────────────────────────────────────┘
```

### File Inventory by System

#### Quantum Leap System
| File | Path | Purpose |
|------|------|---------|
| Oracle.cs | `Expansion/` | `PrestigePlus` data class (lines 3420-3450) |
| PrestigePlusUpdater.cs | `User Interface/` | Quantum upgrade purchase UI |
| ToRealityFillbar.cs | `User Interface/` | IP → Quantum progress bar |

#### Reality System - Universe/Influence
| File | Path | Purpose |
|------|------|---------|
| Oracle.cs | `Expansion/` | `SaveData` class (lines 3453-3465) |
| InceptionController.cs | `Expansion/` | Worker generation & influence conversion |
| RealityPanelManager.cs | `User Interface/` | Reality tab visibility and unlock |
| AvocadoFeeder.cs | `Systems/Avocado/` | Influence → Avocado consumption |

#### Reality System - Dream1 Simulation
| File | Path | Purpose |
|------|------|---------|
| Oracle.cs | `Expansion/` | `SaveDataDream1`, `SaveDataPrestige` (lines 3469-3625) |
| FoundationalEraManager.cs | `Expansion/Dream1/` | Hunters, Gatherers, Community chain |
| InformationEraManager.cs | `Expansion/Dream1/` | Factories, Bots, Rockets |
| SpaceAgeManager.cs | `Expansion/Dream1/` | Solar, Space Factories, Railgun |
| SimulationPrestigeManager.cs | `Expansion/` | Disasters → Strange Matter prestige |

#### Conditions & Services
| File | Path | Purpose |
|------|------|---------|
| WorkerCountCondition.cs | `Data/Conditions/` | Worker-based unlock conditions |
| PrestigeThresholdCondition.cs | `Data/Conditions/` | Quantum/Reality point conditions |
| ModifierSystem.cs | `Systems/` | Secret buffs, Avocado multiplier |

---

## Quantum Leap System

### Data Structure: PrestigePlus → QuantumData

**Current Location:** Oracle.cs lines 3420-3450

```csharp
[Serializable]
public class PrestigePlus  // RENAME TO: QuantumData
{
    // Core Currency
    public long points;           // Quantum Points earned
    public long spentPoints;      // Points spent on upgrades

    // Repeatable Upgrades (cost 1 each)
    public long influence;        // RENAME: influenceSpeedLevel (+4 gen speed each)
    public long cash;             // +5% cash multiplier per purchase
    public long science;          // +5% science multiplier per purchase

    // One-Time Unlocks (cost 1 each unless noted)
    public bool botMultitasking;
    public bool doubleIP;
    public bool automation;       // Also sets infinityAutoBots/infinityAutoResearch
    public long secrets;          // Up to 27, adds +3 to DysonVersePrestigeData.secretsOfTheUniverse
    public long divisionsPurchased;  // Exponential cost: 2^n × 2

    // Premium Unlocks
    public bool breakTheLoop;        // Cost: 6 - DysonVerse upgrade
    public bool quantumEntanglement; // Cost: 12 - Auto-prestige at 42 IP
    public bool avocatoPurchased;    // Cost: 42 - Unlocks Avocado system

    // Fragment System (DysonVerse upgrades, cost varies)
    public bool fragments;  // 2
    public bool purity;     // 3
    public bool terra;      // 2
    public bool power;      // 2
    public bool paragade;   // 1
    public bool stellar;    // 4

    // Avocado Accumulators (fed from other systems)
    public double avocatoIP;
    public double avocatoInfluence;
    public double avocatoStrangeMatter;
    public double avocatoOverflow;
}
```

### Quantum Leap Conversion

**Location:** Oracle.cs lines 2868-2883

```csharp
public void EnactPrestigePlus()  // RENAME: PerformQuantumLeap()
{
    saveSettings.firstInfinityDone = true;

    if (prestigePlus.quantumEntanglement)
    {
        // Auto-mode: Convert IP at 42:1 ratio without full reset
        long availableIP = prestigeData.infinityPoints - prestigeData.spentInfinityPoints;
        long quantumGained = (long)Math.Floor(availableIP / 42f);

        saveSettings.prestigePlus.points += quantumGained;
        prestigeData.infinityPoints -= quantumGained * 42;
    }
    else
    {
        // Manual mode: Full prestige wipe
        ResetSkillOwnership();
        StartCoroutine(PrestigeDoubleWiper());
    }
}
```

### Secrets Dual Storage (Clarified)

The dual storage is **intentional**:

1. **`PrestigePlus.secrets`** (0-27): Permanent count from Quantum purchases
   - Survives all resets
   - Each purchase costs 1 Quantum Point, adds +3 to both storages

2. **`DysonVersePrestigeData.secretsOfTheUniverse`** (0-27): Current session count
   - Reset on regular prestige
   - When Quantum Leap happens with `secrets > 0`, starts with those secrets pre-purchased

**Purchase Logic (PrestigePlusUpdater.cs:164-172):**
```csharp
private void PurchaseSecrets()
{
    if (pointsRemaining < 1) return;

    // Add 3 secrets to BOTH storages (capped at 27)
    prestigePlus.secrets += prestigePlus.secrets >= 27 ? 0 : 3;
    prestigeData.secretsOfTheUniverse += prestigeData.secretsOfTheUniverse >= 27 ? 0 : 3;

    prestigePlus.spentPoints++;
}
```

---

## Reality System - Universe/Influence

### Data Structure: SaveData → WorkerData

**Current Location:** Oracle.cs lines 3453-3465

```csharp
[Serializable]
public class SaveData  // RENAME TO: WorkerData
{
    // Worker Generation
    public long workersReadyToGo;      // Current batch (0-128)
    public long universesConsumed;     // RENAME: workerBatchesProcessed (counter)
    public bool workerAutoConvert;     // RENAME: autoGatherInfluence

    // Influence Currency
    public long influence;             // RENAME: influenceBalance (currency)

    // Dream1 Purchase Multipliers
    public long huntersPerPurchase = 1;
    public long gatherersPerPurchase = 1;
}
```

### Worker Generation Flow

**Location:** InceptionController.cs (full file)

```
Worker Speed = 4 + (QuantumData.influenceSpeedLevel × 4)

Every Frame:
  workerGenerationTime += speed × deltaTime

When workerGenerationTime >= 1:
  workersReadyToGo++ (capped at 128)
  workerBatchesProcessed++

When workersReadyToGo == 128:
  If autoGatherInfluence:
    influenceBalance += 128
    workersReadyToGo = 0
  Else:
    Wait for manual "Gather Influence" button
```

### Reality Panel Unlock Logic

**Location:** RealityPanelManager.cs lines 62-71

```csharp
// SHOW Reality tab if ANY:
bool show = QuantumData.points >= 1           // Has Quantum Points
         || PrestigeData.infinityPoints >= 1  // Has any IP
         || unlockAllTabs;                    // Debug mode

// UNLOCK Reality controls if ANY:
bool unlocked = QuantumData.points >= 1              // Has Quantum Points
             || PrestigeData.secretsOfTheUniverse >= 27  // Bought all 27 secrets
             || unlockAllTabs;                       // Debug mode

// Locked mode: Shows secrets progress bar (0-27)
// Unlocked mode: Shows worker generation bar
```

---

## Reality System - Dream1 Simulation

### Foundational Era (Hunters & Gatherers)

**Location:** FoundationalEraManager.cs

**Production Chain:**
```
Influence Currency (from Workers)
    ↓
Purchase Hunters (100 influence each)
Purchase Gatherers (100 influence each)
    ↓
Hunters + Gatherers → Community (3s/unit)
    ↓
Community → Housing (3s/unit, boost available)
    ↓
Housing → Workers (20s/unit)
    ↓
Workers → Housing (4s/unit, cycle)
    ↓
10 Housing → 1 Village
    ↓
25 Villages → 1 City
    ↓
Cities → Factory unlock (requires Engineering research)
```

### Information Era (Factories → Bots → Rockets)

**Location:** InformationEraManager.cs

**Production Chain:**
```
Community → Factories (30s base)
    ↓
Factories → Bots (requires Shipping research)
    ↓
Bots → Rockets (requires World Peace research)
    ↓
Rockets + Factories → Space Factories
```

**Research Prerequisites (all cost Influence):**
- Engineering: 1,000 influence
- Shipping: 5,000 influence
- World Trade: 7,000 influence
- World Peace: 8,000 influence
- Mathematics: 10,000 influence
- Advanced Physics: 11,000 influence

### Space Age (Solar → Railgun)

**Location:** SpaceAgeManager.cs

**Production Chain:**
```
Solar Panels (50 influence) → Energy
Fusion (100,000 influence) → More Energy
    ↓
Space Factories → Dyson Panels (capped at 1000)
    ↓
Energy accumulates → Railgun Charge
    ↓
Railgun fires → Swarm Panels launched
```

### Simulation Prestige (Strange Matter)

**Location:** SimulationPrestigeManager.cs

**Disaster Progression:**
```
Stage 1: Meteor Storm (triggers at 1+ city)     → +1 Strange Matter
Stage 2: AI Takeover (triggers at 100+ bots)    → +10 Strange Matter
Stage 3: Global Warming (triggers at 5+ SFacs)  → +20 Strange Matter
Black Hole (manual): Converts Swarm Panels      → +swarmPanels Strange Matter
```

---

## Cross-System Dependencies

### Avocado System Integration

**Location:** AvocadoFeeder.cs, ModifierSystem.cs:568-578

The Avocado system consumes resources from ALL systems and provides a global multiplier:

```csharp
// Feeding (AvocadoFeeder.cs)
public void FeedAvocado()
{
    // Drain IP from Infinity
    prestigePlus.avocatoIP += availableIP;
    prestigeData.infinityPoints -= availableIP;

    // Drain Influence from Workers
    prestigePlus.avocatoInfluence += saveData.influence;
    saveData.influence = 0;

    // Drain Strange Matter from Dream1
    prestigePlus.avocatoStrangeMatter += saveDataPrestige.strangeMatter;
    saveDataPrestige.strangeMatter = 0;
}

// Multiplier calculation (ModifierSystem.cs)
public static double GlobalBuff()
{
    double multi = 1f;
    if (!prestigePlus.avocatoPurchased) return multi;

    if (prestigePlus.avocatoIP >= 10)
        multi *= Math.Log10(prestigePlus.avocatoIP);
    if (prestigePlus.avocatoInfluence >= 10)
        multi *= Math.Log10(prestigePlus.avocatoInfluence);
    if (prestigePlus.avocatoStrangeMatter >= 10)
        multi *= Math.Log10(prestigePlus.avocatoStrangeMatter);
    if (prestigePlus.avocatoOverflow >= 1)
        multi *= 1 + prestigePlus.avocatoOverflow;

    return multi;
}
```

### Secret Buffs to Infinity

**Location:** ModifierSystem.cs lines 122-200

Secrets provide multipliers to Infinity facilities via fallthrough switch:
```csharp
switch (secretsOfTheUniverse)
{
    case 27: AiMulti = 42;      // Max tier
    case 26: AiMulti = 3;
    case 25: CashMulti = 8;
    case 24: AiMulti = 2.5;
    // ... continues down to case 1
}
```

---

## Identified Issues

### Critical Issues

#### 1. Naming Confusion - "Influence" Used for Two Things

| Current Name | Actual Purpose | System |
|--------------|----------------|--------|
| `PrestigePlus.influence` | Speed upgrade level | Quantum |
| `SaveData.influence` | Currency balance | Reality |

**Impact:** Developers confuse level vs currency, leading to bugs.

**Fix:** Rename to `influenceSpeedLevel` and `influenceBalance`.

#### 2. Naming Confusion - "PrestigePlus" Unclear

The name "PrestigePlus" doesn't indicate what it is. Should be "QuantumData" or "QuantumLeapData".

#### 3. Off-by-One Bug in Offline Progress

**Location:** InceptionController.cs:69-71

```csharp
// BUG: This always adds 0!
oracle.saveSettings.saveData.workersReadyToGo = 128;  // Clamps first
oracle.saveSettings.saveData.universesConsumed +=
    128 - oracle.saveSettings.saveData.workersReadyToGo;  // 128 - 128 = 0
```

**Fix:** Calculate overflow before clamping.

### High Priority Issues

#### 4. Magic Numbers (19+ occurrences)

| Value | Meaning | Occurrences |
|-------|---------|-------------|
| 128 | Worker batch size | 11 places |
| 42 | IP to Quantum conversion | 6 places |
| 27 | Secrets unlock threshold | 7 places |
| 4 | Base worker gen speed | 1 place |

#### 5. Tight Oracle Coupling

All 6+ Reality files use `using static Expansion.Oracle;` and directly access `oracle.saveSettings.*`.

#### 6. Hardcoded Upgrade Costs

PrestigePlusUpdater.cs lines 44-53 has all costs as local constants.

### Medium Priority Issues

#### 7. File Name "InceptionController" Unclear

The file only handles worker generation and influence gathering. Should be renamed.

#### 8. Duplicate Logic

- Worker fill calculation (`workersReadyToGo / 128f`) in 2 places
- Secrets >= 27 check in 5 places
- Secrets dual-storage update logic

#### 9. Typo in SaveDataPrestige

Oracle.cs:3523: `workerBoostAcivator` missing 't'

---

## Refactoring Phases

### Phase Overview

| Phase | Focus | Scope | Risk | Breaks Saves? |
|-------|-------|-------|------|---------------|
| 1 | Extract Constants | Low | Low | No |
| 2 | Create Services | Medium | Medium | No |
| 3 | Rename Data Classes | High | Medium | Yes (migration) |
| 4 | Rename Files | Medium | Low | No |
| 5 | Consolidate UI Logic | Low | Low | No |
| 6 | Data-Driven Upgrades | High | Medium | No |

### Phase 1: Extract Constants

**Goal:** Replace all magic numbers with named constants.

**New Files:**
- `Assets/Scripts/Systems/Quantum/QuantumConstants.cs`
- `Assets/Scripts/Systems/Reality/RealityConstants.cs`

```csharp
namespace IdleDysonSwarm.Systems.Quantum
{
    public static class QuantumConstants
    {
        public const int IPToQuantumConversion = 42;
        public const int SecretsPerPurchase = 3;
        public const int MaxSecrets = 27;

        // Upgrade Costs
        public const int AutomationCost = 1;
        public const int BreakTheLoopCost = 6;
        public const int QuantumEntanglementCost = 12;
        public const int AvocatoCost = 42;
        public const int FragmentCost = 2;
        public const int PurityCost = 3;
        public const int TerraCost = 2;
        public const int PowerCost = 2;
        public const int ParagadeCost = 1;
        public const int StellarCost = 4;

        // Multipliers
        public const float CashBonusPerPoint = 0.05f;
        public const float ScienceBonusPerPoint = 0.05f;
        public const int InfluenceSpeedPerLevel = 4;
    }
}

namespace IdleDysonSwarm.Systems.Reality
{
    public static class RealityConstants
    {
        // Worker System
        public const int WorkerBatchSize = 128;
        public const int BaseWorkerGenerationSpeed = 4;

        // Avocado Thresholds
        public const int AvocadoLogThreshold = 10;
    }
}
```

**Files to Update:**
- InceptionController.cs (128, 4)
- RealityPanelManager.cs (27)
- ToRealityFillbar.cs (42)
- PrestigePlusUpdater.cs (all costs, 42, 27)
- AvocadoFeeder.cs (10)
- ModifierSystem.cs (10)

### Phase 2: Create Services

**Goal:** Decouple from Oracle singleton, enable testing.

**New Files:**
- `Assets/Scripts/Services/IQuantumService.cs`
- `Assets/Scripts/Services/QuantumService.cs`
- `Assets/Scripts/Services/IWorkerService.cs`
- `Assets/Scripts/Services/WorkerService.cs`

```csharp
namespace IdleDysonSwarm.Services
{
    public interface IQuantumService
    {
        // State
        long QuantumPoints { get; }
        long AvailablePoints { get; }
        long SpentPoints { get; }
        long InfluenceSpeedLevel { get; }
        long PermanentSecrets { get; }
        bool IsQuantumEntanglementUnlocked { get; }
        bool IsAvocadoUnlocked { get; }

        // Calculations
        int GetUpgradeCost(QuantumUpgradeType upgrade);
        bool CanAfford(QuantumUpgradeType upgrade);

        // Actions
        bool TryPurchaseUpgrade(QuantumUpgradeType upgrade);
        void PerformQuantumLeap();

        // Events
        event Action<QuantumUpgradeType> OnUpgradePurchased;
        event Action<long> OnQuantumLeap;
    }

    public interface IWorkerService
    {
        // State
        long WorkersReady { get; }
        long InfluenceBalance { get; }
        long WorkerBatchesProcessed { get; }
        bool AutoGatherEnabled { get; set; }

        // Calculations
        float WorkerGenerationSpeed { get; }
        float WorkerFillPercent { get; }
        bool CanGather { get; }

        // Actions
        bool TryGatherInfluence();
        void ApplyOfflineProgress(double seconds);

        // Events
        event Action<long> OnInfluenceGathered;
    }
}
```

### Phase 3: Rename Data Classes

**Goal:** Clear, unambiguous names for data structures.

**Requires Save Migration** using `[JsonProperty]` attributes.

| Current Class | New Class | Location |
|---------------|-----------|----------|
| `PrestigePlus` | `QuantumData` | Oracle.cs |
| `SaveData` | `WorkerData` | Oracle.cs |

| Current Field | New Field | Class |
|---------------|-----------|-------|
| `PrestigePlus.influence` | `QuantumData.influenceSpeedLevel` | QuantumData |
| `SaveData.influence` | `WorkerData.influenceBalance` | WorkerData |
| `SaveData.universesConsumed` | `WorkerData.workerBatchesProcessed` | WorkerData |
| `SaveData.workerAutoConvert` | `WorkerData.autoGatherInfluence` | WorkerData |

**Migration Pattern:**
```csharp
[Serializable]
public class QuantumData
{
    [JsonProperty("points")]
    public long points;

    [JsonProperty("influence")]  // Old name for compatibility
    public long influenceSpeedLevel;

    // ... etc
}
```

### Phase 4: Rename Files

**Goal:** File names match their purpose.

| Current File | New File | Reason |
|--------------|----------|--------|
| InceptionController.cs | WorkerController.cs | Handles workers & influence |
| PrestigePlusUpdater.cs | QuantumUpgradeUI.cs | Quantum upgrade purchase UI |
| ToRealityFillbar.cs | QuantumProgressBar.cs | Shows IP→Quantum progress |

**Editor Script Required:** Update scene/prefab references.

### Phase 5: Consolidate UI Logic

**Goal:** Remove duplication, use services.

- Replace duplicate `workersReadyToGo / 128f` with `IWorkerService.WorkerFillPercent`
- Replace duplicate `secrets >= 27` checks with `IQuantumService.IsRealityUnlocked`
- Create ScriptableConditions for panel visibility

### Phase 6: Data-Driven Upgrades (Optional)

**Goal:** Move upgrade definitions to ScriptableObjects.

This is a larger undertaking that could be part of a broader data-driven overhaul. Defer until after core refactor is stable.

---

## Editor Scripts Required

### 1. Reference Updater Tool

**Purpose:** Update scene/prefab references when files are renamed.

**Location:** `Assets/Editor/ReferenceUpdaterTool.cs`

```csharp
namespace IdleDysonSwarm.Editor
{
    public static class ReferenceUpdaterTool
    {
        [MenuItem("Tools/Idle Dyson Swarm/Quantum-Reality Refactor/Update Scene References")]
        public static void UpdateSceneReferences()
        {
            // Find all GameObjects referencing renamed scripts
            // Update component references
            // Save scenes
        }

        [MenuItem("Tools/Idle Dyson Swarm/Quantum-Reality Refactor/Update Prefab References")]
        public static void UpdatePrefabReferences()
        {
            // Find all prefabs with renamed components
            // Update references
            // Save prefabs
        }
    }
}
```

### 2. Constant Migration Validator

**Purpose:** Verify all magic numbers have been replaced.

**Location:** `Assets/Editor/ConstantMigrationValidator.cs`

```csharp
namespace IdleDysonSwarm.Editor
{
    public static class ConstantMigrationValidator
    {
        [MenuItem("Tools/Idle Dyson Swarm/Quantum-Reality Refactor/Validate Constants")]
        public static void ValidateConstants()
        {
            // Scan all .cs files in target directories
            // Flag any remaining magic numbers (128, 42, 27, 4)
            // Report results
        }
    }
}
```

### 3. Save Compatibility Tester

**Purpose:** Test that old saves load correctly after migration.

**Location:** `Assets/Editor/SaveCompatibilityTester.cs`

```csharp
namespace IdleDysonSwarm.Editor
{
    public static class SaveCompatibilityTester
    {
        [MenuItem("Tools/Idle Dyson Swarm/Quantum-Reality Refactor/Test Save Compatibility")]
        public static void TestSaveCompatibility()
        {
            // Load test save files
            // Verify all fields populated correctly
            // Report any data loss
        }
    }
}
```

### 4. Service Registration Validator

**Purpose:** Ensure all new services are registered.

**Location:** `Assets/Editor/ServiceRegistrationValidator.cs`

```csharp
namespace IdleDysonSwarm.Editor
{
    public static class ServiceRegistrationValidator
    {
        [MenuItem("Tools/Idle Dyson Swarm/Quantum-Reality Refactor/Validate Services")]
        public static void ValidateServices()
        {
            // Check ServiceProvider registers all required services
            // Verify no circular dependencies
            // Report missing registrations
        }
    }
}
```

---

## Testing Strategy

### Unit Tests

| Test Suite | Coverage |
|------------|----------|
| QuantumServiceTests | Upgrade purchases, cost calculations, quantum leap |
| WorkerServiceTests | Worker generation, influence gathering, offline progress |
| ConstantsTests | All constants have expected values |

### Integration Tests

| Test | Coverage |
|------|----------|
| SaveMigrationTests | Old saves load with new field names |
| CrossSystemTests | Quantum → Worker → Influence → Dream1 flow |

### Manual Testing Checklist

#### Quantum Leap System
- [ ] Fresh game: No Quantum tab visible initially
- [ ] Earn 42 IP: Can perform manual Quantum Leap
- [ ] Purchase Quantum Entanglement: Auto-leap works at 42 IP
- [ ] Purchase all upgrade types
- [ ] Verify Secrets adds to both storages
- [ ] Verify Division cost scales exponentially

#### Reality System - Workers
- [ ] Worker generation starts at 4/sec
- [ ] Purchase Influence upgrade: Speed increases by 4
- [ ] Workers accumulate to 128
- [ ] Manual gather: Influence increases by 128
- [ ] Enable auto-gather: Works automatically
- [ ] Offline progress: Workers/influence accumulate while away

#### Reality System - Dream1
- [ ] Purchase Hunters with Influence
- [ ] Purchase Gatherers with Influence
- [ ] Community production starts
- [ ] Full production chain to Cities
- [ ] Research unlocks work
- [ ] Disasters trigger at thresholds
- [ ] Strange Matter earned on prestige

#### Save Compatibility
- [ ] Load pre-refactor save file
- [ ] All Quantum upgrades preserved
- [ ] All Worker progress preserved
- [ ] All Dream1 progress preserved
- [ ] Save new game, reload, verify

---

## Risk Assessment

### Low Risk
- **Phase 1 (Constants):** Pure refactor, no behavior change
- **Phase 5 (UI Consolidation):** Cosmetic changes only

### Medium Risk
- **Phase 2 (Services):** Significant restructure, but uses established project patterns
- **Phase 4 (File Renames):** Requires editor script to fix references
- **Phase 6 (Data-Driven):** Complex but isolated

### High Risk
- **Phase 3 (Data Renames):** Requires save migration, potential for data loss

### Mitigation Strategies

1. **Feature branch per phase** - Easy rollback if issues found
2. **Save backup before testing** - Protect user data
3. **JSON aliases** - Bidirectional save compatibility
4. **Editor scripts** - Automate reference updates, reduce manual errors
5. **Comprehensive testing** - Manual + automated coverage

---

## Implementation Order

### Recommended Sequence

```
Phase 1 (Constants)          [Low risk, foundation]
         ↓
    Bug Fixes                [Critical correctness]
         ↓
Phase 2 (Services)           [Enables testing]
         ↓
Phase 4 (File Renames)       [With editor script]
         ↓
Phase 5 (UI Consolidation)   [Quick wins]
         ↓
Phase 3 (Data Renames)       [Requires migration]
         ↓
Phase 6 (Data-Driven)        [Optional, larger scope]
```

### Dependencies

- Phase 2 depends on Phase 1 (services use constants)
- Phase 3 depends on Phase 2 (services abstract data access)
- Phase 4 can happen anytime after Phase 1
- Phase 5 depends on Phase 2 (uses service properties)
- Phase 6 depends on all previous phases

---

## Appendix A: Complete File List

### Files to Modify

| File | Phases | Changes |
|------|--------|---------|
| Oracle.cs | 3 | Rename PrestigePlus→QuantumData, SaveData→WorkerData |
| InceptionController.cs | 1,2,4 | Constants, service injection, rename to WorkerController |
| PrestigePlusUpdater.cs | 1,2,4 | Constants, service injection, rename to QuantumUpgradeUI |
| RealityPanelManager.cs | 1,2,5 | Constants, service injection, conditions |
| ToRealityFillbar.cs | 1,2,4 | Constants, service injection, rename to QuantumProgressBar |
| AvocadoFeeder.cs | 1,2 | Constants, service injection |
| ModifierSystem.cs | 1 | Constants for Avocado threshold |
| PrestigeThresholdCondition.cs | 3 | Update enum names |
| WorkerCountCondition.cs | 2 | Service injection |

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| QuantumConstants.cs | 1 | Quantum system constants |
| RealityConstants.cs | 1 | Reality system constants |
| IQuantumService.cs | 2 | Quantum service interface |
| QuantumService.cs | 2 | Quantum service implementation |
| IWorkerService.cs | 2 | Worker service interface |
| WorkerService.cs | 2 | Worker service implementation |
| ReferenceUpdaterTool.cs | 4 | Editor: Update references |
| ConstantMigrationValidator.cs | 1 | Editor: Validate constants |
| SaveCompatibilityTester.cs | 3 | Editor: Test save migration |
| ServiceRegistrationValidator.cs | 2 | Editor: Validate services |

---

## Appendix B: Magic Number Locations

### 128 - Worker Batch Size (11 occurrences)

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

### 42 - IP to Quantum Conversion (6 occurrences)

| File | Line | Context |
|------|------|---------|
| ToRealityFillbar.cs | 19 | `/ 42f` |
| ToRealityFillbar.cs | 21 | `< 42` |
| ToRealityFillbar.cs | 24 | `>= 42` |
| PrestigePlusUpdater.cs | 46 | `avocatoCost = 42` |
| PrestigePlusUpdater.cs | 104 | `/ 42f` |
| PrestigePlusUpdater.cs | 105 | `"42 IP"` |
| Oracle.cs | 2876 | `/ 42f` |

### 27 - Secrets Unlock Threshold (7 occurrences)

| File | Line | Context |
|------|------|---------|
| RealityPanelManager.cs | 70 | `>= 27` |
| RealityPanelManager.cs | 102 | `/ 27` |
| PrestigePlusUpdater.cs | 69 | `>= 27` |
| PrestigePlusUpdater.cs | 129 | `< 27` |
| PrestigePlusUpdater.cs | 167 | `>= 27` |
| PrestigePlusUpdater.cs | 168 | `>= 27` |
| PrestigePlusUpdater.cs | 171 | `>= 27` |

### 4 - Base Worker Generation Speed (1 occurrence)

| File | Line | Context |
|------|------|---------|
| InceptionController.cs | 26 | `= 4 +` |

### 10 - Avocado Log Threshold (3 occurrences)

| File | Line | Context |
|------|------|---------|
| AvocadoFeeder.cs | ~69 | `>= 10` |
| ModifierSystem.cs | 570 | `>= 10` |
| ModifierSystem.cs | 572 | `>= 10` |
| ModifierSystem.cs | 574 | `>= 10` |

---

**Document Status:** Planning Complete - Ready for Phase 1 Implementation
**Next Step:** User approval → Begin Phase 1 (Extract Constants)
