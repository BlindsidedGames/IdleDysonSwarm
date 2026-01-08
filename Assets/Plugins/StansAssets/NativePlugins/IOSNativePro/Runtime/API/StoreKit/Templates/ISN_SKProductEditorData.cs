using System;
using UnityEngine;

namespace SA.iOS.StoreKit
{
    [Serializable]
    class ISN_SKProductEditorData
    {
        public Texture2D Texture;
        public ISN_SKPriceTier PriceTier = ISN_SKPriceTier.Tier1;
        public ISN_SKProductType ProductType = ISN_SKProductType.Consumable;
    }
}
