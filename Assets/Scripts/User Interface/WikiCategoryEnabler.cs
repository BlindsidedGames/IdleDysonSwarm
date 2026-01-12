using UnityEngine;
using static Expansion.Oracle;


public class WikiCategoryEnabler : MonoBehaviour
{
    [SerializeField] private GameObject realityWikiSection;
    [SerializeField] private GameObject prestigePlusWikiSection;
    [SerializeField] private GameObject secretsOfTheUniverse;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private void Update()
    {
        realityWikiSection.SetActive(prestigeData.infinityPoints >= 42 || oracle.saveSettings.prestigePlus.points >= 1);
        prestigePlusWikiSection.SetActive(prestigePlus.points >= 1);
        secretsOfTheUniverse.SetActive(prestigePlus.secrets > 0);
    }
}
