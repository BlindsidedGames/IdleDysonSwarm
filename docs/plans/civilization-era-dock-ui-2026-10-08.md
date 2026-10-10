# Civilization era controls and Catalyst dock — 8 October 2026

This local UI revision responds to the user's review of `dc989a39`. The economy, workforce allocator, save/reset ownership, automatic Catalyst awards and logarithmic milestone rules have no source changes.

The running Infinity screen was inspected in its collapsed and expanded states, alongside Statistics tabs. The Catalyst footer now directly uses the existing `ProgressControlsPanel` and its settings icon, stable settings cell, accessibility attributes and upward body ordering. Its progress track uses the existing theme palette, divider and track height. The route has a fixed era header, independently scrolling activities and the persistent footer, keeping both era focus and Catalyst status visible above bottom navigation. The details body has a shorter scrolling height limit to leave room for the persistent era controls, including enlarged text and long locales.

Focus uses the existing Simulation segmented-choice styles: all five options are exposed, the selected choice has a prominent fill/border and bold label, and choices wrap into two columns plus a full-width final option on phones. Pointer, Tab/Space, Left/Right and Home/End controls are supported. Selection remains the canonical durable focus; it is not a UI-only choice. Current actual section allocations appear beneath it, sum to the worker population, and update with focus, recruitment and unlocks. Activity disclosures retain individual crew counts and visible input/housing waiting states; allocation is not presented as active production.

Locked activities and wholly locked sections no longer occupy the main activity grid. Their real unlock requirements remain discoverable as a plain noninteractive list in the bottom details body, with no dropdown arrows or fake disabled disclosures. Unlocked activity rows retain their existing right-hand arrow, touching mobile borders and desktop grid. Equipment remains in the native worker-details disclosure. The permanent fracture boost remains beside the era title.

Focus is associated with the displayed Forager era. Only Forager is implemented; the later-era preview remains a preview. This revision does not introduce a speculative multi-era framework or claim that Cultivation can be entered. Collapsing completed eras when a following era actually exists remains future presentation work, alongside the user's direction for different mechanics in later eras.

## Verification and evidence

Actual final screenshots were inspected against the captured Infinity/Statistics references. Browser checks cover early locked and mature unlocked states; all exposed selector choices; exact allocation totals; pointer selection and durable reload; keyboard selection; upward panel expansion/collapse; independent scrolling and last-activity access; 360px/130% text; 320px/200% text with the panel expanded; and long German text with the panel expanded. All captured controls fit inside the viewport, the settings body lies above its collapsed summary, and the last activity is reachable above the dock. Zero browser runtime exceptions; three external promotion requests deliberately blocked. Fresh disposable Chromium profile, mock keychain, initial about:blank with no IndexedDB, loopback-only requests and synthetic/checked-in saves; browser and preview server closed afterward.

The current focused suites pass **32/32: 24 domain and 8 application/UI tests**. The full suite passes **2,163/2,256**, preserving exactly the existing 93 failures, with no new failures or pending tests. TypeScript, build, lint, seven translation checks and ten compiled catalogs pass. Three equipment translations inherited from `dc989a39` needed ICU structure corrections; those translations were corrected without changing the checker or equipment behavior. Native hosts remain unverified. No new performance benchmark was run; the previous direct day-long replay limitation remains.

Parent task `screenshots-era-dock-reference/` holds actual collapsed/expanded Infinity and Statistics reference PNGs. `screenshots-era-dock/` holds four final PNGs, runtime evidence and Library receipts. `evidence-era-dock/` holds the full verification logs and failure-set comparison.

## Review screenshots

| Actual view | Private Library ID |
| --- | --- |
| Early desktop, unlocks in upward details | `libfile_4517724d2b94819181ac45b60d38e161` |
| Mature desktop, focus/distribution and +5% fracture boost | `libfile_a72e9e59e13c8191abe0ea85c50aa7b6` |
| Mobile, exposed focus and Catalyst dock | `libfile_06383f082b448191abccaad1864332e0` |
| German mobile, details expand upward | `libfile_38e0bd4ef3748191b49275d38d3f3b11` |

All four are saved privately to Library; returned metadata was applied to the original PNGs. Full receipts are in the parent task's `screenshots-era-dock/library-manifest.json`.

No push, merge, release, primary-checkout change or native-host launch. The source-grounded progression graph specification from `dc989a39` remains current.

## Allocation polish after parent pixel review

Each section label now sits beside its own allocation count, with a clear gutter and themed vertical separator between groups. The allocation summary itself is the native workforce disclosure: its total and existing arrow remain on the heading line, and opening it retains housing, equipment and confirmation access. The separate Workers row is removed. Combined with removing compounded resource-row spacing, the first actual activity starts at **396.9px** in the final 360×800/130% view. All five focus choices and full tap targets remain exposed.

The affected application/UI suite passes 8/8; TypeScript, build and lint pass. The complete isolated browser checks were rerun with exact distribution totals, workforce details, panel bounds, keyboard selection, durable reload, last-row access, enlarged text and German copy; zero runtime exceptions. The broader 32 focused / 2,163 aggregate passing / 93 baseline failure result above belongs to the preceding revision; unchanged domain tests were not redundantly rerun for this presentation-only polish. No economy source changed.

All four existing private Library identities above were replaced in place with their polished PNGs, preserving history; each now has authoritative current version number **1**. The updated receipts and original-file metadata are retained. Parent pixel review remains the delivery step.
