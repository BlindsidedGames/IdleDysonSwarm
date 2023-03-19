using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_CloudKitUI : ISN_ServiceSettingsUI
    {
        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("CloudKit overview", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/CloudKit-overview");
            AddFeatureUrl("Save, fetch and delete records", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/CouldKit---save,-fetch-and-delete-records.");
            AddFeatureUrl("Creating records", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/CloudKit-creating-records.");
        }

        public override string Title => "CloudKit";

        protected override string Description => " Leverage the full power of iCloud and build apps for all Apple platforms with CloudKit. Easily and securely store and efficiently retrieve your app data in a database or assets right from iCloud.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "Cloud-icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_CloudKitResolver>();

        protected override void OnServiceUI() { }
    }
}
