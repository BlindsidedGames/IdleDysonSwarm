#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using IdleDysonSwarm.Data;
using System.IO;

namespace IdleDysonSwarm.Editor
{
    /// <summary>
    /// Editor utility to create Quantum Upgrade ScriptableObject assets.
    /// Run from menu: Tools/Idle Dyson/Create Quantum Upgrade Assets
    /// </summary>
    public static class QuantumUpgradeAssetCreator
    {
        private const string BasePath = "Assets/Data/QuantumUpgrades";
        private const string DatabasePath = "Assets/Data/Databases/QuantumUpgradeDatabase.asset";

        [MenuItem("Tools/Idle Dyson/Create Quantum Upgrade Assets")]
        public static void CreateAllAssets()
        {
            // Ensure directory exists
            if (!Directory.Exists(BasePath))
            {
                Directory.CreateDirectory(BasePath);
                AssetDatabase.Refresh();
            }

            // Create all upgrade definitions
            var upgrades = new[]
            {
                // One-time unlocks
                CreateUpgrade("BotMultitasking", "Bot Multitasking", "Improves bot efficiency", 1, CostScalingType.Flat, false, 1),
                CreateUpgrade("DoubleIP", "Double IP", "Doubles Infinity Point gains", 1, CostScalingType.Flat, false, 1),
                CreateUpgrade("Automation", "Automation", "Enables auto-bots and auto-research", 1, CostScalingType.Flat, false, 1),
                CreateUpgrade("BreakTheLoop", "Break The Loop", "DysonVerse upgrade", 6, CostScalingType.Flat, false, 1),
                CreateUpgrade("QuantumEntanglement", "Quantum Entanglement", "Auto-prestige at 42 IP", 12, CostScalingType.Flat, false, 1),
                CreateUpgrade("Avocado", "Avocado", "Unlock the Avocado system", 42, CostScalingType.Flat, false, 1),
                CreateUpgrade("Fragments", "Fragments", "Fragment upgrade", 2, CostScalingType.Flat, false, 1),
                CreateUpgrade("Purity", "Purity", "Purity upgrade", 3, CostScalingType.Flat, false, 1),
                CreateUpgrade("Terra", "Terra", "Terra upgrade", 2, CostScalingType.Flat, false, 1),
                CreateUpgrade("Power", "Power", "Power upgrade", 2, CostScalingType.Flat, false, 1),
                CreateUpgrade("Paragade", "Paragade", "Paragade upgrade", 1, CostScalingType.Flat, false, 1),
                CreateUpgrade("Stellar", "Stellar", "Stellar upgrade", 4, CostScalingType.Flat, false, 1),

                // Repeatable upgrades
                CreateUpgrade("InfluenceSpeed", "Influence Speed", "+4 worker generation speed per purchase", 1, CostScalingType.Flat, true, 0),
                CreateUpgrade("CashBonus", "Cash Bonus", "+5% cash multiplier per purchase", 1, CostScalingType.Flat, true, 0),
                CreateUpgrade("ScienceBonus", "Science Bonus", "+5% science multiplier per purchase", 1, CostScalingType.Flat, true, 0),
                CreateUpgrade("Secrets", "Secrets", "+3 permanent secrets per purchase (max 27)", 1, CostScalingType.Flat, true, 9),
                CreateUpgrade("Division", "Division", "10x multiplier, exponential cost (2^n * 2)", 2, CostScalingType.Exponential, true, 19),
            };

            // Create the database
            var database = ScriptableObject.CreateInstance<QuantumUpgradeDatabase>();

            // Use reflection to set the private upgrades list
            var field = typeof(QuantumUpgradeDatabase).GetField("upgrades",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var upgradesList = new System.Collections.Generic.List<QuantumUpgradeDefinition>(upgrades);
            field?.SetValue(database, upgradesList);

            AssetDatabase.CreateAsset(database, DatabasePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"Created {upgrades.Length} quantum upgrade assets and database at {DatabasePath}");
        }

        private static QuantumUpgradeDefinition CreateUpgrade(
            string id, string displayName, string description,
            int baseCost, CostScalingType scaling, bool repeatable, int maxPurchases)
        {
            string path = $"{BasePath}/{id}.asset";

            // Check if already exists
            var existing = AssetDatabase.LoadAssetAtPath<QuantumUpgradeDefinition>(path);
            if (existing != null)
            {
                Debug.Log($"Updating existing asset: {id}");
                existing.id = id;
                existing.displayName = displayName;
                existing.description = description;
                existing.baseCost = baseCost;
                existing.costScaling = scaling;
                existing.isRepeatable = repeatable;
                existing.maxPurchases = maxPurchases;
                EditorUtility.SetDirty(existing);
                return existing;
            }

            // Create new
            var upgrade = ScriptableObject.CreateInstance<QuantumUpgradeDefinition>();
            upgrade.id = id;
            upgrade.displayName = displayName;
            upgrade.description = description;
            upgrade.baseCost = baseCost;
            upgrade.costScaling = scaling;
            upgrade.isRepeatable = repeatable;
            upgrade.maxPurchases = maxPurchases;

            AssetDatabase.CreateAsset(upgrade, path);
            Debug.Log($"Created asset: {id}");

            return upgrade;
        }
    }
}
#endif
