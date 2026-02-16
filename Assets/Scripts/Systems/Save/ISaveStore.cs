using System;
using Expansion;

namespace Systems.Save
{
    /*
     * ISaveStore / CanonicalSaveStore
     * Purpose (runtime): Narrow save-store seam used by Oracle to load/save canonical save snapshots.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - ISaveStore.Exists()
     * - ISaveStore.TryLoad(...)
     * - ISaveStore.TrySave(...)
     * - CanonicalSaveStore.CreateDefault()
     * Owns vs delegates:
     * - Owns the store-level contract expected by Oracle save lifecycle code.
     * - Delegates actual encoding/storage to Systems.Save.SaveSystem and Systems.Save.ISaveStorage.
     *
     * Interacts with:
     * - Expansion.Oracle.Persistence (Load/TrySaveState)
     * - Systems.Save.SaveSystem
     * - Editor tests in Assets/Editor/Tests/Save/**
     *
     * Change notes:
     * - Changing contract behavior (e.g. TrySave returning false on partial success) affects startup load fallback
     *   and quit-save persistence flow.
     * - Keep this abstraction aligned with SaveSystem expectations to avoid split-brain persistence behavior.
     */
    public interface ISaveStore
    {
        bool Exists();

        bool TryLoad(out Oracle.SaveDataSettings settings, out string error);

        bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error);
    }

    public sealed class CanonicalSaveStore : ISaveStore
    {
        private readonly SaveSystem _saveSystem;

        public CanonicalSaveStore(SaveSystem saveSystem)
        {
            _saveSystem = saveSystem ?? throw new ArgumentNullException(nameof(saveSystem));
        }

        public static CanonicalSaveStore CreateDefault()
        {
            return new CanonicalSaveStore(SaveSystem.CreateDefault());
        }

        public bool Exists()
        {
            return _saveSystem.Storage.Exists();
        }

        public bool TryLoad(out Oracle.SaveDataSettings settings, out string error)
        {
            return _saveSystem.TryLoad(out settings, out error);
        }

        public bool TrySave(Oracle.SaveDataSettings settings, out SaveStringStats stats, out string error)
        {
            return _saveSystem.TrySave(settings, out stats, out error);
        }
    }
}
