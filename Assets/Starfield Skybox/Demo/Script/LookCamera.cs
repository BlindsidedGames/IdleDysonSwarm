using UnityEngine;
using UnityEngine.InputSystem;

public class LookCamera : MonoBehaviour
{
    public float speedNormal = 10.0f;
    public float speedFast   = 50.0f;

    public float mouseSensitivityX = 5.0f;
    public float mouseSensitivityY = 5.0f;

    float rotY = 0.0f;

    void Start()
    {
        if (GetComponent<Rigidbody>())
            GetComponent<Rigidbody>().freezeRotation = true;
    }

    void Update()
    {
        var mouse = Mouse.current;
        var keyboard = Keyboard.current;

        // rotation
        if (mouse != null && mouse.rightButton.isPressed)
        {
            Vector2 mouseDelta = mouse.delta.ReadValue();
            float rotX = transform.localEulerAngles.y + mouseDelta.x * mouseSensitivityX * 0.1f;
            rotY += mouseDelta.y * mouseSensitivityY * 0.1f;
            rotY = Mathf.Clamp(rotY, -89.5f, 89.5f);
            transform.localEulerAngles = new Vector3(-rotY, rotX, 0.0f);
        }

        if (keyboard != null && keyboard.uKey.isPressed)
        {
            gameObject.transform.localPosition = new Vector3(0.0f, 3500.0f, 0.0f);
        }

    }
}
