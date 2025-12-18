using System;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// Hexagon shape with two opposite parallel equal sides. It is basically a rectangle where two
    /// of it's sides are broken into halves and pulled out of the shape that creates two triangle tips
    /// left and right of the shape.
    /// </summary>
    [Serializable]
    public struct Hexagon: IMPUIComponent {
        [SerializeField] private Vector4 m_CornerRadius;
        [SerializeField] private bool m_UniformCornerRadius;
        [SerializeField] private Vector2 m_TipSize;
        [SerializeField] private bool m_UniformTipSize;
        [SerializeField] private Vector2 m_TipRadius;
        [SerializeField] private bool m_UniformTipRadius;
        
        /// <summary>
        /// Sizes of the two tips (the triangular part sticking out of the rectangular part of the shape)
        /// <para>x => left tip, y => right tip</para>
        /// </summary>
        public Vector2 TipSize {
            get => m_TipSize;
            set {
                m_TipSize = Vector2.Max(value, Vector2.one);
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpHexagonTipSizes, m_TipSize);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// Radius of the corner of the tips.
        /// <para>x => left tip's corner, y => right tip's corner</para>
        /// </summary>
        public Vector2 TipRadius {
            get => m_TipRadius;
            set {
                m_TipRadius = Vector2.Max(value, Vector2.one); 
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpHexagonTipRadius, m_TipRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }

        /// <summary>
        /// <para>Radius of the four corners of the rectangular part of the shape.
        /// Counter-Clockwise from bottom-left</para>
        /// <para>x => bottom-left, y => bottom-right</para>
        /// <para>z => top-right, w => top-left</para>
        /// </summary>
        public Vector4 CornerRadius {
            get => m_CornerRadius;
            set {
                m_CornerRadius = Vector4.Max(value, Vector4.one);
                if (ShouldModifySharedMat) {
                    SharedMat.SetVector(SpHexagonRectCornerRadius, m_CornerRadius);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        private static readonly int SpHexagonTipSizes = Shader.PropertyToID("_HexagonTipSize");
        private static readonly int SpHexagonTipRadius = Shader.PropertyToID("_HexagonTipRadius");
        private static readonly int SpHexagonRectCornerRadius = Shader.PropertyToID("_HexagonCornerRadius");


        public Material SharedMat { get; set; }
        public bool ShouldModifySharedMat { get; set; }
        public RectTransform RectTransform { get; set; }
        

        public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
            SharedMat = sharedMat;
            ShouldModifySharedMat = sharedMat == renderMat;
            RectTransform = rectTransform;

            TipRadius = m_TipRadius;
            TipSize = m_TipSize;
        }

        public event EventHandler OnComponentSettingsChanged;

        public void OnValidate() {
            CornerRadius = m_CornerRadius;
            TipSize = m_TipSize;
            TipRadius = m_TipRadius;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_CornerRadius = material.GetVector(SpHexagonRectCornerRadius);
            m_TipRadius = material.GetVector(SpHexagonTipRadius);
            m_TipSize = material.GetVector(SpHexagonTipSizes);
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.SetVector(SpHexagonTipSizes, m_TipSize);
            material.SetVector(SpHexagonTipRadius, m_TipRadius);
            material.SetVector(SpHexagonRectCornerRadius, m_CornerRadius);
        }
    }
}