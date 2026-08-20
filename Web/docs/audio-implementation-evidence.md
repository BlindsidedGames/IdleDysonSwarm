# Cross-platform audio implementation evidence

## Scope and ownership

Audio is owned once by `src/audio/ProductionGameAudioService`, outside React rendering and the canonical 10 Hz gameplay snapshot. The production host composition selects either the Web backend (Browser/PWA/Electron) or the project-owned Capacitor plugin (iOS/Android). Preferences use device-local `localStorage` key `idle-dyson-swarm.audio.v1`; they are not part of portable gameplay saves.

Playback does not start at application construction. The first enabled semantic action establishes user intent, starts the soundtrack, and plays the button cue. Disabled controls, range sliders, opted-out elements, and non-semantic pointer events do not cue. Music pauses whenever the shared lifecycle leaves `active` and resumes only when playback intent already existed. A single controller, persistent music player, preloaded cue player/buffer, in-flight play guard, and 35 ms Web cue throttle prevent duplicate players, start races, allocation churn, and excessive overlap.

## Delivery assets

| Asset | Purpose | Codec | Channels / rate | Duration | Bytes | SHA-256 |
| --- | --- | --- | --- | ---: | ---: | --- |
| `../Assets/Sounds/IDS.wav` | preserved soundtrack master | PCM S16LE, 1,411 kb/s | stereo / 44.1 kHz | 328.13 s | 57,882,296 | `2ab4636ee5970a729ece6106dfbb8b8252ae44a8b1fa89a780f224b4e4296602` |
| `public/audio/ids-soundtrack.m4a` | all delivery targets | AAC-LC, requested 160 kb/s (163 kb/s stream, 164 kb/s container) | stereo / 44.1 kHz | 328.13 s | 6,752,895 | `e80073021656835372c5d5880081f503bc654c674ec86c8d46bd0d8a0e40aeee` |
| `../Assets/Resources/button.ogg` | preserved cue master and Browser/Android delivery source | Vorbis, nominal 160 kb/s | stereo / 48 kHz | about 0.09 s | 6,021 | `25860126b6ad2ef525907ed58fee58f9149a681160a3c90ce2e95d32530a6108` |
| `public/audio/button.ogg` | Browser/Android cue | byte-identical Vorbis copy | stereo / 48 kHz | about 0.09 s | 6,021 | `25860126b6ad2ef525907ed58fee58f9149a681160a3c90ce2e95d32530a6108` |
| `public/audio/button.wav` | iOS cue | PCM S16LE | stereo / 48 kHz | about 0.09 s | 16,442 | `6a2441dcfdfcefe7a01cac2dfbaaff1605764b209fd6f0f93f8882d79aa37d0f` |

The soundtrack is encoded from the supplied game-specific master with FFmpeg 6.0 static (`aac`, `-b:a 160k`, `-ar 44100`, stereo, fast-start M4A, source metadata removed). The iOS cue is decoded from the preserved Ogg master without resampling.

Vite copies all three delivery files into `dist` and `dist-native`. PWA generation explicitly hashes and precaches them, so the exact 6,775,358-byte audio payload is an honest install/offline-package cost rather than an initial-page request. The build enforces a 7,000,000-byte offline-audio budget. Capacitor sync copies the same files under each app's packaged `public/audio` resource tree. Electron packages `dist-native/**/*`, using the same persistent Chromium backend.

## Playback backends

- Browser/PWA/Electron: one looping `HTMLAudioElement` for music; one `AudioContext` with a predecoded cue buffer and short-lived buffer sources. A rejected autoplay attempt remains recoverable because every later real semantic action can retry playback.
- iOS: `AVQueuePlayer` plus `AVPlayerLooper` for music and one prepared `AVAudioPlayer` for the cue. `AVAudioSession` uses `.ambient` with `.mixWithOthers`, respecting Ring/Silent and other apps. Interruption and old-output route-change notifications pause safely. Output removal latches music off until an explicit music setting change re-arms it. No background-audio entitlement is added.
- Android: Media3 `ExoPlayer` with `REPEAT_MODE_ONE` and persistent `SoundPool(maxStreams = 4)`. Both use `USAGE_GAME`; music focus uses `AUDIOFOCUS_GAIN`, transient loss pauses, duckable loss attenuates to 20%, gain restores, permanent loss/noisy output stops playback, and player/focus/receiver resources are released. Noisy output latches music off until an explicit music setting change re-arms it. No foreground media service is added.

## Objective audio QA

Completed locally on 2026-08-20:

- Full master and delivery files decoded from start to end with no decoder error.
- Metadata matched: both soundtrack versions are stereo, 44.1 kHz, and 328.13 seconds.
- Whole-track spectrograms were generated and visually compared. Musical sections and high-frequency distribution remain aligned; expected AAC high-frequency shaping is visible without missing sections or channel loss.
- Master mean/max were -14.2/-0.2 dB; delivery mean/max were -14.3/-0.1 dB. No normalization or material level shift was introduced.
- Silence detection found the same intended tail: master 317.653-328.130 (10.477 s), delivery 317.653-328.144 (10.492 s, including codec padding).
- The delivery files and hashes above were re-read after encoding. The Ogg delivery cue is byte-identical to its source.

Loop behavior is whole-track repeat. It preserves the master's intentional roughly 10.5-second silent tail; no unapproved crossfade or edit was introduced. A human headphone/speaker A/B and subjective loop-transition approval remain part of device acceptance rather than being claimed from automated analysis.

## Automated validation

- TypeScript production project: passed.
- Full Vitest suite: passed (178 files / 1,674 tests). Focused audio/settings/native/PWA tests also passed after the independent review fixes.
- Production Web build: passed; audio files present in output and the generated service worker precache.
- Browser button-cue buffer sources and gain nodes disconnect after playback (and after start failure), covered by focused lifecycle tests. The retained-heap soak now takes its baseline only after Chromium's delayed media bookkeeping settles and applies the same render-settle delay to its baseline and final snapshots.
- Android Capacitor sync: passed.
- Android `:app:compileDebugKotlin`: passed on Windows with Media3 resolved.
- iOS Capacitor sync: passed. Xcode/Swift compilation is unavailable on Windows and remains pending on macOS CI/device validation.

Independent review found and fixed iOS plugin registration, an in-flight background/resume race, Android duck-volume restoration, and output-removal re-arming. Re-review found no remaining actionable source issue.

## Physical-device acceptance matrix (pending)

Run each row with music at 70%, effects at 50%, then repeat with custom volumes and mute. Confirm there is only one soundtrack instance and no stuck/duplicated cue.

| Scenario | Android expected result | iOS expected result | Status |
| --- | --- | --- | --- |
| Fresh install / first launch | silent until first enabled action; music and one cue then start | same; Ring/Silent still respected | Pending |
| Speaker playback | stable stereo music and clear cue at independent volumes | same | Pending |
| Wired headset | routes without duplicate playback | routes without duplicate playback | Pending |
| Bluetooth headset | routes and remains synchronized; reconnect requires explicit intent if output was lost | routes and remains synchronized; old-device removal pauses | Pending |
| iPhone silent switch | not applicable | game audio is silent under ambient policy | Pending |
| Temporary focus loss / call | pause; resume after focus gain only when previously playing | interruption pauses; eligible end resumes only when previously playing | Pending |
| Competing media / duck request | duck to about 20%, restore on gain | mixes without taking exclusive ownership | Pending |
| Headphone removal / noisy output | pause and clear surprising auto-resume intent | pause and clear surprising auto-resume intent | Pending |
| Lock / app background | pause; no foreground service or notification | pause; no background-audio execution | Pending |
| Return to foreground | resume only if playback was intended before backgrounding | same | Pending |
| Repeated background/resume (20 cycles) | no duplicate ExoPlayer, focus leak, or restart race | no duplicate queue player, observer leak, or restart race | Pending |
| Long playback (at least 45 min) | stable memory/CPU; multiple loops complete | same | Pending |
| Loop transition | whole track repeats once after intended silent tail; no click/truncation | same | Pending |
| Rapid enabled buttons (50 presses) | bounded SoundPool overlap; no allocations or crash | one preloaded player restarts cleanly | Pending |
| Disabled controls, sliders, hold-repeat | no cue for disabled controls, slider movements, or generated repeat ticks | same | Pending |
| Volume/mute persistence | survives process kill/relaunch, independent of save export/import | same | Pending |
| Route changes while backgrounded | remains paused and does not surprise-resume | remains paused and respects route/interruption state | Pending |
