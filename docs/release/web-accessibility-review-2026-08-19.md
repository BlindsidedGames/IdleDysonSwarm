# Web accessibility review — 2026-08-19

This review covers the Web build only. Physical TalkBack, VoiceOver, Android
WebView, iOS WKWebView, heat, battery and native lifecycle checks remain outside
this release-readiness phase.

## Automated coverage

The focused accessibility suite now covers Skills, Store, Settings, Debug,
Offline Time, the App's blocked startup recovery/save-attention state, and the
open portaled Settings, Skills, Simulations and Avotation dialogs. Serious and
critical axe findings are treated as failures. Colour contrast is deliberately
disabled in jsdom because jsdom does not calculate real painted colours or
layout; this is not evidence that contrast passes in a browser.

Behavioural tests additionally cover:

- the global selection policy leaving the caret alone whenever an input,
  textarea or other editable element is active;
- recovery text-field labelling and editability;
- Settings save-dialog initial focus, containment, Escape dismissal,
  background isolation and focus restoration;
- Skills dialog initial focus, containment, Escape dismissal and restoration;
- Simulations details-dialog containment, background isolation and restoration;
- the Avotation completion dialog containment, background isolation and
  restoration;
- Offline Time labels, progress semantics, two-step confirmation and
  rapid-tap admission protection;
- Store loading/success status announcements and assertive failure
  announcements; and
- localized, visible route-loading status messages.

The responsive styles include narrow layouts at 40 rem, 560 px, 480 px,
390 px and 360 px where the relevant surface needs them. Interactive controls
on the reviewed surfaces use the shared minimum touch target or a larger
surface-specific minimum. These source assertions are useful regression
evidence, but they do not prove rendered reflow or hit-area size.

## Fixes made in this phase

- Settings save dialogs now render at the document modal layer. Everything
  behind the dialog becomes inert until it closes, rather than only the
  Settings content becoming inert while global navigation remained reachable.
- Simulations details dialogs now isolate the document background and restore
  focus after that isolation is removed.
- The Avotation completion dialog now manages initial focus, contains Tab,
  supports Escape, isolates the background and restores the prior focus.
- Store failures and cancellations use an assertive alert; success and loading
  messages remain polite statuses.
- Hard-coded connector and disclosure-chevron transitions are removed when the
  user requests reduced motion.
- The reviewed route surfaces gained dedicated automated accessibility scans,
  and Offline Time gained a rapid-confirmation regression test.

## Phase 9 browser acceptance still required before Web release

Run these checks in the production Web build with representative fresh,
mid-game and late-game saves:

1. Navigate every reachable control using keyboard only. Confirm that focus is
   visible, ordered sensibly and never trapped outside an open modal.
2. Open and close every dialog using its button, Escape and pointer dismissal
   where supported. Confirm focus returns to the initiating control.
3. Type, paste, select and edit in recovery, import, export, Debug and Skills
   preset fields in Chromium, Firefox and Safari where available.
4. Enable reduced motion and verify that functional progress remains legible
   while decorative movement and transitions stop.
5. Check actual computed colour contrast, including focus indicators, disabled
   controls, alerts and text over images.
6. Check browser text scaling at 200 percent and page zoom at 400 percent.
7. Check 320 px and 390 px CSS-wide layouts for horizontal overflow, clipped
   controls, obscured focus and modal reflow.
8. On a touch-capable browser, verify target size and repeated/rapid activation
   for purchases, destructive save actions, Offline Time spending, resets and
   other asynchronous commands.

Automated jsdom results must not be used to claim that contrast, real layout,
zoom, touch geometry or browser focus painting passed. Those require the
browser checks above.
