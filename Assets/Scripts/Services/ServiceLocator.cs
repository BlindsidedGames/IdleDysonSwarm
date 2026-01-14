using System;
using System.Collections.Generic;
using UnityEngine;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Simple service locator for dependency management.
    /// Provides global access to service instances without static coupling.
    /// </summary>
    /// <remarks>
    /// Usage:
    /// 1. Register services at startup: ServiceLocator.Register<IGameStateService>(new GameStateService());
    /// 2. Access services: var gameState = ServiceLocator.Get<IGameStateService>();
    /// 3. Optional: Use ServiceProvider MonoBehaviour for automatic registration
    /// </remarks>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> Services = new Dictionary<Type, object>();

        /// <summary>
        /// Registers a service implementation.
        /// </summary>
        /// <typeparam name="TService">The service interface type</typeparam>
        /// <param name="implementation">The service implementation instance</param>
        public static void Register<TService>(TService implementation) where TService : class
        {
            var serviceType = typeof(TService);
            if (Services.ContainsKey(serviceType))
            {
                Debug.LogWarning($"[ServiceLocator] Service {serviceType.Name} already registered. Replacing.");
            }
            Services[serviceType] = implementation;
        }

        /// <summary>
        /// Gets a registered service.
        /// </summary>
        /// <typeparam name="TService">The service interface type</typeparam>
        /// <returns>The service instance</returns>
        /// <exception cref="InvalidOperationException">Thrown if the service is not registered</exception>
        public static TService Get<TService>() where TService : class
        {
            var serviceType = typeof(TService);
            if (Services.TryGetValue(serviceType, out var service))
            {
                return service as TService;
            }

            throw new InvalidOperationException(
                $"[ServiceLocator] Service {serviceType.Name} not registered. " +
                $"Make sure to register it in ServiceProvider.Awake()."
            );
        }

        /// <summary>
        /// Tries to get a registered service.
        /// </summary>
        /// <typeparam name="TService">The service interface type</typeparam>
        /// <param name="service">The service instance if found</param>
        /// <returns>True if the service was found, false otherwise</returns>
        public static bool TryGet<TService>(out TService service) where TService : class
        {
            var serviceType = typeof(TService);
            if (Services.TryGetValue(serviceType, out var obj))
            {
                service = obj as TService;
                return service != null;
            }

            service = null;
            return false;
        }

        /// <summary>
        /// Clears all registered services.
        /// Useful for testing or scene transitions.
        /// </summary>
        public static void Clear()
        {
            Services.Clear();
        }

        /// <summary>
        /// Checks if a service is registered.
        /// </summary>
        public static bool IsRegistered<TService>() where TService : class
        {
            return Services.ContainsKey(typeof(TService));
        }
    }
}
