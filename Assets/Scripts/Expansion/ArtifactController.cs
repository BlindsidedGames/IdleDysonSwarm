using Blindsided.ProceduralUIImage;
using Blindsided.Utilities;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using TMPro;
using UnityEngine;
using static Expansion.Oracle;

/*
Purpose (runtime): Updates artifact translation text and animation pacing in the Reality UI.

Primary entry points:
- Unity: Start (reset timer), Update (animate and refresh translation text).

Owns vs delegates:
- Owns artifact text replacement + fill timing behavior.
- Delegates upgrade ownership checks to SimulationUpgradeStateAccessor and tuning reads to BalanceRuntime.

Interacts with:
- Assets/Scripts/Systems/Balance/BalanceRuntime.cs
- Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs
- Assets/Scripts/Data/Balance/RealitySystemTuning.cs

Change notes:
- Translation/speed behavior now reads tuning rules first and falls back to legacy hardcoded behavior.
- Upgrade keys used in tuning rules must map to existing save flags (SaveDataPrestige or SaveData).
*/
public class ArtifactController : MonoBehaviour
{
    /// <summary>
    /// Fill image for the artifact progress bar.
    /// </summary>
    [SerializeField] private ProceduralUIImage artifactFill;

    /// <summary>
    /// Main artifact translation label.
    /// </summary>
    [SerializeField] private TMP_Text theArtifactText;

    /// <summary>
    /// Secondary label shown while speed upgrades are incomplete.
    /// </summary>
    [SerializeField] private TMP_Text artifactBarUndefinedText;

    /// <summary>
    /// Internal artifact timer accumulator.
    /// </summary>
    private float artifactTime;

    /// <summary>
    /// Shortcut to prestige save data.
    /// </summary>
    private SaveDataPrestige Prestige => oracle.saveSettings.sdPrestige;

    /// <summary>
    /// Resets the artifact timer.
    /// </summary>
    private void Start()
    {
        artifactTime = 0;
    }

    /// <summary>
    /// Applies translation text updates and animation speed every frame.
    /// </summary>
    private void Update()
    {
        SaveDataPrestige prestige = Prestige;
        if (prestige == null)
        {
            return;
        }

        artifactBarUndefinedText.text = IsUpgradeOwned("speed8")
            ? "<color=white>CPU Time"
            : "Undefined";

        if (IsUpgradeOwned("speed8"))
        {
            theArtifactText.text = BuildTranslationText();
            artifactFill.fillAmount = 0;
            return;
        }

        int speed = ResolveTickSpeed();
        artifactTime += speed * Time.deltaTime;
        artifactFill.fillAmount = artifactTime;

        if (artifactTime < 1f)
        {
            return;
        }

        theArtifactText.text = BuildTranslationText().Scramble();
        artifactTime = 0f;
    }

    /// <summary>
    /// Resolves current artifact tick speed from tuning rules or legacy defaults.
    /// </summary>
    /// <returns>Configured tick speed for the current upgrade state.</returns>
    private int ResolveTickSpeed()
    {
        RealitySystemTuning tuning = BalanceRuntime.RealityTuning;
        if (tuning != null && tuning.artifactSpeedRules != null && tuning.artifactSpeedRules.Count > 0)
        {
            int speed = 60;
            for (int i = 0; i < tuning.artifactSpeedRules.Count; i++)
            {
                ArtifactSpeedRule rule = tuning.artifactSpeedRules[i];
                if (rule == null || string.IsNullOrWhiteSpace(rule.upgradeKey))
                {
                    continue;
                }

                if (IsUpgradeOwned(rule.upgradeKey))
                {
                    speed = Mathf.Max(1, rule.tickInterval);
                }
            }

            return speed;
        }

        if (IsUpgradeOwned("speed7")) return 6;
        if (IsUpgradeOwned("speed6")) return 15;
        if (IsUpgradeOwned("speed5")) return 30;
        if (IsUpgradeOwned("speed4")) return 42;
        if (IsUpgradeOwned("speed3")) return 48;
        if (IsUpgradeOwned("speed2")) return 54;
        if (IsUpgradeOwned("speed1")) return 57;
        return 60;
    }

    /// <summary>
    /// Builds the visible translation string for the artifact text.
    /// </summary>
    /// <returns>Localized artifact string with locked characters obfuscated.</returns>
    private string BuildTranslationText()
    {
        string text = "The Artifact";

        RealitySystemTuning tuning = BalanceRuntime.RealityTuning;
        if (tuning != null && tuning.artifactTranslationRules != null && tuning.artifactTranslationRules.Count > 0)
        {
            for (int i = 0; i < tuning.artifactTranslationRules.Count; i++)
            {
                ArtifactTranslationRule rule = tuning.artifactTranslationRules[i];
                if (rule == null ||
                    string.IsNullOrWhiteSpace(rule.upgradeKey) ||
                    string.IsNullOrEmpty(rule.source))
                {
                    continue;
                }

                if (!IsUpgradeOwned(rule.upgradeKey))
                {
                    text = text.Replace(rule.source, rule.replacement);
                }
            }

            return text;
        }

        if (!IsUpgradeOwned("translation1")) text = text.Replace("i", "|");
        if (!IsUpgradeOwned("translation2")) text = text.Replace("r", "}");
        if (!IsUpgradeOwned("translation3")) text = text.Replace("e", "%");
        if (!IsUpgradeOwned("translation4")) text = text.Replace("f", "$");
        if (!IsUpgradeOwned("translation5")) text = text.Replace("c", "{");
        if (!IsUpgradeOwned("translation6")) text = text.Replace("h", "*");
        if (!IsUpgradeOwned("translation7")) text = text.Replace("a", "@");
        if (!IsUpgradeOwned("translation7")) text = text.Replace("A", "#");
        if (!IsUpgradeOwned("translation8")) text = text.Replace("t", "^");
        if (!IsUpgradeOwned("translation8")) text = text.Replace("T", "&");
        return text;
    }

    /// <summary>
    /// Resolves whether an upgrade key is owned using existing save fields.
    /// </summary>
    /// <param name="key">Upgrade key.</param>
    /// <returns>True when the mapped save flag is set.</returns>
    private bool IsUpgradeOwned(string key)
    {
        return SimulationUpgradeStateAccessor.TryGetOwned(
            key,
            oracle.saveSettings.sdPrestige,
            oracle.saveSettings.saveData,
            out bool owned) && owned;
    }
}
