using System;

namespace Systems.Facilities
{
    [Serializable]
    public sealed class FacilityState
    {
        public string FacilityId;
        public double ManualOwned;
        public double AutoOwned;
        public double EffectiveCount;
        public double ProductionRate;
    }
}
