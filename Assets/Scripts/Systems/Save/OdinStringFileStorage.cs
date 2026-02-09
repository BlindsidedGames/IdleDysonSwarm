using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEngine;

namespace Systems.Save
{
    /// <summary>
    /// Stores the canonical save string in a single on-disk text file and keeps rotating backups.
    /// The file contents are intended to be copy/paste friendly and identical to clipboard export.
    /// </summary>
    public sealed class OdinStringFileStorage : ISaveStorage
    {
        private const int DefaultBackupCount = 5;
        private const string TempSuffix = ".tmp";

        private readonly string _filePath;
        private readonly string _backupFolderPath;
        private readonly int _maxBackups;

        public OdinStringFileStorage(string filePath, string backupFolderPath = null, int maxBackups = DefaultBackupCount)
        {
            if (string.IsNullOrWhiteSpace(filePath)) throw new ArgumentException("filePath is required.", nameof(filePath));
            _filePath = filePath;
            _backupFolderPath = string.IsNullOrWhiteSpace(backupFolderPath)
                ? SavePaths.GetBackupFolderPath()
                : backupFolderPath;
            _maxBackups = Mathf.Clamp(maxBackups, 0, 50);
        }

        public string DebugName => _filePath;

        public bool Exists()
        {
            return File.Exists(_filePath);
        }

        public bool TryReadText(out string text, out string error)
        {
            text = string.Empty;
            error = null;
            try
            {
                if (!File.Exists(_filePath))
                {
                    error = "File not found.";
                    return false;
                }

                text = File.ReadAllText(_filePath, Encoding.UTF8)?.Trim();
                if (string.IsNullOrWhiteSpace(text))
                {
                    error = "File is empty.";
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        public bool TryWriteTextAtomic(string text, out string error)
        {
            error = null;
            if (string.IsNullOrWhiteSpace(text))
            {
                error = "Refusing to write empty save text.";
                return false;
            }

            string directory = Path.GetDirectoryName(_filePath);
            if (string.IsNullOrEmpty(directory))
            {
                error = "Invalid save path (no directory).";
                return false;
            }

            string tempPath = _filePath + TempSuffix;
            try
            {
                Directory.CreateDirectory(directory);
                Directory.CreateDirectory(_backupFolderPath);

                // Best-effort cleanup of a prior failed write.
                TryDelete(tempPath);

                if (_maxBackups > 0 && File.Exists(_filePath))
                {
                    CreateBackup();
                    PruneBackups();
                }

                File.WriteAllText(tempPath, text.Trim(), Encoding.UTF8);

                // Atomic replace (same directory).
                // Note: Unity's scripting runtime targets .NET Framework 4.7.1, so File.Move(..., overwrite)
                // is not available. Use File.Replace when the target exists.
                if (File.Exists(_filePath))
                {
                    File.Replace(tempPath, _filePath, destinationBackupFileName: null);
                }
                else
                {
                    File.Move(tempPath, _filePath);
                }
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
            finally
            {
                // If the move failed, leave original file intact; delete temp if it exists.
                TryDelete(tempPath);
            }
        }

        private void CreateBackup()
        {
            try
            {
                if (!File.Exists(_filePath)) return;

                string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
                string baseName = Path.GetFileName(_filePath);
                string backupName = $"{baseName}.{stamp}.bak";
                string backupPath = Path.Combine(_backupFolderPath, backupName);

                int counter = 1;
                while (File.Exists(backupPath) && counter < 100)
                {
                    backupName = $"{baseName}.{stamp}.{counter}.bak";
                    backupPath = Path.Combine(_backupFolderPath, backupName);
                    counter++;
                }

                File.Copy(_filePath, backupPath, overwrite: false);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SaveStorage] Failed creating backup for '{_filePath}': {ex.Message}");
            }
        }

        private void PruneBackups()
        {
            if (_maxBackups <= 0) return;
            try
            {
                if (!Directory.Exists(_backupFolderPath)) return;

                string baseName = Path.GetFileName(_filePath);
                string[] candidates = Directory.GetFiles(_backupFolderPath, $"{baseName}.*.bak");
                if (candidates == null || candidates.Length <= _maxBackups) return;

                var ordered = new List<FileInfo>(candidates.Length);
                foreach (string path in candidates)
                {
                    ordered.Add(new FileInfo(path));
                }
                ordered.Sort((a, b) => a.CreationTimeUtc.CompareTo(b.CreationTimeUtc));

                int toDelete = ordered.Count - _maxBackups;
                for (int i = 0; i < toDelete; i++)
                {
                    TryDelete(ordered[i].FullName);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[SaveStorage] Failed pruning backups: {ex.Message}");
            }
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                // ignored (best-effort)
            }
        }
    }
}
