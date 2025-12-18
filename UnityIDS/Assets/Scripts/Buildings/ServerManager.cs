using System;
using UnityEngine;
using static Expansion.Oracle;
using static Blindsided.Utilities.CalcUtils;

namespace Buildings
{
    public class ServerManager : Building
    {
        public override double ManuallyPurchasedBuildings { get => StaticInfinityData.servers[1]; set => StaticInfinityData.servers[1] = value; }

        public override double AutoPurchasedBuildings { get => StaticInfinityData.servers[0]; set => StaticInfinityData.servers[0] = value; }

        public override double Production => StaticInfinityData.serverManagerProduction;
        public override double CurrentLevel => StaticPrestigeData.infinityServers ? (int)ManuallyPurchasedBuildings - 10 : (int)ManuallyPurchasedBuildings;
        public override bool AutoBuy => StaticSaveSettings.infinityAutoServers && StaticPrestigeData.infinityAutoBots;

        public override string OwnedText =>
            $"Servers {textColourOrange}{FormatNumber(TotalBuildings)}<size=70%>{textColourGreen}({FormatNumber(ManuallyPurchasedBuildings)}" +
            $"{(StaticSkillTreeData.terraEculeo ? $"{textColourBlue}+{FormatNumber(StaticSkillTreeData.terraIrradiant ? StaticInfinityData.planets[1] * 12 : StaticInfinityData.planets[1])}" : "")})";

        public override string ProductioinText =>
            $"{(Production > 0 ? $"{wordUsed} " : "")}{textColourOrange}" +
            $"{(Production >= 1 ? $"{FormatNumber(Production)}</color> {productionWordUsed}s /s" : Production > 0 ? $"1</color> {productionWordUsed} /{textColourOrange}{FormatNumber(1 / Production < 60 ? 1 / Production : 1 / Production / 60)}</color>{(1 / Production < 60 ? "s" : " Min")}" : "Purchase a Server")}";

    }
}