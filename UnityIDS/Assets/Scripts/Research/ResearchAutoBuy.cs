using System;
using System.Collections;
using UnityEngine;
using static Expansion.Oracle;

namespace Research
{
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

        private bool ai => aimu.DoAutoBuy;
        private bool assembly => alu.DoAutoBuy;
        private bool server => smu.DoAutoBuy;
        private bool dataCenter => dcmu.DoAutoBuy;
        private bool planet => pmu.DoAutoBuy;
        private bool money => mmu.DoAutoBuy;
        private bool science => sbu.DoAutoBuy;
        private bool any => ai || assembly || server || dataCenter || planet || money || science;

        private void Start()
        {
            InvokeRepeating(nameof(AutoResearchPanelLifetime), 0, 1f);
        }

        private void Update()
        {
            while (any)
            {
                if (ai) aimu.AutoPurchase();
                if (assembly) alu.AutoPurchase();
                if (server) smu.AutoPurchase();
                if (dataCenter) dcmu.AutoPurchase();
                if (planet) pmu.AutoPurchase();
                if (money) mmu.AutoPurchase();
                if (science) sbu.AutoPurchase();
            }
        }

        public static event Action<int> researchPanelLifetime;


        private void AutoResearchPanelLifetime()
        {
            if (!StaticPrestigeData.infinityAutoResearch) return;
            if (!StaticInfinityData.panelLifetime1 && pl1 != null) researchPanelLifetime?.Invoke(1);
            if (!StaticInfinityData.panelLifetime2 && pl2 != null) researchPanelLifetime?.Invoke(2);
            if (!StaticInfinityData.panelLifetime3 && pl3 != null) researchPanelLifetime?.Invoke(3);
            if (!StaticInfinityData.panelLifetime4 && pl4 != null) researchPanelLifetime?.Invoke(4);
        }
    }
}