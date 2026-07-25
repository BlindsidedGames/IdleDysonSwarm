# SaveCodec

## Contract

`Systems.Save.SaveCodec` is a non-publishing, non-writing codec boundary. It recognizes debug DTO JSON, Odin raw JSON, canonical binary envelopes, and legacy base64 payloads. Successful decoding returns an isolated `Oracle.SaveDataSettings` object to the caller; the caller owns version policy, migration, validation, publication, and storage.

Canonical binary output always uses uppercase `IDB1:`. Input accepts uppercase `IDB1:` and lowercase `idb1:` with ordinal case-insensitive prefix matching.

The classified overload returns `SaveDecodeFailureReason` for empty input, unsupported envelopes, truncated payloads, invalid base64, and corrupt payload bytes. Existing boolean callers remain source-compatible.

## Data flow

1. Inspect the outer envelope without writing files.
2. Decode base64 and optional gzip.
3. Deserialize through Odin using the format selected by the envelope.
4. Return decoded settings or a stable failure reason.
5. Leave migration, normalization, runtime publication, and persistence to downstream systems.

## Save/load implications

- Changing prefix recognition or decode order can strand historical clipboard or canonical artifacts.
- Serializer changes require all guaranteed fixtures to decode before release.
- A successful decode does not imply the schema is supported; `SavePreparationPipeline` owns the pre-migration
  future-version gate and `MigrationRunner` retains a defensive secondary gate.
- Lowercase input does not change output casing. Re-encoding still produces uppercase `IDB1:`.

## Performance pitfalls

- Gzip and Odin deserialization allocate complete payload buffers; do not run the codec in hot loops.
- Failure classification intentionally avoids retrying migration or accessing storage.

## Quick verification

1. Run `SaveCodecFixtureCharacterizationTests`.
2. Confirm the three immutable fixture hashes still match their manifest.
3. Confirm uppercase and lowercase IDB1 inputs decode.
4. Confirm re-encoded output begins with uppercase `IDB1:`.
5. Confirm malformed envelopes return the expected `SaveDecodeFailureReason` without changing `Oracle.oracle` or fixture files.
