using Expansion;
using Buildings;
using Systems;
using static Expansion.Oracle;

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

        /// <summary>
        /// Gets or sets the current science currency
        /// </summary>
        double Science { get; set; }

        /// <summary>
        /// Gets the current research buy mode (Buy1, Buy10, Buy50, Buy100, BuyMax)
        /// </summary>
        BuyMode ResearchBuyMode { get; }

        /// <summary>
        /// Gets whether rounded bulk buying is enabled
        /// </summary>
        bool RoundedBulkBuy { get; }

        /// <summary>
        /// Gets the current research level for a given research ID
        /// </summary>
        double GetResearchLevel(string researchId);

        /// <summary>
        /// Sets the research level for a given research ID
        /// </summary>
        void SetResearchLevel(string researchId, double level);
    }
}
