using UnityEngine;
using SA.Foundation.Config;
using SA.Foundation.UtilitiesEditor;

namespace SA.Foundation.Patterns
{
    /// <summary>
    /// This class simplifies a singleton pattern implementation,
    /// that can be used with classes extended from a ScriptableObject
    /// Once instance is found or created gameobject will be marked as DontDestroyOnLoad
    /// </summary>
    public abstract class SA_ScriptableSingleton<T> : SA_ScriptableSettings where T : SA_ScriptableSettings
    {
        static T s_instance = null;

        public static string FormattedVersion => Instance.GetFormattedVersion();

        public static PluginVersionHandler PluginVersion => Instance.GetPluginVersion();

        /// <summary>
        /// Returns a singleton class instance
        /// If current instance is not assigned it will try to find an object of the instance type,
        /// in case instance already exists in a project. If not, new instance will be created, 
        /// and saved under a <see cref="SA_Config.StansAssetsSettingsPath"/>  location
        /// </summary>
        public static T Instance
        {
            get
            {
                if (s_instance == null)
                {
                    s_instance = Resources.Load(typeof(T).Name) as T;
                    if (s_instance == null)
                    {
                        s_instance = CreateInstance<T>();
                        SaveToAssetDatabase(s_instance);
                    }
                }

                return s_instance;
            }
        }

        /// <summary>
        /// Saves instance to an editor database
        /// </summary>
        public static void Save()
        {
            /*
            UnityEditor.Undo.IncrementCurrentGroup();
            UnityEditor.Undo.RegisterCompleteObjectUndo(Instance, typeof(T).Name);
            UnityEditor.Undo.CollapseUndoOperations(UnityEditor.Undo.GetCurrentGroup());
            */
#if UNITY_EDITOR
            //TODO use Undo
            UnityEditor.EditorUtility.SetDirty(Instance);
#endif
        }

        /// <summary>
        /// Gets the settings version. 
        /// </summary>
        public static string Version => Instance.LastVersionCode;

        /// <summary>
        /// Method will update and save version code
        /// Retruns <c>true</c> in case version was update and <c>false</c> if version remained the same.
        /// This method is ment to be used for an internal version check, to findout if plugin was updated to a new version
        /// and run the nessesary actions
        /// </summary>
        public static bool UpdateVersion(string vercioncCode)
        {
            if (string.IsNullOrEmpty(Version))
            {
                Instance.LastVersionCode = vercioncCode;
                Save();
                return true;
            }

            if (!Version.Equals(vercioncCode))
            {
                Instance.LastVersionCode = vercioncCode;
                Save();
                return true;
            }
            else
            {
                return false;
            }
        }

        /// <summary>
        /// Delete's asset instance
        /// </summary>
        public static void Delete()
        {
            var path = SA_AssetDatabase.GetAssetPath(Instance);
            SA_AssetDatabase.DeleteAsset(path);
        }

        static void SaveToAssetDatabase(T asset)
        {
            SA_AssetDatabase.CreateAsset(asset, SA_Config.StansAssetsSettingsPath + asset.GetType().Name + ".asset");
        }
    }
}
