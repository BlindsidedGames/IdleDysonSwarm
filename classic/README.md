# Classic runtime source candidate

This is a complete, independent production source graph from
`0dde63fbaad175362df49feeb981f85dc6af4a5e`. Tests and test helpers are excluded.
The complete source/identity inventory has 681 files; 14 documented local
infrastructure patches add the shared bottom drawer control, scoped presentation
storage, a shared host bridge type declaration, parent save settings, mode-chrome
catalogs and isolated development telemetry. Gameplay engines and data are unchanged.
`baseline.json` records every upstream file's SHA-256 so the extraction and later
Classic maintenance changes can be reviewed. Root code must not import Classic
simulation code into modern or substitute a modern worker/decoder into Classic.

Google Play Production was freshly observed active at `4.1.10 (2026092801)` on
15 October 2026. The release artifact record ties that exact Android build to
this source. Apple publicly lists 4.1.10; local records tie **submitted** build
2609.29.1 to the same gameplay assets. App Store Connect authentication expired,
so the exact currently released Apple build/source is **not freshly verified**.
This is not an assertion that the mobile public baselines are identical.

The foundation does not expose this graph through a production entry point.
Its original composition/bootstrap files are retained as source evidence, not
approved host wiring: they reference historical public storage, Cloud and store
services. Do not launch `classic/src/main.tsx` or those host compositions. The
foundation tests and gated development host instantiate independent Apps and
application/session owners using disposable memory storage, without host account
or real Cloud ports. The development host creates a fresh iframe document for
each mode session; its scratch saves reset when the parent reloads.

Maintain both engines independently. Shared bug fixes can be applied to each
under separate review; no automatic source refresh, modern economy overlay,
reverse migration or deletion of old consumers is permitted. Production
activation requires the Apple baseline check, host discovery/upgrade wiring,
provider-specific mode Cloud wiring and native host QA described in the foundation report.
