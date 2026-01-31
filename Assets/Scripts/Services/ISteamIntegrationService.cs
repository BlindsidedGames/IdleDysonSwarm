using System;
using IdleDysonSwarm.Services.Steam;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for Steam integration.
    /// Manages Rich Presence updates, achievement unlocks, and stat tracking.
    /// </summary>
    /// <remarks>
    /// This service wraps Steamworks.NET functionality and provides:
    /// - Tier-aware Rich Presence updates based on player progression
    /// - Achievement condition checking using EffectCondition system
    /// - Steam stat tracking with exponent-based handling for large values
    /// </remarks>
    public interface ISteamIntegrationService
    {
        #region State Properties

        /// <summary>
        /// Whether Steam is initialized and available.
        /// Always check this before calling other methods.
        /// </summary>
        bool IsAvailable { get; }

        /// <summary>
        /// The player's current progression tier.
        /// Used to determine Rich Presence display format.
        /// </summary>
        ProgressionTier CurrentTier { get; }

        #endregion

        #region Rich Presence

        /// <summary>
        /// Updates Steam Rich Presence based on current game state.
        /// Automatically selects display format based on progression tier.
        /// </summary>
        void UpdateRichPresence();

        /// <summary>
        /// Clears Rich Presence (e.g., when returning to menu).
        /// </summary>
        void ClearRichPresence();

        #endregion

        #region Achievements

        /// <summary>
        /// Checks if a specific achievement has been unlocked.
        /// </summary>
        /// <param name="achievementId">Steam achievement ID (e.g., "FIRST_BOT").</param>
        /// <returns>True if unlocked, false otherwise.</returns>
        bool IsAchievementUnlocked(string achievementId);

        /// <summary>
        /// Attempts to unlock an achievement.
        /// </summary>
        /// <param name="achievementId">Steam achievement ID to unlock.</param>
        /// <returns>True if successfully unlocked (or already unlocked), false on error.</returns>
        bool TryUnlockAchievement(string achievementId);

        /// <summary>
        /// Checks all registered achievement conditions and unlocks any that are met.
        /// Call periodically (e.g., every 5-10 seconds) or on significant state changes.
        /// </summary>
        void CheckAllAchievements();

        /// <summary>
        /// Registers a secret button as found for the "Secret Hunter" achievement.
        /// </summary>
        /// <param name="secretId">Unique identifier for the secret button.</param>
        void RegisterSecretFound(string secretId);

        #endregion

        #region Stats

        /// <summary>
        /// Sets an integer stat value.
        /// </summary>
        /// <param name="statName">Steam stat name (e.g., "TOTAL_INFINITIES").</param>
        /// <param name="value">The value to set.</param>
        void SetStat(string statName, int value);

        /// <summary>
        /// Sets a float stat value.
        /// </summary>
        /// <param name="statName">Steam stat name (e.g., "TOTAL_PLAY_TIME").</param>
        /// <param name="value">The value to set.</param>
        void SetStat(string statName, float value);

        /// <summary>
        /// Gets an integer stat value.
        /// </summary>
        /// <param name="statName">Steam stat name.</param>
        /// <returns>The current stat value, or 0 if not found.</returns>
        int GetIntStat(string statName);

        /// <summary>
        /// Gets a float stat value.
        /// </summary>
        /// <param name="statName">Steam stat name.</param>
        /// <returns>The current stat value, or 0 if not found.</returns>
        float GetFloatStat(string statName);

        /// <summary>
        /// Flushes stats to Steam servers.
        /// Call after batch stat updates or periodically.
        /// </summary>
        void FlushStats();

        #endregion

        #region Events

        /// <summary>
        /// Fired when an achievement is unlocked.
        /// Parameter is the achievement ID.
        /// </summary>
        event Action<string> OnAchievementUnlocked;

        /// <summary>
        /// Fired when the progression tier changes.
        /// </summary>
        event Action<ProgressionTier> OnTierChanged;

        #endregion
    }
}
