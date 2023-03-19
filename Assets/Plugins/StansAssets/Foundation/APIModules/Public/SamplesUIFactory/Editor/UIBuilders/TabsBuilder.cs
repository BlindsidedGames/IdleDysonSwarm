using StansAssets.Foundation.Extensions;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    public class TabsBuilder : UIBuilder
    {
        GameObject m_TabsPanelView;
        GameObject m_DataPanelView;
        GameObject m_PanelsRoot;
        GameObject m_ButtonsRootPanel;

        RectTransform m_TabsPanelViewRect;
        RectTransform m_DataPanelViewRect;
        RectTransform m_TabsPanelRect;

        public TabsBuilder(GameObject root)
            : base(root) { }

        protected override void OnBuild()
        {
            CreateTabsPanelView();
            CreateDataPanelView();
            CreateTabsPanel();
            InitTabsPanelViewUIController();
        }

        void CreateTabsPanelView()
        {
            m_TabsPanelView = new GameObject("TabsPanelView", typeof(RectTransform), typeof(TabsPanelViewUIController));
            m_TabsPanelView.transform.SetParent(m_Root.transform);
            m_TabsPanelView.transform.Reset();
            m_TabsPanelViewRect = m_TabsPanelView.GetComponent<RectTransform>();
            m_TabsPanelViewRect.Reset();
        }

        void CreateDataPanelView()
        {
            m_DataPanelView = new GameObject("DataPanel", typeof(RectTransform));
            m_DataPanelView.transform.SetParent(m_TabsPanelView.transform);
            m_DataPanelView.transform.Reset();
            m_DataPanelViewRect = m_DataPanelView.GetComponent<RectTransform>();
            m_DataPanelViewRect.anchorMin = Vector2.zero;
            m_DataPanelViewRect.anchorMax = Vector2.one;
            m_DataPanelViewRect.offsetMin = new Vector2(m_TabsPanelViewRect.anchorMax.x * 200f, 0f);
            m_DataPanelViewRect.offsetMax = Vector2.zero;

            m_DataPanelView.AddComponent<ScrollRect>().horizontal = false;

            m_PanelsRoot = new GameObject("DataPanelViewPort", typeof(RectTransform));
            m_PanelsRoot.transform.SetParent(m_DataPanelView.transform);
            m_PanelsRoot.transform.Reset();
            m_PanelsRoot.AddComponent<Mask>();
            m_PanelsRoot.AddComponent<Image>().color = new Color32(255, 255, 255, 1);
            m_PanelsRoot.GetComponent<RectTransform>().Reset();
        }

        void CreateTabsPanel()
        {
            m_ButtonsRootPanel = new GameObject("ButtonsPanel", typeof(RectTransform));
            m_ButtonsRootPanel.transform.SetParent(m_TabsPanelView.transform);
            m_ButtonsRootPanel.transform.Reset();
            m_TabsPanelRect = m_ButtonsRootPanel.GetComponent<RectTransform>();
            m_TabsPanelRect.pivot = new Vector2(0f, 0.5f);
            m_TabsPanelRect.anchorMin = Vector2.zero;
            m_TabsPanelRect.anchorMax = new Vector2(0f, 1f);
            m_TabsPanelRect.offsetMin = Vector2.zero;
            m_TabsPanelRect.offsetMax = new Vector2(m_TabsPanelViewRect.anchorMax.x * 200f, 0f);

            m_ButtonsRootPanel.AddComponent<Image>().color = new Color(0.0f, 1f, 1f, 0.4f);
            AddVerticalGroupLayout();
        }

        void InitTabsPanelViewUIController()
        {
            var tabsPanelViewUIController = m_TabsPanelView.GetComponent<TabsPanelViewUIController>();
            tabsPanelViewUIController.Init(m_ButtonsRootPanel, m_PanelsRoot);
        }

        void AddVerticalGroupLayout()
        {
            var verticalLg = m_ButtonsRootPanel.AddComponent<VerticalLayoutGroup>();
            verticalLg.spacing = 10f;
            verticalLg.childAlignment = TextAnchor.UpperLeft;
            verticalLg.childControlWidth = true;
            verticalLg.childControlHeight = false;
            verticalLg.childForceExpandWidth = true;
            verticalLg.childForceExpandHeight = false;
            verticalLg.padding = new RectOffset(0, 10, 0, 0);
        }
    }
}
