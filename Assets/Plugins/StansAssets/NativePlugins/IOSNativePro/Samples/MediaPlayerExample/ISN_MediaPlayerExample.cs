using SA.iOS.Foundation;
using UnityEngine;
using UnityEngine.UI;
using SA.iOS.MediaPlayer;
using SA.iOS.UIKit;

public class ISN_MediaPlayerExample : MonoBehaviour
{
#pragma warning disable 649

    [Header("Info Panel")]
    [SerializeField]
    Text m_title;
    [SerializeField]
    Text m_artist;
    [SerializeField]
    Text m_playbackState;

    [Header("Buttons")]
    [SerializeField]
    Button m_play;
    [SerializeField]
    Button m_stop;
    [SerializeField]
    Button m_pause;
    [SerializeField]
    Button m_next;
    [SerializeField]
    Button m_previos;

    [Header("Media Picker")]
    [SerializeField]
    Button m_OpenMediaPicker;
#pragma warning restore 649

    // Start is called before the first frame update

    ISN_MPMusicPlayerController m_player;

    void Start()
    {
        m_player = ISN_MPMusicPlayerController.SystemMusicPlayer;
        UpdatePlayerStateUI();

        m_play.onClick.AddListener(() =>
        {
            m_player.Play();
        });

        m_stop.onClick.AddListener(() =>
        {
            m_player.Stop();
        });

        m_pause.onClick.AddListener(() =>
        {
            m_player.Pause();
        });

        m_next.onClick.AddListener(() =>
        {
            m_player.SkipToNextItem();
        });

        m_previos.onClick.AddListener(() =>
        {
            m_player.SkipToPreviousItem();
        });

        //Subscribing ot the events
        m_player.BeginGeneratingPlaybackNotifications();

        var center = ISN_NSNotificationCenter.DefaultCenter;
        center.AddObserverForName(ISN_MPMusicPlayerController.NowPlayingItemDidChange,
            (notification) =>
            {
                UpdatePlayerStateUI();
                Debug.Log("MusicPlayer Now Playing Item Did Change");
            });

        center.AddObserverForName(ISN_MPMusicPlayerController.PlaybackStateDidChange,
            (notification) =>
            {
                UpdatePlayerStateUI();
                Debug.Log("MusicPlayer Playback State Did Change");
            });

        m_OpenMediaPicker.onClick.AddListener(() =>
        {
            var pickerController = new ISN_MPMediaPickerController();
            pickerController.AllowsPickingMultipleItems = true;

            if (ISN_UIDevice.CurrentDevice.UserInterfaceIdiom == ISN_UIUserInterfaceIdiom.IPad)
                pickerController.ModalPresentationStyle = ISN_UIModalPresentationStyle.Popover;

            pickerController.SetDelegate(new MyMediaPickerDelegate());
            pickerController.PresentViewController(true, () => { });
        });
    }

    void UpdatePlayerStateUI()
    {
        var item = m_player.NowPlayingItem;

        m_title.text = "Title: " + item.Title;
        m_artist.text = "Artist: " + item.Artist;

        m_playbackState.text = "PlaybackState: " + m_player.PlaybackState;
    }

    public class MyMediaPickerDelegate : ISN_IMPMediaPickerControllerDelegate
    {
        public void DidPickMediaItems(ISN_MPMediaPickerController mediaPicker, ISN_MPMediaItemCollection mediaItemCollection)
        {
            var musicPlayer = ISN_MPMusicPlayerController.SystemMusicPlayer;
            musicPlayer.SetQueueWithItemCollection(mediaItemCollection);
            musicPlayer.Play();

            mediaPicker.Dismiss(true, () => { });
        }

        public void MediaPickerDidCancel(ISN_MPMediaPickerController mediaPicker)
        {
            mediaPicker.Dismiss(true, () => { });
        }
    }
}
