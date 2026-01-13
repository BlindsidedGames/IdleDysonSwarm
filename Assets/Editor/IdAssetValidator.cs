using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System.Linq;
using IdleDysonSwarm.Data;
using GameData;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Validation tool to ensure ID assets and definitions are properly configured.
    /// </summary>
    public static class IdAssetValidator
    {
        [MenuItem("Tools/Idle Dyson Swarm/Validate ID System", priority = 40)]
        public static void ValidateIdSystem()
        {
            Debug.Log("[IdAssetValidator] Starting comprehensive ID system validation...");

            var results = new ValidationResults();

            ValidateFacilityIds(results);
            ValidateSkillIds(results);
            ValidateResearchIds(results);

            DisplayResults(results);
        }

        private static void ValidateFacilityIds(ValidationResults results)
        {
            Debug.Log("[IdAssetValidator] Validating Facility IDs...");

            var idAssets = LoadAllAssets<FacilityId>("Assets/Data/IDs/Facilities");
            var definitions = LoadAllAssets<FacilityDefinition>("Assets/Data/Facilities");

            ValidateIdAssets(idAssets, "FacilityId", results);
            ValidateDefinitions(definitions, idAssets, "FacilityDefinition", results);
        }

        private static void ValidateSkillIds(ValidationResults results)
        {
            Debug.Log("[IdAssetValidator] Validating Skill IDs...");

            var idAssets = LoadAllAssets<SkillId>("Assets/Data/IDs/Skills");
            var definitions = LoadAllAssets<SkillDefinition>("Assets/Data/Skills");

            ValidateIdAssets(idAssets, "SkillId", results);
            ValidateDefinitions(definitions, idAssets, "SkillDefinition", results);
        }

        private static void ValidateResearchIds(ValidationResults results)
        {
            Debug.Log("[IdAssetValidator] Validating Research IDs...");

            var idAssets = LoadAllAssets<ResearchId>("Assets/Data/IDs/Research");
            var definitions = LoadAllAssets<ResearchDefinition>("Assets/Data/Research");

            ValidateIdAssets(idAssets, "ResearchId", results);
            ValidateDefinitions(definitions, idAssets, "ResearchDefinition", results);
        }

        private static List<T> LoadAllAssets<T>(string path) where T : Object
        {
            var assets = new List<T>();

            if (!AssetDatabase.IsValidFolder(path))
            {
                Debug.LogWarning($"[IdAssetValidator] Folder does not exist: {path}");
                return assets;
            }

            string[] guids = AssetDatabase.FindAssets($"t:{typeof(T).Name}", new[] { path });
            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var asset = AssetDatabase.LoadAssetAtPath<T>(assetPath);
                if (asset != null)
                {
                    assets.Add(asset);
                }
            }

            return assets;
        }

        private static void ValidateIdAssets<T>(List<T> idAssets, string typeName, ValidationResults results)
            where T : GameId
        {
            var seenIds = new HashSet<string>();
            var seenNames = new HashSet<string>();

            foreach (var idAsset in idAssets)
            {
                if (idAsset == null) continue;

                // Check for null or empty ID value
                if (string.IsNullOrEmpty(idAsset.Value))
                {
                    results.AddError($"{typeName} asset '{idAsset.name}' has null or empty Value");
                    continue;
                }

                // Check for duplicate ID values
                if (seenIds.Contains(idAsset.Value))
                {
                    results.AddError($"{typeName} duplicate ID value: '{idAsset.Value}'");
                }
                else
                {
                    seenIds.Add(idAsset.Value);
                }

                // Check for duplicate asset names
                if (seenNames.Contains(idAsset.name))
                {
                    results.AddError($"{typeName} duplicate asset name: '{idAsset.name}'");
                }
                else
                {
                    seenNames.Add(idAsset.name);
                }

                // Check that asset name matches ID value
                if (idAsset.name != idAsset.Value)
                {
                    results.AddWarning($"{typeName} asset name '{idAsset.name}' doesn't match Value '{idAsset.Value}'");
                }

                results.IncrementIdAssetCount(typeName);
            }
        }

        private static void ValidateDefinitions<TDefinition, TId>(
            List<TDefinition> definitions,
            List<TId> idAssets,
            string typeName,
            ValidationResults results)
            where TDefinition : ScriptableObject
            where TId : GameId
        {
            var idAssetsByValue = idAssets
                .Where(id => id != null && !string.IsNullOrEmpty(id.Value))
                .ToDictionary(id => id.Value, id => id);

            foreach (var definition in definitions)
            {
                if (definition == null) continue;

                // Get the _id field via reflection
                var idField = typeof(TDefinition).GetField("_id",
                    System.Reflection.BindingFlags.NonPublic |
                    System.Reflection.BindingFlags.Instance);

                if (idField == null)
                {
                    results.AddError($"{typeName} missing _id field (code structure issue)");
                    continue;
                }

                var linkedId = idField.GetValue(definition) as TId;

                // Check if ID is linked
                if (linkedId == null)
                {
                    results.AddError($"{typeName} '{definition.name}' has no ID asset linked");
                    continue;
                }

                // Check if linked ID is valid
                if (string.IsNullOrEmpty(linkedId.Value))
                {
                    results.AddError($"{typeName} '{definition.name}' linked to ID with empty Value");
                    continue;
                }

                // Check if the linked ID matches the definition name
                if (linkedId.Value != definition.name)
                {
                    results.AddWarning($"{typeName} '{definition.name}' linked to ID '{linkedId.Value}' (name mismatch)");
                }

                // Check if the linked ID exists in our ID assets
                if (!idAssetsByValue.ContainsKey(linkedId.Value))
                {
                    results.AddError($"{typeName} '{definition.name}' linked to unknown ID '{linkedId.Value}'");
                }

                results.IncrementDefinitionCount(typeName);
            }
        }

        private static void DisplayResults(ValidationResults results)
        {
            Debug.Log($"[IdAssetValidator] Validation complete!");
            Debug.Log($"[IdAssetValidator] ID Assets: " +
                     $"Facilities={results.FacilityIdCount}, " +
                     $"Skills={results.SkillIdCount}, " +
                     $"Research={results.ResearchIdCount}");
            Debug.Log($"[IdAssetValidator] Definitions: " +
                     $"Facilities={results.FacilityDefCount}, " +
                     $"Skills={results.SkillDefCount}, " +
                     $"Research={results.ResearchDefCount}");
            Debug.Log($"[IdAssetValidator] Errors: {results.Errors.Count}, Warnings: {results.Warnings.Count}");

            if (results.Errors.Count > 0)
            {
                Debug.LogError("[IdAssetValidator] ERRORS FOUND:");
                foreach (string error in results.Errors)
                {
                    Debug.LogError($"  • {error}");
                }
            }

            if (results.Warnings.Count > 0)
            {
                Debug.LogWarning("[IdAssetValidator] WARNINGS:");
                foreach (string warning in results.Warnings)
                {
                    Debug.LogWarning($"  • {warning}");
                }
            }

            string statusIcon = results.Errors.Count == 0 ? "✓" : "✗";
            string statusText = results.Errors.Count == 0 ? "PASSED" : "FAILED";

            Debug.Log($"[IdAssetValidator] ==========================================");
            Debug.Log($"[IdAssetValidator] VALIDATION {statusText} {statusIcon}");
            Debug.Log($"[IdAssetValidator] ==========================================");
        }

        private class ValidationResults
        {
            public List<string> Errors { get; } = new List<string>();
            public List<string> Warnings { get; } = new List<string>();

            public int FacilityIdCount { get; private set; }
            public int SkillIdCount { get; private set; }
            public int ResearchIdCount { get; private set; }

            public int FacilityDefCount { get; private set; }
            public int SkillDefCount { get; private set; }
            public int ResearchDefCount { get; private set; }

            public void AddError(string message)
            {
                Errors.Add(message);
            }

            public void AddWarning(string message)
            {
                Warnings.Add(message);
            }

            public void IncrementIdAssetCount(string typeName)
            {
                if (typeName.Contains("Facility")) FacilityIdCount++;
                else if (typeName.Contains("Skill")) SkillIdCount++;
                else if (typeName.Contains("Research")) ResearchIdCount++;
            }

            public void IncrementDefinitionCount(string typeName)
            {
                if (typeName.Contains("Facility")) FacilityDefCount++;
                else if (typeName.Contains("Skill")) SkillDefCount++;
                else if (typeName.Contains("Research")) ResearchDefCount++;
            }
        }
    }
}
