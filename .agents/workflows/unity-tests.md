---
description: Run Idle Dyson Swarm Unity tests through the project-scoped licensing-safe wrapper.
---

# Unity Test Workflow

Use this workflow for every command-line Unity test invocation in this repository.
Do not launch the Unity executable directly.

## Required launcher

```bash
Tools/Unity/run-tests.sh \
  --platform EditMode \
  --filter Tests.Systems.NumericSafetyTests \
  --results /tmp/idle-dyson-numeric.xml \
  --log /tmp/idle-dyson-numeric.log
```

Run the wrapper outside a restricted filesystem/process sandbox when the host
requires approval for Unity. Unity must create local IPC sockets and launch its
bundled licensing helper.

Do not add `-quit`. Unity Test Runner performs its own batch shutdown; combining
`-quit` with `-runTests` can return success before tests execute or results are
written.

## Safety behavior

The wrapper:

1. Refuses to run while this project is open in another Unity Editor.
2. Waits for a disconnected Unity `6000.5.5` licensing helper to exit normally.
3. Terminates only the exact bundled `6000.5.5` helper when:
   - no `6000.5.5` Unity Editor is running;
   - the helper command uses the exact version-scoped pipe;
   - its parent is absent or PID 1; and
   - it remains alive after the normal exit-timer grace period.
4. Never signals Unity Hub's generic licensing client and never edits or deletes
   license, mutex, socket, or IPC artifacts.
5. Verifies a passing NUnit XML result instead of trusting Unity's process code.
6. Retries once only for a confirmed licensing-startup failure.
7. On interruption, terminates the Unity process it launched and performs the
   same narrowly scoped orphan check.

## Benign warning

Unity Hub `3.19.5` currently exposes generic Licensing Client `1.17.4`. Unity
Editor `6000.5.5f1` first probes that endpoint with protocol `1.18.1`, so the log
may contain HTTP-style response `505` / “Unsupported protocol version
`1.18.1`”. This is benign when the editor then launches and successfully
handshakes with its bundled version-scoped `1.18.1` client.

## Failure handling

- Existing project editor: close the GUI Editor, then rerun.
- Verified orphan ignores SIGTERM: stop and report the exact PID; do not use
  broader process killing or delete licensing artifacts.
- Test/compile failure: inspect the requested log; do not retry as licensing.
