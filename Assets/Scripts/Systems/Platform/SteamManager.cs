// SteamManager.cs
// Handles Steam API initialization and callback processing for Idle Dyson Swarm
// Based on Steamworks.NET patterns

using UnityEngine;
#if !DISABLESTEAMWORKS
using Steamworks;
#endif

namespace IdleDysonSwarm.Platform
{
    /// <summary>
    /// Manages Steam API initialization, callbacks, and lifecycle.
    /// Self-creating persistent singleton that persists across scenes.
    /// </summary>
    [DisallowMultipleComponent]
    public class SteamManager : MonoBehaviour
    {
        #if !DISABLESTEAMWORKS
        private static SteamManager _instance;
        private static bool _everInitialized;

        private bool _initialized;
        private SteamAPIWarningMessageHook_t _steamAPIWarningMessageHook;

        /// <summary>
        /// Returns true if Steam API has been successfully initialized.
        /// Always check this before calling any Steamworks functions.
        /// </summary>
        public static bool Initialized => _instance != null && _instance._initialized;

        /// <summary>
        /// Gets the singleton instance, creating one if needed.
        /// </summary>
        public static SteamManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    return new GameObject("SteamManager").AddComponent<SteamManager>();
                }
                return _instance;
            }
        }

        [AOT.MonoPInvokeCallback(typeof(SteamAPIWarningMessageHook_t))]
        private static void SteamAPIDebugTextHook(int severity, System.Text.StringBuilder message)
        {
            Debug.LogWarning($"[Steamworks] {message}");
        }

        private void Awake()
        {
            // Enforce singleton
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }

            _instance = this;

            // Steam API can only be initialized once per process
            if (_everInitialized)
            {
                // This is a domain reload (Unity 2019.3+) - just mark as initialized
                _initialized = true;
                return;
            }

            // Ensure we persist across scene loads
            DontDestroyOnLoad(gameObject);

            if (!Packsize.Test())
            {
                Debug.LogError("[Steamworks] Packsize test failed. The wrong version of Steamworks.NET is being run in this platform.");
                return;
            }

            if (!DllCheck.Test())
            {
                Debug.LogError("[Steamworks] DllCheck test failed. One or more Steamworks binaries seems to be the wrong version.");
                return;
            }

            try
            {
                // Initialize Steam API
                // Ensure steam_appid.txt exists in the project root with your app ID
                if (SteamAPI.RestartAppIfNecessary(new AppId_t(4348570)))
                {
                    Debug.Log("[Steamworks] Steam is restarting the application through Steam client.");
                    Application.Quit();
                    return;
                }
            }
            catch (System.DllNotFoundException e)
            {
                Debug.LogError($"[Steamworks] Could not load steam_api.dll/so/dylib. Make sure it exists and the correct version for your platform: {e}");
                return;
            }

            _initialized = SteamAPI.Init();
            if (!_initialized)
            {
                Debug.LogError("[Steamworks] SteamAPI.Init() failed. Ensure Steam is running and you have a valid steam_appid.txt.");
                return;
            }

            _everInitialized = true;
            Debug.Log($"[Steamworks] Steam API initialized successfully. User: {SteamFriends.GetPersonaName()}");
        }

        private void OnEnable()
        {
            if (_instance == null)
            {
                _instance = this;
            }

            if (!_initialized)
            {
                return;
            }

            // Hook up debug message callback
            if (_steamAPIWarningMessageHook == null)
            {
                _steamAPIWarningMessageHook = SteamAPIDebugTextHook;
                SteamClient.SetWarningMessageHook(_steamAPIWarningMessageHook);
            }
        }

        private void OnDestroy()
        {
            if (_instance != this)
            {
                return;
            }

            _instance = null;

            if (!_initialized)
            {
                return;
            }

            SteamAPI.Shutdown();
        }

        private void Update()
        {
            if (!_initialized)
            {
                return;
            }

            // Run Steam callbacks every frame
            SteamAPI.RunCallbacks();
        }

        #else
        public static bool Initialized => false;
        #endif
    }
}
