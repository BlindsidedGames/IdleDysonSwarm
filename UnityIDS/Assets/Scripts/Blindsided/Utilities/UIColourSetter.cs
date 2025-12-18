using UnityEngine;
using UnityEngine.UI;

//using static UI.ColourManager;

namespace Blindsided.Utilities
{
    [RequireComponent(typeof(Image))]
    public class UIColourSetter : MonoBehaviour
    {
        public bool isSpriteRenderer;
        private void Start()
        {
            //colourManager.AddSetter(this);
        }
        public void SetColour(Color colour)
        {
            if (isSpriteRenderer)
            {
                GetComponent<SpriteRenderer>().color = colour;
                return;
            }
            GetComponent<Image>().color = colour;
        }
    }
}