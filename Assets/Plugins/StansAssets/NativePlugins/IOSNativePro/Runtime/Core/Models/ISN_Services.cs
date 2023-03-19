using UnityEngine;

namespace SA.iOS.Utilities
{
    static class ISN_Services
    {
        static Transform s_Services;

        public static Transform Parent
        {
            get
            {
                if (s_Services == null)
                {
                    s_Services = new GameObject("IOS Native Services").transform;
                    Object.DontDestroyOnLoad(s_Services);
                }

                return s_Services;
            }
        }
    }
}
