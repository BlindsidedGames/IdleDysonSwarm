using System;
using GameData;
using Systems.Simulation;
using UnityEngine;
using static Expansion.Oracle;

/*
 * ResearchAutoBuy
 * Purpose: Runs iterative auto-purchase for scene-wired research presenters while infinity auto-research is enabled.
 * Runs: Runtime.
 * Primary entry points: Awake(), OnEnable(), Update().
 * Owns vs delegates: Owns presenter discovery + iteration cap; delegates per-research affordability and purchase logic
 * to ResearchPresenter.
 *
 * Interacts with:
 * - Assets/Scripts/Research/ResearchPresenter.cs
 * - Assets/Scripts/Data/ResearchIdMap.cs
 * - Assets/Scenes/Game.unity (scene presenter wiring)
 *
 * Change notes:
 * - Hidden runtime presenter creation is intentionally removed; missing scene wiring now logs a warning instead.
 * - RequiredSceneMegaResearchIds must stay aligned with mega research cards/presenters in Game.unity.
 */
namespace Research
{
    /// <summary>
    /// Purpose (runtime): Runs infinity research auto-buy loops against scene-wired <see cref="ResearchPresenter"/> instances.
    /// Primary entry points: Unity <c>Awake</c>, <c>OnEnable</c>, and <c>Update</c>.
    /// Owns vs delegates: Owns presenter discovery + iteration limits; delegates purchase rules to each presenter.
    /// Interacts with: calls <see cref="ResearchPresenter.TryAutoPurchase"/> and reads Oracle auto-research flags.
    /// Change notes: adding/removing expected presenter IDs must stay aligned with Game scene wiring and ResearchIdMap IDs.
    /// </summary>
    public class ResearchAutoBuy : MonoBehaviour
    {
        private static readonly string[] RequiredSceneMegaResearchIds =
        {
            ResearchIdMap.MatrioshkaBrainsUpgrade,
            ResearchIdMap.BirchPlanetsUpgrade,
            ResearchIdMap.GalacticBrainsUpgrade
        };

        private ResearchPresenter[] presenters;
        private bool _hasWarnedMissingScenePresenters;
        private int _firstPresenterIndex;
        private void Awake()
        {
            RefreshPresenters();
            WarnIfMissingRequiredMegaPresenters();
        }

        private void OnEnable()
        {
            RefreshPresenters();
            WarnIfMissingRequiredMegaPresenters();
        }

        public void RunAutomationTick(bool forceBuyMax = false)
        {
            if (!isActiveAndEnabled) return;
            if (StaticPrestigeData == null || !StaticPrestigeData.infinityAutoResearch) return;

            BuyMode previousMode = oracle.saveSettings.researchBuyMode;
            if (forceBuyMax) oracle.saveSettings.researchBuyMode = BuyMode.BuyMax;
            try
            {
                if (presenters == null || presenters.Length == 0)
                {
                    RefreshPresenters();
                }

                if (presenters.Length == 0)
                {
                    return;
                }

                int first = _firstPresenterIndex % presenters.Length;
                for (int offset = 0; offset < presenters.Length; offset++)
                {
                    ResearchPresenter presenter = presenters[(first + offset) % presenters.Length];
                    if (presenter != null)
                        presenter.TryAutoPurchase(updatePresentation: !forceBuyMax);
                }

                _firstPresenterIndex = (first + 1) % presenters.Length;
            }
            finally
            {
                if (forceBuyMax) oracle.saveSettings.researchBuyMode = previousMode;
            }
        }

        public bool WouldOfflinePurchase(DysonAnalyticalState state)
        {
            if (!isActiveAndEnabled ||
                StaticPrestigeData == null ||
                !StaticPrestigeData.infinityAutoResearch)
            {
                return false;
            }

            if (presenters == null || presenters.Length == 0)
                RefreshPresenters();
            for (int i = 0; i < presenters.Length; i++)
            {
                if (presenters[i] != null &&
                    presenters[i].WouldOfflineAutoPurchase(state))
                {
                    return true;
                }
            }
            return false;
        }

        public void SkipAutomationTicks(long ticks)
        {
            if (!isActiveAndEnabled ||
                StaticPrestigeData == null ||
                !StaticPrestigeData.infinityAutoResearch ||
                ticks <= 0L)
            {
                return;
            }

            if (presenters == null || presenters.Length == 0)
                RefreshPresenters();
            if (presenters.Length == 0) return;
            int offset = (int)(ticks % presenters.Length);
            _firstPresenterIndex =
                (_firstPresenterIndex + offset) % presenters.Length;
        }

        private void RefreshPresenters()
        {
            presenters = FindObjectsByType<ResearchPresenter>(FindObjectsInactive.Include,
                FindObjectsSortMode.None);
            Array.Sort(
                presenters,
                static (left, right) => string.CompareOrdinal(
                    left != null ? left.ResearchIdValue : string.Empty,
                    right != null ? right.ResearchIdValue : string.Empty));
        }

        private void WarnIfMissingRequiredMegaPresenters()
        {
            if (_hasWarnedMissingScenePresenters || presenters == null)
            {
                return;
            }

            string missing = string.Empty;
            int missingCount = 0;

            for (int i = 0; i < RequiredSceneMegaResearchIds.Length; i++)
            {
                string researchId = RequiredSceneMegaResearchIds[i];
                if (HasPresenter(presenters, researchId))
                {
                    continue;
                }

                if (missingCount > 0)
                {
                    missing += ", ";
                }

                missing += researchId;
                missingCount++;
            }

            if (missingCount <= 0)
            {
                return;
            }

            _hasWarnedMissingScenePresenters = true;
            Debug.LogWarning(
                $"[ResearchAutoBuy] Missing scene ResearchPresenter wiring for mega research IDs: {missing}. " +
                "Automation will only run for presenters that exist in scene; hidden fallback creation has been removed.");
        }

        private static bool HasPresenter(ResearchPresenter[] existing, string researchId)
        {
            if (existing == null || string.IsNullOrEmpty(researchId))
            {
                return false;
            }

            for (int i = 0; i < existing.Length; i++)
            {
                ResearchPresenter presenter = existing[i];
                if (presenter == null)
                {
                    continue;
                }

                if (string.Equals(presenter.ResearchIdValue, researchId, System.StringComparison.Ordinal))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
