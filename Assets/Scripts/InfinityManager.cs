using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Serialization;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class InfinityManager : MonoBehaviour
{
    [SerializeField, FormerlySerializedAs("_gameManager")] private GameManager gameManager;

    [SerializeField, FormerlySerializedAs("pointsdisplay")] private TMP_Text pointsDisplayText;
    [SerializeField, FormerlySerializedAs("secret")] private TMP_Text secretText;

    [SerializeField, FormerlySerializedAs("btn_Secret")] private Button secretButton;
    [SerializeField, FormerlySerializedAs("btn_Skill")] private Button skillButton;

    [SerializeField, FormerlySerializedAs("btn_AssemblyLine")] private Button assemblyLineButton;
    [SerializeField, FormerlySerializedAs("btn_AiManager")] private Button aiManagerButton;
    [SerializeField, FormerlySerializedAs("btn_Server")] private Button serverButton;
    [SerializeField, FormerlySerializedAs("btn_DataCenter")] private Button dataCenterButton;
    [SerializeField, FormerlySerializedAs("btn_Planet")] private Button planetButton;

    [SerializeField, FormerlySerializedAs("txt_purchasedSecrets")] private TMP_Text purchasedSecretsText;
    [SerializeField, FormerlySerializedAs("txt_secretsbtn")] private TMP_Text secretsButtonText;

    [SerializeField, FormerlySerializedAs("txt_purchasedSkills")] private TMP_Text purchasedSkillsText;
    [SerializeField, FormerlySerializedAs("txt_Skillsbtn")] private TMP_Text skillsButtonText;

    [SerializeField, FormerlySerializedAs("txt_Assembly")] private TMP_Text assemblyLineText;
    [SerializeField, FormerlySerializedAs("txt_Ai")] private TMP_Text aiManagerText;
    [SerializeField, FormerlySerializedAs("txt_Server")] private TMP_Text serverText;
    [SerializeField, FormerlySerializedAs("txt_DataCenter")] private TMP_Text dataCenterText;
    [SerializeField, FormerlySerializedAs("txt_Planet")] private TMP_Text planetText;

    [SerializeField, FormerlySerializedAs("txt_autoResearch")] private TMP_Text autoResearchText;
    [SerializeField, FormerlySerializedAs("btn_autoResearch")] private Button autoResearchButton;

    [SerializeField, FormerlySerializedAs("txt_autoBots")] private TMP_Text autoBotsText;
    [SerializeField, FormerlySerializedAs("btn_autoBots")] private Button autoBotsButton;

    private readonly int autoResearchCost = 3;
    private readonly int autoBotsCost = 3;

    private readonly int maxSecrets = 27;
    private readonly int maxSkills = 10;

    private DysonVerseInfinityData infinityData => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData skillTreeData => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Start()
    {
        secretButton.onClick.AddListener(PurchaseSecret);
        skillButton.onClick.AddListener(PurchaseSkill);
        assemblyLineButton.onClick.AddListener(PurchaseAssemblyLine);
        aiManagerButton.onClick.AddListener(PurchaseAiManager);
        serverButton.onClick.AddListener(PurchaseServer);
        dataCenterButton.onClick.AddListener(PurchaseDataCenter);
        planetButton.onClick.AddListener(PurchasePlanet);
        autoResearchButton.onClick.AddListener(PurchaseAutoResearch);
        autoBotsButton.onClick.AddListener(PurchaseAutoBots);
    }

    private void Update()
    {
        UpdateSecret();
        pointsDisplayText.text =
            $"Infinity Points: <color=#FFA45E>{CalcUtils.FormatNumber(prestigeData.infinityPoints - prestigeData.spentInfinityPoints)}<size=70%><color=#91DD8F>({CalcUtils.FormatNumber(prestigeData.spentInfinityPoints)})";

        bool hasPoints = prestigeData.infinityPoints - prestigeData.spentInfinityPoints >= 1;

        secretButton.interactable = prestigeData.secretsOfTheUniverse < maxSecrets && hasPoints;
        secretsButtonText.text = prestigeData.secretsOfTheUniverse < maxSecrets ? "<sprite=3>1" : "Maxed";

        skillButton.interactable = !(prestigeData.permanentSkillPoint >= maxSkills) && hasPoints;
        skillsButtonText.text = !(prestigeData.permanentSkillPoint >= maxSkills) ? "<sprite=3>1" : "Maxed";

        assemblyLineButton.interactable = !prestigeData.infinityAssemblyLines && hasPoints;
        assemblyLineText.text = !prestigeData.infinityAssemblyLines ? "<sprite=3>1" : "Purchased";

        aiManagerButton.interactable = !prestigeData.infinityAiManagers && prestigeData.infinityAssemblyLines && hasPoints;
        aiManagerText.text = !prestigeData.infinityAiManagers ? "<sprite=3>1" : "Purchased";

        serverButton.interactable = !prestigeData.infinityServers && prestigeData.infinityAiManagers && hasPoints;
        serverText.text = !prestigeData.infinityServers ? "<sprite=3>1" : "Purchased";

        dataCenterButton.interactable = !prestigeData.infinityDataCenter && prestigeData.infinityServers && hasPoints;
        dataCenterText.text = !prestigeData.infinityDataCenter ? "<sprite=3>1" : "Purchased";

        planetButton.interactable = !prestigeData.infinityPlanets && prestigeData.infinityDataCenter && hasPoints;
        planetText.text = !prestigeData.infinityPlanets ? "<sprite=3>1" : "Purchased";

        purchasedSecretsText.text = prestigeData.secretsOfTheUniverse >= 1 ? $"Purchased: {textColourGreen}{prestigeData.secretsOfTheUniverse}" : "";
        purchasedSkillsText.text = prestigeData.permanentSkillPoint >= 1 ? $"Purchased: {textColourGreen}{prestigeData.permanentSkillPoint}" : "";

        autoResearchText.text = prestigeData.infinityAutoResearch ? "Purchased" : "<sprite=3>3";
        autoResearchButton.interactable =
            prestigeData.infinityPoints - prestigeData.spentInfinityPoints >= autoResearchCost && !prestigeData.infinityAutoResearch;

        autoBotsText.text = prestigeData.infinityAutoBots ? "Purchased" : "<sprite=3>3";
        autoBotsButton.interactable =
            prestigeData.infinityPoints - prestigeData.spentInfinityPoints >= autoBotsCost && !prestigeData.infinityAutoBots;
    }

    private void UpdateSecret()
    {
        switch (prestigeData.secretsOfTheUniverse)
        {
            case 0:
            {
                secretText.text = "The meaning of life is: ----- ------- --- ------------";
                break;
            }
            case 1:
            {
                secretText.text = "The meaning of life is: L---- ------- --- ------------";
                break;
            }
            case 2:
            {
                secretText.text = "The meaning of life is: Lo--- ------- --- ------------";
                break;
            }
            case 3:
            {
                secretText.text = "The meaning of life is: Lov-- ------- --- ------------";
                break;
            }
            case 4:
            {
                secretText.text = "The meaning of life is: Love- ------- --- ------------";
                break;
            }
            case 5:
            {
                secretText.text = "The meaning of life is: Love, ------- --- ------------";
                break;
            }
            case 6:
            {
                secretText.text = "The meaning of life is: Love, F------ --- ------------";
                break;
            }
            case 7:
            {
                secretText.text = "The meaning of life is: Love, Fa----- --- ------------";
                break;
            }
            case 8:
            {
                secretText.text = "The meaning of life is: Love, Fam---- --- ------------";
                break;
            }
            case 9:
            {
                secretText.text = "The meaning of life is: Love, Fami--- --- ------------";
                break;
            }
            case 10:
            {
                secretText.text = "The meaning of life is: Love, Famil-- --- ------------";
                break;
            }
            case 11:
            {
                secretText.text = "The meaning of life is: Love, Family- --- ------------";
                break;
            }
            case 12:
            {
                secretText.text = "The meaning of life is: Love, Family, --- ------------";
                break;
            }
            case 13:
            {
                secretText.text = "The meaning of life is: Love, Family, a-- ------------";
                break;
            }
            case 14:
            {
                secretText.text = "The meaning of life is: Love, Family, an- ------------";
                break;
            }
            case 15:
            {
                secretText.text = "The meaning of life is: Love, Family, and ------------";
                break;
            }
            case 16:
            {
                secretText.text = "The meaning of life is: Love, Family, and -----------s";
                break;
            }
            case 17:
            {
                secretText.text = "The meaning of life is: Love, Family, and ----------ls";
                break;
            }
            case 18:
            {
                secretText.text = "The meaning of life is: Love, Family, and ---------als";
                break;
            }
            case 19:
            {
                secretText.text = "The meaning of life is: Love, Family, and --------tals";
                break;
            }
            case 20:
            {
                secretText.text = "The meaning of life is: Love, Family, and -------ntals";
                break;
            }
            case 21:
            {
                secretText.text = "The meaning of life is: Love, Family, and ------entals";
                break;
            }
            case 22:
            {
                secretText.text = "The meaning of life is: Love, Family, and -----mentals";
                break;
            }
            case 23:
            {
                secretText.text = "The meaning of life is: Love, Family, and ----ementals";
                break;
            }
            case 24:
            {
                secretText.text = "The meaning of life is: Love, Family, and ---rementals";
                break;
            }
            case 25:
            {
                secretText.text = "The meaning of life is: Love, Family, and --crementals";
                break;
            }
            case 26:
            {
                secretText.text = "The meaning of life is: Love, Family, and -ncrementals";
                break;
            }
            case 27:
            {
                secretText.text = "The meaning of life is: Love, Family, and Incrementals";
                break;
            }
        }

        if (oracle.saveSettings.cheater) secretText.text = "The meaning of life is: Not Cheating..";
    }

    public void PurchaseSecret()
    {
        if (prestigeData.secretsOfTheUniverse >= 27) return;
        prestigeData.spentInfinityPoints += 1;
        prestigeData.secretsOfTheUniverse += 1;
    }

    public void PurchaseSkill()
    {
        prestigeData.spentInfinityPoints += 1;
        skillTreeData.skillPointsTree += 1;
        prestigeData.permanentSkillPoint += 1;
        gameManager.AutoAssignSkillsInvoke();
    }

    public void PurchaseAssemblyLine()
    {
        prestigeData.spentInfinityPoints += 1;
        prestigeData.infinityAssemblyLines = true;
        infinityData.assemblyLines[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseAiManager()
    {
        prestigeData.spentInfinityPoints += 1;
        prestigeData.infinityAiManagers = true;
        infinityData.managers[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseServer()
    {
        prestigeData.spentInfinityPoints += 1;
        prestigeData.infinityServers = true;
        infinityData.servers[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseDataCenter()
    {
        prestigeData.spentInfinityPoints += 1;
        prestigeData.infinityDataCenter = true;
        infinityData.dataCenters[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchasePlanet()
    {
        prestigeData.spentInfinityPoints += 1;
        prestigeData.infinityPlanets = true;
        infinityData.planets[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseAutoResearch()
    {
        prestigeData.spentInfinityPoints += autoResearchCost;
        prestigeData.infinityAutoResearch = true;
    }

    public void PurchaseAutoBots()
    {
        prestigeData.spentInfinityPoints += autoBotsCost;
        prestigeData.infinityAutoBots = true;
    }
}

