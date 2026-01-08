using UnityEngine;
using UnityEngine.UI;

namespace Blindsided.Utilities
{
    public class SetAlphaHitThreshold : MonoBehaviour
    {
        private void Start()
        {
            //GetComponent<Button>().onClick.AddListener(() => Debug.Log($"Hi I was clicked? {transform.position}"));
            GetComponent<Image>().alphaHitTestMinimumThreshold = 0.5f;
        }
    }
}