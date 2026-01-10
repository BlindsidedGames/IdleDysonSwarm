using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;

public class disclaimerDisabler : MonoBehaviour
{
    [SerializeField] private SlicedFilledImage buttonfill;
    [SerializeField] private Button close;
    private float time;

    private void Start()
    {
        close.interactable = false;
        if (PlayerPrefs.GetInt("disclaimer", 0) == 1) gameObject.SetActive(false);
        close.onClick.AddListener(CloseButton);
    }

    private void CloseButton()
    {
        PlayerPrefs.SetInt("disclaimer", 1);
    }

    private void Update()
    {
        time += Time.deltaTime;
        buttonfill.fillAmount = time / 5;
        if (time >= 5 && close.interactable == false) close.interactable = true;
    }
}
