---
description: Turn local working-tree changes into a clean record on the default branch by committing, creating a PR, and squash-merging.
---

# Git Auto PR ("/git commit")

Goal: turn local working-tree changes into a clean record on the default branch.

## Preflight
1. Confirm repo root: `git rev-parse --show-toplevel`.
2. Inspect local changes: `git status -sb` and `git diff --stat`.
3. Fetch remotes: `git fetch origin`.
4. Confirm GitHub CLI access: `gh auth status` and `gh repo view`.

## Understand Changes and Draft Messages
5. Review `git diff` (and `git diff --cached` if needed).
6. Draft:
   - PR title / commit subject in Conventional Commit style.
   - PR body / commit body with what changed, why, test notes, and risks.

## Test Context
7. From the repository root, run the proportionate automated gates, including `npm run data:check`, focused tests, lint, and the production/native build where relevant.

## Execute
8. Create and checkout branch `codex/<slug>` derived from PR title.
9. Stage only the reviewed paths in scope; inspect the staged diff before committing.
10. Commit with drafted message.
11. Push branch.
12. Create PR to default branch via `gh pr create --title "..." --body "..."`.
13. Merge with squash via `gh pr merge --squash --delete-branch`.
   - If blocked by branch rules, enable auto-merge and report block reason.

## Report Back
Always report:
- Branch name used.
- Commit SHA and exact message.
- PR URL and exact title/body.
- Merge result and final SHA.
- Testing context.
