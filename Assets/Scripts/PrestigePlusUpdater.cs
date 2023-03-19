using System;
using static Oracle;
using TMPro;
using UnityEngine;
using UnityEngine.UI;


public class PrestigePlusUpdater : MonoBehaviour
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

    [SerializeField] private Button fragmentsButton;
    [SerializeField] private Button purityButton;
    [SerializeField] private Button terraButton;
    [SerializeField] private Button powerButton;
    [SerializeField] private Button paragadeButton;
    [SerializeField] private Button stellarButton;

    [SerializeField] private Button influenceButton;
    [SerializeField] private Button cashButton;
    [SerializeField] private Button scienceButton;

    private int divisionCost => pp.divisionsPurchased >= 1 ? (int)Math.Pow(2, pp.divisionsPurchased) * 2 : 2;
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    private const int BreakTheLoopCost = 12;
    private const int QuantumEntanglementCost = 42;

    private const int FragmentCost = 2;
    private const int PurityCost = 3;
    private const int TerraCost = 2;
    private const int PowerCost = 2;
    private const int ParagadeCost = 1;
    private const int StellarCost = 4;
    private long pointsRemaining => pp.points - pp.spentPoints;


    private void Start()
    {
        multiTaskingButton.onClick.AddListener(PurchaseMultiTasking);
        if (pp.botMultitasking) multiTaskingButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        doubleIpButton.onClick.AddListener(PurchaseDoubleIP);
        if (pp.doubleIP) doubleIpButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        automationButton.onClick.AddListener(PurchaseAutomation);
        if (pp.automation) automationButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";


        secretsButton.onClick.AddListener(PurchaseSecrets);
        secretsButton.transform.GetComponentInChildren<TMP_Text>().text =
            pp.secrets >= 27 ? "Purchased" : "1 Shard";
        divisionButton.onClick.AddListener(PurchaseDivision);
        divisionButton.transform.GetComponentInChildren<TMP_Text>().text =
            pp.divisionsPurchased >= 19 ? "Purchased" : $"{CalcUtils.FormatNumber(divisionCost)} Shards";

        breakTheLoopButton.onClick.AddListener(PurchaseBreakTheLoop);
        if (pp.breakTheLoop) breakTheLoopButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        quantumEntanglementButton.onClick.AddListener(PurchaseQuantumEntanglement);
        if (pp.quantumEntanglement)
            quantumEntanglementButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";

        fragmentsButton.onClick.AddListener(PurchaseFragments);
        if (pp.fragments) fragmentsButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        purityButton.onClick.AddListener(PurchasePurity);
        if (pp.purity) purityButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        terraButton.onClick.AddListener(PurchaseTerra);
        if (pp.terra) terraButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        powerButton.onClick.AddListener(PurchasePower);
        if (pp.power) powerButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        paragadeButton.onClick.AddListener(PurchaseParagade);
        if (pp.paragade) paragadeButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        stellarButton.onClick.AddListener(PurchaseStellar);
        if (pp.stellar) stellarButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";

        influenceButton.onClick.AddListener(PurchaseInfluence);
        cashButton.onClick.AddListener(PurchaseCashPercent);
        scienceButton.onClick.AddListener(PurchaseSciencePercent);
    }

    private void Update()
    {
        prestigeButtonText.text = pp.quantumEntanglement
            ? $"Leap for {(long)Math.Floor((dvpd.infinityPoints - dvpd.spentInfinityPoints) / 42f):N0} Quantum Shards"
            : "Engage Quantum Leap";
        pointsText.text =
            $"You have: <color=#FFA45E>{CalcUtils.FormatNumber(pp.points - pp.spentPoints)}<size=70%><color=#91DD8F>({CalcUtils.FormatNumber(pp.spentPoints)})</size></color> {(pp.points - pp.spentPoints == 1 ? "Quantum Shard" : "Quantum Shards")}";
        cashText.text = $"5% Cash - <color=#91DD8F>{pp.cash * 5}%";
        scienceText.text = $"5% Science - <color=#91DD8F>{pp.science * 5}%";
        influenceText.text = $"4 Influence /sec <color=#91DD8F>+{pp.influence}";

        secretsTitleText.text = pp.secrets > 0
            ? $"Secrets of the Universe - <color=#91DD8F>{pp.secrets}"
            : "Secrets of the Universe";
        divisionTitleText.text = pp.divisionsPurchased >= 1
            ? $"Division - <color=#91DD8F>{CalcUtils.FormatNumber(Math.Pow(10, pp.divisionsPurchased))}"
            : "Division";

        var activate = pp.points - pp.spentPoints >= 1;


        influenceButton.interactable = activate;
        cashButton.interactable = activate;
        scienceButton.interactable = activate;

        multiTaskingButton.interactable = !pp.botMultitasking && activate;
        doubleIpButton.interactable = !pp.doubleIP && activate;
        automationButton.interactable = !pp.automation && activate;
        secretsButton.interactable = pp.secrets < 27 && activate &&
                                     (pp.botMultitasking || pp.doubleIP);
        divisionButton.interactable = !(pp.divisionsPurchased >= 19) && pp.points - pp.spentPoints >= divisionCost &&
                                      pp.botMultitasking && pp.doubleIP;

        breakTheLoopButton.interactable = !pp.breakTheLoop && pointsRemaining >= BreakTheLoopCost;
        quantumEntanglementButton.interactable = !pp.quantumEntanglement && pointsRemaining >= QuantumEntanglementCost;

        fragmentsButton.interactable = !pp.fragments && pointsRemaining >= FragmentCost;
        purityButton.interactable = !pp.purity && pointsRemaining >= PurityCost;
        terraButton.interactable = !pp.terra && pointsRemaining >= TerraCost;
        powerButton.interactable = !pp.power && pointsRemaining >= PowerCost;
        paragadeButton.interactable = !pp.paragade && pointsRemaining >= ParagadeCost;
        stellarButton.interactable = !pp.stellar && pointsRemaining >= StellarCost;
    }

    private void PurchaseDivision()
    {
        if (pointsRemaining < divisionCost) return;
        pp.spentPoints += divisionCost;
        pp.divisionsPurchased++;
        divisionButton.transform.GetComponentInChildren<TMP_Text>().text =
            pp.divisionsPurchased >= 19 ? "Purchased" : $"{CalcUtils.FormatNumber(divisionCost)} Shards";
    }

    private void PurchaseSecrets()
    {
        if (pointsRemaining < 1) return;
        pp.secrets += pp.secrets >= 27 ? 0 : 3;
        dvpd.secretsOfTheUniverse += dvpd.secretsOfTheUniverse >= 27 ? 0 : 3;
        pp.spentPoints++;
        secretsButton.transform.GetComponentInChildren<TMP_Text>().text =
            pp.secrets >= 27 ? "Purchased" : "1 Shard";
    }

    private void PurchaseMultiTasking()
    {
        if (pointsRemaining < 1) return;
        multiTaskingButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.botMultitasking = true;
        pp.spentPoints++;
    }

    private void PurchaseDoubleIP()
    {
        if (pointsRemaining < 1) return;
        doubleIpButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.doubleIP = true;
        pp.spentPoints++;
    }

    private void PurchaseBreakTheLoop()
    {
        if (pointsRemaining < BreakTheLoopCost) return;
        breakTheLoopButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.breakTheLoop = true;
        pp.spentPoints += BreakTheLoopCost;
    }

    private void PurchaseQuantumEntanglement()
    {
        if (pointsRemaining < QuantumEntanglementCost) return;
        quantumEntanglementButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.quantumEntanglement = true;
        pp.spentPoints += QuantumEntanglementCost;
    }

    private void PurchaseAutomation()
    {
        if (pointsRemaining < 1) return;
        automationButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.automation = true;
        dvpd.infinityAutoBots = true;
        dvpd.infinityAutoResearch = true;
        pp.spentPoints++;
    }

    private void PurchaseFragments()
    {
        if (pointsRemaining < FragmentCost) return;
        fragmentsButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.fragments = true;
        pp.spentPoints += FragmentCost;
    }

    private void PurchasePurity()
    {
        if (pointsRemaining < PurityCost) return;
        purityButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.purity = true;
        pp.spentPoints += PurityCost;
    }

    private void PurchaseTerra()
    {
        if (pointsRemaining < TerraCost) return;
        terraButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.terra = true;
        pp.spentPoints += TerraCost;
    }

    private void PurchasePower()
    {
        if (pointsRemaining < PowerCost) return;
        powerButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.power = true;
        pp.spentPoints += PowerCost;
    }

    private void PurchaseParagade()
    {
        if (pointsRemaining < ParagadeCost) return;
        paragadeButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.paragade = true;
        pp.spentPoints += ParagadeCost;
    }

    private void PurchaseStellar()
    {
        if (pointsRemaining < StellarCost) return;
        stellarButton.transform.GetComponentInChildren<TMP_Text>().text = "Purchased";
        pp.stellar = true;
        pp.spentPoints += StellarCost;
    }

    private void PurchaseInfluence()
    {
        if (pointsRemaining < 1) return;
        pp.influence += 4;
        pp.spentPoints++;
    }

    private void PurchaseCashPercent()
    {
        if (pointsRemaining < 1) return;
        pp.cash++;
        pp.spentPoints++;
    }

    private void PurchaseSciencePercent()
    {
        if (pointsRemaining < 1) return;
        pp.science++;
        pp.spentPoints++;
    }
}