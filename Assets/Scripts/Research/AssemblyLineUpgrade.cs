using GameData;
using static Expansion.Oracle;

namespace Research
{
    public class AssemblyLineUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.AssemblyLineUpgrade;
        public override double Percent => StaticInfinityData.assemblyLineUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.AssemblyLineUpgrade);
            set => SetResearchLevel(ResearchIdMap.AssemblyLineUpgrade, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleAssembly && StaticPrestigeData.infinityAutoResearch;
    }
}
