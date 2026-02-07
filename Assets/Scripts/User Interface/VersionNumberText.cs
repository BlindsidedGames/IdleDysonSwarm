using TMPro;
using UnityEngine;

[RequireComponent(typeof(TMP_Text))]
public class VersionNumberText : MonoBehaviour
{
    [SerializeField] private string prefix = "Build: ";
    [SerializeField] private string unknownVersionFallback = "unknown";

    private TMP_Text _text;

    private void Awake()
    {
        _text = GetComponent<TMP_Text>();
        Refresh();
    }

    private void OnEnable()
    {
        Refresh();
    }

    public void Refresh()
    {
        var version = string.IsNullOrEmpty(Application.version) ? unknownVersionFallback : Application.version;
        _text.text = $"{prefix}{version}";
    }
}

