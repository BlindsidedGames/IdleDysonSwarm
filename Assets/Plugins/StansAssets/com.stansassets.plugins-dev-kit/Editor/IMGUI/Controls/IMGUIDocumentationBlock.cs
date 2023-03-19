using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    [Serializable]
    public class IMGUIDocumentationBlock
    {
        [SerializeField]
        List<IMGUIDocumentationUrl> m_DocUrls = new List<IMGUIDocumentationUrl>();

        [SerializeField]
        List<IMGUISampleSceneUrl> m_SampleScenes = new List<IMGUISampleSceneUrl>();
        
        public void AddDocumentationUrl(string title, string url)
        {
            var feature = new IMGUIDocumentationUrl(title,url);
            m_DocUrls.Add(feature);
        }
        
        public void AddSampleScene(string title, string scenePath)
        {
            var feature = new IMGUISampleSceneUrl(title,scenePath);
            m_SampleScenes.Add(feature);
        }

        public void Draw()
        {
            if (m_DocUrls.Count > 0)
            {
                using (new IMGUIBlockWithSpace(new GUIContent("Documentation")))
                {
                    DrawLabelLinks(m_DocUrls);
                }
            }
            
            if (m_SampleScenes.Count > 0)
            {
                using (new IMGUIBlockWithSpace(new GUIContent("Sample Scenes")))
                {
                    DrawLabelLinks(m_SampleScenes);
                }
            }
           
        }

        void DrawLabelLinks(IEnumerable<IMGUIHyperLabel> hyperLabels)
        {
            using (new IMGUIIndentLevel(1))
            {
                var labels = hyperLabels.ToArray();
                for (var i = 0; i < labels.Length; i += 2)
                {
                    using (new IMGUIBeginHorizontal())
                    {
                        labels[i].Draw(GUILayout.Width(150));
                        if (labels.Length > i + 1) 
                            labels[i + 1].Draw(GUILayout.Width(150));

                        GUILayout.FlexibleSpace();
                    }
                }

                EditorGUILayout.Space();
            }
        }
    }
}
