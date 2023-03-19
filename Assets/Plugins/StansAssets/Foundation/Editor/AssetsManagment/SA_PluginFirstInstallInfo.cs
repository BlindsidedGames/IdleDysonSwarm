using System;
using StansAssets.Foundation;
using UnityEngine;

namespace SA.Foundation.Editor
{
    [Serializable]
    public class SA_PluginFirstInstallInfo
    {
        [SerializeField]
        string m_firstVersion = string.Empty;
        [SerializeField]
        string m_currentVersion = string.Empty;
        [SerializeField]
        long m_time;

        public SA_PluginFirstInstallInfo(string firstVersion)
        {
            m_firstVersion = firstVersion;

            m_time = TimeUtility.ToUnixTime(DateTime.Now);
        }

        public void SetCurrentVersion(string version)
        {
            m_currentVersion = version;
        }

        public string Version
        {
            get
            {
                if (string.IsNullOrEmpty(m_currentVersion)) return string.Empty;

                return m_firstVersion;
            }
        }

        public DateTime Time => TimeUtility.FromUnixTime(m_time);

        public string CurrentVersion
        {
            get
            {
                if (string.IsNullOrEmpty(m_currentVersion)) return string.Empty;
                return m_currentVersion;
            }
        }
    }
}
