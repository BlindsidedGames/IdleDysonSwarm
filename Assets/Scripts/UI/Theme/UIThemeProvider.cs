using UnityEngine;

namespace IdleDysonSwarm.UI
{
    /// <summary>
    /// Provides global access to the active UI theme.
    /// For backwards compatibility, also exposes static color tag properties
    /// that mirror the old Oracle.textColour* constants.
    /// </summary>
    public static class UIThemeProvider
    {
        private static UITheme _activeTheme;
        private static bool _initialized;

        /// <summary>
        /// The currently active UI theme. Falls back to default colors if not set.
        /// </summary>
        public static UITheme ActiveTheme
        {
            get
            {
                if (!_initialized)
                {
                    Initialize();
                }
                return _activeTheme;
            }
            set
            {
                _activeTheme = value;
                _initialized = true;
            }
        }

        // Backwards-compatible static properties matching Oracle constants
        // These can be used as drop-in replacements for Oracle.textColourOrange, etc.

        /// <summary>
        /// Accent/orange color tag. Equivalent to old Oracle.textColourOrange.
        /// </summary>
        public static string TextColourOrange => ActiveTheme?.AccentTag ?? "<color=#FFA45E>";

        /// <summary>
        /// Highlight/blue color tag. Equivalent to old Oracle.textColourBlue.
        /// </summary>
        public static string TextColourBlue => ActiveTheme?.HighlightTag ?? "<color=#00E1FF>";

        /// <summary>
        /// Positive/green color tag. Equivalent to old Oracle.textColourGreen.
        /// </summary>
        public static string TextColourGreen => ActiveTheme?.PositiveTag ?? "<color=#91DD8F>";

        /// <summary>
        /// Warning/yellow color tag.
        /// </summary>
        public static string TextColourYellow => ActiveTheme?.WarningTag ?? "<color=#FFEB3B>";

        /// <summary>
        /// Negative/red color tag.
        /// </summary>
        public static string TextColourRed => ActiveTheme?.NegativeTag ?? "<color=#FF5757>";

        // Era Colors - Simulation

        /// <summary>
        /// Foundational Era color tag.
        /// </summary>
        public static string TextColourFoundational => ActiveTheme?.FoundationalEraTag ?? "<color=#8B5CAA>";

        /// <summary>
        /// Information Era color tag.
        /// </summary>
        public static string TextColourInformation => ActiveTheme?.InformationEraTag ?? "<color=#70A88F>";

        /// <summary>
        /// Space Age color tag.
        /// </summary>
        public static string TextColourSpaceAge => ActiveTheme?.SpaceAgeTag ?? "<color=#91DD8F>";

        // Era Colors - Reality

        /// <summary>
        /// Reality color tag.
        /// </summary>
        public static string TextColourReality => ActiveTheme?.RealityTag ?? "<color=#C8B3FF>";

        /// <summary>
        /// Anomaly color tag.
        /// </summary>
        public static string TextColourAnomaly => ActiveTheme?.AnomalyTag ?? "<color=#9966CC>";

        // Direct Color access for panel backgrounds, MPImage tinting, etc.

        /// <summary>
        /// Foundational Era color for UI elements.
        /// </summary>
        public static Color FoundationalEraColor => ActiveTheme?.foundationalEraColor ?? new Color(0.545f, 0.361f, 0.663f);

        /// <summary>
        /// Information Era color for UI elements.
        /// </summary>
        public static Color InformationEraColor => ActiveTheme?.informationEraColor ?? new Color(0.439f, 0.659f, 0.561f);

        /// <summary>
        /// Space Age color for UI elements.
        /// </summary>
        public static Color SpaceAgeColor => ActiveTheme?.spaceAgeColor ?? new Color(0.569f, 0.867f, 0.561f);

        /// <summary>
        /// Reality color for UI elements.
        /// </summary>
        public static Color RealityColor => ActiveTheme?.realityColor ?? new Color(0.784f, 0.702f, 1f);

        /// <summary>
        /// Anomaly color for UI elements.
        /// </summary>
        public static Color AnomalyColor => ActiveTheme?.anomalyColor ?? new Color(0.6f, 0.4f, 0.8f);

        private static void Initialize()
        {
            _initialized = true;

            // Try to load the default theme from Resources
            _activeTheme = Resources.Load<UITheme>("DefaultUITheme");

            if (_activeTheme == null)
            {
                Debug.LogWarning("[UIThemeProvider] No DefaultUITheme found in Resources. Using fallback colors.");
            }
        }

        /// <summary>
        /// Manually set the active theme. Call this during game initialization
        /// if you want to use a specific theme.
        /// </summary>
        public static void SetTheme(UITheme theme)
        {
            _activeTheme = theme;
            _initialized = true;
        }

        /// <summary>
        /// Resets the provider to uninitialized state. Useful for testing.
        /// </summary>
        public static void Reset()
        {
            _activeTheme = null;
            _initialized = false;
        }
    }
}
