using System;
using System.Collections.Generic;
using Blindsided.Utilities;
using Expansion;
using GameData;
using IdleDysonSwarm.Data.Conditions;
using IdleDysonSwarm.Data.Steam;
using Systems.Stats;
using UnityEngine;
using static Expansion.Oracle;
#if !DISABLESTEAMWORKS
using Steamworks;
#endif

namespace IdleDysonSwarm.Services.Steam
{
    /// <summary>
    /// Default implementation of ISteamIntegrationService.
    /// Wraps Steamworks.NET for Rich Presence, achievements, and stats.
    /// </summary>
    public sealed class SteamIntegrationService : ISteamIntegrationService
    {
        private ProgressionTier _lastTier = ProgressionTier.EarlyGame;
        private readonly HashSet<string> _foundSecrets = new HashSet<string>();
        private AchievementRegistry _achievementRegistry;

        #region Data Accessors

        private DysonVersePrestigeData PrestigeData => StaticPrestigeData;
        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;
        private DysonVerseInfinityData InfinityData => StaticInfinityData;
        private AvocadoData AvocadoData => StaticSaveSettings.avocadoData;

        #endregion

        #region State Properties

        public bool IsAvailable
        {
            get
            {
                #if !DISABLESTEAMWORKS
                return IdleDysonSwarm.Platform.SteamManager.Initialized;
                #else
                return false;
                #endif
            }
        }

        public ProgressionTier CurrentTier
        {
            get
            {
                // Check tiers from highest to lowest
                if (AvocadoData?.unlocked == true)
                    return ProgressionTier.Avocado;

                if (IsRealityUnlocked())
                    return ProgressionTier.Reality;

                if (PrestigePlus?.points >= 1)
                    return ProgressionTier.Quantum;

                if (PrestigeData?.infinityPoints >= 1)
                    return ProgressionTier.Infinity;

                return ProgressionTier.EarlyGame;
            }
        }

        #endregion

        #region Initialization

        /// <summary>
        /// Sets the achievement registry for condition-based achievement checking.
        /// Called by ServiceProvider after registration.
        /// </summary>
        public void SetAchievementRegistry(AchievementRegistry registry)
        {
            _achievementRegistry = registry;
        }

        /// <summary>
        /// Loads found secrets from save data.
        /// </summary>
        public void LoadFoundSecrets(IEnumerable<string> secrets)
        {
            _foundSecrets.Clear();
            if (secrets != null)
            {
                foreach (var secret in secrets)
                {
                    _foundSecrets.Add(secret);
                }
            }
        }

        /// <summary>
        /// Gets the currently found secrets for saving.
        /// </summary>
        public IReadOnlyCollection<string> GetFoundSecrets() => _foundSecrets;

        #endregion

        #region Rich Presence

        public void UpdateRichPresence()
        {
            if (!IsAvailable)
                return;

            #if !DISABLESTEAMWORKS
            var tier = CurrentTier;

            // Check for tier change
            if (tier != _lastTier)
            {
                _lastTier = tier;
                OnTierChanged?.Invoke(tier);
            }

            // Build status string based on tier
            string status = BuildRichPresenceStatus(tier);

            // Set Rich Presence
            SteamFriends.SetRichPresence("steam_display", "#Status_InGame");
            SteamFriends.SetRichPresence("status", status);
            #endif
        }

        private string BuildRichPresenceStatus(ProgressionTier tier)
        {
            switch (tier)
            {
                case ProgressionTier.EarlyGame:
                    return FormatEarlyGameStatus();

                case ProgressionTier.Infinity:
                    return FormatInfinityStatus();

                case ProgressionTier.Quantum:
                    return FormatQuantumStatus();

                case ProgressionTier.Reality:
                    return FormatRealityStatus();

                case ProgressionTier.Avocado:
                    return FormatAvocadoStatus();

                default:
                    return "Playing";
            }
        }

        private string FormatEarlyGameStatus()
        {
            double bots = InfinityData?.bots ?? 0;
            return $"{FormatNumberSimple(bots)} Bots";
        }

        private string FormatInfinityStatus()
        {
            long ip = PrestigeData?.infinityPoints ?? 0;
            double bots = InfinityData?.bots ?? 0;
            return $"{ip} IP | {FormatNumberSimple(bots)} Bots";
        }

        private string FormatQuantumStatus()
        {
            long qp = PrestigePlus?.points ?? 0;
            long ip = PrestigeData?.infinityPoints ?? 0;
            return $"{qp} QP | {ip} IP";
        }

        private string FormatRealityStatus()
        {
            long qp = PrestigePlus?.points ?? 0;
            return $"Reality | {qp} QP";
        }

        private string FormatAvocadoStatus()
        {
            long qp = PrestigePlus?.points ?? 0;
            double multiplier = CalculateAvocadoMultiplier();
            return $"{FormatNumberSimple(multiplier)}x Avocado | {qp} QP";
        }

        private double CalculateAvocadoMultiplier()
        {
            if (AvocadoData == null || !AvocadoData.unlocked)
                return 1.0;

            double multi = 1.0;

            if (AvocadoData.infinityPoints >= 10)
                multi *= Math.Log10(AvocadoData.infinityPoints);

            if (AvocadoData.influence >= 10)
                multi *= Math.Log10(AvocadoData.influence);

            if (AvocadoData.strangeMatter >= 10)
                multi *= Math.Log10(AvocadoData.strangeMatter);

            if (AvocadoData.overflowMultiplier >= 1)
                multi *= 1 + AvocadoData.overflowMultiplier;

            return multi;
        }

        /// <summary>
        /// Simple number formatting for Rich Presence (no color codes).
        /// </summary>
        private string FormatNumberSimple(double value)
        {
            if (value < 1000)
                return value.ToString("F0");

            // Use scientific notation for large numbers
            if (value >= 1e15)
                return value.ToString("0.00e0");

            // Use CalcUtils prefix array for medium numbers
            int exponentGroup = Math.Max((int)Math.Floor(Math.Log10(value) / 3), 0);
            if (exponentGroup < CalcUtils.Prefix.Length)
            {
                double scale = Math.Pow(10, exponentGroup * 3);
                double mantissa = value / scale;
                return $"{mantissa:F2}{CalcUtils.Prefix[exponentGroup]}";
            }

            return value.ToString("0.00e0");
        }

        public void ClearRichPresence()
        {
            if (!IsAvailable)
                return;

            #if !DISABLESTEAMWORKS
            SteamFriends.ClearRichPresence();
            #endif
        }

        #endregion

        #region Achievements

        public bool IsAchievementUnlocked(string achievementId)
        {
            if (!IsAvailable || string.IsNullOrEmpty(achievementId))
                return false;

            #if !DISABLESTEAMWORKS
            if (SteamUserStats.GetAchievement(achievementId, out bool achieved))
                return achieved;
            #endif

            return false;
        }

        public bool TryUnlockAchievement(string achievementId)
        {
            if (!IsAvailable || string.IsNullOrEmpty(achievementId))
                return false;

            // Already unlocked?
            if (IsAchievementUnlocked(achievementId))
                return true;

            #if !DISABLESTEAMWORKS
            if (SteamUserStats.SetAchievement(achievementId))
            {
                SteamUserStats.StoreStats();
                OnAchievementUnlocked?.Invoke(achievementId);
                Debug.Log($"[Steam] Achievement unlocked: {achievementId}");
                return true;
            }

            Debug.LogWarning($"[Steam] Failed to unlock achievement: {achievementId}");
            #endif

            return false;
        }

        public void CheckAllAchievements()
        {
            if (!IsAvailable || _achievementRegistry == null)
                return;

            // Build context for condition evaluation
            var context = new EffectContext(
                InfinityData,
                PrestigeData,
                StaticSkillTreeData,
                PrestigePlus
            );

            foreach (var achievement in _achievementRegistry.Achievements)
            {
                if (achievement == null || string.IsNullOrEmpty(achievement.steamAchievementId))
                    continue;

                // Skip if already unlocked
                if (IsAchievementUnlocked(achievement.steamAchievementId))
                    continue;

                // Check condition
                if (achievement.unlockCondition != null && achievement.unlockCondition.Evaluate(context))
                {
                    TryUnlockAchievement(achievement.steamAchievementId);
                }
            }
        }

        public void RegisterSecretFound(string secretId)
        {
            if (string.IsNullOrEmpty(secretId))
                return;

            if (_foundSecrets.Add(secretId))
            {
                // New secret discovered - update stat immediately
                UpdateSecretsFoundStat();
            }
        }

        /// <summary>
        /// Gets the number of secrets found.
        /// </summary>
        public int FoundSecretsCount => _foundSecrets.Count;

        /// <summary>
        /// Checks if a specific secret has been found.
        /// </summary>
        public bool IsSecretFound(string secretId) => _foundSecrets.Contains(secretId);

        #endregion

        #region Stats

        public void SetStat(string statName, int value)
        {
            if (!IsAvailable || string.IsNullOrEmpty(statName))
                return;

            #if !DISABLESTEAMWORKS
            SteamUserStats.SetStat(statName, value);
            #endif
        }

        public void SetStat(string statName, float value)
        {
            if (!IsAvailable || string.IsNullOrEmpty(statName))
                return;

            #if !DISABLESTEAMWORKS
            SteamUserStats.SetStat(statName, value);
            #endif
        }

        public int GetIntStat(string statName)
        {
            if (!IsAvailable || string.IsNullOrEmpty(statName))
                return 0;

            #if !DISABLESTEAMWORKS
            if (SteamUserStats.GetStat(statName, out int value))
                return value;
            #endif

            return 0;
        }

        public float GetFloatStat(string statName)
        {
            if (!IsAvailable || string.IsNullOrEmpty(statName))
                return 0f;

            #if !DISABLESTEAMWORKS
            if (SteamUserStats.GetStat(statName, out float value))
                return value;
            #endif

            return 0f;
        }

        public void FlushStats()
        {
            if (!IsAvailable)
                return;

            #if !DISABLESTEAMWORKS
            SteamUserStats.StoreStats();
            #endif
        }

        /// <summary>
        /// Updates exponent-based stats for large values.
        /// </summary>
        public void UpdateExponentStats()
        {
            if (!IsAvailable)
                return;

            // Track highest bot exponent
            double bots = InfinityData?.bots ?? 0;
            if (bots > 0)
            {
                int exponent = (int)Math.Floor(Math.Log10(bots));
                int currentExponent = GetIntStat("HIGHEST_BOT_EXPONENT");
                if (exponent > currentExponent)
                {
                    SetStat("HIGHEST_BOT_EXPONENT", exponent);

                    // Show progress for BOTS_42QI achievement (target: exponent 19 = 42Qi)
                    #if !DISABLESTEAMWORKS
                    SteamUserStats.IndicateAchievementProgress("BOTS_42QI", (uint)exponent, 19);
                    #endif
                }
            }

            // Track highest influence exponent
            long influence = StaticSaveSettings?.saveData?.influence ?? 0;
            if (influence > 0)
            {
                int exponent = (int)Math.Floor(Math.Log10(influence));
                int currentExponent = GetIntStat("HIGHEST_INFLUENCE_EXPONENT");
                if (exponent > currentExponent)
                {
                    SetStat("HIGHEST_INFLUENCE_EXPONENT", exponent);
                }
            }
        }

        /// <summary>
        /// Updates skill points assigned stat.
        /// </summary>
        public void UpdateSkillPointsStat()
        {
            if (!IsAvailable)
                return;

            int totalAssigned = CountAssignedSkillPoints();
            int currentStat = GetIntStat("SKILL_POINTS_ASSIGNED");

            if (totalAssigned != currentStat)
            {
                SetStat("SKILL_POINTS_ASSIGNED", totalAssigned);

                // Show progress for SKILLS_ASSIGNED achievement (target: 42 skill points)
                #if !DISABLESTEAMWORKS
                SteamUserStats.IndicateAchievementProgress("SKILLS_ASSIGNED", (uint)totalAssigned, 42);
                #endif
            }
        }

        /// <summary>
        /// Counts total skill points currently assigned in the skill tree.
        /// </summary>
        private int CountAssignedSkillPoints()
        {
            int total = 0;

            var registry = GameDataRegistry.Instance;
            if (registry == null || registry.skillDatabase == null)
                return 0;

            var skillStateById = InfinityData?.skillStateById;
            if (skillStateById == null)
                return 0;

            foreach (var skill in registry.skillDatabase.skills)
            {
                if (skill == null || string.IsNullOrEmpty(skill.id))
                    continue;

                if (skillStateById.TryGetValue(skill.id, out var state) && state.owned)
                {
                    total += skill.cost;
                }
            }

            return total;
        }

        /// <summary>
        /// Updates secrets found stat.
        /// </summary>
        public void UpdateSecretsFoundStat()
        {
            if (!IsAvailable)
                return;

            int secretsFound = _foundSecrets.Count;
            int currentStat = GetIntStat("SECRETS_FOUND");

            if (secretsFound != currentStat)
            {
                SetStat("SECRETS_FOUND", secretsFound);

                // Show progress for EASTER_SECRETS achievement
                // TODO: Set correct total once all secrets are identified
                #if !DISABLESTEAMWORKS
                const int totalSecrets = 10; // Placeholder - update when total is known
                SteamUserStats.IndicateAchievementProgress("EASTER_SECRETS", (uint)secretsFound, (uint)totalSecrets);
                #endif
            }
        }

        #endregion

        #region Events

        public event Action<string> OnAchievementUnlocked;
        public event Action<ProgressionTier> OnTierChanged;

        #endregion

        #region Helpers

        private bool IsRealityUnlocked()
        {
            // Reality is unlocked when player has quantum points OR max secrets
            return (PrestigePlus?.points >= 1) ||
                   (PrestigeData?.secretsOfTheUniverse >= 27);
        }

        #endregion
    }
}
