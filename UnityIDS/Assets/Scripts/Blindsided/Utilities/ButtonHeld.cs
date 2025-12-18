using UnityEngine;
using UnityEngine.EventSystems;

namespace Blindsided.Utilities
{
    public class ButtonHeld : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IDragHandler
    {
        public bool buttonHeld;

        public void OnPointerDown(PointerEventData eventData)
        {
            buttonHeld = true;
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            buttonHeld = false;
        }
        public void OnDrag(PointerEventData eventData)
        {
            if (buttonHeld) {
                eventData.dragging = false;
            }
        }
    }
}