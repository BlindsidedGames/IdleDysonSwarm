using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Blindsided.Utilities
{
    public class TabRememberer : MonoBehaviour
    {
        [SerializeField] protected Button tab1;
        [SerializeField] protected Button tab2;
        [SerializeField] protected Button tab3;
        [SerializeField] protected Button tab4;
        [SerializeField] protected Button tab5;


        /*protected void SetTab(Tab t)
        {
            switch (t)
            {
                case Tab.Tab1:
                    tab1.onClick.Invoke();
                    break;
                case Tab.Tab2:
                    tab2.onClick.Invoke();
                    break;
                case Tab.Tab3:
                    tab3.onClick.Invoke();
                    break;
                case Tab.Tab4:
                    tab4.onClick.Invoke();
                    break;
                case Tab.Tab5:
                    tab5.onClick.Invoke();
                    break;
                default:
                    Debug.Log("NoTab");
                    break;
            }
        }*/
    }
}