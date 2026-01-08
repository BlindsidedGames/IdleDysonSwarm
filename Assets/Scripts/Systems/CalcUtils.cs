using System;
using System.Linq;
using UnityEngine;
using static Expansion.Oracle;

public static class CalcUtils
{
    public static readonly string[] Prefix =
    {
        "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc",
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
        if (oracle.saveSettings.numberFormatting == NumberTypes.Scientific)
        {
            if (x > 100) return $"{x:#.##e0}";
            return $"{ms}{Prefix[(int)e]}";
        }

        if (oracle.saveSettings.numberFormatting == NumberTypes.Engineering)
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


    public static string FormatTimeLarge(double time)
    {
        time = Math.Floor(time);

        // Raw
        double days = Math.Floor(time / 86400);
        double hours = Math.Floor(time / 3600);
        double minutes = Math.Floor(time / 60);

        // Converted
        int secondsC = (int)time % 60;
        int minutesC = (int)minutes % 60;
        int hoursC = (int)hours % 24;

        // Strings
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
}