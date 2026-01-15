using Blindsided.Utilities;
using GameData;
using IdleDysonSwarm.Services;
using Systems.Facilities;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Buildings
{
    /// <summary>
    /// Presenter for mega-structure facilities that are purchased with other facilities.
    /// Unlike regular buildings that cost money, mega-structures consume lower-tier facilities.
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
                _purchaseButton.onClick.AddListener(PurchaseMegaStructure);
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
            // Use CanvasGroup or scale to hide instead of SetActive
            // This allows Update() to keep running so we can detect unlock
            Transform container = transform.Find("Container");
            if (container != null)
            {
                container.gameObject.SetActive(isUnlocked);
            }

            // Also control LayoutElement to collapse space when hidden
            var layoutElement = GetComponent<UnityEngine.UI.LayoutElement>();
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
                _amountToBuyText.text = $"+{numberToBuy}";
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

        private string CostFacilityName
        {
            get
            {
                string costFacilityId = _megaStructureService.GetCostFacilityId(FacilityId);
                if (string.IsNullOrEmpty(costFacilityId)) return "";

                if (_dataService.TryGetFacility(costFacilityId, out FacilityDefinition costDef))
                    return costDef.displayName;

                return costFacilityId switch
                {
                    "planets" => "Planets",
                    "matrioshka_brains" => "Matrioshka Brains",
                    "birch_planets" => "Birch Planets",
                    _ => costFacilityId
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
                if (string.IsNullOrEmpty(id))
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
                double primaryCost = _megaStructureService.GetCost(facilityId, NumberToBuy());

                string costStr = $"{CalcUtils.FormatNumber(primaryCost)} {AbbreviatedCostName}";

                // Add secondary cost for Galactic Brain
                if (megaStructureType == MegaStructureType.GalacticBrains)
                {
                    double secondaryCost = _megaStructureService.GetSecondaryCost(facilityId, NumberToBuy());
                    if (secondaryCost > 0)
                    {
                        costStr += $"\n{CalcUtils.FormatNumber(secondaryCost)} BiPl";
                    }
                }

                return costStr;
            }
        }

        private string AbbreviatedCostName
        {
            get
            {
                return megaStructureType switch
                {
                    MegaStructureType.MatrioshkaBrains => "Pl",
                    MegaStructureType.BirchPlanets => "MaBr",
                    MegaStructureType.GalacticBrains => "MaBr",
                    _ => "Units"
                };
            }
        }

        #endregion

        #region Purchase Calculation

        private int NumberToBuy()
        {
            int maxAffordable = _megaStructureService.MaxAffordable(FacilityId);

            return StaticBuyMode switch
            {
                BuyMode.Buy1 => 1,
                BuyMode.Buy10 => StaticRoundedBulkBuy
                    ? 10 - (int)ManuallyPurchased % 10
                    : 10,
                BuyMode.Buy50 => StaticRoundedBulkBuy
                    ? 50 - (int)ManuallyPurchased % 50
                    : 50,
                BuyMode.Buy100 => StaticRoundedBulkBuy
                    ? 100 - (int)ManuallyPurchased % 100
                    : 100,
                BuyMode.BuyMax => maxAffordable > 0 ? maxAffordable : 1,
                _ => 1
            };
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
