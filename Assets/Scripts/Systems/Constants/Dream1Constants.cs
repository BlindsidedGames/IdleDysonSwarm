namespace IdleDysonSwarm.Systems.Constants
{
    /// <summary>
    /// Constants for the Dream1 simulation system.
    /// Note: Many Dream1 values are stored in SaveDataDream1 or serialized fields.
    /// These constants are for values that appear as magic numbers in code.
    /// </summary>
    public static class Dream1Constants
    {
        #region Space Age

        /// <summary>
        /// Base number of Dyson Panels required to fire the railgun.
        /// Multiplied by doubleTimeRate when DoubleTime is active.
        /// </summary>
        public const int RailgunBasePanelsRequired = 10;

        /// <summary>
        /// Maximum Dyson Panel inventory before production halts.
        /// </summary>
        public const int DysonPanelCap = 1000;

        #endregion

        #region Bots

        /// <summary>
        /// Bots soft-start threshold. Below this count, rocket production
        /// is multiplied by (bots/100) creating a ramp-up effect.
        /// This is intentional game design, not a bug.
        /// </summary>
        public const int BotsSoftStartThreshold = 100;

        #endregion
    }
}
