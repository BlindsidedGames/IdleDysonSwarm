using System;
using UnityEngine;
using static Blindsided.Utilities.CalcUtils;
using static Expansion.Oracle;

namespace Buildings
{
    public class Building : MonoBehaviour
    {
        public double baseCost;
        public virtual double ModifiedBaseCost => baseCost;
        public double exponent;
        public string wordUsed;
        public string productionWordUsed;
        public BuildingReferences buildingReferences;
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

        public long Affordable() => MaxAffordable(Money, ModifiedBaseCost, exponent, CurrentLevel);

        public double Cost() => BuyXCost(NumberToBuy(), ModifiedBaseCost, exponent, CurrentLevel);
        public double BuyMaxCost() => BuyXCost(Affordable(), ModifiedBaseCost, exponent, CurrentLevel);


        public void Start()
        {
            buildingReferences.purchaseButton.onClick.AddListener(PurchaseBuilding);
        }
        public void Update()
        {
            UpdateCostText();
            buildingReferences.purchaseButton.interactable = Cost() <= Money && NumberToBuy() > 0 && !AutoBuy;
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
            buildingReferences.production.text = ProductioinText;
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
            buildingReferences.amountToBuy.text = $"{(AutoBuy ? "Auto" : $"+{NumberToBuy()}")}";
            buildingReferences.buttonCost.text = $"${FormatNumber(Cost())}";
            buildingReferences.building.text = OwnedText;
        }
    }
}