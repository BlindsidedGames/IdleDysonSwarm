using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_ReplayKitResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.ReplayKit));
            return requirements;
        }

        protected override string LibFolder => "ReplayKit/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.ReplayKit;
            set => ISN_Settings.Instance.ReplayKit = value;
        }

        public override string DefineName => "REPLAY_KIT_API_ENABLED";
    }
}
