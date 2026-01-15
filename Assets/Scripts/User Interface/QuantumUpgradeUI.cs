using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;


public class QuantumUpgradeUI : MonoBehaviour
{
    [SerializeField] private TMP_Text pointsText;
    [SerializeField] private TMP_Text influenceText;
    [SerializeField] private TMP_Text cashText;
    [SerializeField] private TMP_Text scienceText;
    [SerializeField] private TMP_Text secretsTitleText;
    [SerializeField] private TMP_Text divisionTitleText;
    [SerializeField] private TMP_Text prestigeButtonText;
    [SerializeField] private Button multiTaskingButton;
    [SerializeField] private Button doubleIpButton;
    [SerializeField] private Button breakTheLoopButton;
    [SerializeField] private Button quantumEntanglementButton;
    [SerializeField] private Button automationButton;
    [SerializeField] private Button secretsButton;
    [SerializeField] private Button divisionButton;
    [SerializeField] private Button avocatoButton;

    [SerializeField] private Button fragmentsButton;
    [SerializeField] private Button purityButton;
    [SerializeField] private Button terraButton;
    [SerializeField] private Button powerButton;
    [SerializeField] private Button paragadeButton;
    [SerializeField] private Button stellarButton;

    [SerializeField] private Button influenceButton;
    [SerializeField] private Button cashButton;
    [SerializeField] private Button scienceButton;

    [Header("Mega-Structure Unlocks")]
    [SerializeField] private Button megaStructuresButton;
    [SerializeField] private TMP_Text megaStructuresTitleText;

    private int divisionCost => prestigePlus.divisionsPurchased >= 1 ? (int)Math.Pow(2, prestigePlus.divisionsPurchased) * 2 : 2;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private AvocadoData avocadoData => oracle.saveSettings.avocadoData;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dysonVerseSaveData => oracle.saveSettings.dysonVerseSaveData;

    private long pointsRemaining => prestigePlus.points - prestigePlus.spentPoints;


    private void Start()
    {
        multiTaskingButton.onClick.AddListener(PurchaseMultiTasking);
        if (prestigePlus.botMultitasking) multiTaskingButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        doubleIpButton.onClick.AddListener(PurchaseDoubleIP);
        if (prestigePlus.doubleIP) doubleIpButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        automationButton.onClick.AddListener(PurchaseAutomation);
        if (prestigePlus.automation) automationButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";


        secretsButton.onClick.AddListener(PurchaseSecrets);
        secretsButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.secrets >= MaxSecrets ? "Purchased" : "1<sprite=5, color=#000000>";
        divisionButton.onClick.AddListener(PurchaseDivision);
        divisionButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.divisionsPurchased >= 19 ? "Purchased" : $"{CalcUtils.FormatNumber(divisionCost)}<sprite=5, color=#000000>";

        avocatoButton.onClick.AddListener(PurchaseAvocato);
        if (avocadoData.unlocked) avocatoButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";

        breakTheLoopButton.onClick.AddListener(PurchaseBreakTheLoop);
        if (prestigePlus.breakTheLoop) breakTheLoopButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        quantumEntanglementButton.onClick.AddListener(PurchaseQuantumEntanglement);
        if (prestigePlus.quantumEntanglement)
            quantumEntanglementButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";

        fragmentsButton.onClick.AddListener(PurchaseFragments);
        if (prestigePlus.fragments) fragmentsButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        purityButton.onClick.AddListener(PurchasePurity);
        if (prestigePlus.purity) purityButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        terraButton.onClick.AddListener(PurchaseTerra);
        if (prestigePlus.terra) terraButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        powerButton.onClick.AddListener(PurchasePower);
        if (prestigePlus.power) powerButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        paragadeButton.onClick.AddListener(PurchaseParagade);
        if (prestigePlus.paragade) paragadeButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        stellarButton.onClick.AddListener(PurchaseStellar);
        if (prestigePlus.stellar) stellarButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";

        influenceButton.onClick.AddListener(PurchaseInfluence);
        cashButton.onClick.AddListener(PurchaseCashPercent);
        scienceButton.onClick.AddListener(PurchaseSciencePercent);

        // Mega-structure unlock button (sequential unlocks)
        if (megaStructuresButton != null)
        {
            megaStructuresButton.onClick.AddListener(PurchaseMegaStructure);
            UpdateMegaStructureButtonText();
        }
    }

    private void Update()
    {
        prestigeButtonText.text = prestigePlus.quantumEntanglement
            ? $"Leap for {(long)Math.Floor((prestigeData.infinityPoints - prestigeData.spentInfinityPoints) / (float)IPToQuantumConversion):N0}<sprite=5, color=#000000>"
            : "Engage Quantum Leap (<color=#FFA45E>{IPToQuantumConversion} IP</color>)";
        pointsText.text =
            $"You have: <color=#FFA45E>{CalcUtils.FormatNumber(prestigePlus.points - prestigePlus.spentPoints)}<size=70%><color=#91DD8F>({CalcUtils.FormatNumber(prestigePlus.spentPoints)})</size></color> {"<sprite=5>"}";
        cashText.text = $"5% Cash - <color=#91DD8F>{prestigePlus.cash * 5}%";
        scienceText.text = $"5% Science - <color=#91DD8F>{prestigePlus.science * 5}%";
        influenceText.text = $"4 Influence /sec <color=#91DD8F>+{prestigePlus.influence}";

        secretsTitleText.text = prestigePlus.secrets > 0
            ? $"Secrets of the Universe - <color=#91DD8F>{prestigePlus.secrets}"
            : "Secrets of the Universe";
        divisionTitleText.text = prestigePlus.divisionsPurchased >= 1
            ? $"Division - <color=#91DD8F>{CalcUtils.FormatNumber(Math.Pow(10, prestigePlus.divisionsPurchased))}"
            : "Division";

        bool activate = prestigePlus.points - prestigePlus.spentPoints >= 1;


        influenceButton.interactable = activate;
        cashButton.interactable = activate;
        scienceButton.interactable = activate;

        multiTaskingButton.interactable = !prestigePlus.botMultitasking && activate;
        doubleIpButton.interactable = !prestigePlus.doubleIP && activate;
        automationButton.interactable = !prestigePlus.automation && activate;
        secretsButton.interactable = prestigePlus.secrets < MaxSecrets && activate &&
                                     (prestigePlus.botMultitasking || prestigePlus.doubleIP);
        divisionButton.interactable = !(prestigePlus.divisionsPurchased >= 19) && prestigePlus.points - prestigePlus.spentPoints >= divisionCost &&
                                      prestigePlus.botMultitasking && prestigePlus.doubleIP;

        avocatoButton.interactable = !avocadoData.unlocked && pointsRemaining >= AvocadoCost;

        breakTheLoopButton.interactable = !prestigePlus.breakTheLoop && pointsRemaining >= BreakTheLoopCost;
        quantumEntanglementButton.interactable = !prestigePlus.quantumEntanglement && pointsRemaining >= QuantumEntanglementCost;

        fragmentsButton.interactable = !prestigePlus.fragments && pointsRemaining >= FragmentCost;
        purityButton.interactable = !prestigePlus.purity && pointsRemaining >= PurityCost;
        terraButton.interactable = !prestigePlus.terra && pointsRemaining >= TerraCost;
        powerButton.interactable = !prestigePlus.power && pointsRemaining >= PowerCost;
        paragadeButton.interactable = !prestigePlus.paragade && pointsRemaining >= ParagadeCost;
        stellarButton.interactable = !prestigePlus.stellar && pointsRemaining >= StellarCost;

        // Mega-structure unlock button
        if (megaStructuresButton != null)
        {
            int nextCost = GetNextMegaStructureCost();
            bool allUnlocked = prestigeData.unlockedGalacticBrains;
            megaStructuresButton.interactable = !allUnlocked && pointsRemaining >= nextCost;
        }

        // Update mega-structure title text to show next unlock
        if (megaStructuresTitleText != null)
        {
            string nextName = GetNextMegaStructureName();
            int unlockedCount = (prestigeData.unlockedMatrioshkaBrains ? 1 : 0) +
                                (prestigeData.unlockedBirchPlanets ? 1 : 0) +
                                (prestigeData.unlockedGalacticBrains ? 1 : 0);

            if (unlockedCount >= 3)
            {
                megaStructuresTitleText.text = "Mega-Structures - <color=#91DD8F>All Unlocked";
            }
            else
            {
                megaStructuresTitleText.text = nextName;
            }
        }
    }

    private void PurchaseAvocato()
    {
        if (pointsRemaining < AvocadoCost) return;
        avocatoButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        avocadoData.unlocked = true;
        prestigePlus.avocatoPurchased = true; // Keep legacy field in sync
        prestigePlus.spentPoints += AvocadoCost;
    }

    private void PurchaseDivision()
    {
        if (pointsRemaining < divisionCost) return;
        prestigePlus.spentPoints += divisionCost;
        prestigePlus.divisionsPurchased++;
        divisionButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.divisionsPurchased >= 19 ? "Purchased" : $"{CalcUtils.FormatNumber(divisionCost)}<sprite=5, color=#000000>";
    }

    private void PurchaseSecrets()
    {
        if (pointsRemaining < 1) return;
        prestigePlus.secrets += prestigePlus.secrets >= MaxSecrets ? 0 : SecretsPerPurchase;
        prestigeData.secretsOfTheUniverse += prestigeData.secretsOfTheUniverse >= MaxSecrets ? 0 : SecretsPerPurchase;
        prestigePlus.spentPoints++;
        secretsButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.secrets >= MaxSecrets ? "Purchased" : "1<sprite=5, color=#000000>";
    }

    private void PurchaseMultiTasking()
    {
        if (pointsRemaining < 1) return;
        multiTaskingButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.botMultitasking = true;
        prestigePlus.spentPoints++;
    }

    private void PurchaseDoubleIP()
    {
        if (pointsRemaining < 1) return;
        doubleIpButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.doubleIP = true;
        prestigePlus.spentPoints++;
    }

    private void PurchaseBreakTheLoop()
    {
        if (pointsRemaining < BreakTheLoopCost) return;
        breakTheLoopButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.breakTheLoop = true;
        prestigePlus.spentPoints += BreakTheLoopCost;
    }

    private void PurchaseQuantumEntanglement()
    {
        if (pointsRemaining < QuantumEntanglementCost) return;
        quantumEntanglementButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.quantumEntanglement = true;
        prestigePlus.spentPoints += QuantumEntanglementCost;
    }

    private void PurchaseAutomation()
    {
        if (pointsRemaining < 1) return;
        automationButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.automation = true;
        prestigeData.infinityAutoBots = true;
        prestigeData.infinityAutoResearch = true;
        prestigePlus.spentPoints++;
    }

    private void PurchaseFragments()
    {
        if (pointsRemaining < FragmentCost) return;
        fragmentsButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.fragments = true;
        prestigePlus.spentPoints += FragmentCost;
    }

    private void PurchasePurity()
    {
        if (pointsRemaining < PurityCost) return;
        purityButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.purity = true;
        prestigePlus.spentPoints += PurityCost;
    }

    private void PurchaseTerra()
    {
        if (pointsRemaining < TerraCost) return;
        terraButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.terra = true;
        prestigePlus.spentPoints += TerraCost;
    }

    private void PurchasePower()
    {
        if (pointsRemaining < PowerCost) return;
        powerButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.power = true;
        prestigePlus.spentPoints += PowerCost;
    }

    private void PurchaseParagade()
    {
        if (pointsRemaining < ParagadeCost) return;
        paragadeButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.paragade = true;
        prestigePlus.spentPoints += ParagadeCost;
    }

    private void PurchaseStellar()
    {
        if (pointsRemaining < StellarCost) return;
        stellarButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.stellar = true;
        prestigePlus.spentPoints += StellarCost;
    }

    private void PurchaseInfluence()
    {
        if (pointsRemaining < 1) return;
        prestigePlus.influence += InfluenceSpeedPerLevel;
        prestigePlus.spentPoints++;
    }

    private void PurchaseCashPercent()
    {
        if (pointsRemaining < 1) return;
        prestigePlus.cash++;
        prestigePlus.spentPoints++;
    }

    private void PurchaseSciencePercent()
    {
        if (pointsRemaining < 1) return;
        prestigePlus.science++;
        prestigePlus.spentPoints++;
    }

    #region Mega-Structure Unlocks

    private int GetNextMegaStructureCost()
    {
        if (!prestigeData.unlockedMatrioshkaBrains)
            return MatrioshkaBrainsCost;
        if (!prestigeData.unlockedBirchPlanets)
            return BirchPlanetsCost;
        if (!prestigeData.unlockedGalacticBrains)
            return GalacticBrainsCost;
        return 0; // All unlocked
    }

    private string GetNextMegaStructureName()
    {
        if (!prestigeData.unlockedMatrioshkaBrains)
            return "Matrioshka Brains";
        if (!prestigeData.unlockedBirchPlanets)
            return "Birch Planets";
        if (!prestigeData.unlockedGalacticBrains)
            return "Galactic Brains";
        return "All Unlocked";
    }

    private void UpdateMegaStructureButtonText()
    {
        if (megaStructuresButton == null) return;
        var buttonText = megaStructuresButton.transform.GetComponentInChildren<TMP_Text>();
        if (buttonText == null) return;

        if (prestigeData.unlockedGalacticBrains)
        {
            buttonText.text = "Purchased";
        }
        else
        {
            int cost = GetNextMegaStructureCost();
            buttonText.text = $"{cost}<sprite=5, color=#000000>";
        }
    }

    private void PurchaseMegaStructure()
    {
        int cost = GetNextMegaStructureCost();
        if (pointsRemaining < cost || cost == 0) return;

        if (!prestigeData.unlockedMatrioshkaBrains)
        {
            prestigeData.unlockedMatrioshkaBrains = true;
        }
        else if (!prestigeData.unlockedBirchPlanets)
        {
            prestigeData.unlockedBirchPlanets = true;
        }
        else if (!prestigeData.unlockedGalacticBrains)
        {
            prestigeData.unlockedGalacticBrains = true;
        }

        prestigePlus.spentPoints += cost;
        UpdateMegaStructureButtonText();
    }

    #endregion
}

