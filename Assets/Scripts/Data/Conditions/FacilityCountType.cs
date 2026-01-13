namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which facility count to evaluate in conditions.
    /// </summary>
    public enum FacilityCountType
    {
        /// <summary>Total count (auto + manual).</summary>
        Total,

        /// <summary>Only manually purchased facilities.</summary>
        ManualOnly,

        /// <summary>Only auto-purchased facilities.</summary>
        AutoOnly
    }
}
