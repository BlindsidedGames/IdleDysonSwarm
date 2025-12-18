using static Expansion.Oracle;

namespace Research
{
    public class DataCenterManagerUpgrade : Research
    {
        public override double Percent => StaticInfinityData.dataCenterUpgradePercent;
        public override double CurrentLevel {
            get => StaticInfinityData.dataCenterUpgradeOwned;
            set => StaticInfinityData.dataCenterUpgradeOwned = (long)value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleDataCenter && StaticPrestigeData.infinityAutoResearch;
    }
}