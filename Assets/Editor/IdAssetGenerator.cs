using UnityEngine;
using UnityEditor;
using System.IO;
using System.Collections.Generic;
using System.Reflection;
using IdleDysonSwarm.Data;
using GameData;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Editor tool to generate strongly-typed ID assets from existing string constants.
    /// Reads from SkillIdMap, ResearchIdMap, and existing facility definitions.
    /// </summary>
    public static class IdAssetGenerator
    {
        private const string ID_ASSETS_ROOT = "Assets/Data/IDs";
        private const string FACILITY_IDS_PATH = ID_ASSETS_ROOT + "/Facilities";
        private const string SKILL_IDS_PATH = ID_ASSETS_ROOT + "/Skills";
        private const string RESEARCH_IDS_PATH = ID_ASSETS_ROOT + "/Research";

        [MenuItem("Tools/Idle Dyson Swarm/Generate All ID Assets", priority = 1)]
        public static void GenerateAllIdAssets()
        {
            Debug.Log("[IdAssetGenerator] Starting ID asset generation...");

            int facilityCount = GenerateFacilityIds();
            int skillCount = GenerateSkillIds();
            int researchCount = GenerateResearchIds();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[IdAssetGenerator] Generation complete! " +
                     $"Created {facilityCount} facility IDs, " +
                     $"{skillCount} skill IDs, " +
                     $"{researchCount} research IDs");

            EditorUtility.DisplayDialog(
                "ID Asset Generation Complete",
                $"Successfully generated:\n" +
                $"• {facilityCount} Facility IDs\n" +
                $"• {skillCount} Skill IDs\n" +
                $"• {researchCount} Research IDs\n\n" +
                $"Assets saved to: {ID_ASSETS_ROOT}",
                "OK"
            );
        }

        [MenuItem("Tools/Idle Dyson Swarm/Generate Facility IDs", priority = 11)]
        public static int GenerateFacilityIds()
        {
            Debug.Log("[IdAssetGenerator] Generating Facility IDs...");

            // Facility IDs from existing facility definition assets
            string[] facilityIds = {
                "assembly_lines",
                "ai_managers",
                "servers",
                "data_centers",
                "planets"
            };

            EnsureDirectoryExists(FACILITY_IDS_PATH);

            int count = 0;
            foreach (string id in facilityIds)
            {
                if (CreateIdAsset<FacilityId>(id, FACILITY_IDS_PATH))
                {
                    count++;
                }
            }

            Debug.Log($"[IdAssetGenerator] Generated {count} Facility ID assets");
            return count;
        }

        [MenuItem("Tools/Idle Dyson Swarm/Generate Skill IDs", priority = 12)]
        public static int GenerateSkillIds()
        {
            Debug.Log("[IdAssetGenerator] Generating Skill IDs...");

            // Extract all skill IDs from SkillIdMap
            var skillIds = new List<string>();

            // Use reflection to get the LegacyKeyToId dictionary
            var skillIdMapType = typeof(SkillIdMap);
            var legacyKeyToIdField = skillIdMapType.GetField(
                "LegacyKeyToId",
                BindingFlags.NonPublic | BindingFlags.Static
            );

            if (legacyKeyToIdField != null)
            {
                var legacyKeyToId = legacyKeyToIdField.GetValue(null) as Dictionary<int, string>;
                if (legacyKeyToId != null)
                {
                    skillIds.AddRange(legacyKeyToId.Values);
                }
            }

            if (skillIds.Count == 0)
            {
                Debug.LogWarning("[IdAssetGenerator] No skill IDs found in SkillIdMap. Using reflection fallback.");

                // Fallback: try to find all skill IDs through TryGetId
                for (int i = 1; i <= 110; i++)
                {
                    if (SkillIdMap.TryGetId(i, out string id))
                    {
                        if (!skillIds.Contains(id))
                        {
                            skillIds.Add(id);
                        }
                    }
                }
            }

            EnsureDirectoryExists(SKILL_IDS_PATH);

            int count = 0;
            foreach (string id in skillIds)
            {
                if (!string.IsNullOrEmpty(id) && CreateIdAsset<SkillId>(id, SKILL_IDS_PATH))
                {
                    count++;
                }
            }

            Debug.Log($"[IdAssetGenerator] Generated {count} Skill ID assets");
            return count;
        }

        [MenuItem("Tools/Idle Dyson Swarm/Generate Research IDs", priority = 13)]
        public static int GenerateResearchIds()
        {
            Debug.Log("[IdAssetGenerator] Generating Research IDs...");

            // Use the public Ids property from ResearchIdMap
            var researchIds = ResearchIdMap.Ids;

            EnsureDirectoryExists(RESEARCH_IDS_PATH);

            int count = 0;
            foreach (string id in researchIds)
            {
                if (!string.IsNullOrEmpty(id) && CreateIdAsset<ResearchId>(id, RESEARCH_IDS_PATH))
                {
                    count++;
                }
            }

            Debug.Log($"[IdAssetGenerator] Generated {count} Research ID assets");
            return count;
        }

        /// <summary>
        /// Creates a single ID asset of the specified type.
        /// </summary>
        /// <typeparam name="T">Type of GameId (FacilityId, SkillId, ResearchId)</typeparam>
        /// <param name="id">The string ID value</param>
        /// <param name="directory">Directory to save the asset</param>
        /// <returns>True if created successfully or already exists</returns>
        private static bool CreateIdAsset<T>(string id, string directory) where T : GameId
        {
            // Construct the asset path
            string fileName = $"{id}.asset";
            string assetPath = Path.Combine(directory, fileName).Replace("\\", "/");

            // Check if asset already exists
            var existingAsset = AssetDatabase.LoadAssetAtPath<T>(assetPath);
            if (existingAsset != null)
            {
                // Verify the ID value matches
                if (existingAsset.Value == id)
                {
                    Debug.Log($"[IdAssetGenerator] Asset already exists and is valid: {assetPath}");
                    return true;
                }
                else
                {
                    Debug.LogWarning(
                        $"[IdAssetGenerator] Asset exists but ID mismatch. " +
                        $"Expected '{id}', found '{existingAsset.Value}'. " +
                        $"Asset: {assetPath}"
                    );
                    return false;
                }
            }

            // Create new ID asset
            var asset = ScriptableObject.CreateInstance<T>();

            // Use reflection to set the private _id field
            var idField = typeof(GameId).GetField("_id", BindingFlags.NonPublic | BindingFlags.Instance);
            if (idField == null)
            {
                Debug.LogError("[IdAssetGenerator] Failed to find _id field via reflection!");
                return false;
            }

            idField.SetValue(asset, id);

            // Set asset name to match ID (for consistency)
            asset.name = id;

            // Create the asset
            AssetDatabase.CreateAsset(asset, assetPath);

            Debug.Log($"[IdAssetGenerator] Created ID asset: {assetPath}");
            return true;
        }

        /// <summary>
        /// Ensures a directory exists, creating it if necessary.
        /// </summary>
        private static void EnsureDirectoryExists(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                // Split path and create folders incrementally
                string[] folders = path.Split('/');
                string currentPath = folders[0];

                for (int i = 1; i < folders.Length; i++)
                {
                    string nextPath = currentPath + "/" + folders[i];
                    if (!AssetDatabase.IsValidFolder(nextPath))
                    {
                        AssetDatabase.CreateFolder(currentPath, folders[i]);
                        Debug.Log($"[IdAssetGenerator] Created folder: {nextPath}");
                    }
                    currentPath = nextPath;
                }
            }
        }

        /// <summary>
        /// Validates all ID assets in a directory.
        /// </summary>
        [MenuItem("Tools/Idle Dyson Swarm/Validate All ID Assets", priority = 21)]
        public static void ValidateAllIdAssets()
        {
            Debug.Log("[IdAssetGenerator] Validating ID assets...");

            int facilityCount = ValidateIdAssets<FacilityId>(FACILITY_IDS_PATH);
            int skillCount = ValidateIdAssets<SkillId>(SKILL_IDS_PATH);
            int researchCount = ValidateIdAssets<ResearchId>(RESEARCH_IDS_PATH);

            string message = $"Validation Results:\n\n" +
                           $"Facility IDs: {facilityCount} valid\n" +
                           $"Skill IDs: {skillCount} valid\n" +
                           $"Research IDs: {researchCount} valid\n\n" +
                           $"Check console for warnings.";

            EditorUtility.DisplayDialog("ID Asset Validation", message, "OK");
        }

        private static int ValidateIdAssets<T>(string directory) where T : GameId
        {
            if (!AssetDatabase.IsValidFolder(directory))
            {
                Debug.LogWarning($"[IdAssetGenerator] Directory does not exist: {directory}");
                return 0;
            }

            string[] guids = AssetDatabase.FindAssets($"t:{typeof(T).Name}", new[] { directory });
            int validCount = 0;

            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var asset = AssetDatabase.LoadAssetAtPath<T>(assetPath);

                if (asset == null)
                {
                    Debug.LogError($"[IdAssetGenerator] Failed to load asset: {assetPath}");
                    continue;
                }

                // Check ID is not empty
                if (string.IsNullOrEmpty(asset.Value))
                {
                    Debug.LogError($"[IdAssetGenerator] Asset has empty ID: {assetPath}", asset);
                    continue;
                }

                // Check asset name matches ID
                if (asset.name != asset.Value)
                {
                    Debug.LogWarning(
                        $"[IdAssetGenerator] Asset name '{asset.name}' doesn't match ID '{asset.Value}'. " +
                        $"Consider renaming asset for consistency. Path: {assetPath}",
                        asset
                    );
                }

                validCount++;
            }

            Debug.Log($"[IdAssetGenerator] {typeof(T).Name}: {validCount}/{guids.Length} assets valid");
            return validCount;
        }
    }
}
