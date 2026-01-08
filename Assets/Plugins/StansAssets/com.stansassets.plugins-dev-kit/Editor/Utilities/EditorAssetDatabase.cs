using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class EditorAssetDatabase : MonoBehaviour
    {
        static readonly Dictionary<string, Texture2D> s_Icons = new Dictionary<string, Texture2D>();

        /// <summary>
        /// Load a Font Asset at project folder relative path
        /// Also texture import options will be changed to a editor 
        /// </summary>
        /// <param name="path">project folder relative texture path</param> 
        public static Font GetFontAtPath(string path)
        {
            return AssetDatabase.LoadAssetAtPath(path, typeof(Font)) as Font;
        }

        /// <summary>
        /// Load a TextAsset at project folder relative path
        /// Also texture import options will be changed to a editor 
        /// </summary>
        /// <param name="path">project folder relative texture path.</param> 
        public static TextAsset GetTextAssetAtPath(string path)
        {
            return AssetDatabase.LoadAssetAtPath(path, typeof(TextAsset)) as TextAsset;
        }

        /// <summary>
        /// Load a Texture Asset at project folder relative path
        /// Also texture import options will be changed to an editor
        /// </summary>
        /// <param name="path">project folder relative texture path</param> 
        public static Texture2D GetTextureAtPath(string path)
        {
            if (s_Icons.ContainsKey(path))
            {
                return s_Icons[path];
            }

            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            if (importer == null) return new Texture2D(0, 0);

            var importRequired = false;

            if (importer.mipmapEnabled)
            {
                importer.mipmapEnabled = false;
                importRequired = true;
            }

            if (importer.alphaIsTransparency != true)
            {
                importer.alphaIsTransparency = true;
                importRequired = true;
            }

            if (importer.wrapMode != TextureWrapMode.Clamp)
            {
                importer.wrapMode = TextureWrapMode.Clamp;
                importRequired = true;
            }

            if (importer.textureType != TextureImporterType.GUI)
            {
                importer.textureType = TextureImporterType.GUI;
                importRequired = true;
            }

            if (importer.npotScale != TextureImporterNPOTScale.None)
            {
                importer.npotScale = TextureImporterNPOTScale.None;
                importRequired = true;
            }

            if (importer.alphaSource != TextureImporterAlphaSource.FromInput)
            {
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importRequired = true;
            }

            //Should we make additional option for this?
            if (importer.isReadable != true)
            {
                importer.isReadable = true;
                importRequired = true;
            }

            var settings = importer.GetPlatformTextureSettings(EditorUserBuildSettings.activeBuildTarget.ToString());
            if (settings.overridden)
            {
                settings.overridden = false;
                importer.SetPlatformTextureSettings(settings);
            }

            settings = importer.GetDefaultPlatformTextureSettings();
            if (!settings.textureCompression.Equals(TextureImporterCompression.Uncompressed))
            {
                settings.textureCompression = TextureImporterCompression.Uncompressed;
                importRequired = true;
            }

            if (importRequired) importer.SetPlatformTextureSettings(settings);

            var tex = AssetDatabase.LoadAssetAtPath(path, typeof(Texture2D)) as Texture2D;
            s_Icons.Add(path, tex);

            return GetTextureAtPath(path);
        }
    }
}