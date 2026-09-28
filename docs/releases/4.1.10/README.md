# 4.1.10 store drafts

Original drafts prepared 27 September 2026. The sections below describe that
initial preparation; see the 29 September status below for current submissions.

## Apple

[Version draft](https://appstoreconnect.apple.com/apps/1631060225/distribution/ios/version/inflight)
is **Prepare for Submission**, with manual release selected. What's New is saved
and checked in all eight existing locales using `apple-whats-new.json`.
Review notes describe the late-game unlock and existing purchase/restoration paths.
Existing screenshots, listing copy and ratings were retained.

**Build blocker:** 2609.27.1 and the other existing 4.1.10 uploads are Internal
TestFlight-only and disabled in the App Store build picker. The latest export
uses `testFlightInternalTestingOnly=true`. A normal App Store-distribution upload
must be processed and selected before submission. No older build was substituted.

## Google Play

[Production draft](https://play.google.com/console/u/0/developers/8315705273233616064/app/4975918856678556086/tracks/4697498331189407562/releases/85/prepare)
is saved as **4.1.10 (2026092701)** using the existing internal-tested bundle.
`google-release-notes.txt` is saved for all eight listing languages, within the
500-character per-language limit. Nothing was sent for review.

## Steam

[Announcement preview](https://steamcommunity.com/games/4348570/partnerevents/preview/689769594581157686)
is **Hidden, Unpublished**, with description and required cover artwork complete.

- Title: **4.1.10 — Transcendence, challenges and new augments**
- Subtitle: Discovery, Elevation and Enlightenment arrive alongside seven Quantum challenges.
- Summary: Three linked Discovery bars, seven Quantum challenges, fourteen new augments, persistent speedrun records and a stack of fixes.
- Body: `steam-announcement.txt` (Steam BBCode).
- Cover: existing approved `steam-art-v3/assets/store-main-1232x706.png`, cropped
  and resized in Steam to 800×450, preserving the title and star artwork.
- Event ID: `689769594581157686`; announcement ID: `689769594581157687`.

No publication or future publication schedule was activated. Publish alongside
the eventual public build, after Matthew approves release.

## Final release follow-up

- Achievements remain a design discussion; none were implemented or configured.
- The current binaries precede the latest in-game patch-note rewrite (4bbe1def).
  Store notes here use that approved rewrite. Include it in the final binaries.
- If achievements are approved, build and test their implementation and complete
  provider configuration before replacing the candidate builds in these drafts.
- Recheck final build selection and announcement copy before authorized release.
- Saved console screenshots are in `evidence/`.

## 29 September review submission status

Android 2026092801 is in review with managed publishing on. Apple 2609.29.1
is uploaded, processed and attached with manual release selected, but is not yet
submitted: export-compliance confirmation needs a manual click. Five Apple
achievements are staged in the draft submission. Google achievement publication
is awaiting a decision because Play Games publishes independently of the app hold.
Permanent 2× Bots is approved/available on Apple and active on Google.
See the [release ledger](../../platform/release-ledger.md) for evidence and limits.
