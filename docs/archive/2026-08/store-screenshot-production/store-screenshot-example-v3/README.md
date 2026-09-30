# Idle Dyson Swarm store screenshot example — v3

This is a presentation-only revision of the approved v2 captures. The six genuine app captures were copied into the compositions without recapturing, scrolling, changing state, or altering their gameplay content.

## Presentation

- Each card uses a dedicated IDS cosmic header above the gameplay capture.
- The header never overlays the app UI; on tablet it spans the full card width.
- The gameplay capture is clipped to the same radius as one complete continuous rounded border.
- Screenshot 1 is a single late-game Bots view and visibly includes Matrioshka Brains, Birch Planets, and Galactic Brains.

## Outputs

- `iphone/01-from-one-bot-to-galactic-brains.png`
- `iphone/02-choose-your-path.png`
- `iphone/03-break-infinity-keep-going.png`
- `tablet/01-from-one-bot-to-galactic-brains.png`
- `tablet/02-choose-your-path.png`
- `tablet/03-break-infinity-keep-going.png`
- `contact-sheet-iphone.png`
- `contact-sheet-tablet.png`

Individual iPhone cards are 1320 × 2868 pixels. Individual tablet cards are 2732 × 2048 pixels. All deliverable PNGs are opaque sRGB images.

## Provenance

- Source repository commit: `e25694743506a1891c51d0259a1dddb84bf642de`
- Bots and Infinity fixture: `mature-infinity` (`7757466ec7b55d505cfafff4c1b4b4a6ebae5daadd529602080a1e1eae902e63`)
- Skills fixture: `maximum-skills` (`576febff052c4a23ff76afa894b8e7f9f039356a2a38dc3ecbe9d2ed5e46a552`)
- Source captures: `../store-screenshot-example-v2/raw/`
- Composition details: `composition.json`
- Exact source checksums and output inventory: `manifest.json`

The source captures were made from Vite on loopback in isolated Chromium profiles. iPhone captures are 1290 × 2796 pixels. Tablet captures used the genuine responsive landscape layout at 1366 × 1024 CSS pixels with device scale factor 2, producing 2732 × 2048 pixels; they are not stretched portrait images. Saves were imported through the production Settings UI, then the Bots, Skills, and Infinity routes were positioned as documented in the v2 evidence. The normal active-time scheduler was held before fixture import so the certified state could not advance or reset during capture.

## Limitations

- These are browser-based campaign prototypes, not final native simulator or physical-device evidence.
- Headlines are English-only and will need localization for a complete campaign.
- The iPhone cards use a review canvas slightly wider than a current App Store upload slot and should be exported to the exact selected device class before submission.

No repository source files or store listings were changed, and nothing was uploaded.
