using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_SocialUI : ISN_ServiceSettingsUI
    {
        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Facebook", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Facebook");
            AddFeatureUrl("Twitter", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Twitter");
            AddFeatureUrl("Instagram", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Instagram");
            AddFeatureUrl("E-Mail", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/E-Mail");
            AddFeatureUrl("WhatsApp", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/WhatsApp");
            AddFeatureUrl("Text Message", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Text-Message");
            AddFeatureUrl("Default Sharing Dialog", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Default-Sharing-Dialog");
        }

        public override string Title => "Social";

        protected override string Description => "Integrate your app with supported social networking services.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "Social_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_SocialResolver>();

        protected override IEnumerable<string> SupportedPlatforms => new List<string>() { "iOS", "Unity Editor" };

        protected override void OnServiceUI() { }
    }
}
