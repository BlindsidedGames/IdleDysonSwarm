# Git Workflow Rules

This document defines git workflow rules for the Idle Dyson Swarm project. These rules ensure a clean, traceable history while maintaining stability on the main branch.

## Core Principles

1. **Never work directly on main** - All changes go through feature/refactor branches
2. **Commit after each phase** - Create atomic commits that represent logical units of work
3. **Feature parity before merge** - Refactors must not break existing functionality
4. **No broken saves** - Save compatibility must be verified before merging to main
5. **PR for every merge to main** - All changes reach main through pull requests

---

## Branch Strategy

### Branch Types

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/export-metrics` |
| `refactor/` | Code restructuring (same behavior) | `refactor/presenter-to-services` |
| `fix/` | Bug fixes | `fix/save-corruption-on-prestige` |
| `phase/` | Multi-part architectural changes | `phase/3-service-layer` |

### Branch Lifecycle

```
1. Create branch from main
2. Work in phases, committing after each
3. Test thoroughly (especially save compatibility)
4. Create PR to main
5. Merge PR (squash or merge commit based on preference)
6. Delete feature branch
```

### Creating a Branch

Before starting any work:

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feature/description-here
```

---

## Commit Strategy

### When to Commit

Commit after completing each **logical phase** of work:

1. **After planning/setup** - New files created, dependencies added
2. **After each component** - A single class/system completed and compiling
3. **After integration** - Components wired together and working
4. **After testing** - Tests written and passing
5. **After documentation** - README/comments updated

### Commit Message Format

Use conventional commits:

```
type: Short description (imperative mood)

Optional longer description explaining:
- What was done
- Why it was done
- Any important details

Breaking changes or notes about save compatibility if relevant.
```

**Types:**
- `feat:` - New feature or functionality
- `refactor:` - Code restructuring without behavior change
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Build, config, or tooling changes

**Examples:**

```
feat: Add IGameStateService interface and implementation

- Wraps Oracle static accessors behind testable interface
- Provides Science, Research, InfinityData access
- Registered via ServiceLocator at startup
```

```
refactor: Migrate FacilityBuildingPresenter to use services

- Replace direct Oracle access with IGameStateService
- Replace FacilityDefinition lookups with IGameDataService
- Behavior unchanged, improves testability
```

```
fix: Resolve null reference in skill tree on fresh save

Save compatibility: Tested with v2.1 saves - no issues
```

### What NOT to Commit

- **Work in progress that doesn't compile** - Stash instead
- **Multiple unrelated changes** - Split into separate commits
- **Generated files** - Already in .gitignore but be mindful
- **Temporary debug code** - Remove before committing

---

## Workflow for Features/Refactors

### Phase 1: Setup

```bash
# Create branch
git checkout main
git pull origin main
git checkout -b feature/my-feature

# After initial setup (new files, interfaces, etc.)
git add .
git commit -m "feat: Add foundation for my-feature

- Created interface definitions
- Added placeholder implementations
- No runtime changes yet"
```

### Phase 2: Implementation (Multiple Commits)

```bash
# After completing first component
git add .
git commit -m "feat(my-feature): Implement ComponentA

- Full implementation of X functionality
- Integrated with existing Y system"

# After completing second component
git add .
git commit -m "feat(my-feature): Implement ComponentB

- Handles edge case Z
- Connected to ComponentA"
```

### Phase 3: Testing & Polish

```bash
# After adding tests
git add .
git commit -m "test: Add unit tests for my-feature

- Tests for ComponentA edge cases
- Mock implementations for isolation"

# After documentation
git add .
git commit -m "docs: Add README and XML docs for my-feature"
```

### Phase 4: Merge to Main

```bash
# Push branch to remote
git push -u origin feature/my-feature

# Create PR via GitHub CLI
gh pr create --title "feat: Add my-feature" --body "..."

# After PR approval/review, merge via GitHub
# Then clean up local branch
git checkout main
git pull origin main
git branch -d feature/my-feature
```

---

## Save Compatibility Checklist

Before creating a PR for any refactor or feature that touches game state:

- [ ] Load a save from the current live version
- [ ] Verify all facilities display correctly
- [ ] Verify all research/skills are intact
- [ ] Verify prestige data is preserved
- [ ] Play for a few minutes to check for runtime errors
- [ ] Save and reload to verify round-trip

If save compatibility is broken:
1. **Do not merge to main**
2. Add migration code if possible
3. Document breaking change clearly in PR

---

## Recovery Procedures

### Undo Last Commit (Not Yet Pushed)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes entirely
git reset --hard HEAD~1
```

### Discard All Local Changes

```bash
# Discard uncommitted changes
git checkout -- .

# Or for a clean slate matching remote
git reset --hard origin/main
```

### Accidentally Committed to Main

```bash
# If not pushed yet
git reset --soft HEAD~1
git stash
git checkout -b feature/correct-branch
git stash pop
git add .
git commit -m "..."
git checkout main
git reset --hard origin/main
```

### Stashing Work in Progress

```bash
# Save current work without committing
git stash push -m "WIP: description"

# List stashes
git stash list

# Restore stashed work
git stash pop
```

---

## GitHub PR Template

When creating PRs, use this structure:

```markdown
## Summary
Brief description of what this PR accomplishes.

## Changes
- Bullet points of specific changes
- Organized by component/area

## Testing
- [ ] Compiles without errors
- [ ] Existing functionality unchanged
- [ ] Save compatibility verified
- [ ] Manual testing completed

## Save Compatibility
- [x] Tested with existing saves
- [ ] Requires migration (explain)
- [ ] Breaking change (explain)

## Related
- Closes #issue (if applicable)
- Part of Phase N (if applicable)
```

---

## Quick Reference

### Daily Workflow

```bash
# Start of session
git status                    # Check current state
git branch                    # Confirm you're on feature branch

# During work (commit often)
git add .
git commit -m "type: description"

# End of session
git push origin branch-name   # Backup to remote
```

### Common Commands

| Command | Purpose |
|---------|---------|
| `git status` | See current changes |
| `git log --oneline -10` | Recent commit history |
| `git diff` | See uncommitted changes |
| `git branch` | List/check branches |
| `git stash` | Temporarily save changes |
| `git checkout -b name` | Create new branch |
| `gh pr create` | Create pull request |

---

## Rules for Claude

When working on this project, I (Claude) will:

1. **Check branch before any changes** - Verify not on main before editing files
2. **Create branch if needed** - Prompt to create appropriate branch if on main
3. **Commit after logical phases** - Not batch everything into one commit
4. **Write descriptive commits** - Explain what and why, not just what
5. **Verify compilation** - Check Unity console before committing
6. **Test save compatibility** - Remind about testing saves before PR
7. **Never force push** - Unless explicitly requested and safe to do so
8. **Create PR for main** - Never commit directly to main
9. **Provide PR links** - Always provide the GitHub PR creation link when ready for review:
   - Format: `https://github.com/BlindsidedGames/IdleDysonSwarm/pull/new/branch-name`
   - Include a brief description of what the PR contains
