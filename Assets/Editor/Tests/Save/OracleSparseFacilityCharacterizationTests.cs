using System;
using System.Collections.Generic;
using System.Reflection;
using Expansion;
using NUnit.Framework;

namespace Tests.Save
{
    [TestFixture]
    public sealed class OracleSparseFacilityCharacterizationTests
    {
        private static MethodInfo GetPrivateStatic(string name, params Type[] parameterTypes)
        {
            var method = typeof(Oracle).GetMethod(
                name,
                BindingFlags.NonPublic | BindingFlags.Static,
                binder: null,
                types: parameterTypes,
                modifiers: null);
            if (method == null)
            {
                string signature = string.Join(
                    ",",
                    Array.ConvertAll(parameterTypes, t => t == null ? "null" : t.Name));
                Assert.Fail($"Missing private static Oracle.{name}({signature}).");
            }
            return method;
        }

        [Test]
        public void PopulateSparseArrays_WithDenseCounts_PopulatesSparseAndOptionallyNullsDense()
        {
            // Characterize current behavior for facility sparse conversion:
            // - indices/values are derived from dense arrays
            // - when compactArrays=true, dense arrays are set to null

            var data = new Oracle.DysonVerseInfinityData();
            data.assemblyLines = new double[] { 0, 7 }; // manual only

            MethodInfo populateSparse = GetPrivateStatic(
                "PopulateSparseArrays",
                typeof(Oracle.DysonVerseInfinityData),
                typeof(bool));

            // Act
            populateSparse.Invoke(null, new object[] { data, true });

            // Assert
            Assert.IsNotNull(data.assemblyLinesSparseIndices);
            Assert.IsNotNull(data.assemblyLinesSparseValues);
            Assert.AreEqual(1, data.assemblyLinesSparseIndices.Count);
            Assert.AreEqual(1, data.assemblyLinesSparseValues.Count);
            Assert.AreEqual(1, data.assemblyLinesSparseIndices[0], "Expected index 1 (manual slot) captured.");
            Assert.AreEqual(7, data.assemblyLinesSparseValues[0], "Expected value 7 captured.");
            Assert.IsNull(data.assemblyLines, "Expected dense array nulled when compactArrays=true.");
        }

        [Test]
        public void PopulateSparseArrays_WithNullDense_ClearsExistingSparseLists()
        {
            // Characterize the sharp edge:
            // BuildSparseIndices() clears indices/values and returns early when dense is null.
            // PopulateSparseArrays() calls BuildSparseIndices() unconditionally, so existing sparse data can be wiped.

            var data = new Oracle.DysonVerseInfinityData();
            data.assemblyLines = null;
            data.assemblyLinesSparseIndices = new List<int> { 1 };
            data.assemblyLinesSparseValues = new List<double> { 42 };

            MethodInfo populateSparse = GetPrivateStatic(
                "PopulateSparseArrays",
                typeof(Oracle.DysonVerseInfinityData),
                typeof(bool));

            // Act
            populateSparse.Invoke(null, new object[] { data, false });

            // Assert (current behavior)
            Assert.AreEqual(0, data.assemblyLinesSparseIndices.Count);
            Assert.AreEqual(0, data.assemblyLinesSparseValues.Count);
        }

        [Test]
        public void RestoreSparseArray_WithSparsePresent_RestoresDenseArray()
        {
            MethodInfo restore = GetPrivateStatic(
                "RestoreSparseArray",
                typeof(double[]),
                typeof(int),
                typeof(List<int>),
                typeof(List<double>));

            double[] existing = null;
            int length = 2;
            var idx = new List<int> { 1 };
            var vals = new List<double> { 9 };

            // Act
            var restored = (double[])restore.Invoke(null, new object[] { existing, length, idx, vals });

            // Assert
            Assert.IsNotNull(restored);
            Assert.AreEqual(2, restored.Length);
            Assert.AreEqual(0, restored[0]);
            Assert.AreEqual(9, restored[1]);
        }

        [Test]
        public void RestoreSparseArray_WithNoSparseAndWrongExisting_ReturnsZeros()
        {
            MethodInfo restore = GetPrivateStatic(
                "RestoreSparseArray",
                typeof(double[]),
                typeof(int),
                typeof(List<int>),
                typeof(List<double>));

            double[] existing = new double[] { 1, 2, 3 }; // wrong length
            int length = 2;

            // Act
            var restored = (double[])restore.Invoke(null, new object[] { existing, length, new List<int>(), new List<double>() });

            // Assert
            Assert.IsNotNull(restored);
            Assert.AreEqual(2, restored.Length);
            Assert.AreEqual(0, restored[0]);
            Assert.AreEqual(0, restored[1]);
        }
    }
}
