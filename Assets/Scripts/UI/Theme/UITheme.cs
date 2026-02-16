using UnityEngine;

namespace IdleDysonSwarm.UI
{
    /*
    Purpose:
    - Central ScriptableObject theme definition for UI colors and rich-text color tags, including skill-tree button
      state palettes.

    Where it runs:
    - Runtime + editor data asset; read by runtime UI systems and edited through Unity inspector.

    Primary entry points:
    - Field values are consumed by UI systems directly.
    - Cached tag getters (AccentTag, HighlightTag, etc.) are read by UI formatting code.
    - OnValidate clears cached tags when edited in the inspector.

    Interacts with:
    - Calls into: UnityEngine.ColorUtility (HTML color tag generation).
    - Called by: UIThemeProvider and any UI/runtime script using theme colors, including SkillTreeManager button
      coloring paths.

    Change notes:
    - Serialized field names are asset schema; renames require migration of existing UITheme assets.
    - SkillTreeButtonColors additions/changes must remain compatible with existing theme assets loaded from
      Resources/DefaultUITheme.asset; newly added groups (for example owned and non-refundable variants) must have
      safe defaults.
    - If defaults change here, verify both fallback behavior and any authored UITheme assets so visuals remain
      intentional.
    */
    [CreateAssetMenu(fileName = "UITheme", menuName = "Idle Dyson Swarm/UI Theme")]
    public class UITheme : ScriptableObject
    {
        [System.Serializable]
        public class SkillTreeButtonColors
        {
            public Color normal;
            public Color pressed;
            public Color disabled;
            [Tooltip("Used in description mode when a skill cannot currently be purchased but should remain clickable.")]
            public Color notPurchasableNormal;
        }

        [Header("Text Colors")]
        [Tooltip("Primary accent color for important values (orange)")]
        public Color accentColor = new Color(1f, 0.643f, 0.369f); // #FFA45E

        [Tooltip("Secondary accent color for highlights (cyan/blue)")]
        public Color highlightColor = new Color(0f, 0.882f, 1f); // #00E1FF

        [Tooltip("Positive/success color (green)")]
        public Color positiveColor = new Color(0.569f, 0.867f, 0.561f); // #91DD8F

        [Tooltip("Warning color (yellow)")]
        public Color warningColor = new Color(1f, 0.922f, 0.231f); // #FFEB3B

        [Tooltip("Error/negative color (red)")]
        public Color negativeColor = new Color(1f, 0.341f, 0.341f); // #FF5757

        [Header("UI Colors")]
        [Tooltip("Background color for panels")]
        public Color panelBackground = new Color(0.1f, 0.1f, 0.15f, 0.95f);

        [Tooltip("Border color for UI elements")]
        public Color borderColor = new Color(0.3f, 0.3f, 0.4f);

        [Tooltip("Button normal state")]
        public Color buttonNormal = new Color(0.2f, 0.2f, 0.3f);

        [Tooltip("Button highlighted state")]
        public Color buttonHighlighted = new Color(0.3f, 0.3f, 0.4f);

        [Tooltip("Button pressed state")]
        public Color buttonPressed = new Color(0.15f, 0.15f, 0.2f);

        [Tooltip("Button disabled state")]
        public Color buttonDisabled = new Color(0.15f, 0.15f, 0.2f, 0.5f);

        [Header("Era Colors - Simulation")]
        [Tooltip("Foundational Era primary color (purple)")]
        public Color foundationalEraColor = new Color(0.545f, 0.361f, 0.663f); // #8B5CAA

        [Tooltip("Information Era primary color (teal)")]
        public Color informationEraColor = new Color(0.439f, 0.659f, 0.561f); // #70A88F

        [Tooltip("Space Age primary color (bright green)")]
        public Color spaceAgeColor = new Color(0.569f, 0.867f, 0.561f); // #91DD8F

        [Header("Era Colors - Reality")]
        [Tooltip("Reality primary color (light purple)")]
        public Color realityColor = new Color(0.784f, 0.702f, 1f); // #C8B3FF

        [Tooltip("Anomaly research color")]
        public Color anomalyColor = new Color(0.6f, 0.4f, 0.8f); // #9966CC

        [Header("Skill Tree Button Colors")]
        public SkillTreeButtonColors skillTreeNoRequired = new SkillTreeButtonColors
        {
            normal = new Color(0.32941177f, 0.63529414f, 0.67058825f),
            pressed = new Color(0.2576f, 0.4390621f, 0.46f),
            disabled = new Color(0.21350001f, 0.33587933f, 0.35f),
            notPurchasableNormal = new Color(0.21350001f, 0.33587933f, 0.35f)
        };

        public SkillTreeButtonColors skillTreeFragment = new SkillTreeButtonColors
        {
            normal = new Color(0.67058825f, 0.32941177f, 0.49019608f),
            pressed = new Color(0.46f, 0.2576f, 0.35298392f),
            disabled = new Color(0.35f, 0.21350001f, 0.2778276f),
            notPurchasableNormal = new Color(0.35f, 0.21350001f, 0.2778276f)
        };

        public SkillTreeButtonColors skillTreeNormal = new SkillTreeButtonColors
        {
            normal = new Color(0.5019608f, 0.32941177f, 0.67058825f),
            pressed = new Color(0.35686275f, 0.25490198f, 0.45882353f),
            disabled = new Color(0.2784314f, 0.21176471f, 0.34509805f),
            notPurchasableNormal = new Color(0.2784314f, 0.21176471f, 0.34509805f)
        };

        public SkillTreeButtonColors skillTreeExclusiveLock = new SkillTreeButtonColors
        {
            normal = new Color(0.4f, 0.4f, 0.4f),
            pressed = new Color(0.29803923f, 0.29803923f, 0.29803923f),
            disabled = new Color(0.2f, 0.2f, 0.2f),
            notPurchasableNormal = new Color(0.2f, 0.2f, 0.2f)
        };

        public SkillTreeButtonColors skillTreeOwned = new SkillTreeButtonColors
        {
            normal = new Color(0.32941177f, 0.67058825f, 0.32941177f),
            pressed = new Color(0.239f, 0.49f, 0.239f),
            disabled = new Color(0.17f, 0.34f, 0.17f),
            notPurchasableNormal = new Color(0.17f, 0.34f, 0.17f)
        };

        public SkillTreeButtonColors skillTreeNonRefundable = new SkillTreeButtonColors
        {
            normal = new Color(0.45f, 0.18f, 0.18f),
            pressed = new Color(0.35f, 0.12f, 0.12f),
            disabled = new Color(0.22f, 0.08f, 0.08f),
            notPurchasableNormal = new Color(0.22f, 0.08f, 0.08f)
        };

        public SkillTreeButtonColors skillTreeNonRefundableOwned = new SkillTreeButtonColors
        {
            normal = new Color(0.75f, 0.2f, 0.2f),
            pressed = new Color(0.55f, 0.12f, 0.12f),
            disabled = new Color(0.35f, 0.08f, 0.08f),
            notPurchasableNormal = new Color(0.35f, 0.08f, 0.08f)
        };

        // Cached rich text color tags for performance
        private string _accentTag;
        private string _highlightTag;
        private string _positiveTag;
        private string _warningTag;
        private string _negativeTag;

        // Era color cached tags
        private string _foundationalEraTag;
        private string _informationEraTag;
        private string _spaceAgeTag;
        private string _realityTag;
        private string _anomalyTag;

        /// <summary>
        /// Rich text color tag for accent color (e.g., "&lt;color=#FFA45E&gt;")
        /// </summary>
        public string AccentTag => _accentTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(accentColor)}>";

        /// <summary>
        /// Rich text color tag for highlight color (e.g., "&lt;color=#00E1FF&gt;")
        /// </summary>
        public string HighlightTag => _highlightTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(highlightColor)}>";

        /// <summary>
        /// Rich text color tag for positive color (e.g., "&lt;color=#91DD8F&gt;")
        /// </summary>
        public string PositiveTag => _positiveTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(positiveColor)}>";

        /// <summary>
        /// Rich text color tag for warning color
        /// </summary>
        public string WarningTag => _warningTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(warningColor)}>";

        /// <summary>
        /// Rich text color tag for negative color
        /// </summary>
        public string NegativeTag => _negativeTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(negativeColor)}>";

        /// <summary>
        /// Rich text color tag for Foundational Era color
        /// </summary>
        public string FoundationalEraTag => _foundationalEraTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(foundationalEraColor)}>";

        /// <summary>
        /// Rich text color tag for Information Era color
        /// </summary>
        public string InformationEraTag => _informationEraTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(informationEraColor)}>";

        /// <summary>
        /// Rich text color tag for Space Age color
        /// </summary>
        public string SpaceAgeTag => _spaceAgeTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(spaceAgeColor)}>";

        /// <summary>
        /// Rich text color tag for Reality color
        /// </summary>
        public string RealityTag => _realityTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(realityColor)}>";

        /// <summary>
        /// Rich text color tag for Anomaly color
        /// </summary>
        public string AnomalyTag => _anomalyTag ??= $"<color=#{ColorUtility.ToHtmlStringRGB(anomalyColor)}>";

        /// <summary>
        /// Wraps text in the accent color.
        /// </summary>
        public string Accent(string text) => $"{AccentTag}{text}</color>";

        /// <summary>
        /// Wraps text in the highlight color.
        /// </summary>
        public string Highlight(string text) => $"{HighlightTag}{text}</color>";

        /// <summary>
        /// Wraps text in the positive color.
        /// </summary>
        public string Positive(string text) => $"{PositiveTag}{text}</color>";

        /// <summary>
        /// Wraps text in the warning color.
        /// </summary>
        public string Warning(string text) => $"{WarningTag}{text}</color>";

        /// <summary>
        /// Wraps text in the negative color.
        /// </summary>
        public string Negative(string text) => $"{NegativeTag}{text}</color>";

        /// <summary>
        /// Wraps text in the Foundational Era color.
        /// </summary>
        public string FoundationalEra(string text) => $"{FoundationalEraTag}{text}</color>";

        /// <summary>
        /// Wraps text in the Information Era color.
        /// </summary>
        public string InformationEra(string text) => $"{InformationEraTag}{text}</color>";

        /// <summary>
        /// Wraps text in the Space Age color.
        /// </summary>
        public string SpaceAge(string text) => $"{SpaceAgeTag}{text}</color>";

        /// <summary>
        /// Wraps text in the Reality color.
        /// </summary>
        public string Reality(string text) => $"{RealityTag}{text}</color>";

        /// <summary>
        /// Wraps text in the Anomaly color.
        /// </summary>
        public string Anomaly(string text) => $"{AnomalyTag}{text}</color>";

        private void OnValidate()
        {
            // Clear cached tags when colors change in editor
            _accentTag = null;
            _highlightTag = null;
            _positiveTag = null;
            _warningTag = null;
            _negativeTag = null;

            // Clear era color cached tags
            _foundationalEraTag = null;
            _informationEraTag = null;
            _spaceAgeTag = null;
            _realityTag = null;
            _anomalyTag = null;
        }
    }
}
