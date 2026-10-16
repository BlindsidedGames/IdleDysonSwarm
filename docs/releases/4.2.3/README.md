# 4.2.1–4.2.3 patch notes and 4.2.3 candidate

The in-game Wiki now lists 4.2.3 first, followed by 4.2.2, 4.2.1 and the retained
4.1.11 history. Its English messages and all seven supported translations live
in the normal UI catalogs; compiled English, translated and pseudo-localized
catalogs are generated with `npm run i18n:check`. The established Wiki section,
heading and bullet-list layout is reused without a new UI convention.

## History boundaries

These notes are based on the following main-branch commits, not assumptions
about store release dates. Tracked native metadata jumps from 4.1.11 to 4.2.2
in `120cef28`; there is no separate 4.2.1 marketing-version commit or tag.
Accordingly, the requested 4.2.1 heading retrospectively groups the gameplay
rework preceding Classic/Modern. It does not assert that a 4.2.1 package shipped.

| Notes | Source range | Player-facing changes |
| --- | --- | --- |
| 4.2.1 | `fed35195..c7c81ec1` | Modern progression rework, Beginnings and nine other challenges, seasonal Forager progression, Convergence, offline credit/speed fixes, skill/Tinker fixes, production/research fixes, notices and iOS beta-save discovery. |
| 4.2.2 | `c7c81ec1..455c878c` | Independent Classic/Modern runtimes and saves, automatic migration of the Modern copy, preserved Classic progress, native/Steam Cloud isolation, destination-labelled mode switching and Classic C-1 version identity. |
| 4.2.3 | `455c878c..95e4a82c`, plus this notes/version change | Current-mode reset/import/export, import review and inactive-mode preservation, read-only backup export after a failed save write, timestamp preferences and Settings dialog corrections. |

Key evidence: `bff37d9a` integrated the gameplay rework; `68b05451` refined Forager
and challenge unlocks; `b2dc2c62` capped the candidate at Forager; `c7c81ec1` fixed
iOS beta-save discovery; `120cef28` implemented automatic mode migration;
`455c878c` activated separate native storage and Steam Cloud; `98b9da6f` restored
mode-scoped reset; `95e4a82c` restored current-mode import and reliable export.
The earlier fixes in `4c032bfd`, `ecb0c0a1`, `5487a839`, `04ea41f6` and `24a5023e`
cover Railgun recovery, offline credit/speed, Fracture/Patient Hands, completed
Durability research, and notices/timers. Current code confirms that six challenge
completions reveal Convergence's effect, while all ten unlock its growth.
Farming and later eras remain unavailable in the current player progression;
the notes do not present historical beta Farming work as newly playable content.

## Candidate metadata

`hosts/native-release.json` prepares marketing version **4.2.3** and candidate
**2026101701**. `npm run native:release:sync` generates Android version code
2026101701, Apple build 2610.17.01, and Electron metadata from that source.
Classic remains C-1. This prepares source and build metadata; it does not upload,
release, or publish any store build.

## Verification

- Localization extraction, all seven translation catalogs, ICU structure and
  compiled/pseudo-localized catalogs pass `npm run i18n:check` (2,748 messages
  per supported language). All 19 new messages are present in every catalog.
- Lint, web and native-relative asset builds, Classic integrity/type checks and
  Electron process syntax checks pass. No automated gameplay tests were added
  or run for this copy and metadata change.
- The actual disposable browser game shows 4.2.3, 4.2.2 and 4.2.1 in order,
  with four, four and eight bullets respectively, retaining the older notes.
  All seven translated histories were opened at 150% desktop Interface size.
  The English histories were checked at 80%, 100%, 130% and 150%.
- German and Japanese were checked at 360x800 and 150%, including scrolling to
  the final new bullet. A long German compound initially widened the 4.2.1
  list; clearer wording now wraps within the existing layout. All three new
  sections fit their width in both languages. Chinese/Japanese desktop pixels
  were also inspected for typography and wrapping.
- The Classic source and C-1 identity are unchanged. Physical/native rendering,
  130% system text enlargement, landscape and the full locale/scale matrix
  remain unverified. Asset builds do not establish store or tester availability.
