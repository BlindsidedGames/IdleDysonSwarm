using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor.Build;
using UnityEditor;
using SA.Foundation.Utility;
using StansAssets.IOS.XCode;
#if UNITY_2018_1_OR_NEWER
using UnityEditor.Build.Reporting;

#endif

namespace SA.iOS
{
#if UNITY_2018_1_OR_NEWER
    class ISN_Preprocessor : IPreprocessBuildWithReport
#else
    class ISN_Preprocessor : IPreprocessBuild
#endif
    {
        //--------------------------------------
        // Static
        //--------------------------------------

        public static void Resolve(bool forced = false)
        {
            Refresh();
            foreach (var resolver in Resolvers)
                resolver.Run();

            foreach (var resolver in Resolvers)
                resolver.RunAdditionalPreprocess();
        }

        public static void DropToDefault()
        {
            ISN_Settings.Delete();
            var xcodeSettings= AssetDatabase.GetAssetPath(XCodeProjectSettings.Instance);
            AssetDatabase.DeleteAsset(xcodeSettings);

            //Looks like a unity bug.
            //As always let's use the delay call magic
            EditorApplication.delayCall += () =>
            {
                EditorApplication.delayCall += () =>
                {
                    Refresh();
                    Resolve(true);
                };
            };
        }

        public static void Refresh()
        {
            s_Resolvers = null;
        }

        public static T GetResolver<T>() where T : ISN_APIResolver
        {
            return (T)GetResolver(typeof(T));
        }

        static ISN_APIResolver GetResolver(Type resolverType)
        {
            foreach (var resolver in Resolvers)
                if (resolver.GetType() == resolverType)
                    return resolver;
            return null;
        }

        static List<ISN_APIResolver> s_Resolvers;

        public static IEnumerable<ISN_APIResolver> Resolvers
        {
            get
            {
                if (s_Resolvers != null) return s_Resolvers;

                s_Resolvers = new List<ISN_APIResolver>
                {
                    new ISN_AdSupportResolver(),
                    new ISN_StoreKitResolver(),
                    new ISN_AppDelegateResolver(),
                    new ISN_ContactsResolver(),
                    new ISN_CloudKitResolver(),
                    new ISN_PhotosResolver(),
                    new ISN_AVKitResolver(),
                    new ISN_ReplayKitResolver(),
                    new ISN_SocialResolver(),
                    new ISN_UIKitResolver(),
                    new ISN_FoundationResolver(),
                    new ISN_GameKitResolver(),
                    new ISN_UserNotificationsResolver(),
                    new ISN_MediaPlayerResolver(),
                    new ISN_CoreLocationResolver(),
                    new ISN_EventKitResolver(),
                    new ISN_AuthenticationServicesResolver(),
                    new AppTrackingTransparencyResolver()
                };

                return s_Resolvers;
            }
        }

        public static void ChangeFileDefine(string file, string tag, bool isEnabled)
        {
            if (SA_FilesUtil.IsFileExists(file))
            {
                var defineLine = "#define " + tag;
                if (!isEnabled) defineLine = "//" + defineLine;

                var content = SA_FilesUtil.ReadAllLines(file);
                content[0] = defineLine;
                SA_FilesUtil.WriteAllLines(file, content);
            }
            else
            {
                Debug.LogError(file + " not found");
            }
        }

        //--------------------------------------
        // IPreprocessBuild
        //--------------------------------------

        public void OnPreprocessBuild(BuildTarget target, string path)
        {
            Preprocess(target);
        }

#if UNITY_2018_1_OR_NEWER
        public void OnPreprocessBuild(BuildReport report)
        {
            Preprocess(report.summary.platform);
        }
#endif

        public int callbackOrder => 0;


        //--------------------------------------
        // Private Methods
        //--------------------------------------

        static void Preprocess(BuildTarget target)
        {
            if (target == BuildTarget.iOS || target == BuildTarget.tvOS || target == BuildTarget.StandaloneOSX) Resolve();
        }
    }
}
