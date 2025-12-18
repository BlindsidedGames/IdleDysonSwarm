using UnityEditor;
using UnityEngine;

namespace SA.Foundation
{
    public class DescriptionPanelBuilder : UIBuilder
    {
        const string GAMEOBJECT_NAME = "Description_Text_Panel";
        const string DEFAULT_TEXT = "It's small description, which was created especcially for testing! I'd like to play dota 2, but I am should working now.";
        static readonly Color m_color = new Color32(177, 255, 218, 255);

        public DescriptionPanelBuilder(GameObject root)
            : base(root) { }

        protected override void OnBuild()
        {
            CreateTextPanel(GAMEOBJECT_NAME, m_color);
            var text = AddTextToPanel(DEFAULT_TEXT);
            text.fontStyle = FontStyle.Normal;
            Selection.activeObject = text;
        }
    }
}
