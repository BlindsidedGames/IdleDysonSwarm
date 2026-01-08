using System;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// N-star polygon shape is equal sided uniform polygon shape with the ability to morph
    /// to a star corresponding to the original shape. ie: an equilateral pentagon will morph
    /// to a five sided star.
    /// </summary>
    [Serializable]
    public struct NStarPolygon: IMPUIComponent {
        [SerializeField] private float m_SideCount;
        [SerializeField] private float m_Inset;
        [SerializeField] private float m_CornerRadius;
        [SerializeField] private Vector2 m_Offset;
        
        /// <summary>
        /// How many sides should there be in the shape. These sides are equal is size.
        /// 3 sides create an equilateral triangle, 6 sides create a hexagon and so on
        /// <para>Value of SideCount should remain between 3 and 10.</para>
        /// </summary>
        public float SideCount {
            get => m_SideCount;
            set {
                m_SideCount = Mathf.Clamp(value, 3f, 10f);
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpNStarPolygonSideCount, m_SideCount);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
                Inset = m_Inset;
            }
        }

        /// <summary>
        /// Inset is the value that determine how much should the sides go inside the shape
        /// and create a concave star shape. Each sides will break into half and their middle
        /// point will go towards the center of the shape
        /// <para>Value of inset should remain between 2 and (SideCount - 0.01). 2 is default
        /// and means no breaking of the sides. </para>
        /// </summary>
        public float Inset {
            get => m_Inset;
            set {
                m_Inset = Mathf.Clamp(value, 2f, SideCount - 0.01f);
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpNStarPolygonInset, m_Inset);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// Corner Radius of all the corners of the shape.
        /// </summary>
        public float CornerRadius {
            get => m_CornerRadius;
            set {
                m_CornerRadius = Mathf.Max(value, 0);
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpNStarPolygonCornerRadius, m_CornerRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// Position offset of the shape from the origin.
        /// </summary>
        public Vector2 Offset {
            get => m_Offset;
            set {
                m_Offset = value;
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpNStarPolygonOffset, m_Offset);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        private static readonly int SpNStarPolygonSideCount = Shader.PropertyToID("_NStarPolygonSideCount");
        private static readonly int SpNStarPolygonInset = Shader.PropertyToID("_NStarPolygonInset");
        private static readonly int SpNStarPolygonCornerRadius = Shader.PropertyToID("_NStarPolygonCornerRadius");
        private static readonly int SpNStarPolygonOffset = Shader.PropertyToID("_NStarPolygonOffset");

        public Material SharedMat { get; set; }
        public bool ShouldModifySharedMat { get; set; }
        public RectTransform RectTransform { get; set; }
        

        public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
            SharedMat = sharedMat;
            ShouldModifySharedMat = sharedMat == renderMat;
            RectTransform = rectTransform;
            
            OnValidate();
        }

        public event EventHandler OnComponentSettingsChanged;

        public void OnValidate() {
            SideCount = m_SideCount;
            Inset = m_Inset;
            CornerRadius = m_CornerRadius;
            Offset = m_Offset;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_SideCount = material.GetFloat(SpNStarPolygonSideCount);
            m_Inset = material.GetFloat(SpNStarPolygonInset);
            m_CornerRadius = material.GetFloat(SpNStarPolygonCornerRadius);
            m_Offset = material.GetVector(SpNStarPolygonOffset);
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.SetFloat(SpNStarPolygonSideCount, m_SideCount);
            material.SetFloat(SpNStarPolygonInset, m_Inset);
            material.SetFloat(SpNStarPolygonCornerRadius, m_CornerRadius);
            material.SetVector(SpNStarPolygonOffset, m_Offset);
        }
    }
}