using UnityEngine;
using SA.Foundation.Patterns;
using StansAssets.Foundation.Patterns;

namespace SA.iOS.Utilities
{
    abstract class ISN_Singleton<T> : MonoSingleton<T> where T : MonoBehaviour
    {
        protected override void Awake()
        {
            DontDestroyOnLoad(gameObject);
            gameObject.transform.SetParent(ISN_Services.Parent);
        }
    }
}
