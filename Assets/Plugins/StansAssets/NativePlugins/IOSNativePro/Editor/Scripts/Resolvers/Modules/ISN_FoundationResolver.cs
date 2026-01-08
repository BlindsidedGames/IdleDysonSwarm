using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_FoundationResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();

            var property = new XCodeProjectProperty("GCC_ENABLE_OBJC_EXCEPTIONS", "YES");
            requirements.AddBuildProperty(property);

            if (XCodeProject.Capability.iCloud.Enabled && XCodeProject.Capability.iCloud.KeyValueStorage) requirements.Capabilities.Add("iCloud");

            return requirements;
        }

        public override bool IsSettingsEnabled
        {
            get => true;
            set { }
        }

        protected override string LibFolder => string.Empty;
        public override string DefineName => string.Empty;
    }
}
