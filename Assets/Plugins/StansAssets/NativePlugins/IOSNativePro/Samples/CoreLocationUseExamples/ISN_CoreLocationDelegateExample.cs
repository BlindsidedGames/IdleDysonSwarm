using UnityEngine;
using SA.iOS.CoreLocation;
using SA.Foundation.Templates;
using SA.iOS.UIKit;

public class ISN_CoreLocationDelegateExample : ISN_ICLLocationManagerDelegate
{
    public void DidChangeAuthorizationStatus(ISN_CLAuthorizationStatus authorizationStatus)
    {
        ShowMessage("Authorization Status Changed", "CLAuthorizationStatus: " + authorizationStatus);
    }

    public void DidUpdateLocations(ISN_CLLocationArray locations)
    {
        var locationsInfo = string.Empty;
        foreach (var location in locations.Locations)
        {
            locationsInfo += string.Format("Coordinate: Latitude - {0}, Longitude  - {1}",
                location.Coordinate.Latitude,
                location.Coordinate.Longitude);
            locationsInfo += "\n";

            //We will print rest of info as debug log:
            Debug.Log("location.Floor: " + location.Floor);
            Debug.Log("location.Speed: " + location.Speed);
            Debug.Log("location.Course: " + location.Course);
            Debug.Log("location.Altitude: " + location.Altitude);
            Debug.Log("location.Timestamp: " + location.Timestamp.ToString("yyyyMMddHHmmss"));
            Debug.Log("location.Coordinate.Latitude: " + location.Coordinate.Latitude);
            Debug.Log("location.Coordinate.Longitude: " + location.Coordinate.Longitude);
        }

        ShowMessage("DidUpdateLocations ", locationsInfo);
    }

    public void DidFailWithError(SA_Error error)
    {
        ShowMessage("DidFailWithError ", error.FullMessage);
    }

    public void DidFinishDeferredUpdatesWithError(SA_Error error)
    {
        ShowMessage("DidFailWithError ", error.FullMessage);
    }

    public void DidPauseLocationUpdates()
    {
        ShowMessage("DidPauseLocationUpdates ", "DidPauseLocationUpdates event received");
    }

    public void DidResumeLocationUpdates()
    {
        ShowMessage("DidResumeLocationUpdates ", "DidResumeLocationUpdates event received");
    }

    void ShowMessage(string title, string message)
    {
        var alert = new ISN_UIAlertController(title, message, ISN_UIAlertControllerStyle.Alert);
        var yesAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () => { });
        alert.AddAction(yesAction);

        alert.Present();
    }
}
