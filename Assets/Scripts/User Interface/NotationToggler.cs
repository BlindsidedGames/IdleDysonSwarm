using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class NotationToggler : MonoBehaviour
{
    [SerializeField] private TMP_Dropdown dropdown;

    private void Start()
    {
        switch (oracle.saveSettings.numberFormatting)
        {
            case NumberTypes.Standard:
                dropdown.value = 0;
                break;
            case NumberTypes.Scientific:
                dropdown.value = 1;
                break;
            case NumberTypes.Engineering:
                dropdown.value = 2;
                break;
        }

        dropdown.onValueChanged.AddListener(SetMode);
    }

    private void SetMode(int value)
    {
        switch (value)
        {
            case 0:
                oracle.saveSettings.numberFormatting = NumberTypes.Standard;
                break;
            case 1:
                oracle.saveSettings.numberFormatting = NumberTypes.Scientific;
                break;
            case 2:
                oracle.saveSettings.numberFormatting = NumberTypes.Engineering;
                break;
        }
    }
}