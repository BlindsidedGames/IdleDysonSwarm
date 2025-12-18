using System;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// Just a basic circle.
    /// </summary>
    [Serializable]
    public struct Circle : IMPUIComponent {
        [SerializeField] private float m_Radius;
        [SerializeField] private bool m_FitRadius;
        
        private static readonly int SpRadius = Shader.PropertyToID("_CircleRadius");
        private static readonly int SpFitRadius = Shader.PropertyToID("_CircleFitRadius");

        /// <summary>
        /// Radius of the circle. This has no effect if FitToRect is set to true.
        /// </summary>
        public float Radius {
            get => m_Radius;
            set {
                m_Radius = Mathf.Max(value, 0f);
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpRadius, m_Radius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        /// <summary>
        /// Fit the circe to the rect-transform  
        /// </summary>
        public bool FitToRect {
            get => m_FitRadius;
            set {
                m_FitRadius = value;
                if (ShouldModifySharedMat) {
                    SharedMat.SetInt(SpFitRadius, m_FitRadius?1:0);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        private float CircleFitRadius => Mathf.Min(RectTransform.rect.width, RectTransform.rect.height) / 2;

        public Material SharedMat { get; set; }
        public bool ShouldModifySharedMat { get; set; }
        public RectTransform RectTransform { get; set; }
        
        public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
            this.SharedMat = sharedMat;
            this.ShouldModifySharedMat = sharedMat == renderMat;
            this.RectTransform = rectTransform;
        }

        public event EventHandler OnComponentSettingsChanged;

        public void OnValidate() {
            Radius = m_Radius;
            FitToRect = m_FitRadius;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_Radius = material.GetFloat(SpRadius);
            m_FitRadius = material.GetInt(SpFitRadius) == 1;
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.SetFloat(SpRadius, m_Radius);
            material.SetInt(SpFitRadius, m_FitRadius?1:0);
        }

        internal void UpdateCircleRadius(RectTransform rectT) {
            this.RectTransform = rectT;
            if (m_FitRadius) {
                m_Radius = CircleFitRadius;
            }
        }
    }
}