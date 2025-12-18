using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    [Serializable]
    public class TabsPanelViewUIController : MonoBehaviour
    {
        [SerializeField]
        GameObject m_ButtonsRoot = null;
        [SerializeField]
        GameObject m_PanelsRoot = null;

        SamplesUIFactory m_UIFactory = new SamplesUIFactory();

        void Awake()
        {
            foreach (var button in GetButtons())
                button.onClick.AddListener(() =>
                {
                    ShowPanel(button.transform.GetSiblingIndex());
                });

            ShowPanel(0);
        }

        /// <summary>
        /// Initialized GameObject UI with specified parameters
        /// </summary>
        public void Init(GameObject buttonsRoot, GameObject panelsRoot)
        {
            m_ButtonsRoot = buttonsRoot;
            m_PanelsRoot = panelsRoot;

            AddButton();
        }

        /// <summary>
        /// Create tabs panel button with attached data panel.
        /// </summary>
        public void AddButton()
        {
            m_UIFactory.MakeButton(m_ButtonsRoot.transform, m_ButtonsRoot.GetComponent<RectTransform>().sizeDelta.x);
            m_UIFactory.MakeTabPanel(m_PanelsRoot.transform);
        }

        /// <summary>
        /// Select data panel
        /// </summary>
        public void ShowPanel(int siblingIndex)
        {
            foreach (RectTransform panelRect in m_PanelsRoot.transform)
            {
                var index = panelRect.GetSiblingIndex();
                var button = m_ButtonsRoot.transform.GetChild(index);
                if (index == siblingIndex)
                {
                    panelRect.gameObject.SetActive(true);
                    button.GetComponent<Image>().color = new Color32(181, 255, 0, 255);

                    var scrollRect = m_PanelsRoot.transform.parent.GetComponent<ScrollRect>();
                    scrollRect.content = panelRect;
                }
                else
                {
                    panelRect.gameObject.SetActive(false);
                    button.GetComponent<Image>().color = Color.white;
                }
            }
        }

        public RectTransform GetPanel(int siblingIndex)
        {
            return (RectTransform)m_PanelsRoot.transform.GetChild(siblingIndex);
        }

        public Button[] GetButtons()
        {
            return m_ButtonsRoot.GetComponentsInChildren<Button>();
        }
    }
}
