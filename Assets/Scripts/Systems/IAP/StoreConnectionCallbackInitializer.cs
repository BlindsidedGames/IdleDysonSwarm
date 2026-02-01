using System;
using Unity.Services.Core;
using UnityEngine;
using UnityEngine.Purchasing;

public static class StoreConnectionCallbackInitializer
{
#if UNITY_PURCHASING
    static bool s_Initialized;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void InitializeIap()
    {
        if (!Application.isPlaying || s_Initialized)
        {
            return;
        }

        s_Initialized = true;
        InitializeIapAsync();
    }

    static async void InitializeIapAsync()
    {
        try
        {
            var storeService = UnityIAPServices.DefaultStore();
            storeService.OnStoreDisconnected += OnStoreDisconnected;

            try
            {
                await UnityServices.InitializeAsync();
            }
            catch (Exception exception)
            {
                Debug.LogWarning($"UGS init failed: {exception.Message}");
            }

            // Kick off Codeless IAP initialization (manual; auto-init disabled in catalog).
            _ = CodelessIAPStoreListener.Instance;
        }
        catch (Exception exception)
        {
            Debug.LogWarning($"IAP init failed: {exception.Message}");
        }
    }

    static void OnStoreDisconnected(StoreConnectionFailureDescription description)
    {
        Debug.LogWarning($"IAP store disconnected: {description.message}");
    }
#endif
}
