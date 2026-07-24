/*
 * Purpose: Defines the basic text-storage seam beneath canonical save orchestration.
 * Runs: Runtime save paths and Unity Editor storage tests.
 * Primary entry points: Exists, TryReadText, and TryWriteTextAtomic.
 * Owns: Minimal storage capability contract only.
 * Delegates: Verified transactions and candidate discovery to ITransactionalSaveStorage.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Save/ITransactionalSaveStorage.cs.
 * - Assets/Scripts/Systems/Save/OdinStringFileStorage.cs.
 * - Assets/Scripts/Systems/Save/SaveSystem.cs.
 *
 * Change notes:
 * - Canonical production writes must use ITransactionalSaveStorage.TryWriteTextVerified.
 * - TryWriteTextAtomic remains a compatibility-level primitive and does not replace prepared-save verification.
 */

namespace Systems.Save
{
    /// <summary>
    /// Provides basic text existence, read, and atomic-write operations.
    /// </summary>
    public interface ISaveStorage
    {
        /// <summary>
        /// Gets the support-oriented storage name or path.
        /// </summary>
        string DebugName { get; }

        /// <summary>
        /// Reports whether the primary artifact exists.
        /// </summary>
        /// <returns><see langword="true"/> when the primary artifact exists.</returns>
        bool Exists();

        /// <summary>
        /// Reads non-empty primary artifact text.
        /// </summary>
        /// <param name="text">The trimmed text.</param>
        /// <param name="error">The read failure.</param>
        /// <returns><see langword="true"/> when non-empty text was read.</returns>
        bool TryReadText(out string text, out string error);

        /// <summary>
        /// Performs a compatibility-level atomic text write.
        /// </summary>
        /// <param name="text">The non-empty text.</param>
        /// <param name="error">The write failure.</param>
        /// <returns><see langword="true"/> when the replacement succeeded.</returns>
        bool TryWriteTextAtomic(string text, out string error);
    }
}
