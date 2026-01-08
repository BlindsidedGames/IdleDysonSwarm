using StansAssets.Foundation.Extensions;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    public abstract class UIBuilder
    {
        protected GameObject m_Root;
        GameObject m_PanelView;
        RectTransform m_PanelViewRect;

        protected abstract void OnBuild();

        protected UIBuilder(GameObject root)
        {
            m_Root = root;
        }

        public void Build()
        {
            if (m_Root == null)
            {
                Debug.LogError("No Root GameObject provided!");
                return;
            }

            OnBuild();
        }

        protected void CreateTextPanel(string gameobjectName, Color color, float height = 150f)
        {
            m_PanelView = new GameObject(gameobjectName, typeof(RectTransform));
            m_PanelView.transform.SetParent(m_Root.transform);
            m_PanelView.transform.Reset();
            m_PanelViewRect = m_PanelView.GetComponent<RectTransform>();
            m_PanelViewRect.Reset();
            m_PanelViewRect.anchorMin = new Vector2(0f, 1f);
            m_PanelViewRect.anchorMax = Vector2.one;
            m_PanelViewRect.sizeDelta = new Vector2(0f, height);

            m_PanelView.AddComponent<Image>().color = color;
            m_PanelView.AddComponent<LayoutElement>();
        }

        protected Text AddTextToPanel(string defaultText)
        {
            var textTitlePanelView = new GameObject("Text", typeof(RectTransform));
            textTitlePanelView.transform.SetParent(m_PanelView.transform);
            textTitlePanelView.transform.Reset();
            var textTitlePanelViewRect = textTitlePanelView.GetComponent<RectTransform>();
            textTitlePanelViewRect.Reset();
            textTitlePanelViewRect.anchorMin = Vector2.zero;
            textTitlePanelViewRect.anchorMax = Vector2.one;
            var text = textTitlePanelView.AddComponent<Text>();
            text.text = defaultText;
            text.font = (Font)Resources.GetBuiltinResource(typeof(Font), "Arial.ttf");
            text.fontStyle = FontStyle.Bold;
            text.alignment = TextAnchor.MiddleLeft;
            text.resizeTextForBestFit = true;
            text.color = new Color32(50, 50, 50, 255);
            return text;
        }
    }
}
