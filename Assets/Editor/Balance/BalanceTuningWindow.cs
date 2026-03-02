using System;
using System.Collections.Generic;
using Buildings;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using Research;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

/*
 * BalanceTuningWindow
 * Purpose: Central editor UI for tuning facilities and reality/simulation balance assets.
 * Runs: Unity Editor only.
 * Primary entry points: ShowWindow() menu item, OnGUI().
 * Owns vs delegates: Owns editor presentation/workflow; delegates validation and runtime diagnostics execution to existing systems.
 *
 * Interacts with:
 * - Assets/Editor/Balance/BalanceDataAssetCreator.cs
 * - Assets/Scripts/Systems/Balance/BalanceDataValidator.cs
 * - Assets/Scripts/Data/Balance/BalanceToolRegistry.cs
 * - Tools/Idle Dyson/Debug/* menu commands (parity + debug report)
 *
 * Change notes:
 * - Window expects registry at Assets/Resources/Balance/BalanceToolRegistry.asset.
 * - Facility and reality editors operate on ScriptableObjects directly; use Save to persist changes.
 * - Validation now includes scene-level mega research presenter/card wiring checks for Game.unity.
 */
public sealed class BalanceTuningWindow : EditorWindow
{
    private const string RegistryPath = "Assets/Resources/Balance/BalanceToolRegistry.asset";
    private const string GameScenePath = "Assets/Scenes/Game.unity";
    private const string LastValidationSummaryPref = "IdleDyson.Balance.LastValidationSummary";
    private const string LastValidationTimePref = "IdleDyson.Balance.LastValidationTime";
    private static readonly string[] RequiredMegaResearchIds =
    {
        GameData.ResearchIdMap.MatrioshkaBrainsUpgrade,
        GameData.ResearchIdMap.BirchPlanetsUpgrade,
        GameData.ResearchIdMap.GalacticBrainsUpgrade
    };

    private static readonly Dictionary<string, string> RequiredMegaCardNames = new Dictionary<string, string>
    {
        { GameData.ResearchIdMap.MatrioshkaBrainsUpgrade, "Research_MatrioshkaMulti" },
        { GameData.ResearchIdMap.BirchPlanetsUpgrade, "Research_BirchMulti" },
        { GameData.ResearchIdMap.GalacticBrainsUpgrade, "Research_GalacticMulti" }
    };

    private enum Tab
    {
        Facilities,
        Reality
    }

    private Tab _activeTab;
    private BalanceToolRegistry _registry;
    private SerializedObject _registrySerialized;
    private SerializedObject _facilityProfileSerialized;
    private SerializedObject _upgradeDatabaseSerialized;
    private SerializedObject _realityTuningSerialized;
    private BalanceValidationReport _lastValidationReport;
    private Vector2 _facilitiesScroll;
    private Vector2 _realityScroll;
    private int _selectedUpgradeIndex;

    /// <summary>
    /// Opens the balance tuning window.
    /// </summary>
    [MenuItem(IdleDysonEditorMenu.Balance + "Tuning")]
    public static void ShowWindow()
    {
        BalanceTuningWindow window = GetWindow<BalanceTuningWindow>();
        window.titleContent = new GUIContent("Balance Tuning");
        window.minSize = new Vector2(900, 560);
        window.Show();
    }

    /// <summary>
    /// Refreshes asset references when the window is enabled.
    /// </summary>
    private void OnEnable()
    {
        ReloadAssets();
    }

    /// <summary>
    /// Draws toolbar, tabs, and active tab contents.
    /// </summary>
    private void OnGUI()
    {
        DrawToolbar();
        DrawTabs();
        DrawTestingPanel();
    }

    private void DrawToolbar()
    {
        EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
        if (GUILayout.Button("Load/Refresh", EditorStyles.toolbarButton))
        {
            ReloadAssets();
        }

        if (GUILayout.Button("Save Assets", EditorStyles.toolbarButton))
        {
            SaveAssets();
        }

        if (GUILayout.Button("Validate", EditorStyles.toolbarButton))
        {
            ValidateData();
        }

        if (GUILayout.Button("Run Parity", EditorStyles.toolbarButton))
        {
            EditorApplication.ExecuteMenuItem(IdleDysonEditorMenu.Debug + "Run Facility Parity Suite");
        }

        if (GUILayout.Button("Open Last Debug Report", EditorStyles.toolbarButton))
        {
            EditorApplication.ExecuteMenuItem(IdleDysonEditorMenu.Debug + "Open Last Debug Report");
        }

        GUILayout.FlexibleSpace();
        EditorGUILayout.EndHorizontal();
    }

    private void DrawTabs()
    {
        _activeTab = (Tab)GUILayout.Toolbar((int)_activeTab, new[] { "Facilities", "Reality" });
        EditorGUILayout.Space(6);

        switch (_activeTab)
        {
            case Tab.Facilities:
                DrawFacilitiesTab();
                break;
            case Tab.Reality:
                DrawRealityTab();
                break;
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    private void DrawFacilitiesTab()
    {
        if (_registry == null || _registry.facilityBalanceProfile == null)
        {
            DrawMissingRegistryHelp();
            return;
        }

        _facilitiesScroll = EditorGUILayout.BeginScrollView(_facilitiesScroll);
        EditorGUILayout.LabelField("Facility Sequence + Runtime Bindings", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox(
            "Edit progression order, prerequisites, quantum gates, and runtime field bindings. " +
            "Mega structures should remain in the same ordered sequence.",
            MessageType.Info);

        DrawObjectFieldRow("Registry", _registry);
        DrawObjectFieldRow("Facility Database", _registry.facilityDatabase);
        DrawObjectFieldRow("Facility Profile", _registry.facilityBalanceProfile);

        _facilityProfileSerialized.Update();
        SerializedProperty entries = _facilityProfileSerialized.FindProperty("entries");
        EditorGUILayout.PropertyField(entries, true);
        _facilityProfileSerialized.ApplyModifiedProperties();

        DrawFacilityChainPreview(_registry.facilityBalanceProfile);

        EditorGUILayout.EndScrollView();
    }

    private void DrawRealityTab()
    {
        if (_registry == null)
        {
            DrawMissingRegistryHelp();
            return;
        }

        _realityScroll = EditorGUILayout.BeginScrollView(_realityScroll);
        EditorGUILayout.LabelField("Simulation + Reality Upgrades", EditorStyles.boldLabel);
        EditorGUILayout.HelpBox(
            "Tune upgrade costs/prerequisites/effects and worker-artifact settings. " +
            "Skills are intentionally out of scope for this window; add a third Skills tab later using the same validation framework.",
            MessageType.Info);

        DrawObjectFieldRow("Upgrade Database", _registry.simulationUpgradeDatabase);
        DrawObjectFieldRow("Reality Tuning", _registry.realitySystemTuning);

        if (_upgradeDatabaseSerialized != null)
        {
            _upgradeDatabaseSerialized.Update();
            SerializedProperty upgrades = _upgradeDatabaseSerialized.FindProperty("upgrades");
            EditorGUILayout.PropertyField(upgrades, true);
            _upgradeDatabaseSerialized.ApplyModifiedProperties();

            DrawSelectedUpgradeEffects(_registry.simulationUpgradeDatabase);
        }

        if (_realityTuningSerialized != null)
        {
            EditorGUILayout.Space(8);
            EditorGUILayout.LabelField("Worker / Artifact Tuning", EditorStyles.boldLabel);
            _realityTuningSerialized.Update();
            EditorGUILayout.PropertyField(_realityTuningSerialized.FindProperty("workerBatchSize"));
            EditorGUILayout.PropertyField(_realityTuningSerialized.FindProperty("baseWorkerGenerationSpeed"));
            EditorGUILayout.PropertyField(_realityTuningSerialized.FindProperty("avocadoLogThreshold"));
            EditorGUILayout.PropertyField(_realityTuningSerialized.FindProperty("artifactSpeedRules"), true);
            EditorGUILayout.PropertyField(_realityTuningSerialized.FindProperty("artifactTranslationRules"), true);
            _realityTuningSerialized.ApplyModifiedProperties();
        }

        EditorGUILayout.EndScrollView();
    }

    private void DrawSelectedUpgradeEffects(SimulationUpgradeDatabase database)
    {
        if (database == null)
        {
            return;
        }

        IReadOnlyList<SimulationUpgradeDefinition> upgrades = database.GetAll();
        if (upgrades == null || upgrades.Count == 0)
        {
            return;
        }

        var labels = new string[upgrades.Count];
        for (int i = 0; i < upgrades.Count; i++)
        {
            SimulationUpgradeDefinition definition = upgrades[i];
            labels[i] = definition != null ? definition.key : "<null>";
        }

        _selectedUpgradeIndex = Mathf.Clamp(_selectedUpgradeIndex, 0, upgrades.Count - 1);
        _selectedUpgradeIndex = EditorGUILayout.Popup("Side-Effect Preview", _selectedUpgradeIndex, labels);
        SimulationUpgradeDefinition selected = upgrades[_selectedUpgradeIndex];
        if (selected == null || selected.purchaseEffects == null)
        {
            return;
        }

        EditorGUILayout.BeginVertical("box");
        EditorGUILayout.LabelField($"Upgrade: {selected.key}", EditorStyles.boldLabel);
        for (int i = 0; i < selected.purchaseEffects.Count; i++)
        {
            SimulationUpgradeEffect effect = selected.purchaseEffects[i];
            if (effect == null)
            {
                continue;
            }

            EditorGUILayout.LabelField(
                $"{effect.effectType} -> {effect.targetKey} (bool:{effect.boolValue}, num:{effect.numericValue})");
        }
        EditorGUILayout.EndVertical();
    }

    private void DrawFacilityChainPreview(FacilityBalanceProfile profile)
    {
        IReadOnlyList<FacilityBalanceProfile.FacilityBalanceEntry> entries = profile.GetOrderedEntries();
        if (entries == null || entries.Count == 0)
        {
            return;
        }

        EditorGUILayout.Space(8);
        EditorGUILayout.LabelField("Chain Preview", EditorStyles.boldLabel);
        for (int i = 0; i < entries.Count; i++)
        {
            FacilityBalanceProfile.FacilityBalanceEntry entry = entries[i];
            if (entry == null)
            {
                continue;
            }

            bool prereqValid = string.IsNullOrWhiteSpace(entry.prerequisiteFacilityId) || profile.TryGetEntry(entry.prerequisiteFacilityId, out _);
            string badge = prereqValid ? "OK" : "Missing Prereq";
            string gate = entry.quantumGate != QuantumMegaUnlockGate.None ? $" | Gate: {entry.quantumGate}" : string.Empty;
            EditorGUILayout.LabelField(
                $"{entry.displayOrder,3} | {entry.facilityId} | prereq: {entry.prerequisiteFacilityId} x{entry.prerequisiteOwned} | {badge}{gate}");
        }
    }

    private void DrawTestingPanel()
    {
        EditorGUILayout.Space(8);
        EditorGUILayout.BeginVertical("box");
        EditorGUILayout.LabelField("Testing", EditorStyles.boldLabel);

        if (_lastValidationReport != null)
        {
            MessageType type = _lastValidationReport.HasErrors ? MessageType.Error : MessageType.Info;
            EditorGUILayout.HelpBox(_lastValidationReport.BuildSummary(), type);
        }
        else
        {
            string summary = EditorPrefs.GetString(LastValidationSummaryPref, string.Empty);
            if (!string.IsNullOrWhiteSpace(summary))
            {
                string timestamp = EditorPrefs.GetString(LastValidationTimePref, "unknown");
                EditorGUILayout.HelpBox($"Last validation ({timestamp}):\n{summary}", MessageType.None);
            }
        }

        EditorGUILayout.EndVertical();
    }

    private void DrawMissingRegistryHelp()
    {
        EditorGUILayout.HelpBox(
            "Balance registry or required assets are missing.\n" +
            "Use Tools/Idle Dyson/Data/Create/Balance Tool Assets, then press Load/Refresh.",
            MessageType.Warning);

        if (GUILayout.Button("Create Balance Tool Assets"))
        {
            BalanceDataAssetCreator.CreateOrRefreshBalanceAssets();
            ReloadAssets();
        }
    }

    private void DrawObjectFieldRow(string label, UnityEngine.Object value)
    {
        EditorGUI.BeginDisabledGroup(true);
        EditorGUILayout.ObjectField(label, value, typeof(UnityEngine.Object), false);
        EditorGUI.EndDisabledGroup();
    }

    private void ReloadAssets()
    {
        _registry = BalanceToolRegistry.LoadFromResources();
        if (_registry == null)
        {
            _registry = AssetDatabase.LoadAssetAtPath<BalanceToolRegistry>(RegistryPath);
        }

        _registrySerialized = _registry != null ? new SerializedObject(_registry) : null;
        _facilityProfileSerialized = _registry != null && _registry.facilityBalanceProfile != null
            ? new SerializedObject(_registry.facilityBalanceProfile)
            : null;
        _upgradeDatabaseSerialized = _registry != null && _registry.simulationUpgradeDatabase != null
            ? new SerializedObject(_registry.simulationUpgradeDatabase)
            : null;
        _realityTuningSerialized = _registry != null && _registry.realitySystemTuning != null
            ? new SerializedObject(_registry.realitySystemTuning)
            : null;
    }

    private void SaveAssets()
    {
        _registrySerialized?.ApplyModifiedProperties();
        _facilityProfileSerialized?.ApplyModifiedProperties();
        _upgradeDatabaseSerialized?.ApplyModifiedProperties();
        _realityTuningSerialized?.ApplyModifiedProperties();
        AssetDatabase.SaveAssets();
    }

    private void ValidateData()
    {
        SaveAssets();
        _lastValidationReport = BalanceDataValidator.Validate(_registry);
        ValidateMegaResearchSceneWiring(_lastValidationReport);
        EditorPrefs.SetString(LastValidationSummaryPref, _lastValidationReport.BuildSummary());
        EditorPrefs.SetString(LastValidationTimePref, DateTime.UtcNow.ToString("u"));
    }

    private static void ValidateMegaResearchSceneWiring(BalanceValidationReport report)
    {
        if (report == null)
        {
            return;
        }

        string activeScenePath = EditorSceneManager.GetActiveScene().path;
        if (!string.Equals(activeScenePath, GameScenePath, StringComparison.Ordinal))
        {
            report.AddWarning("scene.research.skipped",
                $"Game scene validation skipped because active scene is '{activeScenePath}'.",
                GameScenePath);
            return;
        }

        ResearchPresenter[] presenters = FindObjectsByType<ResearchPresenter>(
            FindObjectsInactive.Include,
            FindObjectsSortMode.None);

        for (int i = 0; i < RequiredMegaResearchIds.Length; i++)
        {
            string researchId = RequiredMegaResearchIds[i];
            int count = 0;
            for (int p = 0; p < presenters.Length; p++)
            {
                ResearchPresenter presenter = presenters[p];
                if (presenter == null)
                {
                    continue;
                }

                if (string.Equals(presenter.ResearchIdValue, researchId, StringComparison.Ordinal))
                {
                    count++;
                }
            }

            if (count == 0)
            {
                report.AddError("scene.research.presenter.missing",
                    "Missing ResearchPresenter for required mega research ID.",
                    researchId);
            }
            else if (count > 1)
            {
                report.AddWarning("scene.research.presenter.duplicate",
                    $"Found {count} ResearchPresenter components for mega research ID.",
                    researchId);
            }

            if (!RequiredMegaCardNames.TryGetValue(researchId, out string cardName))
            {
                continue;
            }

            GameObject card = GameObject.Find(cardName);
            if (card == null)
            {
                report.AddError("scene.research.card.missing",
                    "Missing mega research card GameObject in scene.",
                    cardName);
                continue;
            }

            if (card.GetComponent<BuildingReferences>() == null)
            {
                report.AddError("scene.research.card.refs",
                    "Mega research card is missing BuildingReferences component.",
                    cardName);
            }
        }
    }
}
