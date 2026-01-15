---
name: unity-mcp
description: Expert guidance for Unity development using Unity MCP server. Use when making C# script changes, working with GameObjects, components, scenes, or Unity editor operations. Provides safe workflows for compilation monitoring, asset management, and error handling.
---

# Unity MCP Skill

Expert guidance for interacting with Unity Editor via the Unity MCP server.

## When to Use This Skill

This skill is automatically invoked when working with Unity projects. It provides best practices for:
- Making script changes and monitoring compilation
- Working with GameObjects, components, and scenes
- Querying Unity state efficiently
- Avoiding common pitfalls with Unity MCP

## Before Making Changes

### 1. Check Editor State
Always verify Unity isn't compiling before making changes:

```
Read resource: mcpforunity://editor_state
Check: isCompiling field
If true: Wait before proceeding
```

### 2. Check for Existing Errors
**IMPORTANT:** The console may contain stale data. Always refresh before reading:

```
refresh_unity(scope="scripts", compile="request", wait_for_ready=false)
[Wait 10-15 seconds for compilation to complete]
read_console(action="get", types=["error"])
```

**NOTE:** Use `wait_for_ready=false` due to a known bug where `wait_for_ready=true` causes Unity to loop refreshes repeatedly. Handle the wait client-side instead.

This ensures you see current compilation errors, not cached/stale results.

### 3. Verify Scene Context
Check which scene is active:

```
manage_scene(action="get_active")
```

## After Script Changes

### CRITICAL: Wait for Compilation

**DO NOT call refresh_unity or read_console multiple times in quick succession.**

Unity needs time to detect file changes and compile. The proper workflow is:

### 1. Wait for Unity to Detect Changes (3-5 seconds)
After editing a script, Unity needs a moment to detect the file change and begin compilation. **Do not immediately call refresh or check console.**

### 2. Single Refresh Call (CALL ONLY ONCE!)
Use **exactly ONE** refresh call with `wait_for_ready=false`:

```
refresh_unity(scope="scripts", compile="request", wait_for_ready=false)
```

⚠️ **CRITICAL: Always use `wait_for_ready=false`** - there is a known bug where `wait_for_ready=true` causes Unity to loop refreshes repeatedly until timeout.

This call will:
- Trigger asset refresh
- Request compilation
- Return immediately (you handle the wait)

⚠️ **CRITICAL: Call refresh_unity ONLY ONE TIME per script modification cycle.**

**DO NOT:**
- Call refresh_unity multiple times
- Call refresh_unity again if the first call times out
- Call refresh_unity repeatedly to "check" if compilation is done
- Use `wait_for_ready=true` (causes looping bug)

One call handles everything.

### 3. MANDATORY 10-15 SECOND WAIT After Refresh (CRITICAL)
**After `refresh_unity` returns, you MUST wait at least 10-15 seconds before making ANY other MCP calls.**

This is non-negotiable. Unity needs time to:
1. Detect the compilation request
2. Compile scripts
3. Perform domain reload
4. Stabilize internal state

Making MCP calls too quickly can cause:
- Stale or incomplete results
- Connection issues
- Corrupted editor state

**Simply pause and wait. Do not try to check status, read resources, or call any MCP tools during this wait window.**

### 4. Check Console AFTER the 10-Second Wait
Only after waiting the full 10 seconds, check for errors:

```
read_console(action="get", types=["error", "warning"])
```

**Why refresh before read_console?** The Unity console is not automatically updated when files change on disk. Without calling `refresh_unity` first, `read_console` may return stale/cached results that don't reflect the current compilation state. The refresh triggers Unity to:
1. Detect file changes
2. Recompile scripts
3. Update the console with new errors/warnings

Only after this process completes will `read_console` show accurate results.

### Common Mistake to Avoid

❌ **Wrong approach (causes issues):**
```
Edit script...
refresh_unity(...)  // Call 1
refresh_unity(...)  // Call 2 - WRONG! Never call twice!
read_console(...)   // Too soon - will see stale results
refresh_unity(...)  // Call 3 - WRONG! Stop calling refresh!
```

❌ **Also wrong (impatient checking):**
```
Edit script...
refresh_unity(...)
[Wait 2 seconds]    // Not long enough!
read_console(...)   // Too soon - Unity still settling
```

✅ **Correct approach:**
```
Edit script...
[Wait 3-5 seconds for Unity to detect change]
refresh_unity(scope="scripts", compile="request", wait_for_ready=false)  // ONE call only!
[MANDATORY: Wait 10-15 seconds - no MCP calls during this time]
read_console(action="get", types=["error", "warning"])
```

**Remember: ONE refresh call (with wait_for_ready=false), then 10-15 seconds of silence, then check console.**

### 5. After the Wait
After waiting 10-15 seconds:
1. Check console: `read_console(action="get", types=["error"])`
2. If Unity is still compiling, wait a few more seconds and check again
3. **Do NOT call refresh_unity again** - one call is enough

## Resource vs Tool Usage

**Golden Rule: Read with resources, modify with tools**

### Resources (Read-Only)
- `mcpforunity://editor_state` - Check compilation status, play mode, etc.
- `mcpforunity://project_info` - Project name, paths, Unity version
- `mcpforunity://custom-tools` - Project-specific custom tools (check this FIRST!)
- `mcpforunity://scene/hierarchy` - Scene hierarchy
- `mcpforunity://instances` - Active Unity instances

### Tools (Modifications)
- `manage_script` - Create, read, delete scripts
- `manage_gameobject` - GameObject CRUD operations
- `manage_components` - Add/remove/modify components
- `manage_scene` - Scene operations
- `manage_asset` - Asset operations
- `read_console` - Check Unity console messages

## Performance Best Practices

### Use Paging for Large Queries

**Scene Hierarchy:**
```
manage_scene(
    action="get_hierarchy",
    page_size=50,
    cursor=0
)
// Follow next_cursor until null
```

**GameObject Components:**
```
manage_gameobject(
    action="get_components",
    target="12345",
    search_method="by_id",
    include_properties=false,  // Start with metadata only
    page_size=10
)
```

**Asset Searches:**
```
manage_asset(
    action="search",
    path="Assets",
    page_size=25,
    generate_preview=false  // IMPORTANT: Avoid large base64 payloads
)
```

### Recommended Page Sizes
- Components with properties: 3-10 items
- Components without properties: 10-25 items
- Scene hierarchy: 50 items
- Asset searches: 25-50 items

### Always Disable Previews
Set `generate_preview=false` in asset searches unless you explicitly need thumbnails (they add large base64 blobs to responses).

## GameObject Targeting

**Prefer instance ID (most reliable):**
```
target="12345"
search_method="by_id"
```

**Hierarchy path (good for known structures):**
```
target="Player/Hand/Weapon"
search_method="by_path"
```

**By name (finds first match):**
```
target="Player"
search_method="by_name"
```

**By tag:**
```
target="Enemy"
search_method="by_tag"
```

**By component type:**
```
target="Rigidbody"
search_method="by_component"
```

## Component Workflow

### Safe Component Modification Pattern

1. **Check if component exists:**
```
manage_gameobject(
    action="get_components",
    target="12345",
    search_method="by_id",
    include_properties=false
)
```

2. **Add component if needed:**
```
manage_components(
    action="add",
    target="12345",
    search_method="by_id",
    component_type="Rigidbody"
)
```

3. **Set component properties:**
```
manage_components(
    action="set_property",
    target="12345",
    search_method="by_id",
    component_type="Rigidbody",
    property="mass",
    value=10.0
)
```

## Scene Management

### Creating New Scenes
Always include essential components:
```
1. Create scene
2. Add Main Camera
3. Add Directional Light
4. Save scene
```

### Before Major Operations
Save the scene:
```
manage_scene(action="save")
```

### Visual Verification
Take screenshots to verify results:
```
manage_scene(
    action="screenshot",
    screenshot_file_name="verification.png"
)
```

## Script Management Workflow

### 1. Create Script
```
create_script(
    path="Assets/Scripts/MyScript.cs",
    contents="using UnityEngine;\n\npublic class MyScript : MonoBehaviour\n{\n    // Implementation\n}"
)
```

### 2. Wait for Unity to Detect Changes
```
[Wait 3-5 seconds for Unity to notice the new file]
```

### 3. Trigger Refresh and Compilation
**CRITICAL:** You must refresh before checking console - the console won't update automatically!
```
refresh_unity(scope="scripts", compile="request", wait_for_ready=false)
```

**NOTE:** Always use `wait_for_ready=false` due to a known looping bug with `wait_for_ready=true`.

### 4. Wait for Stabilization
```
[MANDATORY: Wait 10-15 seconds - no MCP calls during this time]
```

### 5. Check for Compilation Errors
```
read_console(action="get", types=["error"])
If errors exist: Fix them and repeat from step 1
```

### 6. Proceed with Next Step
Only after compilation succeeds and no errors exist.

**Note:** Skipping step 3 (refresh) before step 5 (read_console) is a common mistake. The console will show stale data without a refresh first!

## Custom Tools

**ALWAYS check custom tools first:**
```
Read resource: mcpforunity://custom-tools
```

Projects may register custom tools for specific workflows. These take precedence over generic MCP tools.

## Common Patterns

### Finding GameObjects by Criteria
```
find_gameobjects(
    search_method="by_name",
    search_term="Player",
    include_inactive=false,
    page_size=10
)
```

### Batch Operations
Use `batch_execute` for multiple operations (10-100x faster):
```
batch_execute(
    commands=[
        {"tool": "manage_gameobject", "params": {...}},
        {"tool": "manage_components", "params": {...}},
        {"tool": "manage_components", "params": {...}}
    ]
)
```

### Safe Property Access
Always verify properties exist before setting:
```
1. Get component with include_properties=true
2. Check if property exists in properties dictionary
3. Set property value
```

## Error Handling

### Compilation Errors
```
1. Call refresh_unity(scope="scripts", compile="request", wait_for_ready=false)
2. Wait 10-15 seconds for compilation to complete
3. Read console: read_console(action="get", types=["error"])
4. Identify the error message and file
5. Fix the error in the script
6. Repeat steps 1-3 to verify the fix
```

**IMPORTANT:** Always refresh before reading console! Without refresh, the console may show outdated errors that have already been fixed, or miss new errors from recent changes.

### Missing Components
```
1. Check if component exists on GameObject
2. If missing, add component first
3. Then set properties
```

### Asset Not Found
```
1. Use manage_asset(action="search") to find asset
2. Verify path is correct
3. Check if asset exists in project
```

## Multiple Unity Instances

If multiple Unity editors are running:

1. **List instances:**
```
Read resource: mcpforunity://instances
```

2. **Set active instance:**
```
set_active_instance(instance="ProjectName@hash")
```

## Best Practices Summary

**DO:**
- Check `mcpforunity://custom-tools` first
- Read `editor_state` before making changes
- Use paging for large queries
- Disable previews in asset searches
- Target by instance ID when possible
- Monitor compilation after script changes
- Call `refresh_unity` exactly ONCE per modification cycle
- Wait a FULL 10 SECONDS after refresh before any MCP calls
- Always call `refresh_unity` BEFORE `read_console` (console doesn't auto-update!)
- Verify no errors before proceeding
- Use `batch_execute` for multiple operations

**DON'T:**
- Make changes while Unity is compiling
- Call `refresh_unity` multiple times (ONE call only!)
- Make MCP calls within 10 seconds of refresh completing
- Retry refresh if it times out (just wait and check console)
- Call `read_console` without `refresh_unity` first (console may be stale!)
- Use large page sizes (causes token bloat)
- Enable previews unless needed
- Proceed without checking for errors
- Assume compilation succeeded
- Target by name when ID is available
- Skip checking custom tools

## Example: Complete Script Modification Workflow

```
1. Check existing state (optional but recommended)
   → read_console(action="get", types=["error"])
   → Verify no pre-existing errors

2. Read script content
   → Read("Assets/Scripts/MyScript.cs")

3. Modify script
   → Edit(...) or script_apply_edits(...)

4. WAIT for Unity to detect changes
   → Pause 3-5 seconds (Unity needs time to notice file changes)

5. Call refresh_unity EXACTLY ONCE
   → refresh_unity(scope="scripts", compile="request", wait_for_ready=false)
   ⚠️ ALWAYS use wait_for_ready=false (wait_for_ready=true has a looping bug)
   ⚠️ NEVER call this again - one call only!

6. MANDATORY 10-15 SECOND WAIT (NON-NEGOTIABLE)
   → After refresh returns, wait 10-15 seconds
   → Do NOT make any MCP calls during this time
   → Do NOT check editor_state, console, or any resource
   → Just wait - Unity is compiling and stabilizing

7. Check console for results
   → read_console(action="get", types=["error", "warning"])
   → If errors exist, fix them and repeat from step 2

8. Proceed to next task
   → Only after confirming no errors
```

**Key Points:**
- ⚠️ **ALWAYS use `wait_for_ready=false`** - the `wait_for_ready=true` option has a bug that causes looping refreshes
- ⚠️ **ONE refresh call per modification cycle - NEVER call it multiple times**
- ⚠️ **MANDATORY 10-15 second wait after refresh before ANY MCP calls**
- Wait for Unity to detect file changes before refreshing
- Handle the compilation wait client-side (since wait_for_ready=false)
- Check console AFTER the wait period, not immediately after refresh

This workflow ensures safe, reliable Unity development via MCP.
