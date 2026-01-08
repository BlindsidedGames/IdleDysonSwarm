using System;
using System.Linq;
using UnityEngine;
using static Expansion.Oracle;

namespace Blindsided.Utilities
{
    public static class CalcUtils
    {
        public static readonly string[] Prefix =
        {
            "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc",
            "SxDc",
            "SpDc", "OcDc", "NoDc"
        };

        public static string FormatNumber(double x)
        {
            int s = Math.Sign(x);
            double e = Math.Max(0, Math.Log(s * x) / Math.Log(10));
            int o = 2 - (int)Math.Floor(e % 3);
            e = MathF.Floor((float)e / 3);

            double m = x / Math.Pow(10, e * 3);
            m = Math.Truncate(m * Math.Pow(10, o)) / Math.Pow(10, o);

            string ms = $"{m}";
            int d = ms.Length;
            if (s == -1) d--;

            if (o == 2 && d == 1)
                ms = $"{ms}.00";
            if (o == 2 && d == 3)
                ms = $"{ms}0";
            if (o == 1 && d == 2)
                ms = $"{ms}.0";
            if (StaticNumberFormatting == NumberTypes.Scientific)
            {
                /*if (x > 1000)*/
                return $"{x:#.##e0}";
                return $"{ms}{Prefix[(int)e]}";
            }

            if (StaticNumberFormatting == NumberTypes.Engineering)
            {
                if (x > 1000) return $"{ms}e{(int)e * 3}";
                return $"{ms}{Prefix[(int)e]}";
            }


            if (e < Prefix.Length)
                return $"{ms}{Prefix[(int)e]}";
            return $"{x:#.##e0}";
        }

//true = Joules
//false = Watts
        public static readonly string[] EnergyPrefixJ = { "J", "KJ", "MJ", "GJ", "TJ", "PJ", "EJ", "ZJ", "YJ" };
        public static readonly string[] EnergyPrefixW = { "W", "KW", "MW", "GW", "TW", "PW", "EW", "ZW", "YW" };

        public static string FormatEnergy(double x, bool type)
        {
            int s = Math.Sign(x);
            double e = Math.Max(0, Math.Log(s * x) / Math.Log(10));
            int o = 2 - (int)Math.Floor(e % 3);
            e = Math.Floor(e / 3);
            double m = x / Math.Pow(10, e * 3);
            m = Math.Truncate(m * Math.Pow(10, o)) / Math.Pow(10, o);

            string ms = $"{m}";
            int d = ms.Length;
            if (s == -1) d--;

            if (o == 2 && d == 1)
                ms = $"{ms}.00";
            if (o == 2 && d == 3)
                ms = $"{ms}0";
            if (o == 1 && d == 2)
                ms = $"{ms}.0";

            if (e < EnergyPrefixJ.Length) return type ? $"{ms}{EnergyPrefixJ[(int)e]}" : $"{ms}{EnergyPrefixW[(int)e]}";

            return $"{ms}e{(int)e * 3}";
        }


        public static string FormatTime(double time, bool showDecimal = false, bool shortForm = false, bool mspace = true, int mspaceSize = 20, bool ultraShort = false)
        {
            time = showDecimal ? Math.Floor(time * 10) / 10 : Math.Floor(time);

            // Raw
            double days = Math.Floor(time / 86400);
            double hours = Math.Floor(time / 3600);
            double minutes = Math.Floor(time / 60);

            // Converted
            float secondsC = showDecimal ? (float)time % 60 : (int)time % 60;
            int minutesC = (int)minutes % 60;
            int hoursC = (int)hours % 24;

            // Strings
            string secondsS = shortForm ? "s" : "Second".Plural(secondsC);
            string minutesS = shortForm ? "m" : "Minute".Plural(minutes);
            string minutesCS = shortForm ? "M" : "Minute".Plural(minutesC);
            string hoursS = shortForm ? "h" : "Hour".Plural(hours);
            string hoursCS = shortForm ? "H" : "Hour".Plural(hoursC);
            string daysS = shortForm ? "D" : "Day".Plural(days);

            if (ultraShort)
            {
                return time >= 3600 ? $"{(int)hours} Hours" : time >= 60 ? $"{(int)minutes} Minutes" : "None";
            }
            if (time > 86400)
                return $"{days:F0} {daysS} {hoursC:F0} {hoursCS} {minutesC:F0} {minutesS} {secondsC:F0} {secondsS}";
            if (time > 3600) return $"{hours:F0} {hoursS} {minutesC:F0} {minutesCS} {secondsC:F0} {secondsS}";
            if (time > 60) return $"{minutes:F0} {minutesS} {secondsC:F0} {secondsS}";
            return $"{(mspace ? $"<mspace={mspaceSize}>" : "")}{time:N1}{(mspace ? "</mspace>" : "")}{(shortForm ? "s" : showDecimal ? " Seconds" : " Second".Plural(time))}";
        }

        public static string Plural(this string str, double num) => str + (num == 1 ? "" : "s");


        public static string Scramble(this string s)
        {
            return new string(s.ToCharArray().OrderBy(x => Guid.NewGuid()).ToArray());
        }

        #region BuyCalcs

        public static double BuyXCost(double numberToBuy, double baseCost, double exponent, double currentLevel)
        {
            double cost = baseCost * Math.Pow(exponent, currentLevel) *
                          ((Math.Pow(exponent, numberToBuy) - 1) / (exponent - 1));

            return cost;
        }

        public static double BuyMaxCost(double currencyOwned, double baseCost, double exponent, double currentLevel)
        {
            double n = Math.Floor(Math.Log(
                currencyOwned * (exponent - 1f) / (baseCost * Math.Pow(exponent, currentLevel)) + 1,
                exponent));
            return BuyXCost(n, baseCost, exponent, currentLevel);
        }

        public static int MaxAffordable(double currencyOwned, double baseCost, double exponent, double currentLevel)
        {
            double n = Math.Floor(Math.Log(
                currencyOwned * (exponent - 1f) / (baseCost * Math.Pow(exponent, currentLevel)) + 1,
                exponent));
            return (int)n;
        }

        public static double TriangleNumber(double n) => n * (n + 1) / 2;
        public static (int, double) RecalculateLevel(double xpForFirstLevel, double exponent, double totalXp)
        {
            if (xpForFirstLevel == 0 || exponent == 0)
            {
                Debug.Log("lolNope");
                return (1, 0);
            }
            int lvl = 1;

            double xpToLevel = CostToLevel(xpForFirstLevel, lvl, exponent);
            while (totalXp > xpToLevel)
            {
                if (totalXp >= xpToLevel)
                {
                    totalXp -= xpToLevel;
                    lvl++;
                }
                xpToLevel = CostToLevel(xpForFirstLevel, lvl, exponent);
            }
            if (totalXp >= xpToLevel)
            {
                totalXp -= xpToLevel;
                lvl++;
            }
            return (lvl, totalXp);

        }
        private static double CostToLevel(double xpForFirstlevel, double lvl, double exponent) => Math.Floor(BuyXCost(1, xpForFirstlevel * lvl, exponent, lvl - 1));

        #endregion
    }
}