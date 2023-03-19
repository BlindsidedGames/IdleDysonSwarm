using System.Collections;
using UnityEngine;

public class SuccessfulCloud : MonoBehaviour
{
    [SerializeField] private GameObject text;

    private void OnEnable()
    {
        Oracle.SuccessfulCloudSave += ShowSuccess;
    }

    private void OnDisable()
    {
        Oracle.SuccessfulCloudSave -= ShowSuccess;
    }

    private void ShowSuccess()
    {
        text.SetActive(true);
        StartCoroutine(HideSuccessMessage());
    }

    private IEnumerator HideSuccessMessage()
    {
        yield return new WaitForSeconds(2);
        text.SetActive(false);
    }
}