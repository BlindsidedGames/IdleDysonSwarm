using System;
using UnityEditor;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIIndentLevel : IDisposable
    {
        readonly int m_Indent;

        public IMGUIIndentLevel(int indent)
        {
            m_Indent = indent;
            EditorGUI.indentLevel += m_Indent;
        }

        public void Dispose()
        {
            EditorGUI.indentLevel -= m_Indent;
        }
    }
}
