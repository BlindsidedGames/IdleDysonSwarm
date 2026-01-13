using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Specifies which worker type to check.
    /// </summary>
    public enum WorkerType
    {
        /// <summary>Total bots.</summary>
        Bots,

        /// <summary>Workers (money producers).</summary>
        Workers,

        /// <summary>Researchers (science producers).</summary>
        Researchers
    }

    /// <summary>
    /// Condition that checks if worker/bot count meets a threshold.
    /// Replaces conditions like "workers_gt_1" or "researchers_gt_1".
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Worker Count")]
    public sealed class WorkerCountCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The worker type to check.")]
        private WorkerType _workerType = WorkerType.Workers;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterThan;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private double _threshold = 1;

        public override bool Evaluate(EffectContext context)
        {
            if (context.InfinityData == null)
                return false;

            double count = GetWorkerCount(context);
            return _operator.Compare(count, _threshold);
        }

        private double GetWorkerCount(EffectContext context)
        {
            var infinityData = context.InfinityData;
            if (infinityData == null)
                return 0;

            return _workerType switch
            {
                WorkerType.Bots => infinityData.bots,
                WorkerType.Workers => infinityData.workers,
                WorkerType.Researchers => infinityData.researchers,
                _ => 0
            };
        }

        protected override string GenerateDescription()
        {
            return $"{_workerType} {_operator.ToSymbol()} {_threshold:N0}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            double count = GetWorkerCount(context);
            bool conditionMet = _operator.Compare(count, _threshold);
            return $"Current: {count:N0} ({(conditionMet ? "MET" : "NOT MET")})";
        }
    }
}
