using UnityEngine;
using static Expansion.Oracle;

public class ResearchEnabler : MonoBehaviour
{
    [SerializeField] private GameObject panelLifetime1;
    [SerializeField] private GameObject panelLifetime2;
    [SerializeField] private GameObject panelLifetime3;
    [SerializeField] private GameObject panelLifetime4;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;


    private void Update()
    {
        panelLifetime1.SetActive(!infinityData.panelLifetime1 || infinityData.panelLifetime1 && !oracle.saveSettings.hidePurchased);

        panelLifetime2.SetActive(infinityData.panelLifetime1 && !infinityData.panelLifetime2 ||
                                 infinityData.panelLifetime2 && !oracle.saveSettings.hidePurchased);

        panelLifetime3.SetActive(infinityData.panelLifetime2 && !infinityData.panelLifetime3 ||
                                 infinityData.panelLifetime3 && !oracle.saveSettings.hidePurchased);

        panelLifetime4.SetActive(infinityData.panelLifetime3 && !infinityData.panelLifetime4 ||
                                 infinityData.panelLifetime4 && !oracle.saveSettings.hidePurchased);
    }
}
