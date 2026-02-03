using System.Collections.Generic;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using MPUIKIT;
using Blindsided.ProceduralUIImage;

public static class ProceduralUIImageMigrator
{
    [MenuItem("Tools/Procedural UIImage/Migrate MPImage (Current Scene)")]
    public static void MigrateAll()
    {
        MigrateCurrentScene();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Procedural UIImage/Migrate MPImage (Current Scene + Prefabs, Preserve Overrides)")]
    public static void MigrateCurrentSceneWithOverrides()
    {
        var scene = SceneManager.GetActiveScene();
        if (!scene.IsValid())
            return;

        var overrides = CapturePrefabInstanceOverrides(scene);

        MigratePrefabs();
        MigrateCurrentSceneIncludingPrefabInstances(scene);
        RestorePrefabInstanceOverrides(overrides);

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Procedural UIImage/Migrate MPImage (Prefabs)")]
    public static void MigratePrefabsOnly()
    {
        MigratePrefabs();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    [MenuItem("Tools/Procedural UIImage/Migrate MPImage (All Scenes + Prefabs)")]
    public static void MigrateAllScenesAndPrefabs()
    {
        MigrateScenes();
        MigratePrefabs();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
    }

    private static void MigrateCurrentScene()
    {
        var scene = SceneManager.GetActiveScene();
        if (!scene.IsValid())
            return;

        bool changed = false;
        foreach (var mp in FindAll<MPImage>())
        {
            if (mp == null || mp.gameObject == null) continue;
            if (mp.gameObject.scene != scene) continue;
            if (PrefabUtility.IsPartOfPrefabInstance(mp))
                continue;
            changed |= Replace(mp);
        }

        if (changed)
            EditorSceneManager.SaveScene(scene);
    }

    private static void MigrateCurrentSceneIncludingPrefabInstances(Scene scene)
    {
        bool changed = false;
        foreach (var mp in FindAll<MPImage>())
        {
            if (mp == null || mp.gameObject == null) continue;
            if (mp.gameObject.scene != scene) continue;
            changed |= Replace(mp);
        }

        if (changed)
            EditorSceneManager.SaveScene(scene);
    }

    private static void MigrateScenes()
    {
        var sceneGuids = AssetDatabase.FindAssets("t:Scene");
        foreach (var guid in sceneGuids)
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var scene = EditorSceneManager.OpenScene(path, OpenSceneMode.Single);

            bool changed = false;
            foreach (var mp in FindAll<MPImage>())
            {
                if (mp == null || mp.gameObject == null) continue;
                if (mp.gameObject.scene != scene) continue;
                changed |= Replace(mp);
            }

            if (changed)
                EditorSceneManager.SaveScene(scene);
        }
    }

    private static void MigratePrefabs()
    {
        var prefabGuids = AssetDatabase.FindAssets("t:Prefab");
        foreach (var guid in prefabGuids)
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            var root = PrefabUtility.LoadPrefabContents(path);

            bool changed = false;
            foreach (var mp in root.GetComponentsInChildren<MPImage>(true))
            {
                changed |= Replace(mp);
            }

            if (changed)
                PrefabUtility.SaveAsPrefabAsset(root, path);

            PrefabUtility.UnloadPrefabContents(root);
        }
    }

    private static bool Replace(MPImage old)
    {
        if (old == null || old.gameObject == null)
            return false;

        var go = old.gameObject;
        var data = CaptureSerializedProperties(old);
        Object.DestroyImmediate(old, true);
        var replacement = go.AddComponent<ProceduralUIImage>();
        ApplySerializedProperties(replacement, data);
        EditorUtility.SetDirty(go);
        return true;
    }

    private struct PrefabOverrideData
    {
        public GlobalObjectId GameObjectId;
        public List<SerializedPropData> Properties;
    }

    private struct SerializedPropData
    {
        public string Path;
        public SerializedPropertyType Type;
        public object Value;
    }

    private static List<SerializedPropData> CaptureSerializedProperties(Object src)
    {
        var data = new List<SerializedPropData>();
        var srcSO = new SerializedObject(src);
        var prop = srcSO.GetIterator();
        if (prop.NextVisible(true))
        {
            do
            {
                if (prop.propertyPath == "m_Script")
                    continue;

                if (prop.propertyType == SerializedPropertyType.Generic)
                    continue;

                data.Add(new SerializedPropData
                {
                    Path = prop.propertyPath,
                    Type = prop.propertyType,
                    Value = GetPropertyValue(prop)
                });
            }
            while (prop.NextVisible(true));
        }

        return data;
    }

    private static List<SerializedPropData> CaptureSerializedProperties(Object src, PropertyModification[] mods)
    {
        var data = new List<SerializedPropData>();
        if (mods == null || mods.Length == 0)
            return data;

        var seen = new HashSet<string>();
        var srcSO = new SerializedObject(src);
        foreach (var mod in mods)
        {
            if (mod == null)
                continue;

            string path = mod.propertyPath;
            if (string.IsNullOrEmpty(path) || path == "m_Script")
                continue;

            if (!seen.Add(path))
                continue;

            var prop = srcSO.FindProperty(path);
            if (prop == null)
                continue;

            if (prop.propertyType == SerializedPropertyType.Generic)
                continue;

            data.Add(new SerializedPropData
            {
                Path = path,
                Type = prop.propertyType,
                Value = GetPropertyValue(prop)
            });
        }

        return data;
    }

    private static void ApplySerializedProperties(Object dst, List<SerializedPropData> data)
    {
        var dstSO = new SerializedObject(dst);
        foreach (var entry in data)
        {
            var prop = dstSO.FindProperty(entry.Path);
            if (prop == null)
                continue;

            SetPropertyValue(prop, entry.Type, entry.Value);
        }
        dstSO.ApplyModifiedPropertiesWithoutUndo();
    }

    private static List<PrefabOverrideData> CapturePrefabInstanceOverrides(Scene scene)
    {
        var results = new List<PrefabOverrideData>();
        foreach (var mp in FindAll<MPImage>())
        {
            if (mp == null || mp.gameObject == null) continue;
            if (mp.gameObject.scene != scene) continue;
            if (!PrefabUtility.IsPartOfPrefabInstance(mp)) continue;

            var mods = PrefabUtility.GetPropertyModifications(mp);
            if (mods == null || mods.Length == 0) continue;

            var data = CaptureSerializedProperties(mp, mods);
            if (data.Count == 0) continue;

            results.Add(new PrefabOverrideData
            {
                GameObjectId = GlobalObjectId.GetGlobalObjectIdSlow(mp.gameObject),
                Properties = data
            });
        }

        return results;
    }

    private static void RestorePrefabInstanceOverrides(List<PrefabOverrideData> overrides)
    {
        if (overrides == null || overrides.Count == 0)
            return;

        foreach (var entry in overrides)
        {
            Object obj = GlobalObjectId.GlobalObjectIdentifierToObjectSlow(entry.GameObjectId);
            var go = obj as GameObject;
            if (go == null)
                continue;

            var image = go.GetComponent<ProceduralUIImage>();
            if (image == null)
                continue;

            ApplySerializedProperties(image, entry.Properties);
            EditorUtility.SetDirty(go);
        }
    }

    private static object GetPropertyValue(SerializedProperty src)
    {
        switch (src.propertyType)
        {
            case SerializedPropertyType.Integer:
            case SerializedPropertyType.LayerMask:
            case SerializedPropertyType.ArraySize:
                return src.intValue;
            case SerializedPropertyType.Boolean:
                return src.boolValue;
            case SerializedPropertyType.Float:
                return src.floatValue;
            case SerializedPropertyType.String:
                return src.stringValue;
            case SerializedPropertyType.Color:
                return src.colorValue;
            case SerializedPropertyType.ObjectReference:
                return src.objectReferenceValue;
            case SerializedPropertyType.Enum:
                return src.enumValueIndex;
            case SerializedPropertyType.Vector2:
                return src.vector2Value;
            case SerializedPropertyType.Vector3:
                return src.vector3Value;
            case SerializedPropertyType.Vector4:
                return src.vector4Value;
            case SerializedPropertyType.Rect:
                return src.rectValue;
            case SerializedPropertyType.Bounds:
                return src.boundsValue;
            case SerializedPropertyType.Quaternion:
                return src.quaternionValue;
            case SerializedPropertyType.AnimationCurve:
                return src.animationCurveValue;
            case SerializedPropertyType.Vector2Int:
                return src.vector2IntValue;
            case SerializedPropertyType.Vector3Int:
                return src.vector3IntValue;
            case SerializedPropertyType.RectInt:
                return src.rectIntValue;
            case SerializedPropertyType.BoundsInt:
                return src.boundsIntValue;
            case SerializedPropertyType.ExposedReference:
                return src.exposedReferenceValue;
            case SerializedPropertyType.ManagedReference:
                return src.managedReferenceValue;
            case SerializedPropertyType.Gradient:
                return src.gradientValue;
            default:
                return null;
        }
    }

    private static void SetPropertyValue(SerializedProperty dst, SerializedPropertyType type, object value)
    {
        switch (type)
        {
            case SerializedPropertyType.Integer:
            case SerializedPropertyType.LayerMask:
            case SerializedPropertyType.ArraySize:
                dst.intValue = value is int i ? i : dst.intValue;
                break;
            case SerializedPropertyType.Boolean:
                if (value is bool b) dst.boolValue = b;
                break;
            case SerializedPropertyType.Float:
                if (value is float f) dst.floatValue = f;
                break;
            case SerializedPropertyType.String:
                dst.stringValue = value as string;
                break;
            case SerializedPropertyType.Color:
                if (value is Color c) dst.colorValue = c;
                break;
            case SerializedPropertyType.ObjectReference:
                dst.objectReferenceValue = value as Object;
                break;
            case SerializedPropertyType.Enum:
                if (value is int e) dst.enumValueIndex = e;
                break;
            case SerializedPropertyType.Vector2:
                if (value is Vector2 v2) dst.vector2Value = v2;
                break;
            case SerializedPropertyType.Vector3:
                if (value is Vector3 v3) dst.vector3Value = v3;
                break;
            case SerializedPropertyType.Vector4:
                if (value is Vector4 v4) dst.vector4Value = v4;
                break;
            case SerializedPropertyType.Rect:
                if (value is Rect r) dst.rectValue = r;
                break;
            case SerializedPropertyType.Bounds:
                if (value is Bounds bnd) dst.boundsValue = bnd;
                break;
            case SerializedPropertyType.Quaternion:
                if (value is Quaternion q) dst.quaternionValue = q;
                break;
            case SerializedPropertyType.AnimationCurve:
                dst.animationCurveValue = value as AnimationCurve;
                break;
            case SerializedPropertyType.Vector2Int:
                if (value is Vector2Int v2i) dst.vector2IntValue = v2i;
                break;
            case SerializedPropertyType.Vector3Int:
                if (value is Vector3Int v3i) dst.vector3IntValue = v3i;
                break;
            case SerializedPropertyType.RectInt:
                if (value is RectInt ri) dst.rectIntValue = ri;
                break;
            case SerializedPropertyType.BoundsInt:
                if (value is BoundsInt bi) dst.boundsIntValue = bi;
                break;
            case SerializedPropertyType.ExposedReference:
                dst.exposedReferenceValue = value as Object;
                break;
            case SerializedPropertyType.ManagedReference:
                dst.managedReferenceValue = value;
                break;
            case SerializedPropertyType.Gradient:
                dst.gradientValue = value as Gradient;
                break;
            default:
                break;
        }
    }

    private static T[] FindAll<T>() where T : Object
    {
#if UNITY_2022_2_OR_NEWER
        return Object.FindObjectsByType<T>(FindObjectsInactive.Include, FindObjectsSortMode.None);
#else
        return Object.FindObjectsOfType<T>(true);
#endif
    }
}
