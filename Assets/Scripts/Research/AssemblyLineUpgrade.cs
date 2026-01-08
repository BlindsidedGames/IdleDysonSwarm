using static Expansion.Oracle;

namespace Research
{
    public class AssemblyLineUpgrade : Research
    {
        public override double Percent => StaticInfinityData.assemblyLineUpgradePercent;
        public override double CurrentLevel {
            get => StaticInfinityData.assemblyLineUpgradeOwned;
            set => StaticInfinityData.assemblyLineUpgradeOwned = (long)value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleAssembly && StaticPrestigeData.infinityAutoResearch;
    }
}