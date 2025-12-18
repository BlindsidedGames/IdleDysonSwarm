using UnityEngine;

namespace StansAssets.Plugins
{
    /// <summary>
    /// Base class for the plugin settings.
    /// </summary>
    public abstract class PackageScriptableSettings : ScriptableObject
    {
        /// <summary>
        /// Plugin package name.
        /// </summary>
        public abstract string PackageName { get; }

        /// <summary>
        /// Plugin settings folder path.
        /// </summary>
        public virtual string SettingsFolderPath
        {
            get
            {
                var folderPath = $"{PackagesConfig.SettingsPath}/{PackageName}";
                if (IsEditorOnly)
                {
                    folderPath += "/Editor";
                }

                folderPath += "/Resources";
                return folderPath;
            }
        }

        /// <summary>
        /// Plugin settings file path.
        /// </summary>
        public virtual string SettingsFilePath => $"{SettingsFolderPath}/{SettingsFileName}.asset";

        /// <summary>
        /// Settings file name.
        /// </summary>
        public virtual string SettingsFileName => GetType().Name;

        protected virtual bool IsEditorOnly => false;
    }
}
