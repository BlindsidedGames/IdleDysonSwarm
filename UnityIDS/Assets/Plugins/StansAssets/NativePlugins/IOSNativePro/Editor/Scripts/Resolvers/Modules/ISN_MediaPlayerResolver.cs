using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_MediaPlayerResolver : ISN_APIResolver
    {
        protected override ISN_XcodeRequirements GenerateRequirements()
        {
            var requirements = new ISN_XcodeRequirements();
            requirements.AddFramework(new XCodeFramework(XCodeFrameworkName.MediaPlayer));

            return requirements;
        }

        public override bool IsSettingsEnabled
        {
            get => ISN_Settings.Instance.MediaPlayer;
            set => ISN_Settings.Instance.MediaPlayer = value;
        }

        protected override string LibFolder => "MediaPlayer/";
        public override string DefineName => "MEDIA_PLAYER_API_ENABLED";
    }
}
