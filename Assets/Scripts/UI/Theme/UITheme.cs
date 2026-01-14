using UnityEngine;

namespace IdleDysonSwarm.UI
{
    /// <summary>
    /// ScriptableObject that defines the color palette and text formatting for the UI.
    /// Create assets via Assets > Create > Idle Dyson Swarm > UI Theme.
    /// </summary>
    [CreateAssetMenu(fileName = "UITheme", menuName = "Idle Dyson Swarm/UI Theme")]
    public class UITheme : ScriptableObject
    {
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

        // Cached rich text color tags for performance
        private string _accentTag;
        private string _highlightTag;
        private string _positiveTag;
        private string _warningTag;
        private string _negativeTag;

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

        private void OnValidate()
        {
            // Clear cached tags when colors change in editor
            _accentTag = null;
            _highlightTag = null;
            _positiveTag = null;
            _warningTag = null;
            _negativeTag = null;
        }
    }
}
