using UnityEngine;
using UnityEngine.Events;
using UnityEngine.EventSystems;

namespace Blindsided.Utilities
{
    public class HoldToPurchase : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler, IDragHandler
    {
        [SerializeField] private float initialDelay = 0.5f;
        [SerializeField] private float repeatInterval = 0.05f;
        public UnityEvent onRepeat;

        private bool _isHeld;
        private float _holdTime;
        private float _lastRepeatTime;
        private bool _hasStartedRepeating;

        private void OnDisable()
        {
            _isHeld = false;
            _holdTime = 0f;
            _hasStartedRepeating = false;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            _isHeld = true;
            _holdTime = 0f;
            _lastRepeatTime = 0f;
            _hasStartedRepeating = false;
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            _isHeld = false;
            _holdTime = 0f;
            _hasStartedRepeating = false;
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            _isHeld = false;
            _holdTime = 0f;
            _hasStartedRepeating = false;
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (_isHeld)
            {
                eventData.dragging = false;
            }
        }

        private void Update()
        {
            if (!_isHeld) return;

            _holdTime += Time.deltaTime;

            if (!_hasStartedRepeating)
            {
                if (_holdTime >= initialDelay)
                {
                    _hasStartedRepeating = true;
                    _lastRepeatTime = _holdTime;
                    onRepeat?.Invoke();
                }
            }
            else
            {
                if (_holdTime - _lastRepeatTime >= repeatInterval)
                {
                    _lastRepeatTime = _holdTime;
                    onRepeat?.Invoke();
                }
            }
        }
    }
}
