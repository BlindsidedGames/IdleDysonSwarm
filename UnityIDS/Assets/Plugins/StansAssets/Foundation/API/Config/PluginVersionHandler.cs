using System;
using System.IO;
using UnityEngine;

namespace SA.Foundation.Config
{
    public class PluginVersionHandler
    {
        readonly string m_filename;
        PluginVersion m_pluginVersion;

        public PluginVersionHandler(string basePath)
        {
            m_filename = basePath + "/pluginVersion.json";
        }

        public string GetVersion()
        {
            return PluginVersion.ToString();
        }

        public void UpgrageMinorVersion()
        {
            PluginVersion.UpgradeMinorVersion();
            Save();
        }

        public void UpgrageMajorVersionIfNeed()
        {
            PluginVersion.UpgradeMajorVersion();
            Save();
        }

        PluginVersion PluginVersion
        {
            get
            {
                if (m_pluginVersion == null)
                {
                    if (File.Exists(m_filename))
                    {
                        var json = string.Empty;
                        try
                        {
                            json = File.ReadAllText(m_filename);
                            m_pluginVersion = JsonUtility.FromJson<PluginVersion>(json);
                        }
                        catch (Exception e)
                        {
                            Debug.LogError(e.Message);
                            Debug.LogError("Failed to red from: " + m_filename + " JSON: " + json);
                            m_pluginVersion = new PluginVersion();
                            throw;
                        }
                    }
                    else
                    {
                        m_pluginVersion = new PluginVersion();
                    }
                }

                return m_pluginVersion;
            }
        }

        void Save()
        {
            File.WriteAllText(m_filename, JsonUtility.ToJson(PluginVersion));
        }

        public bool HasChanges()
        {
            return PluginVersion.MinorVersion > 0;
        }
    }
}
