using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class PatreonNameSetter : MonoBehaviour
{
    private TMP_Text text => GetComponent<TMP_Text>();
    [SerializeField] private Button viewPatreon;

    private void Start()
    {
        viewPatreon.onClick.AddListener(OpenPatreon);
    }

    private void OpenPatreon()
    {
        Application.OpenURL("https://www.patreon.com/BlindsidedGames");
    }

    private void OnEnable()
    {
        SetNames();
    }

    private void SetNames()
    {
        if (string.IsNullOrEmpty(oracle.bsGamesData.patreons))
        {
            StartCoroutine(Retry());
            return;
        }

        text.text = oracle.bsGamesData.patreons;
    }

    private IEnumerator Retry()
    {
        yield return new WaitForSeconds(2);
        SetNames();
    }
}