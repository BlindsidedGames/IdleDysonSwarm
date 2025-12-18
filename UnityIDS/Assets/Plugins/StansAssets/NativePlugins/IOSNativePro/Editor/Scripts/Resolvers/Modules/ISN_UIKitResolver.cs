using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_UIKitResolver : ISN_LSApplicationQueriesSchemesResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            var property = new XCodeProjectProperty("GCC_ENABLE_OBJC_EXCEPTIONS", "YES");
            requirements.AddBuildProperty(property);

            if (ISN_Settings.Instance.ApplicationQueriesSchemes.Count > 0)
            {
                var LSApplicationQueriesSchemes = new InfoPlistKey();
                LSApplicationQueriesSchemes.Name = "LSApplicationQueriesSchemes";
                LSApplicationQueriesSchemes.Type = InfoPlistKeyType.Array;

                requirements.AddInfoPlistKey(LSApplicationQueriesSchemes);

                foreach (var scheme in ISN_Settings.Instance.ApplicationQueriesSchemes)
                {
                    var schemeName = new InfoPlistKey();
                    schemeName.StringValue = scheme.Identifier;
                    schemeName.Type = InfoPlistKeyType.String;
                    LSApplicationQueriesSchemes.AddChild(schemeName);
                }
            }

            var settings = ISN_Settings.Instance;
            ResolvePlistKey(settings.CameraUsageDescriptionEnabled,
                "NSCameraUsageDescription",
                ISN_EditorSettings.CameraUsageDescription, requirements);

            ResolvePlistKey(settings.PhotoLibraryUsageDescriptionEnabled,
                "NSPhotoLibraryUsageDescription",
                ISN_EditorSettings.PhotoLibraryUsageDescription, requirements);

            ResolvePlistKey(settings.PhotoLibraryAddUsageDescriptionEnabled,
                "NSPhotoLibraryAddUsageDescription",
                ISN_EditorSettings.PhotoLibraryAddUsageDescription, requirements);

            ResolvePlistKey(settings.MicrophoneUsageDescriptionEnabled,
                "NSMicrophoneUsageDescription",
                ISN_EditorSettings.MicrophoneUsageDescription, requirements);

            return requirements;
        }

        void ResolvePlistKey(bool isEnabled, string name, string value, ISN_XcodeRequirements requirements)
        {
            if (isEnabled)
            {
                var plistKey = new InfoPlistKey();
                plistKey.Name = name;
                plistKey.StringValue = value;
                plistKey.Type = InfoPlistKeyType.String;
                requirements.AddInfoPlistKey(plistKey);
            }
            else
            {
                XCodeProject.RemoveInfoPlistKey(name);
            }
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
