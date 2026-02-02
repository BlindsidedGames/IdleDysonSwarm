using System;
using System.Collections.Generic;
using GameData;

namespace Systems.Skills
{
    public static class SkillBitsetUtility
    {
        private const int BitsPerByte = 8;

        public static int BitsetBitCount => SkillIdMap.MaxLegacyKey;

        public static byte[] CreateEmptyBitset()
        {
            int bytes = (BitsetBitCount + BitsPerByte - 1) / BitsPerByte;
            return bytes > 0 ? new byte[bytes] : Array.Empty<byte>();
        }

        public static byte[] EnsureSize(byte[] bits)
        {
            if (bits == null || bits.Length == 0) return CreateEmptyBitset();
            int requiredBytes = (BitsetBitCount + BitsPerByte - 1) / BitsPerByte;
            if (bits.Length >= requiredBytes) return bits;
            byte[] resized = new byte[requiredBytes];
            Array.Copy(bits, resized, bits.Length);
            return resized;
        }

        public static bool TryGetIndex(string skillId, out int index)
        {
            index = -1;
            if (!SkillIdMap.TryGetLegacyKey(skillId, out int key)) return false;
            index = key - 1;
            return index >= 0;
        }

        public static bool GetBit(byte[] bits, int index)
        {
            if (bits == null || index < 0) return false;
            int byteIndex = index / BitsPerByte;
            int bitIndex = index % BitsPerByte;
            if (byteIndex >= bits.Length) return false;
            return (bits[byteIndex] & (1 << bitIndex)) != 0;
        }

        public static void SetBit(byte[] bits, int index, bool value)
        {
            if (bits == null || index < 0) return;
            int byteIndex = index / BitsPerByte;
            int bitIndex = index % BitsPerByte;
            if (byteIndex >= bits.Length) return;
            byte mask = (byte)(1 << bitIndex);
            if (value)
                bits[byteIndex] |= mask;
            else
                bits[byteIndex] &= (byte)~mask;
        }

        public static byte[] BuildBitsetFromIds(IEnumerable<string> ids)
        {
            byte[] bits = CreateEmptyBitset();
            if (ids == null) return bits;
            foreach (string id in ids)
            {
                if (string.IsNullOrEmpty(id)) continue;
                if (!TryGetIndex(id, out int index)) continue;
                SetBit(bits, index, true);
            }

            return bits;
        }

        public static List<string> ConvertBitsetToIds(byte[] bits)
        {
            var ids = new List<string>();
            if (bits == null || bits.Length == 0) return ids;

            int maxKey = SkillIdMap.MaxLegacyKey;
            for (int key = 1; key <= maxKey; key++)
            {
                int index = key - 1;
                if (!GetBit(bits, index)) continue;
                if (SkillIdMap.TryGetId(key, out string id))
                {
                    ids.Add(id);
                }
            }

            return ids;
        }
    }
}
