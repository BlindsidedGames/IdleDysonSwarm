using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using StansAssets.IOS.XCode;
using SA.iOS.UIKit;

namespace SA.iOS
{
    class ISN_SocialResolver : ISN_LSApplicationQueriesSchemesResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();

            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.Accounts));
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.Social));
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.MessageUI));

            var LSApplicationQueriesSchemes = new InfoPlistKey();
            LSApplicationQueriesSchemes.Name = "LSApplicationQueriesSchemes";
            LSApplicationQueriesSchemes.Type = InfoPlistKeyType.Array;

            requirements.AddInfoPlistKey(LSApplicationQueriesSchemes);

            var instagram = new InfoPlistKey();
            instagram.StringValue = "instagram";
            instagram.Type = InfoPlistKeyType.String;
            LSApplicationQueriesSchemes.AddChild(instagram);

            var whatsapp = new InfoPlistKey();
            whatsapp.StringValue = "whatsapp";
            whatsapp.Type = InfoPlistKeyType.String;
            LSApplicationQueriesSchemes.AddChild(whatsapp);

            return requirements;
        }

        protected override string LibFolder => "Social/";

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.Social;
            set => ISN_Settings.Instance.Social = value;
        }

        public override string DefineName => "SOCIAL_API_ENABLED";
    }
}
