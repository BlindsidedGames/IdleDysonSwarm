using Buildings;
using GameData;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

public static class FacilityDefinitionSync
{
    private const string FacilityDatabasePath = "Assets/Data/Databases/FacilityDatabase.asset";

    [MenuItem("Tools/Idle Dyson/Sync Facility Definitions From Scene")]
    public static void SyncFacilityDefinitionsFromScene()
    {
        FacilityDatabase database = AssetDatabase.LoadAssetAtPath<FacilityDatabase>(FacilityDatabasePath);
        if (database == null)
        {
            Debug.LogWarning("FacilityDatabase not found. Run Create Game Data Assets first.");
            return;
        }

        FacilityBuildingPresenter[] presenters =
            Object.FindObjectsByType<FacilityBuildingPresenter>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        int updated = 0;

        foreach (FacilityBuildingPresenter presenter in presenters)
        {
            if (presenter == null) continue;
            string id = presenter.FacilityId;
            if (string.IsNullOrEmpty(id)) continue;

            FacilityDefinition definition = FindFacility(database, id);
            if (definition == null) continue;

            SerializedObject serializedPresenter = new SerializedObject(presenter);
            SerializedProperty baseCostProp = serializedPresenter.FindProperty("baseCost");
            SerializedProperty exponentProp = serializedPresenter.FindProperty("exponent");
            SerializedProperty wordUsedProp = serializedPresenter.FindProperty("wordUsed");
            SerializedProperty productionWordUsedProp = serializedPresenter.FindProperty("productionWordUsed");

            if (baseCostProp != null) definition.baseCost = baseCostProp.doubleValue;
            if (exponentProp != null) definition.costExponent = exponentProp.doubleValue;
            if (wordUsedProp != null) definition.wordUsed = wordUsedProp.stringValue;
            if (productionWordUsedProp != null) definition.productionWordUsed = productionWordUsedProp.stringValue;
            definition.purchasePrompt = GetDefaultPurchasePrompt(id);

            EditorUtility.SetDirty(definition);
            updated++;
        }

        if (updated > 0)
        {
            AssetDatabase.SaveAssets();
        }

        Debug.Log($"Synced {updated} facility definitions from scene.");
    }

    [MenuItem("Tools/Idle Dyson/Migrate Building UI References")]
    public static void MigrateBuildingUiReferences()
    {
        Building[] buildings = Object.FindObjectsByType<Building>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        int migrated = 0;
        int removed = 0;

        foreach (Building building in buildings)
        {
            if (building == null) continue;
            BuildingReferences references = building.GetComponent<BuildingReferences>();
            if (references == null) continue;

            building.ApplyBuildingReferences(references);
            EditorUtility.SetDirty(building);
            Object.DestroyImmediate(references, true);
            migrated++;
            removed++;
        }

        if (migrated > 0)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (scene.IsValid())
            {
                EditorSceneManager.MarkSceneDirty(scene);
            }
        }

        Debug.Log($"Migrated {migrated} BuildingReferences components, removed {removed}.");
    }

    private static FacilityDefinition FindFacility(FacilityDatabase database, string id)
    {
        if (database == null || database.facilities == null) return null;
        foreach (FacilityDefinition definition in database.facilities)
        {
            if (definition != null && definition.id == id) return definition;
        }

        return null;
    }

    private static string GetDefaultPurchasePrompt(string facilityId)
    {
        return facilityId switch
        {
            "assembly_lines" => "Purchase an Assembly Line",
            "ai_managers" => "Purchase an AI Manager",
            "servers" => "Purchase a Server",
            "data_centers" => "Purchase a Data Center",
            "planets" => "Purchase a Planet",
            _ => "Purchase"
        };
    }
}
