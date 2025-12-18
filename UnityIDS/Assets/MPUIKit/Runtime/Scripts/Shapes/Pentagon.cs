using System;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// Pentagon shape with two parallel opposite equal sides. It is basically a rectangle but one of the sides
    /// of the rectangle is broken into halves and pulled out.  
    /// </summary>
    [Serializable]
    public struct Pentagon : IMPUIComponent{
        [SerializeField] private Vector4 m_CornerRadius;
        [SerializeField] private bool m_UniformCornerRadius;
        [SerializeField] private float m_TipRadius;
        [SerializeField] private float m_TipSize;
        
        /// <summary>
        /// <para>Radius of the four corners of the rectangular part. Clockwise from top-left</para>
        /// <para>x => top-left, y => top-right</para>
        /// <para>z => bottom-right, w => bottom-left</para>
        /// </summary>
        public Vector4 CornerRadius {
            get => m_CornerRadius;
            set {
                m_CornerRadius = Vector4.Max(value, Vector4.zero); 
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpPentagonRectCornerRadius, m_CornerRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// Corner radius of the tip. The fifth corner of the pentagon shape. 
        /// </summary>
        public float TipRadius {
            get => m_TipRadius;
            set {
                m_TipRadius = Mathf.Max(value, 0.001f); 
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpPentagonTriangleCornerRadius, m_TipRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// Size of the tip (the triangular part sticking out of the rectangular part of the shape)
        /// </summary>
        public float TipSize {
            get => m_TipSize;
            set {
                m_TipSize = Mathf.Max(value, 1);
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpPentagonTriangleSize, m_TipSize);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        
        private static readonly int SpPentagonRectCornerRadius = Shader.PropertyToID("_PentagonCornerRadius");
        private static readonly int SpPentagonTriangleCornerRadius = Shader.PropertyToID("_PentagonTipRadius");
        private static readonly int SpPentagonTriangleSize = Shader.PropertyToID("_PentagonTipSize");


        public Material SharedMat { get; set; }
        public bool ShouldModifySharedMat { get; set; }
        public RectTransform RectTransform { get; set; }

        public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
            SharedMat = sharedMat;
            ShouldModifySharedMat = sharedMat == renderMat;
            RectTransform = rectTransform;

            TipSize = m_TipSize;
            TipRadius = m_TipRadius;
        }

        public event EventHandler OnComponentSettingsChanged;

        public void OnValidate() {
            CornerRadius = m_CornerRadius;
            TipSize = m_TipSize;
            TipRadius = m_TipRadius;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_CornerRadius = material.GetVector(SpPentagonRectCornerRadius);
            m_TipSize = material.GetFloat(SpPentagonTriangleSize);
            m_TipRadius = material.GetFloat(SpPentagonTriangleCornerRadius);
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.SetVector(SpPentagonRectCornerRadius, m_CornerRadius);
            material.SetFloat(SpPentagonTriangleCornerRadius, m_TipRadius);
            material.SetFloat(SpPentagonTriangleSize, m_TipSize);
        }
    }
}