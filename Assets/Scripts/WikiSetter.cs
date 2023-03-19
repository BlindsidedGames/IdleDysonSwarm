using System;
using UnityEngine;

public class WikiSetter : MonoBehaviour
{
    [SerializeField] private ButtonThings bots;
    [SerializeField] private ButtonThings research;
    [SerializeField] private ButtonThings skills;
    [SerializeField] private ButtonThings infinity;
    [SerializeField] private ButtonThings quantumLeap;
    [SerializeField] private ButtonThings reality;
    [SerializeField] private ButtonThings simulations;
    [SerializeField] private ButtonThings story;
    [SerializeField] private ButtonThings wiki;
    [SerializeField] private ButtonThings settings;

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.LeftCommand) && Input.GetKeyDown(KeyCode.Comma))
        {
            settings.GroupEnableDisableMenu();
            settings.SetCanvasColors();
        }
    }

    private void Start()
    {
        switch (PlayerPrefs.GetInt("initialScreen", 8))
        {
            case 1:
                bots.GroupEnableDisableMenu();
                bots.SetCanvasColors();
                break;
            case 2:
                research.GroupEnableDisableMenu();
                research.SetCanvasColors();
                break;
            case 3:
                skills.GroupEnableDisableMenu();
                skills.SetCanvasColors();
                break;
            case 4:
                infinity.GroupEnableDisableMenu();
                infinity.SetCanvasColors();
                break;
            case 5:
                quantumLeap.GroupEnableDisableMenu();
                quantumLeap.SetCanvasColors();
                break;
            case 6:
                reality.GroupEnableDisableMenu();
                reality.SetCanvasColors();
                break;
            case 7:
                simulations.GroupEnableDisableMenu();
                simulations.SetCanvasColors();
                break;
            case 8:
                story.GroupEnableDisableMenu();
                story.SetCanvasColors();
                break;
            case 9:
                wiki.GroupEnableDisableMenu();
                wiki.SetCanvasColors();
                break;
            case 10:
                settings.GroupEnableDisableMenu();
                settings.SetCanvasColors();
                break;
        }
    }
}