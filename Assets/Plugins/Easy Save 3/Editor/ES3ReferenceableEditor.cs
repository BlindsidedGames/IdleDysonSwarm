using UnityEditor;
using UnityEngine;

namespace ES3Internal
{
    [CustomEditor(typeof(ES3Referenceable))]
    public class ES3ReferenceableEditor : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            if (target == null)
                return;

            EditorGUILayout.HelpBox("Use this Component in conjunction with the 'Only add references from objects with ES3Referenceable' setting in 'Tools > Easy Save 3 > Settings' to choose which GameObject's dependencies are added to the manager.\nNote that you only need to add this once for each top-level GameObject in your scene because parents and children are dependencies of each other.", MessageType.Info);
        } 
    }
}