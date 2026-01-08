using UnityEngine;

namespace SA.Foundation.Utility
{
    public class SA_Plugins
    {
        public static void OnDisabledAPIUseAttempt(string pluginName, string APIname)
        {
            var message = pluginName +
                ": You are trying to use the " +
                APIname +
                " API without having it enabled inside plugin settings. This may cause unpredicted behaviour.";

            Debug.LogError(message);
            throw new System.InvalidOperationException(message);
        }
    }
}
