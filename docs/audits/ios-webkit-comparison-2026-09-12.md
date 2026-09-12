# iOS WebKit comparison against 4.1.8 — 12 September 2026

The untouched 4.1.8 checkout `878f5bff` was built in native mode into an isolated output directory. It was compared with the final candidate-v6 native-mode web output in a dedicated iPhone 15 Pro simulator running iOS 17.5, at 393 × 852 CSS pixels. The primary checkout remained clean. Neither build was modified for the probe.

A standalone WKWebView app used nonpersistent website storage and separate local HTTPS ports. It imported only the checked-in maximum-skills fixture through Settings. Ten observations per build covered fresh Bots; maximum-skills Bots and Research controls; the Skills tree; and Wiki patch notes/lore through English → French → English.

All ten paired observations had exactly equal selected-surface text, rectangles, control labels/states and image inventories. There was no horizontal overflow and no captured JavaScript, promise or console error. All 105 mounted Skills images and 11 Research images loaded in each build. Both fixture imports succeeded. Single automation toggles changed state; three rapid subsequent toggles settled at the original state, identically in Bots and Research.

All six paired Wiki screenshots were pixel-identical. Other full-view differences were limited to changing resource-header numbers in Bots/Research, the fresh Bots gear transition, and 157 Skills pixels with at most five intensity levels of channel difference. Fresh Bots and Skills before/after images were visually inspected, as were candidate Bots, Research, English lore and French patch notes. No introduced layout or appearance regression was found in these views.

The [machine-readable comparison](ios-webkit-comparison-2026-09-12.json) records complete build fingerprints, each observation, interaction results and pixel counts. Raw screenshots, surface JSON, Swift/JavaScript probe sources and local serving code are under `output/performance/ios-ui-qa`. The first HTTP attempt could not load resources because the unchanged CSP upgrades insecure requests; the successful probe used HTTPS with trust restricted to localhost in this disposable app. No production CSP change was made.

This is an iOS WebKit web-UI comparison, not acceptance of the signed Capacitor application, native purchases/cloud services, a physical device, or every game screen. Controls were activated through DOM handlers; physical touch hit-testing was not exercised. The dedicated simulator was terminated, shut down and deleted, and both local servers were stopped. No user save or existing simulator installation was accessed.
