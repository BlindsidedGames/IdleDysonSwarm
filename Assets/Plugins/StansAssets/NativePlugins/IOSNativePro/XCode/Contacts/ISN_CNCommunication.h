#if !TARGET_OS_TV

#import "ISN_Foundation.h"

#import <Contacts/Contacts.h>
#import <ContactsUI/ContactsUI.h>

@protocol ISN_CNPhoneNumber;
@interface ISN_CNPhoneNumber : JSONModel
-(id) initWithCNLabeledValue:(CNLabeledValue *) phone;
@property (nonatomic) NSString *m_CountryCode;
@property (nonatomic) NSString *m_Digits;
@end


@protocol ISN_CNContact;
@interface ISN_CNContact : JSONModel
-(id) initWithContact:(CNContact *) contact noteRequested:(bool)noteRequested;

@property (nonatomic) NSString *m_GivenName;
@property (nonatomic) NSString *m_FamilyName;
@property (nonatomic) NSString *m_Nickname;
@property (nonatomic) NSString *m_OrganizationName;
@property (nonatomic) NSString *m_DepartmentName;
@property (nonatomic) NSString *m_JobTitle;
@property (nonatomic) NSString *m_Note;




@property (nonatomic) NSArray<NSString *> * m_Emails;
@property (nonatomic) NSArray<ISN_CNPhoneNumber> * m_Phones;
@end


@protocol ISN_CNContactsResult;
@interface ISN_CNContactsResult : SA_Result
@property (nonatomic) NSMutableArray<ISN_CNContact> * m_Contacts;
-(void) addContact:(ISN_CNContact*) contact;
@end

#endif






