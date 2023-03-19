using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_AdSupportUI : ISN_ServiceSettingsUI
    {
        public override void OnAwake()
        {
            base.OnAwake();
            AddFeatureUrl("Get started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(AdSupport)");
            AddFeatureUrl("Advertising Tracking", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/ASIdentifierManager-API.#advertising-tracking");
            AddFeatureUrl("Advertising Identifier", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/ASIdentifierManager-API.#advertising-identifier");
        }

        public override string Title => "AdSupport";

        protected override string Description => "Access the advertising identifier and a flag that indicates whether the user has chosen to limit ad tracking.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "AdSupport_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_AdSupportResolver>();

        protected override IEnumerable<string> SupportedPlatforms => new List<string>() { "iOS" };

        protected override void OnServiceUI() { }
    }
}
