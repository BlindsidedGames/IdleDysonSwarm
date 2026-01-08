using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using StansAssets.IOS.XCode;
using SA.Foundation.Editor;
using SA.Foundation.Utility;
using SA.Foundation.UtilitiesEditor;

namespace SA.iOS
{
    class ISN_UserNotificationsResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.UserNotifications));

            if (XCodeProject.Capability.PushNotifications.Enabled) requirements.Capabilities.Add("Push Notifications");

            return requirements;
        }

        protected override void RemoveXcodeRequirements()
        {
            base.RemoveXcodeRequirements();
        }

        protected override void AddXcodeRequirements()
        {
            base.AddXcodeRequirements();
        }

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.UserNotifications;
            set
            {
                ISN_Settings.Instance.UserNotifications = value;
                if (ISN_Settings.Instance.UserNotifications) ISN_Settings.Instance.AppDelegate = true;
            }
        }

        protected override string LibFolder => "UserNotifications/";
        public override string DefineName => "USER_NOTIFICATIONS_API_ENABLED";

        public override void RunAdditionalPreprocess()
        {
            if (!IsSettingsEnabled) return;

            var clResolver = ISN_Preprocessor.GetResolver<ISN_CoreLocationResolver>();

            var ISN_UNCommunication_h = ISN_Settings.IOSNativeXcode + LibFolder + "ISN_UNCommunication.h";
            ISN_Preprocessor.ChangeFileDefine(ISN_UNCommunication_h, clResolver.DefineName, clResolver.IsSettingsEnabled);

            var ISN_UNCommunication_mm = ISN_Settings.IOSNativeXcode + LibFolder + "ISN_UNCommunication.mm";
            ISN_Preprocessor.ChangeFileDefine(ISN_UNCommunication_mm, clResolver.DefineName, clResolver.IsSettingsEnabled);
        }
    }
}
