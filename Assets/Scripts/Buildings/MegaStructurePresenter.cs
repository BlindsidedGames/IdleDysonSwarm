using Blindsided.Utilities;
using GameData;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Services;
using IdleDysonSwarm.Systems.Balance;
using Systems.Facilities;
using Systems.Numeric;
using Systems.Simulation;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Buildings
{
    /// <summary>
    /// Presenter for mega-structure facilities that are purchased with cash.
    /// Unlock visibility remains gated by quantum unlock flags and facility progression prerequisites.
    /// </summary>
    public class MegaStructurePresenter : MonoBehaviour
    {
        public enum MegaStructureType
        {
            Unknown = 0,
            MatrioshkaBrains,
            BirchPlanets,
            GalacticBrains
        }

        [SerializeField] private MegaStructureType megaStructureType = MegaStructureType.Unknown;
        [SerializeField] private BuildingReferences buildingReferences;
        [SerializeField] private GameObject lockedOverlay;
        [SerializeField] private Button breakdownButton;
        [SerializeField] private FacilityBreakdownPopup breakdownPopup;

        private TMP_Text _buildingText;
        private TMP_Text _productionText;
        private TMP_Text _buttonCostText;
        private TMP_Text _amountToBuyText;
        private Button _purchaseButton;

        private IGameStateService _gameState;
        private IFacilityService _facilityService;
        private IGameDataService _dataService;
        private IMegaStructureService _megaStructureService;
        private FacilityDefinition _cachedDefinition;

        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();
            _facilityService = ServiceLocator.Get<IFacilityService>();
            _dataService = ServiceLocator.Get<IGameDataService>();
            _megaStructureService = ServiceLocator.Get<IMegaStructureService>();

            ApplyBuildingReferences(buildingReferences);
        }

        private void Start()
        {
            if (_purchaseButton != null)
            {
                _purchaseButton.onClick.AddListener(
                    RequestMegaStructurePurchase);
            }

            if (breakdownButton != null)
            {
                breakdownButton.onClick.AddListener(ShowBreakdown);
            }
        }

        private void Update()
        {
            bool isUnlocked = _megaStructureService.IsUnlocked(FacilityId);
            UpdateVisibility(isUnlocked);

            if (!isUnlocked) return;

            UpdateUI();
        }

        private void UpdateVisibility(bool isUnlocked)
        {
            // Use buildingReferences GameObject for visibility control
            // This allows Update() to keep running so we can detect unlock
            if (buildingReferences != null)
            {
                buildingReferences.gameObject.SetActive(isUnlocked);
            }

            // Also control LayoutElement to collapse space when hidden
            var layoutElement = GetComponent<LayoutElement>();
            if (layoutElement != null)
            {
                layoutElement.ignoreLayout = !isUnlocked;
            }

            // Show/hide locked overlay (optional additional indicator)
            if (lockedOverlay != null)
            {
                lockedOverlay.SetActive(!isUnlocked);
            }
        }

        private void UpdateUI()
        {
            string facilityId = FacilityId;
            if (string.IsNullOrEmpty(facilityId)) return;

            int numberToBuy = NumberToBuy();
            bool canAfford = _megaStructureService.CanAfford(facilityId, numberToBuy);

            // Update button interactability
            if (_purchaseButton != null)
            {
                _purchaseButton.interactable = canAfford && numberToBuy > 0;
            }

            // Update owned text
            if (_buildingText != null)
            {
                _buildingText.text = OwnedText;
            }

            // Update production text
            if (_productionText != null)
            {
                _productionText.text = ProductionText;
            }

            // Update cost text
            if (_buttonCostText != null)
            {
                _buttonCostText.text = CostText;
            }

            // Update amount to buy text
            if (_amountToBuyText != null)
            {
                _amountToBuyText.text = IsMegaAutoEnabled() ? "Auto" : $"+{numberToBuy}";
            }
        }

        private void PurchaseMegaStructure()
        {
            string facilityId = FacilityId;
            int numberToBuy = NumberToBuy();

            Debug.Log($"[MegaStructurePresenter] Attempting to purchase {numberToBuy} {facilityId}");

            if (_megaStructureService.TryPurchase(facilityId, numberToBuy))
            {
                Debug.Log($"[MegaStructurePresenter] Purchase successful");
                UpdateUI();
            }
            else
            {
                Debug.Log($"[MegaStructurePresenter] Purchase failed");
            }
        }

        private void RequestMegaStructurePurchase()
        {
            if (!GameManager.RequestQueuedPlayerAction(
                    SimulationInputKind.Purchase,
                    PurchaseMegaStructure,
                    $"mega:{FacilityId}"))
            {
                PurchaseMegaStructure();
            }
        }

        public void ShowBreakdown()
        {
            if (breakdownPopup == null)
                breakdownPopup = FacilityBreakdownPopup.Instance;

            if (breakdownPopup == null)
                breakdownPopup = Object.FindFirstObjectByType<FacilityBreakdownPopup>();

            if (breakdownPopup != null)
            {
                breakdownPopup.ShowFacility(FacilityId);
            }
        }

        #region Properties

        public string FacilityId => megaStructureType switch
        {
            MegaStructureType.MatrioshkaBrains => "matrioshka_brains",
            MegaStructureType.BirchPlanets => "birch_planets",
            MegaStructureType.GalacticBrains => "galactic_brains",
            _ => null
        };

        private double TotalOwned
        {
            get
            {
                double[] counts = _facilityService.GetFacilityCount(FacilityId);
                return counts[0] + counts[1];
            }
        }

        private double ManuallyPurchased
        {
            get
            {
                double[] counts = _facilityService.GetFacilityCount(FacilityId);
                return counts[1];
            }
        }

        private double Production
        {
            get
            {
                var infinityData = _gameState.InfinityData;
                return megaStructureType switch
                {
                    MegaStructureType.MatrioshkaBrains => infinityData.matrioshkaBrainPlanetProduction,
                    MegaStructureType.BirchPlanets => infinityData.birchPlanetMatrioshkaProduction,
                    MegaStructureType.GalacticBrains => infinityData.galacticBrainBirchProduction,
                    _ => 0
                };
            }
        }

        private string DisplayName
        {
            get
            {
                if (Definition != null && !string.IsNullOrEmpty(Definition.displayName))
                    return Definition.displayName;

                return megaStructureType switch
                {
                    MegaStructureType.MatrioshkaBrains => "Matrioshka Brains",
                    MegaStructureType.BirchPlanets => "Birch Planets",
                    MegaStructureType.GalacticBrains => "Galactic Brains",
                    _ => "Mega-Structure"
                };
            }
        }

        private string ProducesName
        {
            get
            {
                return megaStructureType switch
                {
                    MegaStructureType.MatrioshkaBrains => "Planet",
                    MegaStructureType.BirchPlanets => "Matrioshka Brain",
                    MegaStructureType.GalacticBrains => "Birch Planet",
                    _ => "Unit"
                };
            }
        }

        private FacilityDefinition Definition
        {
            get
            {
                if (_cachedDefinition != null)
                    return _cachedDefinition;

                string id = FacilityId;
                if (string.IsNullOrEmpty(id) ||
                    _dataService == null)
                    return null;

                if (_dataService.TryGetFacility(id, out FacilityDefinition definition))
                    _cachedDefinition = definition;

                return _cachedDefinition;
            }
        }

        #endregion

        #region UI Text Formatting

        private string OwnedText =>
            $"{DisplayName} {textColourOrange}{CalcUtils.FormatNumber(TotalOwned)}<size=70%>{textColourGreen}({CalcUtils.FormatNumber(ManuallyPurchased)})";

        private string ProductionText
        {
            get
            {
                if (Production <= 0)
                    return $"Purchase a {DisplayName}";

                if (Production >= 1)
                    return $"Producing {textColourOrange}{CalcUtils.FormatNumber(Production)}</color> {ProducesName}s /s";

                double secondsPer = 1 / Production;
                if (secondsPer < 60)
                    return $"1 {ProducesName} /{textColourOrange}{CalcUtils.FormatNumber(secondsPer)}</color>s";

                return $"1 {ProducesName} /{textColourOrange}{CalcUtils.FormatNumber(secondsPer / 60)}</color> Min";
            }
        }

        private string CostText
        {
            get
            {
                string facilityId = FacilityId;
                double cashCost = _megaStructureService.GetCost(facilityId, NumberToBuy());
                return $"${CalcUtils.FormatNumber(cashCost)}";
            }
        }

        /// <summary>
        /// Attempts an automated purchase using the current buy mode quantity.
        /// </summary>
        public void AutoPurchase()
        {
            string facilityId = FacilityId;
            int numberToBuy = NumberToBuy();
            if (string.IsNullOrEmpty(facilityId) || numberToBuy <= 0)
            {
                return;
            }

            _megaStructureService.TryPurchase(facilityId, numberToBuy);
        }

        public bool TryCreateAutomationRule(
            bool toggleEnabled,
            out DysonFacilityAutomationRule rule)
        {
            string facilityId = FacilityId;
            FacilityDefinition definition = Definition;
            if (string.IsNullOrEmpty(facilityId) ||
                definition == null)
            {
                rule = default;
                return false;
            }

            bool enabled = isActiveAndEnabled &&
                           _gameState != null &&
                           _gameState.PrestigeData != null &&
                           _gameState.PrestigeData.infinityAutoBots &&
                           toggleEnabled;
            rule = new DysonFacilityAutomationRule(
                facilityId,
                definition.baseCost,
                definition.costExponent,
                enabled,
                _megaStructureService != null &&
                _megaStructureService.IsUnlocked(facilityId),
                subtractRetainedTen: false,
                useAssemblyMegaDiscount: false,
                maximumQuantity: int.MaxValue);
            return true;
        }

        public bool TryAutomationPurchase(
            bool toggleEnabled,
            SimulationAutomationPolicy policy)
        {
            return TryCreateAutomationRule(
                       toggleEnabled,
                       out var rule) &&
                   DysonAutomationTransactions.TryPurchaseFacility(
                       _gameState.SaveSettings,
                       rule,
                       policy,
                       out _);
        }

        /// <summary>
        /// Gets the quantity this presenter would purchase for the current buy mode.
        /// </summary>
        /// <returns>Quantity to buy for automation checks.</returns>
        public int GetAutoPurchaseAmount()
        {
            return NumberToBuy();
        }

        public bool WouldOfflineAutoPurchase(
            DysonAnalyticalState state,
            bool toggleEnabled)
        {
            if (!toggleEnabled ||
                !isActiveAndEnabled ||
                _gameState == null ||
                _gameState.PrestigeData == null ||
                !_gameState.PrestigeData.infinityAutoBots ||
                Definition == null ||
                !IsPredictedUnlocked(state))
            {
                return false;
            }

            double manualOwned = ManuallyPurchased;
            NumericResult<double> next =
                NumericSafety.Add(manualOwned, 1d);
            if (!next.IsSuccess || next.Value <= manualOwned)
                return false;

            double nextCost = CalcUtils.BuyXCost(
                1,
                Definition.baseCost,
                Definition.costExponent,
                manualOwned);
            return NumericSafety.IsFinite(nextCost) &&
                   nextCost > 0d &&
                   state.Money >= nextCost;
        }

        #endregion

        #region Purchase Calculation

        private int NumberToBuy()
        {
            int maxAffordable = _megaStructureService.MaxAffordable(FacilityId);
            long owned = NumericSafety.ToLongFloor(ManuallyPurchased).Value;
            return (int)BuyModeHelper.GetAmountToBuy(
                StaticBuyMode, StaticRoundedBulkBuy,
                owned, maxAffordable);
        }

        private bool IsMegaAutoEnabled()
        {
            if (StaticPrestigeData == null || !StaticPrestigeData.infinityAutoBots || StaticSaveSettings == null)
            {
                return false;
            }

            return FacilityId switch
            {
                "matrioshka_brains" => StaticSaveSettings.infinityAutoMatrioshkaBrains,
                "birch_planets" => StaticSaveSettings.infinityAutoBirchPlanets,
                "galactic_brains" => StaticSaveSettings.infinityAutoGalacticBrains,
                _ => false
            };
        }

        private bool IsPredictedUnlocked(DysonAnalyticalState state)
        {
            string facilityId = FacilityId;
            QuantumMegaUnlockGate gate;
            string prerequisiteId;
            double prerequisiteOwned;
            if (BalanceRuntime.TryGetFacilityEntry(facilityId, out var entry))
            {
                gate = entry.quantumGate;
                prerequisiteId = entry.prerequisiteFacilityId;
                prerequisiteOwned = entry.prerequisiteOwned;
            }
            else
            {
                gate = facilityId switch
                {
                    "matrioshka_brains" => QuantumMegaUnlockGate.MatrioshkaBrains,
                    "birch_planets" => QuantumMegaUnlockGate.BirchPlanets,
                    "galactic_brains" => QuantumMegaUnlockGate.GalacticBrains,
                    _ => QuantumMegaUnlockGate.None
                };
                prerequisiteId = facilityId switch
                {
                    "matrioshka_brains" => "planets",
                    "birch_planets" => "matrioshka_brains",
                    "galactic_brains" => "birch_planets",
                    _ => null
                };
                prerequisiteOwned = string.IsNullOrEmpty(prerequisiteId) ? 0d : 1d;
            }

            if (!BalanceRuntime.IsQuantumGateUnlocked(
                    gate,
                    _gameState.PrestigeData))
            {
                return false;
            }

            if (string.IsNullOrEmpty(prerequisiteId))
                return true;
            return PredictedTotal(prerequisiteId, state) >= prerequisiteOwned;
        }

        private double PredictedTotal(
            string facilityId,
            DysonAnalyticalState state)
        {
            double predictedAuto = facilityId switch
            {
                "planets" => state.Planets,
                "matrioshka_brains" => state.MatrioshkaBrains,
                "birch_planets" => state.BirchPlanets,
                "galactic_brains" => state.GalacticBrains,
                _ => 0d
            };
            double[] current = _facilityService.GetFacilityCount(facilityId);
            double manual = current is { Length: >= 2 } ? current[1] : 0d;
            return NumericSafety.Add(predictedAuto, manual).Value;
        }

        #endregion

        #region UI References

        public void ApplyBuildingReferences(BuildingReferences references)
        {
            if (references == null) return;
            buildingReferences = references;
            _buildingText = references.building;
            _productionText = references.production;
            _buttonCostText = references.buttonCost;
            _amountToBuyText = references.amountToBuy;
            _purchaseButton = references.purchaseButton;
        }

        #endregion
    }
}
