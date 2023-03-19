using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    public static class IMGUIReorderablList
    {
        static readonly Dictionary<int, bool> s_GlobalFoldoutItemsState = new Dictionary<int, bool>();

        public delegate string ItemName<T>(T item);

        public delegate void ItemContent<T>(T item);

        public delegate void OnItemAdd();

        public static void Draw<T>(IList<T> list, ItemName<T> itemName, ItemContent<T> itemContent = null, OnItemAdd onItemAdd = null, ItemContent<T> buttonsContentOverride = null, ItemContent<T> itemStartUI = null)
        {
            if (itemContent != null)
                DrawFoldout(list, itemName, itemContent, buttonsContentOverride, itemStartUI);
            else
                DrawLabel(list, itemName, buttonsContentOverride, itemStartUI);

            if (onItemAdd != null)
                using (new IMGUIBeginVertical())
                {
                    GUILayout.Space(-7);
                    using (new IMGUIBeginHorizontal())
                    {
                        EditorGUILayout.Space();
                        var add = GUILayout.Button("+", EditorStyles.miniButton, GUILayout.Width(24));
                        if (add)
                        {
                            onItemAdd();
                            return;
                        }

                        GUILayout.Space(5);
                    }
                }
        }

        static void DrawFoldout<T>(IList<T> list, ItemName<T> itemName, ItemContent<T> itemContent, ItemContent<T> buttonsContentOverride = null, ItemContent<T> itemStartUI = null)
        {
            var indentLevel = EditorGUI.indentLevel;

            var space = 10;
            if (indentLevel >= 1) space += EditorGUI.indentLevel * 10;

            EditorGUI.indentLevel = 0;

            for (var i = 0; i < list.Count; i++)
            {
                var item = list[i];

                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(space);
                    using (new IMGUIBeginVertical(PluginsEditorSkin.BoxStyle))
                    {
                        var foldState = GetFoldoutState(item);
                        using (new IMGUIBeginHorizontal())
                        {
                            itemStartUI?.Invoke(item);
                            foldState = EditorGUILayout.Foldout(foldState, itemName(item), true);

                            SetFoldoutState(item, foldState);

                            if (buttonsContentOverride != null)
                            {
                                buttonsContentOverride.Invoke(item);
                            }
                            else
                            {
                                var itemWasRemoved = DrawButtons(item, list);
                                if (itemWasRemoved) return;
                            }
                        }

                        if (foldState)
                            using (new IMGUIIndentLevel(1))
                            {
                                EditorGUILayout.Space();
                                itemContent(item);
                                EditorGUILayout.Space();
                            }
                    }

                    GUILayout.Space(5);
                }
            }

            EditorGUI.indentLevel = indentLevel;
        }

        static void DrawLabel<T>(IList<T> list, ItemName<T> itemName, ItemContent<T> buttonsContentOverride = null, ItemContent<T> itemStartUI = null)
        {
            var indentLevel = EditorGUI.indentLevel;

            var space = 10;
            if (indentLevel >= 1) space += EditorGUI.indentLevel * 10;

            EditorGUI.indentLevel = 0;

            foreach (var item in list)
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(space);
                    using (new IMGUIBeginVertical(PluginsEditorSkin.BoxStyle))
                    {
                        using (new IMGUIBeginHorizontal())
                        {
                            itemStartUI?.Invoke(item);

                            EditorGUILayout.SelectableLabel(itemName(item), GUILayout.Height(16));

                            if (buttonsContentOverride != null)
                            {
                                buttonsContentOverride.Invoke(item);
                            }
                            else
                            {
                                var itemWasRemoved = DrawButtons(item, list);
                                if (itemWasRemoved) return;
                            }
                        }
                    }
                }

            EditorGUI.indentLevel = indentLevel;
        }

        static bool GetFoldoutState(object item)
        {
            if (item == null) return false;
            return s_GlobalFoldoutItemsState.ContainsKey(item.GetHashCode())
                && s_GlobalFoldoutItemsState[item.GetHashCode()];
        }

        static void SetFoldoutState(object item, bool value)
        {
            if (item == null) return;
            s_GlobalFoldoutItemsState[item.GetHashCode()] = value;
        }

        static bool DrawButtons<T>(T currentObject, IList<T> objectsList)
        {
            var objectIndex = objectsList.IndexOf(currentObject);
            if (objectIndex == 0) GUI.enabled = false;

            var up = GUILayout.Button("↑", EditorStyles.miniButtonLeft, GUILayout.Width(20));
            if (up)
            {
                var c = currentObject;
                objectsList[objectIndex] = objectsList[objectIndex - 1];
                objectsList[objectIndex - 1] = c;
            }

            GUI.enabled = objectIndex < objectsList.Count - 1;

            var down = GUILayout.Button("↓", EditorStyles.miniButtonMid, GUILayout.Width(20));
            if (down)
            {
                var c = currentObject;
                objectsList[objectIndex] = objectsList[objectIndex + 1];
                objectsList[objectIndex + 1] = c;
            }

            GUI.enabled = true;
            var r = GUILayout.Button("-", EditorStyles.miniButtonRight, GUILayout.Width(20));
            if (r) objectsList.Remove(currentObject);

            return r;
        }
    }
}
