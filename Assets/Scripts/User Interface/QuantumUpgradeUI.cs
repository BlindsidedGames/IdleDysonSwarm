using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using Systems.Numeric;
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

    [Header("Hold to Purchase")]
    [SerializeField] private HoldToPurchase influenceHoldToPurchase;
    [SerializeField] private HoldToPurchase cashHoldToPurchase;
    [SerializeField] private HoldToPurchase scienceHoldToPurchase;

    [Header("Mega-Structure Unlocks")]
    [SerializeField] private Button megaStructuresButton;
    [SerializeField] private TMP_Text megaStructuresTitleText;

    private int divisionCost => prestigePlus.divisionsPurchased >= 19
        ? int.MaxValue
        : prestigePlus.divisionsPurchased >= 1
            ? (int)(2L << (int)prestigePlus.divisionsPurchased)
            : 2;
    private PrestigePlus prestigePlus => oracle.saveSettings.prestigePlus;
    private AvocadoData avocadoData => oracle.saveSettings.avocadoData;
    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dysonVerseSaveData => oracle.saveSettings.dysonVerseSaveData;

    private long pointsRemaining =>
        prestigePlus.points >= prestigePlus.spentPoints
            ? prestigePlus.points - prestigePlus.spentPoints
            : 0L;

    private bool TrySpendPoints(long cost)
    {
        DiscreteDebitResult debit = EconomyTransaction.TryDebit(pointsRemaining, cost);
        if (!debit.Succeeded) return false;
        NumericResult<long> spent = NumericSafety.Add(prestigePlus.spentPoints, debit.Charged);
        if (!spent.IsSuccess) return false;
        prestigePlus.spentPoints = spent.Value;
        return true;
    }


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

        if (influenceHoldToPurchase != null)
            influenceHoldToPurchase.onRepeat.AddListener(PurchaseInfluence);
        if (cashHoldToPurchase != null)
            cashHoldToPurchase.onRepeat.AddListener(PurchaseCashPercent);
        if (scienceHoldToPurchase != null)
            scienceHoldToPurchase.onRepeat.AddListener(PurchaseSciencePercent);

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
            : $"Engage Quantum Leap (<color=#FFA45E>{IPToQuantumConversion} IP</color>)";
        pointsText.text =
            $"You have: <color=#FFA45E>{CalcUtils.FormatNumber(pointsRemaining)}<size=70%><color=#91DD8F>({CalcUtils.FormatNumber(prestigePlus.spentPoints)})</size></color> {"<sprite=5>"}";
        cashText.text = $"5% Cash - <color=#91DD8F>{NumericSafety.Multiply(prestigePlus.cash, 5L).Value}%";
        scienceText.text = $"5% Science - <color=#91DD8F>{NumericSafety.Multiply(prestigePlus.science, 5L).Value}%";
        influenceText.text = $"4 Influence /sec <color=#91DD8F>+{prestigePlus.influence}";

        secretsTitleText.text = prestigePlus.secrets > 0
            ? $"Secrets of the Universe - <color=#91DD8F>{prestigePlus.secrets}"
            : "Secrets of the Universe";
        divisionTitleText.text = prestigePlus.divisionsPurchased >= 1
            ? $"Division - <color=#91DD8F>{CalcUtils.FormatNumber(Math.Pow(10, prestigePlus.divisionsPurchased))}"
            : "Division";

        bool activate = pointsRemaining >= 1;


        influenceButton.interactable = activate;
        cashButton.interactable = activate;
        scienceButton.interactable = activate;

        multiTaskingButton.interactable = !prestigePlus.botMultitasking && activate;
        doubleIpButton.interactable = !prestigePlus.doubleIP && activate;
        automationButton.interactable = !prestigePlus.automation && activate;
        secretsButton.interactable = prestigePlus.secrets < MaxSecrets && activate &&
                                     (prestigePlus.botMultitasking || prestigePlus.doubleIP);
        divisionButton.interactable = !(prestigePlus.divisionsPurchased >= 19) && pointsRemaining >= divisionCost &&
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
        if (avocadoData.unlocked || !TrySpendPoints(AvocadoCost)) return;
        avocatoButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        avocadoData.unlocked = true;
        prestigePlus.avocatoPurchased = true; // Keep legacy field in sync
    }

    private void PurchaseDivision()
    {
        if (prestigePlus.divisionsPurchased >= 19 || !TrySpendPoints(divisionCost)) return;
        prestigePlus.divisionsPurchased =
            NumericSafety.Add(prestigePlus.divisionsPurchased, 1L).Value;
        divisionButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.divisionsPurchased >= 19 ? "Purchased" : $"{CalcUtils.FormatNumber(divisionCost)}<sprite=5, color=#000000>";
    }

    private void PurchaseSecrets()
    {
        if (prestigePlus.secrets >= MaxSecrets || !TrySpendPoints(1L)) return;
        prestigePlus.secrets = Math.Min(
            MaxSecrets,
            NumericSafety.Add(prestigePlus.secrets, SecretsPerPurchase).Value);
        prestigeData.secretsOfTheUniverse = Math.Min(
            MaxSecrets,
            NumericSafety.Add(prestigeData.secretsOfTheUniverse, SecretsPerPurchase).Value);
        secretsButton.transform.GetComponentInChildren<TMP_Text>().text =
            prestigePlus.secrets >= MaxSecrets ? "Purchased" : "1<sprite=5, color=#000000>";
    }

    private void PurchaseMultiTasking()
    {
        if (prestigePlus.botMultitasking || !TrySpendPoints(1L)) return;
        multiTaskingButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.botMultitasking = true;
    }

    private void PurchaseDoubleIP()
    {
        if (prestigePlus.doubleIP || !TrySpendPoints(1L)) return;
        doubleIpButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.doubleIP = true;
    }

    private void PurchaseBreakTheLoop()
    {
        if (prestigePlus.breakTheLoop || !TrySpendPoints(BreakTheLoopCost)) return;
        breakTheLoopButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.breakTheLoop = true;
    }

    private void PurchaseQuantumEntanglement()
    {
        if (prestigePlus.quantumEntanglement || !TrySpendPoints(QuantumEntanglementCost)) return;
        quantumEntanglementButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.quantumEntanglement = true;
    }

    private void PurchaseAutomation()
    {
        if (prestigePlus.automation || !TrySpendPoints(1L)) return;
        automationButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.automation = true;
        prestigeData.infinityAutoBots = true;
        prestigeData.infinityAutoResearch = true;
    }

    private void PurchaseFragments()
    {
        if (prestigePlus.fragments || !TrySpendPoints(FragmentCost)) return;
        fragmentsButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.fragments = true;
    }

    private void PurchasePurity()
    {
        if (prestigePlus.purity || !TrySpendPoints(PurityCost)) return;
        purityButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.purity = true;
    }

    private void PurchaseTerra()
    {
        if (prestigePlus.terra || !TrySpendPoints(TerraCost)) return;
        terraButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.terra = true;
    }

    private void PurchasePower()
    {
        if (prestigePlus.power || !TrySpendPoints(PowerCost)) return;
        powerButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.power = true;
    }

    private void PurchaseParagade()
    {
        if (prestigePlus.paragade || !TrySpendPoints(ParagadeCost)) return;
        paragadeButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.paragade = true;
    }

    private void PurchaseStellar()
    {
        if (prestigePlus.stellar || !TrySpendPoints(StellarCost)) return;
        stellarButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        prestigePlus.stellar = true;
    }

    private void PurchaseInfluence()
    {
        NumericResult<long> next =
            NumericSafety.Add(prestigePlus.influence, InfluenceSpeedPerLevel);
        if (!next.IsSuccess || next.Value <= prestigePlus.influence) return;
        if (!TrySpendPoints(1L)) return;
        prestigePlus.influence = next.Value;
    }

    private void PurchaseCashPercent()
    {
        NumericResult<long> next = NumericSafety.Add(prestigePlus.cash, 1L);
        if (!next.IsSuccess || next.Value <= prestigePlus.cash) return;
        if (!TrySpendPoints(1L)) return;
        prestigePlus.cash = next.Value;
    }

    private void PurchaseSciencePercent()
    {
        NumericResult<long> next = NumericSafety.Add(prestigePlus.science, 1L);
        if (!next.IsSuccess || next.Value <= prestigePlus.science) return;
        if (!TrySpendPoints(1L)) return;
        prestigePlus.science = next.Value;
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
        if (cost == 0 || !TrySpendPoints(cost)) return;

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

        UpdateMegaStructureButtonText();
    }

    #endregion
}
