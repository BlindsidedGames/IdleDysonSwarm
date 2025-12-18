using System;
using UnityEngine;
using UnityEngine.UI;

namespace MPUIKIT {
    [AddComponentMenu("UI/MPUI/MPImageBasic")]
    public class MPImageBasic : Image {

        #region SerializedFields

        [SerializeField] private DrawShape m_DrawShape = DrawShape.None;
        [SerializeField] private Type m_ImageType = Type.Simple;                                                                           // Mapping in Vertex Stream
        [SerializeField] private float m_StrokeWidth;                               // MapTo -> UV2.x
        [SerializeField] private float m_FalloffDistance = 0.5f;                    // MapTo -> UV2.y
        [SerializeField] private float m_OutlineWidth;                              // MapTo -> Normal.x
        [SerializeField] private Color m_OutlineColor = Color.black;                // MapTo -> Tangent.x, Tangent.y, Tangent.z, Tangent.w
        [SerializeField] private float m_ShapeRotation;                             // MapTo -> UV3.x Compressed
        [SerializeField] private bool m_ConstrainRotation = true;                   // MapTo -> UV3.x Compressed
        [SerializeField] private bool m_FlipHorizontal;                             // MapTo -> UV3.x Compressed
        [SerializeField] private bool m_FlipVertical;                               // MapTo -> UV3.x Compressed
        [SerializeField] private CornerStyleType m_CornerStyle;                     // MapTo -> UV3.y

        [SerializeField] private Vector4 m_RectangleCornerRadius;                   // MapTo -> Normal.y, Normal.z compressed
        [SerializeField] private Vector3 m_TriangleCornerRadius;                    // MapTo -> Normal.y, Normal.z compressed
#pragma warning disable
        // ReSharper disable once NotAccessedField.Local
        [SerializeField] private bool m_TriangleUniformCornerRadius = true;
        // ReSharper disable once NotAccessedField.Local
        [SerializeField] private bool m_RectangleUniformCornerRadius = true;
#pragma warning restore


        [SerializeField] private float m_CircleRadius;                              // MapTo -> Normal.y
        [SerializeField] private bool m_CircleFitToRect = true;                     // MapTo -> Normal.z

        [SerializeField] private int m_NStarPolygonSideCount = 3;                   // MapTo -> Normal.y compressed
        [SerializeField] private float m_NStarPolygonInset = 2f;                    // MapTo -> Normal.y compressed
        [SerializeField] private float m_NStarPolygonCornerRadius;                  // MapTo -> Normal.z
        
        #endregion

        #region Public Accessors

        public DrawShape Shape { get => m_DrawShape;
            set {
                m_DrawShape = value;
                m_Material = null;
                base.SetMaterialDirty();
                base.SetVerticesDirty();
            }
        }
        public float StrokeWidth {
            get => m_StrokeWidth;
            set {
                Vector2 size = GetPixelAdjustedRect().size;
                m_StrokeWidth = Mathf.Clamp(value, 0, Mathf.Min(size.x, size.y) * 0.5f);
                base.SetVerticesDirty();
            }
        }
        public float FallOffDistance {
            get => m_FalloffDistance;
            set {
                m_FalloffDistance = Mathf.Max(0, value);
                base.SetVerticesDirty();
            }
        }
        public float OutlineWidth {
            get => m_OutlineWidth;
            set {
                m_OutlineWidth = Mathf.Max(0,value);
                base.SetVerticesDirty();
            }
        }
        public Color OutlineColor {
            get => m_OutlineColor;
            set {
                m_OutlineColor = value;
                base.SetVerticesDirty();
            }
        }

        public float ShapeRotation {
            get => m_ShapeRotation;
            set {
                m_ShapeRotation = value % 360;
                ConstrainRotationValue();
                base.SetVerticesDirty();
            }
        }
        public bool ConstrainRotation {
            get => m_ConstrainRotation;
            set {
                m_ConstrainRotation = value;
                ConstrainRotationValue();
                base.SetVerticesDirty();
            }
        }
        public bool FlipHorizontal {
            get => m_FlipHorizontal;
            set {
                m_FlipHorizontal = value; 
                base.SetVerticesDirty();
            }
        }
        public bool FlipVertical {
            get => m_FlipVertical;
            set {
                m_FlipVertical = value; 
                base.SetVerticesDirty();
            }
        }
        
        /// <summary>
        /// Type of the image. Only two types are supported. Simple and Filled.
        /// Default and fallback value is Simple.
        /// </summary>
        public new Type type {
            get => m_ImageType;
            set {
                if (m_ImageType != value) {
                    switch (value) {
                        case Type.Simple:
                        case Type.Filled:
                            if (sprite) m_ImageType = value;
                            break;
                        case Type.Tiled:
                        case Type.Sliced:
                            break;
                        default:
                            throw new ArgumentOutOfRangeException(value.ToString(), value, null);
                    }
                }
                if(base.type != m_ImageType) base.type = m_ImageType;
                base.SetAllDirty();
            }
        }
        
        public CornerStyleType CornerStyle {
            get => m_CornerStyle;
            set {
                m_CornerStyle = value;
                base.SetVerticesDirty();
            }
        }
        public Vector3 TriangleCornerRadius {
            get => m_TriangleCornerRadius;
            set {
                Vector2 size = GetPixelAdjustedRect().size;

                float zMax = size.x * 0.5f;
                m_TriangleCornerRadius.z = Mathf.Clamp(value.z, 0, zMax);
                float hMax = Mathf.Min(size.x, size.y) * 0.3f;
                
                m_TriangleCornerRadius.x = Mathf.Clamp(value.x, 0, hMax);
                m_TriangleCornerRadius.y = Mathf.Clamp(value.y, 0, hMax);
                
                base.SetVerticesDirty();
            }
        }
        public Vector4 RectangleCornerRadius {
            get => m_RectangleCornerRadius;
            set
            {
                m_RectangleCornerRadius = value;
                base.SetVerticesDirty();
            }
        }
        public float CircleRadius {
            get => m_CircleRadius;
            set {
                m_CircleRadius = Mathf.Clamp(value, 0, GetMinSize());
                base.SetVerticesDirty();
            }
        }
        public bool CircleFitToRect {
            get => m_CircleFitToRect;
            set {
                m_CircleFitToRect = value;
                base.SetVerticesDirty();
            }
        }
        public float NStarPolygonCornerRadius {
            get => m_NStarPolygonCornerRadius;
            set {
                float halfHeight = GetPixelAdjustedRect().height * 0.5f;
                m_NStarPolygonCornerRadius = Mathf.Clamp(value, m_NStarPolygonSideCount == 2? 0.1f : 0f, halfHeight);
                base.SetVerticesDirty();
            }
        }
        public float NStarPolygonInset {
            get => m_NStarPolygonInset;
            set {
                m_NStarPolygonInset = Mathf.Clamp(value, 2f, m_NStarPolygonSideCount);
                base.SetVerticesDirty();
            }
        }
        public int NStarPolygonSideCount {
            get => m_NStarPolygonSideCount;
            set {
                m_NStarPolygonSideCount = Mathf.Clamp(value, 2, 10);
                base.SetVerticesDirty();
            }
        }
        
        #endregion
        
        public override Material material {
            get
            {
                switch (m_DrawShape)
                {
                    case DrawShape.None:
                         return Canvas.GetDefaultCanvasMaterial();
                    case DrawShape.Circle:
                    case DrawShape.Triangle:
                    case DrawShape.Rectangle:
                        return MPMaterials.GetMaterial((int)m_DrawShape - 1, m_StrokeWidth > 0f, m_OutlineWidth > 0f);
                    case DrawShape.Pentagon:
                    case DrawShape.Hexagon:
                    case DrawShape.NStarPolygon:
                        return MPMaterials.GetMaterial(3, m_StrokeWidth > 0f, m_OutlineWidth > 0f);
                    default:
                        throw new ArgumentOutOfRangeException();
                }
            }
            set => Debug.LogWarning("Setting Material of MPImageBasic has no effect.");
        }

        public override float preferredWidth => sprite == MPImageUtility.EmptySprite ? 0 : base.preferredWidth;
        public override float preferredHeight => sprite == MPImageUtility.EmptySprite ? 0 : base.preferredHeight;


        protected override void OnEnable() {
            base.OnEnable();
            MPImageUtility.FixAdditionalShaderChannelsInCanvas(canvas);
            if (sprite == null) sprite = MPImageUtility.EmptySprite;
        }

        #if UNITY_EDITOR
        protected override void OnValidate() {
            base.OnValidate();
            Shape = m_DrawShape;
            if (sprite == null) sprite = MPImageUtility.EmptySprite;
            type = m_ImageType;
            StrokeWidth = m_StrokeWidth;
            FallOffDistance = m_FalloffDistance;
            OutlineWidth = m_OutlineWidth;
            OutlineColor = m_OutlineColor;
            ShapeRotation = m_ShapeRotation;
            ConstrainRotation = m_ConstrainRotation;
            FlipHorizontal = m_FlipHorizontal;
            FlipVertical = m_FlipVertical;
            CornerStyle = m_CornerStyle;
        }
#endif

        private float GetMinSizeHalf() {
            return GetMinSize() * 0.5f;
        }

        private float GetMinSize() {
            Vector2 size = GetPixelAdjustedRect().size;
            return Mathf.Min(size.x, size.y);
        }

        private void ConstrainRotationValue() {
            if (!m_ConstrainRotation) return;
            float finalRotation =  m_ShapeRotation - (m_ShapeRotation % 90);
            if (Mathf.Abs(finalRotation) >= 360) finalRotation = 0;
            m_ShapeRotation =  finalRotation;
        }
        
        protected override void OnTransformParentChanged() {
            base.OnTransformParentChanged();
            MPImageUtility.FixAdditionalShaderChannelsInCanvas(canvas);
            base.SetVerticesDirty();
        }

        private MPVertexStream CreateVertexStream() {
            MPVertexStream stream = new MPVertexStream();
            RectTransform rectT = rectTransform;
            stream.RectTransform = rectT;
            Rect r = GetPixelAdjustedRect();
            stream.Uv1 = new Vector2(r.width + m_FalloffDistance, r.height + m_FalloffDistance);
            float packedRotData =
                PackRotationData(m_ShapeRotation, m_ConstrainRotation, m_FlipHorizontal, m_FlipVertical);
            stream.Uv3 = new Vector2(packedRotData, (float)m_CornerStyle);

            stream.Tangent = QualitySettings.activeColorSpace == ColorSpace.Linear? m_OutlineColor.linear : m_OutlineColor;
            Vector3 normal = new Vector3();
            normal.x = m_OutlineWidth;
            normal.y = m_StrokeWidth;
            normal.z = m_FalloffDistance;
            
            Vector4 data;
            Vector2 shapeProps;
            switch (m_DrawShape) {
                case DrawShape.Circle:
                    shapeProps = new Vector2(m_CircleRadius, m_CircleFitToRect ? 1 : 0);
                    break;
                case DrawShape.Triangle:
                    data = m_TriangleCornerRadius;
                    data = data / Mathf.Min(r.width, r.height);
                    shapeProps = MPImageUtility.Encode_0_1_16(data);
                    break;
                case DrawShape.Rectangle:
                    data = FixRadius(m_RectangleCornerRadius);
                    data = data / Mathf.Min(r.width, r.height);
                    shapeProps = MPImageUtility.Encode_0_1_16(data);
                    break;
                case DrawShape.NStarPolygon:
                    data = new Vector4(m_NStarPolygonSideCount, m_NStarPolygonCornerRadius, m_NStarPolygonInset);
                    data = data / Mathf.Min(r.width, r.height);
                    shapeProps = MPImageUtility.Encode_0_1_16(data);
                    break;
                default:
                    shapeProps = Vector2.zero;
                    break;
            }

            stream.Uv2 = shapeProps;
            
            stream.Normal = normal;
            return stream;
        }

        private float PackRotationData(float rotation, bool constrainRotation, bool flipH, bool flipV) {
            int c = constrainRotation ? 1 : 0;
            c += flipH ? 10 : 0;
            c += flipV ? 100 : 0;
            float cr = rotation % 360f;
            float sign = cr >= 0 ? 1 : -1;
            cr = Mathf.Abs(cr) / 360f;
            cr = (cr + c) * sign;
            return cr;
        }
        

        void UnPackRotation(float f) {
            float r = 0, x = 0, y = 0, z = 0;
            
            float sign = f >= 0.0f ? 1 : -1;
            f = Mathf.Abs(f);
            r = fract(f) * 360f * sign;
            
            f = Mathf.Floor(f);
            float p = f / 100f;
            z = Mathf.Floor(p);
            p = fract(p) * 10f;
            y = Mathf.Floor(p);
            p = fract(p) * 10f;
            x = Mathf.Round(p);

            // Debug.Log($"Rotation: {r}, X: {x}, Y: {y}, Z: {z}");
            float fract(float val) {
                val = Mathf.Abs(val);
                float ret = val - Mathf.Floor(val);
                return ret;
            }
        }

        protected override void OnRectTransformDimensionsChange()
        {
            base.OnRectTransformDimensionsChange();
            base.SetVerticesDirty();
        }

        private Vector4 FixRadius(Vector4 radius)
        {
            Rect rect = rectTransform.rect;
            
            radius = Vector4.Max(radius, Vector4.zero);
            radius = Vector4.Min(radius, Vector4.one * Mathf.Min(rect.width, rect.height));
            float scaleFactor = 
                Mathf.Min (
                    Mathf.Min (
                        Mathf.Min (
                            Mathf.Min (
                                rect.width / (radius.x + radius.y), 
                                rect.width / (radius.z + radius.w)),
                            rect.height / (radius.x + radius.w)), 
                        rect.height / (radius.z + radius.y)), 
                    1f);
            return radius * scaleFactor;
        }


        protected override void OnPopulateMesh(VertexHelper toFill) {
            base.OnPopulateMesh(toFill);

            MPVertexStream stream = CreateVertexStream();
            
            UIVertex uiVert = new UIVertex();

            for (int i = 0; i < toFill.currentVertCount; i++) {
                toFill.PopulateUIVertex(ref uiVert, i);
                
                //uiVert.position += ((Vector3)uiVert.uv0 - new Vector3(0.5f, 0.5f)) * m_FalloffDistance;
                uiVert.uv1 = stream.Uv1;
                uiVert.uv2 = stream.Uv2;
                uiVert.uv3 = stream.Uv3;
                uiVert.normal = stream.Normal;
                uiVert.tangent = stream.Tangent;
                
                toFill.SetUIVertex(uiVert, i);
            }
        }

#if UNITY_EDITOR
        protected override void Reset() {
            base.Reset();
            if (sprite == null) sprite = MPImageUtility.EmptySprite;

        }
#else
        void Reset() {
            if (sprite == null) sprite = MPImageUtility.EmptySprite;
        }
#endif
    }
}