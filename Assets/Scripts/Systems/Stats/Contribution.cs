using System;

namespace Systems.Stats
{
    [Serializable]
    public struct Contribution
    {
        public string SourceId;
        public string SourceName;
        public StatOperation Operation;
        public double Value;
        public double Delta;
        public string ConditionText;
        public int Order;
    }
}
