using IdleDysonSwarm.Data.Steam;
using UnityEngine;

namespace IdleDysonSwarm.Services.Steam
{
    /// <summary>
    /// MonoBehaviour that periodically updates Steam Rich Presence and checks achievements.
    /// Attach to a persistent GameObject in the scene.
    /// </summary>
    public class SteamIntegrationMonitor : MonoBehaviour
    {
        [Header("Update Intervals")]
        [Tooltip("How often to update Rich Presence (in seconds).")]
        [SerializeField]
        private float richPresenceInterval = 5f;

        [Tooltip("How often to check achievement conditions (in seconds).")]
        [SerializeField]
        private float achievementCheckInterval = 10f;

        [Tooltip("How often to update and flush stats (in seconds).")]
        [SerializeField]
        private float statsFlushInterval = 30f;

        [Header("References")]
        [Tooltip("Achievement registry containing all achievement definitions.")]
        [SerializeField]
        private AchievementRegistry achievementRegistry;

        private ISteamIntegrationService _steamService;
        private float _richPresenceTimer;
        private float _achievementTimer;
        private float _statsTimer;
        private float _playTimeAccumulator;

        private void Awake()
        {
            // Get service - may be null if Steam not initialized
            if (ServiceLocator.TryGet<ISteamIntegrationService>(out var service))
            {
                _steamService = service;

                // Set up the achievement registry
                if (_steamService is SteamIntegrationService steamService && achievementRegistry != null)
                {
                    steamService.SetAchievementRegistry(achievementRegistry);
                }
            }
        }

        private void Start()
        {
            // Initial updates
            if (_steamService != null && _steamService.IsAvailable)
            {
                _steamService.UpdateRichPresence();
                _steamService.CheckAllAchievements();
            }
        }

        private void Update()
        {
            if (_steamService == null || !_steamService.IsAvailable)
                return;

            float dt = Time.unscaledDeltaTime;

            // Update Rich Presence
            _richPresenceTimer += dt;
            if (_richPresenceTimer >= richPresenceInterval)
            {
                _richPresenceTimer = 0f;
                _steamService.UpdateRichPresence();
            }

            // Check achievements
            _achievementTimer += dt;
            if (_achievementTimer >= achievementCheckInterval)
            {
                _achievementTimer = 0f;
                _steamService.CheckAllAchievements();
            }

            // Update and flush stats
            _statsTimer += dt;
            _playTimeAccumulator += dt;
            if (_statsTimer >= statsFlushInterval)
            {
                _statsTimer = 0f;
                UpdateStats();
            }
        }

        private void UpdateStats()
        {
            if (_steamService == null)
                return;

            // Update play time
            float currentPlayTime = _steamService.GetFloatStat("TOTAL_PLAY_TIME");
            _steamService.SetStat("TOTAL_PLAY_TIME", currentPlayTime + _playTimeAccumulator);
            _playTimeAccumulator = 0f;

            // Update all tracked stats
            if (_steamService is SteamIntegrationService steamService)
            {
                steamService.UpdateExponentStats();
                steamService.UpdateSkillPointsStat();
                steamService.UpdateSecretsFoundStat();
            }

            // Flush to Steam
            _steamService.FlushStats();
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && _steamService != null && _steamService.IsAvailable)
            {
                // Flush stats when app is paused
                UpdateStats();
            }
        }

        private void OnApplicationQuit()
        {
            if (_steamService != null && _steamService.IsAvailable)
            {
                // Final stat flush and clear Rich Presence
                UpdateStats();
                _steamService.ClearRichPresence();
            }
        }

        /// <summary>
        /// Forces an immediate achievement check.
        /// Call this after significant game events.
        /// </summary>
        public void ForceAchievementCheck()
        {
            if (_steamService != null && _steamService.IsAvailable)
            {
                _steamService.CheckAllAchievements();
            }
        }

        /// <summary>
        /// Forces an immediate Rich Presence update.
        /// </summary>
        public void ForceRichPresenceUpdate()
        {
            if (_steamService != null && _steamService.IsAvailable)
            {
                _steamService.UpdateRichPresence();
            }
        }

        /// <summary>
        /// Registers a secret button as found.
        /// </summary>
        public void RegisterSecretFound(string secretId)
        {
            if (_steamService != null)
            {
                _steamService.RegisterSecretFound(secretId);
            }
        }
    }
}
