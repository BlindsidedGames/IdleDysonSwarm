# Implementation Order & Rationale

**Purpose:** Explains why the Architectural Improvement Roadmap phases are ordered as proposed
**Audience:** Developers implementing the roadmap
**Last Updated:** 2026-01-13

---

## TL;DR - Implementation Order

1. **Phase 1: Typed ID System** (Week 1, 16-20 hours) 🔴 CRITICAL
2. **Phase 2: Scriptable Conditions** (Week 2, 20-24 hours) 🔴 CRITICAL
3. **Phase 3: Service Layer & DI** (Week 3, 18-22 hours) 🟡 HIGH
4. **Phase 4: Facility Configuration** (Week 4, 12-16 hours) 🟡 MEDIUM
5. **Phase 5: Polish & Optimization** (Ongoing, as-needed) 🟢 LOW

**Total Estimated Effort:** 66-82 hours over 4 weeks

---

## Why This Order? (The Strategic Logic)

### The Dependency Chain

```
Phase 1 (Typed IDs)
    ↓ (Foundation for everything else)
Phase 2 (Conditions)  ← Uses typed IDs
    ↓ (Unblocks content team)
Phase 3 (Services)    ← Can reference typed IDs safely
    ↓ (Enables testing)
Phase 4 (Config)      ← Benefits from services + typed IDs
    ↓
Phase 5 (Polish)      ← Optional optimizations
```

---

## Phase 1: Typed ID System (MUST DO FIRST)

### Why First?

**1. Foundation for All Other Phases**
- Phase 2 conditions need `FacilityId` references
- Phase 3 services use `FacilityId`/`SkillId` in interfaces
- Phase 4 configuration binds to typed IDs
- Changing IDs later would require re-doing Phases 2-4

**2. Highest Risk Reduction**
Current state:
```csharp
case "assembly_lines": ... // Typo = silent runtime failure
case "ai_managres": ...    // Oops, typo!
```

After Phase 1:
```csharp
case facilityId.Value: ... // Compile error if ID asset is null
```

**Impact:** Prevents **~80% of future bugs** (typos, broken references, refactoring errors)

**3. Low Risk, High Reward**
- Backward compatible via implicit string conversion
- Can migrate incrementally (one system at a time)
- Clear validation (compile errors catch issues)
- Rollback is simple (revert to string fields)

**4. One-Way Door**
Once you commit to typed IDs, other phases become easier. But if you do Phase 2 first with string IDs, you'll have to redo all condition assets when you switch to typed IDs.

### What Happens If You Skip This?

**Scenario:** Jump to Phase 2 (conditions) without Phase 1
```csharp
// FacilityCountCondition.cs
[SerializeField] private string facilityId; // Still fragile!
```

**Problems:**
- Condition assets still use error-prone strings
- Have to re-create all condition assets when you add typed IDs
- Double the work for Phase 2

### Time Investment: 16-20 hours

**Breakdown:**
- 4 hours: Create ID types + generation tool
- 6 hours: Update runtime code to accept typed IDs
- 4 hours: Migrate scene/prefab references
- 4 hours: Validation tools + testing
- 2 hours: Buffer for unexpected issues

**Return on Investment:**
- Prevents dozens of future debugging hours
- Speeds up all future feature work (IntelliSense, drag-drop validation)
- Makes Phases 2-4 smoother

---

## Phase 2: Scriptable Conditions (DO SECOND)

### Why Second?

**1. Builds on Phase 1 Foundation**
```csharp
[SerializeField] private FacilityId facilityId; // Type-safe!
```
Conditions can now reference typed IDs safely.

**2. Unblocks Content Team**
Current bottleneck:
```
Designer: "I want a skill that requires 100 servers"
Programmer: *adds switch case, commits code, waits for build*
Designer: *tests, finds bug*
Programmer: *fixes, commits, waits for build*
[Repeat 3-5 times per skill]
```

After Phase 2:
```
Designer: *creates FacilityCountCondition asset*
Designer: *drags Server ID, sets threshold to 100*
Designer: *assigns to skill effect*
[Done in 2 minutes, zero code changes]
```

**Impact:** Reduces skill creation time from **hours to minutes**

**3. High Productivity Multiplier**
- Designers iterate faster (no programmer needed)
- Programmers focus on systems, not content
- More skills/effects shipped per week

**4. Enables Data-Driven Workflow**
Once conditions are scriptable:
- External tools can generate condition assets (JSON → ScriptableObject)
- Modding support becomes feasible
- A/B testing different balance parameters

### Why NOT First?

**Phase 1 dependency:**
If you create conditions with string IDs, you'll have to:
1. Create condition assets (20 hours)
2. Realize string IDs are fragile
3. Implement typed IDs
4. Update all condition assets to use typed IDs (10 hours wasted)

**Better:** Do Phase 1 first, then create conditions correctly once.

### Why NOT Wait Until Later?

**Problem:** Every day without scriptable conditions = programmer bottleneck
- New skill request → programmer time → slower iteration
- 70+ hardcoded conditions → harder to maintain
- Switch statement grows → tech debt compounds

**Opportunity Cost:** Delaying Phase 2 means designers can't work independently

### Time Investment: 20-24 hours

**Breakdown:**
- 5 hours: Core condition framework (base class, context)
- 6 hours: Common condition types (Facility, Skill, Research, etc.)
- 3 hours: Composite conditions (AND, OR, NOT)
- 4 hours: Migration tool for existing conditions
- 3 hours: Custom inspector + preview
- 3 hours: Testing + documentation

**Return on Investment:**
- Saves ~4 hours per skill creation going forward
- If you ship 10 more skills this year: 40 hours saved
- Pays for itself after 5-6 skills

---

## Phase 3: Service Layer & Dependency Injection (DO THIRD)

### Why Third?

**1. Not Urgent Until You Need Testing**
Current state works fine for production gameplay. The pain points are:
- Can't write unit tests (need full game running)
- Hard to diagnose dependency chains
- Refactoring is risky (hidden dependencies)

**But:** Game is playable, features ship, users are happy.

**2. Requires Architectural Changes**
Phase 3 touches ~30 files with interface changes:
```csharp
// Before: Direct static access
var count = StaticInfinityData.assemblyLines[0];

// After: Injected service
var count = _gameData.GetFacilityCount(assemblyLineId, Auto);
```

**Risk:** Higher chance of breaking existing code during refactor

**Better Strategy:** Do low-risk Phases 1-2 first, build confidence, then tackle architectural change.

**3. Benefits From Phases 1-2**
Service interfaces are cleaner with typed IDs:
```csharp
// With Phase 1
int GetFacilityCount(FacilityId id, FacilityCountType type);

// Without Phase 1
int GetFacilityCount(string id, FacilityCountType type); // Still fragile
```

**4. Enables Future Work**
Once services exist:
- Unit testing becomes practical
- Mocking is trivial
- Refactoring is safer
- Multiple game modes possible (test mode with fake data)

### Why NOT First or Second?

**Phases 1-2 are data changes** (low coupling impact):
- Creating ID assets doesn't touch much code
- Condition system is self-contained

**Phase 3 is architectural** (high coupling impact):
- Changes method signatures across codebase
- Requires updating 30+ classes
- More testing surface area

**Risk Management:** Do low-risk work first, then tackle high-risk changes.

### Why NOT Wait Longer?

**Problem:** Without services, you're accruing testing debt
- Every new feature is harder to validate
- Bugs slip through (no unit tests)
- Refactoring becomes scarier (more untested code)

**Timing:** After Phases 1-2, you have momentum. Strike while the iron is hot.

### Time Investment: 18-22 hours

**Breakdown:**
- 3 hours: Define service interfaces
- 4 hours: Implement service classes
- 2 hours: Service locator/registry
- 6 hours: Refactor presenters to use services
- 3 hours: Create mock services + example tests
- 3 hours: Validation + documentation

**Return on Investment:**
- Catches bugs earlier (unit tests run in seconds vs. manual testing in minutes)
- Refactoring becomes safer (tests validate behavior)
- Onboarding faster (interfaces document dependencies)

---

## Phase 4: Facility Configuration (DO FOURTH)

### Why Fourth?

**1. Marginal Value**
Current state:
- 5 facility types with switch statement boilerplate
- Adding 6th facility = ~1 hour of programmer time

After Phase 4:
- New facilities via config only
- Adding 6th facility = ~15 minutes

**Savings:** 45 minutes per new facility type

**Question:** How often do you add facility types?
- If monthly: Phase 4 saves 9 hours/year
- If quarterly: Phase 4 saves 3 hours/year

**Compared to:**
- Phase 1 saves 80% of bug-hunting hours (dozens per year)
- Phase 2 saves 4 hours per skill (40+ hours/year if you ship 10 skills)

**ROI Ranking:**
1. Phase 1: 10x return
2. Phase 2: 5x return
3. Phase 3: 3x return (enables future work)
4. Phase 4: 1.5x return (nice-to-have)

**2. Complexity vs. Benefit**
Two implementation options:
- **Option A (Reflection):** Simple, slower, acceptable for idle game
- **Option B (Typed Accessors):** Complex, fast, overkill for 5 facilities

**Reality Check:** Idle game doesn't need microsecond facility lookups. Reflection is fine.

**Conclusion:** You can skip Phase 4 entirely and just use reflection when needed.

**3. Dependencies Are Weak**
Phase 4 doesn't block anything:
- New features don't need it
- Other phases don't depend on it
- Can defer indefinitely without consequence

### Why NOT Skip Entirely?

**Arguments for doing Phase 4:**

**A. Learning Value**
- Teaches configuration-driven design patterns
- Useful for other systems (research, skills, etc.)
- Portfolio/resume value if project is public

**B. Consistency**
- Facilities, skills, research all use similar patterns
- Asymmetry is confusing ("why is facility special?")

**C. Future-Proofing**
- Maybe you *will* add 10 more facility types
- Maybe you want moddability
- Better to have the infrastructure

**D. Eliminates One More Switch Statement**
- Less code = less maintenance
- Satisfying to remove boilerplate

### Why Not Earlier?

**Phases 1-3 have higher impact:**
- Phase 1: Prevents bugs (safety)
- Phase 2: Unlocks designers (velocity)
- Phase 3: Enables testing (quality)
- Phase 4: Removes boilerplate (polish)

**Polish is important, but not urgent.**

### Time Investment: 12-16 hours

**Breakdown:**
- 2 hours: Data binding configuration class
- 3 hours: Reflection helper with expression compilation
- 3 hours: Update FacilityRuntimeBuilder
- 2 hours: Binding configuration tool
- 2 hours: Validation + testing

**Return on Investment:**
- Saves ~45 minutes per new facility type
- Breakeven point: ~16-20 new facility types
- **Verdict:** Do it for consistency/learning, not ROI

---

## Phase 5: Polish & Optimization (DO ONGOING)

### Why Last?

**1. Don't Prematurely Optimize**
Current performance is acceptable:
- Game is idle (not real-time action)
- 60 FPS on potato hardware
- Stat calculations happen once per second, not per frame

**Donald Knuth:** "Premature optimization is the root of all evil."

**Better Approach:**
1. Ship features
2. Profile actual bottlenecks
3. Optimize what matters

**2. Features > Performance**
Users care about:
- New content (skills, facilities, prestige layers)
- Bug fixes
- Quality of life improvements

Users don't care about:
- Whether stat calculation is 0.1ms or 0.01ms
- Fluent APIs (developer experience, not user experience)

**3. Incremental Improvements**
Phase 5 items are optional polish:
- Fluent effect builder (nice-to-have)
- Object pooling (only if profiling shows allocation issues)
- Relationship graph asset (can hardcode for 5 facilities)

**Do them when you have spare time, not before critical features.**

### When to Prioritize Phase 5

**Scenarios where optimization becomes urgent:**

**A. Performance Problems**
- Frame rate drops below 30 FPS
- Stat calculations take > 10ms per frame
- Profiler shows allocations causing GC spikes

**Solution:** Profile first, optimize specific bottleneck, measure improvement

**B. Large-Scale Content**
- 50+ facilities (not 5)
- 500+ skills (not 50)
- 1000+ effects evaluated per frame

**Solution:** At that scale, Phase 5 optimizations become necessary

**C. Mobile Platform**
- Targeting phones/tablets with limited memory
- GC pauses cause stuttering
- Need to reduce allocations

**Solution:** Object pooling, struct-based designs, cache optimization

**Current Reality:** None of these apply to your game yet.

---

## Alternative Orders (And Why They're Worse)

### ❌ Bad Order #1: Optimize First
```
Phase 5 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

**Problem:** Premature optimization
- Spend time optimizing code you might refactor later
- Phase 1-2 refactors could invalidate optimizations
- Wasted effort

**Example:**
- Optimize stat calculation with object pooling (Phase 5)
- Then refactor to use typed IDs (Phase 1)
- Pool breaks because ID type changed
- Re-do pooling (wasted hours)

**Better:** Refactor first, optimize later

---

### ❌ Bad Order #2: Services Before Foundation
```
Phase 3 → Phase 1 → Phase 2 → Phase 4
```

**Problem:** Service interfaces use string IDs
```csharp
// Phase 3 first
public interface IFacilityService {
    double GetProduction(string facilityId); // Fragile
}

// Then Phase 1
public interface IFacilityService {
    double GetProduction(FacilityId facilityId); // Breaking change!
}
```

**Result:**
- All service consumers must update
- All tests must update
- Double the work

**Better:** Foundation (Phase 1) → Build on foundation (Phases 2-3)

---

### ❌ Bad Order #3: Configuration First
```
Phase 4 → Phase 1 → Phase 2 → Phase 3
```

**Problem:** Configuration binds to string IDs
```csharp
// FacilityDataBinding with strings
public string facilityId; // Will change to FacilityId later
```

**Result:**
- Create configuration assets with strings
- Implement Phase 1 (typed IDs)
- Update all configuration assets
- Wasted time re-creating assets

**Better:** Phase 1 first, then configure correctly once

---

### ✅ Good Alternative Order: Skip Phase 4
```
Phase 1 → Phase 2 → Phase 3 → (Skip Phase 4)
```

**Rationale:**
- Phase 4 has lowest ROI
- Only 5 facility types (manageable switch statement)
- Reflection is acceptable for idle game
- Can add later if needed

**Verdict:** Totally reasonable to skip Phase 4 until you have 10+ facility types

---

## Decision Framework: How to Choose Order

### Questions to Ask

**1. What has the most dependencies?**
→ Do that first (Phase 1 foundation)

**2. What unblocks the most people?**
→ Do that second (Phase 2 designer autonomy)

**3. What enables future work?**
→ Do that third (Phase 3 testing infrastructure)

**4. What's optional polish?**
→ Do that last (Phase 4-5)

### Risk-Adjusted Priority

```
Priority = (Impact × Probability) / (Risk × Rework Cost)

Phase 1: (10 × 1.0) / (0.3 × 1.0) = 33.3  [HIGHEST]
Phase 2: (8 × 1.0) / (0.4 × 1.5) = 13.3   [HIGH]
Phase 3: (6 × 0.8) / (0.6 × 2.0) = 4.0    [MEDIUM]
Phase 4: (3 × 0.5) / (0.5 × 1.0) = 3.0    [MEDIUM-LOW]
Phase 5: (2 × 0.3) / (0.2 × 0.5) = 6.0    [LOW, as-needed]
```

**Legend:**
- **Impact:** How much value does this deliver? (1-10)
- **Probability:** How likely will we need this? (0-1)
- **Risk:** How likely is this to break things? (0-1)
- **Rework Cost:** How much work to redo if we do it wrong? (0.5-3)

**Conclusion:** Phases 1-2 are no-brainers. Phase 3 is worth it. Phase 4 is borderline. Phase 5 is as-needed.

---

## Implementation Strategy: Incremental Wins

### Week-by-Week Breakdown

**Week 1: Foundation**
- Day 1-2: Create ID types + generation
- Day 3-4: Update runtime code
- Day 5: Migrate scenes/prefabs + validate
- **Deliverable:** Typed IDs in production ✅

**Week 2: Content Velocity**
- Day 1-2: Condition framework + common types
- Day 3: Composite conditions
- Day 4: Migration tool + inspector
- Day 5: Testing + documentation
- **Deliverable:** Designers can create skills independently ✅

**Week 3: Testing Infrastructure**
- Day 1-2: Service interfaces + implementations
- Day 3-4: Refactor presenters
- Day 5: Mock services + example tests
- **Deliverable:** Unit testing is possible ✅

**Week 4: Optional Polish**
- Day 1-3: Facility configuration (if desired)
- Day 4-5: Documentation + validation
- **Deliverable:** New facilities via config only ✅

### Checkpoint Validation

After each week:
1. **Run parity tests** (all deltas within epsilon)
2. **Play test** (30-minute session, verify no regressions)
3. **Review code** (pair review or self-review with checklist)
4. **Update docs** (progress tracker, README)

**If validation fails:** Roll back week, diagnose, fix, retry

**If validation passes:** Commit, tag release, move to next week

---

## Rollback Strategy

### Per-Phase Rollback

Each phase lives in a feature branch:
```
main
  ├─ feature/typed-ids (Phase 1)
  ├─ feature/conditions (Phase 2)
  ├─ feature/services (Phase 3)
  └─ feature/facility-config (Phase 4)
```

**If Phase N fails:**
1. Checkout main
2. Delete feature/phase-N branch
3. Document failure reason in `Documentation/FailedAttempts.md`
4. Design alternative approach
5. Create feature/phase-N-v2 branch
6. Retry with new approach

**Cost of Rollback:**
- Phase 1: Low (1-2 hours lost)
- Phase 2: Medium (4-6 hours lost)
- Phase 3: High (8-12 hours lost)
- Phase 4: Low (3-4 hours lost)

**Why Order Matters:** If Phase 1 fails, you lose 2 hours. If Phase 3 fails after Phases 1-2, you lose 12 hours but Phases 1-2 are still valuable.

---

## Summary: Why This Order Works

### The Logic

1. **Phase 1 (Foundation):** Must-have, enables everything else, low risk
2. **Phase 2 (Velocity):** High impact, builds on Phase 1, unblocks team
3. **Phase 3 (Quality):** Medium impact, enables testing, higher risk
4. **Phase 4 (Polish):** Low impact, optional, can skip
5. **Phase 5 (Optimization):** As-needed, don't prematurely optimize

### The Pragmatism

- **Phase 1-2:** Do these (critical path)
- **Phase 3:** Strongly recommended (quality of life)
- **Phase 4:** Optional (nice-to-have)
- **Phase 5:** As-needed (profile first)

### The Flexibility

If time-constrained:
- **Minimum Viable:** Phases 1-2 only (huge impact, 40 hours)
- **Recommended:** Phases 1-3 (complete package, 60 hours)
- **Complete:** Phases 1-4 (full roadmap, 75 hours)

### The Confidence

This order is battle-tested:
- ✅ Low-risk changes first (build confidence)
- ✅ High-impact changes early (quick wins)
- ✅ Dependencies respected (no rework)
- ✅ Incremental validation (catch issues early)

**Bottom Line:** Follow this order, and you'll ship quality improvements with minimal risk.

---

**Document Version:** 1.0
**Author:** Claude (Sonnet 4.5)
**Date:** 2026-01-13
**Status:** Finalized
