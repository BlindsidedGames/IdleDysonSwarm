using System.Collections.Generic;
using UnityEngine;

namespace IdleDysonSwarm.Data.Steam
{
    /// <summary>
    /// Registry holding all achievement definitions for the game.
    /// Assign this to ServiceProvider or find it via Resources.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Steam/Achievement Registry", fileName = "AchievementRegistry")]
    public class AchievementRegistry : ScriptableObject
    {
        [Header("Achievements")]
        [Tooltip("All achievement definitions. Order does not matter.")]
        [SerializeField]
        private List<AchievementDefinition> achievements = new List<AchievementDefinition>();

        /// <summary>
        /// Gets all registered achievements.
        /// </summary>
        public IReadOnlyList<AchievementDefinition> Achievements => achievements;

        /// <summary>
        /// Gets an achievement by its Steam ID.
        /// </summary>
        /// <param name="steamId">The Steam achievement ID (e.g., "FIRST_BOT").</param>
        /// <returns>The achievement definition, or null if not found.</returns>
        public AchievementDefinition GetById(string steamId)
        {
            if (string.IsNullOrEmpty(steamId))
                return null;

            foreach (var achievement in achievements)
            {
                if (achievement != null && achievement.steamAchievementId == steamId)
                    return achievement;
            }

            return null;
        }

        /// <summary>
        /// Tries to get an achievement by its Steam ID.
        /// </summary>
        public bool TryGetById(string steamId, out AchievementDefinition achievement)
        {
            achievement = GetById(steamId);
            return achievement != null;
        }

        #if UNITY_EDITOR
        /// <summary>
        /// Validates all achievements have unique IDs.
        /// </summary>
        private void OnValidate()
        {
            var ids = new HashSet<string>();
            foreach (var achievement in achievements)
            {
                if (achievement == null)
                    continue;

                if (string.IsNullOrEmpty(achievement.steamAchievementId))
                {
                    Debug.LogWarning($"[AchievementRegistry] Achievement '{achievement.name}' has no Steam ID set.", achievement);
                    continue;
                }

                if (!ids.Add(achievement.steamAchievementId))
                {
                    Debug.LogError($"[AchievementRegistry] Duplicate Steam ID '{achievement.steamAchievementId}' found.", achievement);
                }
            }
        }
        #endif
    }
}
