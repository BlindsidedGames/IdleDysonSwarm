# Support Save Regression Fixtures

## Purpose

`Assets/Editor/Tests/Save/Fixtures/support-fixture-manifest.json` indexes controlled save envelopes supplied through player
support. The repository retains only the envelope bytes needed for regression testing. Sender names, addresses, message
text, screenshots, attachment names, and mailbox identifiers are intentionally excluded.

Treat every fixture as untrusted and immutable. Tests may read, decode, migrate a deep copy, or pass text through the
prepared-save pipeline. Tests must never rewrite, normalize, regenerate, or publish fixture data.

## Neutral cases

| Case | Provenance | SHA-256 | Source schema | Expected result |
| --- | --- | --- | ---: | --- |
| `support-case-01-attached` | Historical attached save, 2026-02 | `341450a13e25b60000674f5e1c0a3f56d2511ccebddaf6c138596e8ab0423219` | 11 | Prepared primary |
| `support-case-02-inline-a` | Historical inline save, 2026-02 | `1453170946da5fb204a098ae4bec40a14d30640acad6c98bbb0d78fdd0ba2ee4` | 0 | Migrates and prepares |
| `support-case-03-inline-b` | Historical inline save, 2026-02 | `341747c7adae709990d93c028aa08345409985214fe8ee49314777abb3d6827a` | 10 | Migrates and prepares |
| `support-case-04-cross-platform-import` | Cross-platform import report, 2026-03 | `29c53565a5072fcf548a909ed11f5b62af7d692188499b59a7dca46115fb4ce1` | Undecodable | `InvalidBase64`; Stage 3 blocks and preserves it |

The attached case preserves the exact attachment file bytes. Inline cases preserve the exact contiguous `IDB1:` envelope
token, excluding surrounding email formatting and whitespace. Case 04 has an impossible Base64 payload length and is
intentionally retained as malformed evidence; do not add padding, truncate it further, or replace it with repaired output.

## Expected use

- Run `Tests.Save.SupportSaveFixtureRegressionTests` after decoder, serializer, migration, validation, transactional-save,
  or startup-recovery changes.
- Keep successful cases readable through `SaveCodec`, preparable to schema 11, and `PrimaryReady` without changing their
  source bytes.
- Keep the malformed case classified as `InvalidBase64` and `AllCandidatesInvalid`, with no write, backup, publication,
  lifecycle, or offline-time side effect.
- Add a new neutral manifest entry and immutable file for future support samples. Do not reuse or mutate an existing case.
- If a future compatibility change safely accepts case 04, handle that as a separately reviewed decoder change and update
  the manifest expectation without changing the original fixture bytes.

## Limitations

These fixtures prove serializer and recovery behavior for four historical envelopes only. They contain no platform
metadata, reproduction steps, mailbox context, or consent for broader use. They do not replace device lifecycle testing,
filesystem permission testing, or a disposable-profile visual recovery smoke test.
