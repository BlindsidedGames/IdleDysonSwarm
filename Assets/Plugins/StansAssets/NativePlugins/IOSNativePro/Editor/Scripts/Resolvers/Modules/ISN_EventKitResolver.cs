using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_EventKitResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.EventKit));

            var NSCalendarUsageDescription = new InfoPlistKey();
            NSCalendarUsageDescription.Name = "NSCalendarsUsageDescription";
            NSCalendarUsageDescription.StringValue = ISN_Settings.Instance.NsCalendarsUsageDescription;
            NSCalendarUsageDescription.Type = InfoPlistKeyType.String;
            requirements.AddInfoPlistKey(NSCalendarUsageDescription);

            var NSReminderUsageDescription = new InfoPlistKey();
            NSReminderUsageDescription.Name = "NSRemindersUsageDescription";
            NSReminderUsageDescription.StringValue = ISN_Settings.Instance.NsRemindersUsageDescription;
            NSReminderUsageDescription.Type = InfoPlistKeyType.String;
            requirements.AddInfoPlistKey(NSReminderUsageDescription);

            return requirements;
        }

        protected override string LibFolder => "EventKit/";

        public override string DefineName => "EVENT_KIT_ENABLED";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.EventKit;
            set => ISN_Settings.Instance.EventKit = value;
        }
    }
}
