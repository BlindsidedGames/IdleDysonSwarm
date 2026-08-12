# Idle Dyson Swarm

Idle Dyson Swarm is actively developed as the TypeScript/Web application under
[`Web/`](Web/README.md). The Web runtime, canonical game model and `IDSWEB1`
save format are the only supported product direction.

## Historical Unity reference

The Unity project retained in `Assets/`, `Packages/` and `ProjectSettings/` is
deprecated historical reference material. It is not an active game runtime,
release target or forward-compatibility target.

The retained Unity material may still be used to:

- document and test historical gameplay behaviour;
- regenerate or verify legacy content exports and parity fixtures; and
- import existing player `IDB1` saves into the Web application without
  modifying the source save.

New gameplay, numeric systems, save schemas, platform work and releases target
the Web application only. Web saves are not required to load in Unity, and new
work should not modify the Unity runtime unless a narrowly scoped historical
reference or legacy-import task explicitly requires it.

See the [Break Infinity migration plan](Web/docs/break-infinity-migration-plan.md)
for the next numeric-system change.
