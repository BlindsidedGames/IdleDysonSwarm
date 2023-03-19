using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class CanvasColorChanger : MonoBehaviour
{
    [SerializeField] private Image bottomBar;
    [SerializeField] private Image bottomBarButtonScrollBar;
    [SerializeField] private Image bottomBarLip;
    [SerializeField] private Image background;
    [SerializeField] private Image researchBackground;
    [SerializeField] private Image sidePanelMain;
    [SerializeField] private Image sidePanelBoarder;
    [SerializeField] private Image sidePanelBoarderGradient;


    public void ChangeColours(Color c1, Color c2, Color c3)
    {
        background.color = c1;
        researchBackground.color = c1;
        sidePanelMain.color = c1;
        sidePanelBoarderGradient.color = c1;
        bottomBarLip.color = c2;
        bottomBarButtonScrollBar.color = c2;
        sidePanelBoarder.color = c2;
        bottomBar.color = c3;
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