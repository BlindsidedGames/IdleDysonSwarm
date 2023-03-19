using System;
using SA.iOS.GameKit;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using static LoadScreenMethods;
using static PlayfabManager;
using static Oracle;
using static CanvasColorChanger;

public class ButtonThings : MonoBehaviour
{
    [SerializeField] private ParticleSystem part;
    [SerializeField] private TMP_Text amounts;

    [SerializeField] private int defaultScreen;
    [SerializeField] private GameObject[] toDisable;
    [SerializeField] private GameObject[] toEnable;
    [SerializeField] private GameObject toToggle;

    [SerializeField] private bool groupEnableDisableOnStart;

    [SerializeField] private GroupDisable _groupDisable;

    [SerializeField] private Color background;
    [SerializeField] private Color bottomLip;
    [SerializeField] private Color bottomPanel;


    private void Start()
    {
        if (groupEnableDisableOnStart) GroupEnableDisable();
    }

    public void SetFPS(int fps)
    {
        Application.targetFrameRate = fps;
        oracle.saveSettings.frameRate = fps;
    }

    public void SetCanvasColors()
    {
        CanVasColourChanger.ChangeColours(background, bottomLip, bottomPanel);
    }

    public void SetMaxFPS()
    {
        var rate = Screen.currentResolution.refreshRate;
        Application.targetFrameRate = rate;
        oracle.saveSettings.frameRate = rate;
    }

    public void ToggleFullscreen()
    {
        Screen.fullScreen = !Screen.fullScreen;
    }

    public void WipeExpansionSave()
    {
        oracle.WipeSaveData();
    }

    public void LoadSceneByInt(int scene)
    {
        SceneManager.LoadScene(scene);
    }

    public void LoadDysonVerse(int scene)
    {
        SceneManager.LoadScene(scene);
    }

    public void ToggleObject()
    {
        toToggle.SetActive(!toToggle.activeSelf);
    }

    public void GroupEnable()
    {
        for (var i = 0; i < toEnable.Length; i++) toEnable[i].SetActive(true);
    }

    public void GroupDisable()
    {
        for (var i = 0; i < toDisable.Length; i++) toDisable[i].SetActive(false);
    }

    public void GroupEnableDisable()
    {
        GroupDisable();
        GroupEnable();
    }

    public void GroupEnableDisableMenu()
    {
        for (var i = 0; i < _groupDisable.ToDisable.Length; i++) _groupDisable.ToDisable[i].SetActive(false);
        for (var i = 0; i < _groupDisable.ToEnable.Length; i++) _groupDisable.ToEnable[i].SetActive(true);
        GroupEnable();
        GroupDisable();
        PlayerPrefs.SetInt("initialScreen", defaultScreen);
    }

    public void ShowGameCenter()
    {
        var viewController = new ISN_GKGameCenterViewController();
        viewController.ViewState = ISN_GKGameCenterViewControllerState.Default;
        viewController.Show();
    }

    public void SetWithSLider(float amount)
    {
        var emissionModule = part.emission;
        emissionModule.rateOverTime = amount;
        amounts.text = amount + "/s";
    }

    public void OpenUrl()
    {
        Application.OpenURL(oracle.bsGamesData.idleDysonSwarm);
    }

    public void TipsPc()
    {
        Application.OpenURL("https://www.paypal.com/paypalme/BlindsidedGames");
    }

    public void OpenDysonVersePlayfab()
    {
        lsm.OpenPlayfabDysonVerse();
    }

    public void CloseDysonVersePlayfab()
    {
        lsm.ClosePlayfabDysonVerse();
    }

    public void SendSaveDysonVerse()
    {
        oracle.SaveExpansion();
    }

    public void LoadSaveDysonVerse()
    {
        oracle.LoadExpansion();
    }

    public void GetLeaderboardInfinity(string type)
    {
        playfabManager.GetLeaderboardInfinityType(type);
    }
}