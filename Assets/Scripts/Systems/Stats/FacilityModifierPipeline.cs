using System;
using System.Collections.Generic;
using GameData;
using Systems;
using static Expansion.Oracle;

namespace Systems.Stats
{
    public static class FacilityModifierPipeline
    {
        private const double BaseUpgradePercent = 0.03;
        private const double UpgradeEpsilon = 1e-12;
        private const int UpgradeOrderFallback = 0;
        private const int TerraThresholdOrder = 32;
        private const int InfinityOrder = 88;
        private const int SecretOrder = 90;
        private const int AvocatoOrder = 95;
        private const string AssemblyLineUpgradeEffectId = "effect.research.assembly_line_modifier";
        private const string ManagerUpgradeEffectId = "effect.research.ai_manager_modifier";
        private const string ServerUpgradeEffectId = "effect.research.server_modifier";
        private const string PlanetUpgradeEffectId = "effect.research.planet_modifier";

        public static bool TryCalculateAssemblyLineModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.AssemblyLineModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = 1;

            var effects = new List<StatEffect>();
            double upgradePercent = infinityData.assemblyLineUpgradePercent;
            bool applySecretUpgrade = prestigeData != null && prestigeData.secretsOfTheUniverse > 0 &&
                                      upgradePercent > BaseUpgradePercent + UpgradeEpsilon;

            if (hasResearch)
            {
                int upgradeOrder = UpgradeOrderFallback;
                string upgradeName = "Assembly Line Upgrades";
                double upgradeLevel;
                if (TryPopEffectById(researchEffects, AssemblyLineUpgradeEffectId, out StatEffect upgradeEffect))
                {
                    upgradeOrder = upgradeEffect.Order;
                    if (!string.IsNullOrEmpty(upgradeEffect.SourceName)) upgradeName = upgradeEffect.SourceName;
                    upgradeLevel = upgradePercent > UpgradeEpsilon ? upgradeEffect.Value / upgradePercent : 0;
                }
                else
                {
                    upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.AssemblyLineUpgrade);
                }

                double baseContribution = upgradeLevel * (applySecretUpgrade ? BaseUpgradePercent : upgradePercent);
                AddUpgradeEffect(effects, StatId.AssemblyLineModifier, AssemblyLineUpgradeEffectId, upgradeName,
                    baseContribution, upgradeOrder);
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.AssemblyLineModifier, "secrets.upgrade_percent.assembly_lines",
                        "Secrets of the Universe (Assembly Line Upgrades)", secretContribution, upgradeOrder);
                }

                if (researchEffects != null && researchEffects.Count > 0)
                {
                    effects.AddRange(researchEffects);
                }
            }
            else
            {
                double upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.AssemblyLineUpgrade);
                double basePercent = applySecretUpgrade ? BaseUpgradePercent : upgradePercent;
                baseValue = 1 + upgradeLevel * basePercent;
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.AssemblyLineModifier, "secrets.upgrade_percent.assembly_lines",
                        "Secrets of the Universe (Assembly Line Upgrades)", secretContribution, UpgradeOrderFallback);
                }
            }
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.AssemblyLineModifier, context));

            double terraAmount = GetAssemblyLineTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.AssemblyLineModifier, "assembly_lines", "Assembly Lines",
                terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.AssemblyLineModifier, prestigeData, 0, maxInfinityBuff,
                "prestige.infinity.assembly_lines", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.AssemblyLineModifier, secrets?.AssemblyMulti ?? 1,
                "secrets.assembly_modifier", "Secrets Assembly Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.AssemblyLineModifier, prestigePlus, "prestige.avocato_modifier",
                AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateManagerModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ManagerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = 1;

            var effects = new List<StatEffect>();
            double upgradePercent = infinityData.aiManagerUpgradePercent;
            bool applySecretUpgrade = prestigeData != null && prestigeData.secretsOfTheUniverse > 0 &&
                                      upgradePercent > BaseUpgradePercent + UpgradeEpsilon;

            if (hasResearch)
            {
                int upgradeOrder = UpgradeOrderFallback;
                string upgradeName = "AI Manager Upgrades";
                double upgradeLevel;
                if (TryPopEffectById(researchEffects, ManagerUpgradeEffectId, out StatEffect upgradeEffect))
                {
                    upgradeOrder = upgradeEffect.Order;
                    if (!string.IsNullOrEmpty(upgradeEffect.SourceName)) upgradeName = upgradeEffect.SourceName;
                    upgradeLevel = upgradePercent > UpgradeEpsilon ? upgradeEffect.Value / upgradePercent : 0;
                }
                else
                {
                    upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.AiManagerUpgrade);
                }

                double baseContribution = upgradeLevel * (applySecretUpgrade ? BaseUpgradePercent : upgradePercent);
                AddUpgradeEffect(effects, StatId.ManagerModifier, ManagerUpgradeEffectId, upgradeName, baseContribution,
                    upgradeOrder);
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.ManagerModifier, "secrets.upgrade_percent.ai_managers",
                        "Secrets of the Universe (AI Manager Upgrades)", secretContribution, upgradeOrder);
                }

                if (researchEffects != null && researchEffects.Count > 0)
                {
                    effects.AddRange(researchEffects);
                }
            }
            else
            {
                double upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.AiManagerUpgrade);
                double basePercent = applySecretUpgrade ? BaseUpgradePercent : upgradePercent;
                baseValue = 1 + upgradeLevel * basePercent;
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.ManagerModifier, "secrets.upgrade_percent.ai_managers",
                        "Secrets of the Universe (AI Manager Upgrades)", secretContribution, UpgradeOrderFallback);
                }
            }
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ManagerModifier, context));

            double terraAmount = GetManagerTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.ManagerModifier, "ai_managers", "AI Managers", terraAmount,
                skillTreeData);
            AddInfinityMultiplier(effects, StatId.ManagerModifier, prestigeData, 2, maxInfinityBuff,
                "prestige.infinity.ai_managers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ManagerModifier, secrets?.AiMulti ?? 1,
                "secrets.ai_manager_modifier", "Secrets AI Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ManagerModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateServerModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.ServerModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = 1;

            var effects = new List<StatEffect>();
            double upgradePercent = infinityData.serverUpgradePercent;
            bool applySecretUpgrade = prestigeData != null && prestigeData.secretsOfTheUniverse > 0 &&
                                      upgradePercent > BaseUpgradePercent + UpgradeEpsilon;

            if (hasResearch)
            {
                int upgradeOrder = UpgradeOrderFallback;
                string upgradeName = "Server Upgrades";
                double upgradeLevel;
                if (TryPopEffectById(researchEffects, ServerUpgradeEffectId, out StatEffect upgradeEffect))
                {
                    upgradeOrder = upgradeEffect.Order;
                    if (!string.IsNullOrEmpty(upgradeEffect.SourceName)) upgradeName = upgradeEffect.SourceName;
                    upgradeLevel = upgradePercent > UpgradeEpsilon ? upgradeEffect.Value / upgradePercent : 0;
                }
                else
                {
                    upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.ServerUpgrade);
                }

                double baseContribution = upgradeLevel * (applySecretUpgrade ? BaseUpgradePercent : upgradePercent);
                AddUpgradeEffect(effects, StatId.ServerModifier, ServerUpgradeEffectId, upgradeName, baseContribution,
                    upgradeOrder);
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.ServerModifier, "secrets.upgrade_percent.servers",
                        "Secrets of the Universe (Server Upgrades)", secretContribution, upgradeOrder);
                }

                if (researchEffects != null && researchEffects.Count > 0)
                {
                    effects.AddRange(researchEffects);
                }
            }
            else
            {
                double upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.ServerUpgrade);
                double basePercent = applySecretUpgrade ? BaseUpgradePercent : upgradePercent;
                baseValue = 1 + upgradeLevel * basePercent;
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.ServerModifier, "secrets.upgrade_percent.servers",
                        "Secrets of the Universe (Server Upgrades)", secretContribution, UpgradeOrderFallback);
                }
            }
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.ServerModifier, context));

            double terraAmount = GetServerTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.ServerModifier, "servers", "Servers", terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.ServerModifier, prestigeData, 3, maxInfinityBuff,
                "prestige.infinity.servers", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.ServerModifier, secrets?.ServerMulti ?? 1,
                "secrets.server_modifier", "Secrets Server Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.ServerModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculateDataCenterModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, double maxInfinityBuff, out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.DataCenterModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = hasResearch
                ? 1
                : 1 + infinityData.dataCenterUpgradeOwned * infinityData.dataCenterUpgradePercent;

            var effects = new List<StatEffect>();
            if (hasResearch) effects.AddRange(researchEffects);
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.DataCenterModifier, context));

            double terraAmount = GetDataCenterTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.DataCenterModifier, "data_centers", "Data Centers", terraAmount,
                skillTreeData);
            AddInfinityMultiplier(effects, StatId.DataCenterModifier, prestigeData, 4, maxInfinityBuff,
                "prestige.infinity.data_centers", "Infinity Buff", InfinityOrder);
            AddAvocatoMultiplier(effects, StatId.DataCenterModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        public static bool TryCalculatePlanetModifier(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData,
            DysonVersePrestigeData prestigeData, PrestigePlus prestigePlus, SecretBuffState secrets, double maxInfinityBuff,
            out StatResult result)
        {
            result = null;
            if (!IsReady() || infinityData == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            bool hasResearch = ResearchEffectProvider.TryBuildGlobalEffects(StatId.PlanetModifier, context,
                out List<StatEffect> researchEffects);
            double baseValue = 1;

            var effects = new List<StatEffect>();
            double upgradePercent = infinityData.planetUpgradePercent;
            bool applySecretUpgrade = prestigeData != null && prestigeData.secretsOfTheUniverse > 0 &&
                                      upgradePercent > BaseUpgradePercent + UpgradeEpsilon;

            if (hasResearch)
            {
                int upgradeOrder = UpgradeOrderFallback;
                string upgradeName = "Planet Upgrades";
                double upgradeLevel;
                if (TryPopEffectById(researchEffects, PlanetUpgradeEffectId, out StatEffect upgradeEffect))
                {
                    upgradeOrder = upgradeEffect.Order;
                    if (!string.IsNullOrEmpty(upgradeEffect.SourceName)) upgradeName = upgradeEffect.SourceName;
                    upgradeLevel = upgradePercent > UpgradeEpsilon ? upgradeEffect.Value / upgradePercent : 0;
                }
                else
                {
                    upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.PlanetUpgrade);
                }

                double baseContribution = upgradeLevel * (applySecretUpgrade ? BaseUpgradePercent : upgradePercent);
                AddUpgradeEffect(effects, StatId.PlanetModifier, PlanetUpgradeEffectId, upgradeName, baseContribution,
                    upgradeOrder);
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.PlanetModifier, "secrets.upgrade_percent.planets",
                        "Secrets of the Universe (Planet Upgrades)", secretContribution, upgradeOrder);
                }

                if (researchEffects != null && researchEffects.Count > 0)
                {
                    effects.AddRange(researchEffects);
                }
            }
            else
            {
                double upgradeLevel = GetResearchLevel(infinityData, ResearchIdMap.PlanetUpgrade);
                double basePercent = applySecretUpgrade ? BaseUpgradePercent : upgradePercent;
                baseValue = 1 + upgradeLevel * basePercent;
                if (applySecretUpgrade)
                {
                    double secretContribution = upgradeLevel * (upgradePercent - BaseUpgradePercent);
                    AddUpgradeEffect(effects, StatId.PlanetModifier, "secrets.upgrade_percent.planets",
                        "Secrets of the Universe (Planet Upgrades)", secretContribution, UpgradeOrderFallback);
                }
            }
            effects.AddRange(SkillEffectProvider.BuildGlobalEffects(StatId.PlanetModifier, context));

            double terraAmount = GetPlanetTerraAmount(infinityData, skillTreeData);
            AddTerraThresholdEffects(effects, StatId.PlanetModifier, "planets", "Planets", terraAmount, skillTreeData);
            AddInfinityMultiplier(effects, StatId.PlanetModifier, prestigeData, 5, maxInfinityBuff,
                "prestige.infinity.planets", "Infinity Buff", InfinityOrder);
            AddSecretMultiplier(effects, StatId.PlanetModifier, secrets?.PlanetMulti ?? 1,
                "secrets.planet_modifier", "Secrets Planet Modifier", SecretOrder);
            AddAvocatoMultiplier(effects, StatId.PlanetModifier, prestigePlus, "prestige.avocato_modifier", AvocatoOrder);

            result = StatCalculator.Calculate(baseValue, effects);
            return true;
        }

        private static bool IsReady()
        {
            return true;
        }

        private static void AddTerraThresholdEffects(List<StatEffect> effects, string statId, string facilityId,
            string facilityName, double terraAmount, DysonVerseSkillTreeData skillTreeData)
        {
            if (effects == null || skillTreeData == null || skillTreeData.supernova) return;

            if (terraAmount >= 50)
            {
                AddMultiplierEffect(effects, $"terra.threshold50.{facilityId}",
                    $"{facilityName} Threshold (50)", statId, 2, TerraThresholdOrder);
            }

            if (terraAmount >= 100)
            {
                AddMultiplierEffect(effects, $"terra.threshold100.{facilityId}",
                    $"{facilityName} Threshold (100)", statId, 2, TerraThresholdOrder + 1);
            }

            double threshold = ProductionMath.AmountForBuildingBoostAfterX(skillTreeData);
            if (terraAmount > threshold)
            {
                double division = ProductionMath.DivisionForBoostAfterX(skillTreeData);
                if (division > 0)
                {
                    double perExtraBoost = (terraAmount - threshold) / division + 1;
                    AddMultiplierEffect(effects, $"terra.scaling.{facilityId}",
                        $"{facilityName} Scaling", statId, perExtraBoost, TerraThresholdOrder + 2);
                }
            }
        }

        private static double GetAssemblyLineTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraNullius)
            {
                return infinityData.assemblyLines[1] + planets;
            }

            return infinityData.assemblyLines[1];
        }

        private static double GetManagerTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraInfirma)
            {
                return infinityData.managers[1] + planets;
            }

            return infinityData.managers[1];
        }

        private static double GetServerTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraEculeo)
            {
                return infinityData.servers[1] + planets;
            }

            return infinityData.servers[1];
        }

        private static double GetDataCenterTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = GetTerraPlanetCount(infinityData, skillTreeData);
            if (skillTreeData != null && skillTreeData.terraFirma)
            {
                return infinityData.dataCenters[1] + planets;
            }

            return infinityData.dataCenters[1];
        }

        private static double GetPlanetTerraAmount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = infinityData.planets[1];
            if (skillTreeData != null && skillTreeData.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static double GetTerraPlanetCount(DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData)
        {
            if (infinityData == null) return 0;
            double planets = infinityData.planets[1];
            if (skillTreeData != null && skillTreeData.terraIrradiant)
            {
                planets *= 12;
            }

            return planets;
        }

        private static void AddInfinityMultiplier(List<StatEffect> effects, string statId, DysonVersePrestigeData prestigeData,
            long minInfinityPoints, double maxInfinityBuff, string id, string name, int order)
        {
            if (effects == null || prestigeData == null) return;
            if (prestigeData.infinityPoints < minInfinityPoints) return;

            double value = 1 + Math.Clamp((double)prestigeData.infinityPoints, 0d, maxInfinityBuff);
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static void AddSecretMultiplier(List<StatEffect> effects, string statId, double value, string id,
            string name, int order)
        {
            AddMultiplierEffect(effects, id, name, statId, value, order);
        }

        private static bool TryPopEffectById(List<StatEffect> effects, string id, out StatEffect effect)
        {
            effect = default;
            if (effects == null || string.IsNullOrEmpty(id)) return false;
            for (int i = 0; i < effects.Count; i++)
            {
                if (string.Equals(effects[i].Id, id, StringComparison.Ordinal))
                {
                    effect = effects[i];
                    effects.RemoveAt(i);
                    return true;
                }
            }

            return false;
        }

        private static double GetResearchLevel(DysonVerseInfinityData infinityData, string researchId)
        {
            if (infinityData == null || string.IsNullOrEmpty(researchId)) return 0;

            if (infinityData.researchLevelsById != null &&
                infinityData.researchLevelsById.TryGetValue(researchId, out double stored))
            {
                return stored;
            }

            if (ResearchIdMap.TryGetLegacyLevel(infinityData, researchId, out double legacy))
            {
                infinityData.researchLevelsById ??= new Dictionary<string, double>();
                infinityData.researchLevelsById[researchId] = legacy;
                return legacy;
            }

            return 0;
        }

        private static void AddUpgradeEffect(List<StatEffect> effects, string statId, string id, string name,
            double value, int order)
        {
            if (effects == null) return;
            if (Math.Abs(value) <= UpgradeEpsilon) return;

            effects.Add(new StatEffect
            {
                Id = id,
                SourceName = name,
                TargetStatId = statId,
                Operation = StatOperation.Add,
                Value = value,
                Order = order
            });
        }

        private static void AddAvocatoMultiplier(List<StatEffect> effects, string statId, PrestigePlus prestigePlus, string id,
            int order)
        {
            // Use AvocadoData for the actual values (migration moves data there)
            AvocadoData avocadoData = StaticSaveSettings?.avocadoData;
            if (effects == null || avocadoData == null || !avocadoData.unlocked) return;

            double multi = 1;
            if (avocadoData.infinityPoints >= 10)
                multi *= Math.Log10(avocadoData.infinityPoints);
            if (avocadoData.influence >= 10)
                multi *= Math.Log10(avocadoData.influence);
            if (avocadoData.strangeMatter >= 10)
                multi *= Math.Log10(avocadoData.strangeMatter);
            if (avocadoData.overflowMultiplier >= 1)
                multi *= 1 + avocadoData.overflowMultiplier;

            AddMultiplierEffect(effects, id, "Avocato Multiplier", statId, multi, order);
        }

        private static void AddMultiplierEffect(List<StatEffect> effects, string id, string name, string statId,
            double value, int order)
        {
            if (effects == null) return;
            if (Math.Abs(value - 1) <= 1e-12) return;

            effects.Add(new StatEffect
            {
                Id = id,
                SourceName = name,
                TargetStatId = statId,
                Operation = StatOperation.Multiply,
                Value = value,
                Order = order
            });
        }
    }
}

