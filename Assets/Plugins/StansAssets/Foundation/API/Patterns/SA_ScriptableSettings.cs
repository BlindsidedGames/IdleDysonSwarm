using UnityEngine;
using SA.Foundation.Config;

namespace SA.Foundation.Patterns
{
    public abstract class SA_ScriptableSettings : ScriptableObject
    {
        const int k_ReleaseYear = 2021;
        public string LastVersionCode = string.Empty;
        protected abstract string BasePath { get; }

        PluginVersionHandler m_PluginVersion;

        public PluginVersionHandler GetPluginVersion()
        {
            if (m_PluginVersion == null) m_PluginVersion = new PluginVersionHandler(BasePath);
            return m_PluginVersion;
        }

        public string GetFormattedVersion()
        {
            return $"{k_ReleaseYear}.{GetPluginVersion().GetVersion()}";
        }

        public abstract string PluginName { get; }
        public abstract string DocumentationURL { get; }
        public abstract string SettingsUIMenuItem { get; }
    }
}
