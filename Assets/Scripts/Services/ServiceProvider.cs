using GameData;
using IdleDysonSwarm.Data;
using UnityEngine;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// MonoBehaviour that registers all services with the ServiceLocator at startup.
    /// Add this component to a GameObject in your scene to enable dependency injection.
    /// </summary>
    [DefaultExecutionOrder(-2000)] // Execute very early, before presenters call ServiceLocator.Get
    public sealed class ServiceProvider : MonoBehaviour
    {
        [Header("Dependencies")]
        [SerializeField]
        [Tooltip("Reference to the GameDataRegistry (definitions database)")]
        private GameDataRegistry gameDataRegistry;

        [SerializeField]
        [Tooltip("Reference to the QuantumUpgradeDatabase (optional - falls back to constants if missing)")]
        private QuantumUpgradeDatabase quantumUpgradeDatabase;

        private void Awake()
        {
            RegisterServices();
        }

        private void OnDestroy()
        {
            // Clean up services when destroyed
            ServiceLocator.Clear();
        }

        private void RegisterServices()
        {
            // Validate dependencies - use FindFirstObjectByType as fallback since
            // GameDataRegistry.Instance may not be set yet if its Awake() hasn't run
            if (gameDataRegistry == null)
            {
                gameDataRegistry = FindFirstObjectByType<GameDataRegistry>();
                if (gameDataRegistry == null)
                {
                    Debug.LogError("[ServiceProvider] GameDataRegistry not found in scene! Services will not work correctly.");
                    return;
                }
                Debug.Log("[ServiceProvider] GameDataRegistry found via FindFirstObjectByType");
            }

            Debug.Log("[ServiceProvider] Registering services...");

            // Register core services
            var gameStateService = new GameStateService();
            ServiceLocator.Register<IGameStateService>(gameStateService);
            Debug.Log("  ✓ IGameStateService registered");

            var gameDataService = new GameDataService(gameDataRegistry);
            ServiceLocator.Register<IGameDataService>(gameDataService);
            Debug.Log("  ✓ IGameDataService registered");

            var facilityService = new FacilityService(gameStateService);
            ServiceLocator.Register<IFacilityService>(facilityService);
            Debug.Log("  ✓ IFacilityService registered");

            // Register Quantum/Reality system services
            // QuantumUpgradeDatabase is optional - service falls back to constants if missing
            if (quantumUpgradeDatabase == null)
            {
                quantumUpgradeDatabase = Resources.Load<QuantumUpgradeDatabase>("QuantumUpgradeDatabase");
                if (quantumUpgradeDatabase == null)
                {
                    Debug.LogWarning("[ServiceProvider] QuantumUpgradeDatabase not found - using constant fallbacks");
                }
            }
            var quantumService = new QuantumService(quantumUpgradeDatabase);
            ServiceLocator.Register<IQuantumService>(quantumService);
            Debug.Log("  ✓ IQuantumService registered");

            var workerService = new WorkerService();
            ServiceLocator.Register<IWorkerService>(workerService);
            Debug.Log("  ✓ IWorkerService registered");

            var avocadoService = new AvocadoService();
            ServiceLocator.Register<IAvocadoService>(avocadoService);
            Debug.Log("  ✓ IAvocadoService registered");

            Debug.Log("[ServiceProvider] All services registered successfully!");
        }

        [ContextMenu("Verify Services")]
        private void VerifyServices()
        {
            Debug.Log("[ServiceProvider] Verifying services...");

            bool allRegistered = true;

            allRegistered &= CheckService<IGameStateService>();
            allRegistered &= CheckService<IGameDataService>();
            allRegistered &= CheckService<IFacilityService>();
            allRegistered &= CheckService<IQuantumService>();
            allRegistered &= CheckService<IWorkerService>();
            allRegistered &= CheckService<IAvocadoService>();

            if (allRegistered)
            {
                Debug.Log("[ServiceProvider] ✓ All services verified successfully!");
            }
            else
            {
                Debug.LogWarning("[ServiceProvider] ⚠ Some services are not registered!");
            }
        }

        private bool CheckService<TService>() where TService : class
        {
            bool isRegistered = ServiceLocator.IsRegistered<TService>();
            string serviceName = typeof(TService).Name;

            if (isRegistered)
            {
                Debug.Log($"  ✓ {serviceName} is registered");
            }
            else
            {
                Debug.LogWarning($"  ✗ {serviceName} is NOT registered");
            }

            return isRegistered;
        }
    }
}
