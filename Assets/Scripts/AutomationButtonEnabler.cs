using UnityEngine;
using UnityEngine.Serialization;
using static Expansion.Oracle;

public class AutomationButtonEnabler : MonoBehaviour
{
    [SerializeField, FormerlySerializedAs("Research")] private GameObject[] researchButtons;
    [SerializeField, FormerlySerializedAs("Bots")] private GameObject[] botButtons;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Update()
    {
        foreach (GameObject button in researchButtons) button.SetActive(prestigeData.infinityAutoResearch);
        foreach (GameObject button in botButtons) button.SetActive(prestigeData.infinityAutoBots);
    }
}
