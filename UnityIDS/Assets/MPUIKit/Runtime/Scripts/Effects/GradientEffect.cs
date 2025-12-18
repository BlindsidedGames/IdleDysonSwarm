using System;
using System.Collections.Generic;
using UnityEngine;

namespace MPUIKIT {
    /// <summary>
    /// Gradient overlay of the image. 
    /// </summary>
    [Serializable]
    public struct GradientEffect : IMPUIComponent {

        [SerializeField] private bool m_Enabled;
        [SerializeField] private GradientType m_GradientType;
        [SerializeField] private Gradient m_Gradient;
        [SerializeField] private Color[] m_CornerGradientColors;
        [SerializeField] private float m_Rotation;

        /// <summary>
        /// Enable/Disable Gradient overlay
        /// </summary>
        public bool Enabled {
            get => m_Enabled;
            set {
                m_Enabled = value;
                if (ShouldModifySharedMat) {
                    SharedMat.SetInt(SpEnableGradient, m_Enabled?1:0);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
            }
        }
        
        /// <summary>
        /// Type of the Gradient. There are three types: Linear, Radial, Corner
        /// </summary>
        public GradientType GradientType {
            get => m_GradientType;
            set {
                m_GradientType = value;
                if (ShouldModifySharedMat) {
                    SharedMat.SetInt(SpGradientType, (int)m_GradientType);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);

            }
        }
        
        /// <summary>
        /// Rotation of the gradient. Only applies for Linear Gradient.
        /// </summary>
        public float Rotation {
            get => m_Rotation;
            set {
                m_Rotation = value;
                if (ShouldModifySharedMat) {
                    SharedMat.SetFloat(SpGradientRotation, m_Rotation);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);

            }
        }
        
        /// <summary>
        /// Gradient that will be overlaid onto the image.
        /// </summary>
        public Gradient Gradient {
            get => m_Gradient;
            set {
                m_Gradient = value;
                if (ShouldModifySharedMat) {
                    List<Color> Colors = new List<Color>(8);
                    List<Color> Alphas = new List<Color>(8);
                    for (int i = 0; i < 8; i++) {
                        if (i < m_Gradient.colorKeys.Length) {
                            Color col = m_Gradient.colorKeys[i].color;
                            Vector4 data = new Vector4(col.r, col.g, col.b, 
                                m_Gradient.colorKeys[i].time);
                            Colors.Add(data);
                            SharedMat.SetColor("_GradientColor"+i, data);
                        }
                        else {
                            SharedMat.SetColor("_GradientColor"+i, Vector4.zero);
                        }
                        if (i < m_Gradient.alphaKeys.Length) {
                            Vector4 data = new Vector4(m_Gradient.alphaKeys[i].alpha, m_Gradient.alphaKeys[i].time);
                            Alphas.Add(data);
                            SharedMat.SetColor("_GradientAlpha"+i, data);
                        }
                        else {
                            SharedMat.SetColor("_GradientAlpha"+i, Vector4.zero);
                        }
                    }
                    
                    SharedMat.SetInt(SpGradientColorsLength, m_Gradient.colorKeys.Length);
                    SharedMat.SetInt(SpGradientAlphasLength, m_Gradient.alphaKeys.Length);
                    
                    for (int i = Colors.Count; i < 8; i++)
                    {
                        Colors.Add(Vector4.zero);
                    }

                    for (int i = Alphas.Count; i < 8; i++)
                    {
                        Alphas.Add(Vector4.zero);
                    }
                    
                    SharedMat.SetColorArray(SpGradientColors, Colors);
                    SharedMat.GetColorArray(SpGradientAlphas, Alphas);
                    SharedMat.SetInt(SpGradientInterpolationType, (int) m_Gradient.mode);
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);

            }
        }
        
        /// <summary>
        /// 4 Colors for Corner Gradient overlay.
        /// <para>[0] => top-left, [1] => top-right</para>
        /// <para>[2] => bottom-left, [3] => bottom-right</para>
        /// </summary>
        public Color[] CornerGradientColors {
            get => m_CornerGradientColors;
            set {
                
                if (m_CornerGradientColors.Length != 4) {
                    m_CornerGradientColors = new Color[4];
                }

                for (int i = 0; i < value.Length && i < 4; i++) {
                    m_CornerGradientColors[i] = value[i];
                }

                if (ShouldModifySharedMat) {
                    for (int i = 0; i < m_CornerGradientColors.Length; i++) {
                        SharedMat.SetColor("_CornerGradientColor"+i, m_CornerGradientColors[i]);
                    }
                }
                OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);

            }
        }
        
        
        private static readonly int SpGradientType = Shader.PropertyToID("_GradientType");
        private static readonly int SpGradientColors = Shader.PropertyToID("colors");
        private static readonly int SpGradientAlphas = Shader.PropertyToID("alphas");
        private static readonly int SpGradientColorsLength = Shader.PropertyToID("_GradientColorLength");
        private static readonly int SpGradientAlphasLength = Shader.PropertyToID("_GradientAlphaLength");
        private static readonly int SpGradientInterpolationType = Shader.PropertyToID("_GradientInterpolationType");
        private static readonly int SpEnableGradient = Shader.PropertyToID("_EnableGradient");
        private static readonly int SpGradientRotation = Shader.PropertyToID("_GradientRotation");

        public Material SharedMat { get; set; }
        public bool ShouldModifySharedMat { get; set; }
        public RectTransform RectTransform { get; set; }
        

        public void Init(Material SharedMat, Material renderMat, RectTransform rectTransform) {
            this.SharedMat = SharedMat;
            this.ShouldModifySharedMat = SharedMat == renderMat;
            this.RectTransform = rectTransform;
            
            if (m_CornerGradientColors == null || m_CornerGradientColors.Length != 4) {
                m_CornerGradientColors = new Color[4];
            }
        }

        public event EventHandler OnComponentSettingsChanged;

        public void OnValidate() {
            Enabled = m_Enabled;
            GradientType = m_GradientType;
            Gradient = m_Gradient;
            CornerGradientColors = m_CornerGradientColors;
            Rotation = m_Rotation;
        }

        public void InitValuesFromMaterial(ref Material material) {
            m_Enabled = material.GetInt(SpEnableGradient) == 1;
            m_GradientType = (GradientType) material.GetInt(SpGradientType);
            m_Rotation = material.GetFloat(SpGradientRotation);
            int colorLength = material.GetInt(SpGradientColorsLength);
            int alphaLength = material.GetInt(SpGradientAlphasLength);
            Gradient gradient = new Gradient();
            GradientColorKey[] colorKeys = new GradientColorKey[colorLength];
            GradientAlphaKey[] alphaKeys = new GradientAlphaKey[alphaLength];
            for (int i = 0; i < colorLength; i++) {
                Color colorValue = material.GetColor("_GradientColor" + i);
                colorKeys[i].color = new Color(colorValue.r, colorValue.g, colorValue.b);
                colorKeys[i].time = colorValue.a;
            }

            gradient.colorKeys = colorKeys;
            for (int i = 0; i < alphaLength; i++) {
                Color alphaValue = material.GetColor("_GradientAlpha" + i);
                alphaKeys[i].alpha = alphaValue.r;
                alphaKeys[i].time = alphaValue.g;
            }

            gradient.alphaKeys = alphaKeys;
            gradient.mode = (GradientMode) material.GetInt(SpGradientInterpolationType);
            m_Gradient = gradient;

            m_CornerGradientColors = new Color[4];
            for (int i = 0; i < CornerGradientColors.Length; i++) {
                CornerGradientColors[i] = material.GetColor("_CornerGradientColor" + i);
            }
        }

        public void ModifyMaterial(ref Material material, params object[] otherProperties) {
            material.DisableKeyword("GRADIENT_LINEAR");
            material.DisableKeyword("GRADIENT_RADIAL");
            material.DisableKeyword("GRADIENT_CORNER");
            
            
            if (!m_Enabled) return;
            material.SetInt(SpEnableGradient, m_Enabled?1:0);
            material.SetInt(SpGradientType, (int)m_GradientType);
            switch (m_GradientType) {
                case GradientType.Linear:
                    material.EnableKeyword("GRADIENT_LINEAR");
                    break;
                case GradientType.Radial:
                    material.EnableKeyword("GRADIENT_RADIAL");
                    break;
                case GradientType.Corner:
                    material.EnableKeyword("GRADIENT_CORNER");
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }

               
            if (m_GradientType == GradientType.Corner) {
                for (int i = 0; i < m_CornerGradientColors.Length; i++) {
                    material.SetColor("_CornerGradientColor"+i, m_CornerGradientColors[i]);
                }
            }
            else {
                Color[] colors = new Color[8];
                Color[] alphas = new Color[8];
                for (int i = 0; i < m_Gradient.colorKeys.Length; i++) {
                    Color col = m_Gradient.colorKeys[i].color;
                    colors[i] = new Color(col.r, col.g, col.b, m_Gradient.colorKeys[i].time);
                }
                for (int i = 0; i < m_Gradient.alphaKeys.Length; i++) {
                    alphas[i] = new Color(m_Gradient.alphaKeys[i].alpha, m_Gradient.alphaKeys[i].time, 0, 0);
                }
                
                material.SetFloat(SpGradientColorsLength, m_Gradient.colorKeys.Length);
                material.SetFloat(SpGradientAlphasLength, m_Gradient.alphaKeys.Length);
                material.SetFloat(SpGradientInterpolationType, (int)m_Gradient.mode);
                material.SetFloat(SpGradientRotation, m_Rotation);
                
                for (int i = 0; i < colors.Length; i++) {
                    material.SetColor("_GradientColor"+i, colors[i]);
                }
                
                for (int i = 0; i < alphas.Length; i++) {
                    material.SetColor("_GradientAlpha"+i, alphas[i]);
                }
            }
        }
    }
}
