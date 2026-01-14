---
name: git-workflow
description: Load git workflow rules for safe branching, committing, and PR creation. Use at session start or before git operations.
---

# Git Workflow Skill

This skill loads the project's git workflow rules to ensure safe, consistent version control practices.

## When to Use

- At the start of a coding session
- Before making any git commits
- Before creating pull requests
- When unsure about branching strategy

## Core Rules

### Branch Strategy

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/export-metrics` |
| `refactor/` | Code restructuring (same behavior) | `refactor/presenter-to-services` |
| `fix/` | Bug fixes | `fix/save-corruption-on-prestige` |
| `phase/` | Multi-part architectural changes | `phase/3-service-layer` |

### Before Any Changes

1. **Check current branch**: `git branch`
2. **Never work on main**: If on main, create a feature branch first
3. **Create branch from updated main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/description
   ```

### Commit Strategy

Commit after each **logical phase** of work:
- After planning/setup (new files, interfaces)
- After each component (single class completed)
- After integration (components wired together)
- After testing (tests passing)

### Commit Message Format

```
type: Short description (imperative mood)

Optional longer description explaining:
- What was done
- Why it was done
```

**Types:**
- `feat:` - New feature or functionality
- `refactor:` - Code restructuring without behavior change
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding or updating tests
- `chore:` - Build, config, or tooling changes

### Before Creating PR

- [ ] Code compiles without errors
- [ ] Run `code-simplify` agent on changed files
- [ ] Existing functionality unchanged (for refactors)
- [ ] Save compatibility verified
- [ ] Push branch to remote

### PR Creation

```bash
git push -u origin branch-name
gh pr create --title "type: Description" --body "..."
```

**PR URL format:** `https://github.com/BlindsidedGames/IdleDysonSwarm/pull/new/branch-name`

## Destructive Commands

**NEVER run without explicit user confirmation:**
- `git reset --hard` - Destroys uncommitted changes permanently
- `git clean -fd` - Deletes untracked files
- `git checkout .` - Discards all changes

## Quick Reference

```bash
git status              # Check current state
git branch              # Confirm current branch
git log --oneline -10   # Recent commit history
git diff                # See uncommitted changes
git stash               # Save work temporarily
```

## Recovery

### Undo Last Commit (Not Pushed)
```bash
git reset --soft HEAD~1   # Keep changes
```

### Save Work in Progress
```bash
git stash push -m "WIP: description"
git stash pop             # Restore later
```

## Full Documentation

See `.claude/git-workflow.md` for comprehensive rules including:
- Save compatibility checklist
- PR template
- Recovery procedures
- Detailed workflow examples
