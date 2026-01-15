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

This refactor addresses **three distinct but interconnected systems** that have been conflated in the codebase:

### 1. Quantum Leap System (Currently: "PrestigePlus")
- Converts 42 Infinity Points → 1 Quantum Point
- Quantum Points purchase upgrades affecting Infinity mechanics
- Includes: Automation, Double IP, Secrets (permanent), Avocado unlock, etc.

### 2. Reality System - Universe/Influence (Currently: "Reality" Tab 1)
- Worker generation → Influence currency
- Feeds into Dream1 economy and Avocado

### 3. Reality System - Dream1 Simulation (Currently: "Reality" Tab 2)
- **Foundational Era:** Hunters, Gatherers → Community → Housing → Villages → Cities
- **Information Era:** Factories → Bots → Rockets → Space Factories
- **Space Age:** Solar/Fusion → Energy → Railgun → Swarm Panels
- **Prestige:** Disasters → Strange Matter → Counter Measures

The systems are connected: Quantum Points → Influence Speed → Influence Currency → Dream1 Resources

### Offline Time System (DoubleTime)
Reality/Dream1 has an offline time accumulation system:
- Offline seconds accumulate into `sdPrestige.doubleTime`
- Player controls consumption speed via slider (`doubleTimeRate`)
- When active, all Dream1 production is multiplied by `(doubleTimeRate + 1)`
- This is a **manual boost system**, not automatic offline simulation

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
│         (SaveData → InfluenceSystemData, InceptionController)                   │
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
│      (AvocadoData)          │       │    (SaveDataDream1, SaveDataPrestige)│
│   Cross-System Aggregator   │       │                                      │
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
│  Unlocked via: 42 Quantum   │       │                                      │
└─────────────────────────────┘       │  Prestige: Disasters → Strange Matter│
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

#### Avocado System (Cross-System Aggregator)
| File | Path | Purpose |
|------|------|---------|
| Oracle.cs | `Expansion/` | `AvocadoData` class (NEW - extracted from PrestigePlus) |
| AvocadoFeeder.cs | `Systems/Avocado/` | Feeds IP, Influence, Strange Matter into Avocado |
| ModifierSystem.cs | `Systems/` | Calculates GlobalBuff from Avocado accumulators |

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
    public bool avocatoPurchased;    // Cost: 42 - Unlocks Avocado system (MOVE TO: AvocadoData)

    // Fragment System (DysonVerse upgrades, cost varies)
    public bool fragments;  // 2
    public bool purity;     // 3
    public bool terra;      // 2
    public bool power;      // 2
    public bool paragade;   // 1
    public bool stellar;    // 4

    // EXTRACT TO: AvocadoData (cross-system aggregator)
    // public double avocatoIP;
    // public double avocatoInfluence;
    // public double avocatoStrangeMatter;
    // public double avocatoOverflow;
}
```

### New Data Structure: AvocadoData

**Extracted from:** `PrestigePlus` (currently nested in QuantumData)

Avocado is a cross-system aggregator that consumes resources from Infinity, Reality, and Dream1 to produce a global multiplier. It deserves its own data structure.

```csharp
[Serializable]
public class AvocadoData
{
    // Unlock State (migrated from PrestigePlus.avocatoPurchased)
    public bool unlocked;

    // Accumulated Resources (fed from multiple systems)
    public double infinityPoints;      // Fed from DysonVersePrestigeData
    public double influence;           // Fed from InfluenceSystemData
    public double strangeMatter;       // Fed from Dream1 (SaveDataPrestige)
    public double overflowMultiplier;  // Bonus multiplier

    // Calculated at runtime (not saved)
    // GlobalBuff = Log10(IP) × Log10(Influence) × Log10(StrangeMatter) × (1 + Overflow)
}
```

**Migration Required:** Fields move from `PrestigePlus` to new `AvocadoData`:

| Old Location | New Location |
|--------------|--------------|
| `prestigePlus.avocatoPurchased` | `avocadoData.unlocked` |
| `prestigePlus.avocatoIP` | `avocadoData.infinityPoints` |
| `prestigePlus.avocatoInfluence` | `avocadoData.influence` |
| `prestigePlus.avocatoStrangeMatter` | `avocadoData.strangeMatter` |
| `prestigePlus.avocatoOverflow` | `avocadoData.overflowMultiplier` |

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

### Data Structure: SaveData → InfluenceSystemData

**Current Location:** Oracle.cs lines 3453-3465

```csharp
[Serializable]
public class SaveData  // RENAME TO: InfluenceSystemData
{
    // Worker Generation (produces influence)
    public long workersReadyToGo;      // Current batch (0-128)
    public long universesConsumed;     // Counter for Universe Designation display
    public bool workerAutoConvert;     // RENAME: autoGatherInfluence

    // Influence Currency
    public long influence;             // RENAME: influenceBalance (currency)

    // Dream1 Purchase Multipliers (spend influence)
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

**Location:** SimulationPrestigeManager.cs, ResearchManager.cs

**Disaster Stage System:**

The disaster system uses `disasterStage` to track progression. Players must **purchase counter measures** with Strange Matter to advance to harder challenges:

| Stage | Disaster | Trigger | Reward | Counter to Advance |
|-------|----------|---------|--------|-------------------|
| 0/1 | Meteor Storm | 1+ city | +1 SM | counterMeteor (4 SM) |
| 2 | AI Takeover | 100+ bots | +10 SM | counterAi (42 SM) |
| 3 | Global Warming | 5+ space factories | +20 SM | counterGw (128 SM) |
| 42 | Complete | N/A | N/A | Unlocks Black Hole |

**Key Mechanic:** Counter measures don't prevent disasters - they unlock harder challenges with better rewards.

**Black Hole (Manual Prestige):**
- Available after purchasing all counter measures (stage 42)
- Converts Swarm Panels → Strange Matter (1:1)
- Requires player to manually trigger

**Double Wipe Workaround:**

SimulationPrestigeManager.cs:81-86 calls `WipeDream1Save()` twice with a frame delay:
```csharp
private IEnumerator WipeForPrestige()
{
    oracle.WipeDream1Save();
    yield return 0;
    oracle.WipeDream1Save();  // Second wipe catches timer state leakage
    ApplyResearch?.Invoke();
}
```

This is an **intentional workaround** for timer state synchronization. Local `xxxTime` fields on MonoBehaviours persist across prestige, and during the frame between wipes, `Update()` methods can reconstruct partial data from stale timer values. The second wipe ensures clean state.

**Proper fix (future):** Either save timer states in `SaveDataDream1` so the wipe clears them, or explicitly reset all timer fields on prestige.

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

#### 3. Minor Bug in Offline Progress (Edge Case)

**Location:** InceptionController.cs:69-71

```csharp
// BUG: In offline progress with autoConvert=false, overflow calculation is wrong
oracle.saveSettings.saveData.workersReadyToGo = 128;  // Clamps first
oracle.saveSettings.saveData.universesConsumed +=
    128 - oracle.saveSettings.saveData.workersReadyToGo;  // 128 - 128 = 0
```

**Impact:** Minor - only affects offline progress when auto-convert is disabled and accumulated time exceeds 128 workers worth. Normal gameplay increments `universesConsumed` correctly in `RunWorkers()` (line 108).

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

## Dream1 System Issues

### Bug: SpaceAgeManager Fill Bar Wrong Variable

**Location:** SpaceAgeManager.cs:148-149

```csharp
factoriesFillBar.fillAmount =
    (float)StaticMethods.FillBar(sd1.cities, _factoriesDuration, multi, _factoriesTime);
factoriesFillText.text = StaticMethods.TimerText(sd1.cities, _factoriesDuration, multi, _factoriesTime);
```

**Issue:** Uses `sd1.cities` instead of `sd1.spaceFactories`. The fill bar checks `buildings > 0` to determine if progress should display, so this shows incorrect progress for Space Factory production.

**Fix:** Change `sd1.cities` to `sd1.spaceFactories` on both lines.

### Code Smell: Railgun Firing Condition Confusing

**Location:** SpaceAgeManager.cs:188-191

```csharp
if (sd1.railgunCharge >= sd1.railgunMaxCharge && sd1.dysonPanels >=
    (oracle.saveSettings.sdPrestige.doubleTimeRate >= 1 && sdp.doDoubleTime
        ? 10 * oracle.saveSettings.sdPrestige.doubleTimeRate
        : 10) && !_firing)
```

**Issue:** The nested ternary with `doubleTimeRate >= 1` check separate from `doDoubleTime` is confusing and error-prone.

**Proposed Fix:** Extract to named method:
```csharp
private int GetDysonPanelsRequiredToFire()
{
    const int basePanelsRequired = 10;
    if (!sdp.doDoubleTime || sdp.doubleTimeRate < 1)
        return basePanelsRequired;
    return basePanelsRequired * (int)sdp.doubleTimeRate;
}
```

### Architecture: Production Timer Pattern Duplicated 13+ Times

**Locations:** FoundationalEraManager.cs, InformationEraManager.cs, SpaceAgeManager.cs

Every production building uses the same pattern:
```csharp
double multi = 1 + (sd1.xxx > 0 ? Math.Log10(sd1.xxx) : 0);
if (sp.doDoubleTime) multi *= sp.doubleTimeRate + 1;
// optional boosts
if (sd1.xxx >= 1) xxxTime += Time.deltaTime * (float)multi;
while (xxxTime >= xxxDuration)
{
    xxxTime -= xxxDuration;
    // produce something
}
```

**Impact:** ~300+ lines of duplicated code across three managers.

**Fix:** Extract to reusable `ProductionTimer` utility class (Phase 7).

### Architecture: Timer State Not Saved

**Issue:** Local `xxxTime` fields (hunterTime, gatherTime, communityTime, housingTime, villagesTime, workersTime, citiesTime, factoriesTime, botsTime, _factoriesTime, _fireTime) are MonoBehaviour instance fields, NOT saved to `SaveDataDream1`.

**Impact:**
- Progress towards next production tick is lost on save/quit
- Causes the double-wipe workaround necessity in prestige

**Fix:** Add timer fields to `SaveDataDream1` so they persist (Phase 7).

### Architecture: Research Manager Pattern Duplicated 6 Times

**Location:** InformationEraManager.cs

Engineering, Shipping, WorldTrade, WorldPeace, Mathematics, AdvancedPhysics all use near-identical:
- Button click handler
- Manager method with progress tracking
- UI update logic

**Fix:** Create data-driven research system with ScriptableObjects (Phase 6 or later).

### Design Note: Bots Soft-Start Ramp-Up (NOT A BUG)

**Location:** InformationEraManager.cs:390

```csharp
if (sd1.bots < 100) multi *= sd1.bots / 100;
```

This is **intentional design** creating a soft-start for rocket production:
- Early bots feel impactful ("more bots = faster rockets")
- Diminishing returns as you approach 100
- After 100, Log10 scaling takes over naturally

This creates smooth game feel rather than a cliff at 100. NOT a bug.

---

## Refactoring Phases

### Phase Overview

| Phase | Focus | Scope | Risk | Breaks Saves? |
|-------|-------|-------|------|---------------|
| 0 | Bug Fixes | Low | Low | No |
| 1 | Extract Constants | Low | Low | No |
| 2 | Create Services | Medium | Medium | No |
| 3 | Rename Data Classes | High | Medium | Yes (migration) |
| 4 | Rename Files | Medium | Low | No |
| 5 | Consolidate UI Logic | Low | Low | No |
| 6 | Data-Driven Upgrades | High | Medium | No |
| 7 | Dream1 Architecture | High | Medium | Yes (timer save) |

### Phase 0: Bug Fixes

**Goal:** Fix confirmed bugs before refactoring.

**Bug 1: SpaceAgeManager Fill Bar**

**File:** SpaceAgeManager.cs:148-149

**Current:**
```csharp
factoriesFillBar.fillAmount =
    (float)StaticMethods.FillBar(sd1.cities, _factoriesDuration, multi, _factoriesTime);
factoriesFillText.text = StaticMethods.TimerText(sd1.cities, _factoriesDuration, multi, _factoriesTime);
```

**Fixed:**
```csharp
factoriesFillBar.fillAmount =
    (float)StaticMethods.FillBar(sd1.spaceFactories, _factoriesDuration, multi, _factoriesTime);
factoriesFillText.text = StaticMethods.TimerText(sd1.spaceFactories, _factoriesDuration, multi, _factoriesTime);
```

**Bug 2: Railgun Firing Condition Cleanup**

**File:** SpaceAgeManager.cs:188-196

Extract confusing condition to named method:
```csharp
private int GetDysonPanelsRequiredToFire()
{
    const int basePanelsRequired = 10;
    if (!sdp.doDoubleTime || sdp.doubleTimeRate < 1)
        return basePanelsRequired;
    return basePanelsRequired * (int)sdp.doubleTimeRate;
}

// In RailgunManagement():
int panelsRequired = GetDysonPanelsRequiredToFire();
if (sd1.railgunCharge >= sd1.railgunMaxCharge &&
    sd1.dysonPanels >= panelsRequired &&
    !_firing)
{
    // ...
}
```

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

namespace IdleDysonSwarm.Systems.Dream1
{
    public static class Dream1Constants
    {
        // Foundational Era
        public const int HunterCost = 100;
        public const int GathererCost = 100;
        public const int HousingToVillageRatio = 10;
        public const int VillageToCityRatio = 25;

        // Production Durations (seconds)
        public const float HunterDuration = 3f;
        public const float GathererDuration = 3f;
        public const float CommunityDuration = 3f;
        public const float HousingDuration = 20f;
        public const float VillageDuration = 12f;
        public const float WorkerDuration = 4f;
        public const float CityDuration = 3f;
        public const float FactoryDuration = 30f;
        public const float BotDuration = 20f;
        public const float SpaceFactoryDuration = 2f;

        // Information Era Research Costs
        public const int EngineeringCost = 1000;
        public const int ShippingCost = 5000;
        public const int WorldTradeCost = 7000;
        public const int WorldPeaceCost = 8000;
        public const int MathematicsCost = 10000;
        public const int AdvancedPhysicsCost = 11000;

        // Space Age
        public const int SolarCost = 50;
        public const int FusionCost = 100000;
        public const int RailgunMaxCharge = 25000000;
        public const int RailgunBasePanelsRequired = 10;
        public const int DysonPanelCap = 1000;
        public const int RocketsPerSpaceFactory = 10;

        // Disaster Counter Measure Costs (Strange Matter)
        public const int CounterMeteorCost = 4;
        public const int CounterAiCost = 42;
        public const int CounterGwCost = 128;

        // Bots Soft-Start Threshold (intentional design)
        public const int BotsSoftStartThreshold = 100;
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

    public interface IAvocadoService
    {
        // State
        bool IsUnlocked { get; }
        double AccumulatedIP { get; }
        double AccumulatedInfluence { get; }
        double AccumulatedStrangeMatter { get; }
        double OverflowMultiplier { get; }

        // Calculations
        double GlobalBuff { get; }
        bool HasMinimumIP { get; }         // >= 10 for log calculation
        bool HasMinimumInfluence { get; }  // >= 10 for log calculation
        bool HasMinimumStrangeMatter { get; }  // >= 10 for log calculation

        // Actions
        void FeedIP(double amount);
        void FeedInfluence(long amount);
        void FeedStrangeMatter(double amount);
        void AddOverflow(double amount);

        // Events
        event Action<double> OnGlobalBuffChanged;
        event Action OnFed;
    }
}
```

### Phase 3: Rename Data Classes & Extract AvocadoData

**Goal:** Clear, unambiguous names for data structures; extract cross-system Avocado data.

**Requires Save Migration** using `[JsonProperty]` attributes and a migration script.

#### Class Renames

| Current Class | New Class | Location |
|---------------|-----------|----------|
| `PrestigePlus` | `QuantumData` | Oracle.cs |
| `SaveData` | `InfluenceSystemData` | Oracle.cs |
| *(new)* | `AvocadoData` | Oracle.cs |

#### Field Renames

| Current Field | New Field | Class |
|---------------|-----------|-------|
| `PrestigePlus.influence` | `QuantumData.influenceSpeedLevel` | QuantumData |
| `SaveData.influence` | `InfluenceSystemData.influenceBalance` | InfluenceSystemData |
| `SaveData.workerAutoConvert` | `InfluenceSystemData.autoGatherInfluence` | InfluenceSystemData |

#### Avocado Extraction (Requires Migration Script)

| Current Field | New Field | New Class |
|---------------|-----------|-----------|
| `PrestigePlus.avocatoPurchased` | `AvocadoData.unlocked` | AvocadoData |
| `PrestigePlus.avocatoIP` | `AvocadoData.infinityPoints` | AvocadoData |
| `PrestigePlus.avocatoInfluence` | `AvocadoData.influence` | AvocadoData |
| `PrestigePlus.avocatoStrangeMatter` | `AvocadoData.strangeMatter` | AvocadoData |
| `PrestigePlus.avocatoOverflow` | `AvocadoData.overflowMultiplier` | AvocadoData |

**Migration Script Required:** `AvocadoDataMigration.cs`

This migration must:
1. Check if old `prestigePlus.avocato*` fields exist in save
2. Copy values to new `avocadoData.*` fields
3. Preserve all accumulated progress (IP, Influence, Strange Matter, Overflow)
4. Migrate `avocatoPurchased` → `unlocked`

```csharp
// Migration example (Version 5)
public class AvocadoDataMigration : IMigration
{
    public int Version => 5;

    public void Migrate(SaveDataSettings settings)
    {
        // Create new AvocadoData if not exists
        settings.avocadoData ??= new AvocadoData();

        // Migrate from old PrestigePlus fields
        var pp = settings.prestigePlus;
        settings.avocadoData.unlocked = pp.avocatoPurchased;
        settings.avocadoData.infinityPoints = pp.avocatoIP;
        settings.avocadoData.influence = pp.avocatoInfluence;
        settings.avocadoData.strangeMatter = pp.avocatoStrangeMatter;
        settings.avocadoData.overflowMultiplier = pp.avocatoOverflow;

        // Zero out old fields (optional, for cleanliness)
        pp.avocatoIP = 0;
        pp.avocatoInfluence = 0;
        pp.avocatoStrangeMatter = 0;
        pp.avocatoOverflow = 0;
    }
}
```

**JSON Compatibility:** For backwards compatibility with saves created before migration:

```csharp
[Serializable]
public class QuantumData
{
    [JsonProperty("points")]
    public long points;

    [JsonProperty("influence")]  // Old name for compatibility
    public long influenceSpeedLevel;

    // Legacy fields - kept for loading old saves, migration copies to AvocadoData
    [JsonProperty("avocatoPurchased")]
    [Obsolete("Use AvocadoData.unlocked - migrated in v5")]
    public bool _legacyAvocatoPurchased;

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

### Phase 7: Dream1 Architecture Improvements

**Goal:** Reduce code duplication and improve state management in Dream1 system.

#### 7.1 Extract ProductionTimer Utility

Create reusable production timer class:

**New File:** `Assets/Scripts/Systems/Dream1/ProductionTimer.cs`

```csharp
namespace IdleDysonSwarm.Systems.Dream1
{
    [Serializable]
    public class ProductionTimer
    {
        public double currentTime;
        public double duration;

        /// <summary>
        /// Updates timer and returns number of items produced.
        /// </summary>
        public int Update(double sourceCount, double baseMultiplier, float deltaTime)
        {
            if (sourceCount < 1) return 0;

            double multi = 1 + Math.Log10(sourceCount);
            multi *= baseMultiplier;

            currentTime += deltaTime * multi;

            int produced = 0;
            while (currentTime >= duration)
            {
                currentTime -= duration;
                produced++;
            }
            return produced;
        }

        public float FillAmount => (float)(currentTime / duration);
        public float TimeRemaining(double multi) => (float)((duration - currentTime) / multi);
    }
}
```

#### 7.2 Save Timer State

Add timer fields to `SaveDataDream1`:

```csharp
// Add to SaveDataDream1
public ProductionTimer hunterTimer = new() { duration = 3 };
public ProductionTimer gathererTimer = new() { duration = 3 };
public ProductionTimer communityTimer = new() { duration = 3 };
public ProductionTimer housingTimer = new() { duration = 20 };
public ProductionTimer villagesTimer = new() { duration = 12 };
public ProductionTimer workersTimer = new() { duration = 4 };
public ProductionTimer citiesTimer = new() { duration = 3 };
public ProductionTimer factoriesTimer = new() { duration = 30 };
public ProductionTimer botsTimer = new() { duration = 20 };
public ProductionTimer spaceFactoriesTimer = new() { duration = 2 };
```

**Benefits:**
- Timer progress persists across save/quit
- Eliminates need for double-wipe workaround in prestige
- Reduces code duplication significantly

#### 7.3 Research System Data-Driven (Optional)

Create research definition ScriptableObject:

```csharp
[CreateAssetMenu(fileName = "NewResearch", menuName = "Dream1/Research Definition")]
public class Dream1ResearchDefinition : ScriptableObject
{
    public string displayName;
    public long influenceCost;
    public float researchDuration;
    public Dream1ResearchDefinition[] prerequisites;
    public UnityEvent onComplete;
}
```

This would allow moving all 6 research definitions out of code and into assets.

**Note:** Phase 7 requires careful save migration since timer state structure changes.

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
Phase 0 (Bug Fixes)          [Critical correctness - do first]
         ↓
Phase 1 (Constants)          [Low risk, foundation]
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
         ↓
Phase 7 (Dream1 Architecture) [Timer state, code dedup]
```

### Dependencies

- Phase 0 has no dependencies (pure bug fixes)
- Phase 2 depends on Phase 1 (services use constants)
- Phase 3 depends on Phase 2 (services abstract data access)
- Phase 4 can happen anytime after Phase 1
- Phase 5 depends on Phase 2 (uses service properties)
- Phase 6 depends on all previous phases
- Phase 7 can be done independently but benefits from Phase 1 constants

---

## Appendix A: Complete File List

### Files to Modify

| File | Phases | Changes |
|------|--------|---------|
| Oracle.cs | 3,7 | Rename PrestigePlus→QuantumData, SaveData→InfluenceSystemData, Extract AvocadoData, Add timer fields |
| InceptionController.cs | 1,2,4 | Constants, service injection, rename to WorkerController |
| PrestigePlusUpdater.cs | 1,2,4 | Constants, service injection, rename to QuantumUpgradeUI |
| RealityPanelManager.cs | 1,2,5 | Constants, service injection, conditions |
| ToRealityFillbar.cs | 1,2,4 | Constants, service injection, rename to QuantumProgressBar |
| AvocadoFeeder.cs | 1,2,3 | Constants, service injection, use AvocadoData |
| ModifierSystem.cs | 1,3 | Constants for Avocado threshold, use AvocadoData |
| PrestigeThresholdCondition.cs | 3 | Update enum names |
| WorkerCountCondition.cs | 2 | Service injection |
| SpaceAgeManager.cs | 0,1,7 | Bug fix (fill bar), constants, ProductionTimer |
| InformationEraManager.cs | 1,7 | Constants, ProductionTimer |
| FoundationalEraManager.cs | 1,7 | Constants, ProductionTimer |
| SimulationPrestigeManager.cs | 7 | Remove double-wipe after timer state saved |
| ResearchManager.cs | 1 | Constants for counter measure costs |

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| QuantumConstants.cs | 1 | Quantum system constants |
| RealityConstants.cs | 1 | Reality system constants |
| Dream1Constants.cs | 1 | Dream1 system constants |
| AvocadoConstants.cs | 1 | Avocado system constants (Log threshold) |
| IQuantumService.cs | 2 | Quantum service interface |
| QuantumService.cs | 2 | Quantum service implementation |
| IWorkerService.cs | 2 | Worker service interface |
| WorkerService.cs | 2 | Worker service implementation |
| IAvocadoService.cs | 2 | Avocado service interface |
| AvocadoService.cs | 2 | Avocado service implementation |
| AvocadoDataMigration.cs | 3 | Migration: Extract AvocadoData from PrestigePlus |
| ReferenceUpdaterTool.cs | 4 | Editor: Update references |
| ConstantMigrationValidator.cs | 1 | Editor: Validate constants |
| SaveCompatibilityTester.cs | 3 | Editor: Test save migration |
| ServiceRegistrationValidator.cs | 2 | Editor: Validate services |
| ProductionTimer.cs | 7 | Reusable production timer utility |
| Dream1TimerMigration.cs | 7 | Migration: Add timer state to SaveDataDream1 |

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

### Dream1 Magic Numbers

#### Production Durations
| Value | Meaning | File | Line |
|-------|---------|------|------|
| 3 | Hunter/Gatherer/Community/City duration | FoundationalEraManager.cs | 16,24,34,60 |
| 20 | Housing duration | FoundationalEraManager.cs | 41 |
| 12 | Village duration | FoundationalEraManager.cs | 48 |
| 4 | Worker duration | FoundationalEraManager.cs | 54 |
| 30 | Factory duration | InformationEraManager.cs | 160 |
| 20 | Bot duration | InformationEraManager.cs | 166 |
| 2 | Space Factory duration | SpaceAgeManager.cs | 71 |

#### Ratios and Thresholds
| Value | Meaning | File | Line |
|-------|---------|------|------|
| 10 | Housing → Village ratio | FoundationalEraManager.cs | 97 |
| 25 | Village → City ratio | FoundationalEraManager.cs | 111 |
| 10 | Rockets → Space Factory | InformationEraManager.cs | ~419 |
| 100 | Bots soft-start threshold | InformationEraManager.cs | 390 |
| 1000 | Dyson Panel inventory cap | SpaceAgeManager.cs | 143,157 |
| 25000000 | Railgun max charge | Oracle.cs (SaveDataDream1) |

#### Counter Measure Costs (Strange Matter)
| Value | Meaning | File | Line |
|-------|---------|------|------|
| 4 | Counter Meteor cost | ResearchManager.cs | ~20 |
| 42 | Counter AI cost | ResearchManager.cs | ~21 |
| 128 | Counter Global Warming cost | ResearchManager.cs | ~22 |

---

**Document Status:** Planning Complete - Ready for Phase 0 Implementation
**Next Step:** User approval → Begin Phase 0 (Bug Fixes)
