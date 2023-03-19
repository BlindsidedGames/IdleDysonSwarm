using System;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

public class NewsGetter : MonoBehaviour
{
    public NewsData newsData;

    [ContextMenu("TestGet")]
    public async void TestGet()
    {
        var url = "https://www.blindsidedgames.com/newsTicker";

        using var www = UnityWebRequest.Get(url);

        www.SetRequestHeader("Content-Type", "application/jason");
        var operation = www.SendWebRequest();

        while (!operation.isDone)
            await Task.Yield();

        if (www.result == UnityWebRequest.Result.Success)
        {
            newsData = new NewsData();

            var json = www.downloadHandler.text;
            //Debug.Log(json);
            newsData = JsonUtility.FromJson<NewsData>(json);
            Debug.Log(newsData.idleSpaceFlight);
        }
        else
        {
            Debug.Log($"error {www.error}");
        }
    }

    [Serializable]
    public class NewsData
    {
        public string idleSpaceFlight;
    }
}