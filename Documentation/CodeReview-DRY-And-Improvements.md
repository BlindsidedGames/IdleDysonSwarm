# Code Review: DRY Opportunities, Suggested Fixes & Potential Bugs

**Date:** 2026-02-10
**Scope:** Full codebase review focused on code reduction while preserving gameplay behavior.

---

## Table of Contents

1. [Repeated Patterns & DRY Opportunities](#1-repeated-patterns--dry-opportunities)
2. [Helper Class Candidates](#2-helper-class-candidates)
3. [Potential Bugs](#3-potential-bugs)
4. [Suggested Fixes & Improvements](#4-suggested-fixes--improvements)
5. [Dead Code & Unused References](#5-dead-code--unused-references)
6. [Performance Concerns](#6-performance-concerns)

---

## 1. Repeated Patterns & DRY Opportunities

### 1.1 BuyMode Switch Statements (6 files, ~120 lines duplicated)

The same BuyMode switch logic (Buy1/Buy10/Buy50/Buy100/BuyMax with rounded bulk buy) is copy-pasted across 6 files:

| File | Lines |
|------|-------|
| `Buildings/Building.cs` | 103-131 |
| `Buildings/BuildingsOverlord.cs` | 50-85 |
| `Buildings/MegaStructurePresenter.cs` | 349-368 |
| `Buildings/BuyXSettings.cs` | 27-47 |
| `Research/ResearchPresenter.cs` | 309-335 |
| `Research/ResearchBuyXSettings.cs` | 27-47 |

### 1.2 BuyMultiple.cs Duplicates CalcUtils.cs (entire file redundant)

`Incremental/BuyMultiple.cs` (23 lines) contains two methods that are exact formula duplicates:
- `BuyMultiple.BuyX()` = `CalcUtils.BuyXCost()` (exponential cost formula)
- `BuyMultiple.MaxAffordable()` = `CalcUtils.MaxAffordable()` (logarithmic max-buy formula)

`BuyMultiple.cs` can be deleted entirely; all callers should use `CalcUtils`.

### 1.3 BuyXSettings vs ResearchBuyXSettings (near-identical classes)

`Buildings/BuyXSettings.cs` and `Research/ResearchBuyXSettings.cs` are character-for-character identical except for saving to `oracle.saveSettings.buyMode` vs `oracle.saveSettings.researchBuyMode`. Should be a single parameterized class.

### 1.4 OfflineProgressSystem Loop/Remainder Duplication (~70 lines)

In `Systems/OfflineProgressSystem.cs`, the loop body (lines 117-198) is copy-pasted as remainder processing (lines 201-273). The only difference is using `60` vs `remainder` as the time step. Should extract a `ProcessTimeStep(double seconds, ...)` method.

### 1.5 CalcUtils Internal Duplication (FormatNumber / FormatEnergy)

`CalcUtils.FormatNumber()` (lines 120-196) and `CalcUtils.FormatEnergy()` (lines 218-257) share ~30 lines of identical mantissa/exponent calculation logic. Should extract a shared `FormatMantissaExponent()` helper.

### 1.6 Facility Count Summing `[0] + [1]` (26+ occurrences)

The pattern `facilityArray[0] + facilityArray[1]` to get total facility count appears 26+ times across:
- `Buildings/BotPanelManager.cs` (8+ occurrences)
- `Buildings/FacilityBuildingPresenter.cs`
- `Buildings/MegaStructurePresenter.cs`
- `Services/MegaStructureService.cs`
- `Systems/Facilities/FacilityLegacyBridge.cs` (5+ occurrences)
- `Data/Conditions/FacilityCountCondition.cs`

### 1.7 Era Manager Duplication (3 files, 700-900 lines reducible)

`FoundationalEraManager.cs` (535 lines), `InformationEraManager.cs` (803 lines), and `SpaceAgeManager.cs` (548 lines) share massive amounts of duplicated logic:

**Identical methods across all 3:**
- `GetGlobalMultiplier()` — same one-liner in all 3 files
- `SyncTimerProgress()` — same structural pattern
- Info update debounce logic (10Hz timer)
- Panel configuration blocks (24 total across 3 files)
- Button listener setup (16 blocks)
- Button interactable updates (14 blocks)
- `Update()` lifecycle structure

**InformationEraManager-specific:**
- 6 nearly identical linear research managers (Engineering, Shipping, WorldTrade, WorldPeace, Mathematics, AdvancedPhysics) — lines 205-429, ~120 lines of copy-paste. Each one is 5 identical lines: check active+complete, calc multiplier with doubleTime, increment progress, check completion.

**Across all 3 managers:**
- 19 production management methods following identical pattern
- 30+ `UpdateXxxInfoDescription()` methods with same structure
- 62 paired fill bar + timer text updates
- ~750 lines duplicated (~40% of total codebase across the 3 files)

### 1.8 Avocado Bonus Check (6 occurrences)

The condition `skillTreeData.avocados && infinityData.facilityField[1] >= 69` is hardcoded 6 times in `FacilityLegacyBridge.cs` and `EffectConditionEvaluator.cs`.

### 1.9 Multiplier Pipeline Repetition (5 identical blocks)

In `FacilityModifierPipeline.cs`, the same 3-line multiplier addition pattern (`AddInfinityMultiplier`, `AddSecretMultiplier`, `AddAvocatoMultiplier`) is copy-pasted 5 times for each facility type.

### 1.10 Terra Threshold Methods (5 identical methods)

`FacilityModifierPipeline.cs` has 5 nearly identical `GetXxxTerraAmount()` methods (lines 390-443) that differ only in which skill flag and facility field is used.

### 1.11 Infinity Upgrade Purchase Pattern (9+ repetitions)

In `InfinityManager.cs` (lines 260-321), the pattern `prestigeData.spentInfinityPoints += cost; prestigeData.someFlag = true;` is repeated 9 times. Similarly `QuantumUpgradeUI.cs` repeats 15+ purchase methods.

### 1.12 Hardcoded Color Tags Instead of UIThemeProvider

Several files use hardcoded hex color strings instead of the existing `UIThemeProvider`:
- `OfflineProgressSystem.cs` — `"<color=#91DD8F>"`, `"<color=#00E1FF>"`
- `OfflineTimeManager.cs` — `"<color=#00E1FF>"`
- `QuantumUpgradeUI.cs` — `"<color=#FFA45E>"`, `"<color=#91DD8F>"`
- `FacilityBreakdownPopup.cs` — `"<color=#FFA45E>"`, `"<color=#FF5757>"`, etc.
- `ManualBotCreation.cs` — `"<color=#00E1FF>"` (line 115), `"<color=#B0B0B0>"` (lines 112, 120)
- `AvocadoFeeder.cs` — `"<color=#00E1FF>"` (lines 74-79)
- `InfinityManager.cs` — `"<color=#FFA45E>"`, `"<color=#91DD8F>"` (line 71)

### 1.13 ApplyBuildingReferences Duplicated

`Building.cs:151-160` and `MegaStructurePresenter.cs:374-383` have identical `ApplyBuildingReferences()` implementations.

### 1.14 ProductionText Display Pattern Duplicated

`FacilityBuildingPresenter.cs` and `MegaStructurePresenter.cs` both implement the same "Producing X /s" vs "1 unit /Ys vs /Ymin" branching logic for production rate display.

### 1.15 Research Level Lookup (3 implementations)

The same research level lookup logic (check modern dictionary, fall back to legacy accessor) exists in:
- `ResearchEffectProvider.cs` (lines 77-103)
- `FacilityModifierPipeline.cs` (inline)
- `ResearchLevelCondition.cs` (lines 35-58)

### 1.16 Energy Multiplier Calculation in SpaceAgeManager

The expression `(sd1.mathematicsComplete ? 2 : 1) * (sdp.doDoubleTime ? sdp.doubleTimeRate + 1 : 1)` appears 2+ times in `SpaceAgeManager.cs`. Should extract to a helper.

### 1.17 ResearchManager.cs — Massive Monolithic DRY Violation (~1308 lines)

`Expansion/ResearchManager.cs` is one of the single biggest DRY violations in the codebase:

- **50+ individual panel SerializeField references** declared one per line
- **50+ readonly cost fields** declared as separate ints
- **`PurchaseTranslation()`** (lines 713-757): 8 identical switch cases doing `sp.translationN = true; skillTreeData.skillPointsTree++; sp.strangeMatter -= translationNCost;`
- **`PurchaseSpeed()`** (lines 760-805): 8 identical switch cases, same pattern
- **`PurchaseEducation()`** (lines 584-683): 19 switch cases, each setting a flag and deducting cost
- **`PurchaseFoundation()`** (lines 527-582): 10 switch cases
- **`PurchaseSpaceAge()`** (lines 458-488): 5 switch cases
- **`PurchaseInformation()`** (lines 490-525): 6 switch cases
- **`ApplyResearch()`** (lines 1235-1307): 30+ nearly identical if-statements reapplying all upgrades
- **`UpdateAndEnableResearches()`** (lines 1103-1199): Extremely long boolean expressions for visibility
- **`InitializeUpgradePanels()`** (lines 822-1101): 50+ identical SetPanelText calls
- **Button listener setup** (lines 365-446): 50+ near-identical AddListener lines

This entire file screams for data-driven design — upgrade definitions in arrays/ScriptableObjects.

### 1.18 GameManager.cs ManageGoal() — 10 Near-Identical Switch Cases (~240 lines)

`Systems/GameManager.cs` ManageGoal() (lines 377-608) has 10 goal cases with identical structure:
```
goal.text = $"{color}Goal: ...";
SetSkillsFill((float)(...));
if (...) {
    infinityData.goalSetter = X;
    skillTreeData.skillPointsTree += 1;
    AssignSkills?.Invoke();
    UpdateSkills?.Invoke();
    if (skillsFillBar != null) skillsFillBar.SetActive(true);
}
```
Should use a goal configuration array/ScriptableObject to reduce to a loop.

### 1.19 Oracle.cs Debug Comparison Methods (~350 lines duplicated)

5 debug comparison methods (lines 386-655, 1841-1918) follow identical structure:
- `DebugCompareAssemblyLineProduction()`
- `DebugCompareAiManagerProduction()`
- `DebugCompareServerProduction()`
- `DebugCompareDataCenterProduction()`
- `DebugComparePlanetProduction()`

All follow the same pattern: check registry, build runtime, calculate legacy values, compare. Plus 10 pointless wrapper methods that just call the actual method with `null`.

### 1.20 Oracle.cs Duplicate Prestige Methods (~25 lines)

`DysonInfinity()` (lines 2539-2575) and `ManualDysonInfinity()` (lines 2577-2607) share 90% of their code — both reset skills, create new InfinityData, set initial counts, etc.

### 1.21 Oracle.cs Preset Loading/Saving (4 identical switch blocks)

Lines 2410-2462 and 2833-2900 contain 4 switch blocks with 5 cases each that just access different preset fields. Should use an array of preset data.

### 1.22 Oracle.cs ArtifactSkillPoints() — 22 Lines of Repetitive Conditionals

Lines 2661-2685 repeat `if (sp.translationX) points++` pattern 22 times. Should loop over an array.

### 1.23 Oracle.cs Settings Flags Packing (84 lines)

`BuildSettingsFlags()` (lines 117-163, 42 `SetFlag` calls) and `ApplySettingsFlags()` (lines 166-210, 42 `GetFlag` calls) are massive lists of repetitive bit operations.

### 1.24 Panel Manager Pattern (3 files, identical structure)

`PrestigePanelManager.cs` (125 lines), `InfinityPanelManager.cs` (150 lines), and `RealityPanelManager.cs` (160 lines) all have identical:
- Field declarations
- `CacheComponents()` method
- `UpdatePanel()` lifecycle
- `HandleFirstRun()` method

Should extract `PanelManagerBase<TData>` base class.

### 1.25 QuantumUpgradeUI.cs — 17 Identical Purchase Methods

Lines 258-304: Each purchase method follows same pattern: check cost, update button text, set flag, deduct points. 17 methods x ~5 lines each = ~85 lines that could be 1 generic method.

### 1.26 Database Pattern Duplication (4 files, ~110 lines)

`FacilityDatabase.cs`, `SkillDatabase.cs`, `ResearchDatabase.cs`, `EffectDatabase.cs` all share identical `_byId` dictionary, `OnEnable()`, `TryGet()`, and `BuildLookup()` logic.

### 1.27 Skill Tree Helper Duplication (3 files)

`AreRequirementsMet()` and `HasExclusiveOwned()` are implemented identically in:
- `SkillTreeManager.cs`
- `SkillsAutoAssignment.cs`
- `LineManager.cs`

### 1.28 Save/Load Candidate Selection Duplication (2 files)

`SaveLoadCandidateSelector.cs` and `LegacyEs3Save.cs` both implement:
- `TryParseInvariantUtc()` — identical timestamp parsing
- `IsBetterCandidate()` / `IsBetter()` — identical comparison logic
- `TryDelete` / `TryArchive` — identical file operations

### 1.29 InfinityManager.cs Secret Text — 27-Case Switch (~145 lines)

Lines 108-252: Reveals secret text one character at a time via massive switch. Should be replaced with substring logic: `SecretFull.Substring(0, revealed).PadRight(SecretFull.Length, '-')`.

### 1.30 StoryManager.cs — Every-Frame SetActive Calls (~40 lines)

`Systems/StoryManager.cs` Update() (lines 57-100) calls `SetActive()` on 30+ GameObjects every single frame. Many share the same condition (e.g., lines 89-94 all use `realityUnlocked`). Should cache conditions and only call SetActive when changed.

### 1.31 BotsAutoBuy.cs — Rotated Purchase Order (5 cases)

Lines 23-70: 5 switch cases with the same 5 purchase calls in rotated order. Could be simplified with array-based round-robin rotation.

### 1.32 Save Data Accessor Chains (106 occurrences across 29 files)

The pattern `oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData` is declared as a property in 29 different files. While each property is a one-liner, they all repeat the same long chain.

### 1.33 FacilityArrayNormalizer — 8 Nearly Identical Blocks

`Systems/Save/FacilityArrayNormalizer.cs` (lines 23-50) repeats `EnsureFacilityArray()` + `MergeSparseIntoArray()` for 8 facility types.

### 1.34 Oracle.cs Repeated Skill Checks

The conditional pattern `if (skillTreeData.avocados && infinityData.FACILITY[1] >= 69) *= 2; if (skillTreeData.superchargedPower) *= 1.5f;` appears 10+ times across production calculation methods.

---

## 2. Helper Class Candidates

### 2.1 `BuyModeCalculator` (Priority: CRITICAL)

Centralizes the 6 identical BuyMode switch statements into one utility.

```
static int CalculateNumberToBuy(BuyMode mode, double currentCount, int maxAffordable, bool roundedBulkBuy)
```

**Eliminates:** ~100 lines across 6 files

### 2.2 `EraManager` Base Class (Priority: HIGH)

Template method base class for the 3 era managers with shared:
- Save data accessors (`sd1`, `sd`, `sp`)
- `GetGlobalMultiplier()`
- `ConfigurePanel(panel, type, title)`
- `SetupButtonListener(panel, callback)`
- `SetButtonInteractable(panel, cost)`
- `UpdateTimerDisplay(panel, count, duration, effectiveMulti, timerProgress)`
- `UpdatePanelCountTitle(panel, name, count)`
- Info description debounce logic
- `Update()` lifecycle with `abstract UpdateDomainLogic()`

**Eliminates:** ~200-300 lines across 3 files

### 2.3 `LinearResearchManager` (Priority: HIGH)

Generic handler for the 6 identical linear research state machines in `InformationEraManager.cs`.

```
void UpdateResearchPanel(panel, isComplete, isActive, progress, maxTime, cost, name)
void TickResearch(ref progress, maxTime, ref complete, isActive, globalMulti)
```

**Eliminates:** ~120 lines in InformationEraManager

### 2.4 `ProcessTimeStep` in OfflineProgressSystem (Priority: HIGH)

Extract the duplicated loop body / remainder logic into:

```
static void ProcessTimeStep(double seconds, OfflineProgressContext context, ref Accumulators acc)
```

**Eliminates:** ~70 lines

### 2.5 `UITextFormatter` (Priority: MEDIUM)

Centralized color+number wrapping utility:

```
static string ColorText(string text, string colorTag) => $"{colorTag}{text}</color>"
static string ColorBlue(string text) / ColorGreen / ColorOrange
static string FormatNumberColored(double value, string colorTag)
```

**Eliminates:** Repeated `$"{colorTag}{value}</color>"` in 10+ locations

### 2.6 `GetTotalFacilityCount()` Extension/Helper (Priority: MEDIUM)

Add to `FacilityCountAccessor` or `IFacilityService`:

```
double GetTotalCount(string facilityId) => counts[0] + counts[1]
```

**Eliminates:** 26+ inline `[0] + [1]` additions

### 2.7 `ApplyStandardMultipliers()` in FacilityModifierPipeline (Priority: MEDIUM)

Consolidate the 5 identical 3-line multiplier blocks:

```
static void ApplyStandardMultipliers(effects, statId, prestigeData, secrets, prestigePlus)
```

**Eliminates:** ~30 lines

### 2.8 `HasAvocadoBonus()` Helper (Priority: LOW)

```
static bool HasAvocadoBonus(SkillTreeData std, double manualCount) => std.avocados && manualCount >= 69
```

**Eliminates:** 6 identical conditionals

### 2.9 `ApplyInfinityUpgrade()` in InfinityManager (Priority: MEDIUM)

```
void ApplyInfinityUpgrade(int cost, Action<PrestigeData> upgrade)
```

**Eliminates:** 9 repeated blocks in InfinityManager, potentially 15+ in QuantumUpgradeUI

### 2.10 `ResearchLevelResolver` (Priority: MEDIUM)

Single utility for research level lookup with modern-dictionary-then-legacy-fallback:

```
static double GetResearchLevel(InfinityData data, string researchId)
```

**Eliminates:** 3 duplicate implementations

### 2.11 `ResearchUpgradeData` ScriptableObject (Priority: HIGH)

Data-driven replacement for the massive ResearchManager.cs. Define each research upgrade as a ScriptableObject entry with: id, cost, category, prerequisite, effect. Then ResearchManager becomes a generic loop over the data.

**Eliminates:** ~800-1000 lines in ResearchManager.cs

### 2.12 `GoalConfiguration` Array/ScriptableObject (Priority: MEDIUM)

Replace GameManager.cs ManageGoal() 10-case switch with a goal config array containing threshold, display text, reward, fill bar formula.

**Eliminates:** ~200 lines in GameManager.cs

### 2.13 `SkillRequirementHelper` (Priority: LOW)

Move `AreRequirementsMet()` and `HasExclusiveOwned()` to a shared static helper class.

**Eliminates:** ~30 lines across 3 files

### 2.14 `PanelManagerBase<TData>` (Priority: MEDIUM)

Base class for Prestige/Infinity/Reality panel managers with generic SetReferences(), CacheComponents(), HandleFirstRun().

**Eliminates:** ~100 lines across 3 files

### 2.15 `DatabaseBase<TDefinition>` (Priority: LOW)

Generic base for FacilityDatabase, SkillDatabase, ResearchDatabase, EffectDatabase.

**Eliminates:** ~80 lines across 4 files

### 2.16 `SaveFileUtility` (Priority: LOW)

Shared file operations (TryDelete, TryArchive, TryParseTimestamp, IsBetterCandidate) for save system.

**Eliminates:** ~60 lines across 2 files

---

## 3. Potential Bugs

### 3.1 CRITICAL Severity

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 1 | `Systems/GameManager.cs` | 858 | **Division by zero**: `ipPerSec = lastInfinityPointsGained / timeLastInfinity` — guard checks `lastInfinityPointsGained > 0` but doesn't verify `timeLastInfinity > 0`. |
| 2 | `User Interface/PrestigeFillBar.cs` | 80-81 | **Double multiplication bug**: `ipToGain *= oracle.saveSettings.doubleIp ? 2 : 1;` then `ipToGain *= prestigePlus.doubleIP ? 2 : 1;` — multiplies by 4 if both are true. Note different casing: `doubleIp` vs `doubleIP` — may be two separate flags or a naming inconsistency. |
| 3 | `NewsTicker/NewsGetter.cs` | 17 | **Typo**: `"application/jason"` should be `"application/json"`. API requests may fail or return unexpected data. |

### 3.2 HIGH Severity

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 4 | `User Interface/AutoBotsToggles.cs` | 13-17 | Array access `_toggles[0]` through `_toggles[4]` without null/bounds check. If array is undersized in Inspector, throws `IndexOutOfRangeException`. |
| 5 | `User Interface/RectAdjuster.cs` | 29 | `GetComponent<RectTransform>()` result used without null check — `.sizeDelta.y` on null throws `NullReferenceException`. |
| 6 | `User Interface/DebugOptions.cs` | 152 | `SidePanelManager.InfinityToggle.GetComponentInChildren<MenuToggleController>().Toggle(false)` — no null check on any part of this chain. |
| 7 | `User Interface/RealityPanelManager.cs` | 110 | `_workerService.IsRealityUnlocked` — no null check on `_workerService`. If Awake() fails to resolve service, this crashes. |
| 8 | `Systems/GameManager.cs` | 253 | `skillTreeConfirmationManager.CloseConfirm()` — no null check before invocation. |
| 9 | `Expansion/Dream1/InformationEraManager.cs` | 744 | **Type cast mismatch**: Boost deduction uses `(int)sd1.factoriesBoostCost` while research deductions use `(long)`. If cost exceeds int.MaxValue (~2.1B), the int cast silently truncates. |

### 3.3 MEDIUM Severity

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 10 | `Buildings/FacilityBuildingPresenter.cs` | 75,86,101,112 | `GetFacilityCount()` result accessed at index `[0]`/`[1]` without length validation. |
| 11 | `SkillTreeStuff/SkillTreeManager.cs` | 72-78 | Event subscriptions in `OnEnable()` — verify matching unsubscriptions in `OnDisable()` to prevent listener accumulation (memory leak). |
| 12 | `Systems/OfflineProgressSystem.cs` | 77 | `CalculateAwayValues()` coroutine modifies game state but has no tracking mechanism. If called multiple times before completion, state becomes inconsistent. |
| 13 | `Blindsided/Utilities/CameraMover.cs` | 42,79+ | `Camera.main` used without null check. Returns null if no "MainCamera" tagged camera exists. |
| 14 | `User Interface/MinMaxGridLayout.cs` | 161 | `rowOffsets[row]` access when `useChildHeight` is true — potential `IndexOutOfRangeException` if row arrays aren't properly sized. |
| 15 | `Systems/Facilities/FacilityPresenter.cs` | 20 | `buttonTransform.GetComponent<Button>()` result may be null; used later without verification. |
| 16 | `Expansion/SimulationPrestigeManager.cs` | 44 | `case 0 or 1:` — both disaster stages trigger same meteor storm handler. Stage 1 may need different behavior (verify intentional). |
| 17 | `Expansion/SimulationPrestigeManager.cs` | 34 | `(int)sd1.swarmPanels` — cast could overflow for very large panel counts. |
| 18 | `Expansion/SimulationPrestigeManager.cs` | 80 | `StartCoroutine(WipeForPrestige())` — no stored reference; if called multiple times, multiple wipes could overlap. |
| 19 | `Buildings/BotsAutoBuy.cs` | 23-70 | `while (anyAutoBuy)` loop in Update() could be an infinite loop if purchases always succeed. |
| 20 | `Expansion/Oracle.cs` | 2585-2589 | `int ipToGain` from large double division — potential integer overflow. Then multiplied by 2 without overflow check. |
| 21 | `Expansion/Oracle.cs` | 321 | Typo: `"application/jason"` should be `"application/json"` (same as NewsGetter.cs). |

### 3.4 LOW-MEDIUM Severity

| # | File | Line(s) | Issue |
|---|------|---------|-------|
| 22 | `Systems/Stats/StatCalculator.cs` | 86 | `Math.Pow()` in `StatOperation.Power` case can overflow to `double.PositiveInfinity` or `NaN`. No overflow guard. |
| 23 | `Systems/GameManager.cs` | 449-592 | Casting large double values to float for SetSkillsFill can lose precision, causing UI progress bar jitter. |
| 24 | `Systems/GameManager.cs` | 718,728 | `if (saveSeconds < 0) saveSeconds = 0;` — guards prevent crash but negative times indicate deeper time handling issues. |

---

## 4. Suggested Fixes & Improvements

### 4.1 Delete `BuyMultiple.cs` Entirely

File: `Incremental/BuyMultiple.cs` (23 lines)

Both methods are exact duplicates of `CalcUtils.BuyXCost()` and `CalcUtils.MaxAffordable()`. Update `BuildingsOverlord.cs` (the only caller) to use `CalcUtils` directly, then delete `BuyMultiple.cs`.

### 4.2 Merge `BuyXSettings` and `ResearchBuyXSettings`

These two 59-line files are identical except for one save property. Merge into a single class with a `Func<SaveDataSettings, BuyMode>` getter/setter parameter, or use an enum to select which buy mode property to target.

### 4.3 Migrate Hardcoded Colors to UIThemeProvider

Replace all hardcoded hex color tags with `UIThemeProvider` properties (which already exist and provide the same colors):
- `"<color=#FFA45E>"` -> `UIThemeProvider.TextColourOrange`
- `"<color=#00E1FF>"` -> `UIThemeProvider.TextColourBlue`
- `"<color=#91DD8F>"` -> `UIThemeProvider.TextColourGreen`
- `"<color=#FF5757>"` -> `UIThemeProvider.TextColourRed`

Files to update: `OfflineProgressSystem.cs`, `OfflineTimeManager.cs`, `QuantumUpgradeUI.cs`, `FacilityBreakdownPopup.cs`, `ManualBotCreation.cs`, `AvocadoFeeder.cs`, `InfinityManager.cs`

### 4.4 Extract `ProcessTimeStep()` in OfflineProgressSystem

Replace the duplicated loop body (lines 117-198) and remainder section (lines 201-273) with a single method call, passing `60` or `remainder` as the time parameter.

### 4.5 Introduce EraManager Base Class

Create `EraManager` base class with shared lifecycle, utility methods, and abstract hooks. Each of the 3 era managers subclasses it, implementing only their unique domain logic. Estimated code reduction: 200-300 lines.

### 4.6 Centralize Research Level Lookup

Create `ResearchLevelResolver.GetResearchLevel()` to replace 3 duplicate implementations that all check modern dictionary then fall back to legacy accessor.

### 4.7 FacilityCountCondition Refactor

Replace the hardcoded switch statement in `FacilityCountCondition.cs` (lines 46-71) with a call to `FacilityCountAccessor.TryGetCount()`, which already handles the same mapping.

### 4.8 Data-Drive ResearchManager.cs

Replace the ~1300-line monolith with:
1. ScriptableObject array defining each upgrade (id, cost, category, prerequisite, effect flag)
2. Generic purchase method iterating over definitions
3. Generic panel initialization from definitions
4. Generic ApplyResearch from definitions

Estimated reduction: 800-1000 lines.

### 4.9 Replace InfinityManager Secret Text Switch

Replace 27-case switch (145 lines) with:
```
string full = "Love, Family, and Incrementals";
int revealed = Mathf.Min(secretsOfTheUniverse, full.Length);
secretText.text = $"The meaning of life is: {full.Substring(0, revealed).PadRight(full.Length, '-')}";
```

### 4.10 Consolidate Avocado Calculation

`AvocadoService.GlobalBuff` and `FacilityModifierPipeline.AddAvocatoMultiplier` implement identical Log10 multiplication logic. Move to a single shared method to prevent divergence.

### 4.11 Eliminate Dual Cost Paths in QuantumService

`QuantumService.cs` has both database-driven and fallback constant cost paths. Choose one source of truth to prevent silent divergence.

### 4.12 Move DeductFacilityCost to FacilityService

`MegaStructureService.DeductFacilityCost()` (lines 243-259) is facility management logic embedded in a purchasing service. Move to `FacilityService` where it belongs.

### 4.13 Fix "application/jason" Typo

Two files have this typo:
- `NewsTicker/NewsGetter.cs:17`
- `Expansion/Oracle.cs:321`

Change to `"application/json"`.

### 4.14 Gate StoryManager SetActive Calls

`StoryManager.cs` Update() calls SetActive on 30+ GameObjects every frame. Cache previous states and only call SetActive when the condition actually changes.

---

## 5. Dead Code & Unused References

### 5.1 Unused Classes

| File | Issue |
|------|-------|
| `Systems/ProductsFetched.cs` | Empty MonoBehaviour class with no implementation, never referenced anywhere. **Delete entirely.** |

### 5.2 Large Commented-Out Code Blocks

| File | Lines | Description |
|------|-------|-------------|
| `Blindsided/Utilities/MainTabController.cs` | 9-125 | 126 lines of commented-out Button references, SetTab, SetSavedTab, and UI logic. |
| `Blindsided/Utilities/TabRememberer.cs` | 16-39 | 24 lines of commented-out SetTab method. |
| `Buildings/BotsAutoBuy.cs` | 74-89 | 16 lines of commented-out AutoBotsGroup coroutine using old API. |
| `Systems/GameManager.cs` | 298-314 | 17 lines of commented-out SubmitHighScores method. |
| `User Interface/CanvasController.cs` | 56-67 | 12 lines of commented-out device orientation block. |
| `Systems/GameManager.cs` | 774, 841 | Commented-out text UI assignments (`planetProductionText`, `pocketDimensionsText`). |

### 5.3 Debug/Placeholder Statements

| File | Line | Statement |
|------|------|-----------|
| `Blindsided/Utilities/CalcUtils.cs` | 457 | `Debug.Log("lolNope");` — placeholder in error handler |
| `Blindsided/Utilities/MainTabController.cs` | 97, 122 | `Debug.Log("NoTab");` — placeholder in default cases |
| `Blindsided/Utilities/TabRememberer.cs` | 36 | `Debug.Log("NoTab");` — placeholder in default case |
| `Systems/ZoomImage.cs` | 37 | `Debug.Log("scrolling");` — fires on every scroll event |
| `Expansion/LoadScreenMethods.cs` | 82 | `Debug.Log("screenshot");` — in screenshot capture |
| `Oracle.cs` | 331 | `//Debug.Log(json);` — commented-out debug |

### 5.4 Commented-Out Field Declarations

| File | Line(s) | Description |
|------|---------|-------------|
| `Expansion/Oracle.cs` | 96 | Commented-out `skillAutoAssignmentList` field |
| `User Interface/PrestigeFillBar.cs` | 19-20 | Commented-out `manualInfinityButton` SerializeFields |
| `User Interface/CanvasController.cs` | 13 | Commented-out FPS counter SerializeField |

### 5.5 Unused Service Methods

| File | Method | Issue |
|------|--------|-------|
| `Services/GameStateService.cs` | `GetResearchLevel()`, `SetResearchLevel()` | Lines 30-37. No presenter calls these methods — vestigial from service layer creation. |

### 5.6 Oracle Dead Code

| File | Lines | Description |
|------|-------|-------------|
| `Oracle.cs` | 386-388, etc. (10 methods) | Pointless zero-argument wrapper methods that just call the actual method with `null`. |
| `Systems/GameManager.cs` | 379 | `string skillPointColor = "<color=#91DD8F>";` assigned but never used. |

---

## 6. Performance Concerns

### 6.1 GameManager.ManageGoal() — Runs Every Frame

240+ lines of string formatting and UI updates run in `Update()` every frame. Should use dirty flags or `InvokeRepeating` to reduce frequency.

### 6.2 GameManager.UpdateTextFields() — 20+ String Concatenations at 10Hz

Lines 668-870: Uses `+=` string concatenation for 20+ display strings. Should use `StringBuilder` or only update on value changes.

### 6.3 GameManager.Math.Pow() Every Frame

Line 209: `Math.Pow(10, prestigePlus.divisionsPurchased)` recalculated every frame in Update(). Should cache since divisionsPurchased rarely changes.

### 6.4 DoubleTimeManager — 8 Uncached Property Accesses Per Frame

`oracle.saveSettings.sdPrestige` accessed 8 times per Update() frame without caching to a local variable.

### 6.5 WorkerController — Per-Frame String Assignment

Line 71: `consumingText.text = "Consuming"` set every frame even when unchanged.

### 6.6 AutomationButtonEnabler — SetActive Loop Every Frame

Lines 11-15: Iterates two arrays calling SetActive() every frame even when state hasn't changed.

### 6.7 StoryManager — 30+ SetActive Calls Every Frame

Lines 57-100: Calls SetActive on 30+ GameObjects every single frame. Should cache previous state and only update on change.

### 6.8 panelsPerSec * panelLifetime — Recalculated 18+ Times

In GameManager.cs, this expression appears 18+ times across ManageGoal() and UpdateTextFields(). Should cache as `double activePanels = panelsPerSec * panelLifetime` at the start of each method.

### 6.9 AvocadoService — Double GlobalBuff Calculation on Feed

Every Feed method calculates `GlobalBuff` twice (before and after), with each calculation doing multiple Log10 operations.

---

## Summary: Estimated Code Reduction

| Category | Lines Saved | Files Affected |
|----------|-------------|----------------|
| BuyMode consolidation | ~100 | 6 |
| BuyMultiple.cs deletion | 23 | 1 deleted, 1 updated |
| BuyXSettings merge | ~59 | 2 merged to 1 |
| OfflineProgress dedup | ~70 | 1 |
| Era Manager base class | ~200-300 | 3 |
| Linear Research Manager | ~120 | 1 |
| ResearchManager.cs data-driven | ~800-1000 | 1 |
| GameManager goal config | ~200 | 1 |
| Oracle debug method consolidation | ~350 | 1 |
| Oracle prestige method merge | ~25 | 1 |
| Oracle preset switch consolidation | ~40 | 1 |
| InfinityManager secret text | ~140 | 1 |
| Panel manager base class | ~100 | 3 |
| QuantumUpgradeUI purchase methods | ~85 | 1 |
| Database base class | ~80 | 4 |
| Skill tree helpers consolidation | ~30 | 3 |
| Save system dedup | ~60 | 2 |
| FacilityArrayNormalizer | ~30 | 1 |
| Dead code removal | ~200+ | 15 |
| Smaller helpers (avocado, terra, multipliers, colors) | ~100-150 | 10+ |
| **Total estimated** | **~2,800-3,200** | **~50+** |

All changes preserve existing gameplay behavior — no game logic modifications, only structural consolidation.
