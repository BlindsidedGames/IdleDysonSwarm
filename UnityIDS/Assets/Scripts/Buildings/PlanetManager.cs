using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;


namespace Buildings
{
    public class PlanetManager : Building
    {
        public override double ManuallyPurchasedBuildings { get => StaticInfinityData.planets[1]; set => StaticInfinityData.planets[1] = value; }

        public override double AutoPurchasedBuildings { get => StaticInfinityData.planets[0]; set => StaticInfinityData.planets[0] = value; }

        public override double Production => StaticInfinityData.planetsDataCenterProduction;
        public override double CurrentLevel => StaticPrestigeData.infinityPlanets ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public override bool AutoBuy => StaticSaveSettings.infinityAutoPlanets && StaticPrestigeData.infinityAutoBots;

        public override string OwnedText =>
            $"Planets {textColourOrange}{FormatNumber(AutoPurchasedBuildings + (StaticSkillTreeData.terraIrradiant ? ManuallyPurchasedBuildings * 12 : ManuallyPurchasedBuildings))}" +
            $"<size=70%>{textColourGreen}({FormatNumber(StaticSkillTreeData.terraIrradiant ? ManuallyPurchasedBuildings * 12 : ManuallyPurchasedBuildings)})";

        public override string ProductioinText =>
            $"{(Production > 0 ? $"{wordUsed} " : "")}{textColourOrange}" +
            $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWordUsed}s /s" : Production > 0 ? $"1</color> {productionWordUsed} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : "Purchase a Planet")}";


    }
}