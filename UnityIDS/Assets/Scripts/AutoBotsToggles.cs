using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class AutoBotsToggles : MonoBehaviour
{
    [SerializeField] private Toggle[] _toggles;

    private void Start()
    {
        _toggles[0].isOn = oracle.saveSettings.infinityAutoAssembly;
        _toggles[1].isOn = oracle.saveSettings.infinityAutoManagers;
        _toggles[2].isOn = oracle.saveSettings.infinityAutoServers;
        _toggles[3].isOn = oracle.saveSettings.infinityAutoDataCenters;
        _toggles[4].isOn = oracle.saveSettings.infinityAutoPlanets;
    }

    public void ToggleAssemblyAB(bool t)
    {
        oracle.saveSettings.infinityAutoAssembly = t;
    }

    public void ToggleAiAB(bool t)
    {
        oracle.saveSettings.infinityAutoManagers = t;
    }

    public void ToggleServerAB(bool t)
    {
        oracle.saveSettings.infinityAutoServers = t;
    }

    public void ToggleDataCenterAB(bool t)
    {
        oracle.saveSettings.infinityAutoDataCenters = t;
    }

    public void TogglePlanetAB(bool t)
    {
        oracle.saveSettings.infinityAutoPlanets = t;
    }
}