#if ES3_TMPRO && ES3_UGUI

using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// A script attached to the Create Slot button to manage slot creation.
/// </summary>
public class ES3CreateSlot : MonoBehaviour
{
    [Tooltip("The button used to bring up the 'Create Slot' dialog.")]
    public Button createButton;
    [Tooltip("The ES3SlotDialog Component of the Create Slot dialog")]
    public ES3SlotDialog createDialog;
    [Tooltip("The TMP_Text input text field of the create slot dialog.")]
    public TMP_InputField inputField;
    [Tooltip("The ES3SlotManager this Create Slot Dialog belongs to.")]
    public ES3SlotManager mgr;

    protected virtual void OnEnable()
    {
        // Whether we should show or hide this Create Slot button based on the settings in the slot manager.
        gameObject.SetActive(mgr.showCreateSlotButton);

        // Make it so the Create Slot button brings up the Create Slot dialog.
        createButton.onClick.AddListener(() => createDialog.gameObject.SetActive(true));

        // Add listener to the confirmation button.
        createDialog.confirmButton.onClick.AddListener(TryCreateNewSlot);
    }

    protected virtual void OnDisable()
    {
        // Make sure the text field is empty for next time.
        inputField.text = string.Empty;
        // Remove all listeners.
        createButton.onClick.RemoveAllListeners();
        createDialog.confirmButton.onClick.RemoveAllListeners();
    }

    // Called when the Create button is pressed in the Create New Slot dialog.
    public virtual void TryCreateNewSlot()
    {
        // If the user hasn't specified a name, throw an error.
        // Note that no other validation of the name is a required as this is handled using a REGEX in the TMP_InputField Component.
        if (string.IsNullOrEmpty(inputField.text))
        {
            mgr.ShowErrorDialog("You must specify a name for your save slot");
            return;
        }

        // If a slot with this name already exists, require the user to enter a different name.
        if (ES3.FileExists(mgr.GetSlotPath(inputField.text)))
        {
            mgr.ShowErrorDialog("A slot already exists with this name. Please choose a different name.");
            return;
        }

        // Create the slot.
        CreateNewSlot(inputField.text);
        // Clear the input field so the value isn't there when we reopen it.
        inputField.text = "";
        // Hide the dialog.
        createDialog.gameObject.SetActive(false);
    }


    // Creates a new slot by instantiating it in the UI and creating a save file for it.
    protected virtual void CreateNewSlot(string slotName)
    {
        // Get the current timestamp.
        var creationTimestamp = DateTime.Now;
        // Create the slot in the UI.
        var slot = mgr.InstantiateSlot(slotName, creationTimestamp);
        // Move the slot to the top of the list.
        slot.transform.SetSiblingIndex(1);
    }
}

#endif