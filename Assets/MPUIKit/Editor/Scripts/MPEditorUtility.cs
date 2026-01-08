using System;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MPUIKIT.Editor {
    public static class MPEditorUtility {
        [MenuItem("GameObject/UI/MPImage")]
        public static void AddMPImageObject() {
            GameObject g = new GameObject {name = "MPImage"};

            Transform parent = GetParentTransform();
            g.transform.SetParent(parent, false);
            g.AddComponent<MPImage>();
            Selection.activeGameObject = g;
            
            Undo.RegisterCreatedObjectUndo(g, "MPImage Created");
            EditorUtility.SetDirty(g);
        }
        
        [MenuItem("GameObject/UI/MPImage Basic")]
        public static void AddMPImageBasicObject() {
            GameObject g = new GameObject {name = "MPImageBasic"};
            Transform parent = GetParentTransform();
            g.transform.SetParent(parent, false);
            g.AddComponent<MPImageBasic>();
            Selection.activeGameObject = g;
            
            Undo.RegisterCreatedObjectUndo(g, "MPImage Basic Created");
            EditorUtility.SetDirty(g);
        }

        private static Transform GetParentTransform()
        {
            Transform parent;
            if (Selection.activeGameObject != null &&
                Selection.activeGameObject.GetComponentInParent<Canvas>() != null)
            {
                parent = Selection.activeGameObject.transform;
            }
            else
            {
                Canvas c = GetCanvas();
                AddAdditionalShaderChannelsToCanvas(c);
                parent = c.transform;
            }

            return parent;
        }

        private static Canvas GetCanvas()
        {
            StageHandle handle = StageUtility.GetCurrentStageHandle();
            if (!handle.FindComponentOfType<Canvas>())
            {
                EditorApplication.ExecuteMenuItem("GameObject/UI/Canvas");
            }

            Canvas c = handle.FindComponentOfType<Canvas>();
            return c;
        }

        [MenuItem("CONTEXT/Image/Replace with MPImage")]
        public static void ReplaceWithMPImage(MenuCommand command) {
            if(command.context is MPImage) return;
            if (command.context is MPImageBasic) {
                // Convert MPImageBasic to MPImage
                MPImageBasic img = (MPImageBasic) command.context;
                GameObject obj = img.gameObject;
                Object.DestroyImmediate(img);
                obj.AddComponent<MPImage>();
                EditorUtility.SetDirty(obj);
            }
            else {
                Image img = (Image) command.context;
                GameObject obj = img.gameObject;
                Object.DestroyImmediate(img);
                obj.AddComponent<MPImage>();
                EditorUtility.SetDirty(obj);
            }
            
        }
        
        [MenuItem("CONTEXT/Image/Replace with MPImage Basic")]
        public static void ReplaceWithMPImageBasic(MenuCommand command) {
            if(command.context is MPImageBasic) return;
            if (command.context is MPImage) {
                // Convert MPImage to MPImageBasic
                MPImage img = (MPImage) command.context;
                GameObject obj = img.gameObject;
                Object.DestroyImmediate(img);
                obj.AddComponent<MPImageBasic>();
                EditorUtility.SetDirty(obj);
            }
            else {
                Image img = (Image) command.context;
                GameObject obj = img.gameObject;
                Object.DestroyImmediate(img);
                obj.AddComponent<MPImageBasic>();
                EditorUtility.SetDirty(obj);
            }
        }

        internal static void AddAdditionalShaderChannelsToCanvas(Canvas c) {
            AdditionalCanvasShaderChannels additionalShaderChannels = c.additionalShaderChannels;
            additionalShaderChannels |= AdditionalCanvasShaderChannels.TexCoord1;
            additionalShaderChannels |= AdditionalCanvasShaderChannels.TexCoord2;
            c.additionalShaderChannels = additionalShaderChannels;
        }

        internal static bool HasAdditionalShaderChannels(Canvas c) {
            AdditionalCanvasShaderChannels asc = c.additionalShaderChannels;
            return (asc & AdditionalCanvasShaderChannels.TexCoord1) != 0 &&
                   (asc & AdditionalCanvasShaderChannels.TexCoord2) != 0;
        }
        
        public static void CornerRadiusModeGUI(Rect rect, ref SerializedProperty property, string[] toolBarHeading,
            string label = "Corner Radius") {
            bool boolVal = property.boolValue;
            Rect labelRect = new Rect(rect.x, rect.y, EditorGUIUtility.labelWidth, rect.height);
            Rect toolBarRect = new Rect(rect.x + EditorGUIUtility.labelWidth, rect.y,
                rect.width - EditorGUIUtility.labelWidth, rect.height);

            EditorGUI.BeginChangeCheck();
            {
                EditorGUI.showMixedValue = property.hasMultipleDifferentValues;
                EditorGUI.LabelField(labelRect, label);

                boolVal = GUI.Toolbar(toolBarRect, boolVal ? 1 : 0, toolBarHeading) == 1;
                EditorGUI.showMixedValue = false;
            }
            if (EditorGUI.EndChangeCheck()) {
                property.boolValue = boolVal;
            }
        }
        
        private static Sprite _emptySprite;

        internal static Sprite EmptySprite {
            get {
                if (_emptySprite == null) {
                    _emptySprite = Resources.Load<Sprite>("mpui_default_empty_sprite");
                }

                return _emptySprite;
            }
        }
        
        internal static string FindMPUIKitRootDirectory()
        {
            string guid = AssetDatabase.FindAssets("MPImage t:Shader").FirstOrDefault();
            string path = AssetDatabase.GUIDToAssetPath(guid);
            if(string.IsNullOrEmpty(path)) return String.Empty;
            string[] directories = path.Split(new[] {Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar});
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < directories.Length; i++)
            {
                sb.Append(directories[i]);
                sb.Append(Path.DirectorySeparatorChar);
                if(directories[i].Equals("MPUIKit", StringComparison.OrdinalIgnoreCase))
                    break;
            }
            return sb.ToString();
        }
    }
}