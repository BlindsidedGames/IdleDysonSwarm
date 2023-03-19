using System;
using System.Collections;
using UnityEngine;
using static Oracle;

public class ResearchAutoBuy : MonoBehaviour
{
    [SerializeField] private AiManagerUpgrade aimu;
    [SerializeField] private AssemblyLineUpgrade alu;
    [SerializeField] private MoneyMultiUpgrade mmu;
    [SerializeField] private PanelLifetime1 pl1;
    [SerializeField] private PanelLifetime1 pl2;
    [SerializeField] private PanelLifetime1 pl3;
    [SerializeField] private PanelLifetime1 pl4;
    [SerializeField] private PlanetManagerUpgrade pmu;
    [SerializeField] private ScienceBoostUpgrade sbu;
    [SerializeField] private ServerManagerUpgrade smu;
    [SerializeField] private DataCenterManagerUpgrade dcmu;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;

    private bool ai => aimu.cost < dvid.science;
    private bool assembly => alu.cost < dvid.science;
    private bool server => smu.cost < dvid.science;
    private bool dataCenter => dcmu.cost < dvid.science;
    private bool planet => pmu.cost < dvid.science;
    private bool money => mmu.cost < dvid.science;
    private bool science => sbu.cost < dvid.science;
    private bool any => ai || assembly || server || dataCenter || planet || money || science;
    private SaveDataSettings sds => oracle.saveSettings;

    private void Start()
    {
        StartCoroutine(AutoResearchGroup(2f));
        InvokeRepeating(nameof(AutoResearchPanelLifetime), 0, 1f);
    }

    private IEnumerator AutoResearchGroup(float delaySeconds)
    {
        yield return new WaitForSeconds(delaySeconds);
        if (dvpd.infinityAutoResearch)
            while (any)
            {
                if (ai && sds.infinityAutoResearchToggleAi) aimu.PurchaseUpgrade();
                if (assembly && sds.infinityAutoResearchToggleAssembly) alu.PurchaseUpgrade();
                if (server && sds.infinityAutoResearchToggleServer) smu.PurchaseUpgrade();
                if (dataCenter && sds.infinityAutoResearchToggleDataCenter) dcmu.PurchaseUpgrade();
                if (planet && sds.infinityAutoResearchTogglePlanet) pmu.PurchaseUpgrade();
                if (money && sds.infinityAutoResearchToggleMoney) mmu.PurchaseUpgrade();
                if (science && sds.infinityAutoResearchToggleScience) sbu.PurchaseUpgrade();
                yield return null;
            }

        StartCoroutine(AutoResearchGroup(0.1f));
    }

    public static event Action<int> researchPanelLifetime;


    private void AutoResearchPanelLifetime()
    {
        if (!dvpd.infinityAutoResearch) return;
        if (!dvid.panelLifetime1 && pl1 != null) researchPanelLifetime?.Invoke(1);
        if (!dvid.panelLifetime2 && pl2 != null) researchPanelLifetime?.Invoke(2);
        if (!dvid.panelLifetime3 && pl3 != null) researchPanelLifetime?.Invoke(3);
        if (!dvid.panelLifetime4 && pl4 != null) researchPanelLifetime?.Invoke(4);
    }
}