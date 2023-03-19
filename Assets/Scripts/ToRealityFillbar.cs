using TMPro;
using UnityEngine;
using static Oracle;

public class ToRealityFillbar : MonoBehaviour
{
    [SerializeField] private SlicedFilledImage fill;
    [SerializeField] private TMP_Text fillText;
    [SerializeField] private GameObject exitDysonVerse;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private float percent;

    private void Update()
    {
        percent = dvpd.infinityPoints / 42f;
        fill.fillAmount = percent;
        fillText.text = dvpd.infinityPoints < 42
            ? $" {dvpd.infinityPoints}/42"
            : "";
        var earned = dvpd.infinityPoints >= 42;
        exitDysonVerse.SetActive(earned);
    }
}