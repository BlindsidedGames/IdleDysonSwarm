using UnityEngine;
using GameData;
using static Blindsided.Utilities.CalcUtils;
using static Expansion.Oracle;

namespace Buildings
{
    public class FacilityBuildingPresenter : Building
    {
        public enum FacilityType
        {
            Unknown = 0,
            AssemblyLines,
            AiManagers,
            Servers,
            DataCenters,
            Planets
        }

        [SerializeField] private FacilityType facilityType = FacilityType.Unknown;
        private FacilityDefinition cachedDefinition;

        public string FacilityId => GetFacilityId();

        protected override double BaseCost
        {
            get
            {
                FacilityDefinition definition = Definition;
                if (definition != null && definition.baseCost > 0)
                {
                    return definition.baseCost;
                }

                return baseCost;
            }
        }

        protected override double CostExponent
        {
            get
            {
                FacilityDefinition definition = Definition;
                if (definition != null && definition.costExponent > 0)
                {
                    return definition.costExponent;
                }

                return exponent;
            }
        }

        public override double ManuallyPurchasedBuildings
        {
            get
            {
                switch (facilityType)
                {
                    case FacilityType.AssemblyLines:
                        return StaticInfinityData.assemblyLines[1];
                    case FacilityType.AiManagers:
                        return StaticInfinityData.managers[1];
                    case FacilityType.Servers:
                        return StaticInfinityData.servers[1];
                    case FacilityType.DataCenters:
                        return StaticInfinityData.dataCenters[1];
                    case FacilityType.Planets:
                        return StaticInfinityData.planets[1];
                    default:
                        return 0;
                }
            }
            set
            {
                switch (facilityType)
                {
                    case FacilityType.AssemblyLines:
                        StaticInfinityData.assemblyLines[1] = value;
                        break;
                    case FacilityType.AiManagers:
                        StaticInfinityData.managers[1] = value;
                        break;
                    case FacilityType.Servers:
                        StaticInfinityData.servers[1] = value;
                        break;
                    case FacilityType.DataCenters:
                        StaticInfinityData.dataCenters[1] = value;
                        break;
                    case FacilityType.Planets:
                        StaticInfinityData.planets[1] = value;
                        break;
                }
            }
        }

        public override double AutoPurchasedBuildings
        {
            get
            {
                switch (facilityType)
                {
                    case FacilityType.AssemblyLines:
                        return StaticInfinityData.assemblyLines[0];
                    case FacilityType.AiManagers:
                        return StaticInfinityData.managers[0];
                    case FacilityType.Servers:
                        return StaticInfinityData.servers[0];
                    case FacilityType.DataCenters:
                        return StaticInfinityData.dataCenters[0];
                    case FacilityType.Planets:
                        return StaticInfinityData.planets[0];
                    default:
                        return 0;
                }
            }
            set
            {
                switch (facilityType)
                {
                    case FacilityType.AssemblyLines:
                        StaticInfinityData.assemblyLines[0] = value;
                        break;
                    case FacilityType.AiManagers:
                        StaticInfinityData.managers[0] = value;
                        break;
                    case FacilityType.Servers:
                        StaticInfinityData.servers[0] = value;
                        break;
                    case FacilityType.DataCenters:
                        StaticInfinityData.dataCenters[0] = value;
                        break;
                    case FacilityType.Planets:
                        StaticInfinityData.planets[0] = value;
                        break;
                }
            }
        }

        public override double ModifiedBaseCost
        {
            get
            {
                if (facilityType == FacilityType.AssemblyLines && StaticSkillTreeData.assemblyMegaLines)
                {
                    double totalPlanets = StaticInfinityData.planets[0] + StaticInfinityData.planets[1];
                    if (totalPlanets > 0)
                    {
                        return BaseCost / totalPlanets;
                    }
                }

                return BaseCost;
            }
        }

        public override double Production
        {
            get
            {
                switch (facilityType)
                {
                    case FacilityType.AssemblyLines:
                        return StaticInfinityData.assemblyLineBotProduction;
                    case FacilityType.AiManagers:
                        return StaticInfinityData.managerAssemblyLineProduction;
                    case FacilityType.Servers:
                        return StaticInfinityData.serverManagerProduction;
                    case FacilityType.DataCenters:
                        return StaticInfinityData.dataCenterServerProduction;
                    case FacilityType.Planets:
                        return StaticInfinityData.planetsDataCenterProduction;
                    default:
                        return 0;
                }
            }
        }

        public override double CurrentLevel
        {
            get
            {
                bool infinityUnlocked = facilityType switch
                {
                    FacilityType.AssemblyLines => StaticPrestigeData.infinityAssemblyLines,
                    FacilityType.AiManagers => StaticPrestigeData.infinityAiManagers,
                    FacilityType.Servers => StaticPrestigeData.infinityServers,
                    FacilityType.DataCenters => StaticPrestigeData.infinityDataCenter,
                    FacilityType.Planets => StaticPrestigeData.infinityPlanets,
                    _ => false
                };

                return infinityUnlocked ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
            }
        }

        public override bool AutoBuy
        {
            get
            {
                if (!StaticPrestigeData.infinityAutoBots)
                {
                    return false;
                }

                return facilityType switch
                {
                    FacilityType.AssemblyLines => StaticSaveSettings.infinityAutoAssembly,
                    FacilityType.AiManagers => StaticSaveSettings.infinityAutoManagers,
                    FacilityType.Servers => StaticSaveSettings.infinityAutoServers,
                    FacilityType.DataCenters => StaticSaveSettings.infinityAutoDataCenters,
                    FacilityType.Planets => StaticSaveSettings.infinityAutoPlanets,
                    _ => false
                };
            }
        }

        public override string OwnedText
        {
            get
            {
                if (facilityType == FacilityType.Planets)
                {
                    double manualDisplay = StaticSkillTreeData.terraIrradiant
                        ? ManuallyPurchasedBuildings * 12
                        : ManuallyPurchasedBuildings;
                    double totalDisplay = AutoPurchasedBuildings + manualDisplay;
                    return
                        $"Planets {textColourOrange}{FormatNumber(totalDisplay)}<size=70%>{textColourGreen}({FormatNumber(manualDisplay)})";
                }

                string terraBonus = GetTerraBonusText();
                return
                    $"{GetDisplayName()} {textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}{terraBonus})";
            }
        }

        public override string ProductioinText
        {
            get
            {
                string purchasePrompt = GetPurchasePrompt();
                string word = GetWordUsed();
                string productionWord = GetProductionWordUsed();
                return $"{(Production > 0 ? $"{word} " : "")}{textColourOrange}" +
                       $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWord}s /s" : Production > 0 ? $"1</color> {productionWord} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : purchasePrompt)}";
            }
        }

        private string GetDisplayName()
        {
            FacilityDefinition definition = Definition;
            if (definition != null && !string.IsNullOrEmpty(definition.displayName))
            {
                return definition.displayName;
            }

            return facilityType switch
            {
                FacilityType.AssemblyLines => "Assembly Lines",
                FacilityType.AiManagers => "AI Managers",
                FacilityType.Servers => "Servers",
                FacilityType.DataCenters => "Data Centers",
                FacilityType.Planets => "Planets",
                _ => "Facilities"
            };
        }

        private string GetPurchasePrompt()
        {
            FacilityDefinition definition = Definition;
            if (definition != null && !string.IsNullOrEmpty(definition.purchasePrompt))
            {
                return definition.purchasePrompt;
            }

            return facilityType switch
            {
                FacilityType.AssemblyLines => "Purchase an Assembly Line",
                FacilityType.AiManagers => "Purchase an AI Manager",
                FacilityType.Servers => "Purchase a Server",
                FacilityType.DataCenters => "Purchase a Data Center",
                FacilityType.Planets => "Purchase a Planet",
                _ => "Purchase"
            };
        }

        private string GetTerraBonusText()
        {
            bool hasTerraBonus = facilityType switch
            {
                FacilityType.AssemblyLines => StaticSkillTreeData.terraNullius,
                FacilityType.AiManagers => StaticSkillTreeData.terraInfirma,
                FacilityType.Servers => StaticSkillTreeData.terraEculeo,
                FacilityType.DataCenters => StaticSkillTreeData.terraFirma,
                _ => false
            };

            if (!hasTerraBonus)
            {
                return "";
            }

            double terraBonus = StaticSkillTreeData.terraIrradiant
                ? StaticInfinityData.planets[1] * 12
                : StaticInfinityData.planets[1];

            return $"{textColourBlue}+{FormatNumber(terraBonus)}";
        }

        private string GetWordUsed()
        {
            FacilityDefinition definition = Definition;
            if (definition != null && !string.IsNullOrEmpty(definition.wordUsed))
            {
                return definition.wordUsed;
            }

            return wordUsed;
        }

        private string GetProductionWordUsed()
        {
            FacilityDefinition definition = Definition;
            if (definition != null && !string.IsNullOrEmpty(definition.productionWordUsed))
            {
                return definition.productionWordUsed;
            }

            return productionWordUsed;
        }

        private FacilityDefinition Definition
        {
            get
            {
                if (cachedDefinition != null)
                {
                    return cachedDefinition;
                }

                string id = GetFacilityId();
                if (string.IsNullOrEmpty(id))
                {
                    return null;
                }

                GameDataRegistry registry = GameDataRegistry.Instance;
                if (registry != null && registry.TryGetFacility(id, out FacilityDefinition definition))
                {
                    cachedDefinition = definition;
                }

                return cachedDefinition;
            }
        }

        private string GetFacilityId()
        {
            return facilityType switch
            {
                FacilityType.AssemblyLines => "assembly_lines",
                FacilityType.AiManagers => "ai_managers",
                FacilityType.Servers => "servers",
                FacilityType.DataCenters => "data_centers",
                FacilityType.Planets => "planets",
                _ => null
            };
        }
    }
}
