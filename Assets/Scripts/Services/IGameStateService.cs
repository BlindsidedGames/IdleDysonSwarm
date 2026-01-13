using Expansion;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for accessing core game state data.
    /// Abstracts access to save data (InfinityData, PrestigeData, SkillTreeData).
    /// </summary>
    /// <remarks>
    /// This interface replaces direct static access to Oracle.StaticInfinityData, etc.
    /// Benefits:
    /// - Testable: Can mock game state for unit tests
    /// - Decoupled: Presenters don't depend on Oracle singleton
    /// - Flexible: Can swap implementations (e.g., test mode with fake data)
    /// </remarks>
    public interface IGameStateService
    {
        /// <summary>
        /// Gets the main infinity progression data (money, science, facilities, etc.)
        /// </summary>
        DysonVerseInfinityData InfinityData { get; }

        /// <summary>
        /// Gets the prestige progression data (infinity points, prestige upgrades, etc.)
        /// </summary>
        DysonVersePrestigeData PrestigeData { get; }

        /// <summary>
        /// Gets the skill tree data (owned skills, skill levels, etc.)
        /// </summary>
        DysonVerseSkillTreeData SkillTreeData { get; }

        /// <summary>
        /// Gets the prestige plus data (advanced prestige mechanics)
        /// </summary>
        PrestigePlus PrestigePlus { get; }

        /// <summary>
        /// Gets the secret buff state (special progression mechanics)
        /// </summary>
        SecretBuffState Secrets { get; }

        /// <summary>
        /// Gets the save data settings (contains all save data)
        /// </summary>
        SaveDataSettings SaveSettings { get; }
    }
}
