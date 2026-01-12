using TMPro;
using UnityEngine;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class ToRealityFillbar : MonoBehaviour
{
    [SerializeField] private SlicedFilledImage fill;
    [SerializeField] private TMP_Text fillText;
    [SerializeField] private GameObject exitDysonVerse;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private float percent;

    private void Update()
    {
        percent = prestigeData.infinityPoints / 42f;
        fill.fillAmount = percent;
        fillText.text = prestigeData.infinityPoints < 42
            ? $" {prestigeData.infinityPoints}/42"
            : "";
        bool earned = prestigeData.infinityPoints >= 42;
        exitDysonVerse.SetActive(earned);
    }
}

