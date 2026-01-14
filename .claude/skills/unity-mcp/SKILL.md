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
Use `read_console` to see if there are pre-existing errors before making changes:

```
read_console(action="get", types=["error"])
```

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

### 2. Single Refresh Call with Wait
Use ONE refresh call with `wait_for_ready=true`:

```
refresh_unity(scope="scripts", compile="request", wait_for_ready=true)
```

This call will:
- Trigger asset refresh
- Request compilation
- **Block until Unity is ready** (compilation complete)

**DO NOT** call this multiple times - one call handles everything.

### 3. Check Console AFTER Refresh Completes
Only after the refresh call returns, check for errors:

```
read_console(action="get", types=["error", "warning"])
```

### Common Mistake to Avoid

❌ **Wrong approach (causes issues):**
```
Edit script...
refresh_unity(...)  // Call 1
refresh_unity(...)  // Call 2 - unnecessary!
read_console(...)   // May see stale results
refresh_unity(...)  // Call 3 - still unnecessary!
```

✅ **Correct approach:**
```
Edit script...
[Wait 2-3 seconds for Unity to detect change]
refresh_unity(scope="scripts", compile="request", wait_for_ready=true)
[This blocks until compilation is complete]
read_console(action="get", types=["error", "warning"])
```

### 4. If Connection Times Out
Sometimes the refresh call may timeout if compilation takes too long. In this case:
1. Wait a few seconds
2. Check console directly: `read_console(action="get", types=["error"])`
3. Do NOT retry refresh multiple times

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

### 2. Monitor Compilation
```
read_console(action="get", types=["error"])
```

### 3. Poll Until Ready
```
Loop:
    Read mcpforunity://editor_state
    Check isCompiling field
Until isCompiling == false
```

### 4. Verify No Errors
```
read_console(action="get", types=["error"])
If errors exist: Fix them
```

### 5. Proceed with Next Step
Only after compilation succeeds and no errors exist.

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
1. Read console for errors
2. Identify the error message and file
3. Fix the error
4. Wait for recompilation
5. Verify fix with read_console
```

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
- Wait for `isCompiling` to become false
- Verify no errors before proceeding
- Use `batch_execute` for multiple operations

**DON'T:**
- Make changes while Unity is compiling
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
   → Pause 2-3 seconds (Unity needs time to notice file changes)

5. Single refresh call with wait
   → refresh_unity(scope="scripts", compile="request", wait_for_ready=true)
   → This blocks until compilation is complete
   → DO NOT call multiple times

6. Check console for results
   → read_console(action="get", types=["error", "warning"])
   → If errors exist, fix them and repeat from step 2

7. Proceed to next task
   → Only after confirming no errors
```

**Key Points:**
- ONE refresh call, not multiple
- Wait for Unity to detect file changes before refreshing
- The `wait_for_ready=true` parameter handles the waiting for you
- Check console AFTER refresh completes, not during

This workflow ensures safe, reliable Unity development via MCP.
