using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class NotationToggler : MonoBehaviour
{
    [SerializeField] private Toggle toggle;

    private void Start()
    {
        toggle.isOn = oracle.saveSettings.notation;
        toggle.onValueChanged.AddListener(SetToggle);
    }

    private void SetToggle(bool ison)
    {
        oracle.saveSettings.notation = ison;
    }
}