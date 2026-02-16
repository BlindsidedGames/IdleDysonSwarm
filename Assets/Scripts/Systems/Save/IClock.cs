using System;

namespace Systems.Save
{
    /*
     * IClock / SystemClock
     * Purpose (runtime): Stable seam for UTC time retrieval used by save/lifecycle/offline-time logic.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - IClock.UtcNow
     * - SystemClock.UtcNow
     * Owns vs delegates:
     * - Owns only the "what time is it" contract.
     * - Delegates actual wall-clock retrieval to DateTime.UtcNow (SystemClock implementation).
     *
     * Interacts with:
     * - Systems.Save.OfflineAwayTimeCalculator
     * - Expansion.Oracle (save-for-quit timestamping and load-time diagnostics)
     * - Editor tests under Assets/Editor/Tests/** via fake clocks
     *
     * Change notes:
     * - If UtcNow semantics change, offline-time grant and quit timestamp logic can drift or regress.
     * - Keep UTC-only behavior; switching to local time requires coordinated updates to parsing/clamping tests.
     */
    public interface IClock
    {
        DateTime UtcNow { get; }
    }

    public sealed class SystemClock : IClock
    {
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
