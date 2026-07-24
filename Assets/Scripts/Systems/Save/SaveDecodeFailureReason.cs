/*
 * Purpose: Classifies non-throwing SaveCodec decode failures for compatibility and prepared-save policy decisions.
 * Runs: Runtime and Unity Editor tests.
 * Primary entry points: Values returned by SaveCodec.TryDecodeSaveSettings(..., out SaveDecodeFailureReason).
 * Owns: Stable decoder failure categories only; it does not perform decoding, migration, publication, or storage.
 * Delegates: Classification decisions to Systems.Save.SaveCodec.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/SaveCodec.cs.
 * - Assets/Editor/Tests/Save/SaveCodecFixtureCharacterizationTests.cs.
 *
 * Change notes:
 * - Enum values are consumed by compatibility tests and future prepared-save outcomes.
 * - Renaming or merging values requires coordinated updates to decoder callers and recovery-facing policy mapping.
 */

namespace Systems.Save
{
    /// <summary>
    /// Identifies why a save envelope could not be decoded without exposing parser exceptions to callers.
    /// </summary>
    public enum SaveDecodeFailureReason
    {
        /// <summary>
        /// Decoding succeeded.
        /// </summary>
        None,

        /// <summary>
        /// Input was null, empty, or whitespace.
        /// </summary>
        EmptyInput,

        /// <summary>
        /// Input used an envelope prefix that this build does not support.
        /// </summary>
        UnsupportedEnvelope,

        /// <summary>
        /// A supported envelope contained no payload.
        /// </summary>
        TruncatedPayload,

        /// <summary>
        /// A base64 envelope contained invalid base64 text.
        /// </summary>
        InvalidBase64,

        /// <summary>
        /// Envelope bytes were readable but did not contain a valid supported save payload.
        /// </summary>
        CorruptPayload
    }
}
