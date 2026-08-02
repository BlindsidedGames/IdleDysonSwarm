using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;
using Systems.Debugging;
using Systems.Numeric;

public class BotDistributionSlider : MonoBehaviour
{
    [SerializeField] private TMP_Text workers;
    [SerializeField] private TMP_Text researchers;
    [SerializeField] private Slider slider;
    private DysonVersePrestigeData prestigeData => oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;

    private void Start()
    {
        if (!oracle.saveSettings.prestigePlus.botMultitasking)
        {
            slider.value = NumericUiAdapter.ToUnitInterval(
                prestigeData.botDistribution,
                "bot_distribution");
            workers.text = $"{(1f - prestigeData.botDistribution).ToString("P0")}";
            researchers.text = $"{prestigeData.botDistribution.ToString("P0")}";
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
        slider.value = NumericUiAdapter.ToUnitInterval(
            prestigeData.botDistribution,
            "bot_distribution");
        Slide(slider.value);
    }

    public void Slide(float f)
    {
        if (!oracle.saveSettings.prestigePlus.botMultitasking)
        {
            if (float.IsNaN(f) || float.IsInfinity(f))
            {
                NumericDiagnostics.Report("NS-UI-NONFINITE", "adapter=bot_distribution_input");
                f = 0f;
            }
            f = Mathf.Round(f * 100f) / 100f;
            prestigeData.botDistribution = f;
            // Debug.Log(SaveSystem.Instance.saveData.botDistribution);
            workers.text = $"{(1f - prestigeData.botDistribution).ToString("P0")}";
            researchers.text = $"{prestigeData.botDistribution.ToString("P0")}";

            // Keep the active preset slot in sync as the player tweaks this slider.
            oracle.SyncSelectedPresetBotDistributionFromCurrent();
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
