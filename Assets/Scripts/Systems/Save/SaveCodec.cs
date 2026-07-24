/*
 * Purpose: Encodes and decodes supported save envelopes without publishing runtime state or writing storage.
 * Runs: Runtime clipboard/canonical save paths and Unity Editor compatibility tests.
 * Primary entry points: EncodeBinary, TryDecodeBinary, TryDecodeSaveSettings, and serializer helpers.
 * Owns: Envelope recognition, base64/gzip transforms, Odin serialization entry points, and decode failure classification.
 * Delegates: Object serialization to Sirenix.Serialization and publication/storage decisions to Oracle/save-store callers.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Clipboard.cs and Oracle.Persistence.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs and ExportSaveDto.cs.
 * - Assets/Editor/Tests/Save/SaveCodecFixtureCharacterizationTests.cs.
 *
 * Change notes:
 * - BinarySavePrefix is the canonical output contract and must remain uppercase IDB1.
 * - Input accepts uppercase or lowercase IDB1; changing prefix handling requires fixture compatibility coverage.
 * - Decode methods are intentionally non-throwing and must not publish state or write files.
 * - Serializer or format-order changes can strand historical saves and require fixture-backed regression evidence.
 */

using System;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using CompressionLevel = System.IO.Compression.CompressionLevel;
using System.Text;
using Expansion;
using Sirenix.Serialization;
using UnityEngine;

namespace Systems.Save
{
    /// <summary>
    /// Canonical save string codec used for clipboard import/export and (eventually) on-disk persistence.
    /// </summary>
    /// <remarks>
    /// This is extracted from Oracle to reduce save-system coupling to the Oracle MonoBehaviour.
    /// </remarks>
    public static class SaveCodec
    {
        // Legacy compressed JSON/base64 prefix.
        public const string CompressedSavePrefix = "IDSZ1:";

        // Canonical binary+gzip+base64 prefix.
        public const string BinarySavePrefix = "IDB1:";

        /// <summary>
        /// Encodes bytes into the canonical uppercase IDB1 envelope.
        /// </summary>
        /// <param name="bytes">The binary payload to encode.</param>
        /// <param name="compress">Whether to gzip the payload before base64 encoding.</param>
        /// <returns>The canonical uppercase IDB1 string, or an empty string for empty input.</returns>
        public static string EncodeBinary(byte[] bytes, bool compress)
        {
            if (bytes == null || bytes.Length == 0) return string.Empty;
            if (compress)
            {
                byte[] compressed = CompressBytes(bytes);
                return BinarySavePrefix + Convert.ToBase64String(compressed);
            }

            return BinarySavePrefix + Convert.ToBase64String(bytes);
        }

        /// <summary>
        /// Attempts to decode an uppercase or lowercase IDB1 envelope into its binary payload.
        /// </summary>
        /// <param name="text">The IDB1 envelope text.</param>
        /// <param name="bytes">The decoded and, when necessary, decompressed payload.</param>
        /// <returns><see langword="true"/> when a non-empty payload is decoded; otherwise <see langword="false"/>.</returns>
        public static bool TryDecodeBinary(string text, out byte[] bytes)
        {
            bytes = Array.Empty<byte>();
            if (string.IsNullOrEmpty(text)) return false;
            if (!text.StartsWith(BinarySavePrefix, StringComparison.OrdinalIgnoreCase)) return false;
            string payload = text.Substring(BinarySavePrefix.Length);
            try
            {
                byte[] raw = Convert.FromBase64String(payload);
                // Canonical IDB1 strings are gzip-compressed, but older/debug paths may emit raw binary.
                bytes = LooksLikeGzip(raw) ? DecompressBytes(raw) : raw;
                return bytes.Length > 0;
            }
            catch
            {
                bytes = Array.Empty<byte>();
                return false;
            }
        }

        /// <summary>
        /// Attempts to decode any supported clipboard string into a SaveDataSettings instance.
        /// This mirrors the current Oracle clipboard import behavior.
        /// </summary>
        /// <param name="clipboard">The supported save envelope or legacy payload.</param>
        /// <param name="settings">The decoded save settings when successful.</param>
        /// <returns><see langword="true"/> when decoding succeeds; otherwise <see langword="false"/>.</returns>
        public static bool TryDecodeSaveSettings(string clipboard, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            if (string.IsNullOrWhiteSpace(clipboard)) return false;

            // 1) Debug DTO JSON (ExportSaveDebugJson output).
            if (TryDecodeExportDto(clipboard, out byte[] dtoBytes) &&
                TryDeserializeSaveSettings(dtoBytes, DataFormat.Binary, out settings))
            {
                return true;
            }

            // 2) Raw JSON.
            if (LooksLikeJson(clipboard) &&
                TryDeserializeSaveSettings(Encoding.UTF8.GetBytes(clipboard), DataFormat.JSON, out settings))
            {
                return true;
            }

            // 3) Canonical binary prefix.
            if (clipboard.StartsWith(BinarySavePrefix, StringComparison.OrdinalIgnoreCase) &&
                TryDecodeBinary(clipboard, out byte[] decoded) &&
                TryDeserializeSaveSettings(decoded, DataFormat.Binary, out settings))
            {
                return true;
            }

            // 4) Legacy payload: base64 (optionally IDSZ1: prefixed), optionally gzip.
            return TryDeserializeFromBase64Payload(clipboard, out settings);
        }

        /// <summary>
        /// Attempts to decode a save and reports a stable failure category when decoding fails.
        /// </summary>
        /// <param name="clipboard">The supported save envelope or legacy payload.</param>
        /// <param name="settings">The decoded save settings when successful.</param>
        /// <param name="failureReason">The classified failure, or <see cref="SaveDecodeFailureReason.None"/> on success.</param>
        /// <returns><see langword="true"/> when decoding succeeds; otherwise <see langword="false"/>.</returns>
        public static bool TryDecodeSaveSettings(
            string clipboard,
            out Oracle.SaveDataSettings settings,
            out SaveDecodeFailureReason failureReason)
        {
            if (TryDecodeSaveSettings(clipboard, out settings))
            {
                failureReason = SaveDecodeFailureReason.None;
                return true;
            }

            failureReason = ClassifyDecodeFailure(clipboard);
            return false;
        }

        /// <summary>
        /// Serializes save settings using the canonical Odin binary format.
        /// </summary>
        /// <param name="settings">The save settings to serialize.</param>
        /// <returns>The serialized bytes, or an empty array for null settings.</returns>
        public static byte[] SerializeSaveSettingsBinary(Oracle.SaveDataSettings settings)
        {
            return settings == null
                ? Array.Empty<byte>()
                : SerializationUtility.SerializeValue(settings, DataFormat.Binary);
        }

        /// <summary>
        /// Serializes save settings using the Odin JSON format.
        /// </summary>
        /// <param name="settings">The save settings to serialize.</param>
        /// <returns>The serialized bytes, or an empty array for null settings.</returns>
        public static byte[] SerializeSaveSettingsJson(Oracle.SaveDataSettings settings)
        {
            return settings == null
                ? Array.Empty<byte>()
                : SerializationUtility.SerializeValue(settings, DataFormat.JSON);
        }

        /// <summary>
        /// Attempts to deserialize save settings from bytes using the requested Odin format.
        /// </summary>
        /// <param name="bytes">The serialized save bytes.</param>
        /// <param name="format">The Odin data format.</param>
        /// <param name="settings">The deserialized settings when successful.</param>
        /// <returns><see langword="true"/> when deserialization succeeds; otherwise <see langword="false"/>.</returns>
        public static bool TryDeserializeSaveSettings(byte[] bytes, DataFormat format, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            if (bytes == null || bytes.Length == 0) return false;
            try
            {
                settings = SerializationUtility.DeserializeValue<Oracle.SaveDataSettings>(bytes, format);
                return settings != null;
            }
            catch
            {
                settings = null;
                return false;
            }
        }

        /// <summary>
        /// Classifies a failed decode without publishing state or touching storage.
        /// </summary>
        /// <param name="clipboard">The failed candidate text.</param>
        /// <returns>The stable failure category for the candidate.</returns>
        private static SaveDecodeFailureReason ClassifyDecodeFailure(string clipboard)
        {
            if (string.IsNullOrWhiteSpace(clipboard))
            {
                return SaveDecodeFailureReason.EmptyInput;
            }

            string trimmed = clipboard.Trim();
            if (trimmed.StartsWith(BinarySavePrefix, StringComparison.OrdinalIgnoreCase))
            {
                string payload = trimmed.Substring(BinarySavePrefix.Length);
                if (payload.Length == 0)
                {
                    return SaveDecodeFailureReason.TruncatedPayload;
                }

                try
                {
                    byte[] bytes = Convert.FromBase64String(payload);
                    return bytes.Length == 0
                        ? SaveDecodeFailureReason.TruncatedPayload
                        : SaveDecodeFailureReason.CorruptPayload;
                }
                catch (FormatException)
                {
                    return SaveDecodeFailureReason.InvalidBase64;
                }
            }

            int separator = trimmed.IndexOf(':');
            if (separator > 0)
            {
                return SaveDecodeFailureReason.UnsupportedEnvelope;
            }

            if (trimmed.StartsWith("{", StringComparison.Ordinal))
            {
                return SaveDecodeFailureReason.CorruptPayload;
            }

            try
            {
                byte[] bytes = Convert.FromBase64String(trimmed);
                return bytes.Length == 0
                    ? SaveDecodeFailureReason.TruncatedPayload
                    : SaveDecodeFailureReason.CorruptPayload;
            }
            catch (FormatException)
            {
                return SaveDecodeFailureReason.InvalidBase64;
            }
        }

        /// <summary>
        /// Attempts to deserialize a legacy base64 payload, optionally compressed or IDSZ1-prefixed.
        /// </summary>
        /// <param name="clipboard">The legacy payload text.</param>
        /// <param name="settings">The decoded settings when successful.</param>
        /// <returns><see langword="true"/> when decoding succeeds; otherwise <see langword="false"/>.</returns>
        private static bool TryDeserializeFromBase64Payload(string clipboard, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            if (string.IsNullOrWhiteSpace(clipboard)) return false;

            byte[] bytes;
            try
            {
                bytes = DecodeClipboardBytes(clipboard);
            }
            catch
            {
                return false;
            }

            // Try JSON first.
            if (TryDeserializeJsonBytes(bytes, out settings)) return true;
            if (LooksLikeJsonBytes(bytes)) return false;

            // If gzipped, decompress then try again.
            if (LooksLikeGzip(bytes))
            {
                try
                {
                    byte[] decompressed = DecompressBytes(bytes);
                    if (TryDeserializeJsonBytes(decompressed, out settings)) return true;
                    if (LooksLikeJsonBytes(decompressed)) return false;
                    return TryDeserializeSaveSettings(decompressed, DataFormat.Binary, out settings);
                }
                catch
                {
                    return false;
                }
            }

            return TryDeserializeSaveSettings(bytes, DataFormat.Binary, out settings);
        }

        /// <summary>
        /// Attempts to deserialize JSON bytes after removing an optional UTF-8 BOM.
        /// </summary>
        /// <param name="bytes">The possible JSON bytes.</param>
        /// <param name="settings">The decoded settings when successful.</param>
        /// <returns><see langword="true"/> when JSON deserialization succeeds; otherwise <see langword="false"/>.</returns>
        private static bool TryDeserializeJsonBytes(byte[] bytes, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            if (bytes == null || bytes.Length == 0) return false;
            byte[] trimmed = StripUtf8Bom(bytes);
            return TryDeserializeSaveSettings(trimmed, DataFormat.JSON, out settings);
        }

        /// <summary>
        /// Attempts to unpack an exported debug DTO into its Odin binary bytes.
        /// </summary>
        /// <param name="clipboard">The possible debug DTO JSON.</param>
        /// <param name="bytes">The decompressed Odin binary payload.</param>
        /// <returns><see langword="true"/> when a non-empty DTO payload is decoded; otherwise <see langword="false"/>.</returns>
        private static bool TryDecodeExportDto(string clipboard, out byte[] bytes)
        {
            bytes = Array.Empty<byte>();
            if (string.IsNullOrWhiteSpace(clipboard)) return false;
            if (!clipboard.TrimStart().StartsWith("{", StringComparison.Ordinal)) return false;
            try
            {
                ExportSaveDto dto = JsonUtility.FromJson<ExportSaveDto>(clipboard);
                if (dto == null || string.IsNullOrEmpty(dto.data)) return false;
                byte[] compressed = Convert.FromBase64String(dto.data);
                bytes = DecompressBytes(compressed);
                return bytes.Length > 0;
            }
            catch
            {
                bytes = Array.Empty<byte>();
                return false;
            }
        }

        /// <summary>
        /// Determines whether text resembles Odin raw save JSON.
        /// </summary>
        /// <param name="clipboard">The candidate text.</param>
        /// <returns><see langword="true"/> when the text has a JSON object and saveVersion field.</returns>
        private static bool LooksLikeJson(string clipboard)
        {
            if (string.IsNullOrWhiteSpace(clipboard)) return false;
            string trimmed = clipboard.TrimStart();
            return trimmed.StartsWith("{", StringComparison.Ordinal) && trimmed.Contains("\"saveVersion\"");
        }

        /// <summary>
        /// Decodes an unprefixed legacy base64 payload or an IDSZ1 gzip payload.
        /// </summary>
        /// <param name="clipboard">The legacy payload text.</param>
        /// <returns>The decoded bytes.</returns>
        private static byte[] DecodeClipboardBytes(string clipboard)
        {
            if (string.IsNullOrEmpty(clipboard)) return Array.Empty<byte>();
            if (clipboard.StartsWith(CompressedSavePrefix, StringComparison.Ordinal))
            {
                string payload = clipboard.Substring(CompressedSavePrefix.Length);
                byte[] compressed = Convert.FromBase64String(payload);
                return DecompressBytes(compressed);
            }

            return Convert.FromBase64String(clipboard);
        }

        /// <summary>
        /// Determines whether bytes begin with the gzip magic header.
        /// </summary>
        /// <param name="bytes">The candidate bytes.</param>
        /// <returns><see langword="true"/> when the gzip header is present.</returns>
        private static bool LooksLikeGzip(byte[] bytes)
        {
            return bytes != null && bytes.Length >= 2 && bytes[0] == 0x1F && bytes[1] == 0x8B;
        }

        /// <summary>
        /// Determines whether the first non-whitespace byte begins a JSON object.
        /// </summary>
        /// <param name="bytes">The candidate bytes.</param>
        /// <returns><see langword="true"/> when the bytes resemble JSON.</returns>
        private static bool LooksLikeJsonBytes(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0) return false;
            for (int i = 0; i < bytes.Length; i++)
            {
                byte b = bytes[i];
                if (b == 0x20 || b == 0x09 || b == 0x0A || b == 0x0D) continue;
                return b == (byte)'{';
            }

            return false;
        }

        /// <summary>
        /// Removes a UTF-8 byte-order mark when present.
        /// </summary>
        /// <param name="bytes">The source bytes.</param>
        /// <returns>The original array or a BOM-free copy.</returns>
        private static byte[] StripUtf8Bom(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 3) return bytes;
            if (bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            {
                byte[] trimmed = new byte[bytes.Length - 3];
                Buffer.BlockCopy(bytes, 3, trimmed, 0, trimmed.Length);
                return trimmed;
            }

            return bytes;
        }

        /// <summary>
        /// Compresses a non-empty byte sequence with gzip.
        /// </summary>
        /// <param name="bytes">The bytes to compress.</param>
        /// <returns>The gzip bytes, or an empty array for empty input.</returns>
        public static byte[] CompressBytes(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0) return Array.Empty<byte>();
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionLevel.Optimal, leaveOpen: true))
            {
                gzip.Write(bytes, 0, bytes.Length);
            }
            return output.ToArray();
        }

        /// <summary>
        /// Decompresses gzip bytes.
        /// </summary>
        /// <param name="bytes">The gzip bytes.</param>
        /// <returns>The decompressed bytes, or an empty array for empty input.</returns>
        public static byte[] DecompressBytes(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0) return Array.Empty<byte>();
            using var input = new MemoryStream(bytes);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);
            return output.ToArray();
        }

        /// <summary>
        /// Formats the current UTC time using the invariant culture for save diagnostics.
        /// </summary>
        /// <returns>The current UTC time as an invariant string.</returns>
        public static string FormatUtcNow()
        {
            return DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        }
    }
}
