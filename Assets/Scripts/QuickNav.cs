using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class QuickNav : MonoBehaviour
{
    [Header("Tabs")] [SerializeField] private GameObject botsTab;
    [SerializeField] private GameObject researchTab;
    [SerializeField] private GameObject wikiTab;
    [SerializeField] private GameObject infinityTab;
    [SerializeField] private GameObject SkillsTab;
    [SerializeField] private GameObject storyTab;

    [Header("Settings")] [SerializeField] private GameObject settingsTab;
    [SerializeField] private GameObject settingsVersionNumber;

    [SerializeField] private GameObject sidepanelButtons;
    [SerializeField] private GameObject bottomButtons;
}