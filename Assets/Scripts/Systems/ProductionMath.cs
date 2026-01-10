using System;
using static Expansion.Oracle;

namespace Systems
{
    public static class ProductionMath
    {
        public static double StarsSurrounded(DysonVerseInfinityData dvid, bool multipliedByDeltaTime, bool floored,
            double deltaTime)
        {
            double surrounded = floored
                ? Math.Floor(dvid.panelsPerSec * dvid.panelLifetime / 20000)
                : dvid.panelsPerSec * dvid.panelLifetime / 20000;
            return multipliedByDeltaTime ? surrounded * deltaTime : surrounded;
        }

        public static double GalaxiesEngulfed(DysonVerseInfinityData dvid, bool multipliedByDeltaTime, bool floored,
            double deltaTime)
        {
            double engulfed = floored
                ? Math.Floor(dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000)
                : dvid.panelsPerSec * dvid.panelLifetime / 20000 / 100000000000;
            return multipliedByDeltaTime ? engulfed * deltaTime : engulfed;
        }

        public static double StellarGalaxies(DysonVerseSkillTreeData dvst, double galaxiesEngulfed)
        {
            double stellarSacrificesGalaxies = galaxiesEngulfed;
            if (dvst.stellarObliteration) stellarSacrificesGalaxies *= 1000;
            if (dvst.supernova) stellarSacrificesGalaxies *= 1000;

            if (stellarSacrificesGalaxies > 10)
                return Math.Pow(Math.Log10(stellarSacrificesGalaxies), 2);
            if (stellarSacrificesGalaxies > 1)
                return Math.Log10(stellarSacrificesGalaxies);
            return 0;
        }

        public static double StellarSacrificesRequiredBots(DysonVerseSkillTreeData dvst, double starsSurrounded)
        {
            double botsNeeded = dvst.supernova
                ? starsSurrounded * 1000000
                : dvst.stellarObliteration
                    ? starsSurrounded * 1000
                    : starsSurrounded;

            if (botsNeeded < 1) botsNeeded = 1;
            if (dvst.stellarDominance) botsNeeded *= 100;
            if (dvst.stellarImprovements) botsNeeded /= 1000;
            return botsNeeded;
        }

        public static double AmountForBuildingBoostAfterX(DysonVerseSkillTreeData dvst)
        {
            int amountForBoost = dvst.productionScaling ? 90 : 100;
            return amountForBoost;
        }

        public static double DivisionForBoostAfterX(DysonVerseSkillTreeData dvst)
        {
            int value = dvst.superSwarm ? dvst.megaSwarm ? dvst.ultimateSwarm ? 20 : 100 / 3 : 50 : 100;
            return value;
        }
    }
}
