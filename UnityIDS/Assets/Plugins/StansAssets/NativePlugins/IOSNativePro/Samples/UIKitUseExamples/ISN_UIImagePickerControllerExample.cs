using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using SA.iOS;
using SA.iOS.UIKit;
using SA.iOS.AVFoundation;
using SA.iOS.AVKit;
using SA.iOS.Foundation;
using StansAssets.Foundation.Extensions;

public class ISN_UIImagePickerControllerExample : MonoBehaviour
{
    [SerializeField]
    RawImage m_Image = null;
    [SerializeField]
    Image m_Sprite = null;

    [Header("Image")]
    [SerializeField]
    Button m_ImageCapture = null;
    [SerializeField]
    Button m_ImageLibrary = null;
    [SerializeField]
    Button m_ImageAlbum = null;

    [Header("Video")]
    [SerializeField]
    Button m_VideoCapture = null;
    [SerializeField]
    Button m_VideoLibrary = null;
    [SerializeField]
    Button m_VideoAlbum = null;
    [SerializeField]
    Button m_VideoPlay = null;

    ISN_UIPickerControllerResult m_LastPickerResult = null;

    void Awake()
    {
        AddFitter(m_Image.gameObject);
        AddFitter(m_Sprite.gameObject);

        m_ImageCapture.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.Camera, ISN_UIMediaType.Image);
        });

        m_ImageLibrary.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.PhotoLibrary, ISN_UIMediaType.Image);
        });

        m_ImageAlbum.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.Album, ISN_UIMediaType.Image);
        });

        m_VideoCapture.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.Camera, ISN_UIMediaType.Movie, ISN_UIImagePickerControllerCameraDevice.Front);
        });

        m_VideoLibrary.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.PhotoLibrary, ISN_UIMediaType.Movie);
        });

        m_VideoAlbum.onClick.AddListener(() =>
        {
            StartPicker(ISN_UIImagePickerControllerSourceType.Album, ISN_UIMediaType.Movie);
        });

        m_VideoPlay.onClick.AddListener(() =>
        {
            var url = ISN_NSUrl.FileUrlWithPath(m_LastPickerResult.MediaURL);
            var player = new ISN_AVPlayer(url);

            var viewController = new ISN_AVPlayerViewController { Player = player };

            viewController.Show();
        });

        UpdateUI();
    }

    void AddFitter(GameObject go)
    {
        var fitter = go.AddComponent<AspectRatioFitter>();
        fitter.aspectMode = AspectRatioFitter.AspectMode.FitInParent;
        fitter.aspectRatio = 1;
    }

    void UpdateUI()
    {
        m_VideoPlay.interactable = !(m_LastPickerResult == null
            || m_LastPickerResult.IsFailed
            || !m_LastPickerResult.MediaType.Equals(ISN_UIMediaType.Movie));
    }

    void StartPicker(ISN_UIImagePickerControllerSourceType sourceType, string mediaType, ISN_UIImagePickerControllerCameraDevice cameraDevice = ISN_UIImagePickerControllerCameraDevice.Rear)
    {
        var picker = new ISN_UIImagePickerController
        {
            CameraDevice = cameraDevice,
            SourceType = sourceType,
            MediaTypes = new List<string>() { mediaType },
            MaxImageSize = 512,
            ImageCompressionFormat = ISN_UIImageCompressionFormat.JPEG,
            ImageCompressionRate = 0.8f
        };

        picker.Present(DisplayResult);
    }

    void DisplayResult(ISN_UIPickerControllerResult result)
    {
        m_LastPickerResult = result;

        if (result.IsSucceeded)
        {
            if (result.MediaType.Equals(ISN_UIMediaType.Image))
            {
                DisplayMessage("Image Loaded!");
                ApplyImageToGui(result.Image);
            }

            if (result.MediaType.Equals(ISN_UIMediaType.Movie))
                DisplayMessage("Video Loaded!", () =>
                {
                    var image = ISN_AVAssetImageGenerator.CopyCgImageAtTime(result.MediaURL, 0);
                    ApplyImageToGui(image);
                });
        }
        else
        {
            DisplayMessage("Failed: " + result.Error.FullMessage);
        }

        UpdateUI();
    }

    void ApplyImageToGui(Texture2D image)
    {
        var aspectRatio = (float)image.width / (float)image.height;

        m_Image.GetComponent<AspectRatioFitter>().aspectRatio = aspectRatio;
        m_Sprite.GetComponent<AspectRatioFitter>().aspectRatio = aspectRatio;

        //m_image is a UnityEngine.UI.RawImage
        m_Image.texture = image;

        //m_sprite is a UnityEngine.UI.Image
        m_Sprite.sprite = image.CreateSprite();
    }

    void DisplayMessage(string message, Action onClose = null)
    {
        var alert = new ISN_UIAlertController("UIImagePickerController",
            message,
            ISN_UIAlertControllerStyle.Alert);
        var defaultAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () =>
        {
            if (onClose != null) onClose.Invoke();
        });

        alert.AddAction(defaultAction);
        alert.Present();
    }
}
