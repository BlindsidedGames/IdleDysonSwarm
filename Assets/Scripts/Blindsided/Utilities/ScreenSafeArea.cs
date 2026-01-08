using UnityEngine;

namespace Blindsided.Utilities
{
    public class ScreenSafeArea : MonoBehaviour
    {
        private RectTransform _rectTransform;
        private Vector2 maxAnchor;
        private Vector2 minAnchor;
        private Rect safeArea;

        #if UNITY_EDITOR
        public bool extraBoarders;
        #endif
        private void OnEnable()
        {
            _rectTransform = GetComponent<RectTransform>();
            safeArea = Screen.safeArea;

            #if UNITY_EDITOR
            // Subtract 40 from the left, right, and bottom
            if (extraBoarders)
            {
                _rectTransform.offsetMin = new Vector2(40, 40); // Left, Bottom
                _rectTransform.offsetMax = new Vector2(-40, 0); // Right, Top 
            }
            #endif

            minAnchor = safeArea.position;
            maxAnchor = minAnchor + safeArea.size;

            minAnchor.x /= Screen.width;
            minAnchor.y /= Screen.height;
            maxAnchor.x /= Screen.width;
            maxAnchor.y /= Screen.height;

            _rectTransform.anchorMin = minAnchor;
            _rectTransform.anchorMax = maxAnchor;


        }
    }
}