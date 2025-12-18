using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_CoreLocationResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.CoreLocation));

            var nsLocationWhenInUseUsageDescription = new InfoPlistKey();
            nsLocationWhenInUseUsageDescription.Name = "NSLocationWhenInUseUsageDescription";
            nsLocationWhenInUseUsageDescription.StringValue = ISN_Settings.Instance.LocationWhenInUseUsageDescription;
            nsLocationWhenInUseUsageDescription.Type = InfoPlistKeyType.String;
            requirements.AddInfoPlistKey(nsLocationWhenInUseUsageDescription);

            var nsLocationAlwaysAndWhenInUseUsageDescription = new InfoPlistKey();
            nsLocationAlwaysAndWhenInUseUsageDescription.Name = "NSLocationAlwaysAndWhenInUseUsageDescription";
            nsLocationAlwaysAndWhenInUseUsageDescription.StringValue = ISN_Settings.Instance.LocationAlwaysAndWhenInUseUsageDescription;
            nsLocationAlwaysAndWhenInUseUsageDescription.Type = InfoPlistKeyType.String;
            requirements.AddInfoPlistKey(nsLocationAlwaysAndWhenInUseUsageDescription);

            return requirements;
        }

        protected override string LibFolder => "CoreLocation/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.CoreLocation;
            set => ISN_Settings.Instance.CoreLocation = value;
        }

        public override string DefineName => "CORE_LOCATION_API_ENABLED";
    }
}
