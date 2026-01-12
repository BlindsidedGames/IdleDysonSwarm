using UnityEngine;

namespace Buildings
{
    public class BotsAutoBuy : MonoBehaviour
    {
        [SerializeField] private FacilityBuildingPresenter assemblyLineManager;
        [SerializeField] private FacilityBuildingPresenter aiManager;
        [SerializeField] private FacilityBuildingPresenter serverManager;
        [SerializeField] private FacilityBuildingPresenter dataCenterManager;
        [SerializeField] private FacilityBuildingPresenter planetManager;

        private bool assemblyLineAutoBuy => assemblyLineManager.DoAutoBuy;
        private bool aiManagerAutoBuy => aiManager.DoAutoBuy;
        private bool serverAutoBuy => serverManager.DoAutoBuy;
        private bool dataCenterAutoBuy => dataCenterManager.DoAutoBuy;
        private bool planetAutoBuy => planetManager.DoAutoBuy;
        private bool anyAutoBuy => assemblyLineAutoBuy || aiManagerAutoBuy || serverAutoBuy || dataCenterAutoBuy ||
                                   planetAutoBuy;
        // Rotate purchase order so no facility always buys first.
        private int autoBuyOrderIndex;

        private void Update()
        {
            while (anyAutoBuy)
            {
                switch (autoBuyOrderIndex)
                {
                    case 0:
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        autoBuyOrderIndex = 1;
                        break;
                    case 1:
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        autoBuyOrderIndex = 2;
                        break;
                    case 2:
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        autoBuyOrderIndex = 3;
                        break;
                    case 3:
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        autoBuyOrderIndex = 4;
                        break;
                    case 4:
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        autoBuyOrderIndex = 0;
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
