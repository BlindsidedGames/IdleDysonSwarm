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

        public static bool TryDecodeBinary(string text, out byte[] bytes)
        {
            bytes = Array.Empty<byte>();
            if (string.IsNullOrEmpty(text)) return false;
            if (!text.StartsWith(BinarySavePrefix, StringComparison.Ordinal)) return false;
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
            if (clipboard.StartsWith(BinarySavePrefix, StringComparison.Ordinal) &&
                TryDecodeBinary(clipboard, out byte[] decoded) &&
                TryDeserializeSaveSettings(decoded, DataFormat.Binary, out settings))
            {
                return true;
            }

            // 4) Legacy payload: base64 (optionally IDSZ1: prefixed), optionally gzip.
            return TryDeserializeFromBase64Payload(clipboard, out settings);
        }

        public static byte[] SerializeSaveSettingsBinary(Oracle.SaveDataSettings settings)
        {
            return settings == null
                ? Array.Empty<byte>()
                : SerializationUtility.SerializeValue(settings, DataFormat.Binary);
        }

        public static byte[] SerializeSaveSettingsJson(Oracle.SaveDataSettings settings)
        {
            return settings == null
                ? Array.Empty<byte>()
                : SerializationUtility.SerializeValue(settings, DataFormat.JSON);
        }

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

        private static bool TryDeserializeJsonBytes(byte[] bytes, out Oracle.SaveDataSettings settings)
        {
            settings = null;
            if (bytes == null || bytes.Length == 0) return false;
            byte[] trimmed = StripUtf8Bom(bytes);
            return TryDeserializeSaveSettings(trimmed, DataFormat.JSON, out settings);
        }

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

        private static bool LooksLikeJson(string clipboard)
        {
            if (string.IsNullOrWhiteSpace(clipboard)) return false;
            string trimmed = clipboard.TrimStart();
            return trimmed.StartsWith("{", StringComparison.Ordinal) && trimmed.Contains("\"saveVersion\"");
        }

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

        private static bool LooksLikeGzip(byte[] bytes)
        {
            return bytes != null && bytes.Length >= 2 && bytes[0] == 0x1F && bytes[1] == 0x8B;
        }

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

        public static byte[] DecompressBytes(byte[] bytes)
        {
            if (bytes == null || bytes.Length == 0) return Array.Empty<byte>();
            using var input = new MemoryStream(bytes);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);
            return output.ToArray();
        }

        // Convenience for logging / debugging (keeps formatting consistent).
        public static string FormatUtcNow()
        {
            return DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
        }
    }
}
