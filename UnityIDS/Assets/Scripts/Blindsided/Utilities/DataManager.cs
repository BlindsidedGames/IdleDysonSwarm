#if UNITY_EDITOR
using System;
using System.Linq;
using Sirenix.OdinInspector.Editor;
using UnityEditor;

namespace Blindsided.Utilities
{
    public class DataManager : OdinMenuEditorWindow
    {
        private static readonly Type[] typesToDisplay = TypeCache.GetTypesWithAttribute<ManageableDataAttribute>()
            .OrderBy(m => m.Name)
            .ToArray();

        private Type selectedType;
        private string searchTerm = string.Empty;

        [MenuItem("DataManagement/Data Manager")]
        private static void OpenEditor()
        {
            GetWindow<DataManager>();
        }

        protected override OdinMenuTree BuildMenuTree()
        {
            OdinMenuTree tree = new OdinMenuTree();
            foreach (Type type in typesToDisplay)
                tree.AddAllAssetsAtPath(type.Name, "Assets/", type, true, true);

            tree.Config.SearchToolbarHeight = 20;
            tree.Config.DrawSearchToolbar = true;

            return tree;
        }

        protected override void OnImGUI()
        {
            // string newSearchTerm = EditorGUILayout.TextField("Search", searchTerm);
            // if (newSearchTerm != searchTerm) {
            //     searchTerm = newSearchTerm;
            //     if (!string.IsNullOrEmpty(searchTerm)) {
            //         MenuTree.Config.SearchTerm = searchTerm;
            //     }
            //     else {
            //         MenuTree.Config.SearchTerm = null;
            //     }
            // }
            base.OnImGUI();
        }
    }
}
#endif