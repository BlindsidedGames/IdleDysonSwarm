namespace IdleDysonSwarm.UI.Simulation
{
    /// <summary>
    /// Defines the behavior pattern for a simulation panel.
    /// Each type determines which UI elements are active, button text, and fill bar behavior.
    /// </summary>
    public enum SimulationPanelType
    {
        /// <summary>
        /// Production building with "+" buy button and single fill bar.
        /// Used by: Hunters, Gatherers
        /// </summary>
        ProductionBasic,

        /// <summary>
        /// Production building with "Boost" button and dual fill bars (progress + boost timer).
        /// Used by: Community, Factories
        /// </summary>
        ProductionBoost,

        /// <summary>
        /// Conversion building with dual fill bars showing conversion progress (e.g., "X/10").
        /// No button. Used by: Housing (10→Village), Villages (25→City)
        /// </summary>
        ConversionDual,

        /// <summary>
        /// Simple display building with single fill bar, no button.
        /// Used by: Workers, Cities
        /// </summary>
        ConversionDisplay,

        /// <summary>
        /// Research with "Start" button that fills to completion.
        /// Used by: Engineering, Shipping, WorldTrade, WorldPeace, Mathematics, AdvancedPhysics
        /// </summary>
        LinearResearch,

        /// <summary>
        /// Production building with no button, single fill bar with timer.
        /// Used by: Bots
        /// </summary>
        InfoEraProduction,

        /// <summary>
        /// Display panel showing conversion rate (e.g., "X Factories/s").
        /// Used by: Rockets
        /// </summary>
        RocketDisplay,

        /// <summary>
        /// Energy generator with "+" buy button and on/off fill indicator.
        /// Used by: Solar Panels, Fusion Generators
        /// </summary>
        EnergyGenerator,

        /// <summary>
        /// Space factory with dual fill bars (progress + inventory cap like "X/100").
        /// No button. Used by: SpaceFactories
        /// </summary>
        SpaceFactoryCap,

        /// <summary>
        /// Railgun with dual fill bars (firing progress + energy charge).
        /// No button. Used by: Railguns
        /// </summary>
        RailgunDual,

        /// <summary>
        /// Swarm stats display with "Black Hole" button and progress bar.
        /// Used by: SwarmStats
        /// </summary>
        SwarmStats
    }
}
