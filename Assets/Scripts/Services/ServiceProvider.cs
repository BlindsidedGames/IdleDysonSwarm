using GameData;
using UnityEngine;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// MonoBehaviour that registers all services with the ServiceLocator at startup.
    /// Add this component to a GameObject in your scene to enable dependency injection.
    /// </summary>
    [DefaultExecutionOrder(-1000)] // Execute before other scripts
    public sealed class ServiceProvider : MonoBehaviour
    {
        [Header("Dependencies")]
        [SerializeField]
        [Tooltip("Reference to the GameDataRegistry (definitions database)")]
        private GameDataRegistry gameDataRegistry;

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
            // Validate dependencies
            if (gameDataRegistry == null)
            {
                gameDataRegistry = GameDataRegistry.Instance;
                if (gameDataRegistry == null)
                {
                    Debug.LogError("[ServiceProvider] GameDataRegistry not found! Services will not work correctly.");
                    return;
                }
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
