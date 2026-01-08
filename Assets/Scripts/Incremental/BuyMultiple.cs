using System;
using UnityEngine;

public static class BuyMultiple
{
    /// <summary>
    ///     n = numberToBuy, c = Currency, b = Base Cost, m = Cost Multiplier, L = Current Level
    /// </summary>
    public static double BuyX(double n, double b, double m, double l)
    {
        var Cn = b * Math.Pow(m, l) * ((Math.Pow(m, n) - 1) / (m - 1));

        return Cn;
    }

    /// <summary>
    ///     c = Currency, b = Base Cost, m = Cost Multiplier, L = Current Level
    /// </summary>
    public static int MaxAffordable(double c, double b, double m, double l)
    {
        var n = Math.Floor(Math.Log(c * (m - 1f) / (b * Math.Pow(m, l)) + 1, m));
        return (int)n;
    }
}