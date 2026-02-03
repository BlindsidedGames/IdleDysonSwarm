using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace Blindsided.ProceduralUIImage.Editor {
    [InitializeOnLoad]
    internal static class ProceduralUIImageEditorContents {
        private static string _proceduralUiImagesDirectory = string.Empty;

        private static GUIContent _flipHorizontalNormal, _flipHorizontalActive;
        private static GUIContent _flipVerticalNormal, _flipVerticalActive;

        private static GUIContent _rotateLeftNormal, _rotateLeftActive;
        private static GUIContent _rotateRightNormal, _rotateRightActive;

        static ProceduralUIImageEditorContents() {
            FindProceduralUiIconsDirectory();
        }

        public static GUIContent FlipHorizontalNormal {
            get {
                if (_flipHorizontalNormal != null) return _flipHorizontalNormal;
                _flipHorizontalNormal = new GUIContent(LoadImage("flip_h", false));
                return _flipHorizontalNormal;
            }
        }

        public static GUIContent FlipHorizontalActive {
            get {
                if (_flipHorizontalActive != null) return _flipHorizontalActive;
                _flipHorizontalActive = new GUIContent(LoadImage("flip_h", true));
                return _flipHorizontalActive;
            }
        }

        public static GUIContent FlipVerticalNormal {
            get {
                if (_flipVerticalNormal != null) return _flipVerticalNormal;
                _flipVerticalNormal = new GUIContent(LoadImage("flip_v", false));
                return _flipVerticalNormal;
            }
        }

        public static GUIContent FlipVerticalActive {
            get {
                if (_flipVerticalActive != null) return _flipVerticalActive;
                _flipVerticalActive = new GUIContent(LoadImage("flip_v", true));
                return _flipVerticalActive;
            }
        }

        public static GUIContent RotateLeftNormal {
            get {
                if (_rotateLeftNormal != null) return _rotateLeftNormal;
                _rotateLeftNormal = new GUIContent(LoadImage("rotate_left", false));
                return _rotateLeftNormal;
            }
        }

        public static GUIContent RotateLeftActive {
            get {
                if (_rotateLeftActive != null) return _rotateLeftActive;
                _rotateLeftActive = new GUIContent(LoadImage("rotate_left", true));
                return _rotateLeftActive;
            }
        }

        public static GUIContent RotateRightNormal {
            get {
                if (_rotateRightNormal != null) return _rotateRightNormal;
                _rotateRightNormal = new GUIContent(LoadImage("rotate_right", false));
                return _rotateRightNormal;
            }
        }

        public static GUIContent RotateRightActive {
            get {
                if (_rotateRightActive != null) return _rotateRightActive;
                _rotateRightActive = new GUIContent(LoadImage("rotate_right", true));
                return _rotateRightActive;
            }
        }

        private static void FindProceduralUiIconsDirectory() {
            string rootDir = FindProceduralUIImageRootDirectory();
            _proceduralUiImagesDirectory = string.IsNullOrEmpty(rootDir)
                ? string.Empty
                : Path.Combine(rootDir, "Editor", "Images");
        }

        private static Texture2D LoadImage(string name, bool activeState) {
            int colorLevel;
            if (activeState) colorLevel = 3;
            else colorLevel = EditorGUIUtility.isProSkin ? 2 : 1;

            if (_proceduralUiImagesDirectory == string.Empty) FindProceduralUiIconsDirectory();

            string assetPath =
                $"{_proceduralUiImagesDirectory}{Path.DirectorySeparatorChar}{name}_{colorLevel}.png";
            return AssetDatabase.LoadAssetAtPath(assetPath, typeof(Texture2D)) as Texture2D;
        }

        private static string FindProceduralUIImageRootDirectory() {
            string guid = AssetDatabase.FindAssets("ProceduralUIImage t:Shader").FirstOrDefault();
            string path = AssetDatabase.GUIDToAssetPath(guid);
            if (string.IsNullOrEmpty(path)) return string.Empty;
            string[] directories = path.Split(new[] {Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar});
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < directories.Length; i++) {
                sb.Append(directories[i]);
                sb.Append(Path.DirectorySeparatorChar);
                if (directories[i].Equals("ProceduraUIImage", System.StringComparison.OrdinalIgnoreCase))
                    break;
            }
            return sb.ToString();
        }
    }
}


