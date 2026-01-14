---
name: unity-console
description: Check Unity Editor console for errors, warnings, and logs. Use this to verify compilation status, diagnose issues, or monitor Unity state.
tools: mcp__UnityMCP__read_console, mcp__UnityMCP__refresh_unity
---

# Unity Console Check Skill

Quick access to Unity Editor console messages for monitoring compilation and runtime status.

## When to Use

- After modifying C# scripts (check for compilation errors)
- When something isn't working as expected
- To verify a fix resolved warnings/errors
- Before committing code changes

## Commands

### Check Errors and Warnings (Default)
```
/unity-console
```
Shows recent errors and warnings - the most common use case.

### Check All Messages
```
/unity-console all
```
Shows errors, warnings, and info logs.

### Check Only Errors
```
/unity-console errors
```
Shows only error messages.

### Clear Console
```
/unity-console clear
```
Clears the Unity console.

## Workflow

1. **After Script Changes:** Run `/unity-console` to check for compilation errors
2. **If Errors Found:** Read the error messages, fix issues, then check again
3. **Before Commits:** Verify console is clean (no errors, ideally no warnings)

## Common Warning Types

### CS0114 - Method Hiding
```
warning CS0114: 'ChildClass.Method()' hides inherited member 'ParentClass.Method()'
```
**Fix:** Add `override` keyword if intentional, or `new` keyword if hiding is desired.

### CS0649 - Unassigned Field
```
warning CS0649: Field 'fieldName' is never assigned
```
**Fix:** Either assign the field, add `[SerializeField]` if set in Inspector, or remove if unused.

### CS0108 - Member Hiding
```
warning CS0108: 'Member' hides inherited member
```
**Fix:** Similar to CS0114 - use `override` or `new` keyword.

## Integration with Git Workflow

Per the project's git rules, always check the console before committing:
1. Run `/unity-console`
2. Fix any errors (required)
3. Address warnings if reasonable (recommended)
4. Proceed with commit
