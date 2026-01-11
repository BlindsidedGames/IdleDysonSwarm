using GameData;
using static Expansion.Oracle;

namespace Research
{
    public class AiManagerUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.AiManagerUpgrade;
        public override double Percent => StaticInfinityData.aiManagerUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.AiManagerUpgrade);
            set => SetResearchLevel(ResearchIdMap.AiManagerUpgrade, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleAi && StaticPrestigeData.infinityAutoResearch;

    }
}
