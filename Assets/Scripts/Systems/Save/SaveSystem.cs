using System;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Orchestrates reading/writing the canonical save string to storage.
    /// Migration/validation is wired in by the caller (Oracle) for now.
    /// </summary>
    public sealed class SaveSystem
    {
        public SaveSystem(ISaveStorage storage)
        {
            Storage = storage ?? throw new ArgumentNullException(nameof(storage));
        }

        public ISaveStorage Storage { get; }

        public static SaveSystem CreateDefault()
        {
            return new SaveSystem(new OdinStringFileStorage(SavePaths.GetCanonicalSavePath()));
        }

        public bool TryLoad(out Oracle.SaveDataSettings settings, out string error)
        {
            settings = null;
            error = null;

            if (!Storage.TryReadText(out string text, out string readError))
            {
                error = readError;
                return false;
            }

            if (!SaveCodec.TryDecodeSaveSettings(text, out Oracle.SaveDataSettings decoded))
            {
                error = "Failed to decode save text.";
                return false;
            }

            settings = decoded;
            return true;
        }

        public bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error)
        {
            stats = default;
            error = null;

            if (settings == null)
            {
                error = "Refusing to save null settings.";
                return false;
            }

            byte[] raw = SaveCodec.SerializeSaveSettingsBinary(settings);
            byte[] compressed = SaveCodec.CompressBytes(raw);
            string encoded = SaveCodec.BinarySavePrefix + Convert.ToBase64String(compressed);

            stats = new SaveStringStats(rawBytes: raw.Length, compressedBytes: compressed.Length, encodedChars: encoded.Length);

            return Storage.TryWriteTextAtomic(encoded, out error);
        }
    }

    public readonly struct SaveStringStats
    {
        public SaveStringStats(int rawBytes, int compressedBytes, int encodedChars)
        {
            RawBytes = rawBytes;
            CompressedBytes = compressedBytes;
            EncodedChars = encodedChars;
        }

        public int RawBytes { get; }
        public int CompressedBytes { get; }
        public int EncodedChars { get; }
    }
}

