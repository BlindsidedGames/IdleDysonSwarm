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

        public static bool TryGetLegacyLevel(Oracle.DysonVerseInfinityData dvid, string id, out double level)
        {
            level = 0;
            if (dvid == null || string.IsNullOrEmpty(id)) return false;

            switch (id)
            {
                case MoneyMultiplier:
                    level = dvid.moneyMultiUpgradeOwned;
                    return true;
                case ScienceBoost:
                    level = dvid.scienceBoostOwned;
                    return true;
                case AssemblyLineUpgrade:
                    level = dvid.assemblyLineUpgradeOwned;
                    return true;
                case AiManagerUpgrade:
                    level = dvid.aiManagerUpgradeOwned;
                    return true;
                case ServerUpgrade:
                    level = dvid.serverUpgradeOwned;
                    return true;
                case DataCenterUpgrade:
                    level = dvid.dataCenterUpgradeOwned;
                    return true;
                case PlanetUpgrade:
                    level = dvid.planetUpgradeOwned;
                    return true;
                case PanelLifetime1:
                    level = dvid.panelLifetime1 ? 1 : 0;
                    return true;
                case PanelLifetime2:
                    level = dvid.panelLifetime2 ? 1 : 0;
                    return true;
                case PanelLifetime3:
                    level = dvid.panelLifetime3 ? 1 : 0;
                    return true;
                case PanelLifetime4:
                    level = dvid.panelLifetime4 ? 1 : 0;
                    return true;
                default:
                    return false;
            }
        }

        public static bool TrySetLegacyLevel(Oracle.DysonVerseInfinityData dvid, string id, double level)
        {
            if (dvid == null || string.IsNullOrEmpty(id)) return false;

            switch (id)
            {
                case MoneyMultiplier:
                    dvid.moneyMultiUpgradeOwned = level;
                    return true;
                case ScienceBoost:
                    dvid.scienceBoostOwned = level;
                    return true;
                case AssemblyLineUpgrade:
                    dvid.assemblyLineUpgradeOwned = (long)level;
                    return true;
                case AiManagerUpgrade:
                    dvid.aiManagerUpgradeOwned = (long)level;
                    return true;
                case ServerUpgrade:
                    dvid.serverUpgradeOwned = (long)level;
                    return true;
                case DataCenterUpgrade:
                    dvid.dataCenterUpgradeOwned = (long)level;
                    return true;
                case PlanetUpgrade:
                    dvid.planetUpgradeOwned = (long)level;
                    return true;
                case PanelLifetime1:
                    dvid.panelLifetime1 = level >= 1;
                    return true;
                case PanelLifetime2:
                    dvid.panelLifetime2 = level >= 1;
                    return true;
                case PanelLifetime3:
                    dvid.panelLifetime3 = level >= 1;
                    return true;
                case PanelLifetime4:
                    dvid.panelLifetime4 = level >= 1;
                    return true;
                default:
                    return false;
            }
        }

        public static void PopulateLevelsFromLegacy(Oracle.DysonVerseInfinityData dvid,
            IDictionary<string, double> target)
        {
            if (dvid == null || target == null) return;

            for (int i = 0; i < AllIds.Length; i++)
            {
                string id = AllIds[i];
                if (TryGetLegacyLevel(dvid, id, out double level))
                {
                    target[id] = level;
                }
            }
        }

        public static void ApplyLevelsToLegacy(Oracle.DysonVerseInfinityData dvid,
            IReadOnlyDictionary<string, double> source)
        {
            if (dvid == null || source == null) return;

            for (int i = 0; i < AllIds.Length; i++)
            {
                string id = AllIds[i];
                if (source.TryGetValue(id, out double level))
                {
                    TrySetLegacyLevel(dvid, id, level);
                }
            }
        }
    }
}
