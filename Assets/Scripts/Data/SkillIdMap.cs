using System.Collections.Generic;

namespace GameData
{
    public static class SkillIdMap
    {
        private static readonly Dictionary<int, string> LegacyKeyToId = new Dictionary<int, string>
        {
            { 1, "startHereTree" },
            { 2, "assemblyLineTree" },
            { 3, "aiManagerTree" },
            { 4, "serverTree" },
            { 5, "planetsTree" },
            { 6, "scientificPlanets" },
            { 7, "workerEfficiencyTree" },
            { 8, "panelLifetime20Tree" },
            { 9, "doubleScienceTree" },
            { 10, "producedAsScienceTree" },
            { 11, "banking" },
            { 12, "investmentPortfolio" },
            { 13, "scientificRevolution" },
            { 14, "economicRevolution" },
            { 15, "renewableEnergy" },
            { 16, "burnOut" },
            { 17, "artificiallyEnhancedPanels" },
            { 18, "stayingPower" },
            { 19, "higgsBoson" },
            { 20, "androids" },
            { 21, "superchargedPower" },
            { 22, "dataCenterTree" },
            { 23, "workerBoost" },
            { 24, "stellarSacrifices" },
            { 25, "stellarObliteration" },
            { 26, "supernova" },
            { 27, "stellarImprovements" },
            { 28, "powerUnderwhelming" },
            { 29, "powerOverwhelming" },
            { 30, "pocketDimensions" },
            { 31, "tasteOfPower" },
            { 32, "indulgingInPower" },
            { 33, "addictionToPower" },
            { 34, "avocados" },
            { 35, "progressiveAssembly" },
            { 36, "regulatedAcademia" },
            { 37, "panelWarranty" },
            { 38, "monetaryPolicy" },
            { 39, "terraformingProtocols" },
            { 40, "productionScaling" },
            { 41, "fragmentAssembly" },
            { 42, "assemblyMegaLines" },
            { 43, "idleElectricSheep" },
            { 44, "superSwarm" },
            { 45, "megaSwarm" },
            { 46, "ultimateSwarm" },
            { 47, "purityOfMind" },
            { 48, "purityOfBody" },
            { 49, "purityOfSEssence" },
            { 50, "dysonSubsidies" },
            { 51, "oneMinutePlan" },
            { 52, "galacticPradigmShift" },
            { 53, "panelMaintenance" },
            { 54, "worthySacrifice" },
            { 55, "endOfTheLine" },
            { 56, "manualLabour" },
            { 57, "superRadiantScattering" },
            { 58, "repeatableResearch" },
            { 59, "shouldersOfGiants" },
            { 60, "shouldersOfPrecursors" },
            { 61, "shouldersOfTheFallen" },
            { 62, "shouldersOfTheEnlightened" },
            { 63, "shouldersOfTheRevolution" },
            { 64, "rocketMania" },
            { 65, "idleSpaceFlight" },
            { 66, "fusionReactors" },
            { 67, "coldFusion" },
            { 68, "scientificDominance" },
            { 69, "economicDominance" },
            { 70, "parallelProcessing" },
            { 71, "rudimentarySingularity" },
            { 72, "hubbleTelescope" },
            { 73, "jamesWebbTelescope" },
            { 74, "dimensionalCatCables" },
            { 75, "pocketProtectors" },
            { 76, "pocketMultiverse" },
            { 77, "whatCouldHaveBeen" },
            { 78, "shoulderSurgery" },
            { 79, "terraFirma" },
            { 80, "terraEculeo" },
            { 81, "terraInfirma" },
            { 82, "terraNullius" },
            { 83, "terraNova" },
            { 84, "terraGloriae" },
            { 85, "terraIrradiant" },
            { 86, "paragon" },
            { 87, "shepherd" },
            { 88, "citadelCouncil" },
            { 89, "renegade" },
            { 90, "saren" },
            { 91, "reapers" },
            { 92, "planetAssembly" },
            { 93, "shellWorlds" },
            { 94, "versatileProductionTactics" },
            { 95, "whatWillComeToPass" },
            { 96, "solarBubbles" },
            { 97, "pocketAndroids" },
            { 98, "hypercubeNetworks" },
            { 99, "parallelComputation" },
            { 100, "quantumComputing" },
            { 101, "unsuspiciousAlgorithms" },
            { 102, "agressiveAlgorithms" },
            { 103, "clusterNetworking" },
            { 104, "stellarDominance" }
        };

        private static Dictionary<string, int> _idToLegacyKey;

        public static bool TryGetId(int legacyKey, out string id)
        {
            return LegacyKeyToId.TryGetValue(legacyKey, out id);
        }

        public static bool TryGetLegacyKey(string id, out int legacyKey)
        {
            legacyKey = 0;
            if (string.IsNullOrEmpty(id)) return false;
            EnsureReverseMap();
            return _idToLegacyKey.TryGetValue(id, out legacyKey);
        }

        public static List<string> ConvertKeysToIds(IEnumerable<int> keys)
        {
            var ids = new List<string>();
            if (keys == null) return ids;

            foreach (int key in keys)
            {
                if (TryGetId(key, out string id))
                {
                    ids.Add(id);
                }
            }

            return ids;
        }

        public static List<int> ConvertIdsToKeys(IEnumerable<string> ids)
        {
            var keys = new List<int>();
            if (ids == null) return keys;

            foreach (string id in ids)
            {
                if (TryGetLegacyKey(id, out int key))
                {
                    keys.Add(key);
                }
            }

            return keys;
        }

        private static void EnsureReverseMap()
        {
            if (_idToLegacyKey != null) return;
            _idToLegacyKey = new Dictionary<string, int>(System.StringComparer.Ordinal);
            foreach (KeyValuePair<int, string> entry in LegacyKeyToId)
            {
                if (string.IsNullOrEmpty(entry.Value)) continue;
                _idToLegacyKey[entry.Value] = entry.Key;
            }
        }
    }
}
