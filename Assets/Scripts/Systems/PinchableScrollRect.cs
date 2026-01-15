using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using UnityEngine.UI;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;

public class PinchableScrollRect : ScrollRect
{
    private readonly float _minZoom = .4f;
    private readonly float _maxZoom = 1.5f;
    private readonly float _zoomLerpSpeed = 10f;
    private float _currentZoom = .8f;
    private bool _isPincching;
    private float _startPinchDist;
    private float _startPinchZoom;
    private Vector2 _startPinchCenterPosition;
    private Vector2 _startPinchScreenPosition;
    private readonly float _mouseWheelSensitivity = 1;
    private bool blockPan;

    protected override void OnEnable()
    {
        base.OnEnable();
        EnhancedTouchSupport.Enable();
    }

    protected override void OnDisable()
    {
        base.OnDisable();
        EnhancedTouchSupport.Disable();
    }

    private void Update()
    {
        var activeTouches = Touch.activeTouches;
        int touchCount = activeTouches.Count;

        if (touchCount == 2)
        {
            if (!_isPincching)
            {
                _isPincching = true;
                OnPinchStart();
            }

            OnPinch();
        }
        else
        {
            _isPincching = false;
            if (touchCount == 0) blockPan = false;
        }

        //pc input
        var mouse = Mouse.current;
        if (mouse != null)
        {
            Vector2 scrollDelta = mouse.scroll.ReadValue();
            float scrollWheelInput = scrollDelta.y * 0.01f; // Scale to match old GetAxis behavior
            if (Mathf.Abs(scrollWheelInput) > float.Epsilon)
            {
                _currentZoom *= 1 + scrollWheelInput * _mouseWheelSensitivity;
                _currentZoom = Mathf.Clamp(_currentZoom, _minZoom, _maxZoom);
                _startPinchScreenPosition = mouse.position.ReadValue();
                RectTransformUtility.ScreenPointToLocalPointInRectangle(content, _startPinchScreenPosition, null,
                    out _startPinchCenterPosition);
                Vector2 pivotPosition =
                    new Vector3(content.pivot.x * content.rect.size.x, content.pivot.y * content.rect.size.y);
                var posFromBottomLeft = pivotPosition + _startPinchCenterPosition;
                SetPivot(content,
                    new Vector2(posFromBottomLeft.x / content.rect.width, posFromBottomLeft.y / content.rect.height));
            }
        }
        //pc input end

        if (Mathf.Abs(content.localScale.x - _currentZoom) > 0.001f)
            content.localScale = Vector3.Lerp(content.localScale, Vector3.one * _currentZoom,
                _zoomLerpSpeed * Time.deltaTime);
    }

    protected override void SetContentAnchoredPosition(Vector2 position)
    {
        if (_isPincching || blockPan) return;
        base.SetContentAnchoredPosition(position);
    }

    public override void OnScroll(PointerEventData eventData)
    {
        // Don't pass scroll to base class - we handle mouse wheel for zooming in Update()
    }

    private void OnPinchStart()
    {
        var activeTouches = Touch.activeTouches;
        var pos1 = activeTouches[0].screenPosition;
        var pos2 = activeTouches[1].screenPosition;

        _startPinchDist = Distance(pos1, pos2) * content.localScale.x;
        _startPinchZoom = _currentZoom;
        _startPinchScreenPosition = (pos1 + pos2) / 2;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(content, _startPinchScreenPosition, null,
            out _startPinchCenterPosition);

        Vector2 pivotPosition =
            new Vector3(content.pivot.x * content.rect.size.x, content.pivot.y * content.rect.size.y);
        var posFromBottomLeft = pivotPosition + _startPinchCenterPosition;

        SetPivot(content,
            new Vector2(posFromBottomLeft.x / content.rect.width, posFromBottomLeft.y / content.rect.height));
        blockPan = true;
    }

    private void OnPinch()
    {
        var activeTouches = Touch.activeTouches;
        var currentPinchDist = Distance(activeTouches[0].screenPosition, activeTouches[1].screenPosition) * content.localScale.x;
        _currentZoom = currentPinchDist / _startPinchDist * _startPinchZoom;
        _currentZoom = Mathf.Clamp(_currentZoom, _minZoom, _maxZoom);
    }

    private float Distance(Vector2 pos1, Vector2 pos2)
    {
        RectTransformUtility.ScreenPointToLocalPointInRectangle(content, pos1, null, out pos1);
        RectTransformUtility.ScreenPointToLocalPointInRectangle(content, pos2, null, out pos2);
        return Vector2.Distance(pos1, pos2);
    }

    private static void SetPivot(RectTransform rectTransform, Vector2 pivot)
    {
        if (rectTransform == null) return;

        var size = rectTransform.rect.size;
        var deltaPivot = rectTransform.pivot - pivot;
        var deltaPosition = new Vector3(deltaPivot.x * size.x, deltaPivot.y * size.y) * rectTransform.localScale.x;
        rectTransform.pivot = pivot;
        rectTransform.localPosition -= deltaPosition;
    }
}
