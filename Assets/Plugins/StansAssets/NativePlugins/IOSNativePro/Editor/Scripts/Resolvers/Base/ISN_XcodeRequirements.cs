using System.Collections.Generic;
using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_XcodeRequirements
    {
        //This is used for drawing UI only
        public readonly List<string> Capabilities = new List<string>();

        public List<XCodeFramework> Frameworks { get; } = new List<XCodeFramework>();
        public List<XCodeLibrary> Libraries { get; } = new List<XCodeLibrary>();
        public List<XCodeProjectProperty> Properties { get; } = new List<XCodeProjectProperty>();
        public List<InfoPlistKey> PlistKeys { get; } = new List<InfoPlistKey>();

        public void AddFramework(XCodeFramework framework)
        {
            Frameworks.Add(framework);
        }

        public void AddInfoPlistKey(InfoPlistKey variables)
        {
            PlistKeys.Add(variables);
        }

        public void AddLibrary(XCodeLibrary library)
        {
            Libraries.Add(library);
        }

        public void AddBuildProperty(XCodeProjectProperty property)
        {
            Properties.Add(property);
        }
    }
}
