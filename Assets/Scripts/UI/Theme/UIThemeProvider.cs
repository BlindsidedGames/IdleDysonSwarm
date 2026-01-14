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
