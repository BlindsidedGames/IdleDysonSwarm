using System;
using System.Collections;
using UnityEngine;
using static Expansion.Oracle;

namespace Buildings
{
    public class BotsAutoBuy : MonoBehaviour
    {
        [SerializeField] private AssemblyLineManager imu;
        [SerializeField] private ManagerManager mmu;
        [SerializeField] private ServerManager smu;
        [SerializeField] private DataCenterManager dcmu;
        [SerializeField] private PlanetManager pmu;

        private bool im => imu.DoAutoBuy;
        private bool mm => mmu.DoAutoBuy;
        private bool sm => smu.DoAutoBuy;
        private bool dc => dcmu.DoAutoBuy;
        private bool pm => pmu.DoAutoBuy;
        private bool any => im || mm || sm || dc || pm;
        private int priority;

        private void Update()
        {
            while (any)
            {
                switch (priority)
                {
                    case 0:
                        if (pm) pmu.AutoPurchase();
                        if (sm) smu.AutoPurchase();
                        if (mm) mmu.AutoPurchase();
                        if (dc) dcmu.AutoPurchase();
                        if (im) imu.AutoPurchase();
                        priority = 1;
                        break;
                    case 1:
                        if (sm) smu.AutoPurchase();
                        if (mm) mmu.AutoPurchase();
                        if (dc) dcmu.AutoPurchase();
                        if (im) imu.AutoPurchase();
                        if (pm) pmu.AutoPurchase();
                        priority = 2;
                        break;
                    case 2:
                        if (mm) mmu.AutoPurchase();
                        if (dc) dcmu.AutoPurchase();
                        if (im) imu.AutoPurchase();
                        if (pm) pmu.AutoPurchase();
                        if (sm) smu.AutoPurchase();
                        priority = 3;
                        break;
                    case 3:
                        if (dc) dcmu.AutoPurchase();
                        if (im) imu.AutoPurchase();
                        if (pm) pmu.AutoPurchase();
                        if (sm) smu.AutoPurchase();
                        if (mm) mmu.AutoPurchase();
                        priority = 4;
                        break;
                    case 4:
                        if (im) imu.AutoPurchase();
                        if (pm) pmu.AutoPurchase();
                        if (sm) smu.AutoPurchase();
                        if (mm) mmu.AutoPurchase();
                        if (dc) dcmu.AutoPurchase();
                        priority = 0;
                        break;
                }
            }
        }


        /*private IEnumerator AutoBotsGroup(float delaySeconds)
        {
            yield return new WaitForSeconds(delaySeconds);
            if (StaticPrestigeData.infinityAutoBots)
                while (any)
                {
                    if (pm && sds.infinityAutoPlanets) pmu.AutoPurchase();
                    if (sm && sds.infinityAutoServers) smu.AutoPurchase();
                    if (mm && sds.infinityAutoManagers) mmu.AutoPurchase();
                    if (dc && sds.infinityAutoDataCenters) dcmu.AutoPurchase();
                    if (im && sds.infinityAutoAssembly) imu.AutoPurchase();
                    yield return null;
                }

            StartCoroutine(AutoBotsGroup(0.1f));
        }*/
    }
}