using UnityEngine;
using Blindsided.Utilities;

public class LoadingBarScript : MonoBehaviour
{
    [SerializeField] private SlicedFilledImage fill;
    [SerializeField] private float maxTime = 10f;
    private float time;

    private void Start()
    {
        time = 0;
    }


    private void Update()
    {
        time += Time.deltaTime;
        fill.fillAmount = time / maxTime;
    }
}
