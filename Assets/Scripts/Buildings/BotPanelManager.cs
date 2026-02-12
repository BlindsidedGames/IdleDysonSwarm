using Blindsided.ProceduralUIImage;
using UnityEngine;
using static Expansion.Oracle;

/// <summary>
/// BotPanelManager
/// Runtime: yes (scene UI).
///
/// Purpose:
/// Controls visibility and progress bar presentation for the bot/facility panels (including mega-structures).
/// Progress bars are driven by facility production rates and "in-progress" fractional counts stored in
/// <see cref="DysonVerseInfinityData"/>.
///
/// Primary entry points:
/// - <see cref="Update"/>: toggles panel visibility and updates progress bars each frame.
///
/// Interacts with:
/// - Expansion.Oracle (oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData et al)
/// - <see cref="ProgressBarFlickerManager"/> (solid-vs-progressing bar rule)
/// - Blindsided.ProceduralUIImage.ProceduralUIImage (fillAmount)
///
/// Change notes:
/// - Serialized references (panels, images, progress bar roots) must be wired in the relevant prefab/scene.
/// - If you change which production rate feeds a bar, also update the matching "toggle off when not producing"
///   condition so bars don't appear dead.
/// </summary>
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

    [SerializeField] private ProceduralUIImage assemblyLines;
    [SerializeField] private ProceduralUIImage managers;
    [SerializeField] private ProceduralUIImage servers;
    [SerializeField] private ProceduralUIImage dataCenters;
    [SerializeField] private ProceduralUIImage planets;

    [Header("Progress Bar Roots (Optional)")]
    [Tooltip("Optional root GameObject to toggle the Assembly Lines progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject assemblyLinesProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Managers progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject managersProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Servers progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject serversProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Data Centers progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject dataCentersProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Planets progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject planetsProgressBarRoot;

    [Header("Mega-Structure Fill Bars")]
    [Tooltip("Fill bar for Matrioshka Brains 'in-progress' production.")]
    [SerializeField] private ProceduralUIImage matrioshkaBrainsFill;
    [Tooltip("Fill bar for Birch Planets 'in-progress' production.")]
    [SerializeField] private ProceduralUIImage birchPlanetsFill;
    [Tooltip("Fill bar for Galactic Brains (if you have a bar for it).")]
    [SerializeField] private ProceduralUIImage galacticBrainsFill;

    [Header("Mega-Structure Progress Bar Roots (Optional)")]
    [Tooltip("Optional root GameObject to toggle the Matrioshka Brains progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject matrioshkaBrainsProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Birch Planets progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject birchPlanetsProgressBarRoot;
    [Tooltip("Optional root GameObject to toggle the Galactic Brains progress bar on/off when nothing is producing it.")]
    [SerializeField] private GameObject galacticBrainsProgressBarRoot;

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

        // Each bar shows what that facility is PRODUCING (not how it's being produced).
        // Assembly Lines → producing Bots
        SetFacilityProgressBar(
            assemblyLines,
            assemblyLinesProgressBarRoot,
            infinityData.botProduction,
            infinityData.bots);

        // AI Managers → producing Assembly Lines
        SetFacilityProgressBar(
            managers,
            managersProgressBarRoot,
            infinityData.assemblyLineProduction,
            infinityData.assemblyLines[0]);

        // Servers → producing AI Managers
        SetFacilityProgressBar(
            servers,
            serversProgressBarRoot,
            infinityData.managerProduction,
            infinityData.managers[0]);

        // Data Centers → producing Servers
        SetFacilityProgressBar(
            dataCenters,
            dataCentersProgressBarRoot,
            infinityData.serverProduction + infinityData.rudimentrySingularityProduction,
            infinityData.servers[0]);

        // Planets → producing Data Centers
        SetFacilityProgressBar(
            planets,
            planetsProgressBarRoot,
            infinityData.dataCenterProduction + infinityData.pocketDimensionsProduction,
            infinityData.dataCenters[0]);

        // Mega-structure bars also show what each facility is producing (one tier down).
        // Matrioshka Brains → producing Planets
        SetFacilityProgressBar(
            matrioshkaBrainsFill,
            matrioshkaBrainsProgressBarRoot,
            infinityData.matrioshkaBrainPlanetProduction,
            infinityData.planets[0]);

        // Birch Planets → producing Matrioshka Brains
        SetFacilityProgressBar(
            birchPlanetsFill,
            birchPlanetsProgressBarRoot,
            infinityData.birchPlanetMatrioshkaProduction,
            infinityData.matrioshkaBrains[0]);

        // Galactic Brains → producing Birch Planets
        SetFacilityProgressBar(
            galacticBrainsFill,
            galacticBrainsProgressBarRoot,
            infinityData.galacticBrainBirchProduction,
            infinityData.birchPlanets[0]);
    }

    private static void SetFacilityProgressBar(
        ProceduralUIImage fillImage,
        GameObject progressBarRoot,
        double productionPerSecond,
        double runningCountWithFraction)
    {
        if (fillImage == null)
            return;

        bool hasProduction = productionPerSecond > 0;
        if (progressBarRoot != null)
            progressBarRoot.SetActive(hasProduction);

        if (!hasProduction)
        {
            // Avoid leaving stale fill visible if the root isn't wired or is shared.
            fillImage.fillAmount = 0;
            return;
        }

        fillImage.fillAmount = ProgressBarFlickerManager.ComputeFillAmount(productionPerSecond, runningCountWithFraction);
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
