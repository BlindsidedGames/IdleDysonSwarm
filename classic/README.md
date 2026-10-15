# Classic runtime source candidate

This is a complete, independent production source graph from
`0dde63fbaad175362df49feeb981f85dc6af4a5e`. Tests and test helpers are excluded. The complete source/identity inventory has 681 files; two documented local patches add only the shared bottom drawer mode control.
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
foundation tests instantiate application/session owners using disposable memory
storage, no host account or Cloud ports. Actual integration must compose the
verified Classic graph with the new mode controller and isolated mode storage.

Maintain both engines independently. Shared bug fixes can be applied to each
under separate review; no automatic source refresh, modern economy overlay,
reverse migration or deletion of old consumers is permitted. Production
activation requires the Apple baseline check, host discovery/upgrade wiring,
mode-scoped Cloud policy and native host QA described in the foundation report.
