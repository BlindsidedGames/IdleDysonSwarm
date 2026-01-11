using System;
using Buildings;
using UnityEngine;
using GameData;
using static Blindsided.Utilities.CalcUtils;
using static Expansion.Oracle;

namespace Research
{
    public class Research : MonoBehaviour
    {
        public double baseCost;
        public double BaseCostClculated => StaticSkillTreeData.repeatableResearch ? baseCost > 0 ? baseCost : 1 / (1 + CurrentLevel * (BoostPercent > 0 ? BoostPercent : 1)) : baseCost;
        public double exponent;
        public string nameText;
        public BuildingReferences buildingReferences;
        private ResearchDefinition _definition;

        public string ResearchIdValue => ResearchId;

        public virtual double Percent => throw new NotImplementedException();
        public double BoostPercent => CurrentLevel * Percent * 100;
        public virtual bool AutoBuy => throw new NotImplementedException();
        public bool DoAutoBuy => AutoBuy && Affordable() > 0;

        protected virtual string ResearchId => string.Empty;

        public virtual double CurrentLevel {
            get => throw new NotImplementedException();
            set => throw new NotImplementedException();
        }

        public virtual string OwnedText => $"{nameText} boosts {textColourBlue}{FormatNumber(CurrentLevel)}</color>";

        public virtual string ProductioinText => CurrentLevel > 0
            ? $"Boosting by {textColourBlue}{FormatNumber(BoostPercent)}%</color>"
            : "Purchase for a boost!";

        public long Affordable() => MaxAffordable(Science, BaseCostClculated, exponent, CurrentLevel);
        public double Cost() => BuyXCost(NumberToBuy(), BaseCostClculated, exponent, CurrentLevel);
        public double BuyMaxCost() => BuyXCost(Affordable(), baseCost, exponent, CurrentLevel);


        public void Start()
        {
            ApplyDefinitionDefaults();
            buildingReferences.purchaseButton.onClick.AddListener(PurchaseBuilding);
        }
        public virtual void Update()
        {
            UpdateCostText();
            buildingReferences.purchaseButton.interactable = Cost() <= Science && NumberToBuy() > 0 && !AutoBuy;
            SetProductionSec();
        }

        public virtual void PurchaseBuilding()
        {
            if (Cost() <= Science)
            {
                long currentlyAffordable = NumberToBuy();
                Science -= Cost();
                CurrentLevel += currentlyAffordable;
                UpdateCostText();
            }
        }
        public void AutoPurchase()
        {
            if (BuyMaxCost() <= Science)
            {
                long currentlyAffordable = Affordable();
                Science -= BuyMaxCost();
                CurrentLevel += currentlyAffordable;
                UpdateCostText();
            }
        }

        public void SetProductionSec()
        {
            buildingReferences.production.text = ProductioinText;
        }


        public long NumberToBuy()
        {
            long number = 0;
            switch (StaticResearchBuyMode)
            {
                case BuyMode.Buy1:
                    number = 1;
                    break;
                case BuyMode.Buy10:
                {
                    number = StaticRoundedBulkBuy ? 10 - (int)CurrentLevel % 10 : 10;
                }
                    break;
                case BuyMode.Buy50:
                {
                    number = StaticRoundedBulkBuy ? 50 - (int)CurrentLevel % 50 : 50;
                }
                    break;
                case BuyMode.Buy100:
                {
                    number = StaticRoundedBulkBuy ? 100 - (int)CurrentLevel % 100 : 100;
                }
                    break;
                case BuyMode.BuyMax:
                    number = Affordable() > 0 ? Affordable() : 1;
                    break;
            }
            return number;
        }

        public virtual void UpdateCostText()
        {
            buildingReferences.amountToBuy.text = $"{(AutoBuy ? "Auto" : $"+{NumberToBuy()}")}";
            buildingReferences.buttonCost.text = $"<sprite=1>{FormatNumber(Cost())}";
            buildingReferences.building.text = OwnedText;
        }

        private void ApplyDefinitionDefaults()
        {
            if (!string.IsNullOrEmpty(ResearchId))
            {
                GameDataRegistry registry = GameDataRegistry.Instance;
                if (registry != null && registry.researchDatabase != null &&
                    registry.researchDatabase.TryGet(ResearchId, out ResearchDefinition definition))
                {
                    _definition = definition;
                }
            }

            if (_definition == null) return;

            if (_definition.baseCost > 0)
            {
                baseCost = _definition.baseCost;
            }

            if (_definition.exponent > 0)
            {
                exponent = _definition.exponent;
            }

            if (!string.IsNullOrEmpty(_definition.displayName))
            {
                nameText = _definition.displayName;
            }
        }
    }
}
