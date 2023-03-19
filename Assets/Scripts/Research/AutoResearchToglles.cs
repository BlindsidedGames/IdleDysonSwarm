using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class AutoResearchToglles : MonoBehaviour
{
    [SerializeField] private Toggle[] _toggles;

    private void Start()
    {
        _toggles[0].isOn = oracle.saveSettings.infinityAutoResearchToggleScience;
        _toggles[1].isOn = oracle.saveSettings.infinityAutoResearchToggleMoney;
        _toggles[2].isOn = oracle.saveSettings.infinityAutoResearchToggleAssembly;
        _toggles[3].isOn = oracle.saveSettings.infinityAutoResearchToggleAi;
        _toggles[4].isOn = oracle.saveSettings.infinityAutoResearchToggleServer;
        _toggles[5].isOn = oracle.saveSettings.infinityAutoResearchToggleDataCenter;
        _toggles[6].isOn = oracle.saveSettings.infinityAutoResearchTogglePlanet;
    }

    public void ToggleScienceAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleScience = t;
    }

    public void ToggleMoneyAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleMoney = t;
    }

    public void ToggleAssemblyAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleAssembly = t;
    }

    public void ToggleAiAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleAi = t;
    }

    public void ToggleServerAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleServer = t;
    }

    public void ToggleDataCenterAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchToggleDataCenter = t;
    }

    public void TogglePlanetAR(bool t)
    {
        oracle.saveSettings.infinityAutoResearchTogglePlanet = t;
    }
}