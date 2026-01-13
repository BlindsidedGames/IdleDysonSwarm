using IdleDysonSwarm.Data.Conditions;
using UnityEngine;
using Systems.Stats;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Effect Definition")]
    public sealed class EffectDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        public string targetStatId;
        public StatOperation operation;
        public double value;
        public double perLevel;
        public int order;

        [Header("Condition (choose one)")]
        [Tooltip("Scriptable condition asset (preferred). Takes precedence over conditionId if set.")]
        [SerializeField] private EffectCondition _condition;

        [Tooltip("Legacy string-based condition ID. Use _condition instead for new effects.")]
        public string conditionId;

        [Header("Target Filters")]
        public string[] targetFacilityIds;
        public string[] targetFacilityTags;

        /// <summary>
        /// Gets the scriptable condition asset if set.
        /// </summary>
        public EffectCondition Condition => _condition;

        /// <summary>
        /// Returns true if this effect has any condition (scriptable or legacy string).
        /// </summary>
        public bool HasCondition => _condition != null || !string.IsNullOrEmpty(conditionId);

        /// <summary>
        /// Returns true if this effect uses the new scriptable condition system.
        /// </summary>
        public bool UsesScriptableCondition => _condition != null;
    }
}
