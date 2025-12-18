using static Expansion.Oracle;

namespace Research
{
    public class ServerManagerUpgrade : Research
    {
        public override double Percent => StaticInfinityData.serverUpgradePercent;
        public override double CurrentLevel {
            get => StaticInfinityData.serverUpgradeOwned;
            set => StaticInfinityData.serverUpgradeOwned = (long)value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchToggleServer && StaticPrestigeData.infinityAutoResearch;

    }
}