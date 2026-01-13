# Service Layer & Dependency Injection

## Overview

This service layer provides dependency injection for the Idle Dyson Swarm game, decoupling presenters and UI logic from the Oracle singleton and enabling unit testing.

## Architecture

### Service Interfaces

**IGameStateService** - Access to core game state data
- Properties: InfinityData, PrestigeData, SkillTreeData, PrestigePlus, Secrets, SaveSettings
- Currency: Science (get/set)
- Research: GetResearchLevel(), SetResearchLevel()
- Settings: ResearchBuyMode, RoundedBulkBuy

**IGameDataService** - Access to game definition data (facilities, skills, research, effects)
- Methods: TryGetFacility(), TryGetSkill(), TryGetResearch(), TryGetEffect()
- Supports both string IDs and typed IDs (FacilityId, SkillId, ResearchId)

**IFacilityService** - High-level facility management operations
- Methods: TryGetFacilityRuntime(), GetFacilityState(), SetFacilityCount(), GetFacilityCount()

### Service Implementations

**GameStateService** - Wraps Oracle static access for gradual migration
- Adapter pattern allowing existing code to continue working
- Provides PrestigePlus via SaveSettings.prestigePlus
- Builds SecretBuffState dynamically via ModifierSystem

**GameDataService** - Wraps GameDataRegistry
- Safe null handling with out parameters
- Supports both string and typed ID lookups

**FacilityService** - Facility management using FacilityRuntimeBuilder
- Maps facility IDs to InfinityData arrays
- Provides unified access to facility counts (auto/manual)

### Dependency Management

**ServiceLocator** - Simple DI container
- Static registration: `ServiceLocator.Register<IService>(implementation)`
- Static retrieval: `ServiceLocator.Get<IService>()`
- Methods: Register(), Get(), TryGet(), Clear(), IsRegistered()

**ServiceProvider** - MonoBehaviour for automatic service registration
- Add to a GameObject in your scene
- Executes before other scripts ([DefaultExecutionOrder(-1000)])
- Registers all services in Awake()
- Cleans up services in OnDestroy()
- Includes [ContextMenu] verification tool

## Usage

### Setting Up Services

1. Add `ServiceProvider` component to a GameObject in your scene
2. Assign the GameDataRegistry reference in the Inspector
3. Services are automatically registered at startup

### Using Services in Presenters

```csharp
using IdleDysonSwarm.Services;

public class MyPresenter : MonoBehaviour
{
    private IGameStateService _gameState;
    private IFacilityService _facilityService;

    private void Awake()
    {
        _gameState = ServiceLocator.Get<IGameStateService>();
        _facilityService = ServiceLocator.Get<IFacilityService>();
    }

    private void UpdateUI()
    {
        double science = _gameState.Science;
        double[] counts = _facilityService.GetFacilityCount("assembly_lines");
        double autoCount = counts[0];
        double manualCount = counts[1];
    }
}
```

### Creating Mock Services for Testing

```csharp
public class MockGameStateService : IGameStateService
{
    private double _science;
    public double Science
    {
        get => _science;
        set => _science = value;
    }

    // Implement other interface members...
}

[Test]
public void TestPresenterLogic()
{
    var mockGameState = new MockGameStateService();
    mockGameState.Science = 1000;

    // Test your presenter logic with controlled data
}
```

## Migration Strategy

### Phase 1: Foundation (Complete)
- ✅ Created service interfaces
- ✅ Implemented service classes
- ✅ Built ServiceLocator infrastructure
- ✅ Added ServiceProvider MonoBehaviour

### Phase 2: Presenter Refactoring (Complete)
- ✅ Refactored FacilityBuildingPresenter
- ✅ Refactored ResearchPresenter
- ✅ Removed `using static Expansion.Oracle;` dependencies

### Phase 3: Testing & Documentation (Complete)
- ✅ Created MockGameStateService
- ✅ Added example unit tests
- ✅ Documented service layer architecture

### Future Phases
- Phase 4: Expand service coverage to remaining presenters
- Phase 5: Add integration tests
- Phase 6: Consider dependency injection framework (Zenject/VContainer)

## Benefits

### Testability
- Presenters can be unit tested with mock services
- No dependency on Unity runtime or Oracle singleton
- Fast, isolated tests

### Decoupling
- Presenters depend on interfaces, not concrete implementations
- Easier to modify underlying systems without breaking UI
- Clear separation of concerns

### Maintainability
- Service interfaces document dependencies
- Easier to understand what data each presenter uses
- Reduced coupling reduces cascade effects of changes

### Flexibility
- Can swap implementations (e.g., for different game modes)
- Easier to add features like save/load variants
- Supports future architectural improvements

## Files

### Interfaces
- `IGameStateService.cs` - Core game state access
- `IGameDataService.cs` - Definition data access
- `IFacilityService.cs` - Facility operations

### Implementations
- `GameStateService.cs` - Oracle wrapper
- `GameDataService.cs` - GameDataRegistry wrapper
- `FacilityService.cs` - Facility management

### Infrastructure
- `ServiceLocator.cs` - DI container
- `ServiceProvider.cs` - Auto-registration MonoBehaviour

### Tests
- `Tests/Services/MockGameStateService.cs` - Mock for testing
- `Tests/Services/ServiceLayerExampleTests.cs` - Example tests

## Common Patterns

### Accessing Nested Oracle Types
```csharp
// BuyMode is nested in Oracle class
using static Expansion.Oracle;

switch (buyMode)
{
    case BuyMode.Buy1: // Works with using static
        break;
}

// OR use full qualification:
switch (buyMode)
{
    case Oracle.BuyMode.Buy1: // Works without using static
        break;
}
```

### Accessing Color Constants
```csharp
// Color constants are static fields on Oracle
using Expansion;

string text = $"{Oracle.textColourBlue}Some text</color>";
```

### Safe Data Access
```csharp
if (_dataService.TryGetFacility("assembly_lines", out var definition))
{
    // Use definition
}
else
{
    // Handle missing data
}
```

## Notes

- Services wrap existing static code for gradual migration
- No breaking changes to existing systems
- Production code continues to use Oracle directly if needed
- ServiceProvider must be in the scene for presenters to work
- Use the "Verify Services" context menu to check registration

## Future Improvements

- Consider constructor injection instead of ServiceLocator
- Add service scoping (singleton vs transient)
- Implement IDisposable for cleanup
- Add service lifecycle management
- Create service builders for complex initialization
