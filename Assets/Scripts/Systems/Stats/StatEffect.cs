using System;

namespace Systems.Stats
{
    [Serializable]
    public struct StatEffect
    {
        public string Id;
        public string SourceName;
        public string TargetStatId;
        public StatOperation Operation;
        public double Value;
        public int Order;
        public string ConditionId;

        public bool AppliesTo(string statId)
        {
            return !string.IsNullOrEmpty(TargetStatId) && TargetStatId == statId;
        }
    }
}
