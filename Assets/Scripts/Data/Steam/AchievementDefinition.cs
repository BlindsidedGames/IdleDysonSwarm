using IdleDysonSwarm.Data.Conditions;
using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Steam
{
    /// <summary>
    /// Defines a Steam achievement with its unlock condition.
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Steam/Achievement", fileName = "NewAchievement")]
    public class AchievementDefinition : ScriptableObject
    {
        [Header("Steam Configuration")]
        [Tooltip("The Steam achievement ID (e.g., FIRST_BOT). Must match Steamworks dashboard.")]
        public string steamAchievementId;

        [Header("Display")]
        [Tooltip("Display name shown in-game.")]
        public string displayName;

        [TextArea(2, 4)]
        [Tooltip("Description of how to unlock this achievement.")]
        public string description;

        [Tooltip("If true, description is hidden until unlocked.")]
        public bool isSecret;

        [Header("Unlock Condition")]
        [Tooltip("The condition that must be met to unlock this achievement. Uses the existing EffectCondition system.")]
        public EffectCondition unlockCondition;

        #if UNITY_EDITOR
        /// <summary>
        /// Editor preview of current condition state.
        /// </summary>
        public string EditorPreview
        {
            get
            {
                if (unlockCondition == null)
                    return "No condition set";

                if (!Application.isPlaying)
                    return "Enter Play Mode to preview";

                var context = new EffectContext(
                    Expansion.Oracle.StaticInfinityData,
                    Expansion.Oracle.StaticPrestigeData,
                    Expansion.Oracle.StaticSkillTreeData,
                    Expansion.Oracle.StaticSaveSettings?.prestigePlus
                );

                bool isMet = unlockCondition.Evaluate(context);
                string conditionPreview = unlockCondition.GetCurrentValuePreview(context);

                return $"{(isMet ? "MET" : "NOT MET")}: {conditionPreview}";
            }
        }
        #endif
    }
}
