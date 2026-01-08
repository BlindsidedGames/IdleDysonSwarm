using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Research
{
    public class ScienceBoostUpgrade : Research
    {
        public override double Percent => StaticInfinityData.scienceBoostPercent;
        public override double CurrentLevel {
            get => StaticInfinityData.scienceBoostOwned;
            set => StaticInfinityData.scienceBoostOwned = value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleScience && StaticPrestigeData.infinityAutoResearch;


        public override void Update()
        {
            UpdateCostText();
            buildingReferences.purchaseButton.interactable = Cost() <= Science && NumberToBuy() > 0 && !StaticSkillTreeData.shouldersOfGiants && !AutoBuy;
            SetProductionSec();
        }


        public override void UpdateCostText()
        {
            buildingReferences.amountToBuy.text = $"{(AutoBuy ? "Auto" : $"+{NumberToBuy()}")}";
            buildingReferences.building.text = OwnedText;
            buildingReferences.buttonCost.text = StaticSkillTreeData.shouldersOfGiants ? "Disabled" : $"<sprite=1>{FormatNumber(Cost())}";

        }
    }
}