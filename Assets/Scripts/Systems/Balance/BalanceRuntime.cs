using Expansion;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Constants;

/*
 * BalanceRuntime
 * Purpose: Runtime access shim for ScriptableObject-backed balance data with safe constant fallbacks.
 * Runs: Runtime + Editor play mode.
 * Primary entry points: WorkerBatchSize, BaseWorkerGenerationSpeed, AvocadoLogThreshold, TryGetFacilityEntry(), GetUpgradeCost().
 * Owns vs delegates: Owns registry loading and fallback policy; delegates data ownership to BalanceToolRegistry assets.
 *
 * Interacts with:
 * - Assets/Scripts/Services/WorkerService.cs
 * - Assets/Scripts/Expansion/ArtifactController.cs
 * - Assets/Scripts/Systems/Facilities/FacilityCountAccessor.cs
 * - Assets/Scripts/Systems/Facilities/FacilityEffectPipeline.cs
 *
 * Change notes:
 * - Fallbacks preserve gameplay when registry assets are missing.
 * - If fallback values change, keep constants and tuning defaults aligned to avoid divergent behavior.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// Runtime helper for reading balance data from registry assets.
    /// </summary>
    public static class BalanceRuntime
    {
        /// <summary>
        /// Gets the loaded registry instance, if available.
        /// </summary>
        public static BalanceToolRegistry Registry => BalanceToolRegistry.LoadFromResources();

        /// <summary>
        /// Gets the facility balance profile from the registry.
        /// </summary>
        public static FacilityBalanceProfile FacilityProfile => Registry != null ? Registry.facilityBalanceProfile : null;

        /// <summary>
        /// Gets the simulation/reality upgrade database from the registry.
        /// </summary>
        public static SimulationUpgradeDatabase UpgradeDatabase => Registry != null ? Registry.simulationUpgradeDatabase : null;

        /// <summary>
        /// Gets the reality system tuning asset from the registry.
        /// </summary>
        public static RealitySystemTuning RealityTuning => Registry != null ? Registry.realitySystemTuning : null;

        /// <summary>
        /// Gets configured worker batch size.
        /// </summary>
        public static int WorkerBatchSize
        {
            get
            {
                RealitySystemTuning tuning = RealityTuning;
                return tuning != null && tuning.workerBatchSize > 0
                    ? tuning.workerBatchSize
                    : RealityConstants.WorkerBatchSize;
            }
        }

        /// <summary>
        /// Gets configured base worker generation speed.
        /// </summary>
        public static int BaseWorkerGenerationSpeed
        {
            get
            {
                RealitySystemTuning tuning = RealityTuning;
                return tuning != null && tuning.baseWorkerGenerationSpeed >= 0
                    ? tuning.baseWorkerGenerationSpeed
                    : RealityConstants.BaseWorkerGenerationSpeed;
            }
        }

        /// <summary>
        /// Gets configured avocado log threshold.
        /// </summary>
        public static int AvocadoLogThreshold
        {
            get
            {
                RealitySystemTuning tuning = RealityTuning;
                return tuning != null && tuning.avocadoLogThreshold > 0
                    ? tuning.avocadoLogThreshold
                    : RealityConstants.AvocadoLogThreshold;
            }
        }

        /// <summary>
        /// Tries to resolve a facility profile entry by ID.
        /// </summary>
        /// <param name="facilityId">Facility ID.</param>
        /// <param name="entry">Resolved profile entry.</param>
        /// <returns>True when profile and entry exist.</returns>
        public static bool TryGetFacilityEntry(string facilityId, out FacilityBalanceProfile.FacilityBalanceEntry entry)
        {
            FacilityBalanceProfile profile = FacilityProfile;
            if (profile == null)
            {
                entry = null;
                return false;
            }

            return profile.TryGetEntry(facilityId, out entry);
        }

        /// <summary>
        /// Gets an upgrade cost from the data catalog.
        /// </summary>
        /// <param name="key">Upgrade key.</param>
        /// <param name="fallback">Fallback when not found.</param>
        /// <returns>Configured or fallback cost.</returns>
        public static int GetUpgradeCost(string key, int fallback = 0)
        {
            SimulationUpgradeDatabase database = UpgradeDatabase;
            if (database != null && database.TryGet(key, out SimulationUpgradeDefinition definition))
            {
                return definition.cost;
            }

            if (SimulationUpgradeDefaultsCatalog.TryGetSpec(key, out SimulationUpgradeSpec spec))
            {
                return spec.Cost;
            }

            return fallback;
        }

        /// <summary>
        /// Checks a configured quantum gate against current prestige unlock flags.
        /// </summary>
        /// <param name="gate">Quantum gate enum.</param>
        /// <param name="prestigeData">Prestige data source.</param>
        /// <returns>True when gate requirement is satisfied.</returns>
        public static bool IsQuantumGateUnlocked(QuantumMegaUnlockGate gate, Oracle.DysonVersePrestigeData prestigeData)
        {
            if (gate == QuantumMegaUnlockGate.None)
            {
                return true;
            }

            if (prestigeData == null)
            {
                return false;
            }

            return gate switch
            {
                QuantumMegaUnlockGate.MatrioshkaBrains => prestigeData.unlockedMatrioshkaBrains,
                QuantumMegaUnlockGate.BirchPlanets => prestigeData.unlockedBirchPlanets,
                QuantumMegaUnlockGate.GalacticBrains => prestigeData.unlockedGalacticBrains,
                _ => false
            };
        }
    }
}
