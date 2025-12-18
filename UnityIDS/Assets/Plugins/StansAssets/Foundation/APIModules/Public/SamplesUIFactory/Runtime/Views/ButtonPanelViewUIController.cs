using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    [ExecuteInEditMode]
    public class ButtonPanelViewUIController : MonoBehaviour
    {
        readonly int m_defaultButtonsCount = 3;
        readonly SamplesUIFactory m_UIFactory = new SamplesUIFactory();

        public void Init()
        {
            for (var i = 0; i < m_defaultButtonsCount; i++) AddGridLayoutButton();
        }

        /// <summary>
        /// Create tabs panel buttons with attached data panel.
        /// </summary>
        public void AddGridLayoutButton()
        {
            m_UIFactory.MakeButton(GridLayoutPanel.transform, 0);
        }

        GridLayoutGroup GridLayoutPanel => GetComponent<GridLayoutGroup>();
    }
}
