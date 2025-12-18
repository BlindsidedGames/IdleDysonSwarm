using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Patterns;

namespace SA.Foundation.Editor
{
    public abstract class SA_PluginInstallationProcessor<T> where T : SA_ScriptableSettings
    {
        SA_ScriptableSettings m_PluginSettings;
        SA_PluginFirstInstallInfo m_PluginFirstInstallInfo;

        public void Init()
        {
            SA_ScriptableSettings pluginSettings = ScriptableObject.CreateInstance<T>();

            m_PluginSettings = pluginSettings;
            var version = m_PluginSettings.GetFormattedVersion();

            var key = pluginSettings.GetType().Name + "_instalation_info";

            m_PluginFirstInstallInfo = null;
            if (EditorPrefs.HasKey(key))
            {
                var json = EditorPrefs.GetString(key);
                m_PluginFirstInstallInfo = JsonUtility.FromJson<SA_PluginFirstInstallInfo>(json);
            }

            if (m_PluginFirstInstallInfo == null)
            {
                m_PluginFirstInstallInfo = new SA_PluginFirstInstallInfo(version);
                m_PluginFirstInstallInfo.SetCurrentVersion(version);
                UpdateVersionInfo(key, pluginSettings, m_PluginFirstInstallInfo);
            }
            else
            {
                if (!m_PluginFirstInstallInfo.CurrentVersion.Equals(version))
                {
                    m_PluginFirstInstallInfo.SetCurrentVersion(version);
                    UpdateVersionInfo(key, pluginSettings, m_PluginFirstInstallInfo);
                }
            }
        }

        void UpdateVersionInfo(string key, SA_ScriptableSettings settings, SA_PluginFirstInstallInfo info)
        {
            var json = JsonUtility.ToJson(info);
            EditorPrefs.SetString(key, json);
            OnInstall();
        }

        public SA_PluginFirstInstallInfo PluginFirstInstallInfo => m_PluginFirstInstallInfo;

        protected abstract void OnInstall();
    }
}
