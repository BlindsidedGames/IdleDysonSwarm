# Agent instructions

## Deployment shorthand

- When Matthew says **“deploy to internal”**, deploy the current changes to all
  three destinations: upload and release to **Google Play internal testing**;
  upload to **App Store Connect** and make the build available to **Internal
  TestFlight** testers; and upload and activate the build on the **Steam beta
  branch**. No separate request for each platform is needed.
- Verify tester availability on each platform and report any processing,
  authentication, or other blockers. This does not authorize production releases,
  App Review submissions, Steam live promotion, or website deployment. An explicit
  narrower scope overrides this shorthand.

## Game artwork

- Before creating or changing skill/augment icons or related game symbols, read
  [the icon artwork workflow](docs/skill-icon-artwork.md). Start with the original
  high-resolution masters and reuse their shapes; do not imitate runtime thumbnails.

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

## App promotions

- Before changing the game catalog, banner workflow, or offline promotion cache, read [docs/website-managed-promotions.md](docs/website-managed-promotions.md). The website owns catalog content; IDS ships a verified fallback.
