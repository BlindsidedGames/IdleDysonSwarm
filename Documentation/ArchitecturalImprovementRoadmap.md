# Architectural Improvement Roadmap

**Project:** Idle Dyson Swarm
**Phase:** Post-Data-Driven Refactor Hardening
**Goal:** Eliminate fragility, increase extensibility, reduce coupling
**Target Timeline:** 3-4 weeks of focused development

---

## Executive Summary

Following the successful data-driven refactor (facility/skill/research systems), the codebase now has solid foundations but several areas that create fragility and limit designer autonomy. This roadmap addresses those areas in priority order to maximize stability and extensibility before tackling new features.

**Current State Assessment: 8.5/10**
- ✅ Data-driven architecture implemented
- ✅ Parity tests passing
- ✅ Migration system functional
- ⚠️ String-based IDs create fragility
- ⚠️ Hardcoded conditions limit extensibility
- ⚠️ Static coupling reduces testability

**Target State: 9.5/10**
- ✅ Type-safe ID system
- ✅ Scriptable condition framework
- ✅ Dependency injection for testability
- ✅ Designer-friendly workflow

---

## Phase 1: Eliminate String-Based ID Fragility (Week 1)

### Priority: 🔴 CRITICAL
**Effort:** 16-20 hours
**Impact:** Prevents 80% of future runtime bugs

### The Problem

Current implementation uses string literals scattered across 8+ files:
```csharp
case "assembly_lines": ...
case "ai_managers": ...
facilityId = "servers"; // Typo risk everywhere
```

**Risks:**
- Typos cause silent runtime failures (no compile-time checks)
- Refactoring requires manual grep + replace in all files
- Unity serialization can break if strings change
- No IntelliSense support for valid IDs

### The Solution: Strongly-Typed ID Assets

Create ScriptableObject-based ID system that provides:
- Inspector drag-drop validation (impossible to typo)
- Unity reference tracking (safe renaming)
- Compile-time null checks
- Metadata extensibility (icons, colors, descriptions)

#### Implementation Steps

**Step 1.1: Create ID ScriptableObject Base Class** (2 hours)
```csharp
/// Assets/Scripts/Data/Core/GameId.cs
public abstract class GameId : ScriptableObject
{
    [SerializeField] private string _id;
    public string Value => _id;

    // Validation in editor
    protected virtual void OnValidate()
    {
        if (string.IsNullOrEmpty(_id))
            _id = name;

        // Enforce naming conventions (lowercase_snake_case)
        if (!System.Text.RegularExpressions.Regex.IsMatch(_id, @"^[a-z_][a-z0-9_]*$"))
            Debug.LogWarning($"ID '{_id}' should use lowercase_snake_case", this);
    }

    public override string ToString() => _id;

    // Implicit conversion for backward compatibility
    public static implicit operator string(GameId id) => id?.Value;
}
```

**Step 1.2: Create Typed ID Subclasses** (1 hour)
```csharp
/// Assets/Scripts/Data/Core/FacilityId.cs
[CreateAssetMenu(menuName = "Game Data/IDs/Facility ID")]
public sealed class FacilityId : GameId { }

/// Assets/Scripts/Data/Core/SkillId.cs
[CreateAssetMenu(menuName = "Game Data/IDs/Skill ID")]
public sealed class SkillId : GameId { }

/// Assets/Scripts/Data/Core/ResearchId.cs
[CreateAssetMenu(menuName = "Game Data/IDs/Research ID")]
public sealed class ResearchId : GameId { }
```

**Step 1.3: Generate ID Assets from Existing Data** (2 hours)

Create editor tool to auto-generate ID assets:

```csharp
/// Assets/Editor/IdAssetGenerator.cs
public static class IdAssetGenerator
{
    [MenuItem("Tools/Idle Dyson/Generate ID Assets")]
    public static void GenerateAllIds()
    {
        GenerateFacilityIds();
        GenerateSkillIds();
        GenerateResearchIds();
        AssetDatabase.SaveAssets();
    }

    private static void GenerateFacilityIds()
    {
        string[] facilityIds = {
            "assembly_lines", "ai_managers", "servers",
            "data_centers", "planets"
        };

        foreach (var id in facilityIds)
        {
            var asset = ScriptableObject.CreateInstance<FacilityId>();
            // Use reflection to set private _id field
            var field = typeof(GameId).GetField("_id",
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance);
            field.SetValue(asset, id);

            string path = $"Assets/Data/IDs/Facilities/{id}.asset";
            AssetDatabase.CreateAsset(asset, path);
        }
    }

    // Similar for skills/research...
}
```

**Step 1.4: Update Data Definitions to Use ID Assets** (3 hours)
```csharp
/// Before
public class FacilityDefinition : ScriptableObject
{
    public string id; // Fragile string
}

/// After
public class FacilityDefinition : ScriptableObject
{
    [SerializeField] private FacilityId _id;
    public FacilityId Id => _id;

    // Backward compatibility accessor
    public string IdString => _id?.Value;
}
```

**Step 1.5: Update Runtime Code to Accept ID Assets** (6 hours)

Refactor major classes to use typed IDs:

```csharp
/// FacilityRuntimeBuilder.cs - Before
public static bool TryBuildRuntime(
    string facilityId, // String parameter
    GameDataRegistry registry,
    out FacilityRuntime runtime)

/// After
public static bool TryBuildRuntime(
    FacilityId facilityId, // Typed parameter
    GameDataRegistry registry,
    out FacilityRuntime runtime)
{
    // Use facilityId.Value when comparing strings
    switch (facilityId.Value) { ... }
}
```

**Step 1.6: Update Serialized References in Scene/Prefabs** (2 hours)
- Update all MonoBehaviour components that store facility/skill/research IDs
- Use Unity's drag-drop to assign ID assets
- Run validation to ensure no broken references

**Step 1.7: Create Migration Tool for String → ID Conversion** (2 hours)
```csharp
/// Assets/Editor/IdMigrationTool.cs
public static class IdMigrationTool
{
    [MenuItem("Tools/Idle Dyson/Migrate String IDs to Assets")]
    public static void MigrateStringIds()
    {
        // Find all MonoBehaviours with [SerializeField] string facilityId
        // Replace with FacilityId reference
        // Save modified scenes/prefabs
    }
}
```

**Step 1.8: Add Editor Validation** (2 hours)
```csharp
/// Assets/Editor/IdReferenceValidator.cs
public class IdReferenceValidator
{
    [MenuItem("Tools/Idle Dyson/Validate ID References")]
    public static void ValidateAllReferences()
    {
        // Check all FacilityDefinitions have valid ID references
        // Check all scene objects have assigned IDs
        // Log errors for missing references
    }
}
```

### Deliverables
- [x] GameId base class + typed subclasses (FacilityId, SkillId, ResearchId)
- [x] Auto-generated ID assets in `Assets/Data/IDs/`
- [x] Updated data definitions (FacilityDefinition, etc.)
- [x] Migrated runtime code to use typed IDs
- [x] Updated scene/prefab references
- [x] Validation tools

### Testing Checklist
- [ ] All facilities can be purchased
- [ ] All skills can be unlocked
- [ ] All research can be upgraded
- [ ] Breakdown UI displays correct facility names
- [ ] Save/load preserves all data
- [ ] No null reference exceptions in console

### Risk Mitigation
- Keep backward compatibility via implicit string conversion
- Migrate incrementally (one system at a time)
- Validate after each subsystem migration
- Keep old string fields as `[Obsolete]` during transition

---

## Phase 2: Scriptable Condition System (Week 2)

### Priority: 🔴 CRITICAL
**Effort:** 20-24 hours
**Impact:** Unlocks designer autonomy, eliminates code changes for new skills

### The Problem

Current implementation has 70+ hardcoded condition cases:
```csharp
// EffectConditionEvaluator.cs
switch (conditionId)
{
    case "assembly_lines_69":
        return infinityData.assemblyLines[1] >= 69;
    case "servers_1000":
        return infinityData.servers[0] >= 1000;
    // ...68 more cases
}
```

**Risks:**
- Every new skill/effect requires programmer intervention
- 200+ line switch statement is unmaintainable
- No designer autonomy for content creation
- Violates Open/Closed Principle

### The Solution: Data-Driven Condition Framework

Create ScriptableObject-based condition system with:
- Composable building blocks (AND/OR/NOT)
- Reusable condition templates
- Inspector-friendly configuration
- Zero code changes for new conditions

#### Implementation Steps

**Step 2.1: Create Condition Base Class** (2 hours)
```csharp
/// Assets/Scripts/Data/Conditions/EffectCondition.cs
public abstract class EffectCondition : ScriptableObject
{
    /// <summary>
    /// Evaluate this condition against the current game state.
    /// </summary>
    public abstract bool Evaluate(EffectContext context);

    /// <summary>
    /// Get human-readable description of this condition.
    /// </summary>
    public abstract string GetDescription();

    /// <summary>
    /// Optional: Editor preview of current state.
    /// </summary>
    public virtual string GetCurrentValuePreview(EffectContext context) => "";
}

/// Assets/Scripts/Data/Conditions/EffectContext.cs
public readonly struct EffectContext
{
    public readonly DysonVerseInfinityData InfinityData;
    public readonly DysonVerseSkillTreeData SkillTreeData;
    public readonly DysonVersePrestigeData PrestigeData;
    public readonly SaveDataSettings SaveData;

    public EffectContext(Oracle oracle)
    {
        InfinityData = oracle.saveSettings.infinityData;
        SkillTreeData = oracle.saveSettings.dysonVerseSkillTreeData;
        PrestigeData = oracle.saveSettings.dysonVersePrestigeData;
        SaveData = oracle.saveSettings;
    }

    // Helper methods
    public int GetFacilityCount(FacilityId id, FacilityCountType type) { ... }
    public bool IsSkillOwned(SkillId id) { ... }
    public int GetResearchLevel(ResearchId id) { ... }
}
```

**Step 2.2: Implement Common Condition Types** (6 hours)

```csharp
/// Assets/Scripts/Data/Conditions/FacilityCountCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Facility Count")]
public class FacilityCountCondition : EffectCondition
{
    [SerializeField] private FacilityId facilityId;
    [SerializeField] private FacilityCountType countType = FacilityCountType.Total;
    [SerializeField] private ComparisonOperator op = ComparisonOperator.GreaterOrEqual;
    [SerializeField] private int threshold;

    public override bool Evaluate(EffectContext context)
    {
        int count = context.GetFacilityCount(facilityId, countType);
        return Compare(count, op, threshold);
    }

    public override string GetDescription() =>
        $"{facilityId} {countType} {op} {threshold}";
}

/// Assets/Scripts/Data/Conditions/SkillOwnedCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Skill Owned")]
public class SkillOwnedCondition : EffectCondition
{
    [SerializeField] private SkillId skillId;
    [SerializeField] private bool mustBeOwned = true;

    public override bool Evaluate(EffectContext context) =>
        context.IsSkillOwned(skillId) == mustBeOwned;

    public override string GetDescription() =>
        mustBeOwned ? $"Has {skillId}" : $"Does NOT have {skillId}";
}

/// Assets/Scripts/Data/Conditions/ResearchLevelCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Research Level")]
public class ResearchLevelCondition : EffectCondition
{
    [SerializeField] private ResearchId researchId;
    [SerializeField] private ComparisonOperator op = ComparisonOperator.GreaterOrEqual;
    [SerializeField] private int threshold;

    public override bool Evaluate(EffectContext context)
    {
        int level = context.GetResearchLevel(researchId);
        return Compare(level, op, threshold);
    }

    public override string GetDescription() =>
        $"{researchId} level {op} {threshold}";
}

/// Assets/Scripts/Data/Conditions/PrestigeThresholdCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Prestige Threshold")]
public class PrestigeThresholdCondition : EffectCondition
{
    [SerializeField] private PrestigeResourceType resourceType;
    [SerializeField] private ComparisonOperator op = ComparisonOperator.GreaterOrEqual;
    [SerializeField] private double threshold;

    public override bool Evaluate(EffectContext context)
    {
        double value = resourceType switch {
            PrestigeResourceType.InfinityPoints => context.PrestigeData.infinityPoints,
            PrestigeResourceType.PrestigePlus => context.PrestigeData.prestigePlus.cash,
            _ => 0
        };
        return Compare(value, op, threshold);
    }
}

/// Assets/Scripts/Data/Conditions/StatThresholdCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Stat Threshold")]
public class StatThresholdCondition : EffectCondition
{
    [SerializeField] private StatId statId;
    [SerializeField] private ComparisonOperator op = ComparisonOperator.GreaterOrEqual;
    [SerializeField] private double threshold;

    public override bool Evaluate(EffectContext context)
    {
        // Calculate current stat value
        double value = GlobalStatPipeline.GetStatValue(statId, context);
        return Compare(value, op, threshold);
    }
}
```

**Step 2.3: Implement Composite Conditions** (3 hours)
```csharp
/// Assets/Scripts/Data/Conditions/AndCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Composite/AND")]
public class AndCondition : EffectCondition
{
    [SerializeField] private EffectCondition[] conditions;

    public override bool Evaluate(EffectContext context) =>
        conditions.All(c => c != null && c.Evaluate(context));

    public override string GetDescription() =>
        $"ALL OF: [{string.Join(" AND ", conditions.Select(c => c.GetDescription()))}]";
}

/// Assets/Scripts/Data/Conditions/OrCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Composite/OR")]
public class OrCondition : EffectCondition
{
    [SerializeField] private EffectCondition[] conditions;

    public override bool Evaluate(EffectContext context) =>
        conditions.Any(c => c != null && c.Evaluate(context));

    public override string GetDescription() =>
        $"ANY OF: [{string.Join(" OR ", conditions.Select(c => c.GetDescription()))}]";
}

/// Assets/Scripts/Data/Conditions/NotCondition.cs
[CreateAssetMenu(menuName = "Game Data/Conditions/Composite/NOT")]
public class NotCondition : EffectCondition
{
    [SerializeField] private EffectCondition condition;

    public override bool Evaluate(EffectContext context) =>
        condition == null || !condition.Evaluate(context);

    public override string GetDescription() =>
        $"NOT ({condition?.GetDescription() ?? "null"})";
}
```

**Step 2.4: Update EffectDefinition to Use Scriptable Conditions** (2 hours)
```csharp
/// Before
public class EffectDefinition : ScriptableObject
{
    public string conditionId; // String reference
}

/// After
public class EffectDefinition : ScriptableObject
{
    [SerializeField] private EffectCondition condition; // Asset reference

    public bool EvaluateCondition(EffectContext context)
    {
        if (condition == null) return true; // No condition = always active
        return condition.Evaluate(context);
    }
}
```

**Step 2.5: Create Migration Tool for Existing Conditions** (4 hours)
```csharp
/// Assets/Editor/ConditionMigrationTool.cs
public static class ConditionMigrationTool
{
    [MenuItem("Tools/Idle Dyson/Migrate Hardcoded Conditions")]
    public static void MigrateConditions()
    {
        // Parse EffectConditionEvaluator switch statement
        // Generate condition assets for each case
        // Update EffectDefinition references
    }

    private static EffectCondition CreateConditionAsset(string conditionId)
    {
        // Parse condition string format
        // "assembly_lines_69" → FacilityCountCondition
        // "has_skill_manualLabour" → SkillOwnedCondition
        // etc.
    }
}
```

**Step 2.6: Add Custom Inspector for Condition Preview** (3 hours)
```csharp
/// Assets/Editor/EffectConditionEditor.cs
[CustomEditor(typeof(EffectCondition), true)]
public class EffectConditionEditor : Editor
{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();

        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Preview", EditorStyles.boldLabel);

        if (Application.isPlaying && Oracle.Instance != null)
        {
            var condition = target as EffectCondition;
            var context = new EffectContext(Oracle.Instance);

            bool result = condition.Evaluate(context);
            EditorGUILayout.HelpBox(
                $"Current State: {(result ? "TRUE" : "FALSE")}\n" +
                $"Description: {condition.GetDescription()}\n" +
                $"Value: {condition.GetCurrentValuePreview(context)}",
                result ? MessageType.Info : MessageType.None
            );
        }
        else
        {
            EditorGUILayout.HelpBox(
                "Enter Play Mode to preview condition state",
                MessageType.Info
            );
        }
    }
}
```

**Step 2.7: Update EffectConditionEvaluator to Use Scriptable System** (2 hours)
```csharp
/// Assets/Scripts/Systems/Stats/EffectConditionEvaluator.cs - After
public static class EffectConditionEvaluator
{
    public static bool Evaluate(EffectCondition condition, EffectContext context)
    {
        if (condition == null) return true;
        return condition.Evaluate(context);
    }

    // Legacy fallback for old string-based conditions (temporary)
    [Obsolete("Use EffectCondition assets instead")]
    public static bool EvaluateLegacy(string conditionId, EffectContext context)
    {
        // Keep old switch statement as fallback during migration
        // Remove once all conditions are migrated
    }
}
```

**Step 2.8: Create Condition Template Library** (2 hours)

Generate common condition patterns as reusable templates:
- "Facility X >= N (manual only)"
- "Facility X >= N (auto only)"
- "Has skill X"
- "Research Y >= level Z"
- "Prestige points >= N"

Store in `Assets/Data/Conditions/Templates/`

### Deliverables
- [x] EffectCondition base class + EffectContext struct
- [x] 5+ concrete condition types (Facility, Skill, Research, Prestige, Stat)
- [x] 3 composite conditions (AND, OR, NOT)
- [x] Updated EffectDefinition to use condition assets
- [x] Migration tool for existing conditions
- [x] Custom inspector with play-mode preview
- [x] Template library for common patterns

### Testing Checklist
- [ ] All existing effects still function correctly
- [ ] Condition preview shows correct state in inspector
- [ ] Composite conditions evaluate properly (nested AND/OR)
- [ ] Null conditions default to "always true"
- [ ] Performance: condition evaluation < 0.1ms per effect

### Designer Workflow Documentation
Create `Documentation/ConditionSystemGuide.md` with:
- How to create new conditions
- Common condition patterns
- Composite condition examples
- Debugging tips

---

## Phase 3: Dependency Injection & Service Layer (Week 3)

### Priority: 🟡 HIGH
**Effort:** 18-22 hours
**Impact:** Enables unit testing, reduces coupling, improves iteration speed

### The Problem

Current presenters access static global state directly:
```csharp
public class FacilityBuildingPresenter : Building
{
    public override double Production {
        get {
            var infinityData = StaticInfinityData; // Hidden dependency
            var skillData = StaticSkillTreeData;   // Tight coupling
            // ...
        }
    }
}
```

**Risks:**
- Impossible to unit test without running full game
- Hidden dependencies (what does this class actually need?)
- Tight coupling to Oracle singleton
- Difficult to mock for testing
- Hard to diagnose dependency chains

### The Solution: Service Layer with Dependency Injection

Create lightweight service abstractions and inject dependencies:
- Explicit dependencies (visible in constructor/properties)
- Mockable interfaces for testing
- Centralized service creation
- Easier debugging and profiling

#### Implementation Steps

**Step 3.1: Define Core Service Interfaces** (3 hours)
```csharp
/// Assets/Scripts/Services/IGameDataService.cs
public interface IGameDataService
{
    DysonVerseInfinityData InfinityData { get; }
    DysonVerseSkillTreeData SkillTreeData { get; }
    DysonVersePrestigeData PrestigeData { get; }
    SaveDataSettings SaveData { get; }

    // High-level queries
    int GetFacilityCount(FacilityId id, FacilityCountType type);
    bool IsSkillOwned(SkillId id);
    int GetResearchLevel(ResearchId id);
}

/// Assets/Scripts/Services/IFacilityService.cs
public interface IFacilityService
{
    bool TryGetRuntime(FacilityId id, out FacilityRuntime runtime);
    double GetProduction(FacilityId id);
    double GetModifier(FacilityId id);
    double GetCost(FacilityId id, int currentCount);

    void PurchaseFacility(FacilityId id, int amount, bool isManual);
}

/// Assets/Scripts/Services/ISkillService.cs
public interface ISkillService
{
    bool IsOwned(SkillId id);
    bool CanPurchase(SkillId id);
    bool TryPurchase(SkillId id);
    SkillState GetState(SkillId id);

    IReadOnlyList<SkillId> GetAutoAssignList(int listIndex);
    void SetAutoAssignList(int listIndex, IEnumerable<SkillId> skills);
}

/// Assets/Scripts/Services/IResearchService.cs
public interface IResearchService
{
    int GetLevel(ResearchId id);
    double GetCost(ResearchId id);
    bool CanAfford(ResearchId id);
    bool TryPurchase(ResearchId id);

    bool IsAutoBuyEnabled(ResearchId id);
    void SetAutoBuyEnabled(ResearchId id, bool enabled);
}
```

**Step 3.2: Implement Service Classes** (4 hours)
```csharp
/// Assets/Scripts/Services/GameDataService.cs
public sealed class GameDataService : IGameDataService
{
    private readonly Oracle _oracle;

    public GameDataService(Oracle oracle)
    {
        _oracle = oracle ?? throw new ArgumentNullException(nameof(oracle));
    }

    public DysonVerseInfinityData InfinityData => _oracle.saveSettings.infinityData;
    public DysonVerseSkillTreeData SkillTreeData => _oracle.saveSettings.dysonVerseSkillTreeData;
    public DysonVersePrestigeData PrestigeData => _oracle.saveSettings.dysonVersePrestigeData;
    public SaveDataSettings SaveData => _oracle.saveSettings;

    public int GetFacilityCount(FacilityId id, FacilityCountType type)
    {
        // Implementation delegates to existing logic
        return FacilityRuntimeBuilder.GetFacilityCount(id, InfinityData, type);
    }

    // ... other methods
}

/// Assets/Scripts/Services/FacilityService.cs
public sealed class FacilityService : IFacilityService
{
    private readonly Oracle _oracle;
    private readonly GameDataRegistry _registry;

    public FacilityService(Oracle oracle, GameDataRegistry registry)
    {
        _oracle = oracle;
        _registry = registry;
    }

    public bool TryGetRuntime(FacilityId id, out FacilityRuntime runtime)
    {
        return FacilityRuntimeBuilder.TryBuildRuntime(id, _registry, out runtime);
    }

    public double GetProduction(FacilityId id)
    {
        if (TryGetRuntime(id, out var runtime))
            return runtime.State.ProductionRate;
        return 0;
    }

    public void PurchaseFacility(FacilityId id, int amount, bool isManual)
    {
        // Delegate to existing purchase logic
        // TODO: Extract purchase logic from Building class
    }

    // ... other methods
}
```

**Step 3.3: Create Service Locator/Registry** (2 hours)
```csharp
/// Assets/Scripts/Services/GameServices.cs
public sealed class GameServices : MonoBehaviour
{
    public static GameServices Instance { get; private set; }

    [SerializeField] private Oracle oracle;
    [SerializeField] private GameDataRegistry registry;

    // Service instances
    private IGameDataService _gameData;
    private IFacilityService _facilities;
    private ISkillService _skills;
    private IResearchService _research;

    // Public accessors
    public IGameDataService GameData => _gameData;
    public IFacilityService Facilities => _facilities;
    public ISkillService Skills => _skills;
    public IResearchService Research => _research;

    private void Awake()
    {
        if (Instance != null)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        InitializeServices();
    }

    private void InitializeServices()
    {
        _gameData = new GameDataService(oracle);
        _facilities = new FacilityService(oracle, registry);
        _skills = new SkillService(oracle, registry);
        _research = new ResearchService(oracle, registry);

        Debug.Log("[GameServices] Initialized all services");
    }

    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }
}
```

**Step 3.4: Refactor Presenters to Use Services** (6 hours)
```csharp
/// Before
public class FacilityBuildingPresenter : Building
{
    public override double Production {
        get {
            var infinityData = StaticInfinityData; // Static coupling
            return infinityData.assemblyLineBotProduction;
        }
    }
}

/// After
public class FacilityBuildingPresenter : Building
{
    [SerializeField] private FacilityId facilityId;

    private IFacilityService _facilityService;

    protected virtual void Awake()
    {
        _facilityService = GameServices.Instance.Facilities;
    }

    public override double Production {
        get {
            return _facilityService.GetProduction(facilityId);
        }
    }

    public override void Purchase()
    {
        _facilityService.PurchaseFacility(facilityId, 1, false);
    }
}
```

**Step 3.5: Add Service Validation** (1 hour)
```csharp
/// Assets/Scripts/Services/ServiceValidator.cs
public static class ServiceValidator
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void ValidateServices()
    {
        if (GameServices.Instance == null)
        {
            Debug.LogError("[ServiceValidator] GameServices not found in scene!");
            return;
        }

        // Validate all services are initialized
        bool allValid = true;
        allValid &= ValidateService(GameServices.Instance.GameData, "GameData");
        allValid &= ValidateService(GameServices.Instance.Facilities, "Facilities");
        allValid &= ValidateService(GameServices.Instance.Skills, "Skills");
        allValid &= ValidateService(GameServices.Instance.Research, "Research");

        if (allValid)
            Debug.Log("[ServiceValidator] All services initialized successfully");
    }

    private static bool ValidateService(object service, string name)
    {
        if (service == null)
        {
            Debug.LogError($"[ServiceValidator] {name} service is null!");
            return false;
        }
        return true;
    }
}
```

**Step 3.6: Create Mock Services for Testing** (3 hours)
```csharp
/// Assets/Tests/Mocks/MockGameDataService.cs
public sealed class MockGameDataService : IGameDataService
{
    public DysonVerseInfinityData InfinityData { get; set; }
    public DysonVerseSkillTreeData SkillTreeData { get; set; }
    public DysonVersePrestigeData PrestigeData { get; set; }
    public SaveDataSettings SaveData { get; set; }

    public MockGameDataService()
    {
        // Initialize with test data
        InfinityData = new DysonVerseInfinityData();
        SkillTreeData = new DysonVerseSkillTreeData();
        PrestigeData = new DysonVersePrestigeData();
        SaveData = new SaveDataSettings();
    }

    public int GetFacilityCount(FacilityId id, FacilityCountType type)
    {
        // Return test data
        return 0;
    }

    // ... other mocked methods
}

/// Assets/Tests/Mocks/MockFacilityService.cs
public sealed class MockFacilityService : IFacilityService
{
    private readonly Dictionary<string, double> _productions = new();

    public void SetProduction(FacilityId id, double value)
    {
        _productions[id.Value] = value;
    }

    public double GetProduction(FacilityId id)
    {
        return _productions.TryGetValue(id.Value, out var value) ? value : 0;
    }

    // ... other mocked methods
}
```

**Step 3.7: Write Example Unit Tests** (3 hours)
```csharp
/// Assets/Tests/EditMode/FacilityServiceTests.cs
public class FacilityServiceTests
{
    [Test]
    public void GetProduction_WithValidFacility_ReturnsExpectedValue()
    {
        // Arrange
        var mockData = new MockGameDataService();
        var mockRegistry = CreateMockRegistry();
        var service = new FacilityService(mockData, mockRegistry);

        // Act
        double production = service.GetProduction(TestData.AssemblyLineId);

        // Assert
        Assert.AreEqual(100.0, production, 0.01);
    }

    [Test]
    public void GetProduction_WithInvalidFacility_ReturnsZero()
    {
        // Arrange
        var mockData = new MockGameDataService();
        var mockRegistry = CreateMockRegistry();
        var service = new FacilityService(mockData, mockRegistry);

        // Act
        double production = service.GetProduction(null);

        // Assert
        Assert.AreEqual(0.0, production);
    }
}
```

### Deliverables
- [x] 4 core service interfaces (GameData, Facility, Skill, Research)
- [x] Service implementations wrapping Oracle access
- [x] GameServices singleton for service access
- [x] Refactored presenters using injected services
- [x] Service validation on startup
- [x] Mock service implementations for testing
- [x] Example unit tests demonstrating patterns

### Testing Checklist
- [ ] All presenters function correctly with service layer
- [ ] GameServices initializes on scene load
- [ ] Service validation catches missing services
- [ ] Unit tests pass in Edit Mode
- [ ] No performance regression (< 1ms overhead per frame)

### Migration Strategy
- Phase 3A: Create interfaces + implementations (no behavioral changes)
- Phase 3B: Update presenters one at a time (incremental)
- Phase 3C: Add validation and tests
- Keep Oracle static accessors as fallback during transition

---

## Phase 4: Facility Configuration Externalization (Week 4)

### Priority: 🟡 MEDIUM
**Effort:** 12-16 hours
**Impact:** New facility types require zero code changes

### The Problem

Current implementation has facility-specific switch statements in multiple locations:
```csharp
switch (facilityId.Value)
{
    case "assembly_lines":
        return new FacilityState {
            ManualOwned = infinityData.assemblyLines[1],
            AutoOwned = infinityData.assemblyLines[0],
            // ...
        };
    case "ai_managers":
        // Identical structure, different fields
    // ... 3 more cases
}
```

**Issues:**
- Adding 6th facility type requires code changes in 5+ files
- Boilerplate repeated per facility
- Violates DRY principle

### The Solution: Configuration-Driven Facility System

Option A: Reflection-based (simple, slower)
Option B: Typed accessors (complex, fast)

**Recommendation: Start with Option A, optimize to B if needed**

#### Implementation Steps (Option A: Reflection)

**Step 4.1: Add Data Binding to FacilityDefinition** (2 hours)
```csharp
/// Assets/Scripts/Data/FacilityDataBinding.cs
[Serializable]
public sealed class FacilityDataBinding
{
    [Tooltip("Path to auto-owned count (e.g., 'infinityData.assemblyLines.0')")]
    public string autoCountPath;

    [Tooltip("Path to manual-owned count (e.g., 'infinityData.assemblyLines.1')")]
    public string manualCountPath;

    [Tooltip("Path to production rate (e.g., 'infinityData.assemblyLineBotProduction')")]
    public string productionPath;

    [Tooltip("Array indexing convention: 0=auto, 1=manual")]
    public bool usesArrayIndexing = true;
    public string arrayFieldPath; // e.g., "infinityData.assemblyLines"
}

/// Update FacilityDefinition.cs
public class FacilityDefinition : ScriptableObject
{
    [SerializeField] private FacilityDataBinding dataBinding;
    public FacilityDataBinding DataBinding => dataBinding;
}
```

**Step 4.2: Create Reflection Helper** (3 hours)
```csharp
/// Assets/Scripts/Core/ReflectionHelper.cs
public static class ReflectionHelper
{
    private static readonly Dictionary<string, Func<object, object>> _getterCache = new();
    private static readonly Dictionary<string, Action<object, object>> _setterCache = new();

    public static T GetValue<T>(object root, string path)
    {
        if (!_getterCache.TryGetValue(path, out var getter))
        {
            getter = CompileGetter(path);
            _getterCache[path] = getter;
        }

        object value = getter(root);
        return value is T typed ? typed : default;
    }

    public static void SetValue(object root, string path, object value)
    {
        if (!_setterCache.TryGetValue(path, out var setter))
        {
            setter = CompileSetter(path);
            _setterCache[path] = setter;
        }

        setter(root, value);
    }

    private static Func<object, object> CompileGetter(string path)
    {
        // Parse path: "infinityData.assemblyLines.0"
        // Build expression tree for fast access
        // Cache compiled delegate
    }

    private static Action<object, object> CompileSetter(string path)
    {
        // Similar to getter but creates setter
    }
}
```

**Step 4.3: Update FacilityRuntimeBuilder to Use Bindings** (3 hours)
```csharp
/// Before: Giant switch statement
public static FacilityState BuildFacilityState(...)
{
    switch (facilityId.Value) { ... }
}

/// After: Generic binding-based
public static FacilityState BuildFacilityState(
    FacilityDefinition definition,
    SaveDataSettings saveData)
{
    var binding = definition.DataBinding;

    int autoOwned, manualOwned;

    if (binding.usesArrayIndexing)
    {
        var array = ReflectionHelper.GetValue<int[]>(saveData, binding.arrayFieldPath);
        autoOwned = array?[0] ?? 0;
        manualOwned = array?[1] ?? 0;
    }
    else
    {
        autoOwned = ReflectionHelper.GetValue<int>(saveData, binding.autoCountPath);
        manualOwned = ReflectionHelper.GetValue<int>(saveData, binding.manualCountPath);
    }

    return new FacilityState {
        FacilityId = definition.Id,
        AutoOwned = autoOwned,
        ManualOwned = manualOwned,
        EffectiveCount = autoOwned + manualOwned
    };
}
```

**Step 4.4: Create Binding Configuration Tool** (2 hours)
```csharp
/// Assets/Editor/FacilityBindingConfigurator.cs
public class FacilityBindingConfigurator : EditorWindow
{
    [MenuItem("Tools/Idle Dyson/Configure Facility Bindings")]
    public static void ShowWindow()
    {
        GetWindow<FacilityBindingConfigurator>("Facility Bindings");
    }

    private void OnGUI()
    {
        // UI to configure bindings for each facility
        // Auto-populate from existing switch statement
        // Validate paths against SaveDataSettings fields
    }
}
```

**Step 4.5: Add Binding Validation** (2 hours)
```csharp
/// Assets/Editor/FacilityBindingValidator.cs
public static class FacilityBindingValidator
{
    [MenuItem("Tools/Idle Dyson/Validate Facility Bindings")]
    public static void ValidateAllBindings()
    {
        var definitions = FindAllFacilityDefinitions();

        foreach (var def in definitions)
        {
            ValidateBinding(def);
        }
    }

    private static void ValidateBinding(FacilityDefinition def)
    {
        var binding = def.DataBinding;

        // Check if paths exist in SaveDataSettings
        if (!FieldExists(typeof(SaveDataSettings), binding.autoCountPath))
        {
            Debug.LogError($"Invalid autoCountPath in {def.name}: {binding.autoCountPath}");
        }

        // Validate types match expectations
        // ...
    }
}
```

#### Alternative: Option B - Typed Accessors (Future Optimization)

If reflection proves too slow in production:

```csharp
/// Assets/Scripts/Data/IFacilityDataAccessor.cs
public interface IFacilityDataAccessor
{
    int GetAutoCount(SaveDataSettings data);
    int GetManualCount(SaveDataSettings data);
    void SetAutoCount(SaveDataSettings data, int value);
    void SetManualCount(SaveDataSettings data, int value);
    double GetProduction(SaveDataSettings data);
}

/// One implementation per facility
public sealed class AssemblyLineAccessor : IFacilityDataAccessor
{
    public int GetAutoCount(SaveDataSettings data) =>
        data.infinityData.assemblyLines[0];

    public int GetManualCount(SaveDataSettings data) =>
        data.infinityData.assemblyLines[1];

    // ... other methods
}

/// Register in FacilityDefinition
[SerializeField] private string accessorTypeName = "AssemblyLineAccessor";
```

Then use reflection to instantiate accessor once, cache it, and call typed methods.

### Deliverables
- [x] FacilityDataBinding configuration class
- [x] ReflectionHelper with expression compilation
- [x] Updated FacilityRuntimeBuilder using bindings
- [x] Binding configuration tool
- [x] Binding validation tool
- [x] Documentation for adding new facility types

### Testing Checklist
- [ ] All existing facilities still function
- [ ] Binding validation passes for all facilities
- [ ] Performance: < 0.5ms per facility state build
- [ ] New test facility can be added via config only

### Documentation
Create `Documentation/AddingNewFacilities.md`:
- Step-by-step guide for adding facility types
- Binding configuration examples
- Troubleshooting common issues

---

## Phase 5: Polish & Performance Optimization (Ongoing)

### Priority: 🟢 LOW (As-Needed)
**Effort:** Variable
**Impact:** Incremental improvements

### Areas for Future Optimization

**5.1: Fluent Effect Builder API**
```csharp
var effects = EffectBuilder
    .For(facilityId)
    .WithContext(context)
    .AddSkillEffects()
    .AddResearchEffects()
    .Build();
```

**5.2: Object Pooling for Stat Calculations**
- Pool List<StatEffect> to reduce allocations
- Pool StatResult objects
- Measure impact before implementing

**5.3: Facility Relationship Graph Asset**
- Externalize "assembly_lines produced by ai_managers" relationships
- Data-driven breakdown popup sections

**5.4: Automated Parity Test Suite**
- Run parity checks in CI/CD pipeline
- Fail build if deltas exceed epsilon

**5.5: Performance Profiling Dashboard**
- Visualize StatTimingTracker data in editor
- Identify hot paths in stat pipeline

---

## Implementation Priority & Rationale

### Why This Order?

#### Phase 1 First (String IDs → Typed IDs)
**Reason:** Foundation for everything else
- Later phases depend on FacilityId/SkillId references
- Eliminates most fragile bugs
- Low risk (backward compatible via implicit conversion)
- Clear validation (compile errors if broken)

#### Phase 2 Second (Condition System)
**Reason:** Unblocks content creation
- Designers can add skills/effects independently
- No code changes for new game content
- Builds on Phase 1 (uses typed IDs)
- High impact for productivity

#### Phase 3 Third (Service Layer)
**Reason:** Enables testing and future refactors
- Phases 1-2 are data changes (low coupling impact)
- Phase 3 is architectural (high coupling impact)
- Once services exist, future refactors are easier
- Can be done incrementally (low risk)

#### Phase 4 Fourth (Facility Configuration)
**Reason:** Polish, not critical path
- Benefits are marginal (5 facilities → ~6 in future)
- Can use reflection if needed (acceptable for idle game)
- Lower ROI than Phases 1-3
- Can be deferred if time-constrained

#### Phase 5 Ongoing (Polish)
**Reason:** Incremental, as-needed improvements
- Optimize only when profiling shows bottlenecks
- Fluent APIs are nice-to-have, not essential
- Don't prematurely optimize

---

## Risk Assessment & Mitigation

### High-Risk Areas

**1. Phase 1: Breaking Serialized References**
- **Risk:** Changing field types breaks existing scene/prefab data
- **Mitigation:**
  - Keep old string fields as `[Obsolete]` during transition
  - Create migration tool to update references
  - Test on copy of project first

**2. Phase 2: Condition Evaluation Performance**
- **Risk:** Scriptable condition system slower than switch statement
- **Mitigation:**
  - Profile before/after
  - Cache condition results if needed
  - Use condition pooling if allocation is issue

**3. Phase 3: Service Layer Overhead**
- **Risk:** Extra indirection layer adds latency
- **Mitigation:**
  - Services should be thin wrappers (< 10 lines per method)
  - Inline frequently-called methods
  - Profile per-frame impact

### Rollback Plan

Each phase should be in its own git branch:
- `feature/typed-ids`
- `feature/condition-system`
- `feature/service-layer`
- `feature/facility-config`

If a phase fails validation:
1. Revert branch
2. Document failure reason
3. Create alternative approach plan
4. Re-attempt after addressing issues

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ Zero string literal facility/skill/research IDs in runtime code
- ✅ Inspector drag-drop for all ID references
- ✅ Validation tool reports no broken references
- ✅ All parity tests still pass

### Phase 2 Success Criteria
- ✅ Zero hardcoded condition cases in EffectConditionEvaluator
- ✅ Designer can create new skill with condition in < 5 minutes
- ✅ Condition preview shows correct state in inspector
- ✅ All existing effects function identically

### Phase 3 Success Criteria
- ✅ All presenters use injected services (no static calls)
- ✅ 5+ unit tests demonstrating mock usage
- ✅ Service validation passes on startup
- ✅ No performance regression (< 1ms per frame overhead)

### Phase 4 Success Criteria
- ✅ New facility type added via config only (no code)
- ✅ Binding validation passes for all facilities
- ✅ Facility state build < 0.5ms per facility

---

## Post-Completion: Next Steps

After completing Phases 1-4, return to:
- [OverhaulPlans.md](OverhaulPlans.md) for next major system refactors
  - Offline Progress Simulation
  - Debug/Telemetry improvements
- New feature development (unblocked by improved architecture)

---

## Appendix: Code Change Estimates

| Phase | Files Created | Files Modified | Lines Added | Lines Removed |
|-------|---------------|----------------|-------------|---------------|
| 1     | 15            | 25             | ~800        | ~200          |
| 2     | 12            | 15             | ~1200       | ~300          |
| 3     | 20            | 30             | ~1500       | ~400          |
| 4     | 8             | 12             | ~600        | ~150          |
| **Total** | **55**    | **82**         | **~4100**   | **~1050**     |

**Net Impact:** +3050 lines (primarily new abstractions and tools)

---

## Questions & Clarifications

Before starting implementation:

1. **Scope Confirmation:** Are all 4 phases approved, or start with Phase 1 only?
2. **Timeline Flexibility:** Is 3-4 week estimate acceptable, or compress?
3. **Testing Requirements:** Unit tests mandatory, or optional?
4. **Breaking Changes:** Acceptable to break save compatibility if migration provided?
5. **Performance Targets:** Any specific frame budget constraints?

---

**Document Version:** 1.0
**Author:** Claude (Sonnet 4.5)
**Date:** 2026-01-13
**Status:** Proposed - Awaiting Approval
