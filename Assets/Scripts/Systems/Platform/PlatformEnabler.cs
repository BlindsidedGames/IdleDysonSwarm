using System.Collections.Generic;
using Sirenix.OdinInspector;
using UnityEngine;

/// <summary>
/// Enables or disables GameObjects based on the current platform.
/// Attach to any GameObject and configure which platforms should toggle the target objects.
/// </summary>
public class PlatformEnabler : MonoBehaviour
{
    [Title("Platform Settings")]
    [InfoBox("Select which platforms should trigger the toggle. Objects will be set active/inactive based on the toggle state when running on a matching platform.")]

    [HorizontalGroup("Platforms", 0.33f)]
    [ToggleLeft, LabelText("Android")]
    [SerializeField] private bool _enableOnAndroid;

    [HorizontalGroup("Platforms")]
    [ToggleLeft, LabelText("iOS")]
    [SerializeField] private bool _enableOnIOS;

    [HorizontalGroup("Platforms")]
    [ToggleLeft, LabelText("Desktop")]
    [SerializeField] private bool _enableOnDesktop;

    [Title("Toggle Settings")]
    [InfoBox("When ON: Objects are activated on matching platforms.\nWhen OFF: Objects are deactivated on matching platforms.")]
    [ToggleLeft, LabelText("Set Active State")]
    [SerializeField] private bool _setActiveState = true;

    [Title("Target Objects")]
    [ListDrawerSettings(ShowFoldout = true, DraggableItems = true)]
    [SerializeField] private List<GameObject> _targetObjects = new List<GameObject>();

    private void Start()
    {
        ApplyPlatformState();
    }

    private void ApplyPlatformState()
    {
        bool shouldApply = IsPlatformMatch();

        if (shouldApply)
        {
            SetObjectsActive(_setActiveState);
        }
    }

    private bool IsPlatformMatch()
    {
#if UNITY_ANDROID
        return _enableOnAndroid;
#elif UNITY_IOS
        return _enableOnIOS;
#elif UNITY_STANDALONE || UNITY_EDITOR
        return _enableOnDesktop;
#else
        return false;
#endif
    }

    private void SetObjectsActive(bool active)
    {
        foreach (var obj in _targetObjects)
        {
            if (obj != null)
            {
                obj.SetActive(active);
            }
        }
    }

#if UNITY_EDITOR
    [Title("Editor Testing")]
    [Button("Preview Android"), HorizontalGroup("Preview")]
    private void PreviewAndroid()
    {
        if (_enableOnAndroid) SetObjectsActive(_setActiveState);
        else SetObjectsActive(!_setActiveState);
    }

    [Button("Preview iOS"), HorizontalGroup("Preview")]
    private void PreviewIOS()
    {
        if (_enableOnIOS) SetObjectsActive(_setActiveState);
        else SetObjectsActive(!_setActiveState);
    }

    [Button("Preview Desktop"), HorizontalGroup("Preview")]
    private void PreviewDesktop()
    {
        if (_enableOnDesktop) SetObjectsActive(_setActiveState);
        else SetObjectsActive(!_setActiveState);
    }

    [Button("Reset Objects")]
    private void ResetObjects()
    {
        SetObjectsActive(true);
    }
#endif
}
