using IdleDysonSwarm.Data.Balance;
using UnityEngine;
using static Expansion.Oracle;

/*
 * SimulationUpgradeEffectApplier
 * Purpose: Executes data-driven purchase effects while preserving existing save schema fields.
 * Runs: Runtime.
 * Primary entry points: ApplyEffects().
 * Owns vs delegates: Owns effect dispatch; delegates field resolution to SimulationUpgradeStateAccessor.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs
 * - Assets/Scripts/Expansion/ResearchManager.cs
 * - Assets/Scripts/Expansion/Oracle.cs save containers
 *
 * Change notes:
 * - Effect target keys must match existing save field names for compatibility.
 * - New effect types require synchronized updates in editor validation and authoring guidance.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// Applies configured side effects for simulation/reality upgrade purchases.
    /// </summary>
    public static class SimulationUpgradeEffectApplier
    {
        /// <summary>
        /// Applies all purchase effects from a definition into current save settings.
        /// </summary>
        /// <param name="definition">Upgrade definition containing side effects.</param>
        /// <param name="settings">Save settings target.</param>
        public static void ApplyEffects(SimulationUpgradeDefinition definition, SaveDataSettings settings)
        {
            if (definition == null || settings == null)
            {
                return;
            }

            ApplyEffects(definition.purchaseEffects, settings);
        }

        /// <summary>
        /// Applies a list of purchase effects into current save settings.
        /// </summary>
        /// <param name="effects">Effect payloads.</param>
        /// <param name="settings">Save settings target.</param>
        public static void ApplyEffects(System.Collections.Generic.IReadOnlyList<SimulationUpgradeEffect> effects, SaveDataSettings settings)
        {
            if (effects == null || settings == null)
            {
                return;
            }

            SaveDataPrestige prestige = settings.sdPrestige;
            SaveData save = settings.saveData;
            SaveDataDream1 dream1 = settings.sdSimulation;
            DysonVerseSkillTreeData skillTree = settings.dysonVerseSaveData != null
                ? settings.dysonVerseSaveData.dysonVerseSkillTreeData
                : null;

            for (int i = 0; i < effects.Count; i++)
            {
                SimulationUpgradeEffect effect = effects[i];
                if (effect == null)
                {
                    continue;
                }

                ApplyEffect(effect, prestige, save, dream1, skillTree);
            }
        }

        /// <summary>
        /// Applies one effect payload.
        /// </summary>
        /// <param name="effect">Effect payload.</param>
        /// <param name="prestige">Prestige save section.</param>
        /// <param name="save">Persistent save section.</param>
        /// <param name="dream1">Dream1 save section.</param>
        /// <param name="skillTree">Skill tree save section.</param>
        private static void ApplyEffect(
            SimulationUpgradeEffect effect,
            SaveDataPrestige prestige,
            SaveData save,
            SaveDataDream1 dream1,
            DysonVerseSkillTreeData skillTree)
        {
            switch (effect.effectType)
            {
                case SimulationUpgradeEffectType.SetPrestigeFlag:
                case SimulationUpgradeEffectType.SetSaveFlag:
                    if (!SimulationUpgradeStateAccessor.SetOwned(effect.targetKey, effect.boolValue, prestige, save))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed bool target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.SetDream1Flag:
                    if (!SimulationUpgradeStateAccessor.TrySetDream1Flag(effect.targetKey, effect.boolValue, dream1))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed Dream1 flag target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.AddSkillPoints:
                    if (skillTree != null)
                    {
                        skillTree.skillPointsTree += (int)System.Math.Round(effect.numericValue);
                    }

                    break;
                case SimulationUpgradeEffectType.SetDream1Value:
                    if (!SimulationUpgradeStateAccessor.TrySetDream1Numeric(effect.targetKey, effect.numericValue, dream1))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed Dream1 target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.SetSaveValue:
                    if (!SimulationUpgradeStateAccessor.TrySetSaveNumeric(effect.targetKey, effect.numericValue, save))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed save numeric target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.MaxDream1Value:
                    if (!SimulationUpgradeStateAccessor.TryMaxDream1Numeric(effect.targetKey, effect.numericValue, dream1))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed Dream1 max target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.MaxSaveValue:
                    if (!SimulationUpgradeStateAccessor.TryMaxSaveNumeric(effect.targetKey, effect.numericValue, save))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed save max target '{effect.targetKey}'.");
                    }

                    break;
                case SimulationUpgradeEffectType.SetPrestigeValue:
                    if (!SimulationUpgradeStateAccessor.TrySetPrestigeNumeric(effect.targetKey, effect.numericValue, prestige))
                    {
                        Debug.LogWarning($"[SimulationUpgradeEffectApplier] Failed prestige numeric target '{effect.targetKey}'.");
                    }

                    break;
            }
        }
    }
}
