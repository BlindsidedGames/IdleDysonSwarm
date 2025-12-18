using UnityEngine;

namespace MPUIKIT.Editor
{
    public class MPUIKitSettings : ScriptableObject
    {
        [SerializeField] private bool m_SoftMaskSupportInstalled;
        [SerializeField] private string m_SoftMaskCgincLocation;
    }
}