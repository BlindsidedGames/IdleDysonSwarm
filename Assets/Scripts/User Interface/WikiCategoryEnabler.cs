using UnityEngine;
using static Oracle;


public class WikiCategoryEnabler : MonoBehaviour
{
    [SerializeField] private GameObject realityWikiSection;
    [SerializeField] private GameObject prestigePlusWikiSection;
    [SerializeField] private GameObject secretsOfTheUniverse;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private void Update()
    {
        realityWikiSection.SetActive(dvpd.infinityPoints >= 42 || oracle.saveSettings.prestigePlus.points >= 1);
        prestigePlusWikiSection.SetActive(pp.points >= 1);
        secretsOfTheUniverse.SetActive(pp.secrets > 0);
    }
}