using UnityEngine;

public class CameraButtons : MonoBehaviour
{
    [SerializeField] private GameObject followCam;
    [SerializeField] private GameObject sunCam;
    [SerializeField] private GameObject galaxyCam;

    public void SetFollowCam()
    {
        followCam.SetActive(true);
        sunCam.SetActive(false);
        galaxyCam.SetActive(false);
    }

    public void SetSunCam()
    {
        followCam.SetActive(false);
        sunCam.SetActive(true);
        galaxyCam.SetActive(false);
    }

    public void SetGalaxyCam()
    {
        followCam.SetActive(false);
        sunCam.SetActive(false);
        galaxyCam.SetActive(true);
    }
}