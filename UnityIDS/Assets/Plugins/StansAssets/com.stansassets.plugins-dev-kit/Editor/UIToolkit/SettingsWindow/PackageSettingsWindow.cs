#if UNITY_2019_4_OR_NEWER
using System;
using System.Collections.Generic;
using StansAssets.Foundation.Editor;
using StansAssets.Foundation.UIElements;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using PackageInfo = UnityEditor.PackageManager.PackageInfo;

namespace StansAssets.Plugins.Editor
{
    /// <summary>
    ///     Base class for Plugin Settings Window
    /// </summary>
    /// <typeparam name="TWindow"></typeparam>
    public abstract class PackageSettingsWindow<TWindow> : EditorWindow where TWindow : EditorWindow
    {
        protected abstract PackageInfo GetPackageInfo();
        protected abstract void OnWindowEnable(VisualElement root);
        protected ButtonStrip m_TabsButtons;

        protected ScrollView m_TabsContainer;
        protected readonly Dictionary<string, VisualElement> m_Tabs = new Dictionary<string, VisualElement>();

        readonly string m_WindowUIFilesRootPath = $"{PluginsDevKitPackage.UIToolkitPath}/SettingsWindow";

        void OnEnable()
        {
            // This is a workaround due to a very weird bug.
            // During OnEnable we may need to accesses singleton scriptable object associated with the package.
            // And looks like AssetDatabase could be not ready and we will recreate new empty settings objects
            // instead of getting existing one.
            EditorApplication.delayCall += () =>
            {
                var root = rootVisualElement;
                UIToolkitEditorUtility.CloneTreeAndApplyStyle(root, $"{m_WindowUIFilesRootPath}/PackageSettingsWindow");

                m_TabsContainer = root.Q<ScrollView>("tabs-container");

                var packageInfo = GetPackageInfo();
                root.Q<Label>("display-name").text = packageInfo.displayName.Remove(0, "Stans Assets - ".Length);
                root.Q<Label>("description").text = packageInfo.description;
                root.Q<Label>("version").text = $"Version: {packageInfo.version}";

                m_TabsButtons = root.Q<ButtonStrip>();
                m_TabsButtons.CleanUp();
                m_TabsButtons.OnButtonClick += ActivateTab;

                OnWindowEnable(root);
                ActivateTab();
            };
        }

        void ActivateTab()
        {
            if (string.IsNullOrEmpty(m_TabsButtons.Value))
                return;

            foreach (var tab in m_Tabs)
                tab.Value.RemoveFromHierarchy();

            m_TabsContainer.Add(m_Tabs[m_TabsButtons.Value]);
        }

        /// <summary>
        /// Add tab to the window top bar.
        /// </summary>
        /// <param name="label">Tab label.</param>
        /// <param name="content">Tab content.</param>
        /// <exception cref="ArgumentException">Will throw tab with the same label was already added.</exception>
        protected void AddTab(string label, VisualElement content)
        {
            if (!m_Tabs.ContainsKey(label))
            {
                m_TabsButtons.AddChoice(label, label);
                m_Tabs.Add(label, content);
                content.viewDataKey = label;
            }
            else
            {
                throw new ArgumentException($"Tab '{label}' already added", nameof(label));
            }
        }

        /// <summary>
        /// Method will show and doc window next to the Inspector Window.
        /// </summary>
        /// <param name="windowTitle">Window Title.</param>
        /// <param name="icon">Window Icon.</param>
        /// <returns>
        /// Returns the first EditorWindow which is currently on the screen.
        /// If there is none, creates and shows new window and returns the instance of it.
        /// </returns>
        public static TWindow ShowTowardsInspector(string windowTitle, Texture icon)
        {
            var inspectorType = Type.GetType("UnityEditor.InspectorWindow, UnityEditor.dll");
            var window = GetWindow<TWindow>(inspectorType);
            window.Show();

            window.titleContent = new GUIContent(windowTitle, icon);
            window.minSize = new Vector2(350, 100);

            return window;
        }
    }
}
#endif
