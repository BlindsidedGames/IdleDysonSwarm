using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_PhotosResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.Photos));
            return requirements;
        }

        protected override string LibFolder => "Photos/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.Photos;
            set => ISN_Settings.Instance.Photos = value;
        }

        public override string DefineName => "PHOTOS_API_ENABLED";
    }
}
