using UnityEngine;
using StansAssets.IOS.XCode;
using System;

namespace SA.iOS.Editor
{
    [Serializable]
    class ISN_ExportedSettings
    {
        public string ISNSettings => m_ISNSettings;

        public string ISDSettings => m_ISDSettings;

        [SerializeField]
        string m_ISNSettings;
        [SerializeField]
        string m_ISDSettings;

        public ISN_ExportedSettings()
        {
            m_ISNSettings = JsonUtility.ToJson(ISN_Settings.Instance);
            m_ISDSettings = JsonUtility.ToJson(XCodeProjectSettings.Instance);
        }
    }
}
