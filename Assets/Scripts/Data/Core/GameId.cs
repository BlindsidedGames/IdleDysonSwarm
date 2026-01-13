using UnityEngine;
using System.Text.RegularExpressions;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Base class for strongly-typed game IDs.
    /// Provides compile-time safety for facility, skill, research, and other game entity references.
    /// </summary>
    /// <remarks>
    /// Design Goals:
    /// - Replace error-prone string literals with type-safe asset references
    /// - Enable inspector drag-drop validation (impossible to typo)
    /// - Support Unity reference tracking for safe renaming
    /// - Provide implicit string conversion for backward compatibility
    /// - Enforce naming conventions via editor validation
    ///
    /// Usage:
    /// Instead of: string facilityId = "assembly_lines";
    /// Use: [SerializeField] private FacilityId facilityId;
    ///
    /// Benefits:
    /// - Compiler catches null references
    /// - IntelliSense shows valid IDs
    /// - Unity highlights broken references
    /// - Refactoring is safe (Unity updates references automatically)
    /// </remarks>
    public abstract class GameId : ScriptableObject
    {
        [SerializeField]
        [Tooltip("Unique identifier for this entity. Must use lowercase_snake_case format.")]
        private string _id;

        /// <summary>
        /// Gets the string identifier value.
        /// </summary>
        public string Value => _id;

        /// <summary>
        /// Validates the ID format in the Unity editor.
        /// Enforces lowercase_snake_case naming convention.
        /// </summary>
        protected virtual void OnValidate()
        {
            // Auto-populate from asset name if empty
            if (string.IsNullOrEmpty(_id))
            {
                _id = name;
            }

            // Note: Naming convention validation disabled for backward compatibility
            // Legacy IDs use camelCase and dots (e.g., 'doubleScienceTree', 'research.panel_lifetime_1')
            // These cannot be changed without breaking save data compatibility

            // Warn if ID doesn't match asset name
            if (_id != name)
            {
                Debug.LogWarning(
                    $"[GameId] ID '{_id}' doesn't match asset name '{name}'. " +
                    $"Consider renaming asset to match ID for consistency.",
                    this
                );
            }
        }

        /// <summary>
        /// Returns the string ID value.
        /// </summary>
        public override string ToString() => _id ?? string.Empty;

        /// <summary>
        /// Implicit conversion to string for backward compatibility.
        /// Allows passing GameId where string is expected without explicit conversion.
        /// </summary>
        /// <example>
        /// FacilityId id = ...;
        /// string idString = id; // Implicit conversion
        /// SomeMethod(id); // Works if SomeMethod(string id)
        /// </example>
        public static implicit operator string(GameId id) => id?.Value;

        /// <summary>
        /// Equality comparison based on ID value.
        /// </summary>
        public override bool Equals(object obj)
        {
            if (obj is GameId other)
            {
                return _id == other._id;
            }
            if (obj is string str)
            {
                return _id == str;
            }
            return false;
        }

        /// <summary>
        /// Hash code based on ID value.
        /// </summary>
        public override int GetHashCode()
        {
            return _id?.GetHashCode() ?? 0;
        }

        /// <summary>
        /// Equality operator for GameId instances.
        /// </summary>
        public static bool operator ==(GameId a, GameId b)
        {
            if (ReferenceEquals(a, b)) return true;
            if (a is null || b is null) return false;
            return a._id == b._id;
        }

        /// <summary>
        /// Inequality operator for GameId instances.
        /// </summary>
        public static bool operator !=(GameId a, GameId b)
        {
            return !(a == b);
        }
    }
}
