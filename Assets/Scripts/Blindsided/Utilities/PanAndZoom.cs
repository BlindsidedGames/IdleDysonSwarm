using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace Blindsided.Utilities
{
    /// <summary> A modular and easily customisable Unity MonoBehaviour for handling swipe and pinch motions on mobile. </summary>
    public class PanAndZoom : MonoBehaviour
    {

        /// <summary> Called as soon as the player touches the screen. The argument is the screen position. </summary>
        public event Action<Vector2> onStartTouch;

        /// <summary> Called as soon as the player stops touching the screen. The argument is the screen position. </summary>
        public event Action<Vector2> onEndTouch;

        /// <summary> Called if the player completed a quick tap motion. The argument is the screen position. </summary>
        public event Action<Vector2> onTap;

        /// <summary> Called if the player swiped the screen. The argument is the screen movement delta. </summary>
        public event Action<Vector2> onSwipe;

        /// <summary> Called if the player pinched the screen. The arguments are the distance between the fingers before and after. </summary>
        public event Action<float, float> onPinch;

        [Header("Tap"), Tooltip("The maximum movement for a touch motion to be treated as a tap")]
        public float maxDistanceForTap = 40;
        [Tooltip("The maximum duration for a touch motion to be treated as a tap")]
        public float maxDurationForTap = 0.4f;

        [Header("Desktop debug"), Tooltip("Use the mouse on desktop?")]
        public bool useMouse = true;
        [Tooltip("The simulated pinch speed using the scroll wheel")]
        public float mouseScrollSpeed = 2;

        [Header("Camera control"), Tooltip("Does the script control camera movement?")]
        public bool controlCamera = true;
        [Tooltip("The controlled camera, ignored of controlCamera=false")]
        public Camera cam;

        [Header("UI"), Tooltip("Are touch motions listened to if they are over UI elements?")]
        public bool ignoreUI;

        [Header("Bounds"), Tooltip("Is the camera bound to an area?")]
        public bool useBounds;

        public float boundMinX = -150;
        public float boundMaxX = 150;
        public float boundMinY = -150;
        public float boundMaxY = 150;

        private Vector2 touch0StartPosition;
        private float touch0StartTime;

        private bool cameraControlEnabled = true;

        private bool canUseMouse;

        /// <summary> Has the player at least one finger on the screen? </summary>
        public bool isTouching { get; private set; }

        /// <summary> The point of contact if it exists in Screen space. </summary>
        public Vector2 touchPosition { get; private set; }

        private void OnEnable()
        {
            EnhancedTouchSupport.Enable();
        }

        private void OnDisable()
        {
            EnhancedTouchSupport.Disable();
        }

        private void Start()
        {
            canUseMouse = Application.platform != RuntimePlatform.Android && Application.platform != RuntimePlatform.IPhonePlayer && Mouse.current != null;
        }

        private void Update()
        {
            if (useMouse && canUseMouse) {
                UpdateWithMouse();
            }
            else {
                UpdateWithTouch();
            }
        }

        private void LateUpdate()
        {
            CameraInBounds();
        }

        private void UpdateWithMouse()
        {
            var mouse = Mouse.current;
            if (mouse == null) return;

            Vector2 mousePosition = mouse.position.ReadValue();

            if (mouse.leftButton.wasPressedThisFrame) {
                if (ignoreUI || !IsPointerOverUIObject()) {
                    touch0StartPosition = mousePosition;
                    touch0StartTime = Time.time;
                    touchPosition = touch0StartPosition;

                    isTouching = true;

                    if (onStartTouch != null) onStartTouch(mousePosition);
                }
            }

            if (mouse.leftButton.isPressed && isTouching) {
                Vector2 move = mousePosition - touchPosition;
                touchPosition = mousePosition;

                if (move != Vector2.zero) {
                    OnSwipe(move);
                }
            }

            if (mouse.leftButton.wasReleasedThisFrame && isTouching) {

                if (Time.time - touch0StartTime <= maxDurationForTap
                    && Vector2.Distance(mousePosition, touch0StartPosition) <= maxDistanceForTap) {
                    OnClick(mousePosition);
                }

                if (onEndTouch != null) onEndTouch(mousePosition);
                isTouching = false;
                cameraControlEnabled = true;
            }

            Vector2 scrollDelta = mouse.scroll.ReadValue();
            if (scrollDelta.y != 0) {
                OnPinch(mousePosition, 1, scrollDelta.y < 0 ? 1 / mouseScrollSpeed : mouseScrollSpeed, Vector2.right);
            }
        }

        private void UpdateWithTouch()
        {
            var activeTouches = Touch.activeTouches;
            int touchCount = activeTouches.Count;

            if (touchCount == 1) {
                Touch touch = activeTouches[0];

                switch (touch.phase) {
                    case TouchPhase.Began:
                    {
                        if (ignoreUI || !IsPointerOverUIObject()) {
                            touch0StartPosition = touch.screenPosition;
                            touch0StartTime = Time.time;
                            touchPosition = touch0StartPosition;

                            isTouching = true;

                            if (onStartTouch != null) onStartTouch(touch0StartPosition);
                        }

                        break;
                    }
                    case TouchPhase.Moved:
                    {
                        touchPosition = touch.screenPosition;
                        if (touch.delta != Vector2.zero && isTouching) {

                            OnSwipe(touch.delta);
                        }
                        break;
                    }
                    case TouchPhase.Ended:
                    {
                        if (Time.time - touch0StartTime <= maxDurationForTap
                            && Vector2.Distance(touch.screenPosition, touch0StartPosition) <= maxDistanceForTap
                            && isTouching) {
                            OnClick(touch.screenPosition);
                        }

                        if (onEndTouch != null) onEndTouch(touch.screenPosition);
                        isTouching = false;
                        cameraControlEnabled = true;
                        break;
                    }
                    case TouchPhase.Stationary:
                    case TouchPhase.Canceled:
                        break;
                }
            }
            else if (touchCount == 2) {
                Touch touch0 = activeTouches[0];
                Touch touch1 = activeTouches[1];

                if (touch0.phase == TouchPhase.Ended || touch1.phase == TouchPhase.Ended) return;

                isTouching = true;

                float previousDistance = Vector2.Distance(touch0.screenPosition - touch0.delta, touch1.screenPosition - touch1.delta);

                float currentDistance = Vector2.Distance(touch0.screenPosition, touch1.screenPosition);

                if (previousDistance != currentDistance) {
                    OnPinch((touch0.screenPosition + touch1.screenPosition) / 2, previousDistance, currentDistance, (touch1.screenPosition - touch0.screenPosition).normalized);
                }
            }
            else {
                if (isTouching) {
                    if (onEndTouch != null) onEndTouch(touchPosition);
                    isTouching = false;
                }

                cameraControlEnabled = true;
            }
        }

        private void OnClick(Vector2 position)
        {
            if (onTap != null && (ignoreUI || !IsPointerOverUIObject())) {
                onTap(position);
            }
        }
        private void OnSwipe(Vector2 deltaPosition)
        {
            if (onSwipe != null) {
                onSwipe(deltaPosition);
            }

            if (controlCamera && cameraControlEnabled) {
                if (cam == null) cam = Camera.main;

                cam.transform.position -= cam.ScreenToWorldPoint(deltaPosition) - cam.ScreenToWorldPoint(Vector2.zero);
            }
        }
        private void OnPinch(Vector2 center, float oldDistance, float newDistance, Vector2 touchDelta)
        {
            if (onPinch != null) {
                onPinch(oldDistance, newDistance);
            }

            if (controlCamera && cameraControlEnabled) {
                if (cam == null) cam = Camera.main;

                if (cam.orthographic) {
                    Vector3 currentPinchPosition = cam.ScreenToWorldPoint(center);

                    cam.orthographicSize = Mathf.Clamp(Mathf.Max(0.1f, cam.orthographicSize * oldDistance / newDistance), 1f, 10f);

                    Vector3 newPinchPosition = cam.ScreenToWorldPoint(center);

                    cam.transform.position -= newPinchPosition - currentPinchPosition;
                }
                else {
                    cam.fieldOfView = Mathf.Clamp(cam.fieldOfView * oldDistance / newDistance, 0.1f, 179.9f);
                }
            }
        }

        /// <summary> Checks if the the current input is over canvas UI </summary>
        public bool IsPointerOverUIObject()
        {

            if (EventSystem.current == null) return false;
            PointerEventData eventDataCurrentPosition = new PointerEventData(EventSystem.current);
            var mouse = Mouse.current;
            if (mouse != null) {
                eventDataCurrentPosition.position = mouse.position.ReadValue();
            }
            else {
                eventDataCurrentPosition.position = touchPosition;
            }
            List<RaycastResult> results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(eventDataCurrentPosition, results);

            return results.Count > 0;
        }

        /// <summary> Cancels camera movement for the current motion. Resets to use camera at the end of the touch motion.</summary>
        public void CancelCamera()
        {
            cameraControlEnabled = false;
        }

        private void CameraInBounds()
        {
            if (controlCamera && useBounds && cam != null && cam.orthographic) {
                cam.orthographicSize = Mathf.Min(cam.orthographicSize, (boundMaxY - boundMinY) / 2 - 0.001f);
                cam.orthographicSize = Mathf.Min(cam.orthographicSize, Screen.height * (boundMaxX - boundMinX) / (2 * Screen.width) - 0.001f);

                Vector2 margin = cam.ScreenToWorldPoint(Vector2.up * Screen.height / 2 + Vector2.right * Screen.width / 2) - cam.ScreenToWorldPoint(Vector2.zero);

                float marginX = margin.x;
                float marginY = margin.y;

                float camMaxX = boundMaxX - marginX;
                float camMaxY = boundMaxY - marginY;
                float camMinX = boundMinX + marginX;
                float camMinY = boundMinY + marginY;

                float camX = Mathf.Clamp(cam.transform.position.x, camMinX, camMaxX);
                float camY = Mathf.Clamp(cam.transform.position.y, camMinY, camMaxY);

                cam.transform.position = new Vector3(camX, camY, cam.transform.position.z);
            }
        }
    }
}