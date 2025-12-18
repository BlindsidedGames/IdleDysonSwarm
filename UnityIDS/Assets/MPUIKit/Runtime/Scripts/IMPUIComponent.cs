using System;
using UnityEngine;

namespace MPUIKIT {
    public interface IMPUIComponent{
        Material SharedMat { get; set; }
        bool ShouldModifySharedMat { get; set; }
        RectTransform RectTransform { get; set; }
        
        void Init(Material sharedMat, Material renderMat, RectTransform rectTransform);
        event EventHandler OnComponentSettingsChanged;
        void OnValidate();
        void InitValuesFromMaterial(ref Material material);
        void ModifyMaterial(ref Material material, params object[] otherProperties);
    }
}