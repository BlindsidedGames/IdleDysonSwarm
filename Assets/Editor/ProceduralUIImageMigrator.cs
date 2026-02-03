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
        string json = EditorJsonUtility.ToJson(old);
        Object.DestroyImmediate(old, true);
        var replacement = go.AddComponent<ProceduralUIImage>();
        EditorJsonUtility.FromJsonOverwrite(json, replacement);
        EditorUtility.SetDirty(go);
        return true;
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
