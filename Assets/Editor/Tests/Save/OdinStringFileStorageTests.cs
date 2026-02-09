using System;
using System.IO;
using NUnit.Framework;
using Systems.Save;

namespace Tests.Save
{
    [TestFixture]
    public sealed class OdinStringFileStorageTests
    {
        [Test]
        public void WriteAndRead_RoundTripsText_AndCreatesBackups()
        {
            string root = Path.Combine(Path.GetTempPath(), "ids-save-test-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupDir = Path.Combine(root, "backups");

            Directory.CreateDirectory(root);

            try
            {
                var storage = new OdinStringFileStorage(filePath, backupFolderPath: backupDir, maxBackups: 2);

                Assert.IsFalse(storage.Exists());

                Assert.IsTrue(storage.TryWriteTextAtomic("IDB1:one", out string error1), error1);
                Assert.IsTrue(storage.Exists());

                Assert.IsTrue(storage.TryReadText(out string read1, out string readErr1), readErr1);
                Assert.AreEqual("IDB1:one", read1);

                Assert.IsTrue(storage.TryWriteTextAtomic("IDB1:two", out string error2), error2);

                Assert.IsTrue(storage.TryReadText(out string read2, out string readErr2), readErr2);
                Assert.AreEqual("IDB1:two", read2);

                string[] backups = Directory.Exists(backupDir) ? Directory.GetFiles(backupDir) : Array.Empty<string>();
                Assert.IsTrue(backups.Length >= 1, "Expected at least one backup after overwriting existing save.");
            }
            finally
            {
                try { Directory.Delete(root, recursive: true); } catch { /* best-effort */ }
            }
        }

        [Test]
        public void WriteAtomic_WithEmptyText_DoesNotOverwriteExisting()
        {
            string root = Path.Combine(Path.GetTempPath(), "ids-save-test-" + Guid.NewGuid().ToString("N"));
            string filePath = Path.Combine(root, "save.txt");
            string backupDir = Path.Combine(root, "backups");

            Directory.CreateDirectory(root);

            try
            {
                File.WriteAllText(filePath, "IDB1:baseline");

                var storage = new OdinStringFileStorage(filePath, backupFolderPath: backupDir, maxBackups: 2);

                Assert.IsFalse(storage.TryWriteTextAtomic("", out _));

                Assert.IsTrue(storage.TryReadText(out string read, out _));
                Assert.AreEqual("IDB1:baseline", read);
            }
            finally
            {
                try { Directory.Delete(root, recursive: true); } catch { /* best-effort */ }
            }
        }
    }
}

