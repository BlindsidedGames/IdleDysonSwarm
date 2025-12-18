using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

public class AvocadoFeeder : MonoBehaviour
{
    private PrestigePlus pp => oracle.saveSettings.prestigePlus;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;
    private SaveData sd => oracle.saveSettings.saveData;

    [SerializeField] private Button feedIP;
    [SerializeField] private Button feedInfluence;
    [SerializeField] private Button feedStrangeMatter;
    [SerializeField] private TMP_Text feedIpText;
    [SerializeField] private TMP_Text feedInfulenceText;
    [SerializeField] private TMP_Text feedStrangeMatterText;
    [SerializeField] private TMP_Text overflowText;
    [SerializeField] private TMP_Text totalBoostText;

    private void Start()
    {
        feedIP.onClick.AddListener(FeedIP);
        feedInfluence.onClick.AddListener(FeedInfluence);
        feedStrangeMatter.onClick.AddListener(FeedIStrangeMatter);
        UpdateText();
    }

    private void FeedIP()
    {
        if (dvpd.infinityPoints - dvpd.spentInfinityPoints > 0)
        {
            pp.avocatoIP += dvpd.infinityPoints - dvpd.spentInfinityPoints;
            dvpd.infinityPoints -= dvpd.infinityPoints - dvpd.spentInfinityPoints;
            UpdateText();
        }
    }

    private void FeedInfluence()
    {
        if (sd.influence > 0)
        {
            pp.avocatoInfluence += sd.influence;
            sd.influence -= sd.influence;
            UpdateText();
        }
    }

    private void FeedIStrangeMatter()
    {
        if (sp.strangeMatter > 0)
        {
            pp.avocatoStrangeMatter += sp.strangeMatter;
            sp.strangeMatter -= sp.strangeMatter;
            UpdateText();
        }
    }

    public void UpdateText()
    {
        gameObject.SetActive(pp.avocatoPurchased);
        double infinity = pp.avocatoIP >= 10 ? Math.Log10(pp.avocatoIP) : 0;
        double influence = pp.avocatoInfluence >= 10 ? Math.Log10(pp.avocatoInfluence) : 0;
        double sm = pp.avocatoStrangeMatter >= 10 ? Math.Log10(pp.avocatoStrangeMatter) : 0;
        double overflow = 1 + pp.avocatoOverflow;

        feedIpText.text =
            $"Infinity Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(infinity)}";
        feedInfulenceText.text =
            $"Influence Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(influence)}";
        feedStrangeMatterText.text =
            $"Strange Matter Multiplier - <color=#00E1FF>x{CalcUtils.FormatNumber(sm)}";
        overflowText.text = $"Overflow - <color=#00E1FF>x{CalcUtils.FormatNumber(overflow)}";

        totalBoostText.text =
            $"Total boost to Cash, Science, and Buildings - <color=#00E1FF>x{CalcUtils.FormatNumber(infinity * influence * sm * overflow)}";
    }
}