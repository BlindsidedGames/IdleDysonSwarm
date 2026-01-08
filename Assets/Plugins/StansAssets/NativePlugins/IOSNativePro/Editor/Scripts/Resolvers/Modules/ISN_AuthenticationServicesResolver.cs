using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_AuthenticationServicesResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.AuthenticationServices, true));
            return requirements;
        }

        protected override string LibFolder => "AuthenticationServices/";

        public override bool IsSettingsEnabled
        {
            get => XCodeProject.Capability.SignInWithApple.Enabled;
            set
            {
                XCodeProject.Capability.SignInWithApple.Enabled = value;
                XCodeProjectSettings.Save();
            }
        }

        public override string DefineName => "AUTHENTICATION_SERVICES_API_ENABLED";
    }
}
