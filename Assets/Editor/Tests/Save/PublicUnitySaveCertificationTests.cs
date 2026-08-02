/*
 * Purpose: Guards the public Unity save identity used by Web mapping coverage.
 * Runs: Unity EditMode test suite.
 * Primary entry points: CertificationIdentity_IsPinned and ValidateExactSource_RejectsDrift.
 */

using System;
using NUnit.Framework;
using Web;

namespace Tests.Save
{
    [TestFixture]
    public sealed class PublicUnitySaveCertificationTests
    {
        [Test]
        public void CertificationIdentity_IsPinnedToPublicThreePointZeroPointThreeTwoEightSchemaEleven()
        {
            Assert.AreEqual("3.0.328", PublicUnitySaveCertification.ApplicationVersion);
            Assert.AreEqual(11, PublicUnitySaveCertification.SaveSchema);
            Assert.AreEqual(
                "9b840fb2547ad507d4e529a610a031cc13782847",
                PublicUnitySaveCertification.SourceRevision);
            Assert.AreEqual("6000.3.9f1", PublicUnitySaveCertification.UnityEditorVersion);
            Assert.AreEqual(
                "Expansion.Oracle+SaveDataSettings",
                PublicUnitySaveCertification.SaveRootType);
            Assert.AreEqual(
                "0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4",
                PublicUnitySaveCertification.SchemaFieldCatalogSha256);

            Assert.DoesNotThrow(() => PublicUnitySaveCertification.ValidateExactSource(
                "3.0.328",
                11,
                "9B840FB2547AD507D4E529A610A031CC13782847"));
        }

        [TestCase("3.0.329", 11, "9b840fb2547ad507d4e529a610a031cc13782847")]
        [TestCase("3.0.328", 12, "9b840fb2547ad507d4e529a610a031cc13782847")]
        [TestCase("3.0.328", 11, "8b840fb2547ad507d4e529a610a031cc13782847")]
        public void ValidateExactSource_RejectsDrift(
            string applicationVersion,
            int saveSchema,
            string sourceRevision)
        {
            Assert.Throws<InvalidOperationException>(() =>
                PublicUnitySaveCertification.ValidateExactSource(
                    applicationVersion,
                    saveSchema,
                    sourceRevision));
        }
    }
}
