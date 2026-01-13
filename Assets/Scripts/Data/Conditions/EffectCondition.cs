using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Base class for data-driven effect conditions.
    /// Replaces hardcoded switch statements with scriptable, composable condition assets.
    /// </summary>
    /// <remarks>
    /// Design Goals:
    /// - Enable designers to create conditions without code changes
    /// - Support composition (AND, OR, NOT) for complex logic
    /// - Provide inspector preview for debugging
    /// - Maintain backward compatibility with legacy string conditions
    ///
    /// Usage:
    /// 1. Create a condition asset (e.g., FacilityCountCondition)
    /// 2. Configure thresholds in inspector
    /// 3. Assign to EffectDefinition.condition field
    /// 4. Runtime evaluates condition via Evaluate(context)
    /// </remarks>
    public abstract class EffectCondition : ScriptableObject
    {
        [SerializeField]
        [Tooltip("Optional description for inspector/debugging. Auto-generated if empty.")]
        private string _description;

        /// <summary>
        /// Evaluate this condition against the current game state.
        /// </summary>
        /// <param name="context">The current game state context.</param>
        /// <returns>True if the condition is met, false otherwise.</returns>
        public abstract bool Evaluate(EffectContext context);

        /// <summary>
        /// Get a human-readable description of this condition.
        /// </summary>
        /// <returns>Description string for debugging/display.</returns>
        public virtual string GetDescription()
        {
            if (!string.IsNullOrEmpty(_description))
                return _description;
            return GenerateDescription();
        }

        /// <summary>
        /// Generate a description based on configured values.
        /// Override in subclasses to provide meaningful descriptions.
        /// </summary>
        protected virtual string GenerateDescription()
        {
            return name;
        }

        /// <summary>
        /// Get a preview of the current value being evaluated.
        /// Useful for inspector debugging during play mode.
        /// </summary>
        /// <param name="context">The current game state context.</param>
        /// <returns>Current value preview string.</returns>
        public virtual string GetCurrentValuePreview(EffectContext context)
        {
            return string.Empty;
        }

        /// <summary>
        /// Implicit conversion to bool for simple null checks.
        /// Returns true if the condition is not null (actual evaluation requires Evaluate()).
        /// </summary>
        public static implicit operator bool(EffectCondition condition)
        {
            return condition != null;
        }
    }
}
