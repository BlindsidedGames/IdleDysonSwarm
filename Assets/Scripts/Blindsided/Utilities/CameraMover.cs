using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using UnityEngine.UI;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace Blindsided.Utilities
{
    public class CameraMover : MonoBehaviour
    {
        private Vector3 Origin;
        private Vector3 difference;
        private Vector3 ResetCamera;
        private bool drag;

        public Slider sensitivitySetter;

        private readonly float minFOV = 1f;
        private readonly float maxFOV = 10f;
        public float zoomSensitivity = 10f;
        public float touchZoomSensitivity = 0.01f;
        private float touchDist;
        private float lastDist;

        private int panFingerId;          // Touch mode only
        private bool wasZoomingLastFrame; // Touch mode only

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
            ResetCamera = Camera.main.transform.position;
            sensitivitySetter.onValueChanged.AddListener(SetTouchSensitivity);
        }

        private void SetTouchSensitivity(float amount)
        {
            touchZoomSensitivity = amount / 10;
        }
        private void Update()
        {
            if (!EventSystem.current.IsPointerOverGameObject()) {
                if (Touchscreen.current != null && Application.platform != RuntimePlatform.WebGLPlayer) {
                    HandleTouch();
                }
                else {
                    HandleMouse();
                }
            }


        }


        private void HandleTouch()
        {
            var activeTouches = Touch.activeTouches;
            int touchCount = activeTouches.Count;

            switch (touchCount) {

                case 1: // Panning
                    wasZoomingLastFrame = false;

                    // If the touch began, capture its position and its finger ID.
                    // Otherwise, if the finger ID of the touch doesn't match, skip it.
                    Touch touch = activeTouches[0];
                    if (touch.phase == TouchPhase.Began) {
                        Origin = Camera.main.ScreenToWorldPoint((Vector3)touch.screenPosition);
                        panFingerId = touch.finger.index;
                    }
                    else if (touch.finger.index == panFingerId && touch.phase == TouchPhase.Moved) {
                        difference = Camera.main.ScreenToWorldPoint((Vector3)touch.screenPosition) - Camera.main.transform.position;
                        Camera.main.transform.position = Origin - difference;
                    }
                    break;

                case 2: // Zooming
                    if (!wasZoomingLastFrame) {
                        wasZoomingLastFrame = true;
                    }
                    else {
                        Touch touch1 = activeTouches[0];
                        Touch touch2 = activeTouches[1];

                        if (touch1.phase == TouchPhase.Began && touch2.phase == TouchPhase.Began) {
                            lastDist = Vector2.Distance(touch1.screenPosition, touch2.screenPosition);
                        }

                        if (touch1.phase == TouchPhase.Moved && touch2.phase == TouchPhase.Moved) {
                            float newDist = Vector2.Distance(touch1.screenPosition, touch2.screenPosition);
                            touchDist = lastDist - newDist;
                            lastDist = newDist;

                            // Your Code Here
                            float touchfov = Camera.main.orthographicSize;
                            touchfov += touchDist * touchZoomSensitivity;
                            Camera.main.orthographicSize = Mathf.Clamp(touchfov, minFOV, maxFOV);
                        }
                    }
                    break;

                default:
                    wasZoomingLastFrame = false;
                    break;
            }
        }

        private void HandleMouse()
        {
            var mouse = Mouse.current;
            if (mouse == null) return;

            Vector2 mousePosition = mouse.position.ReadValue();

            if (mouse.leftButton.isPressed) {
                difference = Camera.main.ScreenToWorldPoint((Vector3)mousePosition) - Camera.main.transform.position;
                if (!drag) {
                    drag = true;
                    Origin = Camera.main.ScreenToWorldPoint((Vector3)mousePosition);
                }
            }
            else {
                drag = false;
            }

            if (drag) Camera.main.transform.position = Origin - difference;

            float fov = Camera.main.orthographicSize;
            Vector2 scrollDelta = mouse.scroll.ReadValue();
            fov -= scrollDelta.y * zoomSensitivity * 0.01f; // Scale down as scroll.y is much larger than old GetAxis
            fov = Mathf.Clamp(fov, minFOV, maxFOV);
            Camera.main.orthographicSize = fov;
        }
    }
}
