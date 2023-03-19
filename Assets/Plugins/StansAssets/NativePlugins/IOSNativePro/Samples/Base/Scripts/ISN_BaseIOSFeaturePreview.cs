////////////////////////////////////////////////////////////////////////////////
//  
// @module IOS Native Plugin for Unity3D 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;
using UnityEngine.SceneManagement;

namespace SA.iOS.Examples
{
    public class ISN_BaseIOSFeaturePreview : MonoBehaviour
    {
        protected GUIStyle style;

        protected int buttonWidth = 400;
        protected int buttonHeight = 150;
        protected float StartY = 40;
        protected float StartX = 20;

        protected float XStartPos = 20;
        protected float YStartPos = 20;

        protected float XButtonStep = 440;
        protected float YButtonStep = 180;

        protected float YLableStep = 100;

        protected virtual void InitStyles()
        {
            style = new GUIStyle();
            style.normal.textColor = Color.white;
            style.fontSize = 16;
            style.fontStyle = FontStyle.BoldAndItalic;
            style.alignment = TextAnchor.UpperLeft;
            style.wordWrap = true;
        }

        public virtual void Start()
        {
            InitStyles();
        }

        public void UpdateToStartPos()
        {
            StartY = YStartPos;
            StartX = XStartPos;
        }

        public void LoadLevel(string levelName)
        {
            SceneManager.LoadScene(levelName);
        }
    }
}
