using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.UIKit;

public class ISN_AppdelegateUseExample : MonoBehaviour
{
    // Start is called before the first frame update
    void Start()
    {
        var url = ISN_UIApplication.ApplicationDelegate.GetLaunchUniversalLink();
        if (!string.IsNullOrEmpty(url))
            ISN_UIAlertUtility.ShowMessage("Info", "Launch Universal Link Detecetd: " + url);
        else
            ISN_UIAlertUtility.ShowMessage("Info", "No link on start");

        ISN_UIApplication.ApplicationDelegate.ContinueUserActivity.AddListener((string activityUrl) =>
        {
            ISN_UIAlertUtility.ShowMessage("Info", "Launch Universal Link Detecetd: " + activityUrl);
        });
    }
}
