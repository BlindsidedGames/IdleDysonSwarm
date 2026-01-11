using System.Collections.Generic;
using Systems.Stats;

namespace Systems.Facilities
{
    public sealed class FacilityBreakdown
    {
        public FacilityBreakdown(string facilityId)
        {
            FacilityId = facilityId;
        }

        public string FacilityId { get; }
        public double FinalValue { get; set; }
        public List<Contribution> Contributions { get; } = new List<Contribution>();
    }
}
