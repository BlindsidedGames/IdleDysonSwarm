using System.Collections.Generic;
using GameData;
using IdleDysonSwarm.Data.Conditions;
using UnityEditor;
using UnityEngine;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Tool to automatically assign generated condition assets to EffectDefinitions
    /// that currently use matching string conditionIds.
    /// </summary>
    public static class ConditionAssignmentTool
    {
        private const string CONDITIONS_PATH = "Assets/Data/Conditions";

        [MenuItem("Tools/Idle Dyson Swarm/Migrate Conditions/Assign Conditions to Effects", priority = 52)]
        public static void AssignConditionsToEffects()
        {
            Debug.Log("[ConditionAssignmentTool] Starting automatic condition assignment...");

            // Load all condition assets
            var conditionsByName = LoadAllConditions();
            Debug.Log($"[ConditionAssignmentTool] Loaded {conditionsByName.Count} condition assets");

            // Find all EffectDefinition assets
            string[] effectGuids = AssetDatabase.FindAssets("t:EffectDefinition");
            int assigned = 0;
            int skipped = 0;
            int noMatch = 0;

            foreach (string guid in effectGuids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var effect = AssetDatabase.LoadAssetAtPath<EffectDefinition>(assetPath);

                if (effect == null)
                {
                    Debug.LogWarning($"[ConditionAssignmentTool] Failed to load effect: {assetPath}");
                    continue;
                }

                // Skip if already has a scriptable condition assigned
                if (effect.UsesScriptableCondition)
                {
                    Debug.Log($"[ConditionAssignmentTool] Skipping '{effect.name}' - already has scriptable condition");
                    skipped++;
                    continue;
                }

                // Skip if no legacy conditionId
                if (string.IsNullOrEmpty(effect.conditionId))
                {
                    noMatch++;
                    continue;
                }

                // Try to find matching condition asset
                string conditionAssetName = $"condition.{effect.conditionId}";
                if (conditionsByName.TryGetValue(conditionAssetName, out EffectCondition condition))
                {
                    // Assign the condition using reflection (since _condition is private)
                    var field = typeof(EffectDefinition).GetField("_condition",
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

                    if (field != null)
                    {
                        field.SetValue(effect, condition);
                        EditorUtility.SetDirty(effect);
                        Debug.Log($"[ConditionAssignmentTool] Assigned '{conditionAssetName}' to effect '{effect.name}' (conditionId: '{effect.conditionId}')");
                        assigned++;
                    }
                    else
                    {
                        Debug.LogError($"[ConditionAssignmentTool] Failed to find _condition field on EffectDefinition");
                    }
                }
                else
                {
                    Debug.LogWarning($"[ConditionAssignmentTool] No matching condition asset for '{effect.name}' (conditionId: '{effect.conditionId}')");
                    noMatch++;
                }
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[ConditionAssignmentTool] ==========================================");
            Debug.Log($"[ConditionAssignmentTool] ASSIGNMENT COMPLETE!");
            Debug.Log($"[ConditionAssignmentTool] Assigned: {assigned}");
            Debug.Log($"[ConditionAssignmentTool] Skipped (already has condition): {skipped}");
            Debug.Log($"[ConditionAssignmentTool] No matching condition: {noMatch}");
            Debug.Log($"[ConditionAssignmentTool] Total effects processed: {effectGuids.Length}");
            Debug.Log($"[ConditionAssignmentTool] ==========================================");
        }

        private static Dictionary<string, EffectCondition> LoadAllConditions()
        {
            var result = new Dictionary<string, EffectCondition>();

            if (!AssetDatabase.IsValidFolder(CONDITIONS_PATH))
            {
                Debug.LogWarning($"[ConditionAssignmentTool] Conditions folder not found: {CONDITIONS_PATH}");
                return result;
            }

            string[] guids = AssetDatabase.FindAssets("t:EffectCondition", new[] { CONDITIONS_PATH });

            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var condition = AssetDatabase.LoadAssetAtPath<EffectCondition>(assetPath);

                if (condition != null)
                {
                    result[condition.name] = condition;
                }
            }

            return result;
        }

        [MenuItem("Tools/Idle Dyson Swarm/Migrate Conditions/Report Effect Conditions", priority = 53)]
        public static void ReportEffectConditions()
        {
            Debug.Log("[ConditionAssignmentTool] Generating condition usage report...");

            string[] effectGuids = AssetDatabase.FindAssets("t:EffectDefinition");
            int withScriptable = 0;
            int withLegacyOnly = 0;
            int withBoth = 0;
            int withNone = 0;

            foreach (string guid in effectGuids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                var effect = AssetDatabase.LoadAssetAtPath<EffectDefinition>(assetPath);

                if (effect == null) continue;

                bool hasScriptable = effect.UsesScriptableCondition;
                bool hasLegacy = !string.IsNullOrEmpty(effect.conditionId);

                if (hasScriptable && hasLegacy)
                {
                    withBoth++;
                }
                else if (hasScriptable)
                {
                    withScriptable++;
                }
                else if (hasLegacy)
                {
                    withLegacyOnly++;
                }
                else
                {
                    withNone++;
                }
            }

            Debug.Log($"[ConditionAssignmentTool] ==========================================");
            Debug.Log($"[ConditionAssignmentTool] CONDITION USAGE REPORT");
            Debug.Log($"[ConditionAssignmentTool] Total effects: {effectGuids.Length}");
            Debug.Log($"[ConditionAssignmentTool] With scriptable condition only: {withScriptable}");
            Debug.Log($"[ConditionAssignmentTool] With legacy conditionId only: {withLegacyOnly}");
            Debug.Log($"[ConditionAssignmentTool] With both (scriptable takes precedence): {withBoth}");
            Debug.Log($"[ConditionAssignmentTool] With no condition: {withNone}");
            Debug.Log($"[ConditionAssignmentTool] ==========================================");
            Debug.Log($"[ConditionAssignmentTool] Migration progress: {withScriptable + withBoth}/{withScriptable + withBoth + withLegacyOnly} effects using scriptable conditions");
        }
    }
}
