using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using static Expansion.Oracle;

namespace Blindsided.Utilities
{
    public static class CalcUtils
    {
        // Suffixes for each 10^3 exponent group.
        public static readonly string[] Prefix =
        {
            "",
            "K",
            "M",
            "B",
            "T",
            "Qa",
            "Qi",
            "Sx",
            "Sp",
            "Oc",
            "No",
            "Dc",
            "UDc",
            "DDc",
            "TDc",
            "QaDc",
            "QiDc",
            "SxDc",
            "SpDc",
            "OcDc",
            "NoDc",
            "Vg",
            "UVg",
            "DVg",
            "TVg",
            "QaVg",
            "QiVg",
            "SxVg",
            "SpVg",
            "OcVg",
            "NoVg",
            "Tg",
            "UTg",
            "DTg",
            "TTg",
            "QaTg",
            "QiTg",
            "SxTg",
            "SpTg",
            "OcTg",
            "NoTg",
            "Qag",
            "UQag",
            "DQag",
            "TQag",
            "QaQag",
            "QiQag",
            "SxQag",
            "SpQag",
            "OcQag",
            "NoQag",
            "Qig",
            "UQig",
            "DQig",
            "TQig",
            "QaQig",
            "QiQig",
            "SxQig",
            "SpQig",
            "OcQig",
            "NoQig",
            "Sxg",
            "USxg",
            "DSxg",
            "TSxg",
            "QaSxg",
            "QiSxg",
            "SxSxg",
            "SpSxg",
            "OcSxg",
            "NoSxg",
            "Spg",
            "USpg",
            "DSpg",
            "TSpg",
            "QaSpg",
            "QiSpg",
            "SxSpg",
            "SpSpg",
            "OcSpg",
            "NoSpg",
            "Ocg",
            "UOcg",
            "DOcg",
            "TOcg",
            "QaOcg",
            "QiOcg",
            "SxOcg",
            "SpOcg",
            "OcOcg",
            "NoOcg",
            "Nog",
            "UNog",
            "DNog",
            "TNog",
            "QaNog",
            "QiNog",
            "SxNog",
            "SpNog",
            "OcNog",
            "NoNog",
            "Ce",
            "UCe",
            "DCe",
        };

        public static string FormatNumber(
            double x,
            bool hideDecimal = false,
            float fontWeight = 0f,
            bool useMspace = false,
            float mspaceSize = 0.6f,
            string colourOverride = "")
        {
            string mspaceStart = useMspace ? $"<mspace={mspaceSize}em>" : "";
            string mspaceEnd = useMspace ? "</mspace>" : "";
            string colourStart = string.IsNullOrEmpty(colourOverride) ? "" : colourOverride;
            string colourEnd = string.IsNullOrEmpty(colourOverride) ? "" : "</color>";

            if (x == 0)
            {
                string zeroStr = hideDecimal ? "0" : "0.00";
                string zeroPrefix = Prefix.Length > 0 ? Prefix[0] : "";
                if (fontWeight > 0f && !string.IsNullOrEmpty(zeroPrefix))
                    zeroPrefix = $"<font-weight={fontWeight}>{zeroPrefix}</font-weight>";
                return $"{colourStart}{mspaceStart}{zeroStr}{mspaceEnd}{colourEnd}{zeroPrefix}";
            }

            double absX = Math.Abs(x);
            int exponentGroup = Math.Max((int)Math.Floor(Math.Log10(absX) / 3), 0);

            double scale = Math.Pow(10, exponentGroup * 3);
            double mantissa = x / scale;

            int integerDigits = Math.Abs(mantissa) < 1
                ? 1
                : (int)Math.Floor(Math.Log10(Math.Abs(mantissa))) + 1;
            int digitsAfterDecimal = Math.Max(0, 3 - integerDigits);

            double factor = Math.Pow(10, digitsAfterDecimal);
            mantissa = Math.Truncate(mantissa * factor) / factor;

            string mantissaStr = mantissa.ToString("F" + digitsAfterDecimal);

            if (useMspace)
                mantissaStr = mantissaStr.Replace(".", $"{mspaceEnd}.{mspaceStart}");

            string suffix = exponentGroup < Prefix.Length ? Prefix[exponentGroup] : "";
            string weightedSuffix = suffix;
            if (fontWeight > 0f && !string.IsNullOrEmpty(suffix))
                weightedSuffix = $"<font-weight={fontWeight}>{suffix}</font-weight>";

            if (StaticNumberFormatting == NumberTypes.Scientific)
            {
                if (absX > 1000)
                {
                    string sciStr = x.ToString("0.00e0");
                    if (useMspace)
                        sciStr = sciStr.Replace(".", $"{mspaceEnd}.{mspaceStart}");
                    return $"{colourStart}{mspaceStart}{sciStr}{mspaceEnd}{colourEnd}";
                }

                return $"{colourStart}{mspaceStart}{mantissaStr}{mspaceEnd}{colourEnd}{suffix}";
            }

            if (StaticNumberFormatting == NumberTypes.Engineering)
            {
                if (absX > 1000) return $"{colourStart}{mspaceStart}{mantissaStr}e{exponentGroup * 3}{mspaceEnd}{colourEnd}";
                return $"{colourStart}{mspaceStart}{mantissaStr}{mspaceEnd}{colourEnd}{suffix}";
            }

            if (exponentGroup < Prefix.Length)
            {
                if (hideDecimal && absX < 100)
                    return $"{colourStart}{Math.Floor(x)}{colourEnd}";
                return $"{colourStart}{mspaceStart}{mantissaStr}{mspaceEnd}{colourEnd}{weightedSuffix}";
            }

            string fallback = x.ToString("0.00e0");
            if (useMspace)
                fallback = fallback.Replace(".", $"{mspaceEnd}.{mspaceStart}");
            return $"{colourStart}{mspaceStart}{fallback}{mspaceEnd}{colourEnd}";
        }

        // Energy prefixes: true = Joules, false = Watts
        // Standard SI: J, K, M, G, T, P, E, Z, Y, R, Q (up to 10^30)
        // Extended: Continue with game-specific suffixes
        public static readonly string[] EnergyPrefixJ =
        {
            "J", "KJ", "MJ", "GJ", "TJ", "PJ", "EJ", "ZJ", "YJ", "RJ", "QJ",
            "UJ", "DJ", "TrJ", "QaJ", "QiJ", "SxJ", "SpJ", "OcJ", "NoJ", "DcJ"
        };

        public static readonly string[] EnergyPrefixW =
        {
            "W", "KW", "MW", "GW", "TW", "PW", "EW", "ZW", "YW", "RW", "QW",
            "UW", "DW", "TrW", "QaW", "QiW", "SxW", "SpW", "OcW", "NoW", "DcW"
        };

        public static Dictionary<string, string> replacements = new()
        {
            { "{colorHighlight}", textColourBlue }
        };

        public static string FormatEnergy(
            double x,
            bool isJoules,
            bool useMspace = false,
            float mspaceSize = 0.6f,
            string colourOverride = "")
        {
            string[] prefixes = isJoules ? EnergyPrefixJ : EnergyPrefixW;
            string mspaceStart = useMspace ? $"<mspace={mspaceSize}em>" : "";
            string mspaceEnd = useMspace ? "</mspace>" : "";
            string colourStart = string.IsNullOrEmpty(colourOverride) ? "" : colourOverride;
            string colourEnd = string.IsNullOrEmpty(colourOverride) ? "" : "</color>";

            if (x == 0)
                return $"{colourStart}{mspaceStart}0.00{mspaceEnd}{colourEnd} {prefixes[0]}";

            double absX = Math.Abs(x);
            int exponentGroup = Math.Max((int)Math.Floor(Math.Log10(absX) / 3), 0);

            double scale = Math.Pow(10, exponentGroup * 3);
            double mantissa = x / scale;

            int integerDigits = Math.Abs(mantissa) < 1
                ? 1
                : (int)Math.Floor(Math.Log10(Math.Abs(mantissa))) + 1;
            int digitsAfterDecimal = Math.Max(0, 3 - integerDigits);

            double factor = Math.Pow(10, digitsAfterDecimal);
            mantissa = Math.Truncate(mantissa * factor) / factor;

            string mantissaStr = mantissa.ToString("F" + digitsAfterDecimal);

            if (useMspace)
                mantissaStr = mantissaStr.Replace(".", $"{mspaceEnd}.{mspaceStart}");

            if (exponentGroup < prefixes.Length)
                return $"{colourStart}{mspaceStart}{mantissaStr}{mspaceEnd}{colourEnd} {prefixes[exponentGroup]}";

            return $"{colourStart}{mspaceStart}{mantissaStr}e{exponentGroup * 3}{mspaceEnd}{colourEnd}";
        }

        public static string FormatUnits(
            int units,
            bool mspace = true,
            float mspaceSize = 0.6f,
            bool isMs = false)
        {
            string usemSpace = mspace ? $"<mspace={mspaceSize}em>" : "";
            string endMSpace = mspace ? "</mspace>" : "";
            return $"{usemSpace}{(isMs ? $"{units:D2}" : $"{units}")}{endMSpace}";
        }

        public static string FormatTime(
            double time,
            bool showDecimal = false,
            bool shortForm = false,
            bool mspace = true,
            float mspaceSize = 0.6f,
            bool ultraShort = false,
            bool absoluteValue = true,
            string colourOverride = "")
        {
            if (double.IsNaN(time))
                return "NaN";

            if (time > TimeSpan.MaxValue.TotalSeconds || time < -TimeSpan.MaxValue.TotalSeconds)
                return "Infinity";

            if (ultraShort)
            {
                double absTime = Math.Abs(time);
                if (absTime >= 3600) return $"{(int)Math.Floor(absTime / 3600)} Hours";
                if (absTime >= 60) return $"{(int)Math.Floor(absTime / 60)} Minutes";
                return "None";
            }

            string mspaceStart = mspace ? $"<mspace={mspaceSize}em>" : "";
            string mspaceEnd = mspace ? "</mspace>" : "";
            string colourStart = string.IsNullOrEmpty(colourOverride) ? "" : colourOverride;
            string colourEnd = string.IsNullOrEmpty(colourOverride) ? "" : "</color>";

            TimeSpan timespan = TimeSpan.FromSeconds(Math.Abs(time));
            string outputTime = mspaceStart;
            outputTime += !absoluteValue && time < 0 ? "-" : "";
            outputTime += timespan.Days == 0
                ? ""
                : $"{colourStart}{FormatUnits(timespan.Days, mspace, mspaceSize)}{colourEnd}{(shortForm ? "d" : $" {Plural("Day", timespan.Days)}")} ";
            outputTime += timespan.Hours == 0
                ? ""
                : $"{colourStart}{FormatUnits(timespan.Hours, mspace, mspaceSize)}{colourEnd}{(shortForm ? "h" : $" {Plural("Hour", timespan.Hours)}")} ";
            outputTime += timespan.Minutes == 0
                ? ""
                : $"{colourStart}{FormatUnits(timespan.Minutes, mspace, mspaceSize)}{colourEnd}{(shortForm ? "m" : $" {Plural("Minute", timespan.Minutes)}")} ";
            string shownDecimal = timespan.Milliseconds == 0 || !showDecimal
                ? ""
                : $"{(mspace ? $"{mspaceEnd}.{mspaceStart}" : ".")}{FormatUnits(timespan.Milliseconds / 10, mspace, mspaceSize, true)}";
            outputTime +=
                $"{colourStart}{FormatUnits(timespan.Seconds, mspace, mspaceSize)}{shownDecimal}{colourEnd}{(shortForm ? "s" : $" {Plural("Second", timespan.Seconds)}")}";
            outputTime += mspaceEnd;
            return outputTime;
        }

        public static string FormatTimeLarge(double time)
        {
            time = Math.Floor(time);

            double days = Math.Floor(time / 86400);
            double hours = Math.Floor(time / 3600);
            double minutes = Math.Floor(time / 60);

            int secondsC = (int)time % 60;
            int minutesC = (int)minutes % 60;
            int hoursC = (int)hours % 24;

            string secondsS = "Second".Plural(secondsC);
            string minutesS = "Minute".Plural(minutes);
            string minutesCS = "Minute".Plural(minutesC);
            string hoursS = "Hour".Plural(hours);
            string hoursCS = "Hour".Plural(hoursC);
            string daysS = "Day".Plural(days);

            if (time > 86400)
                return $"{days:F0} {daysS} {hoursC:F0} {hoursCS} {minutesC:F0} {minutesS} {secondsC:F0} {secondsS}";
            if (time > 3600) return $"{hours:F0} {hoursS} {minutesC:F0} {minutesCS} {secondsC:F0} {secondsS}";
            if (time > 60) return $"{minutes:F0} {minutesS} {secondsC:F0} {secondsS}";
            return time + " Second".Plural(time);
        }

        public static string Plural(this string str, double num) => str + (num == 1 ? "" : "s");


        public static string Scramble(this string s)
        {
            return new string(s.ToCharArray().OrderBy(x => Guid.NewGuid()).ToArray());
        }

        public static string ReplacePlaceholders(string input)
        {
            foreach (var pair in replacements) input = input.Replace(pair.Key, pair.Value);
            return input;
        }

        #region BuyCalcs

        public static double BuyXCost(
            double numberToBuy,
            double baseCost,
            double exponent,
            double currentLevel,
            double costMultiplier = 1f)
        {
            double cost = costMultiplier
                          * baseCost
                          * Math.Pow(exponent, currentLevel)
                          * ((Math.Pow(exponent, numberToBuy) - 1) / (exponent - 1));

            return cost;
        }

        public static double BuyMaxCost(double currencyOwned, double baseCost, double exponent, double currentLevel)
        {
            double n = Math.Floor(Math.Log(
                currencyOwned * (exponent - 1f) / (baseCost * Math.Pow(exponent, currentLevel)) + 1,
                exponent));
            return BuyXCost(n, baseCost, exponent, currentLevel);
        }

        public static int MaxAffordable(
            double currencyOwned,
            double baseCost,
            double exponent,
            double currentLevel,
            double costMultiplier = 1f)
        {
            double n = Math.Floor(Math.Log(
                currencyOwned * (exponent - 1)
                / (costMultiplier * baseCost * Math.Pow(exponent, currentLevel))
                + 1,
                exponent));

            if (n < 0) n = 0;

            return (int)n;
        }

        /// <summary>
        /// Calculate facility cost for mega-structure purchases.
        /// Uses the same exponential scaling formula as BuyXCost.
        /// </summary>
        /// <param name="numberToBuy">Number of mega-structures to purchase.</param>
        /// <param name="baseFacilityCost">Base amount of facilities consumed.</param>
        /// <param name="exponent">Cost scaling exponent (typically 1.5).</param>
        /// <param name="currentOwned">Current number of this mega-structure owned.</param>
        /// <returns>Total facilities that will be consumed.</returns>
        public static double FacilityCost(
            double numberToBuy,
            double baseFacilityCost,
            double exponent,
            double currentOwned)
        {
            if (numberToBuy <= 0) return 0;
            if (exponent <= 1) return baseFacilityCost * numberToBuy;

            return baseFacilityCost
                   * Math.Pow(exponent, currentOwned)
                   * ((Math.Pow(exponent, numberToBuy) - 1) / (exponent - 1));
        }

        /// <summary>
        /// Calculate max affordable mega-structures based on available facilities.
        /// </summary>
        /// <param name="availableFacilities">Total facilities available to spend.</param>
        /// <param name="baseFacilityCost">Base amount of facilities consumed.</param>
        /// <param name="exponent">Cost scaling exponent (typically 1.5).</param>
        /// <param name="currentOwned">Current number of this mega-structure owned.</param>
        /// <returns>Maximum number of mega-structures that can be purchased.</returns>
        public static int MaxAffordableFacility(
            double availableFacilities,
            double baseFacilityCost,
            double exponent,
            double currentOwned)
        {
            if (availableFacilities <= 0 || baseFacilityCost <= 0) return 0;
            if (exponent <= 1) return (int)Math.Floor(availableFacilities / baseFacilityCost);

            double n = Math.Floor(Math.Log(
                availableFacilities * (exponent - 1)
                / (baseFacilityCost * Math.Pow(exponent, currentOwned))
                + 1,
                exponent));

            return n < 0 ? 0 : (int)n;
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
