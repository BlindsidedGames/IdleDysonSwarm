using GameData;
using static Expansion.Oracle;

namespace Research
{
    public class DataCenterManagerUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.DataCenterUpgrade;
        public override double Percent => StaticInfinityData.dataCenterUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.DataCenterUpgrade);
            set => SetResearchLevel(ResearchIdMap.DataCenterUpgrade, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleDataCenter && StaticPrestigeData.infinityAutoResearch;
    }
}
