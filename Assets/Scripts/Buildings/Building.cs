using System;
using UnityEngine;
using Blindsided.Utilities;
using TMPro;
using UnityEngine.UI;
using Systems.Debugging;
using Systems.Numeric;
using Systems.Simulation;
using static Blindsided.Utilities.CalcUtils;
using static Expansion.Oracle;

namespace Buildings
{
    public class Building : MonoBehaviour
    {
        [SerializeField, HideInInspector] protected double baseCost;
        [SerializeField, HideInInspector] protected double exponent = 1;
        [SerializeField, HideInInspector] protected string wordUsed;
        [SerializeField, HideInInspector] protected string productionWordUsed;
        [SerializeField] private BuildingReferences buildingReferences;
        [SerializeField, HideInInspector] private TMP_Text buildingText;
        [SerializeField, HideInInspector] private TMP_Text productionText;
        [SerializeField, HideInInspector] private TMP_Text buttonCostText;
        [SerializeField, HideInInspector] private TMP_Text amountToBuyText;
        [SerializeField, HideInInspector] private Button purchaseButton;
        public BuildingReferences UiReferences
        {
            get => buildingReferences;
            set => ApplyBuildingReferences(value);
        }
        protected virtual double BaseCost => baseCost;
        protected virtual double CostExponent => exponent;
        public virtual double ModifiedBaseCost => BaseCost;
        public virtual double
            ManuallyPurchasedBuildings { get => throw new NotImplementedException(); set => throw new NotImplementedException(); } //{ get => StaticInfinityData.managers[1]; set => StaticInfinityData.managers[1] = value; }
        public virtual double
            AutoPurchasedBuildings { get => throw new NotImplementedException(); set => throw new NotImplementedException(); } //{ get => StaticInfinityData.managers[0]; set => StaticInfinityData.managers[0] = value; }
        public double TotalBuildings => ManuallyPurchasedBuildings + AutoPurchasedBuildings;
        public virtual double Production => throw new NotImplementedException();


        public virtual double CurrentLevel => throw new NotImplementedException(); //StaticPrestigeData.infinityAiManagers ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public virtual string OwnedText => throw new NotImplementedException();
        public virtual string ProductioinText => throw new NotImplementedException();
        public virtual bool AutoBuy => throw new NotImplementedException();
        public bool DoAutoBuy => AutoBuy && Affordable() > 0;

        public long Affordable() => MaxAffordableLong(Money, ModifiedBaseCost, CostExponent, CurrentLevel);

        public double Cost() => BuyXCost(NumberToBuy(), ModifiedBaseCost, CostExponent, CurrentLevel);
        public double BuyMaxCost() => BuyXCost(Affordable(), ModifiedBaseCost, CostExponent, CurrentLevel);


        protected virtual void Awake()
        {
            ApplySerializedReferences();
        }

        private void Start()
        {
            if (purchaseButton != null)
            {
                purchaseButton.onClick.AddListener(
                    RequestPurchaseBuilding);
            }
        }
        public void Update()
        {
            UpdateCostText();
            if (purchaseButton != null)
            {
                purchaseButton.interactable = Cost() <= Money && NumberToBuy() > 0 && !AutoBuy;
            }
            SetProductionSec();
        }

        public void PurchaseBuilding()
        {
            long quantity = NumberToBuy();
            if (quantity <= 0) return;

            double currentOwned = ManuallyPurchasedBuildings;
            NumericResult<double> ownership = NumericSafety.Add(currentOwned, quantity);
            if (!ownership.IsSuccess || ownership.Value <= currentOwned) return;

            DebitResult debit = EconomyTransaction.TryDebit(Money, Cost(), quantity);
            if (!debit.Succeeded)
            {
                ReportUnexpectedTransactionFailure(debit.Status);
                return;
            }

            Money = debit.Balance;
            ManuallyPurchasedBuildings = ownership.Value;
            UpdateCostText();
        }

        private void RequestPurchaseBuilding()
        {
            if (!GameManager.RequestQueuedPlayerAction(
                    SimulationInputKind.Purchase,
                    PurchaseBuilding,
                    $"facility:{wordUsed}"))
            {
                PurchaseBuilding();
            }
        }
        public void AutoPurchase(bool updatePresentation = true)
        {
            long quantity = NumberToBuy();
            if (quantity <= 0) return;

            double currentOwned = ManuallyPurchasedBuildings;
            NumericResult<double> ownership = NumericSafety.Add(currentOwned, quantity);
            if (!ownership.IsSuccess || ownership.Value <= currentOwned) return;

            DebitResult debit = EconomyTransaction.TryDebit(Money, Cost(), quantity);
            if (!debit.Succeeded)
            {
                ReportUnexpectedTransactionFailure(debit.Status);
                return;
            }

            Money = debit.Balance;
            ManuallyPurchasedBuildings = ownership.Value;
            if (updatePresentation) UpdateCostText();
        }

        private static void ReportUnexpectedTransactionFailure(TransactionStatus status)
        {
            if (status == TransactionStatus.InsufficientFunds ||
                status == TransactionStatus.InvalidQuantity ||
                status == TransactionStatus.Maxed)
            {
                return;
            }

            NumericDiagnostics.Report("NS-TRANSACTION-FACILITY", $"status={status}");
        }

        private void SetProductionSec()
        {
            if (productionText != null)
            {
                productionText.text = ProductioinText;
            }
        }


        public long NumberToBuy()
        {
            long owned = NumericSafety.ToLongFloor(ManuallyPurchasedBuildings).Value;
            return BuyModeHelper.GetAmountToBuy(
                StaticBuyMode, StaticRoundedBulkBuy,
                owned, Affordable());
        }

        public void UpdateCostText()
        {
            if (amountToBuyText != null)
            {
                amountToBuyText.text = $"{(AutoBuy ? "Auto" : $"+{NumberToBuy()}")}";
            }

            if (buttonCostText != null)
            {
                buttonCostText.text = $"${FormatNumber(Cost())}";
            }

            if (buildingText != null)
            {
                buildingText.text = OwnedText;
            }
        }

        public void ApplyBuildingReferences(BuildingReferences references)
        {
            if (references == null) return;
            buildingReferences = references;
            buildingText = references.building;
            productionText = references.production;
            buttonCostText = references.buttonCost;
            amountToBuyText = references.amountToBuy;
            purchaseButton = references.purchaseButton;
        }

        private void ApplySerializedReferences()
        {
            if (buildingReferences != null)
            {
                ApplyBuildingReferences(buildingReferences);
                return;
            }

            TryApplyBuildingReferences();
        }

        private void TryApplyBuildingReferences()
        {
            if (HasUiReferences())
            {
                return;
            }

            BuildingReferences references = GetComponent<BuildingReferences>();
            if (references == null)
            {
                return;
            }

            ApplyBuildingReferences(references);
        }

        private bool HasUiReferences()
        {
            return buildingText != null && productionText != null && buttonCostText != null &&
                   amountToBuyText != null && purchaseButton != null;
        }
    }
}
