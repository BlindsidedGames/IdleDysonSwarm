using TMPro;
using UnityEngine;
using Blindsided.Utilities;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;

public class QuantumProgressBar : MonoBehaviour
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
        percent = prestigeData.infinityPoints / (float)IPToQuantumConversion;
        fill.fillAmount = percent;
        fillText.text = prestigeData.infinityPoints < IPToQuantumConversion
            ? $" {prestigeData.infinityPoints}/{IPToQuantumConversion}"
            : "";
        bool earned = prestigeData.infinityPoints >= IPToQuantumConversion;
        exitDysonVerse.SetActive(earned);
    }
}

