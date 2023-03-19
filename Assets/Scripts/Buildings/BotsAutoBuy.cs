using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using static Oracle;

public class BotsAutoBuy : MonoBehaviour
{
    [SerializeField] private AssemblyLineManager imu;
    [SerializeField] private ManagerManager mmu;
    [SerializeField] private ServerManager smu;
    [SerializeField] private DataCenterManager dcmu;
    [SerializeField] private PlanetManager pmu;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private SaveDataSettings sds => oracle.saveSettings;

    private void Start()
    {
        StartCoroutine(AutoBotsGroup(2f));
    }

    private bool im => imu.cost < dvid.money;
    private bool mm => mmu.cost < dvid.money;
    private bool sm => smu.cost < dvid.money;
    private bool dc => dcmu.cost < dvid.money;
    private bool pm => pmu.cost < dvid.money;
    private bool any => im || mm || sm || dc || pm;


    private IEnumerator AutoBotsGroup(float delaySeconds)
    {
        yield return new WaitForSeconds(delaySeconds);
        if (dvpd.infinityAutoBots)
            while (any)
            {
                if (pm && sds.infinityAutoPlanets) pmu.PurchasePlanet();
                if (sm && sds.infinityAutoServers) smu.PurchaseServer();
                if (mm && sds.infinityAutoManagers) mmu.PurchaseManager();
                if (dc && sds.infinityAutoDataCenters) dcmu.PurchaseDataCenter();
                if (im && sds.infinityAutoAssembly) imu.PurchaseIntern();
                yield return null;
            }

        StartCoroutine(AutoBotsGroup(0.1f));
    }
}