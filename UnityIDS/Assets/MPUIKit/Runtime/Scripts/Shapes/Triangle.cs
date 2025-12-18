using System;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// Isosceles triangle where two sides of the triangle are equal. Width and height of the shape is
    /// the same as the rect-transform
    /// </summary>
    [Serializable]
    public struct Triangle : IMPUIComponent {

        [SerializeField] private Vector3 m_CornerRadius;
#if UNITY_EDITOR
        [SerializeField] private bool m_UniformCornerRadius;
#endif

        /// <summary>
        /// <para>Radius of the three corners. Counter-Clockwise from bottom-left</para>
        /// <para>x => bottom-left, y => bottom-right</para>
        /// <para>z => top</para>
        /// </summary>
        public Vector3 CornerRadius {
            get => m_CornerRadius;
            set {
                m_CornerRadius = Vector3.Max(value, Vector3.zero);
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpTriangleCornerRadius, m_CornerRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        private static readonly int SpTriangleCornerRadius = Shader.PropertyToID("_TriangleCornerRadius");

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
            CornerRadius = m_CornerRadius;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_CornerRadius = material.GetVector(SpTriangleCornerRadius);
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.SetVector(SpTriangleCornerRadius, m_CornerRadius);
        }
    }
}