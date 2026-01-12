using System;
using static Expansion.Oracle;

namespace Systems
{
    public static class ProductionMath
    {
        public static double StarsSurrounded(DysonVerseInfinityData infinityData, bool multipliedByDeltaTime, bool floored,
            double deltaTime)
        {
            double surrounded = floored
                ? Math.Floor(infinityData.panelsPerSec * infinityData.panelLifetime / 20000)
                : infinityData.panelsPerSec * infinityData.panelLifetime / 20000;
            return multipliedByDeltaTime ? surrounded * deltaTime : surrounded;
        }

        public static double GalaxiesEngulfed(DysonVerseInfinityData infinityData, bool multipliedByDeltaTime, bool floored,
            double deltaTime)
        {
            double engulfed = floored
                ? Math.Floor(infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000)
                : infinityData.panelsPerSec * infinityData.panelLifetime / 20000 / 100000000000;
            return multipliedByDeltaTime ? engulfed * deltaTime : engulfed;
        }

        public static double StellarGalaxies(DysonVerseSkillTreeData skillTreeData, double galaxiesEngulfed)
        {
            double stellarSacrificesGalaxies = galaxiesEngulfed;
            if (skillTreeData.stellarObliteration) stellarSacrificesGalaxies *= 1000;
            if (skillTreeData.supernova) stellarSacrificesGalaxies *= 1000;

            if (stellarSacrificesGalaxies > 10)
                return Math.Pow(Math.Log10(stellarSacrificesGalaxies), 2);
            if (stellarSacrificesGalaxies > 1)
                return Math.Log10(stellarSacrificesGalaxies);
            return 0;
        }

        public static double StellarSacrificesRequiredBots(DysonVerseSkillTreeData skillTreeData, double starsSurrounded)
        {
            double botsNeeded = skillTreeData.supernova
                ? starsSurrounded * 1000000
                : skillTreeData.stellarObliteration
                    ? starsSurrounded * 1000
                    : starsSurrounded;

            if (botsNeeded < 1) botsNeeded = 1;
            if (skillTreeData.stellarDominance) botsNeeded *= 100;
            if (skillTreeData.stellarImprovements) botsNeeded /= 1000;
            return botsNeeded;
        }

        public static double AmountForBuildingBoostAfterX(DysonVerseSkillTreeData skillTreeData)
        {
            int amountForBoost = skillTreeData.productionScaling ? 90 : 100;
            return amountForBoost;
        }

        public static double DivisionForBoostAfterX(DysonVerseSkillTreeData skillTreeData)
        {
            int value = skillTreeData.superSwarm ? skillTreeData.megaSwarm ? skillTreeData.ultimateSwarm ? 20 : 100 / 3 : 50 : 100;
            return value;
        }
    }
}

