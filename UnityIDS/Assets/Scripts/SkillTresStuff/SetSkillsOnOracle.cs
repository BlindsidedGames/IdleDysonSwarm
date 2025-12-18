using System.Collections.Generic;
using Classes;
using UnityEngine;
using static Expansion.Oracle;

public class SetSkillsOnOracle : MonoBehaviour
{
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;

    private void OnEnable()
    {
        SkillTreeManager.ApplySkills += UpdateSavedSkills;
        GameManager.UpdateSkills += UpdateSavedSkills;
        UpdateSkills += UpdateSavedSkills;
    }

    private void OnDisable()
    {
        SkillTreeManager.ApplySkills -= UpdateSavedSkills;
        GameManager.UpdateSkills -= UpdateSavedSkills;
        UpdateSkills -= UpdateSavedSkills;
    }

    private void UpdateSavedSkills()
    {
        foreach (KeyValuePair<int, SkillTreeItem> variable in oracle.SkillTree)
            switch (variable.Key)
            {
                case 1:
                    dvst.startHereTree = variable.Value.Owned;
                    break;
                case 2:
                    dvst.assemblyLineTree = variable.Value.Owned;
                    break;
                case 3:
                    dvst.aiManagerTree = variable.Value.Owned;
                    break;
                case 4:
                    dvst.serverTree = variable.Value.Owned;
                    break;
                case 5:
                    dvst.planetsTree = variable.Value.Owned;
                    break;
                case 6:
                    dvst.scientificPlanets = variable.Value.Owned;
                    break;
                case 7:
                    dvst.workerEfficiencyTree = variable.Value.Owned;
                    break;
                case 8:
                    dvst.panelLifetime20Tree = variable.Value.Owned;
                    break;
                case 9:
                    dvst.doubleScienceTree = variable.Value.Owned;
                    break;
                case 10:
                    dvst.producedAsScienceTree = variable.Value.Owned;
                    break;
                case 11:
                    dvst.banking = variable.Value.Owned;
                    break;
                case 12:
                    dvst.investmentPortfolio = variable.Value.Owned;
                    break;
                case 13:
                    dvst.scientificRevolution = variable.Value.Owned;
                    break;
                case 14:
                    dvst.economicRevolution = variable.Value.Owned;
                    break;
                case 15:
                    dvst.renewableEnergy = variable.Value.Owned;
                    break;
                case 16:
                    dvst.burnOut = variable.Value.Owned;
                    break;
                case 17:
                    dvst.artificiallyEnhancedPanels = variable.Value.Owned;
                    break;
                case 18:
                    dvst.stayingPower = variable.Value.Owned;
                    break;
                case 19:
                    dvst.higgsBoson = variable.Value.Owned;
                    break;
                case 20:
                    dvst.androids = variable.Value.Owned;
                    break;
                case 21:
                    dvst.superchargedPower = variable.Value.Owned;
                    break;
                case 22:
                    dvst.dataCenterTree = variable.Value.Owned;
                    break;
                case 23:
                    dvst.workerBoost = variable.Value.Owned;
                    break;
                case 24:
                    dvst.stellarSacrifices = variable.Value.Owned;
                    break;
                case 25:
                    dvst.stellarObliteration = variable.Value.Owned;
                    break;
                case 26:
                    dvst.supernova = variable.Value.Owned;
                    break;
                case 27:
                    dvst.stellarImprovements = variable.Value.Owned;
                    break;
                case 28:
                    dvst.powerUnderwhelming = variable.Value.Owned;
                    break;
                case 29:
                    dvst.powerOverwhelming = variable.Value.Owned;
                    break;
                case 30:
                    dvst.pocketDimensions = variable.Value.Owned;
                    break;
                case 31:
                    dvst.tasteOfPower = variable.Value.Owned;
                    break;
                case 32:
                    dvst.indulgingInPower = variable.Value.Owned;
                    break;
                case 33:
                    dvst.addictionToPower = variable.Value.Owned;
                    break;
                case 34:
                    dvst.rule34 = variable.Value.Owned;
                    break;
                case 35:
                    dvst.progressiveAssembly = variable.Value.Owned;
                    break;
                case 36:
                    dvst.regulatedAcademia = variable.Value.Owned;
                    break;
                case 37:
                    dvst.panelWarranty = variable.Value.Owned;
                    break;
                case 38:
                    dvst.monetaryPolicy = variable.Value.Owned;
                    break;
                case 39:
                    dvst.terraformingProtocols = variable.Value.Owned;
                    break;
                case 40:
                    dvst.productionScaling = variable.Value.Owned;
                    break;
                case 41:
                    dvst.fragmentAssembly = variable.Value.Owned;
                    break;
                case 42:
                    dvst.assemblyMegaLines = variable.Value.Owned;
                    break;
                case 43:
                    dvst.idleElectricSheep = variable.Value.Owned;
                    break;
                case 44:
                    dvst.superSwarm = variable.Value.Owned;
                    break;
                case 45:
                    dvst.megaSwarm = variable.Value.Owned;
                    break;
                case 46:
                    dvst.ultimateSwarm = variable.Value.Owned;
                    break;
                case 47:
                    dvst.purityOfMind = variable.Value.Owned;
                    break;
                case 48:
                    dvst.purityOfBody = variable.Value.Owned;
                    break;
                case 49:
                    dvst.purityOfSEssence = variable.Value.Owned;
                    break;
                case 50:
                    dvst.dysonSubsidies = variable.Value.Owned;
                    break;
                case 51:
                    dvst.oneMinutePlan = variable.Value.Owned;
                    break;
                case 52:
                    dvst.galacticPradigmShift = variable.Value.Owned;
                    break;
                case 53:
                    dvst.panelMaintenance = variable.Value.Owned;
                    break;
                case 54:
                    dvst.worthySacrifice = variable.Value.Owned;
                    break;
                case 55:
                    dvst.endOfTheLine = variable.Value.Owned;
                    break;
                case 56:
                    dvst.manualLabour = variable.Value.Owned;
                    break;
                case 57:
                    dvst.superRadiantScattering = variable.Value.Owned;
                    break;
                case 58:
                    dvst.repeatableResearch = variable.Value.Owned;
                    break;
                case 59:
                    dvst.shouldersOfGiants = variable.Value.Owned;
                    break;
                case 60:
                    dvst.shouldersOfPrecursors = variable.Value.Owned;
                    break;
                case 61:
                    dvst.shouldersOfTheFallen = variable.Value.Owned;
                    break;
                case 62:
                    dvst.shouldersOfTheEnlightened = variable.Value.Owned;
                    break;
                case 63:
                    dvst.shouldersOfTheRevolution = variable.Value.Owned;
                    break;
                case 64:
                    dvst.rocketMania = variable.Value.Owned;
                    break;
                case 65:
                    dvst.idleSpaceFlight = variable.Value.Owned;
                    break;
                case 66:
                    dvst.fusionReactors = variable.Value.Owned;
                    break;
                case 67:
                    dvst.coldFusion = variable.Value.Owned;
                    break;
                case 68:
                    dvst.scientificDominance = variable.Value.Owned;
                    break;
                case 69:
                    dvst.economicDominance = variable.Value.Owned;
                    break;
                case 70:
                    dvst.parallelProcessing = variable.Value.Owned;
                    break;
                case 71:
                    dvst.rudimentarySingularity = variable.Value.Owned;
                    break;
                case 72:
                    dvst.hubbleTelescope = variable.Value.Owned;
                    break;
                case 73:
                    dvst.jamesWebbTelescope = variable.Value.Owned;
                    break;
                case 74:
                    dvst.dimensionalCatCables = variable.Value.Owned;
                    break;
                case 75:
                    dvst.pocketProtectors = variable.Value.Owned;
                    break;
                case 76:
                    dvst.pocketMultiverse = variable.Value.Owned;
                    break;
                case 77:
                    dvst.whatCouldHaveBeen = variable.Value.Owned;
                    break;
                case 78:
                    dvst.shoulderSurgery = variable.Value.Owned;
                    break;
                case 79:
                    dvst.terraFirma = variable.Value.Owned;
                    break;
                case 80:
                    dvst.terraEculeo = variable.Value.Owned;
                    break;
                case 81:
                    dvst.terraInfirma = variable.Value.Owned;
                    break;
                case 82:
                    dvst.terraNullius = variable.Value.Owned;
                    break;
                case 83:
                    dvst.terraNova = variable.Value.Owned;
                    break;
                case 84:
                    dvst.terraGloriae = variable.Value.Owned;
                    break;
                case 85:
                    dvst.terraIrradiant = variable.Value.Owned;
                    break;
                case 86:
                    dvst.paragon = variable.Value.Owned;
                    break;
                case 87:
                    dvst.shepherd = variable.Value.Owned;
                    break;
                case 88:
                    dvst.citadelCouncil = variable.Value.Owned;
                    break;
                case 89:
                    dvst.renegade = variable.Value.Owned;
                    break;
                case 90:
                    dvst.saren = variable.Value.Owned;
                    break;
                case 91:
                    dvst.reapers = variable.Value.Owned;
                    break;
                case 92:
                    dvst.planetAssembly = variable.Value.Owned;
                    break;
                case 93:
                    dvst.shellWorlds = variable.Value.Owned;
                    break;
                case 94:
                    dvst.versatileProductionTactics = variable.Value.Owned;
                    break;
                case 95:
                    dvst.whatWillComeToPass = variable.Value.Owned;
                    break;
                case 96:
                    dvst.solarBubbles = variable.Value.Owned;
                    break;
                case 97:
                    dvst.pocketAndroids = variable.Value.Owned;
                    break;
                case 98:
                    dvst.hypercubeNetworks = variable.Value.Owned;
                    break;
                case 99:
                    dvst.parallelComputation = variable.Value.Owned;
                    break;
                case 100:
                    dvst.quantumComputing = variable.Value.Owned;
                    break;
                case 101:
                    dvst.unsuspiciousAlgorithms = variable.Value.Owned;
                    break;
                case 102:
                    dvst.agressiveAlgorithms = variable.Value.Owned;
                    break;
                case 103:
                    dvst.clusterNetworking = variable.Value.Owned;
                    break;
                case 104:
                    dvst.stellarDominance = variable.Value.Owned;
                    break;
            }
    }
}