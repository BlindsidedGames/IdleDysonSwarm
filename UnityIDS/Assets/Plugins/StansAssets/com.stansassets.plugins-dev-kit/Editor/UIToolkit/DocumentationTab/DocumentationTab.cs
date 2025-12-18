#if UNITY_2019_4_OR_NEWER
using System;
using System.Collections.Generic;
using System.Linq;
using StansAssets.Foundation.UIElements;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class DocumentationTab : BaseTab
    {
        [SerializeField]
        List<VisualElement> m_DocUrls = new List<VisualElement>();
        [SerializeField]
        List<VisualElement> m_SampleUrls = new List<VisualElement>();
        [SerializeField]
        List<VisualElement> m_DocTop = new List<VisualElement>();
        [SerializeField]
        List<VisualElement> m_SampleTop = new List<VisualElement>();
        
        VisualElement m_DocBlock;
        VisualElement m_DocTopPanel;
        VisualElement m_DocItemsPanel;
        VisualElement m_SampleBlock;
        VisualElement m_SampleTopPanel;
        VisualElement m_SampleItemsPanel;
        
        public DocumentationTab()
            : base($"{PluginsDevKitPackage.UIToolkitPath}/DocumentationTab/DocumentationTab")
        {
            m_DocBlock = this.Q<VisualElement>("DocBlock");
            m_DocTopPanel = this.Q<VisualElement>("DocTopPanel");
            m_DocItemsPanel = this.Q<VisualElement>("DocItemsPanel");
            
            m_SampleBlock = this.Q<VisualElement>("SampleBlock");
            m_SampleTopPanel = this.Q<VisualElement>("SampleTopPanel");
            m_SampleItemsPanel = this.Q<VisualElement>("SampleItemsPanel");
        }
        
        public void AddDocumentationUrl(string title, string url)
        {
            var feature = DocumentationItem(title,url);
            m_DocUrls.Add(feature);
            RecreateDocumentationView();
        }
        
        public void AddSampleUrl(string title, string url)
        {
            var feature = SampleItem(title,url);
            m_SampleUrls.Add(feature);
            RecreateSampleView();
        }
        
        VisualElement DocumentationItem(string nameItem, string link)
        {
            var label = new Label { text = $"➠ {nameItem}" };
            var hyperlink = new Hyperlink { Link = link };
            hyperlink.Add(label);
            var item = new VisualElement();
            item.AddToClassList("doc-item");
            item.Add(hyperlink);
            return item;
        }
        
        VisualElement SampleItem(string nameItem, string link)
        {
            var labelIcon = new Label();
            labelIcon.AddToClassList("sample-icon");
            var label = new Label { text = $"{nameItem}" };
            var item = new Button();
            item.Add(labelIcon);
            item.Add(label);
            item.clicked += () =>
            {
                EditorSceneManager.OpenScene(link);
            };
            item.AddToClassList("sample-btn");
            return item;
        }
        
        public void AddToDocTopPanel(VisualElement ve)
        {
            m_DocTop.Add(ve);
            RecreateDocumentationView();
        }
        
        public void AddToSampleTopPanel(VisualElement ve)
        {
            m_SampleTop.Add(ve);
            RecreateSampleView();
        }

        void RecreateDocumentationView()
        {
            m_DocBlock.style.display = DisplayStyle.Flex;
            if (!m_DocUrls.Any())
            {
                m_DocBlock.style.display = DisplayStyle.None;
                return;
            }
            m_DocTopPanel.style.display = DisplayStyle.Flex;
            if (!m_DocTop.Any())
            {
                m_DocTopPanel.style.display = DisplayStyle.None;
            }
            m_DocTopPanel.Clear();
            foreach (var docTop in m_DocTop)
            {
                m_DocTopPanel.Add(docTop);
            }
            m_DocItemsPanel.Clear();
            foreach (var docUrl in m_DocUrls)
            {
                m_DocItemsPanel.Add(docUrl);
            }
        }
        
        void RecreateSampleView()
        {
            m_SampleBlock.style.display = DisplayStyle.Flex;
            if (!m_SampleUrls.Any())
            {
                m_SampleBlock.style.display = DisplayStyle.None;
                return;
            }
            m_SampleTopPanel.style.display = DisplayStyle.Flex;
            if (!m_SampleTop.Any())
            {
                m_SampleTopPanel.style.display = DisplayStyle.None;
            }
            m_SampleTopPanel.Clear();
            foreach (var sampleTop in m_SampleTop)
            {
                m_SampleTopPanel.Add(sampleTop);
            }
            m_SampleItemsPanel.Clear();
            foreach (var sampleUrl in m_SampleUrls)
            {
                m_SampleItemsPanel.Add(sampleUrl);
            }
        }
    }
}
#endif
