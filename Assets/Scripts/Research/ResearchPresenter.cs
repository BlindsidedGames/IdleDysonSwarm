using System;
using Buildings;
using Expansion;
using GameData;
using IdleDysonSwarm.Services;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif
using static Blindsided.Utilities.CalcUtils;

namespace Research
{
    public class ResearchPresenter : MonoBehaviour
    {
        private const double DefaultBaseCost = 1d;
        private const double DefaultExponent = 1.15d;
        private const double ExponentEpsilon = 1e-9d;
#if UNITY_EDITOR
        private const string ResearchDatabasePath = "Assets/Data/Databases/ResearchDatabase.asset";
#endif

        [SerializeField] private ResearchDefinition definition;
        [SerializeField] private BuildingReferences buildingReferences;
        [SerializeField] private ResearchAutoBuyGroup autoBuyGroupOverride = ResearchAutoBuyGroup.Inherit;
        [SerializeField] private string researchIdOverride;
        [SerializeField] private bool updateOwnedText = true;
        [SerializeField] private bool updateProductionText = true;

        private ResearchDefinition _resolvedDefinition;
        private string _resolvedId;
        private IGameStateService _gameState;

        private double BaseCostValue => _resolvedDefinition != null ? _resolvedDefinition.baseCost : DefaultBaseCost;

        private double ExponentValue => _resolvedDefinition != null ? _resolvedDefinition.exponent : DefaultExponent;

        private string DisplayName =>
            _resolvedDefinition != null && !string.IsNullOrEmpty(_resolvedDefinition.displayName)
                ? _resolvedDefinition.displayName
                : ResolvedResearchId;

        private double BaseCostCalculated => _gameState.SkillTreeData.repeatableResearch
            ? BaseCostValue > 0
                ? BaseCostValue
                : 1 / (1 + CurrentLevel * (BoostPercent > 0 ? BoostPercent : 1))
            : BaseCostValue;

        private int MaxLevel => _resolvedDefinition != null ? _resolvedDefinition.maxLevel : -1;

        private bool IsMaxed => MaxLevel >= 0 && CurrentLevel >= MaxLevel;

        private bool PrerequisitesMet => _resolvedDefinition == null || HasMetPrerequisites();

        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();

            ResolveDefinition();
            if (buildingReferences == null)
            {
                buildingReferences = GetComponent<BuildingReferences>();
            }
            ResolveBuildingReferences();

            if (buildingReferences != null)
            {
                buildingReferences.purchaseButton.onClick.AddListener(PurchaseResearch);
            }
        }

        private void OnEnable()
        {
            ResolveDefinition();
            ResolveBuildingReferences();
            UpdateVisibility();
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (definition == null && !string.IsNullOrEmpty(researchIdOverride))
            {
                definition = FindDefinitionById(researchIdOverride);
            }

            if (buildingReferences == null)
            {
                ResolveBuildingReferences();
            }
        }
#endif
        private void Update()
        {
            if (_resolvedDefinition == null && definition == null && !string.IsNullOrEmpty(researchIdOverride))
            {
                ResolveDefinition();
            }

            if (buildingReferences == null)
            {
                ResolveBuildingReferences();
            }

            if (buildingReferences == null) return;

            UpdateVisibility();
            UpdateCostText();
            UpdateInteractable();
            UpdateProductionText();
        }

        public double CurrentLevel
        {
            get => _gameState.GetResearchLevel(ResolvedResearchId);
            set => _gameState.SetResearchLevel(ResolvedResearchId, ClampLevel(value));
        }

        public string ResearchIdValue => ResolvedResearchId;

        public ResearchDefinition ResolvedDefinition => ResolveDefinition();

        public double BaseCost => BaseCostValue;

        public double Exponent => ExponentValue;

        public string NameText => DisplayName;

        public double Percent => GetPercentForResearch(ResolvedResearchId);

        public double BoostPercent => CurrentLevel * Percent * 100;

        public string OwnedText => $"{DisplayName} boosts {Oracle.textColourBlue}{FormatNumber(CurrentLevel)}</color>";

        public string ProductionText => CurrentLevel > 0
            ? $"Boosting by {Oracle.textColourBlue}{FormatNumber(BoostPercent)}%</color>"
            : "Purchase for a boost!";

        public bool CanAutoBuy => IsAutoBuyEnabled && Affordable() > 0 && PrerequisitesMet && !IsMaxed;

        private bool IsAutoBuyEnabled
        {
            get
            {
                if (!_gameState.PrestigeData.infinityAutoResearch) return false;

                var saveSettings = _gameState.SaveSettings;
                return ResolvedAutoBuyGroup switch
                {
                    ResearchAutoBuyGroup.None => true,
                    ResearchAutoBuyGroup.Science => saveSettings.infinityAutoResearchToggleScience,
                    ResearchAutoBuyGroup.Money => saveSettings.infinityAutoResearchToggleMoney,
                    ResearchAutoBuyGroup.Assembly => saveSettings.infinityAutoResearchToggleAssembly,
                    ResearchAutoBuyGroup.Ai => saveSettings.infinityAutoResearchToggleAi,
                    ResearchAutoBuyGroup.Server => saveSettings.infinityAutoResearchToggleServer,
                    ResearchAutoBuyGroup.DataCenter => saveSettings.infinityAutoResearchToggleDataCenter,
                    ResearchAutoBuyGroup.Planet => saveSettings.infinityAutoResearchTogglePlanet,
                    _ => false
                };
            }
        }

        public long Affordable()
        {
            if (IsMaxed) return 0;
            long affordable = MaxAffordableForCost(_gameState.Science, BaseCostCalculated);
            return ClampToRemaining(affordable);
        }

        public double Cost()
        {
            if (IsMaxed) return 0;
            long numberToBuy = NumberToBuy();
            return CostForAmount(numberToBuy, BaseCostCalculated);
        }

        public double BuyMaxCost()
        {
            if (IsMaxed) return 0;
            long affordable = Affordable();
            return CostForAmount(affordable, BaseCostValue);
        }

        public bool TryAutoPurchase()
        {
            if (!CanAutoBuy) return false;
            if (BuyMaxCost() > _gameState.Science) return false;

            long affordable = Affordable();
            if (affordable <= 0) return false;

            double previousLevel = CurrentLevel;
            _gameState.Science -= BuyMaxCost();
            CurrentLevel = previousLevel + affordable;
            HandlePostPurchase(previousLevel, CurrentLevel);
            UpdateCostText();
            return true;
        }

        private void PurchaseResearch()
        {
            if (!PrerequisitesMet || IsMaxed) return;

            long numberToBuy = NumberToBuy();
            if (numberToBuy <= 0 || Cost() > _gameState.Science) return;

            double previousLevel = CurrentLevel;
            _gameState.Science -= Cost();
            CurrentLevel = previousLevel + numberToBuy;
            HandlePostPurchase(previousLevel, CurrentLevel);
            UpdateCostText();
        }

        private void HandlePostPurchase(double previousLevel, double newLevel)
        {
            if (previousLevel >= newLevel) return;
            if (!IsPanelLifetimeResearch(ResolvedResearchId)) return;

            GameManager manager = FindFirstObjectByType<GameManager>();
            if (manager != null)
            {
                manager.UpdatePanelLifetime();
            }
        }

        private void UpdateInteractable()
        {
            if (buildingReferences == null) return;

            bool canPurchase = Cost() <= _gameState.Science && NumberToBuy() > 0 && !IsAutoBuyEnabled && PrerequisitesMet && !IsMaxed;
            buildingReferences.purchaseButton.interactable = canPurchase;
        }

        private void UpdateProductionText()
        {
            if (!updateProductionText || buildingReferences == null) return;
            buildingReferences.production.text = ProductionText;
        }

        private void UpdateCostText()
        {
            if (buildingReferences == null) return;

            if (updateOwnedText)
            {
                buildingReferences.building.text = OwnedText;
            }

            if (IsMaxed)
            {
                buildingReferences.buttonCost.text = "Purchased";
                buildingReferences.amountToBuy.text = string.Empty;
                return;
            }

            buildingReferences.amountToBuy.text = IsAutoBuyEnabled ? "Auto" : $"+{NumberToBuy()}";
            buildingReferences.buttonCost.text = $"<sprite=1>{FormatNumber(Cost())}";
        }

        private void UpdateVisibility()
        {
            if (buildingReferences == null) return;

            bool purchased = IsMaxed;
            bool shouldShow = PrerequisitesMet || CurrentLevel > 0;
            if (purchased && _gameState.SaveSettings.hidePurchased)
            {
                shouldShow = false;
            }

            if (buildingReferences.gameObject.activeSelf != shouldShow)
            {
                buildingReferences.gameObject.SetActive(shouldShow);
            }
        }

        private long NumberToBuy()
        {
            if (IsMaxed) return 0;

            long number = 0;
            bool roundedBulkBuy = _gameState.RoundedBulkBuy;
            switch (_gameState.ResearchBuyMode)
            {
                case Oracle.BuyMode.Buy1:
                    number = 1;
                    break;
                case Oracle.BuyMode.Buy10:
                    number = roundedBulkBuy ? 10 - (int)CurrentLevel % 10 : 10;
                    break;
                case Oracle.BuyMode.Buy50:
                    number = roundedBulkBuy ? 50 - (int)CurrentLevel % 50 : 50;
                    break;
                case Oracle.BuyMode.Buy100:
                    number = roundedBulkBuy ? 100 - (int)CurrentLevel % 100 : 100;
                    break;
                case Oracle.BuyMode.BuyMax:
                    number = Affordable() > 0 ? Affordable() : 1;
                    break;
            }

            return ClampToRemaining(number);
        }

        private double ClampLevel(double level)
        {
            if (MaxLevel < 0) return level;
            return Math.Min(level, MaxLevel);
        }

        private long ClampToRemaining(long amount)
        {
            if (MaxLevel < 0) return amount;
            double remaining = MaxLevel - CurrentLevel;
            if (remaining <= 0) return 0;
            long remainingWhole = (long)Math.Floor(remaining);
            return Math.Min(amount, remainingWhole);
        }

        private string ResolvedResearchId
        {
            get
            {
                if (!string.IsNullOrEmpty(_resolvedId)) return _resolvedId;

                if (!string.IsNullOrEmpty(researchIdOverride))
                {
                    _resolvedId = researchIdOverride;
                    return _resolvedId;
                }

                if (definition != null)
                {
                    _resolvedId = definition.id;
                    return _resolvedId;
                }

                if (_resolvedDefinition != null)
                {
                    _resolvedId = _resolvedDefinition.id;
                    return _resolvedId;
                }

                _resolvedId = string.Empty;
                return _resolvedId;
            }
        }

        private ResearchAutoBuyGroup ResolvedAutoBuyGroup
        {
            get
            {
                if (autoBuyGroupOverride != ResearchAutoBuyGroup.Inherit)
                {
                    return autoBuyGroupOverride;
                }

                ResearchDefinition resolved = ResolveDefinition();
                if (resolved != null && resolved.autoBuyGroup != ResearchAutoBuyGroup.Inherit)
                {
                    return resolved.autoBuyGroup;
                }

                return MapAutoBuyGroupFromId(ResolvedResearchId);
            }
        }

        private ResearchDefinition ResolveDefinition()
        {
            if (_resolvedDefinition != null) return _resolvedDefinition;

            if (definition != null)
            {
                _resolvedDefinition = definition;
                return _resolvedDefinition;
            }

            string idToResolve = !string.IsNullOrEmpty(researchIdOverride) ? researchIdOverride : string.Empty;
            if (!string.IsNullOrEmpty(idToResolve))
            {
                GameDataRegistry registry = GameDataRegistry.Instance;
                if (registry != null && registry.TryGetResearch(idToResolve, out ResearchDefinition resolved))
                {
                    _resolvedDefinition = resolved;
                    return _resolvedDefinition;
                }
            }

            return _resolvedDefinition;
        }

        private void ResolveBuildingReferences()
        {
            if (buildingReferences != null) return;

            string targetName = GetBuildingReferenceName(ResolvedResearchId);
            if (string.IsNullOrEmpty(targetName)) return;

            BuildingReferences[] references = FindObjectsByType<BuildingReferences>(FindObjectsInactive.Include,
                FindObjectsSortMode.None);
            for (int i = 0; i < references.Length; i++)
            {
                BuildingReferences reference = references[i];
                if (reference != null && string.Equals(reference.name, targetName, StringComparison.Ordinal))
                {
                    buildingReferences = reference;
                    break;
                }
            }
        }
#if UNITY_EDITOR
        private static ResearchDefinition FindDefinitionById(string researchId)
        {
            if (string.IsNullOrEmpty(researchId)) return null;
            ResearchDatabase database = AssetDatabase.LoadAssetAtPath<ResearchDatabase>(ResearchDatabasePath);
            if (database == null || database.research == null) return null;

            foreach (ResearchDefinition definition in database.research)
            {
                if (definition != null && string.Equals(definition.id, researchId, StringComparison.Ordinal))
                {
                    return definition;
                }
            }

            return null;
        }
#endif

        private bool IsLinearExponent => Math.Abs(ExponentValue - 1d) <= ExponentEpsilon;

        private long MaxAffordableForCost(double currencyOwned, double costBase)
        {
            if (costBase <= 0) return 0;
            if (IsLinearExponent)
            {
                return (long)Math.Floor(currencyOwned / costBase);
            }

            return MaxAffordable(currencyOwned, costBase, ExponentValue, CurrentLevel);
        }

        private double CostForAmount(double amount, double costBase)
        {
            if (amount <= 0 || costBase <= 0) return 0;
            if (IsLinearExponent)
            {
                return costBase * amount;
            }

            return BuyXCost(amount, costBase, ExponentValue, CurrentLevel);
        }

        private bool HasMetPrerequisites()
        {
            if (_resolvedDefinition == null || _resolvedDefinition.prerequisiteResearchIds == null)
            {
                return true;
            }

            foreach (string prerequisite in _resolvedDefinition.prerequisiteResearchIds)
            {
                if (string.IsNullOrEmpty(prerequisite)) continue;
                if (_gameState.GetResearchLevel(prerequisite) <= 0)
                {
                    return false;
                }
            }

            return true;
        }

        private double GetPercentForResearch(string researchId)
        {
            if (string.IsNullOrEmpty(researchId)) return 0;

            var infinityData = _gameState.InfinityData;
            return researchId switch
            {
                ResearchIdMap.MoneyMultiplier => infinityData.moneyMultiUpgradePercent,
                ResearchIdMap.ScienceBoost => infinityData.scienceBoostPercent,
                ResearchIdMap.AssemblyLineUpgrade => infinityData.assemblyLineUpgradePercent,
                ResearchIdMap.AiManagerUpgrade => infinityData.aiManagerUpgradePercent,
                ResearchIdMap.ServerUpgrade => infinityData.serverUpgradePercent,
                ResearchIdMap.DataCenterUpgrade => infinityData.dataCenterUpgradePercent,
                ResearchIdMap.PlanetUpgrade => infinityData.planetUpgradePercent,
                _ => 0
            };
        }

        private static ResearchAutoBuyGroup MapAutoBuyGroupFromId(string researchId)
        {
            switch (researchId)
            {
                case ResearchIdMap.MoneyMultiplier:
                    return ResearchAutoBuyGroup.Money;
                case ResearchIdMap.ScienceBoost:
                    return ResearchAutoBuyGroup.Science;
                case ResearchIdMap.AssemblyLineUpgrade:
                    return ResearchAutoBuyGroup.Assembly;
                case ResearchIdMap.AiManagerUpgrade:
                    return ResearchAutoBuyGroup.Ai;
                case ResearchIdMap.ServerUpgrade:
                    return ResearchAutoBuyGroup.Server;
                case ResearchIdMap.DataCenterUpgrade:
                    return ResearchAutoBuyGroup.DataCenter;
                case ResearchIdMap.PlanetUpgrade:
                    return ResearchAutoBuyGroup.Planet;
                case ResearchIdMap.PanelLifetime1:
                case ResearchIdMap.PanelLifetime2:
                case ResearchIdMap.PanelLifetime3:
                case ResearchIdMap.PanelLifetime4:
                    return ResearchAutoBuyGroup.None;
                default:
                    return ResearchAutoBuyGroup.Inherit;
            }
        }

        private static string GetBuildingReferenceName(string researchId)
        {
            switch (researchId)
            {
                case ResearchIdMap.MoneyMultiplier:
                    return "Research_MoneyMulti";
                case ResearchIdMap.ScienceBoost:
                    return "Research_ScienceBoost";
                case ResearchIdMap.AssemblyLineUpgrade:
                    return "Research_AssemblyMulti";
                case ResearchIdMap.AiManagerUpgrade:
                    return "Research_AiMulti";
                case ResearchIdMap.ServerUpgrade:
                    return "Research_ServerMulti";
                case ResearchIdMap.DataCenterUpgrade:
                    return "Research_DataCenterMulti";
                case ResearchIdMap.PlanetUpgrade:
                    return "Research_PlanetMulti";
                case ResearchIdMap.PanelLifetime1:
                    return "Research_PanelLifetime1";
                case ResearchIdMap.PanelLifetime2:
                    return "Research_PanelLifetime2";
                case ResearchIdMap.PanelLifetime3:
                    return "Research_PanelLifetime3";
                case ResearchIdMap.PanelLifetime4:
                    return "Research_PanelLifetime4";
                default:
                    return null;
            }
        }

        private static bool IsPanelLifetimeResearch(string researchId)
        {
            return researchId == ResearchIdMap.PanelLifetime1 ||
                   researchId == ResearchIdMap.PanelLifetime2 ||
                   researchId == ResearchIdMap.PanelLifetime3 ||
                   researchId == ResearchIdMap.PanelLifetime4;
        }
    }
}
