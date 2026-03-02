using System;
using System.Collections.Generic;
using System.Linq;
using IdleDysonSwarm.Services;
using UnityEngine;

/*
 * FacilityBalanceProfile
 * Purpose: Centralizes facility progression, runtime field bindings, and breakdown metadata in data assets.
 * Runs: Runtime + Editor (read-only at runtime, editable via tooling).
 * Primary entry points: TryGetEntry(), GetOrderedEntries().
 * Owns vs delegates: Owns ordered facility metadata; delegates facility definitions/cost formulas to FacilityDefinition.
 *
 * Interacts with:
 * - Assets/Scripts/Systems/Facilities/FacilityCountAccessor.cs (count field binding)
 * - Assets/Scripts/Systems/Facilities/FacilityEffectPipeline.cs (modifier kind routing)
 * - Assets/Scripts/Systems/Facilities/FacilityBreakdownPopup.cs (upstream and bonus sections)
 * - Assets/Editor/Balance/BalanceTuningWindow.cs (authoring UI)
 *
 * Change notes:
 * - Entry `facilityId` values must match FacilityDefinition.id values and save field expectations.
 * - Changing count/modifier field names must stay synchronized with DysonVerseInfinityData fields in Oracle.SaveData classes.
 * - Changing progression order/prerequisites changes live unlock/presentation flow and should be verified with representative saves.
 */
namespace IdleDysonSwarm.Data.Balance
{
    /// <summary>
    /// Defines high-level grouping for facility presentation and progression sections.
    /// </summary>
    public enum FacilityGroup
    {
        /// <summary>
        /// Core facility chain (assembly lines through planets).
        /// </summary>
        Core,

        /// <summary>
        /// Advanced facilities outside the core starter chain.
        /// </summary>
        Advanced,

        /// <summary>
        /// Mega-structure facility chain.
        /// </summary>
        Mega
    }

    /// <summary>
    /// Declares which modifier pipeline a facility should use.
    /// </summary>
    public enum FacilityModifierKind
    {
        /// <summary>
        /// No specialized modifier pipeline.
        /// </summary>
        None,

        /// <summary>
        /// Assembly line modifier pipeline.
        /// </summary>
        AssemblyLines,

        /// <summary>
        /// AI manager modifier pipeline.
        /// </summary>
        AiManagers,

        /// <summary>
        /// Server modifier pipeline.
        /// </summary>
        Servers,

        /// <summary>
        /// Data center modifier pipeline.
        /// </summary>
        DataCenters,

        /// <summary>
        /// Planet modifier pipeline.
        /// </summary>
        Planets,

        /// <summary>
        /// Matrioshka Brains modifier pipeline.
        /// </summary>
        MatrioshkaBrains,

        /// <summary>
        /// Birch Planets modifier pipeline.
        /// </summary>
        BirchPlanets,

        /// <summary>
        /// Galactic Brains modifier pipeline.
        /// </summary>
        GalacticBrains
    }

    /// <summary>
    /// Defines optional quantum unlock gates used by mega-structure progression.
    /// </summary>
    public enum QuantumMegaUnlockGate
    {
        /// <summary>
        /// No quantum gate requirement.
        /// </summary>
        None,

        /// <summary>
        /// Requires Matrioshka Brains quantum unlock.
        /// </summary>
        MatrioshkaBrains,

        /// <summary>
        /// Requires Birch Planets quantum unlock.
        /// </summary>
        BirchPlanets,

        /// <summary>
        /// Requires Galactic Brains quantum unlock.
        /// </summary>
        GalacticBrains
    }

    /// <summary>
    /// Profile asset that maps facilities to runtime bindings and progression metadata.
    /// </summary>
    [CreateAssetMenu(fileName = "FacilityBalanceProfile", menuName = "Idle Dyson/Balance/Facility Balance Profile")]
    public sealed class FacilityBalanceProfile : ScriptableObject, IFacilityBalanceProvider
    {
        /// <summary>
        /// Optional bonus contribution extraction rule for breakdown UI.
        /// </summary>
        [Serializable]
        public sealed class BonusContributionRule
        {
            /// <summary>
            /// Contribution source ID to match.
            /// </summary>
            public string sourceId;

            /// <summary>
            /// Display label shown in breakdown sections.
            /// </summary>
            public string label;
        }

        /// <summary>
        /// One data-driven facility progression and runtime binding entry.
        /// </summary>
        [Serializable]
        public sealed class FacilityBalanceEntry
        {
            /// <summary>
            /// Stable facility ID key (matches FacilityDefinition.id).
            /// </summary>
            public string facilityId;

            /// <summary>
            /// Display and progression order.
            /// </summary>
            public int displayOrder;

            /// <summary>
            /// UI grouping bucket.
            /// </summary>
            public FacilityGroup group = FacilityGroup.Core;

            /// <summary>
            /// DysonVerseInfinityData field containing [auto, manual] counts.
            /// </summary>
            public string countFieldName;

            /// <summary>
            /// DysonVerseInfinityData field containing facility modifier scalar.
            /// </summary>
            public string modifierFieldName;

            /// <summary>
            /// Modifier pipeline selector for this facility.
            /// </summary>
            public FacilityModifierKind modifierKind = FacilityModifierKind.None;

            /// <summary>
            /// Optional prerequisite facility ID for sequencing.
            /// </summary>
            public string prerequisiteFacilityId;

            /// <summary>
            /// Required owned amount of prerequisite facility to expose this entry.
            /// </summary>
            public double prerequisiteOwned;

            /// <summary>
            /// Optional quantum gate requirement.
            /// </summary>
            public QuantumMegaUnlockGate quantumGate = QuantumMegaUnlockGate.None;

            /// <summary>
            /// Upstream facilities shown in breakdown UI summaries.
            /// </summary>
            public List<string> upstreamFacilityIds = new List<string>();

            /// <summary>
            /// Bonus contribution extraction rules for breakdown UI.
            /// </summary>
            public List<BonusContributionRule> bonusContributionRules = new List<BonusContributionRule>();
        }

        /// <summary>
        /// Ordered profile entries.
        /// </summary>
        [SerializeField]
        private List<FacilityBalanceEntry> entries = new List<FacilityBalanceEntry>();

        /// <summary>
        /// Runtime lookup by facility ID.
        /// </summary>
        private Dictionary<string, FacilityBalanceEntry> _byId;

        /// <summary>
        /// Rebuilds lookup cache when the asset loads.
        /// </summary>
        private void OnEnable()
        {
            RebuildLookup();
        }

        /// <summary>
        /// Rebuilds lookup cache when the asset is edited.
        /// </summary>
        private void OnValidate()
        {
            RebuildLookup();
        }

        /// <summary>
        /// Gets ordered entries.
        /// </summary>
        /// <returns>Entries sorted by display order then ID.</returns>
        public IReadOnlyList<FacilityBalanceEntry> GetOrderedEntries()
        {
            return entries
                .Where(static entry => entry != null && !string.IsNullOrWhiteSpace(entry.facilityId))
                .OrderBy(static entry => entry.displayOrder)
                .ThenBy(static entry => entry.facilityId, StringComparer.Ordinal)
                .ToList();
        }

        /// <summary>
        /// Tries to resolve an entry for a facility ID.
        /// </summary>
        /// <param name="facilityId">Facility ID.</param>
        /// <param name="entry">Resolved entry.</param>
        /// <returns>True if the entry exists.</returns>
        public bool TryGetEntry(string facilityId, out FacilityBalanceEntry entry)
        {
            if (_byId == null)
            {
                RebuildLookup();
            }

            if (string.IsNullOrWhiteSpace(facilityId))
            {
                entry = null;
                return false;
            }

            return _byId.TryGetValue(facilityId, out entry);
        }

        /// <summary>
        /// Replaces profile entries and rebuilds lookup caches.
        /// </summary>
        /// <param name="newEntries">Replacement entries.</param>
        public void ReplaceEntries(List<FacilityBalanceEntry> newEntries)
        {
            entries = newEntries ?? new List<FacilityBalanceEntry>();
            RebuildLookup();
        }

        /// <summary>
        /// Rebuilds internal lookup dictionary.
        /// </summary>
        private void RebuildLookup()
        {
            _byId = new Dictionary<string, FacilityBalanceEntry>(StringComparer.Ordinal);
            if (entries == null)
            {
                return;
            }

            for (int i = 0; i < entries.Count; i++)
            {
                FacilityBalanceEntry entry = entries[i];
                if (entry == null || string.IsNullOrWhiteSpace(entry.facilityId))
                {
                    continue;
                }

                if (_byId.ContainsKey(entry.facilityId))
                {
                    Debug.LogWarning($"Duplicate facility balance entry '{entry.facilityId}' in {name}.", this);
                    continue;
                }

                _byId.Add(entry.facilityId, entry);
            }
        }
    }
}
