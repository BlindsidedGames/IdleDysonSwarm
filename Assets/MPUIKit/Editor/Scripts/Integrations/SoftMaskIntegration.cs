using System.IO;
using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
    public class SoftMaskIntegration
    {

        public static void SetupMPUIKitForSoftMask(bool toggle, string softMaskCgincLocation)
        {
            SetupShaderForSoftMask(Shader.Find("MPUI/Procedural Image"), toggle, softMaskCgincLocation);
            SetupShaderForSoftMask(Shader.Find("MPUI/Basic Procedural Image"), toggle, softMaskCgincLocation);
        }
        private static void SetupShaderForSoftMask(Shader shader, bool toggle, string softMaskLocation = null)
        {
            string shaderPath = AssetDatabase.GetAssetPath(shader);
            string[] lines = File.ReadAllLines(shaderPath);

            for (int i = 0; i < lines.Length; i++)
            {
                if (lines[i].Contains("SOFTMASK_HANDLE_START"))
                {
                    if (toggle)
                    {
                        if(lines[i].Contains("/*"))
                            lines[i] = lines[i].Replace("/*", string.Empty);
                    }
                    else
                    {
                        if(lines[i].Contains("/* //")) return;
                        lines[i] = lines[i].Replace("//", "/* //");
                    }
                }else if (lines[i].Contains("SOFTMASK_HANDLE_END"))
                {
                    if (toggle)
                    {
                        if(lines[i].Contains("*/"))
                            lines[i] = lines[i].Replace("*/", string.Empty);
                    }
                    else
                    {
                        if(lines[i].Contains("*/ //")) return;
                        lines[i] = lines[i].Replace("//", "*/ //");
                    }
                }
                
                else if (lines[i].Contains("SOFTMASK_INCLUDE_HANDLE"))
                {
                    lines[i] = "\t\t\t#include \"" + softMaskLocation + "\" //SOFTMASK_INCLUDE_HANDLE";
                }
            }
            
            File.WriteAllLines(shaderPath, lines);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
    }
}