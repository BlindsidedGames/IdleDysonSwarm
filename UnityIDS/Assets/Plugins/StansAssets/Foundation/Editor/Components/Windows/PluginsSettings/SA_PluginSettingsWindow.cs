using System;
using System.Collections.Generic;
using StansAssets.Plugins.Editor;
using UnityEngine;
using UnityEditor;

namespace SA.Foundation.Editor
{
    public abstract class SA_PluginSettingsWindow<TWindow> : EditorWindow where TWindow : EditorWindow
    {
        const string SEARCH_BAR_CONTROL_NAME = "sa_searchBar";

        float m_headerHeight;
        float m_scrollContentHeight;
        Vector2 m_scrollPos;

        bool m_mouseInside;

        GUIStyle m_toolbarSearchTextFieldStyle;
        GUIStyle m_toolbarSearchCancelButtonStyle;

        protected string m_SearchString = string.Empty;
        protected bool m_SearchAutoFocus;

        [SerializeField]
        bool m_shouldEnabled;
        [SerializeField]
        bool m_shouldAwake;

        [SerializeField]
        string m_headerTitle;
        [SerializeField]
        string m_headerDescription;
        [SerializeField]
        string m_headerVersion;
        [SerializeField]
        string m_documentationUrl;

        [SerializeField]
        ScriptableObject m_serializationStateIndicator;

        [SerializeField]
        IMGUIHyperLabel m_documentationLink;

        //MenuTabs
        [SerializeField]
        protected bool m_isToolBarWasAlreadyCreated;
        [SerializeField]
        protected IMGUIHyperToolbar m_menuToolbar;
        [SerializeField]
        protected List<IMGUILayoutElement> m_tabsLayout = new List<IMGUILayoutElement>();

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        protected void SetHeaderTitle(string headerTitle)
        {
            m_headerTitle = headerTitle;
        }

        protected void SetHeaderDescription(string headerDescription)
        {
            m_headerDescription = headerDescription;
        }

        protected void SetHeaderVersion(string headerVersion)
        {
            m_headerVersion = headerVersion;
        }

        protected void SetDocumentationUrl(string documentationUrl)
        {
            m_documentationUrl = documentationUrl;
        }

        protected void AddMenuItem(string itemName, IMGUILayoutElement layout, bool forced = false)
        {
            //It could be 2 cases
            //1 When the window is created and we need to create everything
            //2 When Unity called Awake and only ScriptableObjects are destroyed, so we only need to re-create ScriptableObjects
            if (!m_isToolBarWasAlreadyCreated || forced)
            {
                var button = new IMGUIHyperLabel(new GUIContent(itemName), EditorStyles.boldLabel);
                button.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
                m_menuToolbar.AddButtons(button);
            }

            m_tabsLayout.Add(layout);
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
            if (!m_isToolBarWasAlreadyCreated) OnCreate();

            m_tabsLayout = new List<IMGUILayoutElement>();
            m_shouldAwake = true;
            m_serializationStateIndicator = CreateInstance<ScriptableObject>();
        }

        void OnEnable()
        {
            m_shouldEnabled = true;

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
            m_menuToolbar = new IMGUIHyperToolbar();
        }

        void OnLayoutEnable()
        {
            foreach (var layout in m_tabsLayout) layout.OnLayoutEnable();

            m_toolbarSearchTextFieldStyle = GUI.skin.FindStyle("ToolbarSeachTextField");
            m_toolbarSearchCancelButtonStyle = GUI.skin.FindStyle("ToolbarSeachCancelButton");

            m_documentationLink = new IMGUIHyperLabel(new GUIContent("Go To Documentation"), EditorStyles.miniLabel);
            m_documentationLink.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            //Update toolbar Styles
            foreach (var button in m_menuToolbar.Buttons)
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
            if (m_serializationStateIndicator == null) Awake();

            if (m_shouldAwake)
            {
                OnAwake();
                m_shouldAwake = false;

                //When entering playmode both OnAwake & OnEnable get called
                //But when we exit playmode only OnAwake is called, so we need to add
                //one more extra OnEnable emulation
                m_shouldEnabled = true;
            }

            if (m_shouldEnabled)
            {
                OnLayoutEnable();
                m_shouldEnabled = false;
            }

            //first GUI call, we assume all tool bar items has been added already
            m_isToolBarWasAlreadyCreated = true;
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
                m_mouseInside = true;
            }

            if (Event.current.type == EventType.MouseEnterWindow)
            {
                m_mouseInside = true;

                //No window is focused, so look like Unity Editor is in background
                //Stealing focus in this case maybe pretty harmful. And cause whole application to be expanded from background,
                //without any user action.
                if (focusedWindow == null) return;
                FocusWindowIfItsOpen<TWindow>();
            }

            if (Event.current.type == EventType.MouseLeaveWindow) m_mouseInside = false;

            CheckForGUIEvents();
            BeforeGUI();
            OnLayoutGUI();
            AfterGUI();

            if (m_mouseInside)
            {
                Repaint();
                HandleInputEvents();
            }
        }

        void HandleInputEvents()
        {
            if (GUI.GetNameOfFocusedControl().Equals(SEARCH_BAR_CONTROL_NAME))
            {
                EditorGUI.FocusTextInControl(SEARCH_BAR_CONTROL_NAME);
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
                                EditorGUI.FocusTextInControl(SEARCH_BAR_CONTROL_NAME);
                            break;
                    }
            }
        }

        protected virtual void OnLayoutGUI()
        {
            DrawTopbar();
            DrawHeader();

            var tabIndex = DrawMenu();

            DrawScrollView(() =>
            {
                if (string.IsNullOrEmpty(m_SearchString))
                    OnTabsGUI(tabIndex);
                else
                    foreach (var tab in m_tabsLayout)
                        if (tab is SA_ServicesTab)
                            (tab as SA_ServicesTab).OnSearchGUI(m_SearchString);
            });
        }

        protected virtual void OnTabsGUI(int tabIndex)
        {
            if (tabIndex == 0) m_SearchAutoFocus = true;
            m_tabsLayout[tabIndex].SetPosition(position);
            m_tabsLayout[tabIndex].OnGUI();
        }

        protected void DrawScrollView(Action OnContent)
        {
            if (Event.current.type == EventType.Repaint) m_headerHeight = GUILayoutUtility.GetLastRect().yMax + SettingsWindowStyles.LayoutPadding;
            using (new IMGUIBeginScrollView(ref m_scrollPos, GUILayout.Width(position.width), GUILayout.Height(position.height - m_headerHeight)))
            {
                OnContent.Invoke();

                GUILayout.Space(1);
                if (Event.current.type == EventType.Repaint) m_scrollContentHeight = GUILayoutUtility.GetLastRect().yMax + SettingsWindowStyles.LayoutPadding;

                if (Event.current.type == EventType.Layout)
                {
                    var m_totalHeight = m_scrollContentHeight + m_headerHeight + 20;
                    if (position.height > m_totalHeight)
                        using (new IMGUIBeginVertical(SettingsWindowStyles.SeparationStyle))
                        {
                            GUILayout.Space(position.height - m_totalHeight);
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
                index = m_menuToolbar.Draw();
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
                    m_menuToolbar.SetSelectedIndex(index);
                };
            };

            //And yes I ams to lazy to add state.
        }

        protected void DrawTopbar(Action OnContent = null)
        {
            GUILayout.Space(2);
            using (new IMGUIBeginHorizontal())
            {
                if (OnContent != null)
                    OnContent.Invoke();
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
                GUI.SetNextControlName(SEARCH_BAR_CONTROL_NAME);
                m_SearchString = EditorGUILayout.TextField(m_SearchString, m_toolbarSearchTextFieldStyle, GUILayout.MinWidth(200f));

                if (GUILayout.Button("", m_toolbarSearchCancelButtonStyle))
                {
                    m_SearchString = "";
                    GUI.FocusControl(null);
                }
            }
            GUILayout.EndHorizontal();
        }

        void DrawDocumentationLink()
        {
            var width = m_documentationLink.CalcSize().x + 5f;
            var clicked = m_documentationLink.Draw(GUILayout.Width(width));
            if (clicked) Application.OpenURL(m_documentationUrl);
        }

        protected void DrawHeader()
        {
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            {
                GUILayout.Space(20);
                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space( SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(m_headerTitle, SettingsWindowStyles.LabelHeaderStyle);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(8);

                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space( SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(m_headerDescription,  SettingsWindowStyles.DescriptionLabelStyle);
                }
                EditorGUILayout.EndHorizontal();

                GUILayout.Space(2);
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.FlexibleSpace();
                    EditorGUILayout.SelectableLabel("v: " + m_headerVersion, SettingsWindowStyles.VersionLabelStyle, GUILayout.Width(120), GUILayout.Height(16));
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
            var window = GetWindow<TWindow>(new[] { inspectorType });
            window.Show();

            window.titleContent = titleContent;
            window.minSize = new Vector2(350, 100);

            return window;
        }
    }
}
