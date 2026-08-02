# Native host foundation

This foundation defines the filesystem and system-service boundaries required
before Capacitor or Electron dependencies are introduced. It does not package,
sign, upload, or deploy an application.

## Preserved identity and storage separation

Both native host descriptors preserve
`com.blindsidedgames.idledysonswarm`. Store updates must additionally use the
existing signing identities; this repository contains no signing material.

The Web runtime owns a new `web-runtime-v1` root. Its canonical save is
`save/idle_dyson_swarm_web_save.idsw`, with a temporary file, three rotating
backups, and a recovery copy in separate subdirectories. Capacitor must root
that storage in `Filesystem.Directory.Data`. Electron must root it below
`app.getPath('userData')`. Neither bridge accepts absolute paths or parent-path
segments from the renderer.

Unity discovery is a different, read-only port:

- Android probes `idle_dyson_swarm_save.txt` in the retained external-files
  container belonging to the unchanged application ID.
- iOS probes the same filename in the retained Documents container.
- Windows probes
  `%USERPROFILE%\AppData\LocalLow\BlindsidedGames\Idle Dyson Swarm`.
- macOS first probes the documented Editor/plain location
  `~/Library/Application Support/BlindsidedGames/Idle Dyson Swarm`. When that
  location does not exist, it probes the older Player fallback
  `~/Library/Application Support/unity.BlindsidedGames.Idle Dyson Swarm`.
- Linux probes `$XDG_CONFIG_HOME/unity3d/BlindsidedGames/Idle Dyson Swarm`
  and the `~/.config/unity3d` fallback.

The discovery port exposes only `readTextIfExists`. Candidates receive opaque
`unity-readonly:` source identifiers. The storage adapter can copy the exact
discovered text into Web recovery storage, but no Unity path is ever passed to
a mutation bridge. Unity originals are never deleted, renamed, or overwritten.

## Host bridges

`platformSaveStorage.ts` provides the browser alias plus Capacitor and Electron
storage adapters. Native implementations must provide same-root atomic rename
semantics for `replaceAtomically`; a copy/delete sequence is not an acceptable
replacement operation.

`nativeSystemPorts.ts` keeps lifecycle, native share, redacted diagnostics, and
application metadata outside React. Save sharing requires a safe `.idsw` base
filename paired with `text/plain` or the dedicated
`application/x-idle-dyson-swarm-save` MIME type. Diagnostics accepts a closed,
structured field vocabulary and serializes JSON inside the native boundary;
callers cannot supply arbitrary text, saves, paths, raw errors, stacks, URLs,
credentials, or an unrecognized host kind. Application identity is fixed by the adapter rather than
trusted from renderer-controlled metadata.

The Capacitor descriptor targets a future relative/scheme-safe `dist-native`
build and disables cleartext/mixed content. The Electron descriptor records
the required isolated, sandboxed renderer posture and rooted preload-only
filesystem access. The existing `/play/` PWA build is not copied into either
host: a native build mode must be added before packaging so absolute `/play/`
asset URLs are not shipped into a file/custom-scheme host.

## Deliberate blockers

- Capacitor, Electron, filesystem/share plugins, and store SDKs are not
  installed. Versions must be deliberately pinned before host generation.
- Android/iOS projects are not generated until the existing signing identities
  and in-place update access are available for verification.
- Electron main/preload code, Steam initialization, packaging, signing, and
  notarization remain later release gates.
- No credential, keystore, certificate, provisioning profile, store upload, or
  paid service was added.
