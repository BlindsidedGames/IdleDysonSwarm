using System;
using System.Collections.Generic;
using StansAssets.Foundation.Editor;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    public abstract class IMGUISettingsWindow<TWindow> : EditorWindow where TWindow : EditorWindow
    {
        const string k_SearchBarControlName = "sa_searchBar";

        float m_HeaderHeight;
        float m_ScrollContentHeight;
        Vector2 m_ScrollPos;

        bool m_MouseInside;

        GUIStyle m_ToolbarSearchTextFieldStyle;
        GUIStyle m_ToolbarSearchCancelButtonStyle;

        protected string m_SearchString = string.Empty;
        protected bool m_SearchAutoFocus;

        [SerializeField]
        bool m_ShouldEnabled;
        [SerializeField]
        bool m_ShouldAwake;

        [SerializeField]
        string m_HeaderTitle;
        [SerializeField]
        string m_HeaderDescription;
        [SerializeField]
        string m_HeaderVersion;
        [SerializeField]
        string m_DocumentationUrl;

        [SerializeField]
        ScriptableObject m_SerializationStateIndicator;

        [SerializeField]
        IMGUIHyperLabel m_DocumentationLink;

        //MenuTabs
        [SerializeField]
        protected bool m_IsToolBarWasAlreadyCreated;
        [SerializeField]
        protected IMGUIHyperToolbar m_MenuToolbar;
        [SerializeField]
        protected List<IMGUILayoutElement> m_TabsLayout = new List<IMGUILayoutElement>();

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        protected void SetPackageName(string packageName)
        {
#if UNITY_2019_4_OR_NEWER
            var packageInfo = PackageManagerUtility.GetPackageInfo(packageName);
            m_HeaderTitle = packageInfo.displayName.Remove(0, "Stans Assets - ".Length);
            m_HeaderDescription = packageInfo.description;
            m_HeaderVersion = packageInfo.version;
#else
            m_HeaderTitle = titleContent.text;
            m_HeaderDescription = "undefined for Unity 2018";
            m_HeaderVersion = "undefined";
#endif

        }

        protected void SetDocumentationUrl(string documentationUrl)
        {
            m_DocumentationUrl = documentationUrl;
        }

        protected void AddMenuItem(string itemName, IMGUILayoutElement layout, bool forced = false)
        {
            //It could be 2 cases
            //1 When the window is created and we need to create everything
            //2 When Unity called Awake and only ScriptableObjects are destroyed, so we only need to re-create ScriptableObjects
            if (!m_IsToolBarWasAlreadyCreated || forced)
            {
                var button = new IMGUIHyperLabel(new GUIContent(itemName), EditorStyles.boldLabel);
                button.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
                m_MenuToolbar.AddButtons(button);
            }

            m_TabsLayout.Add(layout);
            layout.OnAwake();
        }

        //--------------------------------------
        // Virtual Methods
        //--------------------------------------

        protected virtual void BeforeGUI() { }

        protected virtual void AfterGUI() { }

        //--------------------------------------
        // Unity Editor Callbacks
        //--------------------------------------

        void Awake()
        {
            if (!m_IsToolBarWasAlreadyCreated) OnCreate();

            m_TabsLayout = new List<IMGUILayoutElement>();
            m_ShouldAwake = true;
            m_SerializationStateIndicator = CreateInstance<ScriptableObject>();
        }

        void OnEnable()
        {
            m_ShouldEnabled = true;

            //A very nice trick to Repaint window when mose is moved inside
            //Repaint will be called from OnGUI method.
            wantsMouseMove = true;
            wantsMouseEnterLeaveWindow = true;
        }

        //--------------------------------------
        // Custom Editor Callbacks
        //--------------------------------------

        protected abstract void OnAwake();

        protected virtual void OnCreate()
        {
            m_MenuToolbar = new IMGUIHyperToolbar();
        }

        void OnLayoutEnable()
        {
            foreach (var layout in m_TabsLayout) layout.OnLayoutEnable();

            m_ToolbarSearchTextFieldStyle = GUI.skin.FindStyle("ToolbarSeachTextField");
            m_ToolbarSearchCancelButtonStyle = GUI.skin.FindStyle("ToolbarSeachCancelButton");

            m_DocumentationLink = new IMGUIHyperLabel(new GUIContent("Go To Documentation"), EditorStyles.miniLabel);
            m_DocumentationLink.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            //Update toolbar Styles
            foreach (var button in m_MenuToolbar.Buttons)
            {
                button.SetStyle(EditorStyles.boldLabel);
                button.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
            }
        }

        //--------------------------------------
        // GUI
        //--------------------------------------

        void CheckForGUIEvents()
        {
            //Just a workaround, since in play-mode scriptable object could get destroyed
            if (m_SerializationStateIndicator == null) Awake();

            if (m_ShouldAwake)
            {
                OnAwake();
                m_ShouldAwake = false;

                //When entering playmode both OnAwake & OnEnable get called
                //But when we exit playmode only OnAwake is called, so we need to add
                //one more extra OnEnable emulation
                m_ShouldEnabled = true;
            }

            if (m_ShouldEnabled)
            {
                OnLayoutEnable();
                m_ShouldEnabled = false;
            }

            //first GUI call, we assume all tool bar items has been added already
            m_IsToolBarWasAlreadyCreated = true;
        }

        void OnGUI()
        {
            m_SearchAutoFocus = false;
#if UNITY_2017_4_OR_NEWER
            if (Event.current.type == EventType.MouseMove)
            {
#else
            if (Event.current.type == EventType.mouseMove) {
#endif
                m_MouseInside = true;
            }

            if (Event.current.type == EventType.MouseEnterWindow)
            {
                m_MouseInside = true;

                //No window is focused, so look like Unity Editor is in background
                //Stealing focus in this case maybe pretty harmful. And cause whole application to be expanded from background,
                //without any user action.
                if (focusedWindow == null) return;
                FocusWindowIfItsOpen<TWindow>();
            }

            if (Event.current.type == EventType.MouseLeaveWindow) m_MouseInside = false;

            CheckForGUIEvents();
            BeforeGUI();
            OnLayoutGUI();
            AfterGUI();

            if (m_MouseInside)
            {
                Repaint();
                HandleInputEvents();
            }
        }

        void HandleInputEvents()
        {
            if (GUI.GetNameOfFocusedControl().Equals(k_SearchBarControlName))
            {
                EditorGUI.FocusTextInControl(k_SearchBarControlName);
                if (Event.current.type == EventType.KeyUp)
                    switch (Event.current.keyCode)
                    {
                        case KeyCode.Escape:
                            Event.current.Use();
                            m_SearchString = string.Empty;
                            GUI.FocusControl(null);
                            break;
                    }
            }
            else
            {
                //Right now we only allow quick focus for a first page.
                //Probably would be a better idea to control this from child classes.
                if (!m_SearchAutoFocus) return;
                if (Event.current.type == EventType.KeyDown)
                    switch (Event.current.keyCode)
                    {
                        case KeyCode.UpArrow:
                        case KeyCode.DownArrow:
                            break;
                        default:
                            if (Event.current.modifiers == EventModifiers.None ||
                                Event.current.modifiers == EventModifiers.CapsLock)
                                EditorGUI.FocusTextInControl(k_SearchBarControlName);
                            break;
                    }
            }
        }

        protected virtual void OnLayoutGUI()
        {
            DrawToolbar();
            DrawHeader();

            var tabIndex = DrawMenu();

            DrawScrollView(() =>
            {
                OnTabsGUI(tabIndex);
            });
        }

        protected virtual void OnTabsGUI(int tabIndex)
        {
            if (tabIndex == 0) m_SearchAutoFocus = true;
            m_TabsLayout[tabIndex].SetPosition(position);
            m_TabsLayout[tabIndex].OnGUI();
        }

        protected void DrawScrollView(Action onContent)
        {
            if (Event.current.type == EventType.Repaint) m_HeaderHeight = GUILayoutUtility.GetLastRect().yMax + SettingsWindowStyles.LayoutPadding;

            using (new IMGUIBeginScrollView(ref m_ScrollPos, GUILayout.Width(position.width), GUILayout.Height(position.height - m_HeaderHeight)))
            {
                onContent.Invoke();

                GUILayout.Space(1);
                if (Event.current.type == EventType.Repaint) m_ScrollContentHeight = GUILayoutUtility.GetLastRect().yMax + SettingsWindowStyles.LayoutPadding;

                if (Event.current.type == EventType.Layout)
                {
                    var totalHeight = m_ScrollContentHeight + m_HeaderHeight + 20;
                    if (position.height > totalHeight)
                        using (new IMGUIBeginVertical(SettingsWindowStyles.SeparationStyle))
                        {
                            GUILayout.Space(position.height - totalHeight);
                        }
                }
            }
        }

        protected int DrawMenu()
        {
            GUILayout.Space(2);
            var index = 0;
            if (string.IsNullOrEmpty(m_SearchString))
            {
                index = m_MenuToolbar.Draw();
                GUILayout.Space(4);
            }
            else
            {
                var style = new GUIStyle(EditorStyles.boldLabel);
                style.richText = true;
                var toolbarText = "Search:  '<i>" + m_SearchString + "</i>'";
                EditorGUILayout.LabelField(toolbarText.ToUpper(), style);
                GUILayout.Space(2);
            }

            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            GUILayout.Space(5);
            EditorGUILayout.EndVertical();

            return index;
        }

        public void SetSelectedTabIndex(int index)
        {
            //OMG!!
            //OnAwake
            EditorApplication.delayCall += () =>
            {
                //OnEnabled
                EditorApplication.delayCall += () =>
                {
                    m_MenuToolbar.SetSelectedIndex(index);
                };
            };

            //And yes I ams to lazy to add state.
        }

        protected void DrawToolbar(Action onContent = null)
        {
            GUILayout.Space(2);
            using (new IMGUIBeginHorizontal())
            {
                if (onContent != null)
                    onContent.Invoke();
                else
                    DrawDocumentationLink();
                EditorGUILayout.Space();
                DrawSearchBar();
            }

            GUILayout.Space(5);
        }

        protected void DrawSearchBar()
        {
            GUILayout.BeginHorizontal();
            {
                GUILayout.FlexibleSpace();
                GUI.SetNextControlName(k_SearchBarControlName);
                m_SearchString = EditorGUILayout.TextField(m_SearchString, m_ToolbarSearchTextFieldStyle, GUILayout.MinWidth(200f));

                if (GUILayout.Button("", m_ToolbarSearchCancelButtonStyle))
                {
                    m_SearchString = "";
                    GUI.FocusControl(null);
                }
            }
            GUILayout.EndHorizontal();
        }

        void DrawDocumentationLink()
        {
            var width = m_DocumentationLink.CalcSize().x + 5f;
            var clicked = m_DocumentationLink.Draw(GUILayout.Width(width));
            if (clicked) Application.OpenURL(m_DocumentationUrl);
        }

        protected void DrawHeader()
        {
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            {
                GUILayout.Space(20);
                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space(SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(m_HeaderTitle, SettingsWindowStyles.LabelHeaderStyle);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(8);

                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space(SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(m_HeaderDescription, SettingsWindowStyles.DescriptionLabelStyle);
                }
                EditorGUILayout.EndHorizontal();

                GUILayout.Space(2);
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.FlexibleSpace();
                    EditorGUILayout.SelectableLabel("v: " + m_HeaderVersion, SettingsWindowStyles.VersionLabelStyle, GUILayout.Width(120), GUILayout.Height(16));
                    GUILayout.Space(10);
                }

                GUILayout.Space(5);
            }
            EditorGUILayout.EndVertical();
        }

        //--------------------------------------
        // Static Methods
        //--------------------------------------

        public static TWindow ShowTowardsInspector(string text, Texture image = null)
        {
            return ShowTowardsInspector(new GUIContent(text, image));
        }

        public static TWindow ShowTowardsInspector(GUIContent titleContent)
        {
            var inspectorType = Type.GetType("UnityEditor.InspectorWindow, UnityEditor.dll");
            var window = GetWindow<TWindow>(inspectorType);
            window.Show();

            window.titleContent = titleContent;
            window.minSize = new Vector2(350, 100);

            return window;
        }
    }
}
