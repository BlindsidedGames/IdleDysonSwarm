using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static Oracle;

public class StoryManager : MonoBehaviour
{
    [SerializeField] private GameManager gameManager;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    [SerializeField] private GameObject avocatoButton;

    [SerializeField] private GameObject C1;
    [SerializeField] private GameObject C1C1;
    [SerializeField] private GameObject C1C2;
    [SerializeField] private GameObject C1C3;
    [SerializeField] private GameObject C2;
    [SerializeField] private GameObject C2C1;
    [SerializeField] private GameObject C2C2;
    [SerializeField] private GameObject C2C3;
    [SerializeField] private GameObject C3;
    [SerializeField] private GameObject C3C1;
    [SerializeField] private GameObject C3C2;

    [SerializeField] private GameObject C4;
    [SerializeField] private GameObject C4C1;
    [SerializeField] private GameObject C4C2;
    [SerializeField] private GameObject C4C3;
    [SerializeField] private GameObject C4C4;
    [SerializeField] private GameObject C4C5;
    [SerializeField] private GameObject C4C6;
    [SerializeField] private GameObject C4C7;
    [SerializeField] private GameObject C4C8;
    [SerializeField] private GameObject C4C9;
    [SerializeField] private GameObject C4C10;

    [SerializeField] private GameObject C5;
    [SerializeField] private GameObject C5C1;
    [SerializeField] private GameObject C5C2;
    [SerializeField] private GameObject C5C3;
    [SerializeField] private GameObject C5C4;
    [SerializeField] private GameObject C5C5;

    [SerializeField] private GameObject C6;
    [SerializeField] private GameObject C6C1;
    [SerializeField] private GameObject C6C2;
    [SerializeField] private GameObject C6C3;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;

    private void Update()
    {
        var infinity = dvpd.infinityPoints >= 1;
        var infinityCount = dvpd.infinityPoints;
        var leap = oracle.saveSettings.prestigePlus.points >= 1;
        var either = oracle.saveSettings.prestigePlus.points >= 1 || dvpd.infinityPoints >= 1;
        C1C2.SetActive(dvid.goalSetter >= 1 || either);
        C1C3.SetActive(dvid.goalSetter >= 1 || either);

        C2.SetActive(dvid.managers[1] >= 1 || either);
        C2C1.SetActive(dvid.managers[1] >= 1 || either);
        C2C2.SetActive(dvid.servers[1] >= 1 || either);
        C2C3.SetActive(gameManager.StarsSurrounded() >= 1 || either);

        C3.SetActive(gameManager.GalaxiesEngulfed() >= 1 || either);
        C3C1.SetActive(gameManager.GalaxiesEngulfed() >= 1 || either);
        C3C2.SetActive(infinity || either);

        C4.SetActive(infinity || either);
        C4C1.SetActive(infinity || either);
        C4C2.SetActive(infinity || either);
        avocatoButton.SetActive(infinityCount >= 2 || leap);
        C4C3.SetActive(infinityCount >= 2 || leap);
        C4C4.SetActive(infinityCount >= 3 || leap);
        C4C5.SetActive(infinityCount >= 4 || leap);
        C4C6.SetActive(infinityCount >= 5 || leap);
        C4C7.SetActive(infinityCount >= 6 || leap);
        C4C8.SetActive(infinityCount >= 7 || leap);
        C4C9.SetActive(infinityCount >= 8 || leap);
        C4C10.SetActive(infinityCount >= 9 || leap);

        C5.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);
        C5C1.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);
        C5C2.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);
        C5C3.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);
        C5C4.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);
        C5C5.SetActive(dvpd.secretsOfTheUniverse >= 27 || leap);

        C6.SetActive(pp.breakTheLoop);
        C6C1.SetActive(pp.breakTheLoop);
        C6C2.SetActive(pp.quantumEntanglement);
        C6C3.SetActive(pp.breakTheLoop && pp.quantumEntanglement);
    }
}