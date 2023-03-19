using UnityEngine;

public class RectAdjuster : MonoBehaviour
{
    [SerializeField] private GameObject[] rectsToAddGameObjects;
    [SerializeField] private RectTransform rectToAdjust;
    [SerializeField] private float TotalHeight;
    [SerializeField] private float modifier;

    [SerializeField] private bool padding;

    // Start is called before the first frame update
    private void Start()
    {
        CheckHeight();
    }

    // Update is called once per frame
    private void Update()
    {
        CheckHeight();
    }

    private void CheckHeight()
    {
        TotalHeight = 0;
        for (var i = 0; i < rectsToAddGameObjects.Length; i++)
            if (rectsToAddGameObjects[i].activeSelf)
                TotalHeight += rectsToAddGameObjects[i].GetComponent<RectTransform>().sizeDelta.y;

        if (padding) TotalHeight += rectsToAddGameObjects.Length * 5 + modifier;

        rectToAdjust.sizeDelta = new Vector2(rectToAdjust.sizeDelta.x, TotalHeight);
    }
}