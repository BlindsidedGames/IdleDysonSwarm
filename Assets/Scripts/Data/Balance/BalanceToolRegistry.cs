using GameData;
using UnityEngine;

/*
 * BalanceToolRegistry
 * Purpose: Single registry asset for facility/reality balance data used by tooling and runtime adapters.
 * Runs: Runtime + Editor.
 * Primary entry points: LoadFromResources(), Instance.
 * Owns vs delegates: Owns references to balance databases; delegates business logic to runtime services and editor windows.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Balance/BalanceRuntime.cs
 * - Assets/Editor/Balance/BalanceTuningWindow.cs
 * - Assets/Editor/Balance/BalanceDataAssetCreator.cs
 *
 * Change notes:
 * - Registry is expected at Resources path `Balance/BalanceToolRegistry`.
 * - Moving/renaming the registry path requires synchronized update in BalanceRuntime loader.
 */
namespace IdleDysonSwarm.Data.Balance
{
    /// <summary>
    /// Registry asset containing top-level references for balance tooling and runtime reads.
    /// </summary>
    [CreateAssetMenu(fileName = "BalanceToolRegistry", menuName = "Idle Dyson/Balance/Balance Tool Registry")]
    public sealed class BalanceToolRegistry : ScriptableObject
    {
        /// <summary>
        /// Resources path used for runtime loading.
        /// </summary>
        public const string ResourcesPath = "Balance/BalanceToolRegistry";

        /// <summary>
        /// Facility definition database.
        /// </summary>
        public FacilityDatabase facilityDatabase;

        /// <summary>
        /// Facility progression and binding profile.
        /// </summary>
        public FacilityBalanceProfile facilityBalanceProfile;

        /// <summary>
        /// Simulation/reality upgrade catalog.
        /// </summary>
        public SimulationUpgradeDatabase simulationUpgradeDatabase;

        /// <summary>
        /// Worker/reality/artifact tuning values.
        /// </summary>
        public RealitySystemTuning realitySystemTuning;

        /// <summary>
        /// Optional diagnostics title used by editor reporting tools.
        /// </summary>
        public string diagnosticsReportTitle = "Balance Validation";

        /// <summary>
        /// Cached registry instance.
        /// </summary>
        private static BalanceToolRegistry _instance;

        /// <summary>
        /// Gets the loaded registry instance (or null when not found).
        /// </summary>
        public static BalanceToolRegistry Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = Resources.Load<BalanceToolRegistry>(ResourcesPath);
                }

                return _instance;
            }
        }

        /// <summary>
        /// Loads the registry from resources and returns it.
        /// </summary>
        /// <returns>Registry instance when present; otherwise null.</returns>
        public static BalanceToolRegistry LoadFromResources()
        {
            return Instance;
        }
    }
}
