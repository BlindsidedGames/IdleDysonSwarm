using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class InfinityManager : MonoBehaviour
{
    [SerializeField] private GameManager _gameManager;

    [SerializeField] private TMP_Text pointsdisplay;
    [SerializeField] private TMP_Text secret;

    [SerializeField] private Button btn_Secret;
    [SerializeField] private Button btn_Skill;

    [SerializeField] private Button btn_AssemblyLine;
    [SerializeField] private Button btn_AiManager;
    [SerializeField] private Button btn_Server;
    [SerializeField] private Button btn_DataCenter;
    [SerializeField] private Button btn_Planet;

    [SerializeField] private TMP_Text txt_purchasedSecrets;
    [SerializeField] private TMP_Text txt_secretsbtn;

    [SerializeField] private TMP_Text txt_purchasedSkills;
    [SerializeField] private TMP_Text txt_Skillsbtn;

    [SerializeField] private TMP_Text txt_Assembly;
    [SerializeField] private TMP_Text txt_Ai;
    [SerializeField] private TMP_Text txt_Server;
    [SerializeField] private TMP_Text txt_DataCenter;
    [SerializeField] private TMP_Text txt_Planet;

    [SerializeField] private TMP_Text txt_autoResearch;
    [SerializeField] private Button btn_autoResearch;

    [SerializeField] private TMP_Text txt_autoBots;
    [SerializeField] private Button btn_autoBots;

    private readonly int autoResearchCost = 3;
    private readonly int autoBotsCost = 3;

    private readonly int maxSecrets = 27;
    private readonly int maxSkills = 10;

    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Start()
    {
        btn_Secret.onClick.AddListener(PurchaseSecret);
        btn_Skill.onClick.AddListener(PurchaseSkill);
        btn_AssemblyLine.onClick.AddListener(PurchaseAssemblyLine);
        btn_AiManager.onClick.AddListener(PurchaseAiManager);
        btn_Server.onClick.AddListener(PurchaseServer);
        btn_DataCenter.onClick.AddListener(PurchaseDataCenter);
        btn_Planet.onClick.AddListener(PurchasePlanet);
        btn_autoResearch.onClick.AddListener(PurchaseAutoResearch);
        btn_autoBots.onClick.AddListener(PurchaseAutoBots);
    }

    private void Update()
    {
        UpdateSecret();
        pointsdisplay.text =
            $"Infinity Points: <color=#FFA45E>{CalcUtils.FormatNumber(dvpd.infinityPoints - dvpd.spentInfinityPoints)}<size=70%><color=#91DD8F>({CalcUtils.FormatNumber(dvpd.spentInfinityPoints)})";

        bool hasPoints = dvpd.infinityPoints - dvpd.spentInfinityPoints >= 1;

        btn_Secret.interactable = dvpd.secretsOfTheUniverse < maxSecrets && hasPoints;
        txt_secretsbtn.text = dvpd.secretsOfTheUniverse < maxSecrets ? "<sprite=3>1" : "Maxed";

        btn_Skill.interactable = !(dvpd.permanentSkillPoint >= maxSkills) && hasPoints;
        txt_Skillsbtn.text = !(dvpd.permanentSkillPoint >= maxSkills) ? "<sprite=3>1" : "Maxed";

        btn_AssemblyLine.interactable = !dvpd.infinityAssemblyLines && hasPoints;
        txt_Assembly.text = !dvpd.infinityAssemblyLines ? "<sprite=3>1" : "Purchased";

        btn_AiManager.interactable = !dvpd.infinityAiManagers && dvpd.infinityAssemblyLines && hasPoints;
        txt_Ai.text = !dvpd.infinityAiManagers ? "<sprite=3>1" : "Purchased";

        btn_Server.interactable = !dvpd.infinityServers && dvpd.infinityAiManagers && hasPoints;
        txt_Server.text = !dvpd.infinityServers ? "<sprite=3>1" : "Purchased";

        btn_DataCenter.interactable = !dvpd.infinityDataCenter && dvpd.infinityServers && hasPoints;
        txt_DataCenter.text = !dvpd.infinityDataCenter ? "<sprite=3>1" : "Purchased";

        btn_Planet.interactable = !dvpd.infinityPlanets && dvpd.infinityDataCenter && hasPoints;
        txt_Planet.text = !dvpd.infinityPlanets ? "<sprite=3>1" : "Purchased";

        txt_purchasedSecrets.text = dvpd.secretsOfTheUniverse >= 1 ? $"Purchased: {textColourGreen}{dvpd.secretsOfTheUniverse}" : "";
        txt_purchasedSkills.text = dvpd.permanentSkillPoint >= 1 ? $"Purchased: {textColourGreen}{dvpd.permanentSkillPoint}" : "";

        txt_autoResearch.text = dvpd.infinityAutoResearch ? "Purchased" : "<sprite=3>3";
        btn_autoResearch.interactable =
            dvpd.infinityPoints - dvpd.spentInfinityPoints >= autoResearchCost && !dvpd.infinityAutoResearch;

        txt_autoBots.text = dvpd.infinityAutoBots ? "Purchased" : "<sprite=3>3";
        btn_autoBots.interactable =
            dvpd.infinityPoints - dvpd.spentInfinityPoints >= autoBotsCost && !dvpd.infinityAutoBots;
    }

    private void UpdateSecret()
    {
        switch (dvpd.secretsOfTheUniverse)
        {
            case 0:
            {
                secret.text = "The meaning of life is: ----- ------- --- ------------";
                break;
            }
            case 1:
            {
                secret.text = "The meaning of life is: L---- ------- --- ------------";
                break;
            }
            case 2:
            {
                secret.text = "The meaning of life is: Lo--- ------- --- ------------";
                break;
            }
            case 3:
            {
                secret.text = "The meaning of life is: Lov-- ------- --- ------------";
                break;
            }
            case 4:
            {
                secret.text = "The meaning of life is: Love- ------- --- ------------";
                break;
            }
            case 5:
            {
                secret.text = "The meaning of life is: Love, ------- --- ------------";
                break;
            }
            case 6:
            {
                secret.text = "The meaning of life is: Love, F------ --- ------------";
                break;
            }
            case 7:
            {
                secret.text = "The meaning of life is: Love, Fa----- --- ------------";
                break;
            }
            case 8:
            {
                secret.text = "The meaning of life is: Love, Fam---- --- ------------";
                break;
            }
            case 9:
            {
                secret.text = "The meaning of life is: Love, Fami--- --- ------------";
                break;
            }
            case 10:
            {
                secret.text = "The meaning of life is: Love, Famil-- --- ------------";
                break;
            }
            case 11:
            {
                secret.text = "The meaning of life is: Love, Family- --- ------------";
                break;
            }
            case 12:
            {
                secret.text = "The meaning of life is: Love, Family, --- ------------";
                break;
            }
            case 13:
            {
                secret.text = "The meaning of life is: Love, Family, a-- ------------";
                break;
            }
            case 14:
            {
                secret.text = "The meaning of life is: Love, Family, an- ------------";
                break;
            }
            case 15:
            {
                secret.text = "The meaning of life is: Love, Family, and ------------";
                break;
            }
            case 16:
            {
                secret.text = "The meaning of life is: Love, Family, and -----------s";
                break;
            }
            case 17:
            {
                secret.text = "The meaning of life is: Love, Family, and ----------ls";
                break;
            }
            case 18:
            {
                secret.text = "The meaning of life is: Love, Family, and ---------als";
                break;
            }
            case 19:
            {
                secret.text = "The meaning of life is: Love, Family, and --------tals";
                break;
            }
            case 20:
            {
                secret.text = "The meaning of life is: Love, Family, and -------ntals";
                break;
            }
            case 21:
            {
                secret.text = "The meaning of life is: Love, Family, and ------entals";
                break;
            }
            case 22:
            {
                secret.text = "The meaning of life is: Love, Family, and -----mentals";
                break;
            }
            case 23:
            {
                secret.text = "The meaning of life is: Love, Family, and ----ementals";
                break;
            }
            case 24:
            {
                secret.text = "The meaning of life is: Love, Family, and ---rementals";
                break;
            }
            case 25:
            {
                secret.text = "The meaning of life is: Love, Family, and --crementals";
                break;
            }
            case 26:
            {
                secret.text = "The meaning of life is: Love, Family, and -ncrementals";
                break;
            }
            case 27:
            {
                secret.text = "The meaning of life is: Love, Family, and Incrementals";
                break;
            }
        }

        if (oracle.saveSettings.cheater) secret.text = "The meaning of life is: Not Cheating..";
    }

    public void PurchaseSecret()
    {
        if (dvpd.secretsOfTheUniverse >= 27) return;
        dvpd.spentInfinityPoints += 1;
        dvpd.secretsOfTheUniverse += 1;
    }

    public void PurchaseSkill()
    {
        dvpd.spentInfinityPoints += 1;
        dvst.skillPointsTree += 1;
        dvpd.permanentSkillPoint += 1;
        _gameManager.AutoAssignSkillsInvoke();
    }

    public void PurchaseAssemblyLine()
    {
        dvpd.spentInfinityPoints += 1;
        dvpd.infinityAssemblyLines = true;
        dvid.assemblyLines[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseAiManager()
    {
        dvpd.spentInfinityPoints += 1;
        dvpd.infinityAiManagers = true;
        dvid.managers[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseServer()
    {
        dvpd.spentInfinityPoints += 1;
        dvpd.infinityServers = true;
        dvid.servers[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseDataCenter()
    {
        dvpd.spentInfinityPoints += 1;
        dvpd.infinityDataCenter = true;
        dvid.dataCenters[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchasePlanet()
    {
        dvpd.spentInfinityPoints += 1;
        dvpd.infinityPlanets = true;
        dvid.planets[1] += 10;
        oracle.WipeSaveButtonUpdate();
    }

    public void PurchaseAutoResearch()
    {
        dvpd.spentInfinityPoints += autoResearchCost;
        dvpd.infinityAutoResearch = true;
    }

    public void PurchaseAutoBots()
    {
        dvpd.spentInfinityPoints += autoBotsCost;
        dvpd.infinityAutoBots = true;
    }
}
