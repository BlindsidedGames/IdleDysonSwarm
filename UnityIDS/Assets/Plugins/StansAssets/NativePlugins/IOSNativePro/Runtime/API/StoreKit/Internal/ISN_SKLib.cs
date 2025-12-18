using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_SKLib
    {
        static ISN_iSKAPI s_Api;

        public static ISN_iSKAPI Api
        {
            get
            {
                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_SKEditorAPI();
                    else
                        s_Api = ISN_SKNativeAPI.Instance;
                }

                return s_Api;
            }
        }

        [Serializable]
        public class ISN_LoadStoreRequest
        {
            public List<string> ProductIdentifiers = new List<string>();
        }
    }
}
