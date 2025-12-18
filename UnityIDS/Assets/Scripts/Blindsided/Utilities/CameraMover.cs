using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

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
                if (Input.touchSupported && Application.platform != RuntimePlatform.WebGLPlayer) {
                    HandleTouch();
                }
                else {
                    HandleMouse();
                }
            }


        }


        private void HandleTouch()
        {
            switch (Input.touchCount) {

                case 1: // Panning
                    wasZoomingLastFrame = false;

                    // If the touch began, capture its position and its finger ID.
                    // Otherwise, if the finger ID of the touch doesn't match, skip it.
                    Touch touch = Input.GetTouch(0);
                    if (touch.phase == TouchPhase.Began) {
                        Origin = Camera.main.ScreenToWorldPoint(Input.mousePosition);
                        panFingerId = touch.fingerId;
                    }
                    else if (touch.fingerId == panFingerId && touch.phase == TouchPhase.Moved) {
                        difference = Camera.main.ScreenToWorldPoint(Input.mousePosition) - Camera.main.transform.position;
                        Camera.main.transform.position = Origin - difference;
                    }
                    break;

                case 2: // Zooming
                    //Vector2[] newPositions = { Input.GetTouch(0).position, Input.GetTouch(1).position };
                    if (!wasZoomingLastFrame) {
                        //lastZoomPositions = newPositions;
                        wasZoomingLastFrame = true;
                    }
                    else {
                        Touch touch1 = Input.GetTouch(0);
                        Touch touch2 = Input.GetTouch(1);

                        if (touch1.phase == TouchPhase.Began && touch2.phase == TouchPhase.Began) {
                            lastDist = Vector2.Distance(touch1.position, touch2.position);
                        }

                        if (touch1.phase == TouchPhase.Moved && touch2.phase == TouchPhase.Moved) {
                            float newDist = Vector2.Distance(touch1.position, touch2.position);
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
            if (Input.GetMouseButton(0)) {
                difference = Camera.main.ScreenToWorldPoint(Input.mousePosition) - Camera.main.transform.position;
                if (!drag) {
                    drag = true;
                    Origin = Camera.main.ScreenToWorldPoint(Input.mousePosition);
                }
            }
            else {
                drag = false;
            }

            if (drag) Camera.main.transform.position = Origin - difference;

            float fov = Camera.main.orthographicSize;
            fov -= Input.GetAxis("Mouse ScrollWheel") * zoomSensitivity;
            fov = Mathf.Clamp(fov, minFOV, maxFOV);
            Camera.main.orthographicSize = fov;
            //if (Input.GetMouseButton(1)) Camera.main.transform.position = ResetCamera;
        }
    }
}