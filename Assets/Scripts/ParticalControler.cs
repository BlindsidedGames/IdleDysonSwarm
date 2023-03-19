using UnityEngine;
using UnityEngine.UI;

public class ParticalControler : MonoBehaviour
{
    [SerializeField] private Slider _slider;
    [SerializeField] private float sandboxLifetime = 10f;
    private ParticleSystem ps;

    private void Start()
    {
        ps = GetComponent<ParticleSystem>();
        _slider.value = 10;
    }


    private void Update()
    {
        var emissionModule = ps.emission;
        var mainModule = ps.main;
        mainModule.startLifetime = sandboxLifetime;

        _slider.maxValue = 60000 / sandboxLifetime;
        emissionModule.rateOverTime = _slider.value;
    }
}