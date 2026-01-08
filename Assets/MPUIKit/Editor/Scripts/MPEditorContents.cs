using System.IO;
using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor {
    [InitializeOnLoad]
    internal static class MPEditorContents {
        private static string _mpuiKitImagesDirectory = string.Empty;

        private static GUIContent _flipHorizontalNormal, _flipHorizontalActive;
        private static GUIContent _flipVerticalNormal, _flipVerticalActive;

        private static GUIContent _rotateLeftNormal, _rotateLeftActive;
        private static GUIContent _rotateRightNormal, _rotateRightActive;

        private static Texture2D _logo, _background, _title;

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

        public static Texture Logo {
            get {
                if (_logo != null) return _logo;
                _logo = LoadImage("logo", false, true);
                return _logo;
            }
        }
        
        public static Texture Background {
            get {
                if (_background != null) return _background;
                _background = LoadImage("background", false, true);
                return _background;
            }
        }
        
        public static Texture Title {
            get {
                if (_title != null) return _title;
                _title = LoadImage("title", false, true);
                return _title;
            }
        }

        static MPEditorContents() {
            FindMpuiKitIconsDirectory();
        }

        private static void FindMpuiKitIconsDirectory()
        {
            string rootDir = MPEditorUtility.FindMPUIKitRootDirectory();
            _mpuiKitImagesDirectory = string.IsNullOrEmpty(rootDir) ? string.Empty : Path.Combine(rootDir, "Editor", "Images");
        }

        private static Texture2D LoadImage(string name, bool activeState, bool ignoreState = false) {
            int colorLevel = 0;
            if (!ignoreState) {
                if (activeState) colorLevel = 3;
                else colorLevel = EditorGUIUtility.isProSkin ? 2 : 1;
            }
            
            if (_mpuiKitImagesDirectory == string.Empty) FindMpuiKitIconsDirectory();

            string assetPath = $"{_mpuiKitImagesDirectory}{Path.DirectorySeparatorChar}{name}{(ignoreState ? string.Empty : $"_{colorLevel}")}.png";
            return AssetDatabase.LoadAssetAtPath(assetPath, typeof(Texture2D)) as Texture2D;
        }
    }
}