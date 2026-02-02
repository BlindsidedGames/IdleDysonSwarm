using System;

namespace Systems.Save
{
    [Serializable]
    public sealed class ExportSaveDto
    {
        public int version;
        public string format;
        public int rawBytes;
        public int compressedBytes;
        public string data;
    }
}
