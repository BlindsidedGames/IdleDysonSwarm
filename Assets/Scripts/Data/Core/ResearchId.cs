using UnityEngine;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Strongly-typed identifier for research types.
    /// </summary>
    /// <remarks>
    /// Research: moneyMultiplier, scienceBoost, assemblyLineUpgrade, panelLifetime1, etc.
    ///
    /// Usage in MonoBehaviour:
    /// [SerializeField] private ResearchId researchId;
    ///
    /// Usage in ScriptableObject:
    /// [SerializeField] private ResearchId _id;
    /// public ResearchId Id => _id;
    /// </remarks>
    [CreateAssetMenu(
        fileName = "NewResearchId",
        menuName = "Idle Dyson Swarm/IDs/Research ID",
        order = 102
    )]
    public sealed class ResearchId : GameId
    {
        // Inherits all functionality from GameId
        // Type distinction prevents accidentally using SkillId where ResearchId is expected
    }
}
