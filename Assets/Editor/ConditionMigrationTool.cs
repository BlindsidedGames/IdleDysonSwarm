using System.Collections.Generic;
using System.IO;
using GameData;
using IdleDysonSwarm.Data;
using IdleDysonSwarm.Data.Conditions;
using UnityEditor;
using UnityEngine;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Editor tool to migrate string-based conditionIds to scriptable condition assets.
    /// Scans all EffectDefinition assets and generates corresponding condition assets.
    /// </summary>
    public static class ConditionMigrationTool
    {
        private const string CONDITIONS_OUTPUT_PATH = "Assets/Data/Conditions";
        private const string FACILITY_IDS_PATH = "Assets/Data/IDs/Facilities";

        [MenuItem("Tools/Idle Dyson Swarm/Migrate Conditions/Scan ConditionIds", priority = 50)]
        public static void ScanConditionIds()
        {
            Debug.Log("[ConditionMigrationTool] Scanning for conditionIds in EffectDefinitions...");

            var conditionIds = new HashSet<string>();
            string[] guids = AssetDatabase.FindAssets("t:EffectDefinition");

            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var effect = AssetDatabase.LoadAssetAtPath<EffectDefinition>(path);

                if (effect != null && !string.IsNullOrEmpty(effect.conditionId))
                {
                    conditionIds.Add(effect.conditionId);
                }
            }

            Debug.Log($"[ConditionMigrationTool] Found {conditionIds.Count} unique conditionIds:");
            foreach (string conditionId in conditionIds)
            {
                Debug.Log($"  - {conditionId}");
            }
        }

        [MenuItem("Tools/Idle Dyson Swarm/Migrate Conditions/Generate Condition Assets", priority = 51)]
        public static void GenerateConditionAssets()
        {
            Debug.Log("[ConditionMigrationTool] Generating condition assets...");

            EnsureOutputFolderExists();

            int created = 0;
            int skipped = 0;

            // Define all known conditions and their configurations
            var conditionConfigs = new List<ConditionConfig>
            {
                // Facility count conditions (manual >= 69)
                new FacilityCountConfig("assembly_lines_69", "assembly_lines", FacilityCountType.ManualOnly, ComparisonOperator.GreaterOrEqual, 69),
                new FacilityCountConfig("ai_managers_69", "ai_managers", FacilityCountType.ManualOnly, ComparisonOperator.GreaterOrEqual, 69),
                new FacilityCountConfig("servers_69", "servers", FacilityCountType.ManualOnly, ComparisonOperator.GreaterOrEqual, 69),
                new FacilityCountConfig("data_centers_69", "data_centers", FacilityCountType.ManualOnly, ComparisonOperator.GreaterOrEqual, 69),
                new FacilityCountConfig("planets_69", "planets", FacilityCountType.ManualOnly, ComparisonOperator.GreaterOrEqual, 69),

                // Facility count conditions (total thresholds)
                new FacilityCountConfig("servers_total_gt_1", "servers", FacilityCountType.Total, ComparisonOperator.GreaterThan, 1),
                new FacilityCountConfig("assembly_lines_total_gte_10", "assembly_lines", FacilityCountType.Total, ComparisonOperator.GreaterOrEqual, 10),
                new FacilityCountConfig("planets_total_gte_2", "planets", FacilityCountType.Total, ComparisonOperator.GreaterOrEqual, 2),

                // Worker conditions
                new WorkerCountConfig("workers_gt_1", WorkerType.Workers, ComparisonOperator.GreaterThan, 1),
                new WorkerCountConfig("researchers_gt_1", WorkerType.Researchers, ComparisonOperator.GreaterThan, 1),

                // Panel lifetime condition
                new PanelLifetimeConfig("panel_lifetime", ComparisonOperator.GreaterThan, 0),

                // Facility state conditions (context-dependent)
                new FacilityStateConfig("manual_owned_gte_69", FacilityStateProperty.ManualOwned, ComparisonOperator.GreaterOrEqual, 69),
                new FacilityStateConfig("effective_owned_gte_69", FacilityStateProperty.EffectiveCount, ComparisonOperator.GreaterOrEqual, 69),
            };

            foreach (var config in conditionConfigs)
            {
                if (config.CreateAsset(CONDITIONS_OUTPUT_PATH))
                    created++;
                else
                    skipped++;
            }

            // Note: bots_required_met is complex and requires a custom condition class

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[ConditionMigrationTool] ==========================================");
            Debug.Log($"[ConditionMigrationTool] GENERATION COMPLETE!");
            Debug.Log($"[ConditionMigrationTool] Created: {created}, Skipped: {skipped}");
            Debug.Log($"[ConditionMigrationTool] ==========================================");
            Debug.Log($"[ConditionMigrationTool] Note: 'bots_required_met' requires a custom condition class.");
        }

        private static void EnsureOutputFolderExists()
        {
            if (!AssetDatabase.IsValidFolder(CONDITIONS_OUTPUT_PATH))
            {
                string parent = Path.GetDirectoryName(CONDITIONS_OUTPUT_PATH).Replace("\\", "/");
                string folderName = Path.GetFileName(CONDITIONS_OUTPUT_PATH);

                if (!AssetDatabase.IsValidFolder(parent))
                {
                    AssetDatabase.CreateFolder("Assets/Data", "Conditions");
                }
                else
                {
                    AssetDatabase.CreateFolder(parent, folderName);
                }
            }
        }

        #region Condition Configuration Classes

        private abstract class ConditionConfig
        {
            public string ConditionId { get; }

            protected ConditionConfig(string conditionId)
            {
                ConditionId = conditionId;
            }

            public abstract bool CreateAsset(string outputPath);

            protected bool AssetExists(string path)
            {
                return AssetDatabase.LoadAssetAtPath<ScriptableObject>(path) != null;
            }
        }

        private class FacilityCountConfig : ConditionConfig
        {
            private readonly string _facilityId;
            private readonly FacilityCountType _countType;
            private readonly ComparisonOperator _operator;
            private readonly int _threshold;

            public FacilityCountConfig(string conditionId, string facilityId, FacilityCountType countType,
                ComparisonOperator op, int threshold) : base(conditionId)
            {
                _facilityId = facilityId;
                _countType = countType;
                _operator = op;
                _threshold = threshold;
            }

            public override bool CreateAsset(string outputPath)
            {
                string assetPath = $"{outputPath}/condition.{ConditionId}.asset";

                if (AssetExists(assetPath))
                {
                    Debug.Log($"[ConditionMigrationTool] Skipping (exists): {assetPath}");
                    return false;
                }

                // Load the facility ID asset
                string facilityIdPath = $"{FACILITY_IDS_PATH}/{_facilityId}.asset";
                var facilityId = AssetDatabase.LoadAssetAtPath<FacilityId>(facilityIdPath);

                if (facilityId == null)
                {
                    Debug.LogWarning($"[ConditionMigrationTool] FacilityId not found: {facilityIdPath}");
                    return false;
                }

                var condition = ScriptableObject.CreateInstance<FacilityCountCondition>();
                SetFieldValue(condition, "_facilityId", facilityId);
                SetFieldValue(condition, "_countType", _countType);
                SetFieldValue(condition, "_operator", _operator);
                SetFieldValue(condition, "_threshold", _threshold);

                AssetDatabase.CreateAsset(condition, assetPath);
                Debug.Log($"[ConditionMigrationTool] Created: {assetPath}");
                return true;
            }
        }

        private class WorkerCountConfig : ConditionConfig
        {
            private readonly WorkerType _workerType;
            private readonly ComparisonOperator _operator;
            private readonly double _threshold;

            public WorkerCountConfig(string conditionId, WorkerType workerType, ComparisonOperator op, double threshold)
                : base(conditionId)
            {
                _workerType = workerType;
                _operator = op;
                _threshold = threshold;
            }

            public override bool CreateAsset(string outputPath)
            {
                string assetPath = $"{outputPath}/condition.{ConditionId}.asset";

                if (AssetExists(assetPath))
                {
                    Debug.Log($"[ConditionMigrationTool] Skipping (exists): {assetPath}");
                    return false;
                }

                var condition = ScriptableObject.CreateInstance<WorkerCountCondition>();
                SetFieldValue(condition, "_workerType", _workerType);
                SetFieldValue(condition, "_operator", _operator);
                SetFieldValue(condition, "_threshold", _threshold);

                AssetDatabase.CreateAsset(condition, assetPath);
                Debug.Log($"[ConditionMigrationTool] Created: {assetPath}");
                return true;
            }
        }

        private class PanelLifetimeConfig : ConditionConfig
        {
            private readonly ComparisonOperator _operator;
            private readonly double _threshold;

            public PanelLifetimeConfig(string conditionId, ComparisonOperator op, double threshold)
                : base(conditionId)
            {
                _operator = op;
                _threshold = threshold;
            }

            public override bool CreateAsset(string outputPath)
            {
                string assetPath = $"{outputPath}/condition.{ConditionId}.asset";

                if (AssetExists(assetPath))
                {
                    Debug.Log($"[ConditionMigrationTool] Skipping (exists): {assetPath}");
                    return false;
                }

                var condition = ScriptableObject.CreateInstance<PanelLifetimeCondition>();
                SetFieldValue(condition, "_operator", _operator);
                SetFieldValue(condition, "_threshold", _threshold);

                AssetDatabase.CreateAsset(condition, assetPath);
                Debug.Log($"[ConditionMigrationTool] Created: {assetPath}");
                return true;
            }
        }

        private class FacilityStateConfig : ConditionConfig
        {
            private readonly FacilityStateProperty _property;
            private readonly ComparisonOperator _operator;
            private readonly int _threshold;

            public FacilityStateConfig(string conditionId, FacilityStateProperty property,
                ComparisonOperator op, int threshold) : base(conditionId)
            {
                _property = property;
                _operator = op;
                _threshold = threshold;
            }

            public override bool CreateAsset(string outputPath)
            {
                string assetPath = $"{outputPath}/condition.{ConditionId}.asset";

                if (AssetExists(assetPath))
                {
                    Debug.Log($"[ConditionMigrationTool] Skipping (exists): {assetPath}");
                    return false;
                }

                var condition = ScriptableObject.CreateInstance<FacilityStateCondition>();
                SetFieldValue(condition, "_property", _property);
                SetFieldValue(condition, "_operator", _operator);
                SetFieldValue(condition, "_threshold", _threshold);

                AssetDatabase.CreateAsset(condition, assetPath);
                Debug.Log($"[ConditionMigrationTool] Created: {assetPath}");
                return true;
            }
        }

        #endregion

        private static void SetFieldValue<T>(T obj, string fieldName, object value)
        {
            var field = typeof(T).GetField(fieldName,
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance);

            if (field != null)
            {
                field.SetValue(obj, value);
            }
            else
            {
                Debug.LogWarning($"[ConditionMigrationTool] Field '{fieldName}' not found on {typeof(T).Name}");
            }
        }
    }
}
