namespace IdleDysonSwarm.Systems.Constants
{
    /// <summary>
    /// Constants for the Quantum Leap system (PrestigePlus/QuantumData).
    /// Quantum Points are earned by converting 42 Infinity Points.
    /// </summary>
    public static class QuantumConstants
    {
        /// <summary>
        /// Number of Infinity Points required to earn 1 Quantum Point.
        /// </summary>
        public const int IPToQuantumConversion = 42;

        /// <summary>
        /// Number of secrets added per purchase (adds to both permanent and session storage).
        /// </summary>
        public const int SecretsPerPurchase = 3;

        /// <summary>
        /// Maximum secrets that can be purchased (27 = 9 purchases * 3 per purchase).
        /// </summary>
        public const int MaxSecrets = 27;

        /// <summary>
        /// Influence speed increase per level purchased (+4 workers/sec each).
        /// </summary>
        public const int InfluenceSpeedPerLevel = 4;

        /// <summary>
        /// Cash bonus percentage per purchase.
        /// </summary>
        public const float CashBonusPerPoint = 0.05f;

        /// <summary>
        /// Science bonus percentage per purchase.
        /// </summary>
        public const float ScienceBonusPerPoint = 0.05f;

        #region Upgrade Costs

        /// <summary>
        /// Cost for basic upgrades (Bot Multitasking, Double IP, Automation, Secrets, Influence, Cash, Science).
        /// </summary>
        public const int BasicUpgradeCost = 1;

        /// <summary>
        /// Cost to unlock Break The Loop (DysonVerse upgrade).
        /// </summary>
        public const int BreakTheLoopCost = 6;

        /// <summary>
        /// Cost to unlock Quantum Entanglement (auto-prestige at 42 IP).
        /// </summary>
        public const int QuantumEntanglementCost = 12;

        /// <summary>
        /// Cost to unlock the Avocado system.
        /// </summary>
        public const int AvocadoCost = 42;

        /// <summary>
        /// Cost for Fragment upgrade.
        /// </summary>
        public const int FragmentCost = 2;

        /// <summary>
        /// Cost for Purity upgrade.
        /// </summary>
        public const int PurityCost = 3;

        /// <summary>
        /// Cost for Terra upgrade.
        /// </summary>
        public const int TerraCost = 2;

        /// <summary>
        /// Cost for Power upgrade.
        /// </summary>
        public const int PowerCost = 2;

        /// <summary>
        /// Cost for Paragade upgrade.
        /// </summary>
        public const int ParagadeCost = 1;

        /// <summary>
        /// Cost for Stellar upgrade.
        /// </summary>
        public const int StellarCost = 4;

        /// <summary>
        /// Cost to unlock Matrioshka Brains mega-structure.
        /// </summary>
        public const int MatrioshkaBrainsCost = 5;

        /// <summary>
        /// Cost to unlock Birch Planets mega-structure.
        /// </summary>
        public const int BirchPlanetsCost = 10;

        /// <summary>
        /// Cost to unlock Galactic Brains mega-structure.
        /// </summary>
        public const int GalacticBrainsCost = 20;

        #endregion
    }
}
