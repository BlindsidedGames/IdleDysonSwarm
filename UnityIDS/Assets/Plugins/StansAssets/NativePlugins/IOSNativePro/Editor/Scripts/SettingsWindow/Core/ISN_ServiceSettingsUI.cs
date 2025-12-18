using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Editor;
using StansAssets.IOS.XCode;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    abstract class ISN_ServiceSettingsUI : SA_ServiceLayout
    {
        protected override IEnumerable<string> SupportedPlatforms => new List<string> { "iOS", "tvOS", "Unity Editor" };

        protected override int IconSize => 25;

        protected override int TitleVerticalSpace => 2;

        protected override void DrawServiceRequirements()
        {
            var resolver = (ISN_APIResolver)Resolver;

            if (!HasRequirements(resolver)) return;

            using (new SA_WindowBlockWithSpace(new GUIContent("Requirements")))
            {
                DrawRequirementsUI(resolver.XcodeRequirements);
            }
        }

        public static void DrawRequirementsUI(ISN_XcodeRequirements xcodeRequirements)
        {
            if (xcodeRequirements.Frameworks.Count > 0)
                using (new SA_H2WindowBlockWithSpace(new GUIContent("FRAMEWORKS")))
                {
                    foreach (var framework in xcodeRequirements.Frameworks)
                        IMGUILayout.SelectableLabel(new GUIContent(framework.FrameworkName.ToString() + ".framework", XCodeWindowSkin.GetIcon("frameworks.png")));
                }

            if (xcodeRequirements.Libraries.Count > 0)
                using (new SA_H2WindowBlockWithSpace(new GUIContent("LIBRARIES")))
                {
                    foreach (var library in xcodeRequirements.Libraries)
                        IMGUILayout.SelectableLabel(new GUIContent(library.Name + ".lib", XCodeWindowSkin.GetIcon("frameworks.png")));
                }

            if (xcodeRequirements.Capabilities.Count > 0)
                using (new SA_H2WindowBlockWithSpace(new GUIContent("CAPABILITIES")))
                {
                    foreach (var capability in xcodeRequirements.Capabilities)
                        IMGUILayout.SelectableLabel(new GUIContent(capability + " Capability", XCodeWindowSkin.GetIcon("capability.png")));
                }

            if (xcodeRequirements.PlistKeys.Count > 0)
                using (new SA_H2WindowBlockWithSpace(new GUIContent("PLIST KEYS")))
                {
                    foreach (var key in xcodeRequirements.PlistKeys)
                        IMGUILayout.SelectableLabel(new GUIContent(key.Name, XCodeWindowSkin.GetIcon("plistVariables.png")));
                }

            if (xcodeRequirements.Properties.Count > 0)
                using (new SA_H2WindowBlockWithSpace(new GUIContent("BUILD PROPERTIES")))
                {
                    foreach (var property in xcodeRequirements.Properties)
                        IMGUILayout.SelectableLabel(new GUIContent(property.Name + " | " + property.Value, XCodeWindowSkin.GetIcon("buildSettings.png")));
                }
        }

        private bool HasRequirements(ISN_APIResolver resolver)
        {
            return resolver.XcodeRequirements.Frameworks.Count > 0 ||
                resolver.XcodeRequirements.Libraries.Count > 0 ||
                resolver.XcodeRequirements.PlistKeys.Count > 0 ||
                resolver.XcodeRequirements.Properties.Count > 0;
        }
    }
}
