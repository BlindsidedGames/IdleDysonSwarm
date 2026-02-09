using System.IO;
using UnityEngine;

namespace Systems.Save
{
    public static class SavePaths
    {
        // Disk file containing the exact canonical clipboard string (IDB1:...).
        public const string CanonicalSaveFileName = "idle_dyson_swarm_save.txt";

        // Folder used for rotating on-disk backups of the canonical save.
        public const string BackupFolderName = "save_backups";

        public static string GetCanonicalSavePath()
        {
            return Path.Combine(Application.persistentDataPath, CanonicalSaveFileName);
        }

        public static string GetBackupFolderPath()
        {
            return Path.Combine(Application.persistentDataPath, BackupFolderName);
        }
    }
}

