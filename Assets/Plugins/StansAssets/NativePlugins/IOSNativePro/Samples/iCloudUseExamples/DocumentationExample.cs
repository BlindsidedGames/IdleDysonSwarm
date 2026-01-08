using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.Foundation;
using SA.iOS.AVFoundation;
using SA.iOS.Photos;
using SA.iOS.ReplayKit;
using SA.iOS.UIKit;

public class DocumentationExample : MonoBehaviour
{
    // Use this for initialization
    void Start()
    {
        var buildInfo = ISN_NSBundle.BuildInfo;
        Debug.Log("AppVersion: " + buildInfo.AppVersion);
        Debug.Log("BuildNumber: " + buildInfo.BuildNumber);

        if (ISN_NSBundle.IsRunningInAppStoreEnvironment)
        {
            Debug.Log("This app was downloaded from an AppStore");
        }

        var alert = new ISN_UIAlertController("Hello", "Would you like to continue.", ISN_UIAlertControllerStyle.Alert);
        var yesAction = new ISN_UIAlertAction("Yes", ISN_UIAlertActionStyle.Default, () =>
        {
            //User said yes
        });

        //We can highlight button to show that
        //this option is preferred to be chosen
        yesAction.MakePreferred();

        var noAction = new ISN_UIAlertAction("No", ISN_UIAlertActionStyle.Default, () =>
        {
            //User said no
        });

        alert.AddAction(yesAction);
        alert.AddAction(noAction);

        alert.Present();

        ISN_Preloader.LockScreen();
        ISN_Preloader.UnlockScreen();

        Debug.Log("Name:" + ISN_UIDevice.CurrentDevice.Name);
        Debug.Log("SystemName:" + ISN_UIDevice.CurrentDevice.SystemName);
        Debug.Log("SystemVersion:" + ISN_UIDevice.CurrentDevice.SystemVersion);
        Debug.Log("Model:" + ISN_UIDevice.CurrentDevice.Model);
        Debug.Log("LocalizedModel:" + ISN_UIDevice.CurrentDevice.LocalizedModel);
        Debug.Log("MajorIOSVersion:" + ISN_UIDevice.CurrentDevice.MajorIOSVersion);

        Debug.Log("UserInterfaceIdiom:" + ISN_UIDevice.CurrentDevice.UserInterfaceIdiom);
        Debug.Log("IdentifierForVendor:" + ISN_UIDevice.CurrentDevice.IdentifierForVendor);

        /*
        ISN_UIImagePickerController.SaveScreenshotToCameraRoll((result) => {
            if (result.IsSucceeded) {
                Debug.Log("screenshot saved saved");
            } else {
                Debug.Log("Error: " + result.Error.Message);
            }
        });






        ISN_PHPhotoLibrary.RequestAuthorization((status) => {
            if(status == ISN_PHAuthorizationStatus.Authorized) {
                Debug.Log("Permission granted");
            } else {
                Debug.Log("Permission denied");
            }
        });
        */

        ISN_PHAuthorizationStatus status;
        status = ISN_PHPhotoLibrary.AuthorizationStatus;
        Debug.Log("Photo Library Authorization Status: " + status);

        var picker = new ISN_UIImagePickerController();
        picker.SourceType = ISN_UIImagePickerControllerSourceType.Camera;
        picker.MediaTypes = new List<string>() { ISN_UIMediaType.Image };

        picker.Present((result) =>
        {
            if (result.IsSucceeded)
            {
                Debug.Log("Image captured: " + result.Image);
            }
            else
            {
                Debug.Log("Madia picker failed with reason: " + result.Error.Message);
            }
        });

        ISN_RPScreenRecorder.StopRecording((result) =>
        {
            if (result.IsSucceeded)
            {
                Debug.Log("Scrren recodring is started");
            }
            else
            {
                Debug.Log("User decalied screen recording request");
            }
        });

        var isAvailable = ISN_RPScreenRecorder.IsAvailable;

        ISN_RPScreenRecorder.StopRecording((result) =>
        {
            if (result.HasPreviewController)
            {
                result.PreviewController.Present((prevewResult) =>
                {
                    if (prevewResult.IsSucceeded)
                    {
                        Debug.Log("User Saved video");
                        foreach (var activity in prevewResult.ActivityTypes)
                        {
                            Debug.Log("Video was shared to: " + activity);
                        }
                    }
                });
            }
        });

        ISN_RPScreenRecorder.DidChangeAvailability.AddListener(() =>
        {
            Debug.Log("Replay Kit avalibility has chnaged:");
            Debug.Log("Replay Kit avaliable: " + ISN_RPScreenRecorder.IsAvailable);
        });

        ISN_RPScreenRecorder.DidStopRecording.AddListener((result) =>
        {
            if (result.HasPreviewController)
            {
                result.PreviewController.Present((prevewResult) =>
                {
                    if (prevewResult.IsSucceeded)
                    {
                        Debug.Log("User Saved video");
                        foreach (var activity in prevewResult.ActivityTypes)
                        {
                            Debug.Log("Video was shared to: " + activity);
                        }
                    }
                });
            }
        });

        /*


        Texture2D myImage = GetImage();
        ISN_UIImagePickerController.SaveTextureToCameraRoll(myImage, (result) => {
            if(result.IsSucceeded) {
                Debug.Log("Image saved");
            } else {
                Debug.Log("Error: " + result.Error.Message);
            }
        });


        var source = ISN_UIImagePickerControllerSourceType.PhotoLibrary;
        bool isAvailable = ISN_UIImagePickerController.IsSourceTypeAvailable(source);

        var source = ISN_UIImagePickerControllerSourceType.Album;
        List<string> availableMediaType = ISN_UIImagePickerController.GetAvailableMediaTypes(source);
        foreach(var mediaType in availableMediaType) {
            Debug.Log(mediaType);
        }
*/

        ISN_NSUbiquitousKeyValueStore.StoreDidChangeExternallyNotification.AddListener((changes) =>
        {
            // get changes that might have happened while this
            // instance of your app wasn't running
        });
    }
}
