using UnityEngine;
using static Oracle;

public class BotPanelManager : MonoBehaviour
{
    [SerializeField] private GameObject clickPanel;

    [SerializeField] private GameObject internPanel;
    [SerializeField] private GameObject managerPanel;
    [SerializeField] private GameObject serverPanel;
    [SerializeField] private GameObject dataCenterPanel;
    [SerializeField] private GameObject planetPanel;

    [SerializeField] private GameObject questionmarkPanel;

    [SerializeField] private SlicedFilledImage assemblyLines;
    [SerializeField] private SlicedFilledImage managers;
    [SerializeField] private SlicedFilledImage servers;
    [SerializeField] private SlicedFilledImage dataCenters;
    [SerializeField] private SlicedFilledImage planets;

    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;

    private void Update()
    {
        internPanel.SetActive(dvid.bots >= 10 || dvid.assemblyLines[0] + dvid.assemblyLines[1] > 0);
        var clickPanelActivator = !(dvid.assemblyLines[0] + dvid.assemblyLines[1] >= 10) || !(dvid.managers[1] >= 1);
        managerPanel.SetActive(dvid.assemblyLines[1] >= 5 || dvid.managers[0] + dvid.managers[1] > 0);
        serverPanel.SetActive(dvid.managers[1] >= 1 || dvid.servers[0] + dvid.servers[1] > 0);
        var serversGreaterThanOne = dvid.servers[0] + dvid.servers[1] >= 1;
        dataCenterPanel.SetActive(serversGreaterThanOne || dvid.dataCenters[0] + dvid.dataCenters[1] > 0);
        var dataCentersGreaterThanOne = dvid.dataCenters[0] + dvid.dataCenters[1] >= 1;
        planetPanel.SetActive(dataCentersGreaterThanOne || dvid.planets[0] + dvid.planets[1] > 0);
        questionmarkPanel.SetActive(!dataCentersGreaterThanOne && dvid.planets[0] + dvid.planets[1] == 0);
        clickPanel.SetActive((clickPanelActivator && !dataCentersGreaterThanOne) ||
                             oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.manualLabour);

        assemblyLines.fillAmount = dvid.assemblyLineProduction >= 5 ? 1 : (float)(dvid.assemblyLines[0] % 1);
        managers.fillAmount = dvid.managerProduction >= 5 ? 1 : (float)(dvid.managers[0] % 1);
        servers.fillAmount =
            dvid.serverProduction + dvid.rudimentrySingularityProduction >= 5 ? 1 : (float)(dvid.servers[0] % 1);
        dataCenters.fillAmount = dvid.dataCenterProduction + dvid.pocketDimensionsProduction >= 5
            ? 1
            : (float)(dvid.dataCenters[0] % 1);
        planets.fillAmount = dvid.scientificPlanetsProduction + dvid.stellarSacrificesProduction +
            dvid.planetAssemblyProduction + dvid.shellWorldsProduction >= 5
                ? 1
                : (float)(dvid.planets[0] % 1);
    }
}