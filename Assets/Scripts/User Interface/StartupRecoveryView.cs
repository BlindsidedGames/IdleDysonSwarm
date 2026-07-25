/*
 * Purpose: Presents the blocking, player-facing Stage 3 save recovery experience on the persistent Load-scene canvas.
 * Runs: Runtime only when startup cannot safely select and publish a save.
 * Primary entry points: Show; LateUpdate keeps the modal inside the current display safe area.
 * Owns: Responsive game-styled presentation, plain-language status, explicit clipboard/export actions, and reset confirmation.
 * Delegates: Save decisions/import/export to StartupRecoveryInteractionSession and reset/reload to Oracle callbacks.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/LoadScreenMethods.cs (persistent Load-scene canvas host).
 * - Assets/Scripts/Expansion/Oracle.StartupRecovery.cs.
 * - Assets/Scripts/Systems/Save/StartupRecoveryInteractionSession.cs.
 * - Assets/Scripts/UI/Theme/UIThemeProvider.cs and Resources/DefaultUITheme.asset.
 * - Assets/Scripts/Blindsided/ProceduraUIImage (rounded game panel and button rendering).
 *
 * Change notes:
 * - The view must not decode, migrate, validate, delete, or publish save data itself.
 * - Gameplay time remains paused while the view is blocking and is restored before reset/reload, including a
 *   successful recovery triggered through Quantum Console.
 * - Permanent reset requires a separate arm action followed by an explicit confirm action.
 * - Layout changes must be checked in portrait and landscape safe areas; action labels are part of the player contract.
 */

using System;
using System.Collections;
using System.IO;
using Blindsided.ProceduralUIImage;
using IdleDysonSwarm.UI;
using Systems.Save;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Rectangle = Blindsided.ProceduralUIImage.Rectangle;

/// <summary>
/// Builds and controls the blocking startup save-recovery panel.
/// </summary>
public sealed class StartupRecoveryView : MonoBehaviour
{
    private const float WidePanelWidth = 1560f;
    private const float WidePanelHeight = 1080f;
    private const float CompactPanelWidth = 1260f;
    private const float SafeAreaMargin = 44f;
    private const float PanelInset = 42f;
    private const float ScrollbarReserve = 34f;
    private const float WideActionHeight = 92f;
    private const float CompactActionHeight = 108f;
    private const float ActionSpacing = 18f;

    private StartupRecoveryInteractionSession _session;
    private readonly StartupRecoveryResetGate _resetGate = new StartupRecoveryResetGate();
    private Action _confirmedReset;
    private Action _importSucceeded;
    private GameObject _root;
    private RectTransform _rootRect;
    private RectTransform _safeArea;
    private RectTransform _panelRect;
    private RectTransform _content;
    private ScrollRect _scrollRect;
    private GridLayoutGroup _actionGrid;
    private LayoutElement _actionGridLayout;
    private GridLayoutGroup _resetButtonGrid;
    private LayoutElement _resetButtonGridLayout;
    private VerticalLayoutGroup _contentLayout;
    private GameObject _resetConfirmation;
    private TMP_Text _title;
    private TMP_Text _status;
    private TMP_Text _details;
    private TMP_Text _feedback;
    private TMP_Text _resetWarning;
    private Vector2 _lastScreenSize = new Vector2(-1f, -1f);
    private Vector2 _lastCanvasSize = new Vector2(-1f, -1f);
    private Rect _lastSafeArea = new Rect(-1f, -1f, -1f, -1f);
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
        _feedback.text = "Your files are unchanged. Choose an action when you are ready.";
        _scrollRect.verticalNormalizedPosition = 1f;
        UpdateSafeAreaAndLayout(force: true);
        PauseGameplay();
    }

    /// <summary>
    /// Dismisses the blocking presentation and restores its captured time scale after a verified import commit.
    /// </summary>
    internal void DismissAfterSuccessfulImport()
    {
        ReleaseGameplayPause();
        if (_root != null)
        {
            _root.SetActive(false);
        }
    }

    /// <summary>
    /// Reflows the modal when the window, orientation, or device safe area changes.
    /// </summary>
    private void LateUpdate()
    {
        if (_root != null && _root.activeInHierarchy)
        {
            UpdateSafeAreaAndLayout(force: false);
        }
    }

    /// <summary>
    /// Restores gameplay time if this blocking view is destroyed unexpectedly.
    /// </summary>
    private void OnDestroy()
    {
        ReleaseGameplayPause();
    }

    /// <summary>
    /// Creates the responsive runtime modal once under the persistent Load-scene canvas.
    /// </summary>
    private void EnsureUi()
    {
        if (_root != null)
        {
            return;
        }

        _root = CreateUiObject("Startup Save Recovery", transform);
        _rootRect = _root.GetComponent<RectTransform>();
        StretchToParent(_rootRect);

        Image blocker = _root.AddComponent<Image>();
        blocker.color = new Color(0.02f, 0.012f, 0.025f, 0.92f);
        blocker.raycastTarget = true;

        GameObject safeAreaObject = CreateUiObject("Safe Area", _root.transform);
        _safeArea = safeAreaObject.GetComponent<RectTransform>();
        StretchToParent(_safeArea);

        GameObject panel = CreateUiObject("Recovery Panel", _safeArea);
        _panelRect = panel.GetComponent<RectTransform>();
        _panelRect.anchorMin = new Vector2(0.5f, 0.5f);
        _panelRect.anchorMax = new Vector2(0.5f, 0.5f);
        _panelRect.pivot = new Vector2(0.5f, 0.5f);
        _panelRect.anchoredPosition = Vector2.zero;
        CreateRoundedImage(
            panel,
            GetPanelBackground(),
            UIThemeProvider.RealityColor,
            cornerRadius: 24f,
            outlineWidth: 6f);

        BuildScrollableContent(panel.transform);
        BuildHeader();
        BuildStatusCard();
        BuildActions();
        BuildResetConfirmation();
        _resetConfirmation.SetActive(false);
    }

    /// <summary>
    /// Creates the clipped scrolling surface used by both pointer wheels and touch drags.
    /// </summary>
    /// <param name="panel">The recovery panel transform.</param>
    private void BuildScrollableContent(Transform panel)
    {
        GameObject viewportObject = CreateUiObject("Viewport", panel);
        RectTransform viewportRect = viewportObject.GetComponent<RectTransform>();
        StretchToParent(viewportRect);
        viewportRect.offsetMin = new Vector2(PanelInset, PanelInset);
        viewportRect.offsetMax = new Vector2(-(PanelInset + ScrollbarReserve), -PanelInset);
        viewportObject.AddComponent<RectMask2D>();

        GameObject contentObject = CreateUiObject("Content", viewportObject.transform);
        _content = contentObject.GetComponent<RectTransform>();
        _content.anchorMin = new Vector2(0f, 1f);
        _content.anchorMax = new Vector2(1f, 1f);
        _content.pivot = new Vector2(0.5f, 1f);
        _content.anchoredPosition = Vector2.zero;
        _content.sizeDelta = Vector2.zero;

        _contentLayout = contentObject.AddComponent<VerticalLayoutGroup>();
        _contentLayout.padding = new RectOffset(12, 12, 10, 10);
        _contentLayout.spacing = 20f;
        _contentLayout.childAlignment = TextAnchor.UpperCenter;
        _contentLayout.childControlHeight = true;
        _contentLayout.childControlWidth = true;
        _contentLayout.childForceExpandHeight = false;
        _contentLayout.childForceExpandWidth = true;

        ContentSizeFitter contentFitter = contentObject.AddComponent<ContentSizeFitter>();
        contentFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        Scrollbar scrollbar = CreateScrollbar(panel);
        _scrollRect = panel.gameObject.AddComponent<ScrollRect>();
        _scrollRect.viewport = viewportRect;
        _scrollRect.content = _content;
        _scrollRect.horizontal = false;
        _scrollRect.vertical = true;
        _scrollRect.movementType = ScrollRect.MovementType.Clamped;
        _scrollRect.inertia = true;
        _scrollRect.decelerationRate = 0.12f;
        _scrollRect.scrollSensitivity = 54f;
        _scrollRect.verticalScrollbar = scrollbar;
        _scrollRect.verticalScrollbarVisibility = ScrollRect.ScrollbarVisibility.AutoHideAndExpandViewport;
        _scrollRect.verticalScrollbarSpacing = 12f;
    }

    /// <summary>
    /// Creates the title, accent rule, and preservation message using the game's modal typography.
    /// </summary>
    private void BuildHeader()
    {
        _title = CreateFlowText(
            _content,
            "Save Recovery",
            52f,
            FontStyles.Normal,
            TextAlignmentOptions.Center,
            Color.white,
            68f);

        GameObject accentRule = CreateUiObject("Accent Rule", _content);
        LayoutElement accentLayout = accentRule.AddComponent<LayoutElement>();
        accentLayout.preferredHeight = 8f;
        CreateRoundedImage(
            accentRule,
            UIThemeProvider.RealityColor,
            Color.clear,
            cornerRadius: 4f,
            outlineWidth: 0f);

        CreateFlowText(
            _content,
            "Your existing save files have been preserved.",
            24f,
            FontStyles.Normal,
            TextAlignmentOptions.Center,
            GetTheme().highlightColor,
            38f);
    }

    /// <summary>
    /// Creates the classified status card and the live feedback strip.
    /// </summary>
    private void BuildStatusCard()
    {
        GameObject statusCard = CreateUiObject("Recovery Status", _content);
        CreateRoundedImage(
            statusCard,
            GetCardBackground(),
            GetTheme().borderColor,
            cornerRadius: 18f,
            outlineWidth: 3f);
        VerticalLayoutGroup statusLayout = statusCard.AddComponent<VerticalLayoutGroup>();
        statusLayout.padding = new RectOffset(30, 30, 26, 26);
        statusLayout.spacing = 15f;
        statusLayout.childAlignment = TextAnchor.UpperLeft;
        statusLayout.childControlHeight = true;
        statusLayout.childControlWidth = true;
        statusLayout.childForceExpandHeight = false;
        statusLayout.childForceExpandWidth = true;
        ContentSizeFitter statusFitter = statusCard.AddComponent<ContentSizeFitter>();
        statusFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        _status = CreateFlowText(
            statusCard.transform,
            string.Empty,
            29f,
            FontStyles.Bold,
            TextAlignmentOptions.TopLeft,
            Color.white,
            70f);
        _details = CreateFlowText(
            statusCard.transform,
            string.Empty,
            22f,
            FontStyles.Normal,
            TextAlignmentOptions.TopLeft,
            new Color(0.88f, 0.88f, 0.9f, 1f),
            50f);

        GameObject feedbackCard = CreateUiObject("Action Feedback", _content);
        CreateRoundedImage(
            feedbackCard,
            new Color(0.08f, 0.08f, 0.1f, 1f),
            GetTheme().highlightColor,
            cornerRadius: 14f,
            outlineWidth: 2f);
        HorizontalLayoutGroup feedbackLayout = feedbackCard.AddComponent<HorizontalLayoutGroup>();
        feedbackLayout.padding = new RectOffset(24, 24, 18, 18);
        feedbackLayout.childControlHeight = true;
        feedbackLayout.childControlWidth = true;
        feedbackLayout.childForceExpandHeight = false;
        feedbackLayout.childForceExpandWidth = true;
        ContentSizeFitter feedbackFitter = feedbackCard.AddComponent<ContentSizeFitter>();
        feedbackFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        _feedback = CreateFlowText(
            feedbackCard.transform,
            string.Empty,
            21f,
            FontStyles.Normal,
            TextAlignmentOptions.Center,
            GetTheme().highlightColor,
            38f);
    }

    /// <summary>
    /// Creates the non-destructive action grid and the visually separated reset affordance.
    /// </summary>
    private void BuildActions()
    {
        CreateFlowText(
            _content,
            "Choose what to do",
            27f,
            FontStyles.Bold,
            TextAlignmentOptions.Left,
            Color.white,
            42f);

        GameObject actionGridObject = CreateUiObject("Recovery Actions", _content);
        _actionGridLayout = actionGridObject.AddComponent<LayoutElement>();
        _actionGrid = actionGridObject.AddComponent<GridLayoutGroup>();
        _actionGrid.spacing = new Vector2(ActionSpacing, ActionSpacing);
        _actionGrid.startCorner = GridLayoutGroup.Corner.UpperLeft;
        _actionGrid.startAxis = GridLayoutGroup.Axis.Horizontal;
        _actionGrid.childAlignment = TextAnchor.UpperCenter;
        _actionGrid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;

        Color primary = UIThemeProvider.RealityColor;
        CreateButton(
            actionGridObject.transform,
            "Import Save From Clipboard",
            ImportFromClipboard,
            primary,
            GetTheme().buttonHighlighted,
            GetTheme().buttonPressed,
            Color.black,
            primary);
        CreateButton(
            actionGridObject.transform,
            "Export Save Files",
            ExportArtifacts,
            GetTheme().buttonNormal,
            GetTheme().buttonHighlighted,
            GetTheme().buttonPressed,
            Color.white,
            GetTheme().borderColor);
        CreateButton(
            actionGridObject.transform,
            "Copy Primary Save",
            CopyPrimarySave,
            GetTheme().buttonNormal,
            GetTheme().buttonHighlighted,
            GetTheme().buttonPressed,
            Color.white,
            GetTheme().borderColor);
        CreateButton(
            actionGridObject.transform,
            "Copy Recovery Details",
            CopyRecoveryDetails,
            GetTheme().buttonNormal,
            GetTheme().buttonHighlighted,
            GetTheme().buttonPressed,
            Color.white,
            GetTheme().borderColor);

        CreateFlowText(
            _content,
            "Start over only if you no longer need any of the preserved saves.",
            20f,
            FontStyles.Normal,
            TextAlignmentOptions.Center,
            new Color(0.82f, 0.82f, 0.84f, 1f),
            38f);
        CreateButton(
            _content,
            "Reset Save...",
            ArmReset,
            new Color(0.22f, 0.07f, 0.09f, 1f),
            new Color(0.32f, 0.09f, 0.12f, 1f),
            new Color(0.16f, 0.04f, 0.06f, 1f),
            GetTheme().negativeColor,
            GetTheme().negativeColor,
            preferredHeight: 88f);
    }

    /// <summary>
    /// Creates the second-step destructive reset warning and explicit cancel/confirm actions.
    /// </summary>
    private void BuildResetConfirmation()
    {
        _resetConfirmation = CreateUiObject("Reset Confirmation", _content);
        CreateRoundedImage(
            _resetConfirmation,
            new Color(0.16f, 0.045f, 0.06f, 1f),
            GetTheme().negativeColor,
            cornerRadius: 18f,
            outlineWidth: 4f);
        VerticalLayoutGroup confirmationGroup = _resetConfirmation.AddComponent<VerticalLayoutGroup>();
        confirmationGroup.padding = new RectOffset(28, 28, 24, 24);
        confirmationGroup.spacing = 18f;
        confirmationGroup.childControlHeight = true;
        confirmationGroup.childControlWidth = true;
        confirmationGroup.childForceExpandHeight = false;
        confirmationGroup.childForceExpandWidth = true;
        ContentSizeFitter confirmationFitter = _resetConfirmation.AddComponent<ContentSizeFitter>();
        confirmationFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        _resetWarning = CreateFlowText(
            _resetConfirmation.transform,
            "Permanent reset deletes the current save and its backups. Export first if you may need support.",
            22f,
            FontStyles.Bold,
            TextAlignmentOptions.Center,
            Color.white,
            64f);

        GameObject confirmationButtons = CreateUiObject("Confirmation Buttons", _resetConfirmation.transform);
        _resetButtonGridLayout = confirmationButtons.AddComponent<LayoutElement>();
        _resetButtonGrid = confirmationButtons.AddComponent<GridLayoutGroup>();
        _resetButtonGrid.spacing = new Vector2(ActionSpacing, ActionSpacing);
        _resetButtonGrid.startCorner = GridLayoutGroup.Corner.UpperLeft;
        _resetButtonGrid.startAxis = GridLayoutGroup.Axis.Horizontal;
        _resetButtonGrid.childAlignment = TextAnchor.UpperCenter;
        _resetButtonGrid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
        CreateButton(
            confirmationButtons.transform,
            "Cancel",
            CancelReset,
            GetTheme().buttonNormal,
            GetTheme().buttonHighlighted,
            GetTheme().buttonPressed,
            Color.white,
            GetTheme().borderColor);
        CreateButton(
            confirmationButtons.transform,
            "Confirm Permanent Reset",
            ConfirmReset,
            GetTheme().negativeColor,
            new Color(1f, 0.45f, 0.45f, 1f),
            new Color(0.7f, 0.16f, 0.16f, 1f),
            Color.black,
            GetTheme().negativeColor);
    }

    /// <summary>
    /// Creates the slim game-style vertical scrollbar.
    /// </summary>
    /// <param name="panel">The recovery panel transform.</param>
    /// <returns>The configured scrollbar.</returns>
    private Scrollbar CreateScrollbar(Transform panel)
    {
        GameObject scrollbarObject = CreateUiObject("Scrollbar", panel);
        RectTransform scrollbarRect = scrollbarObject.GetComponent<RectTransform>();
        scrollbarRect.anchorMin = new Vector2(1f, 0f);
        scrollbarRect.anchorMax = new Vector2(1f, 1f);
        scrollbarRect.pivot = new Vector2(1f, 0.5f);
        scrollbarRect.offsetMin = new Vector2(-32f, PanelInset);
        scrollbarRect.offsetMax = new Vector2(-14f, -PanelInset);
        CreateRoundedImage(
            scrollbarObject,
            new Color(0.04f, 0.04f, 0.05f, 0.9f),
            Color.clear,
            cornerRadius: 9f,
            outlineWidth: 0f);

        GameObject slidingArea = CreateUiObject("Sliding Area", scrollbarObject.transform);
        RectTransform slidingRect = slidingArea.GetComponent<RectTransform>();
        StretchToParent(slidingRect);
        slidingRect.offsetMin = new Vector2(2f, 2f);
        slidingRect.offsetMax = new Vector2(-2f, -2f);

        GameObject handleObject = CreateUiObject("Handle", slidingArea.transform);
        RectTransform handleRect = handleObject.GetComponent<RectTransform>();
        StretchToParent(handleRect);
        ProceduralUIImage handleImage = CreateRoundedImage(
            handleObject,
            UIThemeProvider.RealityColor,
            Color.clear,
            cornerRadius: 7f,
            outlineWidth: 0f);

        Scrollbar scrollbar = scrollbarObject.AddComponent<Scrollbar>();
        scrollbar.handleRect = handleRect;
        scrollbar.targetGraphic = handleImage;
        scrollbar.direction = Scrollbar.Direction.BottomToTop;
        return scrollbar;
    }

    /// <summary>
    /// Applies safe-area anchors and switches between the game's phone and desktop action layouts.
    /// </summary>
    /// <param name="force">Whether to reapply layout even if display metrics are unchanged.</param>
    private void UpdateSafeAreaAndLayout(bool force)
    {
        if (_rootRect == null || _safeArea == null || _panelRect == null)
        {
            return;
        }

        Vector2 screenSize = new Vector2(Mathf.Max(1, Screen.width), Mathf.Max(1, Screen.height));
        Rect safeArea = Screen.safeArea;
        Vector2 canvasSize = _rootRect.rect.size;
        if (!force &&
            Approximately(screenSize, _lastScreenSize) &&
            Approximately(canvasSize, _lastCanvasSize) &&
            Approximately(safeArea, _lastSafeArea))
        {
            return;
        }

        _lastScreenSize = screenSize;
        _lastCanvasSize = canvasSize;
        _lastSafeArea = safeArea;

        _safeArea.anchorMin = new Vector2(safeArea.xMin / screenSize.x, safeArea.yMin / screenSize.y);
        _safeArea.anchorMax = new Vector2(safeArea.xMax / screenSize.x, safeArea.yMax / screenSize.y);
        _safeArea.offsetMin = Vector2.zero;
        _safeArea.offsetMax = Vector2.zero;

        Vector2 safeCanvasSize = new Vector2(
            canvasSize.x * safeArea.width / screenSize.x,
            canvasSize.y * safeArea.height / screenSize.y);
        bool compact = IsCompactLayout(safeCanvasSize);
        Vector2 panelSize = CalculatePanelSize(safeCanvasSize, compact);
        _panelRect.sizeDelta = panelSize;

        int contentPadding = compact ? 18 : 12;
        _contentLayout.padding = new RectOffset(contentPadding, contentPadding, 10, 10);
        _contentLayout.spacing = compact ? 22f : 20f;
        _title.fontSize = compact ? 60f : 52f;
        _status.fontSize = compact ? 34f : 29f;
        _details.fontSize = compact ? 28f : 22f;
        _feedback.fontSize = compact ? 27f : 21f;
        _resetWarning.fontSize = compact ? 30f : 22f;

        int actionColumns = compact ? 1 : 2;
        float availableWidth =
            panelSize.x -
            ((PanelInset + ScrollbarReserve) + PanelInset) -
            (contentPadding * 2f);
        ConfigureGrid(
            _actionGrid,
            _actionGridLayout,
            childCount: 4,
            columnCount: actionColumns,
            availableWidth: availableWidth,
            cellHeight: compact ? CompactActionHeight : WideActionHeight);

        int confirmationColumns = compact ? 1 : 2;
        float confirmationWidth = Mathf.Max(320f, availableWidth - 56f);
        ConfigureGrid(
            _resetButtonGrid,
            _resetButtonGridLayout,
            childCount: 2,
            columnCount: confirmationColumns,
            availableWidth: confirmationWidth,
            cellHeight: compact ? 96f : 84f);

        Canvas.ForceUpdateCanvases();
        LayoutRebuilder.ForceRebuildLayoutImmediate(_content);
    }

    /// <summary>
    /// Returns whether the available safe-area shape needs the phone-first single-column layout.
    /// </summary>
    /// <param name="safeCanvasSize">The safe-area size in canvas units.</param>
    /// <returns>True for narrow or portrait-oriented layouts.</returns>
    private static bool IsCompactLayout(Vector2 safeCanvasSize)
    {
        return safeCanvasSize.x < 1500f || safeCanvasSize.y > safeCanvasSize.x * 1.08f;
    }

    /// <summary>
    /// Calculates a centered panel that respects safe-area breathing room without becoming excessively wide.
    /// </summary>
    /// <param name="safeCanvasSize">The safe-area size in canvas units.</param>
    /// <param name="compact">Whether the phone-first layout is active.</param>
    /// <returns>The responsive panel dimensions.</returns>
    private static Vector2 CalculatePanelSize(Vector2 safeCanvasSize, bool compact)
    {
        float availableWidth = Mathf.Max(320f, safeCanvasSize.x - (SafeAreaMargin * 2f));
        float availableHeight = Mathf.Max(480f, safeCanvasSize.y - (SafeAreaMargin * 2f));
        return compact
            ? new Vector2(Mathf.Min(CompactPanelWidth, availableWidth), availableHeight)
            : new Vector2(Mathf.Min(WidePanelWidth, availableWidth), Mathf.Min(WidePanelHeight, availableHeight));
    }

    /// <summary>
    /// Sizes a grid and its layout reservation for the requested responsive column count.
    /// </summary>
    /// <param name="grid">The grid to configure.</param>
    /// <param name="layout">The layout reservation for the grid.</param>
    /// <param name="childCount">The number of action cells.</param>
    /// <param name="columnCount">The active number of columns.</param>
    /// <param name="availableWidth">The width available to the grid.</param>
    /// <param name="cellHeight">The touch-target height.</param>
    private static void ConfigureGrid(
        GridLayoutGroup grid,
        LayoutElement layout,
        int childCount,
        int columnCount,
        float availableWidth,
        float cellHeight)
    {
        int rows = Mathf.CeilToInt(childCount / (float)columnCount);
        float cellWidth = (availableWidth - (ActionSpacing * (columnCount - 1))) / columnCount;
        grid.constraintCount = columnCount;
        grid.cellSize = new Vector2(cellWidth, cellHeight);
        layout.preferredHeight = (rows * cellHeight) + ((rows - 1) * ActionSpacing);
    }

    /// <summary>
    /// Copies the raw primary canonical artifact only after an explicit button press.
    /// </summary>
    private void CopyPrimarySave()
    {
        if (_session.TryGetPrimaryText(out string text, out string error))
        {
            GUIUtility.systemCopyBuffer = text;
            _feedback.text = "Primary save copied. The source file was not changed.";
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
            ? $"Save files exported to:\n{folder}"
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
        DismissAfterSuccessfulImport();
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
        UpdateSafeAreaAndLayout(force: true);
        Canvas.ForceUpdateCanvases();
        LayoutRebuilder.ForceRebuildLayoutImmediate(_content);
        StartCoroutine(ScrollToResetConfirmation());
    }

    /// <summary>
    /// Waits for nested layout groups to expand, then brings the destructive confirmation fully into view.
    /// </summary>
    /// <returns>The one-frame layout coroutine.</returns>
    private IEnumerator ScrollToResetConfirmation()
    {
        yield return null;
        Canvas.ForceUpdateCanvases();
        LayoutRebuilder.ForceRebuildLayoutImmediate(_content);
        _scrollRect.StopMovement();
        _scrollRect.verticalNormalizedPosition = 0f;
    }

    /// <summary>
    /// Cancels a previously armed reset without changing any data.
    /// </summary>
    private void CancelReset()
    {
        _resetGate.Cancel();
        _resetConfirmation.SetActive(false);
        _feedback.text = "Reset cancelled. No data was changed.";
        UpdateSafeAreaAndLayout(force: true);
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
    /// Summarizes discovered artifacts without placing a long local path in the main modal.
    /// </summary>
    /// <param name="result">The blocked startup result.</param>
    /// <returns>A concise player-facing artifact summary.</returns>
    private static string BuildArtifactSummary(StartupSaveRecoveryResult result)
    {
        string classification = result.Status switch
        {
            StartupSaveRecoveryStatus.UnsupportedFutureVersion => "Newer save version",
            StartupSaveRecoveryStatus.RecoveryWriteFailed => "Recovery write blocked",
            _ => "No safe save could be selected"
        };
        string noun = result.Artifacts.Count == 1 ? "file" : "files";
        return
            $"{classification}\n" +
            $"{result.Artifacts.Count} save {noun} found and left unchanged. " +
            "Use Copy Recovery Details for exact locations and technical information.";
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
    /// Stretches a RectTransform to all four edges of its parent.
    /// </summary>
    /// <param name="rect">The RectTransform to stretch.</param>
    private static void StretchToParent(RectTransform rect)
    {
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
    }

    /// <summary>
    /// Creates a rounded procedural image consistent with existing game cards and modals.
    /// </summary>
    /// <param name="target">The UI object receiving the image.</param>
    /// <param name="fillColor">The interior colour.</param>
    /// <param name="outlineColor">The outline colour.</param>
    /// <param name="cornerRadius">The uniform corner radius.</param>
    /// <param name="outlineWidth">The outline width.</param>
    /// <returns>The configured image.</returns>
    private static ProceduralUIImage CreateRoundedImage(
        GameObject target,
        Color fillColor,
        Color outlineColor,
        float cornerRadius,
        float outlineWidth)
    {
        ProceduralUIImage image = target.AddComponent<ProceduralUIImage>();
        image.color = fillColor;
        image.DrawShape = DrawShape.Rectangle;
        image.OutlineColor = outlineColor;
        image.OutlineWidth = outlineWidth;
        image.FalloffDistance = 1f;
        Rectangle rectangle = image.Rectangle;
        rectangle.CornerRadius = Vector4.one * cornerRadius;
        image.Rectangle = rectangle;
        return image;
    }

    /// <summary>
    /// Creates a naturally sized TextMesh Pro label for a layout group.
    /// </summary>
    /// <param name="parent">The UI parent.</param>
    /// <param name="text">The initial label.</param>
    /// <param name="fontSize">The preferred font size.</param>
    /// <param name="style">The font style.</param>
    /// <param name="alignment">The text alignment.</param>
    /// <param name="color">The text colour.</param>
    /// <param name="minimumHeight">The minimum layout height.</param>
    /// <returns>The created label.</returns>
    private static TMP_Text CreateFlowText(
        Transform parent,
        string text,
        float fontSize,
        FontStyles style,
        TextAlignmentOptions alignment,
        Color color,
        float minimumHeight)
    {
        GameObject textObject = CreateUiObject("Text", parent);
        TMP_Text label = ConfigureText(textObject, text, fontSize, style, alignment, color);
        LayoutElement layout = textObject.AddComponent<LayoutElement>();
        layout.minHeight = minimumHeight;
        ContentSizeFitter fitter = textObject.AddComponent<ContentSizeFitter>();
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
        return label;
    }

    /// <summary>
    /// Creates a large game-style touch action with explicit colour states.
    /// </summary>
    /// <param name="parent">The UI parent.</param>
    /// <param name="label">The button label.</param>
    /// <param name="callback">The click callback.</param>
    /// <param name="normalColor">The normal fill colour.</param>
    /// <param name="highlightedColor">The hover/selection fill colour.</param>
    /// <param name="pressedColor">The pressed fill colour.</param>
    /// <param name="textColor">The label colour.</param>
    /// <param name="outlineColor">The button outline colour.</param>
    /// <param name="preferredHeight">The preferred height outside a grid.</param>
    /// <returns>The created button.</returns>
    private static Button CreateButton(
        Transform parent,
        string label,
        Action callback,
        Color normalColor,
        Color highlightedColor,
        Color pressedColor,
        Color textColor,
        Color outlineColor,
        float preferredHeight = -1f)
    {
        GameObject buttonObject = CreateUiObject(label, parent);
        ProceduralUIImage image = CreateRoundedImage(
            buttonObject,
            Color.white,
            outlineColor,
            cornerRadius: 16f,
            outlineWidth: 3f);
        Button button = buttonObject.AddComponent<Button>();
        button.targetGraphic = image;
        button.transition = Selectable.Transition.ColorTint;
        button.colors = new ColorBlock
        {
            normalColor = normalColor,
            highlightedColor = highlightedColor,
            pressedColor = pressedColor,
            selectedColor = highlightedColor,
            disabledColor = GetTheme().buttonDisabled,
            colorMultiplier = 1f,
            fadeDuration = 0.08f
        };
        button.onClick.AddListener(() => callback());

        if (preferredHeight > 0f)
        {
            LayoutElement layout = buttonObject.AddComponent<LayoutElement>();
            layout.preferredHeight = preferredHeight;
        }

        GameObject labelObject = CreateUiObject("Label", buttonObject.transform);
        RectTransform labelRect = labelObject.GetComponent<RectTransform>();
        StretchToParent(labelRect);
        labelRect.offsetMin = new Vector2(20f, 10f);
        labelRect.offsetMax = new Vector2(-20f, -10f);
        TMP_Text buttonLabel = ConfigureText(
            labelObject,
            label,
            30f,
            FontStyles.Bold,
            TextAlignmentOptions.Center,
            textColor);
        buttonLabel.enableAutoSizing = true;
        buttonLabel.fontSizeMin = 20f;
        buttonLabel.fontSizeMax = 30f;
        buttonLabel.textWrappingMode = TextWrappingModes.Normal;
        return button;
    }

    /// <summary>
    /// Applies the common game font and wrapping behaviour to a TextMesh Pro object.
    /// </summary>
    /// <param name="textObject">The UI object containing the label.</param>
    /// <param name="text">The initial label.</param>
    /// <param name="fontSize">The preferred font size.</param>
    /// <param name="style">The font style.</param>
    /// <param name="alignment">The text alignment.</param>
    /// <param name="color">The label colour.</param>
    /// <returns>The configured label.</returns>
    private static TMP_Text ConfigureText(
        GameObject textObject,
        string text,
        float fontSize,
        FontStyles style,
        TextAlignmentOptions alignment,
        Color color)
    {
        var label = textObject.AddComponent<TextMeshProUGUI>();
        label.text = text;
        label.font = TMP_Settings.defaultFontAsset;
        label.fontSize = fontSize;
        label.fontStyle = style;
        label.color = color;
        label.alignment = alignment;
        label.textWrappingMode = TextWrappingModes.Normal;
        label.overflowMode = TextOverflowModes.Overflow;
        label.raycastTarget = false;
        return label;
    }

    /// <summary>
    /// Returns the active game theme with a runtime fallback supplied by UIThemeProvider.
    /// </summary>
    /// <returns>The active UI theme.</returns>
    private static UITheme GetTheme()
    {
        return UIThemeProvider.ActiveTheme;
    }

    /// <summary>
    /// Returns the nearly black modal fill used by the game's existing blocking panels.
    /// </summary>
    /// <returns>The modal background colour.</returns>
    private static Color GetPanelBackground()
    {
        Color themed = GetTheme()?.panelBackground ?? new Color(0.1f, 0.1f, 0.15f, 0.95f);
        return Color.Lerp(themed, Color.black, 0.58f);
    }

    /// <summary>
    /// Returns the purple-grey card fill used throughout the game's upgrade panels.
    /// </summary>
    /// <returns>The card background colour.</returns>
    private static Color GetCardBackground()
    {
        Color themed = GetTheme()?.panelBackground ?? new Color(0.1f, 0.1f, 0.15f, 0.95f);
        return Color.Lerp(themed, UIThemeProvider.RealityColor, 0.16f);
    }

    /// <summary>
    /// Compares display vectors with enough tolerance to ignore floating-point layout jitter.
    /// </summary>
    /// <param name="left">The first vector.</param>
    /// <param name="right">The second vector.</param>
    /// <returns>True when both components are effectively equal.</returns>
    private static bool Approximately(Vector2 left, Vector2 right)
    {
        return Mathf.Approximately(left.x, right.x) && Mathf.Approximately(left.y, right.y);
    }

    /// <summary>
    /// Compares safe-area rectangles with enough tolerance to ignore floating-point layout jitter.
    /// </summary>
    /// <param name="left">The first rectangle.</param>
    /// <param name="right">The second rectangle.</param>
    /// <returns>True when position and size are effectively equal.</returns>
    private static bool Approximately(Rect left, Rect right)
    {
        return Approximately(left.position, right.position) && Approximately(left.size, right.size);
    }
}
