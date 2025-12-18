using UnityEngine;
using UnityEngine.EventSystems;

namespace Blindsided.Utilities
{
    /// <summary>
    ///     Zooms the attached image in or out.
    ///     Attach this script to scrollview content panel.
    ///     All anchors and pivots set to 0.5.
    ///     Position under mouse remains there.
    /// </summary>
    public class ZoomImage : MonoBehaviour, IScrollHandler
    {
        //Make sure these values are evenly divisible by scaleIncrement
        [SerializeField] private float _minimumScale = 0.5f;
        [SerializeField] private float _initialScale = 1f;

        [SerializeField] private float _maximumScale = 3f;

        /////////////////////////////////////////////
        [SerializeField] private float _scaleIncrement = .5f;
        /////////////////////////////////////////////

        [HideInInspector] private Vector3 _scale;

        private RectTransform _thisTransform;

        private void Awake()
        {
            _thisTransform = transform as RectTransform;

            _scale.Set(_initialScale, _initialScale, 1f);
            _thisTransform.localScale = _scale;
        }

        public void OnScroll(PointerEventData eventData)
        {
            Debug.Log("scrolling");
            Vector2 relativeMousePosition;

            RectTransformUtility.ScreenPointToLocalPointInRectangle(_thisTransform, Input.mousePosition, null,
                out relativeMousePosition);

            var delta = eventData.scrollDelta.y;

            if (delta > 0 && _scale.x < _maximumScale)
            {
                //zoom in

                _scale.Set(_scale.x + _scaleIncrement, _scale.y + _scaleIncrement, 1f);
                _thisTransform.localScale = _scale;
                _thisTransform.anchoredPosition -= relativeMousePosition * _scaleIncrement;
            }

            else if (delta < 0 && _scale.x > _minimumScale)
            {
                //zoom out

                _scale.Set(_scale.x - _scaleIncrement, _scale.y - _scaleIncrement, 1f);
                _thisTransform.localScale = _scale;
                _thisTransform.anchoredPosition += relativeMousePosition * _scaleIncrement;
            }
        }
    }
}