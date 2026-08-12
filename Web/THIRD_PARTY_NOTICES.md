# Third-party notices

## Odin Serializer

The binary protocol compatibility reader in `src/save/odinBinary.ts` is derived
from the `BinaryDataReader`, `BinaryDataWriter`, and `BinaryEntryType`
implementations in Team Sirenix's Odin Serializer.

- Source: <https://github.com/TeamSirenix/odin-serializer>
- License: Apache License 2.0
- Local license copy: `third-party/OdinSerializer-LICENSE.txt`

The TypeScript reader is a modified implementation that reconstructs data as
plain JavaScript values and does not instantiate Unity or C# runtime types.

## break_infinity.js

The Web numeric adapter uses `break_infinity.js` 2.2.0 for approximate
incremental-game Decimal arithmetic.

- Source: <https://github.com/Patashu/break_infinity.js>
- Package: <https://www.npmjs.com/package/break_infinity.js/v/2.2.0>
- License: MIT
- Local license copy: `third-party/break_infinity.js-LICENSE.txt`
