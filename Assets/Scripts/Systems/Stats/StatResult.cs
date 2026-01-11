using System.Collections.Generic;

namespace Systems.Stats
{
    public sealed class StatResult
    {
        public double Value { get; set; }
        public List<Contribution> Contributions { get; } = new List<Contribution>();

        public void Clear()
        {
            Value = 0;
            Contributions.Clear();
        }
    }
}
