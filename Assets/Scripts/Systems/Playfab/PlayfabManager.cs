using System.Collections.Generic;
using PlayFab;
using PlayFab.ClientModels;
using TMPro;
using UnityEngine;

public class PlayfabManager : MonoBehaviour
{
    public static PlayfabManager playfabManager;
    [SerializeField] private GameObject nameWindow;
    [SerializeField] private GameObject nameWindowCancel;
    [SerializeField] private TMP_InputField nameInput;
    [SerializeField] private TMP_InputField nameInputCancel;
    [SerializeField] private TMP_Text nameInputErrorText;
    [SerializeField] private TMP_Text nameInputErrorTextCancel;

    [SerializeField] private TMP_InputField emailInput;
    [SerializeField] private TMP_InputField passwordInput;
    [SerializeField] private TMP_Text feedbackText;


    [SerializeField] private TMP_Text playfabIDDisplay;

    [SerializeField] private GameObject[] disableOnLogin;


    public string loggedinPlayfabId;

    private void Awake()
    {
        if (playfabManager == null)
        {
            playfabManager = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        Login();
    }

    #region Login

    private void Login()
    {
        if (PlayerPrefs.GetInt("rememberLogin") == 1)
        {
            LoginWithSavedDetails();
        }
        else
        {
            var request = new LoginWithCustomIDRequest
            {
                CustomId = SystemInfo.deviceUniqueIdentifier,
                CreateAccount = true,
                InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
                {
                    GetPlayerProfile = true
                }
            };
            PlayFabClientAPI.LoginWithCustomID(request, OnSuccess, OnError);
        }
    }

    [SerializeField] private string _name;

    private void OnSuccess(LoginResult result)
    {
        Debug.Log("Successful login/create");
        _name = null;
        if (result.InfoResultPayload.PlayerProfile != null)
            _name = result.InfoResultPayload.PlayerProfile.DisplayName;

        if (_name == null)
            nameWindow.SetActive(true);

        loggedinPlayfabId = result.PlayFabId;
        playfabIDDisplay.text = $"PlayfabID: {loggedinPlayfabId}";
    }

    private void OnError(PlayFabError error)
    {
        Debug.Log("Error: " + error.GenerateErrorReport());
    }

    public void ForgetLogin()
    {
        PlayerPrefs.DeleteKey("savedEmail");
        PlayerPrefs.DeleteKey("savedPassword");
        PlayerPrefs.DeleteKey("rememberLogin");

        foreach (var t in disableOnLogin)
            t.SetActive(true);
        emailInput.text = "";
        passwordInput.text = "";
        feedbackText.text = "";
    }

    #endregion

    #region SetName

    public void SubmitNamebutton()
    {
        nameInputErrorText.text = "";
        var request = new UpdateUserTitleDisplayNameRequest
        {
            DisplayName = nameInput.text
        };
        PlayFabClientAPI.UpdateUserTitleDisplayName(request, OnDisplayNameUpdate, OnChangeNameError);
    }

    public void SubmitNamebuttonCancel()
    {
        nameInputErrorText.text = "";
        var request = new UpdateUserTitleDisplayNameRequest
        {
            DisplayName = nameInputCancel.text
        };
        PlayFabClientAPI.UpdateUserTitleDisplayName(request, OnDisplayNameUpdate, OnChangeNameError);
    }

    private void OnDisplayNameUpdate(UpdateUserTitleDisplayNameResult result)
    {
        Debug.Log("Updated Display Name");
        nameWindow.SetActive(false);
        nameWindowCancel.SetActive(false);
        _name = result.DisplayName;
    }

    private void OnChangeNameError(PlayFabError error)
    {
        Debug.Log("Error: " + error.GenerateErrorReport());
        if (error.Error == PlayFabErrorCode.ProfaneDisplayName)
        {
            nameInputErrorText.text = "Error: Please choose an appropriate display name";
            nameInputErrorTextCancel.text = "Error: Please choose an appropriate display name";
        }

        if (error.Error == PlayFabErrorCode.NameNotAvailable)
        {
            nameInputErrorText.text = "Error: Name is taken";
            nameInputErrorTextCancel.text = "Error: Name is taken";
        }

        if (error.Error == PlayFabErrorCode.InvalidParams)
        {
            nameInputErrorText.text = "Error: Display name must be between 3 and 25 characters";
            nameInputErrorTextCancel.text = "Error: Display name must be between 3 and 25 characters";
        }
    }

    #endregion

    #region AccountSystems

    public void RegisterButton()
    {
        if (passwordInput.text.Length < 1)
        {
            feedbackText.text = "Enter a password!";
            return;
        }

        if (emailInput.text.Length < 1)
        {
            feedbackText.text = "Enter an email address!";
            return;
        }

        if (passwordInput.text.Length < 6)
        {
            feedbackText.text = "Password too short!";
            return;
        }

        var request = new AddUsernamePasswordRequest
        {
            Email = emailInput.text,
            Password = passwordInput.text,
            Username = loggedinPlayfabId
        };
        PlayFabClientAPI.AddUsernamePassword(request, OnRegisterSuccess, OnAccountError);

        PlayerPrefs.SetString("savedEmail", emailInput.text);
        PlayerPrefs.SetString("savedPassword", passwordInput.text);
    }

    private void OnRegisterSuccess(AddUsernamePasswordResult result)
    {
        feedbackText.text = "Registered and logged in!";
        PlayerPrefs.SetInt("rememberLogin", 1);
    }

    public void LoginButton()
    {
        if (passwordInput.text.Length < 1)
        {
            feedbackText.text = "Enter a password!";
            return;
        }

        if (emailInput.text.Length < 1)
        {
            feedbackText.text = "Enter an email address!";
            return;
        }

        var request = new LoginWithEmailAddressRequest
        {
            Email = emailInput.text,
            Password = passwordInput.text,
            InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
            {
                GetPlayerProfile = true
            }
        };
        PlayFabClientAPI.LoginWithEmailAddress(request, OnLoginSuccess, OnAccountError);
        PlayerPrefs.SetString("savedEmail", emailInput.text);
        PlayerPrefs.SetString("savedPassword", passwordInput.text);
    }

    public void LoginWithSavedDetails()
    {
        var request = new LoginWithEmailAddressRequest
        {
            Email = PlayerPrefs.GetString("savedEmail"),
            Password = PlayerPrefs.GetString("savedPassword"),
            InfoRequestParameters = new GetPlayerCombinedInfoRequestParams
            {
                GetPlayerProfile = true
            }
        };
        PlayFabClientAPI.LoginWithEmailAddress(request, OnLoginSuccess, OnAccountError);
    }

    private void OnLoginSuccess(LoginResult result)
    {
        _name = null;
        if (result.InfoResultPayload.PlayerProfile != null)
            _name = result.InfoResultPayload.PlayerProfile.DisplayName;

        if (_name == null)
            nameWindow.SetActive(true);

        loggedinPlayfabId = result.PlayFabId;
        playfabIDDisplay.text = $"PlayfabID: {loggedinPlayfabId}";

        feedbackText.text = "Logged in!";
        PlayerPrefs.SetInt("rememberLogin", 1);
        foreach (var t in disableOnLogin)
            t.SetActive(false);
    }


    public void ResetPasswordbutton()
    {
        var request = new SendAccountRecoveryEmailRequest
        {
            Email = emailInput.text,
            TitleId = "DD15E"
        };
        PlayFabClientAPI.SendAccountRecoveryEmail(request, OnPasswordReset, OnAccountError);
    }

    private void OnPasswordReset(SendAccountRecoveryEmailResult result)
    {
        feedbackText.text = "Password reset mail sent!";
    }

    private void OnAccountError(PlayFabError error)
    {
        feedbackText.text = "";


        switch (error.Error)
        {
            case PlayFabErrorCode.InvalidEmailAddress:
            case PlayFabErrorCode.InvalidPassword:
            case PlayFabErrorCode.InvalidEmailOrPassword:
                feedbackText.text = "Invalid Email or Password";
                break;

            case PlayFabErrorCode.AccountNotFound:
                feedbackText.text = "Account Not Found";
                return;
            default:
                feedbackText.text = error.GenerateErrorReport();
                break;
        }

        //Also report to debug console, this is optional.
        Debug.Log(error.Error);
        Debug.LogError(error.GenerateErrorReport());
    }

    #endregion

    #region Leaderboards

    [SerializeField] private TMP_Text infinityRankText;
    [SerializeField] private TMP_Text infinityNameText;
    [SerializeField] private TMP_Text infinityScoreText;

    public void SendLeaderboard(int score, string leaderboard)
    {
        Debug.Log("Turn Leaderboards back on you fool.");
        return;
        var request = new UpdatePlayerStatisticsRequest
        {
            Statistics = new List<StatisticUpdate>
            {
                new()
                {
                    StatisticName = leaderboard,
                    Value = score
                }
            }
        };
        PlayFabClientAPI.UpdatePlayerStatistics(request, OnLeaderboardUpdate, OnError);
    }

    private void OnLeaderboardUpdate(UpdatePlayerStatisticsResult result)
    {
        Debug.Log(result);
    }

    public void GetLeaderboardInfinityType(string type)
    {
        if (type == "Top") GetLeaderboardInfinity();
        if (type == "Player") GetLeaderboardInfinityAroundPlayer();
    }


    private void GetLeaderboardInfinity()
    {
        var request = new GetLeaderboardRequest
        {
            StatisticName = "prestigePlus",
            StartPosition = 0,
            MaxResultsCount = 30
        };
        PlayFabClientAPI.GetLeaderboard(request, OnLeaderboardGetInfinity, OnError);
    }

    private void GetLeaderboardInfinityAroundPlayer()
    {
        var request = new GetLeaderboardAroundPlayerRequest
        {
            StatisticName = "prestigePlus",
            MaxResultsCount = 30
        };
        PlayFabClientAPI.GetLeaderboardAroundPlayer(request, OnLeaderboardAroundPlayerGetInfinity, OnError);
    }

    private void OnLeaderboardGetInfinity(GetLeaderboardResult result)
    {
        Debug.Log(result);
        infinityRankText.text = ""; //"<b>Rank</b>";
        infinityNameText.text = ""; //"<b>Name</b>";
        infinityScoreText.text = ""; //"<b>Score</b>";
        foreach (var item in result.Leaderboard)
            if (item.PlayFabId == loggedinPlayfabId)
            {
                var color = "<color=#00FFCB>";
                infinityRankText.text += $"\n{color}{item.Position + 1}</color>";
                if (item.DisplayName == null)
                    infinityNameText.text += $"\n{color}{item.PlayFabId}</color>";
                else
                    infinityNameText.text += $"\n{color}{item.DisplayName}</color>";
                infinityScoreText.text += $"\n{color}{item.StatValue:N0}</color>";
            }
            else
            {
                var color = "<color=#FFFFFF>";
                infinityRankText.text += $"\n{color}{item.Position + 1}</color>";
                if (item.DisplayName == null)
                    infinityNameText.text += $"\n{color}{item.PlayFabId}</color>";
                else
                    infinityNameText.text += $"\n{color}{item.DisplayName}</color>";
                infinityScoreText.text += $"\n{color}{item.StatValue:N0}</color>";
            }
    }

    private void OnLeaderboardAroundPlayerGetInfinity(GetLeaderboardAroundPlayerResult result)
    {
        Debug.Log(result);
        infinityRankText.text = ""; //"<b>Rank</b>";
        infinityNameText.text = ""; //"<b>Name</b>";
        infinityScoreText.text = ""; //"<b>Score</b>";
        foreach (var item in result.Leaderboard)
            if (item.PlayFabId == loggedinPlayfabId)
            {
                var color = "<color=#00FFCB>";
                infinityRankText.text += $"\n{color}{item.Position + 1}</color>";
                if (item.DisplayName == null)
                    infinityNameText.text += $"\n{color}{item.PlayFabId}</color>";
                else
                    infinityNameText.text += $"\n{color}{item.DisplayName}</color>";
                infinityScoreText.text += $"\n{color}{item.StatValue:N0}</color>";
            }
            else
            {
                var color = "<color=#FFFFFF>";
                infinityRankText.text += $"\n{color}{item.Position + 1}</color>";
                if (item.DisplayName == null)
                    infinityNameText.text += $"\n{color}{item.PlayFabId}</color>";
                else
                    infinityNameText.text += $"\n{color}{item.DisplayName}</color>";
                infinityScoreText.text += $"\n{color}{item.StatValue:N0}</color>";
            }
    }

    #endregion

    #region DeleteServerData

    public void DeleteServerData()
    {
        var request = new ExecuteCloudScriptRequest
        {
            FunctionName = "deletePlayer"
        };
        PlayFabClientAPI.ExecuteCloudScript(request, OnDeleteSuccess, OnError);
    }

    private void OnDeleteSuccess(ExecuteCloudScriptResult result)
    {
        Application.Quit();
        Debug.Log(result);
    }

    #endregion
}