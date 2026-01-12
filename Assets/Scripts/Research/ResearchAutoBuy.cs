using UnityEngine;
using static Expansion.Oracle;

namespace Research
{
    public class ResearchAutoBuy : MonoBehaviour
    {
        private const int MaxIterationsPerUpdate = 100;
        private ResearchPresenter[] presenters;

        private void Awake()
        {
            RefreshPresenters();
        }

        private void OnEnable()
        {
            RefreshPresenters();
        }

        private void Update()
        {
            if (!StaticPrestigeData.infinityAutoResearch) return;

            if (presenters == null || presenters.Length == 0)
            {
                RefreshPresenters();
            }

            bool purchased;
            int iterations = 0;
            do
            {
                purchased = false;
                for (int i = 0; i < presenters.Length; i++)
                {
                    ResearchPresenter presenter = presenters[i];
                    if (presenter == null) continue;
                    if (presenter.TryAutoPurchase())
                    {
                        purchased = true;
                    }
                }

                iterations++;
            } while (purchased && iterations < MaxIterationsPerUpdate);
        }

        private void RefreshPresenters()
        {
            presenters = FindObjectsByType<ResearchPresenter>(FindObjectsInactive.Include,
                FindObjectsSortMode.None);
        }
    }
}
