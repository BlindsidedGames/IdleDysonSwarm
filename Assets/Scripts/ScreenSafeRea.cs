using UnityEngine;

public class ScreenSafeRea : MonoBehaviour
{
    private RectTransform _rectTransform;
    private Vector2 maxAnchor;
    private Vector2 minAnchor;
    private Rect safeArea;

    private void OnEnable()
    {
        _rectTransform = GetComponent<RectTransform>();
        safeArea = Screen.safeArea;
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