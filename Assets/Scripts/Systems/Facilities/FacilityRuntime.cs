using System.Collections.Generic;
using GameData;
using Systems.Stats;

namespace Systems.Facilities
{
    public sealed class FacilityRuntime
    {
        public FacilityRuntime(FacilityDefinition definition, FacilityState state)
        {
            Definition = definition;
            State = state;
            Breakdown = new FacilityBreakdown(definition != null ? definition.id : string.Empty);
        }

        public FacilityDefinition Definition { get; }
        public FacilityState State { get; }
        public FacilityBreakdown Breakdown { get; }

        public void RecalculateProduction(double baseValue, IReadOnlyList<StatEffect> effects)
        {
            if (Definition == null) return;

            StatResult result = StatCalculator.Calculate(baseValue, effects);
            State.ProductionRate = result.Value;

            Breakdown.FinalValue = result.Value;
            Breakdown.Contributions.Clear();
            Breakdown.Contributions.AddRange(result.Contributions);
        }
    }
}
