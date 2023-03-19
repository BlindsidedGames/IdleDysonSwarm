using UnityEngine;
using SA.iOS.CoreLocation;
using SA.iOS.UIKit;
using UnityEngine.UI;

public class ISN_CoreLocationUseExample : MonoBehaviour
{
    [SerializeField]
    Button m_AuthButton = null;
    [SerializeField]
    Button m_StartUpdatingButton = null;
    [SerializeField]
    Button m_StopUpdatingButton = null;
    [SerializeField]
    Button m_RequestLocationButton = null;

    void Start()
    {
        Debug.Log("LocationServicesEnabled: " + ISN_CLLocationManager.LocationServicesEnabled);
        var @delegate = new ISN_CoreLocationDelegateExample();
        ISN_CLLocationManager.SetDelegate(@delegate);

        m_AuthButton.onClick.AddListener(() =>
        {
            var status = ISN_CLLocationManager.AuthorizationStatus;
            if (status == ISN_CLAuthorizationStatus.NotDetermined)
                ISN_CLLocationManager.RequestWhenInUseAuthorization();
            else
                ShowMessage("AuthorizationStatus", status.ToString());
        });

        m_StartUpdatingButton.onClick.AddListener(() =>
        {
            ISN_CLLocationManager.StartUpdatingLocation();
        });

        m_StopUpdatingButton.onClick.AddListener(() =>
        {
            ISN_CLLocationManager.StopUpdatingLocation();
        });

        m_RequestLocationButton.onClick.AddListener(() =>
        {
            ISN_CLLocationManager.RequestLocation();
        });
    }

    void ShowMessage(string title, string message)
    {
        var alert = new ISN_UIAlertController(title, message, ISN_UIAlertControllerStyle.Alert);
        var yesAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () => { });
        alert.AddAction(yesAction);

        alert.Present();
    }
}
