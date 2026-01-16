using UnityEngine;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Simple component that updates the offline time fill bar.
/// </summary>
public class OfflineTimeFillBar : MonoBehaviour
{
    private GameObject _fillBarObject;
    private SlicedFilledImage _fillBar;

    /// <summary>
    /// Sets UI references from a SidePanelReferences component.
    /// Called by SidePanelController when switching between panel variants.
    /// </summary>
    public void SetReferences(SidePanelReferences refs)
    {
        if (refs == null) return;

        _fillBarObject = refs.offlineTimeFillBarObject;
        CacheComponents();
    }

    private void CacheComponents()
    {
        _fillBar = null;
        if (_fillBarObject != null)
            _fillBar = _fillBarObject.GetComponent<SlicedFilledImage>();
    }

    private void Update()
    {
        if (_fillBar != null)
            _fillBar.fillAmount = (float)(oracle.saveSettings.offlineTime / oracle.saveSettings.maxOfflineTime);
    }
}
