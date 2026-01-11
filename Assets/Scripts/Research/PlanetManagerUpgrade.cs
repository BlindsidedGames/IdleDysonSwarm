using GameData;
using static Expansion.Oracle;

namespace Research
{
    public class PlanetManagerUpgrade : Research
    {
        protected override string ResearchId => ResearchIdMap.PlanetUpgrade;
        public override double Percent => StaticInfinityData.planetUpgradePercent;
        public override double CurrentLevel {
            get => GetResearchLevel(ResearchIdMap.PlanetUpgrade);
            set => SetResearchLevel(ResearchIdMap.PlanetUpgrade, value);
        }
        public override bool AutoBuy => StaticSaveSettings.infinityAutoResearchTogglePlanet && StaticPrestigeData.infinityAutoResearch;
    }
}
