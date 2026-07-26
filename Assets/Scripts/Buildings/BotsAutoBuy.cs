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

        private const int AutomationTargetCount = 8;

        private bool assemblyLineAutoBuy => assemblyLineManager != null && assemblyLineManager.DoAutoBuy;
        private bool aiManagerAutoBuy => aiManager != null && aiManager.DoAutoBuy;
        private bool serverAutoBuy => serverManager != null && serverManager.DoAutoBuy;
        private bool dataCenterAutoBuy => dataCenterManager != null && dataCenterManager.DoAutoBuy;
        private bool planetAutoBuy => planetManager != null && planetManager.DoAutoBuy;
        private bool matrioshkaAutoBuy => ShouldAutoBuyMega(matrioshkaPresenter, oracle.saveSettings.infinityAutoMatrioshkaBrains);
        private bool birchAutoBuy => ShouldAutoBuyMega(birchPresenter, oracle.saveSettings.infinityAutoBirchPlanets);
        private bool galacticAutoBuy => ShouldAutoBuyMega(galacticPresenter, oracle.saveSettings.infinityAutoGalacticBrains);
        // Rotate purchase order so no facility always buys first.
        private int autoBuyOrderIndex;

        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();
            _megaService = ServiceLocator.Get<IMegaStructureService>();
            AutoBindMegaPresenters();
        }

        public void RunAutomationTick(bool forceBuyMax = false)
        {
            if (!isActiveAndEnabled) return;
            BuyMode previousMode = oracle.saveSettings.buyMode;
            if (forceBuyMax) oracle.saveSettings.buyMode = BuyMode.BuyMax;
            try
            {
                int firstTarget = autoBuyOrderIndex;
                for (int offset = 0; offset < AutomationTargetCount; offset++)
                {
                    TryPurchaseTarget((firstTarget + offset) % AutomationTargetCount);
                }

                autoBuyOrderIndex = (autoBuyOrderIndex + 1) % AutomationTargetCount;
            }
            finally
            {
                if (forceBuyMax) oracle.saveSettings.buyMode = previousMode;
            }
        }

        private void TryPurchaseTarget(int target)
        {
            switch (target)
            {
                case 0:
                    if (assemblyLineAutoBuy) assemblyLineManager.AutoPurchase();
                    break;
                case 1:
                    if (aiManagerAutoBuy) aiManager.AutoPurchase();
                    break;
                case 2:
                    if (serverAutoBuy) serverManager.AutoPurchase();
                    break;
                case 3:
                    if (dataCenterAutoBuy) dataCenterManager.AutoPurchase();
                    break;
                case 4:
                    if (planetAutoBuy) planetManager.AutoPurchase();
                    break;
                case 5:
                    if (matrioshkaAutoBuy) matrioshkaPresenter.AutoPurchase();
                    break;
                case 6:
                    if (birchAutoBuy) birchPresenter.AutoPurchase();
                    break;
                case 7:
                    if (galacticAutoBuy) galacticPresenter.AutoPurchase();
                    break;
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
    }
}
