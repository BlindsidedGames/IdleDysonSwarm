using MPUIKIT;
using UnityEngine;
using static Expansion.Oracle;

public class BotPanelManager : MonoBehaviour
{
    [SerializeField] private GameObject clickPanel;

    [SerializeField] private GameObject internPanel;
    [SerializeField] private GameObject managerPanel;
    [SerializeField] private GameObject serverPanel;
    [SerializeField] private GameObject dataCenterPanel;
    [SerializeField] private GameObject planetPanel;

    [SerializeField] private GameObject questionmarkPanel;

    [SerializeField] private MPImage assemblyLines;
    [SerializeField] private MPImage managers;
    [SerializeField] private MPImage servers;
    [SerializeField] private MPImage dataCenters;
    [SerializeField] private MPImage planets;

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void Update()
    {
        internPanel.SetActive(infinityData.bots >= 10 || infinityData.assemblyLines[0] + infinityData.assemblyLines[1] > 0);
        bool isClickPanelActive = !(infinityData.assemblyLines[0] + infinityData.assemblyLines[1] >= 10) || !(infinityData.managers[1] >= 1);
        managerPanel.SetActive(infinityData.assemblyLines[1] >= 5 || infinityData.managers[0] + infinityData.managers[1] > 0);
        serverPanel.SetActive(infinityData.managers[1] >= 1 || infinityData.servers[0] + infinityData.servers[1] > 0);
        bool hasServers = infinityData.servers[0] + infinityData.servers[1] >= 1;
        dataCenterPanel.SetActive(hasServers || infinityData.dataCenters[0] + infinityData.dataCenters[1] > 0);
        bool hasDataCenters = infinityData.dataCenters[0] + infinityData.dataCenters[1] >= 1;
        planetPanel.SetActive(hasDataCenters || infinityData.planets[0] + infinityData.planets[1] > 0);
        questionmarkPanel.SetActive(!hasDataCenters && infinityData.planets[0] + infinityData.planets[1] == 0);
        clickPanel.SetActive(isClickPanelActive && !hasDataCenters || skillTreeData.manualLabour);

        assemblyLines.fillAmount = infinityData.assemblyLineProduction >= 5 ? 1 : (float)(infinityData.assemblyLines[0] % 1);
        managers.fillAmount = infinityData.managerProduction >= 5 ? 1 : (float)(infinityData.managers[0] % 1);
        servers.fillAmount =
            infinityData.serverProduction + infinityData.rudimentrySingularityProduction >= 5 ? 1 : (float)(infinityData.servers[0] % 1);
        dataCenters.fillAmount = infinityData.dataCenterProduction + infinityData.pocketDimensionsProduction >= 5
            ? 1
            : (float)(infinityData.dataCenters[0] % 1);
        planets.fillAmount = infinityData.scientificPlanetsProduction + infinityData.stellarSacrificesProduction +
            infinityData.planetAssemblyProduction + infinityData.shellWorldsProduction >= 5
                ? 1
                : (float)(infinityData.planets[0] % 1);
    }
}
