using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_StoreKitResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.StoreKit));
            requirements.Capabilities.Add("In-App Purchase");
            return requirements;
        }

        protected override string LibFolder => "StoreKit/";

        public override bool IsSettingsEnabled
        {
            get => XCodeProject.Capability.InAppPurchase.Enabled;
            set
            {
                XCodeProject.Capability.InAppPurchase.Enabled = value;
                XCodeProjectSettings.Save();
            }
        }

        public override string DefineName => "STORE_KIT_API_ENABLED";
    }
}
