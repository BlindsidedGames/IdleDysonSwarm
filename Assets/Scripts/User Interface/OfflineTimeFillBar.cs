using UnityEngine;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Simple component that updates the offline time fill bar.
/// </summary>
public class OfflineTimeFillBar : MonoBehaviour
{
    [SerializeField] private GameObject _fillBarObject;

    private SlicedFilledImage _fillBar;

    private void Awake()
    {
        if (_fillBarObject != null)
            _fillBar = _fillBarObject.GetComponent<SlicedFilledImage>();
    }

    private void Update()
    {
        if (_fillBar != null)
            _fillBar.fillAmount = (float)(oracle.saveSettings.offlineTime / oracle.saveSettings.maxOfflineTime);
    }
}
