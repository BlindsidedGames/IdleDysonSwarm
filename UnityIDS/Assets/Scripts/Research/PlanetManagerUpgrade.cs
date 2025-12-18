using static Expansion.Oracle;

namespace Research
{
    public class PlanetManagerUpgrade : Research
    {
        public override double Percent => StaticInfinityData.planetUpgradePercent;
        public override double CurrentLevel {
            get => StaticInfinityData.planetUpgradeOwned;
            set => StaticInfinityData.planetUpgradeOwned = (long)value;
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchTogglePlanet && StaticPrestigeData.infinityAutoResearch;
    }
}