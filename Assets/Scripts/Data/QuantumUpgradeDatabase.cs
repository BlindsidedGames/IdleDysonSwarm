using System.Collections.Generic;
using UnityEngine;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Database of all Quantum Leap upgrade definitions.
    /// Replaces hardcoded switch statements in QuantumService.
    /// </summary>
    [CreateAssetMenu(menuName = "Idle Dyson/Databases/Quantum Upgrade Database")]
    public sealed class QuantumUpgradeDatabase : ScriptableObject
    {
        [Tooltip("All quantum upgrade definitions")]
        [SerializeField] private List<QuantumUpgradeDefinition> upgrades = new();

        // Runtime lookup cache (built on first access)
        private Dictionary<string, QuantumUpgradeDefinition> _lookup;

        /// <summary>
        /// Read-only access to all upgrades.
        /// </summary>
        public IReadOnlyList<QuantumUpgradeDefinition> Upgrades => upgrades;

        /// <summary>
        /// Tries to get an upgrade definition by ID.
        /// </summary>
        /// <param name="id">Upgrade ID (matches QuantumUpgradeType enum name).</param>
        /// <param name="definition">The upgrade definition if found.</param>
        /// <returns>True if found, false otherwise.</returns>
        public bool TryGet(string id, out QuantumUpgradeDefinition definition)
        {
            BuildLookupIfNeeded();
            return _lookup.TryGetValue(id, out definition);
        }

        /// <summary>
        /// Gets an upgrade definition by ID, or null if not found.
        /// </summary>
        /// <param name="id">Upgrade ID (matches QuantumUpgradeType enum name).</param>
        /// <returns>The upgrade definition or null.</returns>
        public QuantumUpgradeDefinition Get(string id)
        {
            return TryGet(id, out var definition) ? definition : null;
        }

        private void BuildLookupIfNeeded()
        {
            if (_lookup != null) return;

            _lookup = new Dictionary<string, QuantumUpgradeDefinition>();
            foreach (var upgrade in upgrades)
            {
                if (upgrade != null && !string.IsNullOrEmpty(upgrade.id))
                {
                    if (_lookup.ContainsKey(upgrade.id))
                    {
                        Debug.LogWarning($"Duplicate quantum upgrade ID: {upgrade.id}");
                        continue;
                    }
                    _lookup[upgrade.id] = upgrade;
                }
            }
        }

        /// <summary>
        /// Clears the lookup cache (for editor use when definitions change).
        /// </summary>
        public void InvalidateCache()
        {
            _lookup = null;
        }

        private void OnValidate()
        {
            // Clear cache when edited in inspector
            _lookup = null;
        }
    }
}
