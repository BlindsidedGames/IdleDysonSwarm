using UnityEngine;
using UnityEngine.EventSystems;

namespace Blindsided.Utilities
{
    public class ResizePanel : MonoBehaviour, IPointerDownHandler, IDragHandler
    {

        public Vector2 minSize;
        public Vector2 maxSize;

        private RectTransform rectTransform;
        private Vector2 currentPointerPosition;
        private Vector2 previousPointerPosition;

        private void Awake()
        {
            rectTransform = transform.parent.GetComponent<RectTransform>();
        }

        public void OnPointerDown(PointerEventData data)
        {
            rectTransform.SetAsLastSibling();
            RectTransformUtility.ScreenPointToLocalPointInRectangle(rectTransform, data.position, data.pressEventCamera, out previousPointerPosition);
        }

        public void OnDrag(PointerEventData data)
        {
            if (rectTransform == null)
                return;

            Vector2 sizeDelta = rectTransform.sizeDelta;

            RectTransformUtility.ScreenPointToLocalPointInRectangle(rectTransform, data.position, data.pressEventCamera, out currentPointerPosition);
            Vector2 resizeValue = currentPointerPosition - previousPointerPosition;

            sizeDelta.x += resizeValue.x;
            sizeDelta.x = Mathf.Clamp(sizeDelta.x, minSize.x, maxSize.x);

            sizeDelta.y -= resizeValue.y;
            sizeDelta.y = Mathf.Clamp(sizeDelta.y, minSize.y, maxSize.y);

            rectTransform.sizeDelta = sizeDelta;

            previousPointerPosition = currentPointerPosition;
        }
    }
}