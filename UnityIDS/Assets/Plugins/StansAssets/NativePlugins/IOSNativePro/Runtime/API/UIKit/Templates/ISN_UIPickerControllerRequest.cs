using System;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.UIKit
{
    [Serializable]
    class ISN_UIPickerControllerRequest
    {
        [SerializeField]
        public List<string> m_MediaTypes = new List<string>();
        [SerializeField]
        public ISN_UIImagePickerControllerSourceType m_SourceType = ISN_UIImagePickerControllerSourceType.PhotoLibrary;
        [SerializeField]
        public bool m_AllowsEditing = false;
        [SerializeField]
        public float m_ImageCompressionRate = 1;
        [SerializeField]
        public int m_MaxImageSize = 1024;
        [SerializeField]
        public ISN_UIImageCompressionFormat m_EncodingType = ISN_UIImageCompressionFormat.JPEG;
        [SerializeField]
        public ISN_UIImagePickerControllerCameraDevice m_CameraDevice = ISN_UIImagePickerControllerCameraDevice.Rear;
        [SerializeField]
        public ISN_UIModalPresentationStyle m_ModalPresentationStyle = ISN_UIModalPresentationStyle.Automatic;
    }
}
