using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class AppTrackingTransparencyResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.AppTrackingTransparency));
           
            
            var nsUserTrackingUsageDescription = new InfoPlistKey();
            nsUserTrackingUsageDescription.Name = "NSUserTrackingUsageDescription";
            nsUserTrackingUsageDescription.StringValue = ISN_Settings.Instance.UserTrackingUsageDescription;
            nsUserTrackingUsageDescription.Type = InfoPlistKeyType.String;
            requirements.AddInfoPlistKey(nsUserTrackingUsageDescription);
          
            return requirements;
            
        }

        protected override string LibFolder => "AppTrackingTransparency/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.AppTrackingTransparency;
            set => ISN_Settings.Instance.AppTrackingTransparency = value;
        }

        public override string DefineName => "AT_SUPPORT_API_ENABLED";
    }
}
