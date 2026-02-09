using System.Collections.Generic;
using Expansion;
using NUnit.Framework;
using Systems.Save;

namespace Tests.Save
{
    [TestFixture]
    public sealed class FacilityArrayNormalizerTests
    {
        [Test]
        public void Normalize_WithNullData_DoesNotThrow()
        {
            FacilityArrayNormalizer.Normalize(null);
        }

        [Test]
        public void Normalize_WithDenseNullAndSparsePresent_RestoresDenseAndClearsSparse()
        {
            var data = new Oracle.DysonVerseInfinityData();
            data.assemblyLines = null;
            data.assemblyLinesSparseIndices = new List<int> { 1 };
            data.assemblyLinesSparseValues = new List<double> { 7 };

            FacilityArrayNormalizer.Normalize(data);

            Assert.IsNotNull(data.assemblyLines);
            Assert.AreEqual(2, data.assemblyLines.Length);
            Assert.AreEqual(0, data.assemblyLines[0]);
            Assert.AreEqual(7, data.assemblyLines[1]);
            Assert.IsNull(data.assemblyLinesSparseIndices);
            Assert.IsNull(data.assemblyLinesSparseValues);
        }

        [Test]
        public void EnsureDenseArraysAndMergeSparse_UsesMaxPerSlot()
        {
            var data = new Oracle.DysonVerseInfinityData();
            data.assemblyLines = new double[] { 10, 0 };
            data.assemblyLinesSparseIndices = new List<int> { 0, 1 };
            data.assemblyLinesSparseValues = new List<double> { 5, 3 };

            FacilityArrayNormalizer.EnsureDenseArraysAndMergeSparse(data);

            Assert.IsNotNull(data.assemblyLines);
            Assert.AreEqual(2, data.assemblyLines.Length);
            Assert.AreEqual(10, data.assemblyLines[0], "Dense should win if higher.");
            Assert.AreEqual(3, data.assemblyLines[1], "Sparse should populate empty slots.");
        }

        [Test]
        public void EnsureDenseArraysAndMergeSparse_WhenDenseWrongLength_EnsuresTwoSlots()
        {
            var data = new Oracle.DysonVerseInfinityData();
            data.assemblyLines = new double[] { 4 }; // legacy/buggy length

            FacilityArrayNormalizer.EnsureDenseArraysAndMergeSparse(data);

            Assert.IsNotNull(data.assemblyLines);
            Assert.AreEqual(2, data.assemblyLines.Length);
            Assert.AreEqual(4, data.assemblyLines[0]);
            Assert.AreEqual(0, data.assemblyLines[1]);
        }

        [Test]
        public void ClearSparseLists_SetsAllSparseListsToNull()
        {
            var data = new Oracle.DysonVerseInfinityData();

            // DysonVerseInfinityData initializes these lists; ensure we always clear them for canonical saves.
            Assert.IsNotNull(data.assemblyLinesSparseIndices);
            Assert.IsNotNull(data.assemblyLinesSparseValues);

            FacilityArrayNormalizer.ClearSparseLists(data);

            Assert.IsNull(data.assemblyLinesSparseIndices);
            Assert.IsNull(data.assemblyLinesSparseValues);
            Assert.IsNull(data.managersSparseIndices);
            Assert.IsNull(data.managersSparseValues);
            Assert.IsNull(data.serversSparseIndices);
            Assert.IsNull(data.serversSparseValues);
            Assert.IsNull(data.dataCentersSparseIndices);
            Assert.IsNull(data.dataCentersSparseValues);
            Assert.IsNull(data.planetsSparseIndices);
            Assert.IsNull(data.planetsSparseValues);
            Assert.IsNull(data.matrioshkaBrainsSparseIndices);
            Assert.IsNull(data.matrioshkaBrainsSparseValues);
            Assert.IsNull(data.birchPlanetsSparseIndices);
            Assert.IsNull(data.birchPlanetsSparseValues);
            Assert.IsNull(data.galacticBrainsSparseIndices);
            Assert.IsNull(data.galacticBrainsSparseValues);
        }
    }
}
