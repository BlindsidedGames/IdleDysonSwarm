using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Buildings
{
    public class DataCenterManager : Building
    {
        public override double ManuallyPurchasedBuildings { get => StaticInfinityData.dataCenters[1]; set => StaticInfinityData.dataCenters[1] = value; }

        public override double AutoPurchasedBuildings { get => StaticInfinityData.dataCenters[0]; set => StaticInfinityData.dataCenters[0] = value; }

        public override double Production => StaticInfinityData.dataCenterServerProduction;
        public override double CurrentLevel => StaticPrestigeData.infinityDataCenter ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public override bool AutoBuy => StaticSaveSettings.infinityAutoDataCenters && StaticPrestigeData.infinityAutoBots;

        public override string OwnedText =>
            $"Data Centers {textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}" +
            $"{(StaticSkillTreeData.terraFirma ? $"{textColourBlue}+{FormatNumber(StaticSkillTreeData.terraIrradiant ? StaticInfinityData.planets[1] * 12 : StaticInfinityData.planets[1])}" : "")})";

        public override string ProductioinText =>
            $"{(Production > 0 ? $"{wordUsed} " : "")}{textColourOrange}" +
            $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWordUsed}s /s" : Production > 0 ? $"1</color> {productionWordUsed} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : "Purchase a Data Center")}";
    }
}