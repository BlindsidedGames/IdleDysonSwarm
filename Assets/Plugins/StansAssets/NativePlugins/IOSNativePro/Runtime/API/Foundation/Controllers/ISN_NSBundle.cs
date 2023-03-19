using System;
using UnityEngine;
#if UNITY_IPHONE || UNITY_TVOS
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Foundation
{
    /// <summary>
    /// Apple uses bundles to represent apps, frameworks, plug-ins, and many other specific types of content.
    /// Bundles organize their contained resources into well-defined subdirectories,
    /// and bundle structures vary depending on the platform and the type of the bundle.
    /// By using a bundle object, you can access a bundle's resources without knowing the structure of the bundle.
    /// The bundle object provides a single interface for locating items,
    /// taking into account the bundle structure, user preferences, available localizations,
    /// and other relevant factors.
    /// </summary>
    [Serializable]
    public class ISN_NSBundle
    {
        [SerializeField]
        string m_PreferredLocalization = string.Empty;
        [SerializeField]
        string m_DevelopmentLocalization = string.Empty;

#if UNITY_IPHONE || UNITY_TVOS
        [DllImport("__Internal")]
        static extern bool _ISN_NS_IsRunningInAppStoreEnvironment();

        [DllImport("__Internal")]
        static extern string _ISN_NS_GetBuildInfo();

        [DllImport("__Internal")]
        static extern string _ISN_NS_GetMainBundle();
#endif

        /// <summary>
        /// language ID according to the user's language preferences and available localizations.
        /// </summary>
        public string PreferredLocalization => m_PreferredLocalization;

        /// <summary>
        /// The localization for the development language.
        /// This property corresponds to the value in the CFBundleDevelopmentRegion key of the bundle’s property list (Info.plist).
        /// </summary>
        public string DevelopmentLocalization => m_DevelopmentLocalization;

        /// <summary>
        /// Returns the bundle object that contains the current executable.
        ///
        /// The NSBundle object corresponding to the bundle directory that contains the current executable.
        /// This method may return a valid bundle object even for unbundled apps.
        /// It may also return nil if the bundle object could not be created, so always check the return value.
        ///
        /// The main bundle lets you access the resources in the same directory as the currently running executable.
        /// For a running app, the main bundle offers access to the app’s bundle directory.
        /// For code running in a framework, the main bundle offers access to the framework’s bundle directory.
        /// </summary>
        public static ISN_NSBundle MainBundle
        {
            get
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                var data = _ISN_NS_GetMainBundle();
                return JsonUtility.FromJson<ISN_NSBundle>(data);
#else
                var bundle = new ISN_NSBundle
                {
                    m_PreferredLocalization = "en",
                    m_DevelopmentLocalization = "en"
                };
                return bundle;
#endif
            }
        }

        /// <summary>
        /// Gets a value indicating whether this application is running in AppStore environment.
        /// </summary>
        public static bool IsRunningInAppStoreEnvironment
        {
            get
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                    return _ISN_NS_IsRunningInAppStoreEnvironment();
#else
                return false;
#endif
            }
        }

        /// <summary>
        /// Gets the information about current build
        /// </summary>
        public static ISN_NSBuildInfo BuildInfo
        {
            get
            {
#if (UNITY_IPHONE || UNITY_TVOS) && !UNITY_EDITOR
                    string data = _ISN_NS_GetBuildInfo();
                    return JsonUtility.FromJson<ISN_NSBuildInfo>(data);
#else
                return new ISN_NSBuildInfo();
#endif
            }
        }
    }
}
