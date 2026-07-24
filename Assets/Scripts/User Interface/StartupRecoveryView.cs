/*
 * Purpose: Presents the blocking, player-facing Stage 3 save recovery experience on the persistent Load-scene canvas.
 * Runs: Runtime only when startup cannot safely select and publish a save.
 * Primary entry points: Show.
 * Owns: Plain-language status, explicit clipboard/export actions, and two-step reset confirmation.
 * Delegates: Save decisions/import/export to StartupRecoveryInteractionSession and reset/reload to Oracle callbacks.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/LoadScreenMethods.cs (persistent Load-scene canvas host).
 * - Assets/Scripts/Expansion/Oracle.StartupRecovery.cs.
 * - Assets/Scripts/Systems/Save/StartupRecoveryInteractionSession.cs.
 *
 * Change notes:
 * - The view must not decode, migrate, validate, delete, or publish save data itself.
 * - Gameplay time remains paused while the view is blocking and is restored before reset/reload.
 * - Permanent reset requires a separate arm action followed by an explicit confirm action.
 */

using System;
using System.IO;
using Systems.Save;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Builds and controls the blocking startup save-recovery panel.
/// </summary>
public sealed class StartupRecoveryView : MonoBehaviour
{
    private const float PanelWidth = 1120f;
    private const float PanelHeight = 1200f;

    private StartupRecoveryInteractionSession _session;
    private readonly StartupRecoveryResetGate _resetGate = new StartupRecoveryResetGate();
    private Action _confirmedReset;
    private Action _importSucceeded;
    private GameObject _root;
    private GameObject _resetConfirmation;
    private TMP_Text _status;
    private TMP_Text _details;
    private TMP_Text _feedback;
    private float _previousTimeScale = 1f;
    private bool _paused;

    /// <summary>
    /// Displays one immutable blocked result and wires explicit player actions.
    /// </summary>
    /// <param name="session">The recovery interaction service.</param>
    /// <param name="confirmedReset">The callback after the second destructive-reset confirmation.</param>
    /// <param name="importSucceeded">The callback after verified clipboard import commits.</param>
    public void Show(
        StartupRecoveryInteractionSession session,
        Action confirmedReset,
        Action importSucceeded)
    {
        _session = session ?? throw new ArgumentNullException(nameof(session));
        _confirmedReset = confirmedReset ?? throw new ArgumentNullException(nameof(confirmedReset));
        _importSucceeded = importSucceeded ?? throw new ArgumentNullException(nameof(importSucceeded));

        EnsureUi();
        _root.SetActive(true);
        _resetGate.Cancel();
        _resetConfirmation.SetActive(false);
        _status.text = BuildPlainLanguageStatus(session.Result);
        _details.text = BuildArtifactSummary(session.Result);
        _feedback.text = "Nothing has been deleted or overwritten.";
        PauseGameplay();
    }

    /// <summary>
    /// Restores gameplay time if this blocking view is destroyed unexpectedly.
    /// </summary>
    private void OnDestroy()
    {
        ReleaseGameplayPause();
    }

    /// <summary>
    /// Creates the runtime panel once under the persistent Load-scene canvas.
    /// </summary>
    private void EnsureUi()
    {
        if (_root != null)
        {
            return;
        }

        _root = CreateUiObject("Startup Save Recovery", transform);
        RectTransform rootRect = _root.GetComponent<RectTransform>();
        rootRect.anchorMin = Vector2.zero;
        rootRect.anchorMax = Vector2.one;
        rootRect.offsetMin = Vector2.zero;
        rootRect.offsetMax = Vector2.zero;

        Image blocker = _root.AddComponent<Image>();
        blocker.color = new Color(0.015f, 0.02f, 0.035f, 0.98f);
        blocker.raycastTarget = true;

        GameObject panel = CreateUiObject("Recovery Panel", _root.transform);
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.5f, 0.5f);
        panelRect.anchorMax = new Vector2(0.5f, 0.5f);
        panelRect.pivot = new Vector2(0.5f, 0.5f);
        panelRect.sizeDelta = new Vector2(PanelWidth, PanelHeight);
        panelRect.anchoredPosition = Vector2.zero;
        Image panelImage = panel.AddComponent<Image>();
        panelImage.color = new Color(0.055f, 0.07f, 0.11f, 1f);

        VerticalLayoutGroup layout = panel.AddComponent<VerticalLayoutGroup>();
        layout.padding = new RectOffset(54, 54, 44, 44);
        layout.spacing = 18f;
        layout.childAlignment = TextAnchor.UpperCenter;
        layout.childControlHeight = false;
        layout.childControlWidth = true;
        layout.childForceExpandHeight = false;

        CreateText(panel.transform, "SAVE RECOVERY", 48f, FontStyles.Bold, 78f);
        _status = CreateText(panel.transform, string.Empty, 31f, FontStyles.Bold, 150f);
        _details = CreateText(panel.transform, string.Empty, 23f, FontStyles.Normal, 155f);
        _feedback = CreateText(panel.transform, string.Empty, 22f, FontStyles.Italic, 78f);

        CreateButton(panel.transform, "Copy Primary Save", CopyPrimarySave);
        CreateButton(panel.transform, "Copy Recovery Details", CopyRecoveryDetails);
        CreateButton(panel.transform, "Export Save Artifacts", ExportArtifacts);
        CreateButton(panel.transform, "Import Save from Clipboard", ImportFromClipboard);
        CreateButton(panel.transform, "Reset Save...", ArmReset);

        _resetConfirmation = CreateUiObject("Reset Confirmation", panel.transform);
        LayoutElement confirmationLayout = _resetConfirmation.AddComponent<LayoutElement>();
        confirmationLayout.preferredHeight = 132f;
        VerticalLayoutGroup confirmationGroup = _resetConfirmation.AddComponent<VerticalLayoutGroup>();
        confirmationGroup.spacing = 8f;
        confirmationGroup.childControlHeight = false;
        confirmationGroup.childControlWidth = true;
        confirmationGroup.childForceExpandHeight = false;
        CreateText(
            _resetConfirmation.transform,
            "This permanently deletes the current save and backups. Export first if you may need support.",
            21f,
            FontStyles.Bold,
            58f);
        GameObject confirmationButtons = CreateUiObject("Confirmation Buttons", _resetConfirmation.transform);
        LayoutElement buttonRowLayout = confirmationButtons.AddComponent<LayoutElement>();
        buttonRowLayout.preferredHeight = 62f;
        HorizontalLayoutGroup buttonRow = confirmationButtons.AddComponent<HorizontalLayoutGroup>();
        buttonRow.spacing = 18f;
        buttonRow.childControlHeight = true;
        buttonRow.childControlWidth = true;
        buttonRow.childForceExpandWidth = true;
        CreateButton(confirmationButtons.transform, "Cancel Reset", CancelReset, 62f);
        CreateButton(confirmationButtons.transform, "Confirm Permanent Reset", ConfirmReset, 62f);
        _resetConfirmation.SetActive(false);
    }

    /// <summary>
    /// Copies the raw primary canonical artifact only after an explicit button press.
    /// </summary>
    private void CopyPrimarySave()
    {
        if (_session.TryGetPrimaryText(out string text, out string error))
        {
            GUIUtility.systemCopyBuffer = text;
            _feedback.text = "Primary save copied to the clipboard. The source file was not changed.";
            return;
        }

        _feedback.text = $"Primary save could not be copied: {error}";
    }

    /// <summary>
    /// Copies classified artifact paths and failure details for support.
    /// </summary>
    private void CopyRecoveryDetails()
    {
        GUIUtility.systemCopyBuffer = _session.BuildSupportReport();
        _feedback.text = "Recovery details copied to the clipboard.";
    }

    /// <summary>
    /// Creates a new local support bundle without changing source artifacts.
    /// </summary>
    private void ExportArtifacts()
    {
        string exportRoot = Path.Combine(Application.persistentDataPath, "save_recovery_exports");
        bool succeeded = _session.TryExportArtifacts(exportRoot, out string folder, out string error);
        _feedback.text = succeeded
            ? $"Save artifacts exported to:\n{folder}"
            : $"Export finished with warnings at:\n{folder}\n{error}";
    }

    /// <summary>
    /// Prepares and commits clipboard text, then requests a clean startup reload on success.
    /// </summary>
    private void ImportFromClipboard()
    {
        string clipboardText = GUIUtility.systemCopyBuffer;
        if (string.IsNullOrWhiteSpace(clipboardText))
        {
            _feedback.text = "Clipboard is empty. Copy an Idle Dyson Swarm save string first.";
            return;
        }

        if (!_session.TryImportClipboardText(clipboardText, out string error))
        {
            _feedback.text = $"Clipboard save was not imported: {error}";
            return;
        }

        _feedback.text = "Save imported and verified. Restarting safely...";
        ReleaseGameplayPause();
        _root.SetActive(false);
        _importSucceeded();
    }

    /// <summary>
    /// Reveals the separate permanent-reset confirmation controls.
    /// </summary>
    private void ArmReset()
    {
        _resetGate.Arm();
        _resetConfirmation.SetActive(true);
        _feedback.text = "Reset is armed. Read the warning, then confirm or cancel.";
    }

    /// <summary>
    /// Cancels a previously armed reset without changing any data.
    /// </summary>
    private void CancelReset()
    {
        _resetGate.Cancel();
        _resetConfirmation.SetActive(false);
        _feedback.text = "Reset cancelled. No data was changed.";
    }

    /// <summary>
    /// Invokes the destructive reset only after the distinct confirmation button is pressed.
    /// </summary>
    private void ConfirmReset()
    {
        if (!_resetGate.IsArmed)
        {
            _feedback.text = "Reset confirmation expired. Arm reset again.";
            _resetConfirmation.SetActive(false);
            return;
        }

        ReleaseGameplayPause();
        _root.SetActive(false);
        _resetGate.TryConfirm(_confirmedReset);
    }

    /// <summary>
    /// Pauses scaled gameplay while leaving unscaled UI input responsive.
    /// </summary>
    private void PauseGameplay()
    {
        if (_paused)
        {
            return;
        }

        _previousTimeScale = Time.timeScale;
        Time.timeScale = 0f;
        _paused = true;
    }

    /// <summary>
    /// Restores the exact time scale that existed before blocking.
    /// </summary>
    private void ReleaseGameplayPause()
    {
        if (!_paused)
        {
            return;
        }

        Time.timeScale = _previousTimeScale;
        _paused = false;
    }

    /// <summary>
    /// Maps classified startup outcomes to plain player-facing language.
    /// </summary>
    /// <param name="result">The blocked startup result.</param>
    /// <returns>The player-facing status.</returns>
    private static string BuildPlainLanguageStatus(StartupSaveRecoveryResult result)
    {
        return result.Status switch
        {
            StartupSaveRecoveryStatus.UnsupportedFutureVersion =>
                "This save was created by a newer game version. It has been preserved unchanged. " +
                "Install the newer version or export the files for support.",
            StartupSaveRecoveryStatus.RecoveryWriteFailed =>
                "A valid recovery save was found, but it could not be restored safely. " +
                "Your previous save remains preserved.",
            _ =>
                "We could not safely load any discovered save. Nothing was deleted or overwritten. " +
                "Import a known-good save, export the files for support, or explicitly reset."
        };
    }

    /// <summary>
    /// Summarizes discovered artifact count, blocking classification, and support location.
    /// </summary>
    /// <param name="result">The blocked startup result.</param>
    /// <returns>A concise player-facing artifact summary.</returns>
    private static string BuildArtifactSummary(StartupSaveRecoveryResult result)
    {
        string selectedPath = string.IsNullOrWhiteSpace(result.SelectedCandidate?.Path)
            ? "See Copy Recovery Details for artifact locations."
            : $"Relevant artifact: {result.SelectedCandidate.Path}";
        return
            $"Status: {result.Status}\n" +
            $"Discovered artifacts: {result.Artifacts.Count}\n" +
            selectedPath;
    }

    /// <summary>
    /// Creates a RectTransform-backed UI object.
    /// </summary>
    /// <param name="name">The object name.</param>
    /// <param name="parent">The UI parent.</param>
    /// <returns>The created object.</returns>
    private static GameObject CreateUiObject(string name, Transform parent)
    {
        var uiObject = new GameObject(name, typeof(RectTransform));
        uiObject.transform.SetParent(parent, worldPositionStays: false);
        return uiObject;
    }

    /// <summary>
    /// Creates a TextMesh Pro label with a fixed layout height.
    /// </summary>
    /// <param name="parent">The UI parent.</param>
    /// <param name="text">The initial label.</param>
    /// <param name="fontSize">The font size.</param>
    /// <param name="style">The font style.</param>
    /// <param name="height">The preferred layout height.</param>
    /// <returns>The created label.</returns>
    private static TMP_Text CreateText(
        Transform parent,
        string text,
        float fontSize,
        FontStyles style,
        float height)
    {
        GameObject textObject = CreateUiObject("Text", parent);
        var label = textObject.AddComponent<TextMeshProUGUI>();
        label.text = text;
        label.fontSize = fontSize;
        label.fontStyle = style;
        label.color = Color.white;
        label.alignment = TextAlignmentOptions.Center;
        label.textWrappingMode = TextWrappingModes.Normal;
        label.raycastTarget = false;
        LayoutElement layout = textObject.AddComponent<LayoutElement>();
        layout.preferredHeight = height;
        return label;
    }

    /// <summary>
    /// Creates a styled explicit-action button.
    /// </summary>
    /// <param name="parent">The UI parent.</param>
    /// <param name="label">The button label.</param>
    /// <param name="callback">The click callback.</param>
    /// <param name="height">The preferred button height.</param>
    /// <returns>The created button.</returns>
    private static Button CreateButton(
        Transform parent,
        string label,
        Action callback,
        float height = 72f)
    {
        GameObject buttonObject = CreateUiObject(label, parent);
        Image image = buttonObject.AddComponent<Image>();
        image.color = new Color(0.12f, 0.24f, 0.38f, 1f);
        Button button = buttonObject.AddComponent<Button>();
        button.targetGraphic = image;
        button.onClick.AddListener(() => callback());
        LayoutElement layout = buttonObject.AddComponent<LayoutElement>();
        layout.preferredHeight = height;
        TMP_Text buttonLabel = CreateText(buttonObject.transform, label, 25f, FontStyles.Bold, height);
        RectTransform labelRect = buttonLabel.rectTransform;
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.offsetMin = Vector2.zero;
        labelRect.offsetMax = Vector2.zero;
        return button;
    }
}
