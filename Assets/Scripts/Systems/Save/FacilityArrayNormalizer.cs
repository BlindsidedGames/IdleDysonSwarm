using System;
using System.Collections.Generic;
using Expansion;

namespace Systems.Save
{
    /// <summary>
    /// Legacy bridge for facility arrays that were previously stored in a "sparse list" form for clipboard compaction.
    /// V11 canonical saves keep dense arrays; this merges sparse -> dense then clears sparse lists.
    /// </summary>
    public static class FacilityArrayNormalizer
    {
        // Facility arrays are "auto/manual" or "manual/auto" (2 slots) throughout DysonVerseInfinityData.
        private const int FacilitySlots = 2;

        public static void Normalize(Oracle.DysonVerseInfinityData data)
        {
            if (data == null) return;
            EnsureDenseArraysAndMergeSparse(data);
            ClearSparseLists(data);
        }

        public static void EnsureDenseArraysAndMergeSparse(Oracle.DysonVerseInfinityData data)
        {
            if (data == null) return;

            data.assemblyLines = EnsureFacilityArray(data.assemblyLines, FacilitySlots);
            MergeSparseIntoArray(data.assemblyLines, data.assemblyLinesSparseIndices, data.assemblyLinesSparseValues);

            data.managers = EnsureFacilityArray(data.managers, FacilitySlots);
            MergeSparseIntoArray(data.managers, data.managersSparseIndices, data.managersSparseValues);

            data.servers = EnsureFacilityArray(data.servers, FacilitySlots);
            MergeSparseIntoArray(data.servers, data.serversSparseIndices, data.serversSparseValues);

            data.dataCenters = EnsureFacilityArray(data.dataCenters, FacilitySlots);
            MergeSparseIntoArray(data.dataCenters, data.dataCentersSparseIndices, data.dataCentersSparseValues);

            data.planets = EnsureFacilityArray(data.planets, FacilitySlots);
            MergeSparseIntoArray(data.planets, data.planetsSparseIndices, data.planetsSparseValues);

            data.matrioshkaBrains = EnsureFacilityArray(data.matrioshkaBrains, FacilitySlots);
            MergeSparseIntoArray(data.matrioshkaBrains, data.matrioshkaBrainsSparseIndices, data.matrioshkaBrainsSparseValues);

            data.birchPlanets = EnsureFacilityArray(data.birchPlanets, FacilitySlots);
            MergeSparseIntoArray(data.birchPlanets, data.birchPlanetsSparseIndices, data.birchPlanetsSparseValues);

            data.galacticBrains = EnsureFacilityArray(data.galacticBrains, FacilitySlots);
            MergeSparseIntoArray(data.galacticBrains, data.galacticBrainsSparseIndices, data.galacticBrainsSparseValues);
        }

        public static void ClearSparseLists(Oracle.DysonVerseInfinityData data)
        {
            if (data == null) return;

            data.assemblyLinesSparseIndices = null;
            data.assemblyLinesSparseValues = null;
            data.managersSparseIndices = null;
            data.managersSparseValues = null;
            data.serversSparseIndices = null;
            data.serversSparseValues = null;
            data.dataCentersSparseIndices = null;
            data.dataCentersSparseValues = null;
            data.planetsSparseIndices = null;
            data.planetsSparseValues = null;
            data.matrioshkaBrainsSparseIndices = null;
            data.matrioshkaBrainsSparseValues = null;
            data.birchPlanetsSparseIndices = null;
            data.birchPlanetsSparseValues = null;
            data.galacticBrainsSparseIndices = null;
            data.galacticBrainsSparseValues = null;
        }

        private static double[] EnsureFacilityArray(double[] existing, int length)
        {
            if (existing != null && existing.Length == length) return existing;
            var result = new double[length];
            if (existing == null) return result;
            int copy = Math.Min(existing.Length, length);
            for (int i = 0; i < copy; i++)
            {
                result[i] = existing[i];
            }
            return result;
        }

        private static void MergeSparseIntoArray(double[] dense, List<int> indices, List<double> values)
        {
            if (dense == null) return;
            if (indices == null || values == null) return;
            int count = Math.Min(indices.Count, values.Count);
            for (int i = 0; i < count; i++)
            {
                int index = indices[i];
                if (index < 0 || index >= dense.Length) continue;
                double sparseValue = values[i];
                if (sparseValue > dense[index])
                {
                    dense[index] = sparseValue;
                }
            }
        }
    }
}

