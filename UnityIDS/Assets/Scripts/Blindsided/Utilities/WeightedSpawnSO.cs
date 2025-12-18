using UnityEngine;

namespace Blindsided.Utilities
{
    [CreateAssetMenu(fileName = "WeightedSpawnConfig", menuName = "SO/Weight")]
    public class WeightedSpawnSO : ScriptableObject
    {
        public int obj;

        public Transform prefab;

        [Range(0, 1)] public double MinWeight;

        [Range(0, 1)] public double MaxWeight;

        public float GetWeight() => Random.Range((float)MinWeight, (float)MaxWeight);

        public void SetWeight(float min, float max)
        {
            MinWeight = min;
            MaxWeight = max;
        }
    }
}