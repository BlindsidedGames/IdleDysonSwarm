using UnityEngine;

namespace MPUIKIT {
    public static class MPMaterials {
        private const string MpBasicProceduralShaderName = "MPUI/Basic Procedural Image";
        private static string[] MpShapeKeywords = {"CIRCLE", "TRIANGLE", "RECTANGLE", "NSTAR_POLYGON"};
        private const string MpStrokeKeyword = "STROKE";
        private const string MpOutlineKeyword = "OUTLINED";
        private const string MpOutlinedStrokeKeyword = "OUTLINED_STROKE";
        private static Shader _proceduralShader;
        internal static Shader MPBasicProceduralShader
        {
            get {
                if (_proceduralShader == null)
                    _proceduralShader = Shader.Find(MpBasicProceduralShaderName);
                return _proceduralShader;
            }    
        }

        private static Material[] _materialDB = new Material[16];

        internal static ref Material GetMaterial(int shapeIndex, bool stroked, bool outlined) {
            int index = shapeIndex * 4;
            if (stroked && outlined) index += 3;
            else if (outlined) index += 2;
            else if (stroked) index += 1;

            ref Material mat = ref _materialDB[index];
            if (mat != null) return ref mat;
            
            mat = new Material(MPBasicProceduralShader);
            string shapeKeyword = MpShapeKeywords[shapeIndex];

            mat.name = $"Basic Procedural Sprite - {shapeKeyword} {(stroked?MpStrokeKeyword:string.Empty)} {(outlined?MpOutlineKeyword:string.Empty)}";
            mat.EnableKeyword(shapeKeyword);
            if(stroked && outlined) mat.EnableKeyword(MpOutlinedStrokeKeyword);
            else if(stroked) mat.EnableKeyword(MpStrokeKeyword);
            else if(outlined) mat.EnableKeyword(MpOutlineKeyword);

            return ref mat;
        }
    }
}