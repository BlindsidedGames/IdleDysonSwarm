# Classic source maintenance

- This is an independently maintained gameplay graph. Read `README.md` and
  `baseline.json` before changing it. Apple public source verification is pending.
- Never substitute modern commands, simulation data, schema migration, offline
  policy, Reality/Quantum/Simulations logic, or Stored Time workers into Classic.
- Preserve old SR Workers consumers. The modern target gap is a separate balance
  decision, not a reason to retarget Classic or modern augments here.
- Shared navigation chrome may use the root mode control/context; it must not
  import modern gameplay. Gameplay UI edits still follow the root IDS UI skill.
- Record deliberate patches in `baseline.json` with their reason and current
  hash, retaining the original upstream hashes. Run `npm run modes:check`.
- Do not execute the retained historical bootstrap/host composition against live
  storage. It is source provenance, not the new dual-mode production entry point.
