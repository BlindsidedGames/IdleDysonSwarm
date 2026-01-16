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

    [Header("Mega-Structures")]
    [SerializeField] private GameObject matrioshkaBrainsPanel;
    [SerializeField] private GameObject birchPlanetsPanel;
    [SerializeField] private GameObject galacticBrainsPanel;

    [SerializeField] private MPImage assemblyLines;
    [SerializeField] private MPImage managers;
    [SerializeField] private MPImage servers;
    [SerializeField] private MPImage dataCenters;
    [SerializeField] private MPImage planets;

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;

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
        clickPanel.SetActive(isClickPanelActive && !hasDataCenters || skillTreeData.manualLabour);

        // Mega-structure visibility and questionmark panel
        UpdateMegaStructureVisibility(hasDataCenters);

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

    private void UpdateMegaStructureVisibility(bool hasDataCenters)
    {
        bool hasQuantumReset = prestigePlus.points >= 1;
        double totalPlanets = infinityData.planets[0] + infinityData.planets[1];
        double totalMatrioshka = infinityData.matrioshkaBrains[0] + infinityData.matrioshkaBrains[1];
        double totalBirch = infinityData.birchPlanets[0] + infinityData.birchPlanets[1];
        double totalGalactic = infinityData.galacticBrains[0] + infinityData.galacticBrains[1];

        bool matrioshkaUnlocked = prestigeData.unlockedMatrioshkaBrains;
        bool birchUnlocked = prestigeData.unlockedBirchPlanets;
        bool galacticUnlocked = prestigeData.unlockedGalacticBrains;

        // Show panels when:
        // 1. You have at least one of that mega-structure, OR
        // 2. You have the unlock AND the prerequisite facility
        bool showMatrioshka = totalMatrioshka > 0 || (matrioshkaUnlocked && totalPlanets > 0);
        bool showBirch = totalBirch > 0 || (birchUnlocked && totalMatrioshka > 0);
        bool showGalactic = totalGalactic > 0 || (galacticUnlocked && totalBirch > 0);

        if (matrioshkaBrainsPanel != null)
            matrioshkaBrainsPanel.SetActive(showMatrioshka);
        if (birchPlanetsPanel != null)
            birchPlanetsPanel.SetActive(showBirch);
        if (galacticBrainsPanel != null)
            galacticBrainsPanel.SetActive(showGalactic);

        // Simplified ??? logic:
        // - Pre-quantum: Show unless planets are visible
        // - Post-quantum: Show unless galactic brains are visible
        bool planetsVisible = planetPanel != null && planetPanel.activeSelf;
        bool showQuestion = hasQuantumReset ? !showGalactic : !planetsVisible;

        questionmarkPanel.SetActive(showQuestion);
    }
}
