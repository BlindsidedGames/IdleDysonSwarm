using System.Collections;
using UnityEngine;
using UnityEngine.Pool;

namespace Blindsided.Utilities.ReturnToPool
{
    public class ReturnDeathEffectToPool : MonoBehaviour
    {
        public float duration;
        public IObjectPool<Transform> pool;

        public void ReturnToPool(IObjectPool<Transform> poolToReturnTo)
        {
            pool = poolToReturnTo;
            StartCoroutine(ReturnToPool());
        }

        private IEnumerator ReturnToPool()
        {
            yield return new WaitForSeconds(duration);
            pool.Release(transform);
        }
    }
}