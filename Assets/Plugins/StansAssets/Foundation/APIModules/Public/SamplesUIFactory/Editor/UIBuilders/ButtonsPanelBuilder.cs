using StansAssets.Foundation.Async;
using StansAssets.Foundation.Extensions;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    public class ButtonsPanelBuilder : UIBuilder
    {
        GameObject m_ButtonsPanelView;
        GameObject m_PanelView;
        RectTransform m_ButtonsPanelViewRect;
        RectTransform m_PanelViewRect;
        readonly Color m_Color = new Color32(255, 80, 80, 255);

        public ButtonsPanelBuilder(GameObject root)
            : base(root) { }

        protected override void OnBuild()
        {
            CreateButtonsViewPanel();
            AddGridLayoutGroup();

            var text = m_PanelView.GetComponentInChildren<Text>();
            Selection.activeObject = text.gameObject;
        }

        void CreateButtonsViewPanel()
        {
            m_PanelView = new GameObject("ButtonsViewPanel", typeof(RectTransform));
            m_PanelView.transform.SetParent(m_Root.transform);
            m_PanelView.transform.Reset();
            m_PanelViewRect = m_PanelView.GetComponent<RectTransform>();
            m_PanelViewRect.Reset();
            m_PanelViewRect.anchorMin = new Vector2(0f, 1f);
            m_PanelViewRect.anchorMax = Vector2.one;
            m_PanelViewRect.sizeDelta = new Vector2(0f, 150f);

            m_PanelView.AddComponent<Image>().color = m_Color;
            m_PanelView.AddComponent<LayoutElement>();

            AddVerticalGroupLayout();
            AddContentSizeFitter();
        }

        void AddVerticalGroupLayout()
        {
            var verticalLG = m_PanelView.AddComponent<VerticalLayoutGroup>();
            verticalLG.childAlignment = TextAnchor.UpperLeft;
            verticalLG.childControlWidth = true;
            verticalLG.childControlHeight = true;
            verticalLG.childForceExpandWidth = true;
            verticalLG.childForceExpandHeight = true;
        }

        void AddContentSizeFitter()
        {
            m_PanelView.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        }

        void AddGridLayoutGroup()
        {
            var gridLayoutGroupPanel = new GameObject("GridLayoutGroupPanel", typeof(RectTransform), typeof(ButtonPanelViewUIController));
            gridLayoutGroupPanel.transform.SetParent(m_PanelView.transform);
            gridLayoutGroupPanel.transform.Reset();
            gridLayoutGroupPanel.GetComponent<RectTransform>().Reset();

            var gridLayout = gridLayoutGroupPanel.AddComponent<GridLayoutGroup>();
            var padding = gridLayout.padding;
            padding.left = 20;
            padding.right = 20;
            padding.top = 20;
            padding.bottom = 20;
            gridLayout.cellSize = new Vector2(250f, 75f);
            gridLayout.spacing = new Vector2(20f, 20f);
            gridLayout.startCorner = GridLayoutGroup.Corner.UpperLeft;
            gridLayout.startAxis = GridLayoutGroup.Axis.Horizontal;
            gridLayout.childAlignment = TextAnchor.MiddleLeft;
            gridLayout.constraint = GridLayoutGroup.Constraint.Flexible;
            gridLayoutGroupPanel.GetComponent<ButtonPanelViewUIController>().Init();

            CoroutineUtility.WaitForEndOfFrame(() =>
            {
                gridLayoutGroupPanel.transform.Reset();
            });
        }
    }
}
