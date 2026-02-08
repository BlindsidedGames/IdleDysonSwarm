using UnityEngine;
using Blindsided.ProceduralUIImage;
using Blindsided.Utilities;
using static Expansion.Oracle;

/// <summary>
/// Simple component that updates the offline time fill bar.
/// </summary>
public class OfflineTimeFillBar : MonoBehaviour
{
    private GameObject _fillBarObject;
    private ProceduralUIImage _fillBarProcedural;
    private SlicedFilledImage _fillBarSliced;

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
        _fillBarProcedural = null;
        _fillBarSliced = null;
        if (_fillBarObject != null)
        {
            _fillBarProcedural = _fillBarObject.GetComponent<ProceduralUIImage>();
            if (_fillBarProcedural == null)
                _fillBarSliced = _fillBarObject.GetComponent<SlicedFilledImage>();
        }
    }

    private void Update()
    {
        if (_fillBarProcedural == null && _fillBarSliced == null) return;

        float fill = (float)(oracle.saveSettings.offlineTime / oracle.saveSettings.maxOfflineTime);
        if (_fillBarProcedural != null) _fillBarProcedural.fillAmount = fill;
        else if (_fillBarSliced != null) _fillBarSliced.fillAmount = fill;
    }
}
