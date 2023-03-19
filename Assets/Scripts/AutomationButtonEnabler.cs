using UnityEngine;
using static Oracle;

public class AutomationButtonEnabler : MonoBehaviour
{
    [SerializeField] private GameObject[] Research;
    [SerializeField] private GameObject[] Bots;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Update()
    {
        foreach (var VARIABLE in Research) VARIABLE.SetActive(dvpd.infinityAutoResearch);
        foreach (var VARIABLE in Bots) VARIABLE.SetActive(dvpd.infinityAutoBots);
    }
}