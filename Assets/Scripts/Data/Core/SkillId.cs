using UnityEngine;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Strongly-typed identifier for skill types.
    /// </summary>
    /// <remarks>
    /// Skills: manualLabour, assemblyLineTree, rule34, pocketDimensions, etc.
    ///
    /// Usage in MonoBehaviour:
    /// [SerializeField] private SkillId skillId;
    ///
    /// Usage in ScriptableObject:
    /// [SerializeField] private SkillId _id;
    /// public SkillId Id => _id;
    /// </remarks>
    [CreateAssetMenu(
        fileName = "NewSkillId",
        menuName = "Idle Dyson Swarm/IDs/Skill ID",
        order = 101
    )]
    public sealed class SkillId : GameId
    {
        // Inherits all functionality from GameId
        // Type distinction prevents accidentally using FacilityId where SkillId is expected
    }
}
