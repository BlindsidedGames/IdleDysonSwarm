using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class BotDistributionSlider : MonoBehaviour
{
    [SerializeField] private TMP_Text workers;
    [SerializeField] private TMP_Text researchers;
    [SerializeField] private Slider slider;
    private DysonVersePrestigeData dvpd => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Start()
    {
        if (!oracle.saveSettings.prestigePlus.botMultitasking)
        {
            slider.value = (float)dvpd.botDistribution;
            workers.text = $"{(1f - dvpd.botDistribution).ToString("P0")}";
            researchers.text = $"{dvpd.botDistribution.ToString("P0")}";
        }
        else
        {
            slider.value = .5f;
            slider.interactable = false;
            workers.text = $"{1:P0}";
            researchers.text = $"{1:P0}";
        }
    }

    public void SetSlider()
    {
        slider.value = (float)dvpd.botDistribution;
        Slide(slider.value);
    }

    public void Slide(float f)
    {
        if (!oracle.saveSettings.prestigePlus.botMultitasking)
        {
            f = Mathf.Round(f * 100f) / 100f;
            dvpd.botDistribution = f;
            // Debug.Log(SaveSystem.Instance.saveData.botDistribution);
            workers.text = $"{(1f - dvpd.botDistribution).ToString("P0")}";
            researchers.text = $"{dvpd.botDistribution.ToString("P0")}";
        }
        else
        {
            slider.value = .5f;
            slider.interactable = false;
            workers.text = $"{1:P0}";
            researchers.text = $"{1:P0}";
        }
    }
}