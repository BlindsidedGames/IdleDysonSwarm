using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_AdSupportResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.AdSupport));
            return requirements;
        }

        protected override string LibFolder => "AdSupport/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.AdSupport;
            set => ISN_Settings.Instance.AdSupport = value;
        }

        public override string DefineName => "AS_SUPPORT_API_ENABLED";
    }
}
