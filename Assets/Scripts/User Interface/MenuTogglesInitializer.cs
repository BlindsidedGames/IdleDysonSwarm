using System;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class MenuTogglesInitializer : MonoBehaviour
{
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    [SerializeField] private Toggle _botsToggle;
    [SerializeField] private Toggle _researchToggle;
    [SerializeField] private Toggle _SkillsToggle;
    [SerializeField] private Toggle _infinityToggle;
    [SerializeField] private Toggle _realityToggle;
    [SerializeField] private Toggle _simulationsToggle;
    [SerializeField] private Toggle _prestigeToggle;
    [SerializeField] private Toggle _storyToggle;
    [SerializeField] private Toggle _wikiToggle;
    [SerializeField] private Toggle _statisticsToggle;
    [SerializeField] private Toggle _settingsToggle;

    [SerializeField] private Image SkillTabInactive;
    [SerializeField] private Image SkillTabInactiveSideMenu;
    [SerializeField] private Color color_White = Color.white;
    [SerializeField] private Color color_Ready;
    private Color startingColourSideMenuSkills;

    private void Start()
    {
        _botsToggle.isOn = oracle.saveSettings.botsButtonToggle;
        _researchToggle.isOn = oracle.saveSettings.researchbuttonToggle;
        _SkillsToggle.isOn = oracle.saveSettings.skillsButtonToggle;
        _infinityToggle.isOn = oracle.saveSettings.infinityFirstRunDone
            ? oracle.saveSettings.infinityButtonToggle
            : !(dvpd.infinityPoints >= 1 || oracle.saveSettings.prestigePlus.points >= 1);
        _realityToggle.isOn = oracle.saveSettings.realityButtonToggle;
        _simulationsToggle.isOn = oracle.saveSettings.simulationsButtonToggle;
        _prestigeToggle.isOn = oracle.saveSettings.prestigeButtonToggle;
        _storyToggle.isOn = oracle.saveSettings.storyButtonToggle;
        _wikiToggle.isOn = oracle.saveSettings.wikiButtonToggle;
        _statisticsToggle.isOn = oracle.saveSettings.statisticsButtonToggle;
        _settingsToggle.isOn = oracle.saveSettings.settingsButtonToggle;
        startingColourSideMenuSkills = SkillTabInactiveSideMenu.color;
    }

    private void Update()
    {
        SkillTabInactive.color = oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree > 0
            ? color_Ready
            : color_White;
        SkillTabInactiveSideMenu.color =
            oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData.skillPointsTree > 0
                ? color_Ready
                : startingColourSideMenuSkills;
    }

    public void SetBots(bool hide)
    {
        oracle.saveSettings.botsButtonToggle = hide;
    }

    public void SetResearch(bool hide)
    {
        oracle.saveSettings.researchbuttonToggle = hide;
    }

    public void SetSkills(bool hide)
    {
        oracle.saveSettings.skillsButtonToggle = hide;
    }

    public void SetInfinity(bool hide)
    {
        oracle.saveSettings.infinityButtonToggle = hide;
    }

    public void SetReality(bool hide)
    {
        oracle.saveSettings.realityButtonToggle = hide;
    }

    public void SetSimulations(bool hide)
    {
        oracle.saveSettings.simulationsButtonToggle = hide;
    }

    public void SetPrestige(bool hide)
    {
        oracle.saveSettings.prestigeButtonToggle = hide;
    }

    public void SeStory(bool hide)
    {
        oracle.saveSettings.storyButtonToggle = hide;
    }

    public void SetWiki(bool hide)
    {
        oracle.saveSettings.wikiButtonToggle = hide;
    }

    public void SetStatistics(bool hide)
    {
        oracle.saveSettings.statisticsButtonToggle = hide;
    }

    public void SetSettings(bool hide)
    {
        oracle.saveSettings.settingsButtonToggle = hide;
    }
}