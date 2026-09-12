# English Wiki catalog duplication — 12 September 2026

## Scope and protected behavior

The build omits 43 English catalog messages whose exact defaults already ship
in the existing lazy Wiki chunk. It introduces no new route or locale loading
boundary. Checked-in source/compiled catalogs and all nine other locale modules
remain complete. English switching, selected-language startup fallback,
effective language/direction, and the essential-English failure path are owned
by the unchanged locale registry, startup loader and preference provider.

The allowlist comes from `collectWikiAuthoredMessages`, shared with the existing
authored-content merge script: two archive entries, three lore section titles,
and 19 chapter title/body pairs. It is not a prefix filter. In particular,
`wiki.lore.title` and `wiki.lore.introduction` remain in the English catalog.
Every selected source descriptor must match its runtime text and translator
context. The compiled AST must exactly equal one literal containing the raw
default text; changed/missing data, escaped ICU forms or future arguments/tags
fail the build rather than silently selecting a new fallback behavior. This
direct comparison needs no build-time message-parser dependency.

The four production consumers in `WikiSurface` always supply these descriptors.
No production code checks these IDs' catalog presence. The facility presentation
checks for generated Skill technical messages; those and all other Skill entries
are untouched. The metadata stripper does not target `content.ts`.

FormatJS directly uses a supplied default when its catalog entry is absent; it
does not merge another English catalog. Effective English and defaultLocale are
both `en`, so this path produces no missing-translation error. Missing IDs in
non-English/pseudo locales retain their existing error callback and supplied
English default. Failed non-English startup still attempts the ordinary English
chunk, while failed English loading still propagates.

## Verification

Focused tests cover the complete 43-descriptor set in all ten enabled locales,
missing-ID output/error parity, non-English/pseudo startup failures falling back
to effective English, exact transform targeting, preserved neighboring IDs,
nonmutation and fail-closed stale source/compiled data. Together with existing
startup and Wiki-content tests: 32 cases passed. TypeScript, focused lint,
authored-content `--check`, and `git diff --check` passed.

Dedicated Vite builds under `output/performance/wiki-dedup` compare the same
configuration with and without the new plugin, plus native mode. Global build
output was not overwritten.

| Emitted English module | Raw bytes | Gzip bytes | Entries |
| --- | ---: | ---: | ---: |
| Baseline Web | 289,580 | 74,702 | 1,940 |
| Candidate Web | 213,676 | 46,869 | 1,897 |
| Candidate native | 213,676 | 46,869 | 1,897 |

This saves 27,833 bytes gzip (27.18 KiB, 37.26% of the English module), while
remaining above the 30 KiB locale budget. It does not by itself close the boot
JavaScript budget. All three builds' nine other emitted locale modules were
loaded and deep-compared with their checked-in catalogs. Candidate English was
deep-compared with the validated omission result.

The emitted Wiki JavaScript chunk is byte-identical across baseline Web,
candidate Web and candidate native (SHA-256
`fb9c1e9d77868c9e89edafd97a230e3c56ffdeaf190f584b7f69e3f30fbf83d0`). Existing
Wiki runtime code and fallback strings remain in that lazy chunk. Web PWA
precaching still includes it. There is no production SSR/hydration path;
bootstrap uses `createRoot`.

Local reproduction scripts and detailed verification are
`output/performance/wiki-dedup/build.ts`, `verify.ts`, and `verification.json`.
These are local diagnostic artifacts, not new release commands.

The follow-up removal of the build-time parser dependency was reverified with
the same three builds under `output/performance/wiki-dedup-v2`; English module
bytes, entry counts, other-locale equality and Wiki chunk identity are unchanged.

## Runtime cost and remaining acceptance

Using default strings adds FormatJS work when English Wiki content is rendered.
An indicative Node 22/macOS run over all 43 descriptors, using a fresh Intl
cache for each of 40 paired iterations, measured median cold formatting at
0.82 ms versus 0.007 ms with compiled literals; a second pass on the same cache
measured 0.31 ms versus 0.006 ms. These are not browser/mobile acceptance timings.

Actual browser/mobile Wiki rendering, interactions and language switching are
reviewed separately by the parent task. A successful build does not establish
that acceptance. The implementation also requires non-author review before it
is accepted into the campaign checkpoint.

## Browser verification

The integration owner compared the frozen pre-change Web build with the candidate
at 390 px and 1440 px, using the maximum-skills fixture and English → French →
English switches through Settings. All 12 Wiki page observations (Lore and Patch
Notes for each locale/width) had exactly matching article text and structure,
including all 19 lore chapters and both archival patch-note blocks. No formatting
or page errors and no horizontal overflow occurred. Opening a chapter and both
locale switches completed correctly.

Nine full-window screenshots were pixel-identical. The other three differed only
at a few shell/footer/navigation pixels outside the Wiki article. The mobile
English Lore and desktop French Patch Notes screenshots were visually inspected.
The local reproduction and result files are under
`output/performance/wiki-packaging/` and
`output/performance/wiki-packaging-browser-check.ts`; they are browser evidence,
not a native application acceptance claim. The final dependency-free build guard
produces identical Web and native output according to
`output/performance/wiki-dedup-v2/verification.json`.

Integration before the dependency-only guard refinement passed 1,543/1,543 tests,
lint, production build, generated data, Wiki extraction freshness and normal-build
probe exclusion. The final guard refinement passed the focused 32 tests,
TypeScript, lint and both isolated build comparisons again.
