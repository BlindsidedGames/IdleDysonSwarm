---
name: session-start
description: Initialize a coding session by loading git workflow rules and checking Unity console status. Run this at the start of each session.
---

# Session Start Skill

Initialize your coding session with essential context and status checks.

## What This Skill Does

1. **Loads Git Workflow Rules** - Ensures safe branching and commit practices
2. **Checks Unity Console** - Identifies any existing errors or warnings
3. **Verifies Current State** - Confirms branch status and working tree

## Usage

Run at the start of each coding session:
```
/session-start
```

## Session Checklist

### 1. Git Status Check

First, verify your git state:

```bash
git status
git branch
```

**Expected state:**
- On a feature/refactor/fix/phase branch (NOT main)
- Working tree clean, or with intentional uncommitted changes

**If on main:** Create a branch before making changes:
```bash
git checkout -b feature/description
```

### 2. Unity Console Check

Check for pre-existing compilation errors:

```
read_console(action="get", types=["error", "warning"], count=20)
```

**Expected state:**
- No errors (compilation successful)
- Warnings are acceptable but should be addressed if reasonable

**If errors exist:** Fix compilation errors before starting new work.

### 3. Review Recent History

Understand what was done previously:

```bash
git log --oneline -5
```

## Workflow Rules Summary

### Branch Types
- `feature/` - New functionality
- `refactor/` - Code restructuring
- `fix/` - Bug fixes
- `phase/` - Multi-part changes

### Commit Types
- `feat:` - New feature
- `refactor:` - Restructuring
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Config/tooling

### Core Principles
1. Never work directly on main
2. Commit after each logical phase
3. Verify compilation before commits
4. Run code-simplify before PRs
5. Test save compatibility before merging

## Quick Actions

### Start New Feature
```bash
git checkout main && git pull origin main
git checkout -b feature/my-feature
```

### Resume Work
```bash
git status                    # Check state
git stash list               # Check for stashed work
git stash pop                # Restore if needed
```

### Before Committing
1. Run `/unity-console` to verify no errors
2. Stage changes: `git add .`
3. Commit: `git commit -m "type: description"`

## Related Skills

- `/unity-console` - Check Unity Editor console
- `/unity-mcp` - Unity MCP expert guidance
- `/git-workflow` - Detailed git workflow rules

## Full Documentation

- Git workflow: `.claude/git-workflow.md`
- Service layer: `Assets/Scripts/Services/README.md`
- Project instructions: `CLAUDE.md`
