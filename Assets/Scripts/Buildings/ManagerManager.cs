using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Buildings
{
    public class ManagerManager : Building
    {
        public override double ManuallyPurchasedBuildings { get => StaticInfinityData.managers[1]; set => StaticInfinityData.managers[1] = value; }

        public override double AutoPurchasedBuildings { get => StaticInfinityData.managers[0]; set => StaticInfinityData.managers[0] = value; }

        public override double Production => StaticInfinityData.managerAssemblyLineProduction;
        public override double CurrentLevel => StaticPrestigeData.infinityAiManagers ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public override bool AutoBuy => StaticSaveSettings.infinityAutoManagers && StaticPrestigeData.infinityAutoBots;

        public override string OwnedText =>
            $"AI Managers {textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}" +
            $"{(StaticSkillTreeData.terraInfirma ? $"{textColourBlue}+{FormatNumber(StaticSkillTreeData.terraIrradiant ? StaticInfinityData.planets[1] * 12 : StaticInfinityData.planets[1])}" : "")})";

        public override string ProductioinText =>
            $"{(Production > 0 ? $"{wordUsed} " : "")}{textColourOrange}" +
            $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWordUsed}s /s" : Production > 0 ? $"1</color> {productionWordUsed} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : "Purchase an AI Manager")}";
    }
}