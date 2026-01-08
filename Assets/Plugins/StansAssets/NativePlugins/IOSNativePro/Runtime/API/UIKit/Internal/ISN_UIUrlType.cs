using System;
using System.Collections.Generic;

namespace SA.iOS.UIKit
{
    [Serializable]
    class ISN_UIUrlType
    {
        public string Identifier;
        public List<string> Schemes = new List<string>();

        public ISN_UIUrlType(string identifier)
        {
            Identifier = identifier;
        }

        public void AddSchemes(string schemes)
        {
            Schemes.Add(schemes);
        }
    }
}
