using UnityEngine;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Strongly-typed identifier for facility types.
    /// </summary>
    /// <remarks>
    /// Facilities: assembly_lines, ai_managers, servers, data_centers, planets
    ///
    /// Usage in MonoBehaviour:
    /// [SerializeField] private FacilityId facilityId;
    ///
    /// Usage in ScriptableObject:
    /// [SerializeField] private FacilityId _id;
    /// public FacilityId Id => _id;
    /// </remarks>
    [CreateAssetMenu(
        fileName = "NewFacilityId",
        menuName = "Idle Dyson Swarm/IDs/Facility ID",
        order = 100
    )]
    public sealed class FacilityId : GameId
    {
        // Inherits all functionality from GameId
        // Type distinction prevents accidentally using SkillId where FacilityId is expected
    }
}
