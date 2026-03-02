using System;
using System.Collections.Generic;
using IdleDysonSwarm.Services;
using UnityEngine;

/*
 * SimulationUpgradeDatabase
 * Purpose: Indexed catalog of simulation/reality upgrade definitions.
 * Runs: Runtime + Editor.
 * Primary entry points: TryGet(), GetByLayer(), GetCost().
 * Owns vs delegates: Owns lookup/index caches; delegates actual state ownership and side-effect execution to runtime adapters.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/ResearchManager.cs (cost and grouping reads)
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeEffectApplier.cs
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 *
 * Change notes:
 * - Definition key uniqueness is required; duplicates are ignored with warnings.
 * - Database ordering is used by editor presentation and can affect default progression UX.
 */
namespace IdleDysonSwarm.Data.Balance
{
    /// <summary>
    /// Catalog asset containing simulation/reality upgrade definitions.
    /// </summary>
    [CreateAssetMenu(fileName = "SimulationUpgradeDatabase", menuName = "Idle Dyson/Balance/Simulation Upgrade Database")]
    public sealed class SimulationUpgradeDatabase : ScriptableObject, ISimulationUpgradeCatalog
    {
        /// <summary>
        /// Upgrade definitions included in this catalog.
        /// </summary>
        [SerializeField]
        private List<SimulationUpgradeDefinition> upgrades = new List<SimulationUpgradeDefinition>();

        /// <summary>
        /// Runtime lookup cache by key.
        /// </summary>
        private Dictionary<string, SimulationUpgradeDefinition> _byKey;

        /// <summary>
        /// Runtime grouping cache by layer.
        /// </summary>
        private Dictionary<SimulationUpgradeLayer, List<SimulationUpgradeDefinition>> _byLayer;

        /// <summary>
        /// Rebuilds caches on asset load.
        /// </summary>
        private void OnEnable()
        {
            RebuildCaches();
        }

        /// <summary>
        /// Rebuilds caches on asset edits.
        /// </summary>
        private void OnValidate()
        {
            RebuildCaches();
        }

        /// <summary>
        /// Gets all upgrade definitions in database order.
        /// </summary>
        /// <returns>All definitions.</returns>
        public IReadOnlyList<SimulationUpgradeDefinition> GetAll()
        {
            return upgrades;
        }

        /// <summary>
        /// Gets all definitions for a layer.
        /// </summary>
        /// <param name="layer">Layer filter.</param>
        /// <returns>Definitions in this layer.</returns>
        public IReadOnlyList<SimulationUpgradeDefinition> GetByLayer(SimulationUpgradeLayer layer)
        {
            EnsureCaches();
            return _byLayer.TryGetValue(layer, out List<SimulationUpgradeDefinition> list)
                ? list
                : Array.Empty<SimulationUpgradeDefinition>();
        }

        /// <summary>
        /// Tries to resolve a definition by key.
        /// </summary>
        /// <param name="key">Stable key.</param>
        /// <param name="definition">Resolved definition.</param>
        /// <returns>True when found.</returns>
        public bool TryGet(string key, out SimulationUpgradeDefinition definition)
        {
            EnsureCaches();
            if (string.IsNullOrWhiteSpace(key))
            {
                definition = null;
                return false;
            }

            return _byKey.TryGetValue(key, out definition);
        }

        /// <summary>
        /// Gets strange matter cost for an upgrade key.
        /// </summary>
        /// <param name="key">Stable key.</param>
        /// <param name="fallback">Fallback value.</param>
        /// <returns>Configured cost or fallback.</returns>
        public int GetCost(string key, int fallback = 0)
        {
            return TryGet(key, out SimulationUpgradeDefinition definition) ? definition.cost : fallback;
        }

        /// <summary>
        /// Replaces upgrade list and rebuilds caches.
        /// </summary>
        /// <param name="newUpgrades">Replacement definitions.</param>
        public void ReplaceUpgrades(List<SimulationUpgradeDefinition> newUpgrades)
        {
            upgrades = newUpgrades ?? new List<SimulationUpgradeDefinition>();
            RebuildCaches();
        }

        /// <summary>
        /// Ensures lookup caches are initialized.
        /// </summary>
        private void EnsureCaches()
        {
            if (_byKey == null || _byLayer == null)
            {
                RebuildCaches();
            }
        }

        /// <summary>
        /// Rebuilds key and layer lookup caches.
        /// </summary>
        private void RebuildCaches()
        {
            _byKey = new Dictionary<string, SimulationUpgradeDefinition>(StringComparer.Ordinal);
            _byLayer = new Dictionary<SimulationUpgradeLayer, List<SimulationUpgradeDefinition>>();

            if (upgrades == null)
            {
                return;
            }

            for (int i = 0; i < upgrades.Count; i++)
            {
                SimulationUpgradeDefinition definition = upgrades[i];
                if (definition == null || string.IsNullOrWhiteSpace(definition.key))
                {
                    continue;
                }

                if (_byKey.ContainsKey(definition.key))
                {
                    Debug.LogWarning($"Duplicate simulation upgrade key '{definition.key}' in {name}.", this);
                    continue;
                }

                _byKey.Add(definition.key, definition);

                if (!_byLayer.TryGetValue(definition.layer, out List<SimulationUpgradeDefinition> layerList))
                {
                    layerList = new List<SimulationUpgradeDefinition>();
                    _byLayer.Add(definition.layer, layerList);
                }

                layerList.Add(definition);
            }
        }
    }
}
