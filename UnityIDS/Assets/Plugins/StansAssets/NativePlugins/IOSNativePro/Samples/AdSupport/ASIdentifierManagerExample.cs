using UnityEngine;
using UnityEngine.UI;
using SA.iOS.AdSupport;

public class ASIdentifierManagerExample : MonoBehaviour
{
    [SerializeField]
    Text advertisingTrackingEnabled = null;
    [SerializeField]
    Text advertisingIdentifier = null;

    public void GetAdvertisingIdentifier()
    {
        var value = ISN_ASIdentifierManager.SharedManager.AdvertisingIdentifier;
        advertisingIdentifier.text = value;
    }

    public void GetAdvertisingTrackingEnabled()
    {
        var value = ISN_ASIdentifierManager.SharedManager.AdvertisingTrackingEnabled;
        advertisingTrackingEnabled.text = value.ToString();
    }
}
