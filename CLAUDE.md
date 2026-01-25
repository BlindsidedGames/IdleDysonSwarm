# Idle Dyson Swarm - Claude Instructions

## Project Overview

Idle Dyson Swarm is a Unity incremental/idle game where players build a network of facilities to generate science and expand across the universe.

## Architecture Status

The codebase is undergoing architectural modernization. See migration documentation in:
- `Assets/Scripts/Services/README.md` - Service layer architecture
- Phase-specific PR descriptions in git history
- Planning documents in `Documentation/` folder

## Code Style & Conventions

### Naming Conventions

- **Classes**: PascalCase (e.g., `FacilityBuildingPresenter`, `GameStateService`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IGameStateService`, `IFacilityService`)
- **Private fields**: camelCase with `_` prefix (e.g., `_gameState`, `_facilityService`)
- **Public properties**: PascalCase (e.g., `Science`, `InfinityData`)
- **Methods**: PascalCase (e.g., `GetResearchLevel`, `TryGetFacility`)
- **Parameters**: camelCase (e.g., `researchId`, `facilityId`)
- **Constants**: PascalCase (e.g., `Oracle.textColourBlue`)

### Typed IDs

The project uses typed ID wrappers to prevent ID mixing errors:

```csharp
using IdleDysonSwarm.Data;

FacilityId facilityId = new FacilityId("assembly_lines");
SkillId skillId = new SkillId("faster_production");
ResearchId researchId = new ResearchId("science_boost");
```

**Key points:**
- Always use typed IDs instead of raw strings when working with facilities, skills, research, and effects
- IDs are in the `IdleDysonSwarm.Data` namespace
- IDs have implicit conversions to/from string for backward compatibility

### Service Layer Pattern

**Always prefer services over direct Oracle access:**

```csharp
// ❌ Old pattern (avoid in new code)
using static Expansion.Oracle;
double science = StaticInfinityData.Science;

// ✅ New pattern (use this)
using IdleDysonSwarm.Services;
private IGameStateService _gameState;

private void Awake()
{
    _gameState = ServiceLocator.Get<IGameStateService>();
}

private void UpdateUI()
{
    double science = _gameState.Science;
}
```

**Available Services:**
- `IGameStateService` - Core game state (InfinityData, PrestigeData, SkillTreeData, Science, Research)
- `IGameDataService` - Definition data (facilities, skills, research, effects)
- `IFacilityService` - Facility management operations

**Service registration:**
- Services are auto-registered by `ServiceProvider` MonoBehaviour at startup
- Use `ServiceLocator.Get<TService>()` in `Awake()` to inject dependencies
- See `Assets/Scripts/Services/README.md` for detailed documentation

### Scriptable Conditions

Use scriptable conditions for unlock/visibility logic instead of hardcoded checks:

```csharp
// ❌ Old pattern (hardcoded logic)
if (StaticInfinityData.assemblyLines[0] >= 10 && StaticPrestigeData.hasUnlockedX)
{
    // Show UI element
}

// ✅ New pattern (scriptable conditions)
[SerializeField] private ScriptableCondition unlockCondition;

private void UpdateUI()
{
    if (unlockCondition != null && unlockCondition.IsMet())
    {
        // Show UI element
    }
}
```

**Benefits:**
- Design unlock logic in Unity Inspector
- No code changes for balance adjustments
- Composable with AND/OR/NOT operators

### Oracle Singleton

The `Oracle` class is a legacy static singleton being phased out:

**Current state:**
- Production code still uses Oracle directly via `using static Expansion.Oracle;`
- New presenter code should use services instead
- When working with Oracle nested types, use full qualification:

```csharp
// Nested enums
Oracle.BuyMode mode = Oracle.BuyMode.Buy1;

// Color constants
string text = $"{Oracle.textColourBlue}Science</color>";
```

**Data access patterns:**
- `PrestigePlus`: Access via `Oracle.StaticSaveSettings.prestigePlus` (not StaticPrestigePlus)
- `SecretBuffState`: Build via `ModifierSystem.BuildSecretBuffState(Oracle.StaticPrestigeData)` (not StaticSecrets)

## File Organization

```
Assets/
├── Scripts/
│   ├── Buildings/          # Facility and building logic
│   │   ├── FacilityBuildingPresenter.cs
│   │   ├── FacilityDefinition.cs
│   │   └── FacilityRuntimeBuilder.cs
│   ├── Data/               # Typed IDs and data structures
│   │   ├── TypedIds.cs
│   │   └── GameDataRegistry.cs
│   ├── Research/           # Research system
│   │   ├── ResearchPresenter.cs
│   │   └── ResearchDefinition.cs
│   ├── Services/           # Service layer (Phase 3)
│   │   ├── IGameStateService.cs
│   │   ├── GameStateService.cs
│   │   ├── ServiceLocator.cs
│   │   └── README.md
│   ├── Conditions/         # Scriptable conditions (Phase 2)
│   │   └── ScriptableCondition.cs
│   └── Systems/            # Game systems (ModifierSystem, etc.)
├── Tests/
│   └── Services/           # Unit tests
│       ├── MockGameStateService.cs
│       └── ServiceLayerExampleTests.cs
└── ScriptableObjects/      # ScriptableObject assets
    ├── Facilities/
    ├── Research/
    └── Conditions/
```

## Common Patterns

### Safe Data Access with TryGet

Always use TryGet pattern for data lookups to avoid null reference exceptions:

```csharp
if (_dataService.TryGetFacility(facilityId, out var definition))
{
    // Use definition safely
    string name = definition.displayName;
}
else
{
    Debug.LogWarning($"Facility not found: {facilityId}");
}
```

### Facility Count Access

Facilities have both auto-purchased and manually-purchased counts:

```csharp
double[] counts = _facilityService.GetFacilityCount(facilityId);
double autoCount = counts[0];    // Auto-purchased
double manualCount = counts[1];  // Manually-purchased
double totalCount = autoCount + manualCount;
```

### XML Documentation

All public APIs should have XML documentation:

```csharp
/// <summary>
/// Gets the current level of a research upgrade.
/// </summary>
/// <param name="researchId">The unique identifier of the research.</param>
/// <returns>The current research level, or 0 if not researched.</returns>
public double GetResearchLevel(string researchId)
{
    // Implementation
}
```

## Testing

### Unit Tests

- Test files go in `Assets/Tests/`
- Use `MockGameStateService` for testing presenter logic without Oracle dependency
- Follow AAA pattern (Arrange, Act, Assert):

```csharp
[Test]
public void Science_CanBeModified()
{
    // Arrange
    _mockGameState.SetScience(1000);

    // Act
    _mockGameState.Science -= 500;

    // Assert
    Assert.AreEqual(500, _mockGameState.Science);
}
```

### Manual Testing

1. Open the Game scene
2. Run the game
3. Verify facility purchasing works
4. Verify research purchasing works
5. Check Unity Console for errors

## Common Errors & Solutions

### Missing Typed ID Using Directive

**Error:** `CS0246: The type or namespace name 'FacilityId' could not be found`

**Solution:** Add `using IdleDysonSwarm.Data;`

### Oracle Nested Type Not Found

**Error:** `CS0103: The name 'BuyMode' does not exist in the current context`

**Solution:** Use `Oracle.BuyMode` instead of `BuyMode` (or add `using static Expansion.Oracle;`)

### Out Parameter Not Assigned

**Error:** `CS0177: The out parameter 'definition' must be assigned before control leaves the current method`

**Solution:** Initialize out parameter to null at start of method:
```csharp
public bool TryGetFacility(string id, out FacilityDefinition definition)
{
    definition = null; // Initialize first
    return _registry != null && _registry.TryGetFacility(id, out definition);
}
```

### Property Casing Issues

**Error:** `CS1061: 'DysonVerseInfinityData' does not contain a definition for 'datacenters'`

**Solution:** Use correct casing (camelCase for fields/properties): `dataCenters` not `datacenters`

## Git Workflow

**Full documentation:** See `.claude/git-workflow.md` for comprehensive git rules.

### Core Rules

1. **Never work directly on main** - Always create a feature/refactor/fix branch first
2. **Commit after each phase** - Atomic commits representing logical units of work
3. **Feature parity required** - Refactors must not break existing functionality
4. **No broken saves** - Save compatibility must be verified before merging
5. **PR for every merge** - All changes reach main through pull requests
6. **NEVER use `git reset --hard` without asking** - This command destroys uncommitted changes permanently. Always ask the user for confirmation before running any destructive git commands (`reset --hard`, `clean -fd`, `checkout .`, etc.)

### Branch Naming

- `feature/description` - New functionality
- `refactor/description` - Code restructuring (behavior unchanged)
- `fix/description` - Bug fixes
- `phase/N-description` - Multi-part architectural changes

### Commit Messages

Follow conventional commits (imperative mood):

```
feat: Add service layer foundation
refactor: Migrate FacilityBuildingPresenter to use services
fix: Resolve compilation errors in GameDataService
docs: Add comprehensive README for service layer
test: Add unit tests for mock service layer
```

### Pre-PR Code Simplification

**Before creating a PR, run the `code-simplify` agent on all modified files.**

The agent will:
- Identify and remove dead code, unused variables, and redundant patterns
- Flag over-abstraction and unnecessary complexity
- Suggest control flow improvements
- Report findings by confidence level

This ensures PRs are clean and don't introduce unnecessary complexity.

### Before Merging to Main

- [ ] Code compiles without errors
- [ ] Code simplification agent has been run on changed files
- [ ] Existing functionality unchanged (for refactors)
- [ ] Save compatibility verified with existing saves
- [ ] PR created with summary of changes

### Pull Request Descriptions

Include:
- Summary of changes
- Testing checklist (compilation, save compatibility)
- Breaking changes (if any)

## Important Rules

### Code Quality

1. **Always read files first** - Never propose changes to code you haven't read
2. **Preserve behavior** - Don't change runtime behavior unless explicitly requested
3. **XML documentation** - Document all public APIs
4. **Follow naming conventions** - See Code Style section above
5. **Test compilation** - Always verify changes compile successfully

### Service Layer (Modern Code)

1. **Use services over Oracle** - Inject services via ServiceLocator in Awake()
2. **Interface first** - Define interfaces before implementations
3. **Safe access patterns** - Use TryGet pattern with out parameters
4. **Null safety** - Always initialize out parameters before early returns

### Legacy Code (Oracle)

1. **Qualify nested types** - Use `Oracle.BuyMode`, `Oracle.textColourBlue`
2. **Know data access patterns** - PrestigePlus via StaticSaveSettings, Secrets via ModifierSystem
3. **Avoid breaking changes** - Oracle code still used throughout codebase

## Resources

- **Service Layer**: See `Assets/Scripts/Services/README.md`
- **Migration Plans**: Check git history for phase documentation
- **Testing Patterns**: See `Assets/Tests/Services/ServiceLayerExampleTests.cs`

## Questions?

When in doubt:
1. Check relevant README files in the specific subsystem
2. Look at existing implementations for patterns
3. Ask the user for clarification on project-specific decisions
