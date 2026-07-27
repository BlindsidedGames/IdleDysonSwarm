using UnityEngine;
using IdleDysonSwarm.Services;
using Systems.Simulation;
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
        private void Awake()
        {
            _gameState = ServiceLocator.Get<IGameStateService>();
            _megaService = ServiceLocator.Get<IMegaStructureService>();
            AutoBindMegaPresenters();
        }

        public void RunAutomationTick(bool forceBuyMax = false)
        {
            if (!isActiveAndEnabled) return;
            SimulationAutomationPolicy policy = forceBuyMax
                ? SimulationAutomationPolicy.ForceBuyMax
                : SimulationAutomationPolicy.PreserveConfiguredMode;
            int firstTarget = AutomationRotation.Normalize(
                oracle.saveSettings.dysonAutomationTargetIndex,
                AutomationTargetCount);
            for (int offset = 0; offset < AutomationTargetCount; offset++)
            {
                TryPurchaseTarget(
                    (firstTarget + offset) % AutomationTargetCount,
                    policy,
                    updatePresentation: !forceBuyMax);
            }

            oracle.saveSettings.dysonAutomationTargetIndex =
                AutomationRotation.Advance(
                    firstTarget,
                    AutomationTargetCount,
                    1L);
        }

        public bool WouldOfflinePurchase(DysonAnalyticalState state)
        {
            if (!isActiveAndEnabled) return false;
            return WouldPurchase(assemblyLineManager, state) ||
                   WouldPurchase(aiManager, state) ||
                   WouldPurchase(serverManager, state) ||
                   WouldPurchase(dataCenterManager, state) ||
                   WouldPurchase(planetManager, state) ||
                   WouldPurchase(
                       matrioshkaPresenter,
                       state,
                       oracle.saveSettings.infinityAutoMatrioshkaBrains) ||
                   WouldPurchase(
                       birchPresenter,
                       state,
                       oracle.saveSettings.infinityAutoBirchPlanets) ||
                   WouldPurchase(
                       galacticPresenter,
                       state,
                       oracle.saveSettings.infinityAutoGalacticBrains);
        }

        public void SkipAutomationTicks(long ticks)
        {
            if (!isActiveAndEnabled || ticks <= 0L) return;
            oracle.saveSettings.dysonAutomationTargetIndex =
                AutomationRotation.Advance(
                    oracle.saveSettings.dysonAutomationTargetIndex,
                    AutomationTargetCount,
                    ticks);
        }

        private static bool WouldPurchase(
            FacilityBuildingPresenter presenter,
            DysonAnalyticalState state)
        {
            return presenter != null &&
                   presenter.WouldOfflineAutoPurchase(
                       state.Money,
                       state.Planets);
        }

        private static bool WouldPurchase(
            MegaStructurePresenter presenter,
            DysonAnalyticalState state,
            bool toggleEnabled)
        {
            return presenter != null &&
                   presenter.WouldOfflineAutoPurchase(state, toggleEnabled);
        }

        private void TryPurchaseTarget(
            int target,
            SimulationAutomationPolicy policy,
            bool updatePresentation)
        {
            switch (target)
            {
                case 0:
                    if (assemblyLineAutoBuy)
                        assemblyLineManager.TryAutomationPurchase(
                            policy,
                            updatePresentation);
                    break;
                case 1:
                    if (aiManagerAutoBuy)
                        aiManager.TryAutomationPurchase(
                            policy,
                            updatePresentation);
                    break;
                case 2:
                    if (serverAutoBuy)
                        serverManager.TryAutomationPurchase(
                            policy,
                            updatePresentation);
                    break;
                case 3:
                    if (dataCenterAutoBuy)
                        dataCenterManager.TryAutomationPurchase(
                            policy,
                            updatePresentation);
                    break;
                case 4:
                    if (planetAutoBuy)
                        planetManager.TryAutomationPurchase(
                            policy,
                            updatePresentation);
                    break;
                case 5:
                    if (matrioshkaPresenter != null)
                        matrioshkaPresenter.TryAutomationPurchase(
                            oracle.saveSettings
                                .infinityAutoMatrioshkaBrains,
                            policy);
                    break;
                case 6:
                    if (birchPresenter != null)
                        birchPresenter.TryAutomationPurchase(
                            oracle.saveSettings
                                .infinityAutoBirchPlanets,
                            policy);
                    break;
                case 7:
                    if (galacticPresenter != null)
                        galacticPresenter.TryAutomationPurchase(
                            oracle.saveSettings
                                .infinityAutoGalacticBrains,
                            policy);
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
