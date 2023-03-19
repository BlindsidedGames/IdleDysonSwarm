using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_ContactsResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.Contacts));
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.ContactsUI));

            var NSContactsUsageDescription = new InfoPlistKey();
            NSContactsUsageDescription.Name = "NSContactsUsageDescription";
            NSContactsUsageDescription.StringValue = ISN_Settings.Instance.ContactsUsageDescription;
            NSContactsUsageDescription.Type = InfoPlistKeyType.String;

            requirements.AddInfoPlistKey(NSContactsUsageDescription);

            return requirements;
        }

        protected override string LibFolder => "Contacts/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.Contacts;
            set => ISN_Settings.Instance.Contacts = value;
        }

        public override string DefineName => "CONTACTS_API_ENABLED";
    }
}
