using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public abstract class IMGUILayoutElement : ScriptableObject, ILayoutElementIMGUI
    {
        protected Rect m_Position = new Rect();

        public abstract void OnGUI();
        public virtual void OnLayoutEnable() { }
        public virtual void OnAwake() { }

        public void SetPosition(Rect position)
        {
            m_Position = position;
        }
    }
}
