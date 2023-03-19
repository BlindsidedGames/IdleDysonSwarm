using System.IO;
using StansAssets.Foundation.Editor;
using UnityEngine;
using UnityEditor;
using UnityEngine.Networking;

namespace SA.Foundation.Editor
{
    public static class SA_PackageManager
    {
        public static void DownloadAndImport(string packageName, string packageUrl, bool interactive)
        {
            var request = EditorWebRequest.Get(packageUrl);

            request.AddEditorProgressDialog(packageName);
            request.Send(unityRequest =>
            {
                if (unityRequest.error != null)
                {
                    EditorUtility.DisplayDialog("Package Download failed.", unityRequest.error, "Ok");
                    return;
                }

                //Asset folder name remove
                var projectPath = Application.dataPath.Substring(0, Application.dataPath.Length - 6);
                var tmpPackageFile = projectPath + FileUtil.GetUniqueTempPathInProject() + ".unityPackage";

                File.WriteAllBytes(tmpPackageFile, unityRequest.downloadHandler.data);


                AssetDatabase.ImportPackage(tmpPackageFile, interactive);
            });
        }
    }
}
