using GameData;
using static Expansion.Oracle;

namespace Research
{
    public class ServerManagerUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.ServerUpgrade;
        public override double Percent => StaticInfinityData.serverUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.ServerUpgrade);
            set => SetResearchLevel(ResearchIdMap.ServerUpgrade, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleServer && StaticPrestigeData.infinityAutoResearch;

    }
}
