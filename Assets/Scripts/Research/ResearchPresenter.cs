using System;
using Blindsided.Utilities;
using Buildings;
using Expansion;
using GameData;
using IdleDysonSwarm.Services;
using Systems.Facilities;
using Systems.Debugging;
using Systems.Numeric;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif
using static Blindsided.Utilities.CalcUtils;

/*
 * ResearchPresenter
 * Purpose: Binds a research definition to one UI card and handles visibility, affordability, purchase, and text updates.
 * Runs: Runtime (with editor OnValidate helper for authoring).
 * Primary entry points: Awake(), OnEnable(), Update(), PurchaseResearch().
 * Owns vs delegates: Owns per-card UI behavior; delegates save/state persistence to IGameStateService and ID mapping
 * to ResearchIdMap.
 *
 * Interacts with:
 * - Assets/Scripts/Buildings/BuildingReferences.cs
 * - Assets/Scripts/Services/IGameStateService.cs
 * - Assets/Scripts/Data/ResearchIdMap.cs
 * - Assets/Scripts/Expansion/Oracle.cs
 *
 * Change notes:
 * - Building reference name mapping in GetBuildingReferenceName() must stay in sync with card names in Game.unity.
 * - Purchase listener binding is now idempotent and can bind after delayed reference resolution; avoid manual duplicate
 * listener registration elsewhere.
 * - Runtime state-dependent UI updates are intentionally deferred until Oracle save state is ready to prevent
 * pre-load startup null faults.
 */
namespace Research
{
    /// <summary>
    /// Purpose (runtime): Drives a single research card's visibility, pricing, affordability, text, and purchase flow.
    /// Primary entry points: Unity <c>Awake</c>, <c>OnEnable</c>, <c>Update</c>, plus purchase button callback.
    /// Owns vs delegates: Owns card state presentation and purchase execution; delegates save/game-state reads to
    /// <see cref="IGameStateService"/> and research definition lookup to the data registry.
    /// Interacts with: <see cref="BuildingReferences"/>, <see cref="Oracle"/>, <see cref="ResearchIdMap"/>,
    /// and scene UI button events.
    /// Change notes: ID mappings and building reference names must remain aligned with scene card object names.
    /// </summary>
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
        private bool _isPurchaseListenerBound;

        private double BaseCostValue => _resolvedDefinition != null ? _resolvedDefinition.baseCost : DefaultBaseCost;

        private double ExponentValue => _resolvedDefinition != null ? _resolvedDefinition.exponent : DefaultExponent;

        private string DisplayName =>
            _resolvedDefinition != null && !string.IsNullOrEmpty(_resolvedDefinition.displayName)
                ? _resolvedDefinition.displayName
                : ResolvedResearchId;

        private double BaseCostCalculated => _gameState.SkillTreeData.repeatableResearch
            ? GetRepeatableBaseCost()
            : BaseCostValue;

        private int MaxLevel => _resolvedDefinition != null ? _resolvedDefinition.maxLevel : -1;

        private bool IsMaxed => MaxLevel >= 0 && CurrentLevel >= MaxLevel;

        private bool PrerequisitesMet => _resolvedDefinition == null || HasMetPrerequisites();

        /// <summary>
        /// Determines whether save-backed runtime state is available for prerequisite and cost logic.
        /// </summary>
        /// <returns>True when settings and infinity data are available.</returns>
        private bool IsRuntimeStateReady()
        {
            return _gameState != null && _gameState.SaveSettings != null && _gameState.InfinityData != null;
        }

        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();

            ResolveDefinition();
            if (buildingReferences == null)
            {
                buildingReferences = GetComponent<BuildingReferences>();
            }
            ResolveBuildingReferences();
            TryBindPurchaseButton();
        }

        private void OnEnable()
        {
            ResolveDefinition();
            ResolveBuildingReferences();
            TryBindPurchaseButton();
            if (!IsRuntimeStateReady())
            {
                return;
            }

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

            TryBindPurchaseButton();
            if (buildingReferences == null) return;
            if (!IsRuntimeStateReady()) return;

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

        private string PerLevelSuffix
        {
            get
            {
                if (Percent <= 0) return string.Empty;
                return $" ({Oracle.textColourBlue}{FormatNumber(Percent * 100)}</color>% per level)";
            }
        }

        private double NextBoostPercent
        {
            get
            {
                if (Percent <= 0) return 0;
                double nextLevel = CurrentLevel + Math.Max(0, NumberToBuy());
                return nextLevel * Percent * 100;
            }
        }

        public string ProductionText
        {
            get
            {
                if (CurrentLevel <= 0)
                {
                    return $"Purchase for a boost!{PerLevelSuffix}";
                }

                if (NumberToBuy() > 0 && NextBoostPercent > 0)
                {
                    return $"Boosting by {Oracle.textColourBlue}{FormatNumber(BoostPercent)}%</color> " +
                           $"-> {Oracle.textColourBlue}{FormatNumber(NextBoostPercent)}%</color>";
                }

                return $"Boosting by {Oracle.textColourBlue}{FormatNumber(BoostPercent)}%</color>";
            }
        }

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
                    ResearchAutoBuyGroup.MatrioshkaBrains => saveSettings.infinityAutoResearchToggleMatrioshkaBrains,
                    ResearchAutoBuyGroup.BirchPlanets => saveSettings.infinityAutoResearchToggleBirchPlanets,
                    ResearchAutoBuyGroup.GalacticBrains => saveSettings.infinityAutoResearchToggleGalacticBrains,
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
            return CostForAmount(affordable, BaseCostCalculated);
        }

        public bool TryAutoPurchase()
        {
            if (!CanAutoBuy) return false;

            long quantity = NumberToBuy();
            if (quantity <= 0) return false;

            double previousLevel = CurrentLevel;
            NumericResult<double> nextLevel = NumericSafety.Add(previousLevel, quantity);
            if (!nextLevel.IsSuccess || nextLevel.Value <= previousLevel) return false;

            DebitResult debit = EconomyTransaction.TryDebit(_gameState.Science, Cost(), quantity);
            if (!debit.Succeeded)
            {
                ReportUnexpectedTransactionFailure(debit.Status);
                return false;
            }

            _gameState.Science = debit.Balance;
            CurrentLevel = nextLevel.Value;
            HandlePostPurchase(previousLevel, CurrentLevel);
            UpdateCostText();
            return true;
        }

        private void PurchaseResearch()
        {
            if (!PrerequisitesMet || IsMaxed) return;

            long numberToBuy = NumberToBuy();
            if (numberToBuy <= 0) return;

            double previousLevel = CurrentLevel;
            NumericResult<double> nextLevel = NumericSafety.Add(previousLevel, numberToBuy);
            if (!nextLevel.IsSuccess || nextLevel.Value <= previousLevel) return;

            DebitResult debit = EconomyTransaction.TryDebit(_gameState.Science, Cost(), numberToBuy);
            if (!debit.Succeeded)
            {
                ReportUnexpectedTransactionFailure(debit.Status);
                return;
            }

            _gameState.Science = debit.Balance;
            CurrentLevel = nextLevel.Value;
            HandlePostPurchase(previousLevel, CurrentLevel);
            UpdateCostText();
        }

        private static void ReportUnexpectedTransactionFailure(TransactionStatus status)
        {
            if (status == TransactionStatus.InsufficientFunds ||
                status == TransactionStatus.InvalidQuantity ||
                status == TransactionStatus.Maxed)
            {
                return;
            }

            NumericDiagnostics.Report("NS-TRANSACTION-RESEARCH", $"status={status}");
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
            if (!IsRuntimeStateReady()) return;

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

            long owned = NumericSafety.ToLongFloor(CurrentLevel).Value;
            long amount = BuyModeHelper.GetAmountToBuy(
                _gameState.ResearchBuyMode, _gameState.RoundedBulkBuy,
                owned, Affordable());
            return ClampToRemaining(amount);
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

        private double GetRepeatableBaseCost()
        {
            if (BaseCostValue <= 0) return BaseCostValue;
            double boostPercent = BoostPercent;
            if (boostPercent <= 0) return BaseCostValue;

            double divisor = 1d + (boostPercent / 100d);
            return divisor > 0 ? BaseCostValue / divisor : BaseCostValue;
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
                    _isPurchaseListenerBound = false;
                    break;
                }
            }
        }

        private void TryBindPurchaseButton()
        {
            if (_isPurchaseListenerBound || buildingReferences == null || buildingReferences.purchaseButton == null)
            {
                return;
            }

            buildingReferences.purchaseButton.onClick.AddListener(PurchaseResearch);
            _isPurchaseListenerBound = true;
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
                return NumericSafety.ToLongFloor(currencyOwned / costBase).Value;
            }

            return MaxAffordableLong(currencyOwned, costBase, ExponentValue, CurrentLevel);
        }

        private double CostForAmount(double amount, double costBase)
        {
            if (amount <= 0 || costBase <= 0) return 0;
            if (IsLinearExponent)
            {
                return NumericSafety.Multiply(costBase, amount).Value;
            }

            return BuyXCost(amount, costBase, ExponentValue, CurrentLevel);
        }

        private bool HasMetPrerequisites()
        {
            if (!IsRuntimeStateReady())
            {
                return false;
            }

            if (_resolvedDefinition == null)
            {
                return true;
            }

            if (_resolvedDefinition.prerequisiteResearchIds != null)
            {
                foreach (string prerequisite in _resolvedDefinition.prerequisiteResearchIds)
                {
                    if (string.IsNullOrEmpty(prerequisite)) continue;
                    if (_gameState.GetResearchLevel(prerequisite) <= 0)
                    {
                        return false;
                    }
                }
            }

            if (!string.IsNullOrEmpty(_resolvedDefinition.prerequisiteFacilityId))
            {
                if (!FacilityCountAccessor.TryGetCount(_gameState.InfinityData, _resolvedDefinition.prerequisiteFacilityId,
                        out double[] counts) || counts == null || counts.Length < 2)
                {
                    return false;
                }

                double requiredOwned = _resolvedDefinition.prerequisiteFacilityOwned > 0
                    ? _resolvedDefinition.prerequisiteFacilityOwned
                    : 1;
                if (counts[0] + counts[1] < requiredOwned)
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
            if (infinityData == null) return 0;
            return researchId switch
            {
                ResearchIdMap.MoneyMultiplier => infinityData.moneyMultiUpgradePercent,
                ResearchIdMap.ScienceBoost => infinityData.scienceBoostPercent,
                ResearchIdMap.AssemblyLineUpgrade => infinityData.assemblyLineUpgradePercent,
                ResearchIdMap.AiManagerUpgrade => infinityData.aiManagerUpgradePercent,
                ResearchIdMap.ServerUpgrade => infinityData.serverUpgradePercent,
                ResearchIdMap.DataCenterUpgrade => infinityData.dataCenterUpgradePercent,
                ResearchIdMap.PlanetUpgrade => infinityData.planetUpgradePercent,
                ResearchIdMap.MatrioshkaBrainsUpgrade => infinityData.matrioshkaUpgradePercent,
                ResearchIdMap.BirchPlanetsUpgrade => infinityData.birchUpgradePercent,
                ResearchIdMap.GalacticBrainsUpgrade => infinityData.galacticUpgradePercent,
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
                case ResearchIdMap.MatrioshkaBrainsUpgrade:
                    return ResearchAutoBuyGroup.MatrioshkaBrains;
                case ResearchIdMap.BirchPlanetsUpgrade:
                    return ResearchAutoBuyGroup.BirchPlanets;
                case ResearchIdMap.GalacticBrainsUpgrade:
                    return ResearchAutoBuyGroup.GalacticBrains;
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
                case ResearchIdMap.MatrioshkaBrainsUpgrade:
                    return "Research_MatrioshkaMulti";
                case ResearchIdMap.BirchPlanetsUpgrade:
                    return "Research_BirchMulti";
                case ResearchIdMap.GalacticBrainsUpgrade:
                    return "Research_GalacticMulti";
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
