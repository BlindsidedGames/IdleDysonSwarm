using System.IO;
using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
    [CustomEditor(typeof(MPUIKitSettings))]
    public class MPUIKitSettingsEditor : UnityEditor.Editor
    {

        private SerializedProperty _spInstallSoftMaskSupport;
        private SerializedProperty _spSoftMaskCgincLocation;

        private bool _softMAskSupport;
        private string _softMaskCgincLocation = "Packages/com.olegknyazev.softmask/Assets/Shaders/Resources/SoftMask.cginc";

        private GUIStyle boxStyle = null;
        private bool _error;
        private string _errorMessage;

        private void OnEnable()
        {
            _spInstallSoftMaskSupport = serializedObject.FindProperty("m_SoftMaskSupportInstalled");
            _spSoftMaskCgincLocation = serializedObject.FindProperty("m_SoftMaskCgincLocation");
            
            _softMAskSupport = _spInstallSoftMaskSupport.boolValue;
            if(!string.IsNullOrEmpty(_spSoftMaskCgincLocation.stringValue)) 
                _softMaskCgincLocation = _spSoftMaskCgincLocation.stringValue;
        }

        public override void OnInspectorGUI()
        {
            if (boxStyle == null) boxStyle = new GUIStyle(GUI.skin.box) {padding = new RectOffset(8, 8, 8, 8)}; 
            
            EditorGUILayout.BeginVertical(boxStyle, GUILayout.MaxHeight(170), GUILayout.MinHeight(170));
            {
                EditorGUILayout.LabelField("Integrations", EditorStyles.centeredGreyMiniLabel);
                SoftMaskSupportGUI();
                GUILayout.Space(10);
                if (_error)
                {
                    EditorGUILayout.HelpBox(_errorMessage, MessageType.Error);
                }
                GUILayout.FlexibleSpace();
                EditorGUI.BeginDisabledGroup(_error);
                {
                    if (GUILayout.Button("Apply")) ApplySettings();
                }
                EditorGUI.EndDisabledGroup();
            }
            EditorGUILayout.EndVertical();
        }

        private void SoftMaskSupportGUI()
        {
            _softMAskSupport = EditorGUILayout.ToggleLeft("SoftMask by Oleg Knyazev", _softMAskSupport );
            if (_softMAskSupport)
            {
                _softMaskCgincLocation = EditorGUILayout.TextField("SoftMask.cginc Location", _softMaskCgincLocation);
                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.FlexibleSpace();
                    if (GUILayout.Button("Browse"))
                    {
                        string path = EditorUtility.OpenFilePanel("Locate SoftMask.cginc", "Assets", "cginc");
                        path = path.Replace(Application.dataPath, "Assets");
                        _softMaskCgincLocation = path;
                    }
                }
                EditorGUILayout.EndHorizontal();
                
                if (Path.GetFileName(_softMaskCgincLocation) != "SoftMask.cginc")
                {
                    _error = true;
                    _errorMessage = "location of SoftMask.cginc is not valid";
                }
                else
                {
                    _error = false;
                }
            }
        }


        private void ApplySettings()
        {
            _spSoftMaskCgincLocation.stringValue = _softMaskCgincLocation;
            _spInstallSoftMaskSupport.boolValue = _softMAskSupport;
            serializedObject.ApplyModifiedProperties();
            SoftMaskIntegration.SetupMPUIKitForSoftMask(_softMAskSupport, _softMaskCgincLocation);
        }
    }
}