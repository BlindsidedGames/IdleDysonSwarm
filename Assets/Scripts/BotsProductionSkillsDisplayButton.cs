using System.Collections;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.UI;

public class BotsProductionSkillsDisplayButton : MonoBehaviour
{
    [SerializeField] private GameObject[] toToggle;
    private Button thisButton => GetComponent<Button>();

    private void Start()
    {
        thisButton.onClick.AddListener(Toggle);
    }

    private void Toggle()
    {
        foreach (var VARIABLE in toToggle) VARIABLE.SetActive(!VARIABLE.activeSelf);
    }
}