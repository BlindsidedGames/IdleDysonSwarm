using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.UI.MPUIKIT;
#if UNITY_EDITOR
using UnityEditor;
#endif


namespace MPUIKIT {
    [AddComponentMenu("UI/MPUI/MPImage")]
    public class MPImage : Image {
        #region Constants

        public const string MpShaderName = "MPUI/Procedural Image";

        #endregion

        #region SerializedFields

        [SerializeField] private DrawShape m_DrawShape = DrawShape.None;
        [SerializeField] private Type m_ImageType = Type.Simple;
        [SerializeField] private MaterialMode m_MaterialMode;

        [SerializeField] private float m_StrokeWidth;
        [SerializeField] private float m_OutlineWidth;
        [SerializeField] private Color m_OutlineColor = Color.black;
        [SerializeField] private float m_FalloffDistance = 0.5f;
        [SerializeField] private bool m_ConstrainRotation = true;
        [SerializeField] private float m_ShapeRotation;
        [SerializeField] private bool m_FlipHorizontal;
        [SerializeField] private bool m_FlipVertical;

        [SerializeField] private Triangle m_Triangle = new Triangle();
        [SerializeField] private Rectangle m_Rectangle = new Rectangle();
        [SerializeField] private Circle m_Circle = new Circle();
        [SerializeField] private Pentagon m_Pentagon = new Pentagon();
        [SerializeField] private Hexagon m_Hexagon = new Hexagon();
        [SerializeField] private NStarPolygon m_NStarPolygon = new NStarPolygon();

        [SerializeField] private GradientEffect m_GradientEffect = new GradientEffect();

        #endregion

        #region Public Properties

        #region Draw Settings

        /// <summary>
        /// Type of the shape to be drawn. ie: Rectangle, Circle
        /// </summary>
        public DrawShape DrawShape {
            get => m_DrawShape;
            set {
                m_DrawShape = value;
                if (material == m_Material) {
                    m_Material.SetInt(SpDrawShape, (int) m_DrawShape);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Width of the stroke for the drawn shape. 0 is no stroke.
        /// </summary>
        public float StrokeWidth {
            get => m_StrokeWidth;
            set {
                m_StrokeWidth = value;
                m_StrokeWidth = m_StrokeWidth < 0 ? 0 : m_StrokeWidth;
                if (material == m_Material) {
                    m_Material.SetFloat(SpStrokeWidth, m_StrokeWidth);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Width of the outline for the drawn shape. 0 is no outline. 
        /// </summary>
        public float OutlineWidth {
            get => m_OutlineWidth;
            set {
                m_OutlineWidth = value;
                m_OutlineWidth = m_OutlineWidth < 0 ? 0 : m_OutlineWidth; 
                if (m_Material == material) {
                    m_Material.SetFloat(SpOutlineWidth, m_OutlineWidth);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Color of the Outline. Has no effect is teh value of the OutlineWidth is 0
        /// </summary>
        public Color OutlineColor {
            get => m_OutlineColor;
            set {
                m_OutlineColor = value;
                if (m_Material == material) {
                    m_Material.SetColor(SpOutlineColor, m_OutlineColor);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Edge falloff distance of the shape
        /// </summary>
        public float FalloffDistance {
            get { return m_FalloffDistance; }
            set {
                m_FalloffDistance = Mathf.Max(value, 0f);
                if (material == m_Material) {
                    m_Material.SetFloat(SpFalloffDistance, m_FalloffDistance);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Constrains rotation to 0, 90, 270 degrees angle if set to true. But the width and height of the shape
        /// is replaced as necessary to avoid clipping.
        /// If set to false, any shapes can be rotated in any arbitrary angle but will often result in
        /// clipping of the shape.
        /// </summary>
        public bool ConstrainRotation {
            get { return m_ConstrainRotation; }
            set {
                m_ConstrainRotation = value;

                if (m_Material == material) {
                    m_Material.SetInt(SpConstrainedRotation, value?1:0);
                }
                if (value) {
                    m_ShapeRotation = ConstrainRotationValue(m_ShapeRotation);
                }

                base.SetVerticesDirty();
                base.SetMaterialDirty();
            }
        }
        
        private float ConstrainRotationValue(float val) {
            float finalRotation =  val - val % 90;
            if (Mathf.Abs(finalRotation) >= 360) finalRotation = 0;
            return finalRotation;
        }

        /// <summary>
        /// Rotation of the shape.
        /// </summary>
        public float ShapeRotation {
            get { return m_ShapeRotation; }
            set {
                m_ShapeRotation = m_ConstrainRotation ? ConstrainRotationValue(value) : value;
                if (m_Material == material) {
                    m_Material.SetFloat(SpShapeRotation, m_ShapeRotation);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Flips the shape horizontally.
        /// </summary>
        public bool FlipHorizontal {
            get { return m_FlipHorizontal; }
            set {
                m_FlipHorizontal = value;
                if (m_Material == material) {
                    m_Material.SetInt(SpFlipHorizontal, m_FlipHorizontal ? 1 : 0);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Flips the shape vertically
        /// </summary>
        public bool FlipVertical {
            get { return m_FlipVertical; }
            set {
                m_FlipVertical = value;
                if (m_Material == material) {
                    m_Material.SetInt(SpFlipVertical, m_FlipVertical ? 1 : 0);
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Defines what material type of use to render the shape. Dynamic or Shared.
        /// Default is Dynamic and will issue one draw call per image object. If set to shared, assigned
        /// material in the material slot will be used to render the image. It will fallback to dynamic
        /// if no material in the material slot is assigned
        /// </summary>
        public MaterialMode MaterialMode {
            get { return m_MaterialMode; }
            set {
                if (m_MaterialMode == value) return;
                m_MaterialMode = value;
                InitializeComponents();
                if (material == m_Material) {
                    InitValuesFromSharedMaterial();
#if UNITY_EDITOR
                    _parseAgainOnValidate = true;
#endif
                }

                base.SetMaterialDirty();
            }
        }

        /// <summary>
        /// Shared material to use to render the shape. the material must use the "MPUI/Procedural Sprite" shader
        /// </summary>
        public override Material material {
            get {
                if (m_Material && m_MaterialMode == MaterialMode.Shared) {
                    return m_Material;
                }

                return DynamicMaterial;
            }
            set {
                m_Material = value;

                if (m_Material && m_MaterialMode == MaterialMode.Shared && m_Material.shader.name == MpShaderName) {
                    InitValuesFromSharedMaterial();
#if UNITY_EDITOR
                    _parseAgainOnValidate = true;
#endif
                }

                InitializeComponents();
                base.SetMaterialDirty();
            }
        }

        // ReSharper disable once InconsistentNaming
        /// <summary>
        /// Type of the image. Only two types are supported. Simple and Filled.
        /// Default and fallback value is Simple.
        /// </summary>
        public new Type type {
            get => m_ImageType;
            set {
                if (m_ImageType == value) return;
                switch (value) {
                    case Type.Simple:
                    case Type.Filled:
                            m_ImageType = value;
                        break;
                    case Type.Tiled:
                    case Type.Sliced:
                        break;
                    default:
                        throw new ArgumentOutOfRangeException(value.ToString(), value, null);
                }

                base.type = m_ImageType;
            }
        }

        #endregion

        public Triangle Triangle {
            get => m_Triangle;
            set {
                m_Triangle = value;
                SetMaterialDirty();
            }
        }

        public Rectangle Rectangle {
            get => m_Rectangle;
            set {
                m_Rectangle = value;
                SetMaterialDirty();
            }
        }

        public Circle Circle{
            get => m_Circle;
            set {
                m_Circle = value;
                SetMaterialDirty();
            }
        }

        public Pentagon Pentagon {
            get => m_Pentagon;
            set {
                m_Pentagon = value;
                SetMaterialDirty();
            }
        }

        public Hexagon Hexagon {
            get => m_Hexagon;
            set {
                m_Hexagon = value;
                SetMaterialDirty();
            }
        }

        public NStarPolygon NStarPolygon {
            get => m_NStarPolygon;
            set {
                m_NStarPolygon = value;
                SetMaterialDirty();
            }
        }

        public GradientEffect GradientEffect {
            get => m_GradientEffect;
            set {
                m_GradientEffect = value;
                SetMaterialDirty();
            }
        }

        #endregion

        #region Private Variables

        private Material _dynamicMaterial;

        private Material DynamicMaterial {
            get {
                if (_dynamicMaterial == null) {
                    _dynamicMaterial = new Material(Shader.Find(MpShaderName));
                    _dynamicMaterial.name += " [Dynamic]";
                }

                return _dynamicMaterial;
            }
        }

#if UNITY_EDITOR
        private bool _parseAgainOnValidate;
#endif

        private Sprite ActiveSprite {
            get {
                Sprite overrideSprite1 = overrideSprite;
                return overrideSprite1 != null ? overrideSprite1 : sprite;
            }
        }

        #endregion

        #region Material PropertyIds

        private static readonly int SpPixelWorldScale = Shader.PropertyToID("_PixelWorldScale");
        private static readonly int SpDrawShape = Shader.PropertyToID("_DrawShape");
        private static readonly int SpStrokeWidth = Shader.PropertyToID("_StrokeWidth");
        private static readonly int SpOutlineWidth = Shader.PropertyToID("_OutlineWidth");
        private static readonly int SpOutlineColor = Shader.PropertyToID("_OutlineColor");
        private static readonly int SpFalloffDistance = Shader.PropertyToID("_FalloffDistance");
        private static readonly int SpShapeRotation = Shader.PropertyToID("_ShapeRotation");
        private static readonly int SpConstrainedRotation = Shader.PropertyToID("_ConstrainRotation");
        private static readonly int SpFlipHorizontal = Shader.PropertyToID("_FlipHorizontal");
        private static readonly int SpFlipVertical = Shader.PropertyToID("_FlipVertical");

        #endregion


#if UNITY_EDITOR
        public void UpdateSerializedValuesFromSharedMaterial() {
            if (m_Material && MaterialMode == MaterialMode.Shared) {
                InitValuesFromSharedMaterial();
                base.SetMaterialDirty();
            }
        }

        protected override void OnValidate() {
            InitializeComponents();
            if (_parseAgainOnValidate) {
                InitValuesFromSharedMaterial();
                _parseAgainOnValidate = false;
            }

            DrawShape = m_DrawShape;

            StrokeWidth = m_StrokeWidth;
            OutlineWidth = m_OutlineWidth;
            OutlineColor = m_OutlineColor;
            FalloffDistance = m_FalloffDistance;
            ConstrainRotation = m_ConstrainRotation;
            ShapeRotation = m_ShapeRotation;
            FlipHorizontal = m_FlipHorizontal;
            FlipVertical = m_FlipVertical;
            

            m_Triangle.OnValidate();
            m_Circle.OnValidate();
            m_Rectangle.OnValidate();
            m_Pentagon.OnValidate();
            m_Hexagon.OnValidate();
            m_NStarPolygon.OnValidate();

            m_GradientEffect.OnValidate();

            base.OnValidate();
            base.SetMaterialDirty();
        }
#endif


        private void InitializeComponents() {
            m_Circle.Init(m_Material, material, rectTransform);
            m_Triangle.Init(m_Material, material, rectTransform);
            m_Rectangle.Init(m_Material, material, rectTransform);
            m_Pentagon.Init(m_Material, material, rectTransform);
            m_Hexagon.Init(m_Material, material, rectTransform);
            m_NStarPolygon.Init(m_Material, material, rectTransform);
            m_GradientEffect.Init(m_Material, material, rectTransform);
        }

        void FixAdditionalShaderChannelsInCanvas()
        {
            Canvas c = canvas;
            if(canvas == null) return;
            AdditionalCanvasShaderChannels additionalShaderChannels = c.additionalShaderChannels;
            additionalShaderChannels |= AdditionalCanvasShaderChannels.TexCoord1;
            additionalShaderChannels |= AdditionalCanvasShaderChannels.TexCoord2;
            c.additionalShaderChannels = additionalShaderChannels;
        }

#if UNITY_EDITOR
        protected override void Reset() {
            InitializeComponents();
            base.Reset();
        }
#else
        void Reset() {
            InitializeComponents();
        }
#endif

        protected override void Awake()
        {
            base.Awake();
            Init();
        }

        public void Init()
        {
            InitializeComponents();
            FixAdditionalShaderChannelsInCanvas();
            if (m_Material && MaterialMode == MaterialMode.Shared) {
                InitValuesFromSharedMaterial();
            }
            ListenToComponentChanges(true);
            base.SetAllDirty();
        }

        protected override void OnDestroy() {
            ListenToComponentChanges(false);
            base.OnDestroy();
        }

        protected void ListenToComponentChanges(bool toggle) {
            if (toggle) {
                m_Circle.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_Triangle.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_Rectangle.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_Pentagon.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_Hexagon.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_NStarPolygon.OnComponentSettingsChanged += OnComponentSettingsChanged;
                m_GradientEffect.OnComponentSettingsChanged += OnComponentSettingsChanged;
            }
            else {
                m_Circle.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_Triangle.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_Rectangle.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_Pentagon.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_Hexagon.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_NStarPolygon.OnComponentSettingsChanged -= OnComponentSettingsChanged;
                m_GradientEffect.OnComponentSettingsChanged += OnComponentSettingsChanged;
            }
        }

        protected override void OnTransformParentChanged()
        {
            base.OnTransformParentChanged();
            FixAdditionalShaderChannelsInCanvas();
        }

        private void OnComponentSettingsChanged(object sender, EventArgs e) {
            base.SetMaterialDirty();
        }


        protected override void OnRectTransformDimensionsChange() {
            base.OnRectTransformDimensionsChange();
            m_Circle.UpdateCircleRadius(rectTransform);
            base.SetMaterialDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh) {
            switch (type) {
                case Type.Simple:
                case Type.Sliced:
                case Type.Tiled:
                    MPImageHelper.GenerateSimpleSprite(vh, preserveAspect, canvas, rectTransform, ActiveSprite,
                        color, m_FalloffDistance);
                    break;
                case Type.Filled:
                    MPImageHelper.GenerateFilledSprite(vh, preserveAspect, canvas, rectTransform, ActiveSprite,
                        color, fillMethod, fillAmount, fillOrigin, fillClockwise, m_FalloffDistance);
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }
        }

        public override Material GetModifiedMaterial(Material baseMaterial) {
            
            Material mat = base.GetModifiedMaterial(baseMaterial);
            
            
            if (m_Material && MaterialMode == MaterialMode.Shared) {
                InitValuesFromSharedMaterial();
            }
            
            DisableAllMaterialKeywords(mat);


            RectTransform rt = rectTransform;
            if (DrawShape != DrawShape.None) {
                mat.SetFloat(SpOutlineWidth, m_OutlineWidth);
                mat.SetFloat(SpStrokeWidth, m_StrokeWidth);
                
                mat.SetColor(SpOutlineColor, OutlineColor);
                mat.SetFloat(SpFalloffDistance, FalloffDistance);
                
                float pixelSize = 1/Mathf.Max(0, FalloffDistance);
                mat.SetFloat(SpPixelWorldScale, Mathf.Clamp(pixelSize, 0f, 999999f));


                if (m_StrokeWidth > 0 && m_OutlineWidth > 0) {
                    mat.EnableKeyword("OUTLINED_STROKE");
                }
                else {
                    if (m_StrokeWidth > 0) {
                        mat.EnableKeyword("STROKE");
                    }
                    else if (m_OutlineWidth > 0) {
                        mat.EnableKeyword("OUTLINED");
                    }
                    else {
                        mat.DisableKeyword("OUTLINED_STROKE");
                        mat.DisableKeyword("STROKE");
                        mat.DisableKeyword("OUTLINED");
                    }
                }
            }


            m_Triangle.ModifyMaterial(ref mat);
            m_Circle.ModifyMaterial(ref mat, m_FalloffDistance);
            m_Rectangle.ModifyMaterial(ref mat);
            m_Pentagon.ModifyMaterial(ref mat);
            m_Hexagon.ModifyMaterial(ref mat);
            m_NStarPolygon.ModifyMaterial(ref mat);

            m_GradientEffect.ModifyMaterial(ref mat);


            switch (DrawShape) {
                case DrawShape.None:
                    mat.DisableKeyword("CIRCLE");
                    mat.DisableKeyword("TRIANGLE");
                    mat.DisableKeyword("RECTANGLE");
                    mat.DisableKeyword("PENTAGON");
                    mat.DisableKeyword("HEXAGON");
                    mat.DisableKeyword("NSTAR_POLYGON");
                    break;
                case DrawShape.Circle:
                    mat.EnableKeyword("CIRCLE");
                    break;
                case DrawShape.Triangle:
                    mat.EnableKeyword("TRIANGLE");
                    break;
                case DrawShape.Rectangle:
                    mat.EnableKeyword("RECTANGLE");
                    break;
                case DrawShape.Pentagon:
                    mat.EnableKeyword("PENTAGON");
                    break;
                case DrawShape.NStarPolygon:
                    mat.EnableKeyword("NSTAR_POLYGON");
                    break;
                case DrawShape.Hexagon:
                    mat.EnableKeyword("HEXAGON");
                    break;
                default:
                    throw new ArgumentOutOfRangeException();
            }

            mat.SetInt(SpDrawShape, (int) DrawShape);
            mat.SetInt(SpFlipHorizontal, m_FlipHorizontal ? 1 : 0);
            mat.SetInt(SpFlipVertical, m_FlipVertical ? 1 : 0);
            
            mat.SetFloat(SpShapeRotation, m_ShapeRotation);
            mat.SetInt(SpConstrainedRotation, m_ConstrainRotation?1:0);

            return mat;
        }

        private void DisableAllMaterialKeywords(Material mat) {
            mat.DisableKeyword("PROCEDURAL");
            mat.DisableKeyword("HYBRID");

            mat.DisableKeyword("CIRCLE");
            mat.DisableKeyword("TRIANGLE");
            mat.DisableKeyword("RECTANGLE");
            mat.DisableKeyword("PENTAGON");
            mat.DisableKeyword("HEXAGON");
            mat.DisableKeyword("NSTAR_POLYGON");

            mat.DisableKeyword("STROKE");
            mat.DisableKeyword("OUTLINED");
            mat.DisableKeyword("OUTLINED_STROKE");

            mat.DisableKeyword("ROUNDED_CORNERS");

            mat.DisableKeyword("GRADIENT_LINEAR");
            mat.DisableKeyword("GRADIENT_CORNER");
            mat.DisableKeyword("GRADIENT_RADIAL");
        }


        public void InitValuesFromSharedMaterial() {
            if (m_Material == null) return;
            Material mat = m_Material;

            //Debug.Log("Parsing shared mat");
            //Basic Settings
            m_DrawShape = (DrawShape) mat.GetInt(SpDrawShape);

            m_StrokeWidth = mat.GetFloat(SpStrokeWidth);
            m_FalloffDistance = mat.GetFloat(SpFalloffDistance);
            m_OutlineWidth = mat.GetFloat(SpOutlineWidth);
            m_OutlineColor = mat.GetColor(SpOutlineColor);
            m_FlipHorizontal = mat.GetInt(SpFlipHorizontal) == 1;
            m_FlipVertical = mat.GetInt(SpFlipVertical) == 1;
            m_ConstrainRotation = mat.GetInt(SpConstrainedRotation) == 1;
            m_ShapeRotation = mat.GetFloat(SpShapeRotation);
            //Debug.Log($"Parsed Falloff Distance: {m_FalloffDistance}");

            m_Triangle.InitValuesFromMaterial(ref mat);
            m_Circle.InitValuesFromMaterial(ref mat);
            m_Rectangle.InitValuesFromMaterial(ref mat);
            m_Pentagon.InitValuesFromMaterial(ref mat);
            m_Hexagon.InitValuesFromMaterial(ref mat);
            m_NStarPolygon.InitValuesFromMaterial(ref mat);

            //GradientEffect

            m_GradientEffect.InitValuesFromMaterial(ref mat);
        }

#if UNITY_EDITOR
        public Material CreateMaterialAssetFromComponentSettings() {
            Material matAsset = new Material(Shader.Find(MpShaderName));
            matAsset = GetModifiedMaterial(matAsset);
            string path = EditorUtility.SaveFilePanelInProject("Create Material for MPImage", 
                "MPMaterial", "mat", "Choose location");
            AssetDatabase.CreateAsset(matAsset, path);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return matAsset;
        }
#endif
    }
}
