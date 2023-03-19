#if UNITY_2019_4_OR_NEWER
namespace StansAssets.Plugins.Editor
{
    public class AboutTab : BaseTab
    {
        public AboutTab()
            : base($"{PluginsDevKitPackage.UIToolkitPath}/AboutTab/AboutTab")
        {

        }
    }
}
#endif