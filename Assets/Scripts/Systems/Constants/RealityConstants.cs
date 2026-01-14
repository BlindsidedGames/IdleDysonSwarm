namespace IdleDysonSwarm.Systems.Constants
{
    /// <summary>
    /// Constants for the Reality system (Universe/Influence/Workers).
    /// Workers generate influence which feeds into Dream1 and Avocado.
    /// </summary>
    public static class RealityConstants
    {
        /// <summary>
        /// Number of workers in a batch before they can be gathered.
        /// </summary>
        public const int WorkerBatchSize = 128;

        /// <summary>
        /// Base worker generation speed (workers per second) before upgrades.
        /// </summary>
        public const int BaseWorkerGenerationSpeed = 4;

        /// <summary>
        /// Minimum value for Avocado accumulators before Log10 multiplier applies.
        /// Values below this threshold contribute 0 to the multiplier.
        /// </summary>
        public const int AvocadoLogThreshold = 10;
    }
}
