using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using SA.iOS.Social;
using SA.Foundation.Utility;

public class ISN_SocialExamples : MonoBehaviour
{
    [SerializeField]
    Button m_twitterText = null;
    [SerializeField]
    Button m_twitterTextImage = null;
    [SerializeField]
    Button m_fbImage = null;

    void Start()
    {
        m_twitterText.onClick.AddListener(() =>
        {
            Debug.Log("Test iPad");
            var viewCtrl = new ISN_UIActivityViewController();
            viewCtrl.SetText("message");
            viewCtrl.ExcludedActivityTypes.Add(ISN_UIActivityType.Print);
            viewCtrl.ExcludedActivityTypes.Add(ISN_UIActivityType.AssignToContact);
            viewCtrl.ExcludedActivityTypes.Add(ISN_UIActivityType.SaveToCameraRoll);
            viewCtrl.ExcludedActivityTypes.Add(ISN_UIActivityType.OpenInIBooks);
            viewCtrl.ExcludedActivityTypes.Add(ISN_UIActivityType.MarkupAsPDF);
            viewCtrl.Present((e) =>
            {
                Debug.Log("Calbback.");
            });
        });

        m_twitterTextImage.onClick.AddListener(() =>
        {
            SA_ScreenUtil.TakeScreenshot((image) =>
            {
                var controller = new ISN_UIActivityViewController();
                controller.SetText("share text");
                controller.AddImage(image);
                controller.ExcludedActivityTypes.Add(ISN_UIActivityType.Message);

                controller.Present((result) =>
                {
                    if (result.IsSucceeded)
                    {
                        Debug.Log("Completed: " + result.Completed);
                        Debug.Log("ActivityType: " + result.ActivityType);
                    }
                    else
                    {
                        Debug.Log("ISN_UIActivityViewController error: " + result.Error.FullMessage);
                    }
                });

                /*
                Debug.Log("Image Ready");

                ISN_Twitter.Post("Yo my man", image, (result) => {
                    Debug.Log("Post result: " + result.IsSucceeded);
                });*/
            });
        });

        m_fbImage.onClick.AddListener(() =>
        {
            SA_ScreenUtil.TakeScreenshot((image) =>
            {
                Debug.Log("Image Ready");

                ISN_Facebook.Post("Yo my man", image, (result) =>
                {
                    Debug.Log("Post result: " + result.IsSucceeded);
                });
            });
        });
    }
}
