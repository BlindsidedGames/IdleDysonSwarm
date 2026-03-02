using System.Collections.Generic;
using IdleDysonSwarm.Data.Balance;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Provides read-only upgrade definition access for simulation/reality balancing.
    /// </summary>
    public interface ISimulationUpgradeCatalog
    {
        /// <summary>
        /// Gets all known simulation/reality upgrade definitions.
        /// </summary>
        /// <returns>Upgrade definitions in database order.</returns>
        IReadOnlyList<SimulationUpgradeDefinition> GetAll();

        /// <summary>
        /// Gets definitions filtered by gameplay layer.
        /// </summary>
        /// <param name="layer">Layer to filter by.</param>
        /// <returns>Matching upgrade definitions.</returns>
        IReadOnlyList<SimulationUpgradeDefinition> GetByLayer(SimulationUpgradeLayer layer);

        /// <summary>
        /// Tries to resolve a definition by stable key.
        /// </summary>
        /// <param name="key">Stable key.</param>
        /// <param name="definition">Resolved definition.</param>
        /// <returns>True when key exists in the catalog.</returns>
        bool TryGet(string key, out SimulationUpgradeDefinition definition);

        /// <summary>
        /// Resolves the configured strange matter cost for an upgrade key.
        /// </summary>
        /// <param name="key">Stable key.</param>
        /// <param name="fallback">Fallback cost when key is missing.</param>
        /// <returns>Configured cost or fallback value.</returns>
        int GetCost(string key, int fallback = 0);
    }
}
