////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#if !TARGET_OS_TV
#import <Contacts/Contacts.h>
#import <ContactsUI/ContactsUI.h>

#import "ISN_Foundation.h"
#import "ISN_CNCommunication.h"



@interface ISN_Contacts : NSObject<CNContactPickerDelegate>
- (void) pickContacts;
@end;


@implementation ISN_Contacts
static ISN_Contacts * s_sharedInstance;

+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    
    return s_sharedInstance;
}


- (void) pickContacts {
    
    CNContactPickerViewController *contactPicker = [[CNContactPickerViewController alloc] init];
    contactPicker.displayedPropertyKeys = @[CNContactEmailAddressesKey, CNContactPhoneNumbersKey];
    
    contactPicker.predicateForSelectionOfContact = [NSPredicate predicateWithValue:true];
    contactPicker.delegate = self;
    
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc presentViewController: contactPicker animated: YES completion:nil];
    
}


//--------------------------------------
//  CNContactPickerDelegate
//--------------------------------------

- (void)contactPickerDidCancel:(CNContactPickerViewController *)picker {
    SA_Error * error =  [[SA_Error alloc] initWithCode:1 message:@"User Canceld"];
    ISN_CNContactsResult * result = [[ISN_CNContactsResult alloc] initWithError:error];
    ISN_SendMessage(UNITY_CN_LISTENER, "OnDidSelectContacts", [result toJSONString]);
}

- (void)contactPicker:(CNContactPickerViewController *)picker didSelectContacts:(NSArray<CNContact*> *)contacts {
    
    if(contacts.count > 0) {
        [ISN_Logger Log:@"ISN_Contacts didSelectContacts %lu phone contacts", (unsigned long)contacts.count ];
        ISN_CNContactsResult * result = [[ISN_CNContactsResult alloc] init];
        for (CNContact *contact in contacts) {
            ISN_CNContact* loadedContact =  [[ISN_CNContact alloc] initWithContact:contact noteRequested:true];
            [result addContact:loadedContact];
        }
        ISN_SendMessage(UNITY_CN_LISTENER, "OnDidSelectContacts", [result toJSONString]);
    } else {
        [self contactPickerDidCancel:picker];
    }
}

@end




extern "C" {
    
    void _ISN_CN_ShowContactsPicker() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CN_ShowContactsPicker" data:""];

        [[ISN_Contacts sharedInstance] pickContacts];
    }
    
    int _ISN_CN_GetAuthorizationStatusForEntityType(int entityType) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CN_GetAuthorizationStatusForEntityType" data:ISN_ConvertToChar([NSString stringWithFormat:@"entityType: %d", entityType])];

        CNEntityType val = static_cast<CNEntityType>(entityType);
        return (int) [CNContactStore authorizationStatusForEntityType:val];
    }
    
    void _ISN_CN_RequestAccessForEntityType(int entityType) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CN_RequestAccessForEntityType" data:ISN_ConvertToChar([NSString stringWithFormat:@"entityType: %d", entityType])];

        CNEntityType val = static_cast<CNEntityType>(entityType);
        CNContactStore *store = [[CNContactStore alloc] init];
        [store requestAccessForEntityType:val completionHandler:^(BOOL granted, NSError * _Nullable error) {
            
            SA_Result * result;
            if(error != NULL) {
                result = [[SA_Result alloc] initWithNSError:error];
            } else {
                if(granted) {
                    result = [[SA_Result alloc] init];
                } else {
                    SA_Error * error =  [[SA_Error alloc] initWithCode:1 message:@"User Declied"];
                    result = [[ISN_CNContactsResult alloc] initWithError:error];
                }
            }
            
            ISN_SendMessage(UNITY_CN_LISTENER, "OnRequestAccessForEntityType", [result toJSONString]);
        }];
    }
    
    
    void _ISN_CN_RetrievePhoneContacts(bool includeNotes) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CN_RetrievePhoneContacts" data:""];
        
        CNContactStore *store = [[CNContactStore alloc] init];
        [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError * _Nullable error) {
            
            ISN_CNContactsResult * result;
            if (granted == YES) {
                
                //keys with fetching properties
                NSMutableArray *keys = [[NSMutableArray alloc] initWithArray:@[CNContactGivenNameKey,CNContactFamilyNameKey, CNContactNicknameKey, CNContactOrganizationNameKey, CNContactDepartmentNameKey, CNContactJobTitleKey, CNContactEmailAddressesKey, CNContactPhoneNumbersKey]];
                
                if(includeNotes) {
                    [keys addObject:CNContactNoteKey];
                }
               
                
                // NSString *containerId = store.defaultContainerIdentifier;
                // NSPredicate *predicate = [CNContact predicateForContactsInContainerWithIdentifier:containerId];
              
                // Setting the predicate to nil means "all"
                NSPredicate *predicate = nil;
                
                NSError *error;
                NSArray *contacts = [store unifiedContactsMatchingPredicate:predicate keysToFetch:keys error:&error];
                if (error != NULL) {
                    result = [[ISN_CNContactsResult alloc] initWithNSError:error];
                } else {
                    result = [[ISN_CNContactsResult alloc] init];
                    for (CNContact *contact in contacts) {
                        ISN_CNContact* loadedContact =  [[ISN_CNContact alloc] initWithContact:contact noteRequested:includeNotes];
                        [result addContact:loadedContact];
                    }
                }
            } else {
                SA_Error * error =  [[SA_Error alloc] initWithCode:1 message:@"User Canceld"];
                result = [[ISN_CNContactsResult alloc] initWithError:error];
            }
            
            ISN_SendMessage(UNITY_CN_LISTENER, "OnPhoneContactsLoaded", [result toJSONString]);
        }];
        
    }
    
}

#endif

