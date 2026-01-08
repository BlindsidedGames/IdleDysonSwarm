using UnityEditor;
using UnityEngine;

namespace SA.Foundation
{
    public class TitlePanelBuilder : UIBuilder
    {
        const string GAMEOBJECT_NAME = "TitlePanel";
        const string TITLE_TEXT = "Simple title";
        static readonly Color m_color = new Color32(100, 180, 255, 255);

        public TitlePanelBuilder(GameObject root)
            : base(root) { }

        protected override void OnBuild()
        {
            CreateTextPanel(GAMEOBJECT_NAME, m_color, 90f);
            var text = AddTextToPanel(TITLE_TEXT);
            Selection.activeObject = text;
        }
    }
}
