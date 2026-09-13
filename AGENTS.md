# Agent instructions

## Automated browser testing on macOS

- Launch Chrome or Chromium used for automated game tests, performance checks,
  screenshots, or visual QA with `--use-mock-keychain` on macOS.
- Use a disposable, isolated browser profile for these checks. Ensure custom
  launchers and scripts pass the flag; do not assume the automation framework
  supplies it.
- If a test launcher omits the flag, update it before running browser checks.
  These tests must not request access to the user's real macOS Keychain or rely
  on the user repeatedly selecting “Always Allow”.
- Keep this setting scoped to isolated test browsers; do not apply it to the
  user's personal browser profile or sessions that need existing signed-in data.
