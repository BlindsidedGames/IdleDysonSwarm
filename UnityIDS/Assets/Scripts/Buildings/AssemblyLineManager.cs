using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Buildings
{
    public class AssemblyLineManager : Building
    {
        public override double ManuallyPurchasedBuildings { get => StaticInfinityData.assemblyLines[1]; set => StaticInfinityData.assemblyLines[1] = value; }

        public override double AutoPurchasedBuildings { get => StaticInfinityData.assemblyLines[0]; set => StaticInfinityData.assemblyLines[0] = value; }

        public override double ModifiedBaseCost => StaticSkillTreeData.assemblyMegaLines && TotalPlanets > 0 ? baseCost / TotalPlanets : baseCost;

        public double TotalPlanets => StaticInfinityData.planets[1] + StaticInfinityData.planets[0];

        public override double Production => StaticInfinityData.assemblyLineBotProduction;
        public override double CurrentLevel => StaticPrestigeData.infinityAssemblyLines ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public override bool AutoBuy => StaticSaveSettings.infinityAutoAssembly && StaticPrestigeData.infinityAutoBots;

        public override string OwnedText =>
            $"Assembly Lines {textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}" +
            $"{(StaticSkillTreeData.terraNullius ? $"{textColourBlue}+{FormatNumber(StaticSkillTreeData.terraIrradiant ? StaticInfinityData.planets[1] * 12 : StaticInfinityData.planets[1])}" : "")})";

        public override string ProductioinText =>
            $"{(Production > 0 ? $"{wordUsed} " : "")}{textColourOrange}" +
            $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWordUsed}s /s" : Production > 0 ? $"1</color> {productionWordUsed} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : "Purchase an Assembly Line")}";


    }
}