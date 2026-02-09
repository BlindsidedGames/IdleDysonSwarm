using System;

namespace Systems.Save
{
    public interface ISaveStorage
    {
        string DebugName { get; }

        bool Exists();

        bool TryReadText(out string text, out string error);

        bool TryWriteTextAtomic(string text, out string error);
    }
}

