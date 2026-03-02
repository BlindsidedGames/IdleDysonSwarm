using UnityEngine;
using IdleDysonSwarm.Services;
using static Expansion.Oracle;

namespace Buildings
{
    /// <summary>
    /// Runs auto-purchase loops for facilities and mega-structures when automation toggles are enabled.
    /// </summary>
    public class BotsAutoBuy : MonoBehaviour
    {
        [SerializeField] private FacilityBuildingPresenter assemblyLineManager;
        [SerializeField] private FacilityBuildingPresenter aiManager;
        [SerializeField] private FacilityBuildingPresenter serverManager;
        [SerializeField] private FacilityBuildingPresenter dataCenterManager;
        [SerializeField] private FacilityBuildingPresenter planetManager;
        [SerializeField] private MegaStructurePresenter matrioshkaPresenter;
        [SerializeField] private MegaStructurePresenter birchPresenter;
        [SerializeField] private MegaStructurePresenter galacticPresenter;

        private IGameStateService _gameState;
        private IMegaStructureService _megaService;

        private bool assemblyLineAutoBuy => assemblyLineManager.DoAutoBuy;
        private bool aiManagerAutoBuy => aiManager.DoAutoBuy;
        private bool serverAutoBuy => serverManager.DoAutoBuy;
        private bool dataCenterAutoBuy => dataCenterManager.DoAutoBuy;
        private bool planetAutoBuy => planetManager.DoAutoBuy;
        private bool matrioshkaAutoBuy => ShouldAutoBuyMega(matrioshkaPresenter, oracle.saveSettings.infinityAutoMatrioshkaBrains);
        private bool birchAutoBuy => ShouldAutoBuyMega(birchPresenter, oracle.saveSettings.infinityAutoBirchPlanets);
        private bool galacticAutoBuy => ShouldAutoBuyMega(galacticPresenter, oracle.saveSettings.infinityAutoGalacticBrains);
        private bool anyAutoBuy => assemblyLineAutoBuy || aiManagerAutoBuy || serverAutoBuy || dataCenterAutoBuy ||
                                   planetAutoBuy || matrioshkaAutoBuy || birchAutoBuy || galacticAutoBuy;
        // Rotate purchase order so no facility always buys first.
        private int autoBuyOrderIndex;

        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();
            _megaService = ServiceLocator.Get<IMegaStructureService>();
            AutoBindMegaPresenters();
        }

        private void Update()
        {
            while (anyAutoBuy)
            {
                switch (autoBuyOrderIndex)
                {
                    case 0:
                        if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (birchAutoBuy) birchPresenter.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        autoBuyOrderIndex = 1;
                        break;
                    case 1:
                        if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (birchAutoBuy) birchPresenter.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        autoBuyOrderIndex = 2;
                        break;
                    case 2:
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (birchAutoBuy) birchPresenter.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        autoBuyOrderIndex = 3;
                        break;
                    case 3:
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (birchAutoBuy) birchPresenter.AutoPurchase();
                        autoBuyOrderIndex = 4;
                        break;
                    case 4:
                        if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                        if (planetAutoBuy) planetManager.AutoPurchase();
                        if (birchAutoBuy) birchPresenter.AutoPurchase();
                        if (serverAutoBuy) serverManager.AutoPurchase();
                        if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                        if (aiManagerAutoBuy) aiManager.AutoPurchase();
                        if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                        if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                        autoBuyOrderIndex = 0;
                        break;
                }
            }
        }

        private bool ShouldAutoBuyMega(MegaStructurePresenter presenter, bool toggleEnabled)
        {
            if (presenter == null || _gameState == null || _megaService == null || !_gameState.PrestigeData.infinityAutoBots)
            {
                return false;
            }

            if (!toggleEnabled)
            {
                return false;
            }

            string facilityId = presenter.FacilityId;
            if (string.IsNullOrEmpty(facilityId))
            {
                return false;
            }

            int numberToBuy = presenter.GetAutoPurchaseAmount();
            return numberToBuy > 0 && _megaService.CanAfford(facilityId, numberToBuy);
        }

        private void AutoBindMegaPresenters()
        {
            if (matrioshkaPresenter != null && birchPresenter != null && galacticPresenter != null)
            {
                return;
            }

            MegaStructurePresenter[] presenters = GetComponentsInChildren<MegaStructurePresenter>(true);
            if (presenters == null || presenters.Length == 0)
            {
                presenters = Object.FindObjectsByType<MegaStructurePresenter>(
                    FindObjectsInactive.Include,
                    FindObjectsSortMode.None);
            }

            for (int i = 0; i < presenters.Length; i++)
            {
                MegaStructurePresenter presenter = presenters[i];
                if (presenter == null) continue;

                switch (presenter.FacilityId)
                {
                    case "matrioshka_brains":
                        matrioshkaPresenter ??= presenter;
                        break;
                    case "birch_planets":
                        birchPresenter ??= presenter;
                        break;
                    case "galactic_brains":
                        galacticPresenter ??= presenter;
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
