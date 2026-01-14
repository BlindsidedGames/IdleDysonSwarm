using UnityEngine;
using Expansion;
using GameData;
using IdleDysonSwarm.Services;
using static Blindsided.Utilities.CalcUtils;

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

        private IGameStateService _gameState;
        private IFacilityService _facilityService;

        protected override void Awake()
        {
            base.Awake();
            _gameState = ServiceLocator.Get<IGameStateService>();
            _facilityService = ServiceLocator.Get<IFacilityService>();
        }

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
                string id = GetFacilityId();
                if (string.IsNullOrEmpty(id))
                {
                    return 0;
                }

                double[] counts = _facilityService.GetFacilityCount(id);
                return counts[1]; // Manual count at index 1
            }
            set
            {
                string id = GetFacilityId();
                if (string.IsNullOrEmpty(id))
                {
                    return;
                }

                double[] counts = _facilityService.GetFacilityCount(id);
                _facilityService.SetFacilityCount(id, value, counts[0]); // Keep auto count, update manual
            }
        }

        public override double AutoPurchasedBuildings
        {
            get
            {
                string id = GetFacilityId();
                if (string.IsNullOrEmpty(id))
                {
                    return 0;
                }

                double[] counts = _facilityService.GetFacilityCount(id);
                return counts[0]; // Auto count at index 0
            }
            set
            {
                string id = GetFacilityId();
                if (string.IsNullOrEmpty(id))
                {
                    return;
                }

                double[] counts = _facilityService.GetFacilityCount(id);
                _facilityService.SetFacilityCount(id, counts[1], value); // Keep manual count, update auto
            }
        }

        public override double ModifiedBaseCost
        {
            get
            {
                if (facilityType == FacilityType.AssemblyLines && _gameState.SkillTreeData.assemblyMegaLines)
                {
                    double[] planetCounts = _facilityService.GetFacilityCount("planets");
                    double totalPlanets = planetCounts[0] + planetCounts[1];
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
                var infinityData = _gameState.InfinityData;
                return facilityType switch
                {
                    FacilityType.AssemblyLines => infinityData.assemblyLineBotProduction,
                    FacilityType.AiManagers => infinityData.managerAssemblyLineProduction,
                    FacilityType.Servers => infinityData.serverManagerProduction,
                    FacilityType.DataCenters => infinityData.dataCenterServerProduction,
                    FacilityType.Planets => infinityData.planetsDataCenterProduction,
                    _ => 0
                };
            }
        }

        public override double CurrentLevel
        {
            get
            {
                var prestigeData = _gameState.PrestigeData;
                bool infinityUnlocked = facilityType switch
                {
                    FacilityType.AssemblyLines => prestigeData.infinityAssemblyLines,
                    FacilityType.AiManagers => prestigeData.infinityAiManagers,
                    FacilityType.Servers => prestigeData.infinityServers,
                    FacilityType.DataCenters => prestigeData.infinityDataCenter,
                    FacilityType.Planets => prestigeData.infinityPlanets,
                    _ => false
                };

                return infinityUnlocked ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
            }
        }

        public override bool AutoBuy
        {
            get
            {
                if (!_gameState.PrestigeData.infinityAutoBots)
                {
                    return false;
                }

                var saveSettings = _gameState.SaveSettings;
                return facilityType switch
                {
                    FacilityType.AssemblyLines => saveSettings.infinityAutoAssembly,
                    FacilityType.AiManagers => saveSettings.infinityAutoManagers,
                    FacilityType.Servers => saveSettings.infinityAutoServers,
                    FacilityType.DataCenters => saveSettings.infinityAutoDataCenters,
                    FacilityType.Planets => saveSettings.infinityAutoPlanets,
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
                    double manualDisplay = _gameState.SkillTreeData.terraIrradiant
                        ? ManuallyPurchasedBuildings * 12
                        : ManuallyPurchasedBuildings;
                    double totalDisplay = AutoPurchasedBuildings + manualDisplay;
                    return
                        $"Planets {Oracle.textColourOrange}{FormatNumber(totalDisplay)}<size=70%>{Oracle.textColourGreen}({FormatNumber(manualDisplay)})";
                }

                string terraBonus = GetTerraBonusText();
                return
                    $"{GetDisplayName()} {Oracle.textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{Oracle.textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}{terraBonus})";
            }
        }

        public override string ProductioinText
        {
            get
            {
                string purchasePrompt = GetPurchasePrompt();
                string word = GetWordUsed();
                string productionWord = GetProductionWordUsed();
                return $"{(Production > 0 ? $"{word} " : "")}{Oracle.textColourOrange}" +
                       $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWord}s /s" : Production > 0 ? $"1</color> {productionWord} /{Oracle.textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : purchasePrompt)}";
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
            var skillTreeData = _gameState.SkillTreeData;
            bool hasTerraBonus = facilityType switch
            {
                FacilityType.AssemblyLines => skillTreeData.terraNullius,
                FacilityType.AiManagers => skillTreeData.terraInfirma,
                FacilityType.Servers => skillTreeData.terraEculeo,
                FacilityType.DataCenters => skillTreeData.terraFirma,
                _ => false
            };

            if (!hasTerraBonus)
            {
                return "";
            }

            double[] planetCounts = _facilityService.GetFacilityCount("planets");
            double terraBonus = skillTreeData.terraIrradiant
                ? planetCounts[1] * 12
                : planetCounts[1];

            return $"{Oracle.textColourBlue}+{FormatNumber(terraBonus)}";
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
