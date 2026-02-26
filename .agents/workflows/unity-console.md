---
description: Read Unity Editor console errors via UnityMCP and either explain, plan, or fix them from a /console request.
---

# Unity Console Workflow

Trigger: use when the user asks to check Unity console output, fix Unity errors, explain a specific error, or produce a repair plan.

## Modes
- `explain`: explain root cause and impact without code edits.
- `plan`: provide concrete repair steps without editing.
- default (fix mode): apply targeted fixes.

If both `explain` and `plan` are requested, explain first, then provide plan.

## Step 1: Gather Console Data
1. Read console entries with stack traces.
2. Prioritize `Error`, `Exception`, and `Assert` entries.
3. Group duplicate errors.
4. Prioritize compile/parser errors before runtime null refs.

If no relevant errors exist, report clean console and stop (unless warnings were requested).

## Step 2: Execute by Mode

### Explain Mode
1. Summarize highest-priority error in plain language.
2. Identify likely root cause from stack trace and source location.
3. State impact (build block vs runtime defect).
4. Recommend smallest safe fix path.
5. Stop.

### Plan Mode
1. Provide ordered repair plan with concrete file paths.
2. Include verification steps.
3. Stop and wait for execution request.

### Fix Mode
1. Fix highest-priority error with minimal targeted edits.
2. Trigger Unity refresh/compile when needed.
3. Re-read console and continue until blockers are cleared or product input is required.
4. Avoid speculative refactors unrelated to current errors.

## Output Contract
Always report:
- Mode used.
- Top errors addressed (or explained).
- Files changed (if any).
- Remaining blocking error count.
- Any explicit blocker requiring user input.
