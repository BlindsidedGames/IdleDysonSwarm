#if UNITY_2019_4_OR_NEWER

using StansAssets.Foundation.Editor;
using UnityEditor;
using UnityEngine.UIElements;

namespace StansAssets.Plugins.Editor
{
    /// <summary>
    /// Base window tab implementation for <see cref="PackageSettingsWindow" />
    /// </summary>
    public abstract class BaseTab : VisualElement
    {
        /// <summary>
        /// Created tab with the content of provided uxml file.
        /// </summary>
        /// <param name="path">Project related uxml/uss file path without extensions.</param>
        protected BaseTab(string path)
        {
            UIToolkitEditorUtility.CloneTreeAndApplyStyle(this, path);
        }

        /// <summary>
        /// Tab root.
        /// </summary>
        protected VisualElement Root => this;
    }
}
#endif