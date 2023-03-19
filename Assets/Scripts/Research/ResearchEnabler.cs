using UnityEngine;
using static Oracle;

public class ResearchEnabler : MonoBehaviour
{
    [SerializeField] private GameObject panelLifetime1;
    [SerializeField] private GameObject panelLifetime2;
    [SerializeField] private GameObject panelLifetime3;
    [SerializeField] private GameObject panelLifetime4;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;


    private void Update()
    {
        panelLifetime1.SetActive(!dvid.panelLifetime1 || (dvid.panelLifetime1 && !oracle.saveSettings.hidePurchased));

        panelLifetime2.SetActive((dvid.panelLifetime1 && !dvid.panelLifetime2) ||
                                 (dvid.panelLifetime2 && !oracle.saveSettings.hidePurchased));

        panelLifetime3.SetActive((dvid.panelLifetime2 && !dvid.panelLifetime3) ||
                                 (dvid.panelLifetime3 && !oracle.saveSettings.hidePurchased));

        panelLifetime4.SetActive((dvid.panelLifetime3 && !dvid.panelLifetime4) ||
                                 (dvid.panelLifetime4 && !oracle.saveSettings.hidePurchased));
    }
}