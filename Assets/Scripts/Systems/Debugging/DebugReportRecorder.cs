using System;
using System.Globalization;
using System.IO;
using UnityEngine;

namespace Systems.Debugging
{
    public static class DebugReportRecorder
    {
        private static string _lastReportName;
        private static string _lastReportText;
        private static DateTime _lastReportUtc;
        private static string _lastExportPath;

        public static bool HasReport => !string.IsNullOrEmpty(_lastReportText);
        public static string LastReportName => _lastReportName;
        public static string LastReportText => _lastReportText;
        public static DateTime LastReportUtc => _lastReportUtc;
        public static string LastExportPath => _lastExportPath;

        public static void Record(string reportName, string reportText)
        {
            if (string.IsNullOrWhiteSpace(reportText))
            {
                return;
            }

            _lastReportName = string.IsNullOrWhiteSpace(reportName) ? "Debug Report" : reportName.Trim();
            _lastReportText = reportText;
            _lastReportUtc = DateTime.UtcNow;
        }

        public static string ExportLastReport(string directory = null)
        {
            if (!HasReport)
            {
                return null;
            }

            string targetDirectory = ResolveDirectory(directory);
            Directory.CreateDirectory(targetDirectory);

            string safeName = SanitizeFileName(_lastReportName ?? "DebugReport");
            string timestamp = _lastReportUtc.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
            string filename = $"{safeName}_{timestamp}.txt";
            string path = Path.Combine(targetDirectory, filename);

            File.WriteAllText(path, _lastReportText);
            _lastExportPath = path;
            return path;
        }

        private static string ResolveDirectory(string directory)
        {
            if (!string.IsNullOrWhiteSpace(directory))
            {
                return directory;
            }

            string tempPath = null;
            try
            {
                tempPath = Path.GetTempPath();
            }
            catch (Exception)
            {
                tempPath = null;
            }

            if (!string.IsNullOrWhiteSpace(tempPath))
            {
                return tempPath;
            }

            return Application.persistentDataPath;
        }

        private static string SanitizeFileName(string name)
        {
            char[] invalid = Path.GetInvalidFileNameChars();
            foreach (char invalidChar in invalid)
            {
                name = name.Replace(invalidChar, '_');
            }

            return name;
        }
    }
}
