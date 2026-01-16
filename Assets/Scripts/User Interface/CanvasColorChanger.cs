using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class CanvasColorChanger : MonoBehaviour
{
    [Header("Bottom Bar (Overlay Mode)")]
    [SerializeField] private Image bottomBar;
    [SerializeField] private Image bottomBarButtonScrollBar;
    [SerializeField] private Image bottomBarLip;

    [Header("Side Panel - Overlay")]
    [SerializeField] private Image background;
    [SerializeField] private Image sidePanelMain;
    [SerializeField] private Image sidePanelBoarder;
    [SerializeField] private Image sidePanelBoarderGradient;
    [SerializeField] private Image sidePanelBar;
    [SerializeField] private Image sidePanelBarHandle;
    [SerializeField] private Image sidePanelGradientTop;
    [SerializeField] private Image sidePanelGradientbot;

    [Header("Side Panel - Permanent")]
    [SerializeField] private Image permanentBackground;
    [SerializeField] private Image permanentBoarder;
    [SerializeField] private Image permanentBoarderGradient;
    [SerializeField] private Image permanentTopFader;
    [SerializeField] private Image permanentBottomFader;


    public void ChangeColours(Color c1, Color c2, Color c3)
    {
        // Overlay panel colors
        if (background != null) background.color = c1;
        if (sidePanelGradientTop != null) sidePanelGradientTop.color = c1;
        if (sidePanelGradientbot != null) sidePanelGradientbot.color = c1;
        if (sidePanelMain != null) sidePanelMain.color = c1;
        if (sidePanelBoarderGradient != null) sidePanelBoarderGradient.color = c1;
        if (bottomBarLip != null) bottomBarLip.color = c2;
        if (bottomBarButtonScrollBar != null) bottomBarButtonScrollBar.color = c2;
        if (sidePanelBoarder != null) sidePanelBoarder.color = c2;
        if (sidePanelBarHandle != null) sidePanelBarHandle.color = c2;
        if (bottomBar != null) bottomBar.color = c3;

        // Permanent panel colors (same color scheme)
        if (permanentBackground != null) permanentBackground.color = c1;
        if (permanentBoarderGradient != null) permanentBoarderGradient.color = c1;
        if (permanentTopFader != null) permanentTopFader.color = c1;
        if (permanentBottomFader != null) permanentBottomFader.color = c1;
        if (permanentBoarder != null) permanentBoarder.color = c2;
    }

    #region Singleton class: Oracle

    public static CanvasColorChanger CanVasColourChanger;


    private void Awake()
    {
        if (CanVasColourChanger == null)
            CanVasColourChanger = this;
        else
            Destroy(gameObject);
    }

    #endregion
}