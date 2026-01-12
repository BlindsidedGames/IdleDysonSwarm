using System.Collections.Generic;
using Expansion;

namespace GameData
{
    public static class ResearchIdMap
    {
        public const string MoneyMultiplier = "research.money_multiplier";
        public const string ScienceBoost = "research.science_boost";
        public const string AssemblyLineUpgrade = "research.assembly_line_upgrade";
        public const string AiManagerUpgrade = "research.ai_manager_upgrade";
        public const string ServerUpgrade = "research.server_upgrade";
        public const string DataCenterUpgrade = "research.data_center_upgrade";
        public const string PlanetUpgrade = "research.planet_upgrade";
        public const string PanelLifetime1 = "research.panel_lifetime_1";
        public const string PanelLifetime2 = "research.panel_lifetime_2";
        public const string PanelLifetime3 = "research.panel_lifetime_3";
        public const string PanelLifetime4 = "research.panel_lifetime_4";

        private static readonly string[] AllIds =
        {
            MoneyMultiplier,
            ScienceBoost,
            AssemblyLineUpgrade,
            AiManagerUpgrade,
            ServerUpgrade,
            DataCenterUpgrade,
            PlanetUpgrade,
            PanelLifetime1,
            PanelLifetime2,
            PanelLifetime3,
            PanelLifetime4
        };

        public static IReadOnlyList<string> Ids => AllIds;

        public static bool TryGetLegacyLevel(Oracle.DysonVerseInfinityData infinityData, string id, out double level)
        {
            level = 0;
            if (infinityData == null || string.IsNullOrEmpty(id)) return false;

            switch (id)
            {
                case MoneyMultiplier:
                    level = infinityData.moneyMultiUpgradeOwned;
                    return true;
                case ScienceBoost:
                    level = infinityData.scienceBoostOwned;
                    return true;
                case AssemblyLineUpgrade:
                    level = infinityData.assemblyLineUpgradeOwned;
                    return true;
                case AiManagerUpgrade:
                    level = infinityData.aiManagerUpgradeOwned;
                    return true;
                case ServerUpgrade:
                    level = infinityData.serverUpgradeOwned;
                    return true;
                case DataCenterUpgrade:
                    level = infinityData.dataCenterUpgradeOwned;
                    return true;
                case PlanetUpgrade:
                    level = infinityData.planetUpgradeOwned;
                    return true;
                case PanelLifetime1:
                    level = infinityData.panelLifetime1 ? 1 : 0;
                    return true;
                case PanelLifetime2:
                    level = infinityData.panelLifetime2 ? 1 : 0;
                    return true;
                case PanelLifetime3:
                    level = infinityData.panelLifetime3 ? 1 : 0;
                    return true;
                case PanelLifetime4:
                    level = infinityData.panelLifetime4 ? 1 : 0;
                    return true;
                default:
                    return false;
            }
        }

        public static bool TrySetLegacyLevel(Oracle.DysonVerseInfinityData infinityData, string id, double level)
        {
            if (infinityData == null || string.IsNullOrEmpty(id)) return false;

            switch (id)
            {
                case MoneyMultiplier:
                    infinityData.moneyMultiUpgradeOwned = level;
                    return true;
                case ScienceBoost:
                    infinityData.scienceBoostOwned = level;
                    return true;
                case AssemblyLineUpgrade:
                    infinityData.assemblyLineUpgradeOwned = (long)level;
                    return true;
                case AiManagerUpgrade:
                    infinityData.aiManagerUpgradeOwned = (long)level;
                    return true;
                case ServerUpgrade:
                    infinityData.serverUpgradeOwned = (long)level;
                    return true;
                case DataCenterUpgrade:
                    infinityData.dataCenterUpgradeOwned = (long)level;
                    return true;
                case PlanetUpgrade:
                    infinityData.planetUpgradeOwned = (long)level;
                    return true;
                case PanelLifetime1:
                    infinityData.panelLifetime1 = level >= 1;
                    return true;
                case PanelLifetime2:
                    infinityData.panelLifetime2 = level >= 1;
                    return true;
                case PanelLifetime3:
                    infinityData.panelLifetime3 = level >= 1;
                    return true;
                case PanelLifetime4:
                    infinityData.panelLifetime4 = level >= 1;
                    return true;
                default:
                    return false;
            }
        }

        public static void PopulateLevelsFromLegacy(Oracle.DysonVerseInfinityData infinityData,
            IDictionary<string, double> target)
        {
            if (infinityData == null || target == null) return;

            for (int i = 0; i < AllIds.Length; i++)
            {
                string id = AllIds[i];
                if (TryGetLegacyLevel(infinityData, id, out double level))
                {
                    target[id] = level;
                }
            }
        }

        public static void ApplyLevelsToLegacy(Oracle.DysonVerseInfinityData infinityData,
            IReadOnlyDictionary<string, double> source)
        {
            if (infinityData == null || source == null) return;

            for (int i = 0; i < AllIds.Length; i++)
            {
                string id = AllIds[i];
                if (source.TryGetValue(id, out double level))
                {
                    TrySetLegacyLevel(infinityData, id, level);
                }
            }
        }
    }
}

