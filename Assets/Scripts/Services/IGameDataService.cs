using GameData;
using IdleDysonSwarm.Data;
using Systems.Facilities;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for accessing game definition data (facilities, skills, research, effects).
    /// Abstracts access to GameDataRegistry.
    /// </summary>
    /// <remarks>
    /// This interface wraps GameDataRegistry to provide:
    /// - Dependency injection support
    /// - Testability with mock definitions
    /// - Consistent API for data access
    /// </remarks>
    public interface IGameDataService
    {
        /// <summary>
        /// Attempts to get a facility definition by ID.
        /// </summary>
        /// <param name="id">The facility ID (string or FacilityId asset)</param>
        /// <param name="definition">The facility definition if found</param>
        /// <returns>True if the facility was found, false otherwise</returns>
        bool TryGetFacility(string id, out FacilityDefinition definition);

        /// <summary>
        /// Attempts to get a facility definition by typed ID.
        /// </summary>
        bool TryGetFacility(FacilityId id, out FacilityDefinition definition);

        /// <summary>
        /// Attempts to get a skill definition by ID.
        /// </summary>
        /// <param name="id">The skill ID (string or SkillId asset)</param>
        /// <param name="definition">The skill definition if found</param>
        /// <returns>True if the skill was found, false otherwise</returns>
        bool TryGetSkill(string id, out SkillDefinition definition);

        /// <summary>
        /// Attempts to get a skill definition by typed ID.
        /// </summary>
        bool TryGetSkill(SkillId id, out SkillDefinition definition);

        /// <summary>
        /// Attempts to get a research definition by ID.
        /// </summary>
        /// <param name="id">The research ID (string or ResearchId asset)</param>
        /// <param name="definition">The research definition if found</param>
        /// <returns>True if the research was found, false otherwise</returns>
        bool TryGetResearch(string id, out ResearchDefinition definition);

        /// <summary>
        /// Attempts to get a research definition by typed ID.
        /// </summary>
        bool TryGetResearch(ResearchId id, out ResearchDefinition definition);

        /// <summary>
        /// Attempts to get an effect definition by ID.
        /// </summary>
        /// <param name="id">The effect ID</param>
        /// <param name="definition">The effect definition if found</param>
        /// <returns>True if the effect was found, false otherwise</returns>
        bool TryGetEffect(string id, out EffectDefinition definition);
    }
}
