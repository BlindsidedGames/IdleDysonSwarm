using static Expansion.Oracle;

namespace Research
{
    public class AiManagerUpgrade : Research
    {
        public override double Percent => StaticInfinityData.aiManagerUpgradePercent;
        public override double CurrentLevel {
            get => StaticInfinityData.aiManagerUpgradeOwned;
            set => StaticInfinityData.aiManagerUpgradeOwned = (long)value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleAi && StaticPrestigeData.infinityAutoResearch;

    }
}