using System;
using System.IO;
using UnityEngine;

namespace Systems.Save
{
    /*
    Purpose (runtime): Persist player-level entitlements separately from run saves.

    This replaces legacy PlayerPrefs("debug") usage so that:
    - Debug entitlement can survive a soft wipe of the run save.
    - Hard wipe can remove debug entitlement explicitly.

    Primary entry points:
    - EnsureLoaded(): call early (Oracle.Awake) to load + migrate once.
    - DebugEntitlementPurchased: get/set the debug entitlement.

    Interacts with:
    - UnityEngine.Application.persistentDataPath (storage location).
    - UnityEngine.PlayerPrefs ("debug" migration only).

    Change notes:
    - Keep migration logic for older installs that used PlayerPrefs("debug").
    - This store is for player-level entitlements only; do not put per-run state here.
    */
    public static class PlayerEntitlementsStore
    {
        [Serializable]
        private sealed class EntitlementsData
        {
            public int version = 1;
            public bool debugEntitlementPurchased;
        }

        private const string LegacyDebugPrefKey = "debug";
        private static readonly object Gate = new object();
        private static EntitlementsData _data;

        public static void EnsureLoaded()
        {
            lock (Gate)
            {
                if (_data != null) return;
                _data = LoadInternal();
                MigrateFromLegacyPlayerPrefsIfNeeded(_data);
                SaveInternal(_data);
            }
        }

        public static bool DebugEntitlementPurchased
        {
            get
            {
                EnsureLoaded();
                return _data.debugEntitlementPurchased;
            }
            set
            {
                EnsureLoaded();
                if (_data.debugEntitlementPurchased == value) return;
                _data.debugEntitlementPurchased = value;
                SaveInternal(_data);
            }
        }

        public static void ClearDebugEntitlement()
        {
            DebugEntitlementPurchased = false;
        }

        private static string GetEntitlementsPath()
        {
            return Path.Combine(Application.persistentDataPath, "entitlements.json");
        }

        private static EntitlementsData LoadInternal()
        {
            string path = GetEntitlementsPath();
            try
            {
                if (!File.Exists(path)) return new EntitlementsData();
                string json = File.ReadAllText(path);
                EntitlementsData loaded = JsonUtility.FromJson<EntitlementsData>(json);
                return loaded ?? new EntitlementsData();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Entitlements] Failed loading entitlements file; using defaults. {e.GetType().Name}: {e.Message}");
                return new EntitlementsData();
            }
        }

        private static void SaveInternal(EntitlementsData data)
        {
            string path = GetEntitlementsPath();
            try
            {
                string json = JsonUtility.ToJson(data);
                File.WriteAllText(path, json);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Entitlements] Failed saving entitlements file '{path}'. {e.GetType().Name}: {e.Message}");
            }
        }

        private static void MigrateFromLegacyPlayerPrefsIfNeeded(EntitlementsData data)
        {
            // One-time migration: old builds used PlayerPrefs("debug") as the global entitlement.
            try
            {
                if (PlayerPrefs.GetInt(LegacyDebugPrefKey, 0) != 1) return;
                data.debugEntitlementPurchased = true;
                PlayerPrefs.DeleteKey(LegacyDebugPrefKey);
                PlayerPrefs.Save();
                Debug.Log("[Entitlements] Migrated legacy PlayerPrefs(\"debug\") to entitlements.json.");
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Entitlements] Failed migrating legacy debug pref. {e.GetType().Name}: {e.Message}");
            }
        }
    }
}

