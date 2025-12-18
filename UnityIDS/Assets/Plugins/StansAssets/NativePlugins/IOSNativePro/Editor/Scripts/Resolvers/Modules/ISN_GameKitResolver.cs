using System.Collections;
using System.Collections.Generic;
using StansAssets.IOS.XCode;
using UnityEngine;

namespace SA.iOS
{
    class ISN_GameKitResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.GameKit));

            if (ISN_Settings.Instance.SavingAGame) requirements.Capabilities.Add("iCloud");

            requirements.Capabilities.Add("Game Center");

            return requirements;
        }

        protected override void RemoveXcodeRequirements()
        {
            base.RemoveXcodeRequirements();
        }

        protected override void AddXcodeRequirements()
        {
#if !UNITY_TVOS
            if (ISN_Settings.Instance.SavingAGame)
            {
                XCodeProject.Capability.iCloud.Enabled = true;
                XCodeProject.Capability.iCloud.KeyValueStorage = true;
                XCodeProject.Capability.iCloud.iCloudDocument = true;
            }
#endif

            base.AddXcodeRequirements();
        }

        public override bool IsSettingsEnabled
        {
            get => XCodeProject.Capability.GameCenter.Enabled;
            set
            {
                XCodeProject.Capability.GameCenter.Enabled = value;
                XCodeProjectSettings.Save();
            }
        }

        protected override string LibFolder => "GameKit/";
        public override string DefineName => "GAME_KIT_API_ENABLED";
    }
}
