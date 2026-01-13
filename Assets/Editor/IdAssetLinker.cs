using UnityEngine;
using UnityEditor;
using System.IO;
using System.Reflection;
using IdleDysonSwarm.Data;
using GameData;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Editor tool to automatically link ID assets to definition assets.
    /// Finds FacilityDefinition, SkillDefinition, and ResearchDefinition assets
    /// and assigns the corresponding FacilityId, SkillId, or ResearchId assets.
    /// </summary>
    public static class IdAssetLinker
    {
        private const string FACILITY_DEFINITIONS_PATH = "Assets/Data/Facilities";
        private const string SKILL_DEFINITIONS_PATH = "Assets/Data/Skills";
        private const string RESEARCH_DEFINITIONS_PATH = "Assets/Data/Research";

        private const string FACILITY_IDS_PATH = "Assets/Data/IDs/Facilities";
        private const string SKILL_IDS_PATH = "Assets/Data/IDs/Skills";
        private const string RESEARCH_IDS_PATH = "Assets/Data/IDs/Research";

        [MenuItem("Tools/Idle Dyson Swarm/Link ID Assets to Definitions", priority = 30)]
        public static void LinkAllIdAssets()
        {
            Debug.Log("[IdAssetLinker] Starting ID asset linking...");

            int facilityCount = LinkFacilityIdAssets();
            int skillCount = LinkSkillIdAssets();
            int researchCount = LinkResearchIdAssets();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[IdAssetLinker] Linking complete! " +
                     $"Linked {facilityCount} facilities, " +
                     $"{skillCount} skills, " +
                     $"{researchCount} research");

            EditorUtility.DisplayDialog(
                "ID Asset Linking Complete",
                $"Successfully linked:\n" +
                $"• {facilityCount} Facility definitions\n" +
                $"• {skillCount} Skill definitions\n" +
                $"• {researchCount} Research definitions\n\n" +
                $"Check console for details.",
                "OK"
            );
        }

        [MenuItem("Tools/Idle Dyson Swarm/Link Facility IDs", priority = 31)]
        public static int LinkFacilityIdAssets()
        {
            Debug.Log("[IdAssetLinker] Linking Facility ID assets...");
            return LinkDefinitionAssets<FacilityDefinition, FacilityId>(
                FACILITY_DEFINITIONS_PATH,
                FACILITY_IDS_PATH
            );
        }

        [MenuItem("Tools/Idle Dyson Swarm/Link Skill IDs", priority = 32)]
        public static int LinkSkillIdAssets()
        {
            Debug.Log("[IdAssetLinker] Linking Skill ID assets...");
            return LinkDefinitionAssets<SkillDefinition, SkillId>(
                SKILL_DEFINITIONS_PATH,
                SKILL_IDS_PATH
            );
        }

        [MenuItem("Tools/Idle Dyson Swarm/Link Research IDs", priority = 33)]
        public static int LinkResearchIdAssets()
        {
            Debug.Log("[IdAssetLinker] Linking Research ID assets...");
            return LinkDefinitionAssets<ResearchDefinition, ResearchId>(
                RESEARCH_DEFINITIONS_PATH,
                RESEARCH_IDS_PATH
            );
        }

        private static int LinkDefinitionAssets<TDefinition, TId>(string definitionPath, string idPath)
            where TDefinition : ScriptableObject
            where TId : GameId
        {
            if (!AssetDatabase.IsValidFolder(definitionPath))
            {
                Debug.LogWarning($"[IdAssetLinker] Definition path does not exist: {definitionPath}");
                return 0;
            }

            if (!AssetDatabase.IsValidFolder(idPath))
            {
                Debug.LogWarning($"[IdAssetLinker] ID asset path does not exist: {idPath}");
                return 0;
            }

            string[] guids = AssetDatabase.FindAssets($"t:{typeof(TDefinition).Name}", new[] { definitionPath });
            int linkedCount = 0;

            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var definition = AssetDatabase.LoadAssetAtPath<TDefinition>(assetPath);

                if (definition == null)
                {
                    Debug.LogError($"[IdAssetLinker] Failed to load definition: {assetPath}");
                    continue;
                }

                // Get the current string ID value using reflection
                PropertyInfo idProperty = typeof(TDefinition).GetProperty("id", BindingFlags.Public | BindingFlags.Instance);
                if (idProperty == null)
                {
                    Debug.LogError($"[IdAssetLinker] Definition type {typeof(TDefinition).Name} has no 'id' property!");
                    continue;
                }

                string stringId = idProperty.GetValue(definition) as string;
                if (string.IsNullOrEmpty(stringId))
                {
                    Debug.LogWarning($"[IdAssetLinker] Definition has empty ID: {assetPath}");
                    continue;
                }

                // Find the corresponding ID asset
                string idAssetName = $"{stringId}.asset";
                string idAssetPath = Path.Combine(idPath, idAssetName).Replace("\\", "/");
                var idAsset = AssetDatabase.LoadAssetAtPath<TId>(idAssetPath);

                if (idAsset == null)
                {
                    Debug.LogWarning($"[IdAssetLinker] ID asset not found: {idAssetPath} (for {assetPath})");
                    continue;
                }

                // Set the _id field using reflection
                FieldInfo idField = typeof(TDefinition).GetField("_id", BindingFlags.NonPublic | BindingFlags.Instance);
                if (idField == null)
                {
                    Debug.LogError($"[IdAssetLinker] Failed to find _id field on {typeof(TDefinition).Name}!");
                    continue;
                }

                // Check if already linked correctly
                var currentIdAsset = idField.GetValue(definition) as TId;
                if (currentIdAsset == idAsset)
                {
                    Debug.Log($"[IdAssetLinker] Already linked: {assetPath} -> {idAssetPath}");
                    linkedCount++;
                    continue;
                }

                // Link the ID asset
                idField.SetValue(definition, idAsset);
                EditorUtility.SetDirty(definition);

                Debug.Log($"[IdAssetLinker] Linked: {assetPath} -> {idAssetPath}");
                linkedCount++;
            }

            Debug.Log($"[IdAssetLinker] {typeof(TDefinition).Name}: Linked {linkedCount}/{guids.Length} definitions");
            return linkedCount;
        }
    }
}
