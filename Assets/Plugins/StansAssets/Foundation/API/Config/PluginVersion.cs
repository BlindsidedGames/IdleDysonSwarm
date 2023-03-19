using System;
using UnityEngine;

namespace SA.Foundation.Config
{
    [Serializable]
    public class PluginVersion
    {
        public int MajorVersion;
        public int MinorVersion;

        public Action SaveDelegate;

        public override string ToString()
        {
            var minorVersionString = MinorVersion > 0 ? "." + MinorVersion : string.Empty;
            return $"{MajorVersion}{minorVersionString}";
        }

        public void UpgradeMinorVersion()
        {
            MinorVersion++;
        }

        public void UpgradeMajorVersion()
        {
            if (MinorVersion > 0)
            {
                MajorVersion++;
            }
        }
    }
}
