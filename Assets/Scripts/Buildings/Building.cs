using System;
using UnityEngine;
using Blindsided.Utilities;
using TMPro;
using UnityEngine.UI;
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

        public long Affordable() => MaxAffordable(Money, ModifiedBaseCost, CostExponent, CurrentLevel);

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
                purchaseButton.onClick.AddListener(PurchaseBuilding);
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
            if (Cost() <= Money)
            {
                long currentlyAffordable = NumberToBuy();
                Money -= Cost();
                ManuallyPurchasedBuildings += currentlyAffordable;
                UpdateCostText();
            }
        }
        public void AutoPurchase()
        {
            if (BuyMaxCost() <= Money)
            {
                long currentlyAffordable = Affordable();
                Money -= BuyMaxCost();
                ManuallyPurchasedBuildings += currentlyAffordable;
                UpdateCostText();
            }
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
            long number = 0;
            switch (StaticBuyMode)
            {
                case BuyMode.Buy1:
                    number = 1;
                    break;
                case BuyMode.Buy10:
                {
                    number = StaticRoundedBulkBuy ? 10 - (int)ManuallyPurchasedBuildings % 10 : 10;
                }
                    break;
                case BuyMode.Buy50:
                {
                    number = StaticRoundedBulkBuy ? 50 - (int)ManuallyPurchasedBuildings % 50 : 50;
                }
                    break;
                case BuyMode.Buy100:
                {
                    number = StaticRoundedBulkBuy ? 100 - (int)ManuallyPurchasedBuildings % 100 : 100;
                }
                    break;
                case BuyMode.BuyMax:
                    number = Affordable() > 0 ? Affordable() : 1;
                    break;
            }
            return number;
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
