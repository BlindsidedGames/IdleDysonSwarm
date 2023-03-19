using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class AvocadoMeditation : MonoBehaviour
{
    [SerializeField] private Button firstButton;
    [SerializeField] private Button secondButton;
    [SerializeField] private Button thirdButton;
    [SerializeField] private Button fourthButton;
    [SerializeField] private Button fifthButton;
    [SerializeField] private Button sixthButton;
    [SerializeField] private Button seventhButton;
    private bool first;
    private bool second;
    private bool third;
    private bool fourth;
    private bool fifth;
    private bool sixth;
    private bool seventh;
    [SerializeField] private GameObject avoMeditate;

    private void Start()
    {
        firstButton.onClick.AddListener(() =>
        {
            first = true;
            secondButton.interactable = true;
            CheckIfAllAreTrue();
        });
        secondButton.onClick.AddListener(() =>
        {
            second = true;
            thirdButton.interactable = true;
            CheckIfAllAreTrue();
        });
        thirdButton.onClick.AddListener(() =>
        {
            third = true;
            fourthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        fourthButton.onClick.AddListener(() =>
        {
            fourth = true;
            fifthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        fifthButton.onClick.AddListener(() =>
        {
            fifth = true;
            sixthButton.interactable = true;
            CheckIfAllAreTrue();
        });
        sixthButton.onClick.AddListener(() =>
        {
            sixth = true;
            seventhButton.interactable = true;
            CheckIfAllAreTrue();
        });
        seventhButton.onClick.AddListener(() =>
        {
            seventh = true;
            CheckIfAllAreTrue();
        });
    }

    private void CheckIfAllAreTrue()
    {
        if (first && second && third && fourth && fifth && sixth && seventh) avoMeditate.SetActive(true);
    }
}