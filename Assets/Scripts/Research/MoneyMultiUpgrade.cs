using GameData;
using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Research
{
    public class MoneyMultiUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.MoneyMultiplier;
        public override double Percent => StaticInfinityData.moneyMultiUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.MoneyMultiplier);
            set => SetResearchLevel(ResearchIdMap.MoneyMultiplier, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleMoney && StaticPrestigeData.infinityAutoResearch;

        public override string ProductioinText => StaticSkillTreeData.shouldersOfPrecursors
            ? "Disabled by Precursors"
            : CurrentLevel > 0
                ? $"Boosting by {textColourBlue}{FormatNumber(BoostPercent)}%</color>"
                : "Purchase for a boost!";

        public override void Update()
        {
            UpdateCostText();
            buildingReferences.purchaseButton.interactable = Cost() <= Science && NumberToBuy() > 0 && !StaticSkillTreeData.shouldersOfTheEnlightened && !StaticSkillTreeData.shouldersOfPrecursors && !AutoBuy;
            SetProductionSec();
        }

        public override void PurchaseBuilding()
        {
            if (StaticSkillTreeData.shouldersOfPrecursors) return;
            base.PurchaseBuilding();
        }

        public override void UpdateCostText()
        {
            buildingReferences.amountToBuy.text = $"{(AutoBuy ? "Auto" : $"+{NumberToBuy()}")}";
            buildingReferences.building.text = OwnedText;
            buildingReferences.buttonCost.text = StaticSkillTreeData.shouldersOfTheEnlightened || StaticSkillTreeData.shouldersOfPrecursors ? "Disabled" : $"<sprite=1>{FormatNumber(Cost())}";

        }

    }
}
