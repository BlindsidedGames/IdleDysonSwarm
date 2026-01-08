using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using SA.iOS.StoreKit;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_StoreKitUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent m_ProductIdDLabel = new GUIContent("ProductId[?]:", "A unique identifier that will be used for reporting. It can be composed of letters and numbers.");
        readonly GUIContent m_ProductTypeLabel = new GUIContent("Product Type[?]:", "Select the in-app purchase type you want to register");
        readonly GUIContent m_DisplayNameLabel = new GUIContent("Display Name[?]:", "This is the name of the In-App Purchase that will be seen by customers (if this is their primary language). For automatically renewable subscriptions, don’t include a duration in the display name. The display name can’t be longer than 75 characters.");
        readonly GUIContent m_DescriptionLabel = new GUIContent("Description[?]:", "This is the description of the In-App Purchase that will be used by App Review during the review process. If indicated in your code, this description may also be seen by customers. For automatically renewable subscriptions, do not include a duration in the description. The description cannot be longer than 255 bytes.");
        readonly GUIContent m_PriceTierLabel = new GUIContent("Price Tier[?]:", "The retail price for this In-App Purchase subscription.");

        public override void OnAwake()
        {
            base.OnAwake();
            AddFeatureUrl("iTunes Connect", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/iTunes-Connect-Setup");
            AddFeatureUrl("Initialization", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/StoreKit-Initialization");
            AddFeatureUrl("Purchase flow", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Purchase-flow");
            AddFeatureUrl("Receipt Validation", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Receipt-Validation");
            AddFeatureUrl("Store Review", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Store-Review-Controller");
            AddFeatureUrl("Storefront", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Storefront-API");
            AddFeatureUrl("Subscription Offers", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Subscription-Offers");
        }

        public override string Title => "Store Kit";

        protected override string Description => "Support in-app purchases and interactions with the App Store.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "StoreKit_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_StoreKitResolver>();

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("In-App Products List")))
            {
                if (ISN_Settings.Instance.InAppProducts.Count == 0)
                    EditorGUILayout.HelpBox("Use this menu to specify in-app products available for your App.", MessageType.Info);

                IMGUILayout.ReorderablList(ISN_Settings.Instance.InAppProducts, GetProductDisplayName, DrawProductContent, () =>
                {
                    ISN_Settings.Instance.InAppProducts.Add(new ISN_SKProduct());
                });
            }
        }

        string GetProductDisplayName(ISN_SKProduct product)
        {
            return product.LocalizedTitle + "           " + product.Price + "$";
        }

        void DrawProductContent(ISN_SKProduct product)
        {
            product.ProductIdentifier = IMGUILayout.TextField(m_ProductIdDLabel, product.ProductIdentifier);
            product.LocalizedTitle = IMGUILayout.TextField(m_DisplayNameLabel, product.LocalizedTitle);
            product.Type = (ISN_SKProductType)IMGUILayout.EnumPopup(m_ProductTypeLabel, product.Type);
            product.PriceTier = (ISN_SKPriceTier)IMGUILayout.EnumPopup(m_PriceTierLabel, product.PriceTier);

            EditorGUILayout.LabelField(m_DescriptionLabel);
            using (new IMGUIBeginHorizontal())
            {
                product.LocalizedDescription = EditorGUILayout.TextArea(product.LocalizedDescription, GUILayout.Height(60), GUILayout.MinWidth(190));
                EditorGUILayout.Space();
                product.Icon = (Texture2D)EditorGUILayout.ObjectField("", product.Icon, typeof(Texture2D), false, GUILayout.Width(75));
            }
        }
    }
}
