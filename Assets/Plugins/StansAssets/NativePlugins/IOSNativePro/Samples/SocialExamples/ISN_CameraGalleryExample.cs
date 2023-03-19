using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System.IO;
using SA.iOS.UIKit;
using SA.Foundation.Utility;
using StansAssets.Foundation.Extensions;

public class ISN_CameraGalleryExample : MonoBehaviour
{
    [SerializeField]
    Button m_loadFromGallery = null;
    [SerializeField]
    Button m_loadFromCamera = null;
    [SerializeField]
    Button m_saveToGallery = null;

    [SerializeField]
    Image m_image = null;
    [SerializeField]
    GameObject m_go = null;

    void Start()
    {
        m_loadFromGallery.onClick.AddListener(() =>
        {
            var picker = new ISN_UIImagePickerController();
            picker.SourceType = ISN_UIImagePickerControllerSourceType.Album;
            picker.MediaTypes = new List<string>() { ISN_UIMediaType.Movie };

            picker.Present((result) =>
            {
                if (result.IsSucceeded)
                {
                    Debug.Log("MOVIE local path: " + result.MediaURL);

                    try
                    {
                        var movieBytes = File.ReadAllBytes(result.MediaURL);
                        Debug.Log("movie size bytes: " + movieBytes.Length);
                    }
                    catch (System.Exception ex)
                    {
                        Debug.Log(ex.Message);
                    }
                }
                else
                {
                    // canceled = true;
                    Debug.Log("Media picker failed with reason: " + result.Error.Message);
                }
            });
        });

        m_loadFromCamera.onClick.AddListener(() =>
        {
            var picker = new ISN_UIImagePickerController();
            picker.SourceType = ISN_UIImagePickerControllerSourceType.Camera;
            picker.MediaTypes = new List<string>() { ISN_UIMediaType.Image };

            picker.Present((result) =>
            {
                if (result.IsSucceeded)
                {
                    Debug.Log("Image captured: " + result.Image);
                    m_image.sprite = result.Image.CreateSprite();
                    m_go.GetComponent<Renderer>().material.mainTexture = result.Image;
                }
                else
                {
                    Debug.Log("Madia picker failed with reason: " + result.Error.Message);
                }
            });
        });

        m_saveToGallery.onClick.AddListener(() =>
        {
            SA_ScreenUtil.TakeScreenshot((image) =>
            {
                ISN_PhotoAlbum.UIImageWriteToSavedPhotosAlbum(image, (result) =>
                {
                    if (result.IsSucceeded)
                        Debug.Log("Image saved");
                    else
                        Debug.Log("Error: " + result.Error.Message);
                });
            });
        });
    }
}
