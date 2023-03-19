using UnityEngine;
using static Oracle;

public class Dream1BuildingEnabler : MonoBehaviour
{
    private SaveDataDream1 sd1 => oracle.saveSettings.sdSimulation;
    [SerializeField] private GameObject community;
    [SerializeField] private GameObject housing;
    [SerializeField] private GameObject villages;
    [SerializeField] private GameObject workers;
    [SerializeField] private GameObject cities;
    [SerializeField] private GameObject informationEra;
    [SerializeField] private GameObject education;
    [SerializeField] private GameObject engineering;
    [SerializeField] private GameObject shipping;
    [SerializeField] private GameObject worldTrade;
    [SerializeField] private GameObject worldPeace;
    [SerializeField] private GameObject mathematics;
    [SerializeField] private GameObject advancedPhysics;
    [SerializeField] private GameObject factories;
    [SerializeField] private GameObject robots;
    [SerializeField] private GameObject rockets;
    [SerializeField] private GameObject spaceAge;
    [SerializeField] private GameObject energy;
    [SerializeField] private GameObject solar;
    [SerializeField] private GameObject fusion;
    [SerializeField] private GameObject spaceFactories;
    [SerializeField] private GameObject railguns;
    [SerializeField] private GameObject swarmStats;


    private void Update()
    {
        community.SetActive(sd1.hunters >= 1 || sd1.gatherers >= 1);
        housing.SetActive(sd1.housing >= 1 || sd1.villages >= 1 || sd1.cities >= 1);
        villages.SetActive(sd1.villages >= 1 || sd1.cities >= 1);
        workers.SetActive(sd1.workers >= 1);
        cities.SetActive(sd1.cities >= 1);
        informationEra.SetActive(sd1.cities >= 1);
        education.SetActive(sd1.cities >= 1);
        engineering.SetActive(sd1.cities >= 1);
        shipping.SetActive(sd1.engineeringComplete && sd1.cities >= 1);
        worldTrade.SetActive(sd1.shippingComplete && sd1.cities >= 1);
        worldPeace.SetActive(sd1.worldTradeComplete && sd1.cities >= 1);
        mathematics.SetActive((sd1.rockets >= 1 && sd1.cities >= 1) || (sd1.spaceFactories >= 1 && sd1.cities >= 1));
        advancedPhysics.SetActive(sd1.mathematicsComplete && sd1.spaceFactories >= 1 && sd1.cities >= 1);
        factories.SetActive(sd1.engineeringComplete && sd1.cities >= 1);
        robots.SetActive(sd1.bots >= 1);
        rockets.SetActive(sd1.rockets >= 1 || sd1.spaceFactories >= 1);
        spaceAge.SetActive(sd1.spaceFactories >= 1);
        energy.SetActive(sd1.spaceFactories >= 1);
        solar.SetActive(sd1.spaceFactories >= 1);
        fusion.SetActive(sd1.advancedPhysicsComplete && sd1.spaceFactories >= 1);
        spaceFactories.SetActive(sd1.spaceFactories >= 1);
        railguns.SetActive((sd1.spaceFactories >= 1 && sd1.mathematicsComplete) || sd1.dysonPanels >= 1);
        swarmStats.SetActive(sd1.swarmPanels >= 1);
    }
}