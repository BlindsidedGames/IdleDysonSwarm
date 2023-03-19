using System;
using System.Collections;
using System.Collections.Generic;
using GooglePlayGames.BasicApi;
using UnityEngine;
using UnityEngine.Audio;
using UnityEngine.UI;

public class SoundController : MonoBehaviour
{
    [SerializeField] private AudioMixer mixer;
    [SerializeField] private Slider music;
    [SerializeField] private Slider buttons;
    [SerializeField] private bool setSlider = true;

    private void Awake()
    {
        if (setSlider)
        {
            music.onValueChanged.AddListener(SetMusicVolume);
            buttons.onValueChanged.AddListener(SetButtonsVolume);
            music.value = PlayerPrefs.GetFloat("musicVolume", .7f);
            buttons.value = PlayerPrefs.GetFloat("buttonVolume", .5f);
        }

        LoadVolume();
    }

    private void Start()
    {
        LoadVolume();
    }

    private void OnApplicationQuit()
    {
        if (setSlider) SaveVolume();
    }

    private void SetMusicVolume(float value)
    {
        mixer.SetFloat("musicVolume", Mathf.Log10(value) * 20);
        PlayerPrefs.SetFloat("musicVolume", music.value);
    }

    private void SetButtonsVolume(float value)
    {
        mixer.SetFloat("buttonVolume", Mathf.Log10(value) * 20);
        PlayerPrefs.SetFloat("buttonVolume", buttons.value);
    }

    private void SaveVolume()
    {
        PlayerPrefs.SetFloat("musicVolume", music.value);
        PlayerPrefs.SetFloat("buttonVolume", buttons.value);
    }

    private void LoadVolume()
    {
        mixer.SetFloat("musicVolume", Mathf.Log10(PlayerPrefs.GetFloat("musicVolume", .7f)) * 20);
        mixer.SetFloat("buttonVolume", Mathf.Log10(PlayerPrefs.GetFloat("buttonVolume", .5f)) * 20);
    }
}