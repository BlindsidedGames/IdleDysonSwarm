using GameData;
using IdleDysonSwarm.Data;
using UnityEditor;
using UnityEngine;

namespace Editor
{
    /// <summary>
    /// Editor utility to create mega-structure ScriptableObject assets.
    /// Run once via the menu to create all required assets.
    /// </summary>
    public static class CreateMegaStructureAssets
    {
        [MenuItem("Tools/Mega-Structures/Create All Assets")]
        public static void CreateAllAssets()
        {
            CreateFacilityIdAssets();
            CreateFacilityDefinitionAssets();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[CreateMegaStructureAssets] All mega-structure assets created successfully!");
        }

        [MenuItem("Tools/Mega-Structures/Create FacilityId Assets")]
        public static void CreateFacilityIdAssets()
        {
            const string basePath = "Assets/Data/IDs/Facilities/";

            // Ensure directory exists
            if (!AssetDatabase.IsValidFolder("Assets/Data/IDs/Facilities"))
            {
                if (!AssetDatabase.IsValidFolder("Assets/Data/IDs"))
                {
                    AssetDatabase.CreateFolder("Assets/Data", "IDs");
                }
                AssetDatabase.CreateFolder("Assets/Data/IDs", "Facilities");
            }

            CreateFacilityId(basePath, "matrioshka_brains");
            CreateFacilityId(basePath, "birch_planets");
            CreateFacilityId(basePath, "galactic_brains");

            AssetDatabase.SaveAssets();
            Debug.Log("[CreateMegaStructureAssets] FacilityId assets created.");
        }

        [MenuItem("Tools/Mega-Structures/Create FacilityDefinition Assets")]
        public static void CreateFacilityDefinitionAssets()
        {
            const string basePath = "Assets/Data/Facilities/";
            const string idPath = "Assets/Data/IDs/Facilities/";

            // Ensure directory exists
            if (!AssetDatabase.IsValidFolder("Assets/Data/Facilities"))
            {
                AssetDatabase.CreateFolder("Assets/Data", "Facilities");
            }

            // Load FacilityId references
            FacilityId planetsId = AssetDatabase.LoadAssetAtPath<FacilityId>(idPath + "planets.asset");
            FacilityId matrioshkaId = AssetDatabase.LoadAssetAtPath<FacilityId>(idPath + "matrioshka_brains.asset");
            FacilityId birchId = AssetDatabase.LoadAssetAtPath<FacilityId>(idPath + "birch_planets.asset");
            FacilityId galacticId = AssetDatabase.LoadAssetAtPath<FacilityId>(idPath + "galactic_brains.asset");

            if (matrioshkaId == null || birchId == null || galacticId == null)
            {
                Debug.LogError("[CreateMegaStructureAssets] FacilityId assets not found! Run 'Create FacilityId Assets' first.");
                return;
            }

            // Create Matrioshka Brains definition
            CreateFacilityDefinition(
                basePath + "matrioshka_brains.asset",
                matrioshkaId,
                "Matrioshka Brains",
                "Massive stellar computing structures that consume planets to produce more planets.",
                new[] { "facility", "mega-structure", "matrioshka" },
                baseProduction: 0.01, // 1 planet per 100 seconds
                productionStatId: "Facility.MatrioshkaBrain.Production",
                wordUsed: "Synthesizing",
                productionWordUsed: "Planet",
                purchasePrompt: "Construct a Matrioshka Brain",
                usesFacilityCost: true,
                costFacilityId: planetsId,
                baseFacilityCost: 100,
                facilityCostExponent: 1.5
            );

            // Create Birch Planets definition
            CreateFacilityDefinition(
                basePath + "birch_planets.asset",
                birchId,
                "Birch Planets",
                "Supermassive planetary shells that consume Matrioshka Brains to produce more Matrioshka Brains.",
                new[] { "facility", "mega-structure", "birch" },
                baseProduction: 0.001, // 1 Matrioshka Brain per 1000 seconds
                productionStatId: "Facility.BirchPlanet.Production",
                wordUsed: "Assembling",
                productionWordUsed: "Matrioshka Brain",
                purchasePrompt: "Construct a Birch Planet",
                usesFacilityCost: true,
                costFacilityId: matrioshkaId,
                baseFacilityCost: 1000,
                facilityCostExponent: 1.5
            );

            // Create Galactic Brains definition
            CreateFacilityDefinition(
                basePath + "galactic_brains.asset",
                galacticId,
                "Galactic Brains",
                "The ultimate mega-structure requiring both Matrioshka Brains and Birch Planets. Produces Birch Planets.",
                new[] { "facility", "mega-structure", "galactic" },
                baseProduction: 0.0001, // 1 Birch Planet per 10000 seconds
                productionStatId: "Facility.GalacticBrain.Production",
                wordUsed: "Manifesting",
                productionWordUsed: "Birch Planet",
                purchasePrompt: "Construct a Galactic Brain",
                usesFacilityCost: true,
                costFacilityId: matrioshkaId,
                baseFacilityCost: 10000,
                facilityCostExponent: 1.5,
                secondaryCostFacilityId: birchId,
                secondaryBaseCost: 100,
                secondaryCostExponent: 1.5
            );

            AssetDatabase.SaveAssets();
            Debug.Log("[CreateMegaStructureAssets] FacilityDefinition assets created.");
        }

        private static void CreateFacilityId(string basePath, string idValue)
        {
            string assetPath = basePath + idValue + ".asset";

            // Check if already exists
            if (AssetDatabase.LoadAssetAtPath<FacilityId>(assetPath) != null)
            {
                Debug.Log($"[CreateMegaStructureAssets] FacilityId '{idValue}' already exists, skipping.");
                return;
            }

            FacilityId facilityId = ScriptableObject.CreateInstance<FacilityId>();

            // Use SerializedObject to set private _id field
            var serialized = new SerializedObject(facilityId);
            serialized.FindProperty("_id").stringValue = idValue;
            serialized.ApplyModifiedPropertiesWithoutUndo();

            AssetDatabase.CreateAsset(facilityId, assetPath);
            Debug.Log($"[CreateMegaStructureAssets] Created FacilityId: {assetPath}");
        }

        private static void CreateFacilityDefinition(
            string assetPath,
            FacilityId id,
            string displayName,
            string description,
            string[] tags,
            double baseProduction,
            string productionStatId,
            string wordUsed,
            string productionWordUsed,
            string purchasePrompt,
            bool usesFacilityCost,
            FacilityId costFacilityId,
            double baseFacilityCost,
            double facilityCostExponent,
            FacilityId secondaryCostFacilityId = null,
            double secondaryBaseCost = 0,
            double secondaryCostExponent = 1.5)
        {
            // Check if already exists
            if (AssetDatabase.LoadAssetAtPath<FacilityDefinition>(assetPath) != null)
            {
                Debug.Log($"[CreateMegaStructureAssets] FacilityDefinition '{displayName}' already exists, skipping.");
                return;
            }

            FacilityDefinition definition = ScriptableObject.CreateInstance<FacilityDefinition>();

            // Use SerializedObject to set all fields including private _id
            var serialized = new SerializedObject(definition);
            serialized.FindProperty("_id").objectReferenceValue = id;
            serialized.FindProperty("displayName").stringValue = displayName;
            serialized.FindProperty("description").stringValue = description;

            var tagsProperty = serialized.FindProperty("tags");
            tagsProperty.arraySize = tags.Length;
            for (int i = 0; i < tags.Length; i++)
            {
                tagsProperty.GetArrayElementAtIndex(i).stringValue = tags[i];
            }

            // Standard facility fields - mega-structures don't use currency cost
            serialized.FindProperty("baseCost").doubleValue = 0;
            serialized.FindProperty("costExponent").doubleValue = 1;
            serialized.FindProperty("baseProduction").doubleValue = baseProduction;
            serialized.FindProperty("productionStatId").stringValue = productionStatId;
            serialized.FindProperty("wordUsed").stringValue = wordUsed;
            serialized.FindProperty("productionWordUsed").stringValue = productionWordUsed;
            serialized.FindProperty("purchasePrompt").stringValue = purchasePrompt;

            // Facility cost fields
            serialized.FindProperty("usesFacilityCost").boolValue = usesFacilityCost;
            serialized.FindProperty("costFacilityId").objectReferenceValue = costFacilityId;
            serialized.FindProperty("baseFacilityCost").doubleValue = baseFacilityCost;
            serialized.FindProperty("facilityCostExponent").doubleValue = facilityCostExponent;

            // Secondary cost fields
            serialized.FindProperty("secondaryCostFacilityId").objectReferenceValue = secondaryCostFacilityId;
            serialized.FindProperty("secondaryBaseCost").doubleValue = secondaryBaseCost;
            serialized.FindProperty("secondaryCostExponent").doubleValue = secondaryCostExponent;

            serialized.ApplyModifiedPropertiesWithoutUndo();

            AssetDatabase.CreateAsset(definition, assetPath);
            Debug.Log($"[CreateMegaStructureAssets] Created FacilityDefinition: {assetPath}");
        }
    }
}
