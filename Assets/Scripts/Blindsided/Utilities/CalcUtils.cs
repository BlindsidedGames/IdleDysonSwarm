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
            float mspaceSize = 0.5f)
        {
            string mspaceStart = useMspace ? $"<mspace={mspaceSize}em>" : "";
            string mspaceEnd = useMspace ? "</mspace>" : "";

            if (x == 0)
            {
                string zeroStr = hideDecimal ? "0" : "0.00";
                string zeroPrefix = Prefix.Length > 0 ? Prefix[0] : "";
                if (fontWeight > 0f && !string.IsNullOrEmpty(zeroPrefix))
                    zeroPrefix = $"<font-weight={fontWeight}>{zeroPrefix}</font-weight>";
                return $"{mspaceStart}{zeroStr}{mspaceEnd}{zeroPrefix}";
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
                    return $"{mspaceStart}{sciStr}{mspaceEnd}";
                }

                return $"{mspaceStart}{mantissaStr}{suffix}{mspaceEnd}";
            }

            if (StaticNumberFormatting == NumberTypes.Engineering)
            {
                if (absX > 1000) return $"{mspaceStart}{mantissaStr}e{exponentGroup * 3}{mspaceEnd}";
                return $"{mspaceStart}{mantissaStr}{suffix}{mspaceEnd}";
            }

            if (exponentGroup < Prefix.Length)
            {
                if (hideDecimal && absX < 100)
                    return Math.Floor(x).ToString();
                return $"{mspaceStart}{mantissaStr}{mspaceEnd}{weightedSuffix}";
            }

            string fallback = x.ToString("0.00e0");
            if (useMspace)
                fallback = fallback.Replace(".", $"{mspaceEnd}.{mspaceStart}");
            return $"{mspaceStart}{fallback}{mspaceEnd}";
        }

//true = Joules
//false = Watts
        public static readonly string[] EnergyPrefixJ = { "J", "KJ", "MJ", "GJ", "TJ", "PJ", "EJ", "ZJ", "YJ" };
        public static readonly string[] EnergyPrefixW = { "W", "KW", "MW", "GW", "TW", "PW", "EW", "ZW", "YW" };

        public static Dictionary<string, string> replacements = new()
        {
            { "{colorHighlight}", textColourBlue }
        };

        public static string FormatEnergy(double x, bool type)
        {
            int sign = Math.Sign(x);
            double e = Math.Max(0, Math.Log(sign * x) / Math.Log(10));
            int o = 2 - (int)Math.Floor(e % 3);
            e = Math.Floor(e / 3);
            double m = x / Math.Pow(10, e * 3);
            m = Math.Truncate(m * Math.Pow(10, o)) / Math.Pow(10, o);

            string ms = $"{m}";
            int d = ms.Length;
            if (sign == -1) d--;

            if (o == 2 && d == 1)
                ms = $"{ms}.00";
            if (o == 2 && d == 3)
                ms = $"{ms}0";
            if (o == 1 && d == 2)
                ms = $"{ms}.0";

            if (e < EnergyPrefixJ.Length) return type ? $"{ms}{EnergyPrefixJ[(int)e]}" : $"{ms}{EnergyPrefixW[(int)e]}";

            return $"{ms}e{(int)e * 3}";
        }

        public static string FormatUnits(
            int units,
            bool mspace = true,
            float mspaceSize = 0.6f,
            bool isMs = false)
        {
            string usemSpace = mspace ? $"<mspace={mspaceSize}>" : "";
            string endMSpace = mspace ? "</mspace>" : "";
            return $"{usemSpace}{(isMs ? $"{units:D2}" : $"{units}")}{endMSpace}";
        }

        public static string FormatTime(
            double time,
            bool showDecimal = false,
            bool shortForm = false,
            bool mspace = true,
            float mspaceSize = 20f,
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

            string mspaceStart = mspace ? $"<mspace={mspaceSize}>" : "";
            string mspaceEnd = mspace ? "</mspace>" : "";
            string endColour = string.IsNullOrEmpty(colourOverride) ? "" : "</color>";

            TimeSpan timespan = TimeSpan.FromSeconds(Math.Abs(time));
            string outputTime = mspaceStart;
            outputTime += !absoluteValue && time < 0 ? "-" : "";
            outputTime += timespan.Days == 0
                ? ""
                : $"{FormatUnits(timespan.Days, mspace, mspaceSize)}{colourOverride}{(shortForm ? "d" : $" {Plural("Day", timespan.Days)}")}{endColour} ";
            outputTime += timespan.Hours == 0
                ? ""
                : $"{FormatUnits(timespan.Hours, mspace, mspaceSize)}{colourOverride}{(shortForm ? "h" : $" {Plural("Hour", timespan.Hours)}")}{endColour} ";
            outputTime += timespan.Minutes == 0
                ? ""
                : $"{FormatUnits(timespan.Minutes, mspace, mspaceSize)}{colourOverride}{(shortForm ? "m" : $" {Plural("Minute", timespan.Minutes)}")}{endColour} ";
            string shownDecimal = timespan.Milliseconds == 0 || !showDecimal
                ? ""
                : $"{(mspace ? $"{mspaceEnd}.{mspaceStart}" : ".")}{FormatUnits(timespan.Milliseconds / 10, mspace, mspaceSize, true)}";
            outputTime +=
                $"{FormatUnits(timespan.Seconds, mspace, mspaceSize)}{shownDecimal}{colourOverride}{(shortForm ? "s" : $" {Plural("Second", timespan.Seconds)}")}{endColour}";
            outputTime += mspaceEnd;
            return outputTime;
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
