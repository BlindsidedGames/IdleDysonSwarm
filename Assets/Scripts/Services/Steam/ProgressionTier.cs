// ProgressionTier.cs
// Defines the player's current progression stage for Steam Rich Presence

namespace IdleDysonSwarm.Services.Steam
{
    /// <summary>
    /// Represents the player's current progression tier.
    /// Used to determine appropriate Rich Presence display format.
    /// </summary>
    public enum ProgressionTier
    {
        /// <summary>No prestige yet - early game.</summary>
        EarlyGame,

        /// <summary>Has infinity points, no quantum yet.</summary>
        Infinity,

        /// <summary>Has quantum points, reality not unlocked.</summary>
        Quantum,

        /// <summary>Reality layer unlocked, avocado not unlocked.</summary>
        Reality,

        /// <summary>Avocado system unlocked - late game.</summary>
        Avocado
    }
}
