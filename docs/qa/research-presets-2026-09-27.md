# Research preset quick actions — 27 September 2026

Research now shares the existing Skills/Bots preset selection and confirmation
component. Its device-local **Always show preset quick actions** preference is
independent of Bots and defaults off. Expanded purchase settings always show
available preset controls; the preference retains them above the production
summary when collapsed. The shared Skills option enables slots 6–10 here too.
Research settings expand upward, matching Bots, without an internal scroll cap.

## Verification

- Full suite: 194 files / 2,042 tests; production build/TypeScript, lint and
  localization checks passed. Focused regression coverage checks independent
  defaults, expanded/collapsed placement, single rendering and remount persistence.
- Live Chromium used a disposable profile with `--use-mock-keychain` on port
  5194. The user's port-5193 save was not changed.
- Enabled ten slots through Skills settings, opened Research settings, selected
  preset 10, enabled its always-show toggle and collapsed settings. Navigated to
  Bots to confirm its controls remained hidden, then back to Research.
- After a normal autosave checkpoint, reloaded and verified Research's visibility
  preference and selected preset 10 remained intact.
- Inspected desktop 1280×900 and narrow 360×780 at 130% text, including German.
  Both preset rows use 32px buttons. Expanded settings, production, allocation and
  navigation fit without a nested scrollbar; collapsed controls match Bots.
- Reviewed shared command availability, challenge restrictions, selection flow,
  preference isolation, localization and conditional placement. No gameplay or
  save-schema changes were needed.

Evidence: [desktop](research-presets/desktop.png),
[narrow expanded German](research-presets/narrow-german.png).

Native iOS/Android/Electron interactions were not rerun for this UI change.
No merge, deployment or store changes were performed.
